import * as THREE from 'three';

import {
    normalizePanelProfile
} from '../../panels/PanelProfiles.js';

import {
    createPanelMaterial,
    PanelMapType
} from '../../panels/PanelMaterialFactory.js';

const DEFAULT_PROFILE =
    'awr';

const BUMP_SCALE =
    0.95;

const EPSILON =
    1e-9;

const SIDE_MAP =
    Object.freeze({
        front: 'F',
        back: 'B',
        left: 'L',
        right: 'R'
    });

const VISIBILITY_MAP =
    Object.freeze({
        front: 'wallFront',
        back: 'wallBack',
        left: 'wallLeft',
        right: 'wallRight'
    });

function assertContext(
    context
) {
    if (
        !context ||
        typeof context !== 'object'
    ) {
        throw new TypeError(
            'Element context is required'
        );
    }

    if (
        !context.geometry?.walls
    ) {
        throw new TypeError(
            'Wall geometry is required'
        );
    }

    if (
        !context.panelGeometry?.walls
    ) {
        throw new TypeError(
            'Wall panel geometry is required'
        );
    }

    if (
        !context.materials
    ) {
        throw new TypeError(
            'Material system is required'
        );
    }
}

function getProfileId(
    context
) {
    return normalizePanelProfile(
        context.model?.panels?.profile ||
        DEFAULT_PROFILE
    );
}

function getMaterial(
    context
) {
    if (
        typeof context.materials.get ===
        'function'
    ) {
        return context.materials.get(
            'wallMetal'
        );
    }

    return (
        context.materials.wallMetal ||
        context.materials.wall
    );
}

function getPanelSpan(
    panel
) {
    if (
        Number.isFinite(
            panel?.width
        ) &&
        panel.width > 0
    ) {
        return panel.width;
    }

    const min =
        panel?.bounds?.min;

    const max =
        panel?.bounds?.max;

    if (
        !min ||
        !max
    ) {
        return 1;
    }

    const xSpan =
        Math.abs(
            max.x -
            min.x
        );

    const zSpan =
        Math.abs(
            max.z -
            min.z
        );

    return Math.max(
        xSpan,
        zSpan,
        EPSILON
    );
}

function createMaterial(
    source,
    profileId,
    wallKey,
    panel
) {
    return createPanelMaterial(
        source,
        {
            profileId,

            slot:
                `wall-${wallKey}-${panel.index}`,

            span:
                getPanelSpan(
                    panel
                ),

            mapType:
                PanelMapType.HEIGHT,

            bumpScale:
                BUMP_SCALE,

            side:
                THREE.DoubleSide
        }
    );
}

function getPanelInterval(
    panel,
    sideCode
) {
    const bounds =
        panel?.bounds;

    if (
        !bounds?.min ||
        !bounds?.max
    ) {
        throw new TypeError(
            'Wall panel bounds are required'
        );
    }

    if (
        sideCode === 'F' ||
        sideCode === 'B'
    ) {
        return Object.freeze({
            start:
                Math.min(
                    bounds.min.x,
                    bounds.max.x
                ),

            end:
                Math.max(
                    bounds.min.x,
                    bounds.max.x
                ),

            minY:
                bounds.min.y
        });
    }

    return Object.freeze({
        start:
            Math.min(
                bounds.min.z,
                bounds.max.z
            ),

        end:
            Math.max(
                bounds.min.z,
                bounds.max.z
            ),

        minY:
            bounds.min.y
    });
}

function getTopYAtX(
    points,
    x
) {
    if (
        !Array.isArray(
            points
        ) ||
        points.length < 3
    ) {
        throw new TypeError(
            'Wall shape points are required'
        );
    }

    let topY =
        -Infinity;

    for (
        let index = 0;
        index < points.length;
        index++
    ) {
        const a =
            points[index];

        const b =
            points[
                (
                    index + 1
                ) %
                points.length
            ];

        const minX =
            Math.min(
                a.x,
                b.x
            );

        const maxX =
            Math.max(
                a.x,
                b.x
            );

        if (
            x < minX - EPSILON ||
            x > maxX + EPSILON
        ) {
            continue;
        }

        const deltaX =
            b.x -
            a.x;

        if (
            Math.abs(
                deltaX
            ) <= EPSILON
        ) {
            if (
                Math.abs(
                    x - a.x
                ) <= EPSILON
            ) {
                topY =
                    Math.max(
                        topY,
                        a.y,
                        b.y
                    );
            }

            continue;
        }

        const t =
            (
                x -
                a.x
            ) /
            deltaX;

        if (
            t < -EPSILON ||
            t > 1 + EPSILON
        ) {
            continue;
        }

        const y =
            a.y +
            (
                b.y -
                a.y
            ) *
            t;

        topY =
            Math.max(
                topY,
                y
            );
    }

    if (
        !Number.isFinite(
            topY
        )
    ) {
        throw new Error(
            `Unable to resolve wall top at x=${x}`
        );
    }

    return topY;
}

function createPanelShape(
    wallData,
    panel,
    sideCode
) {
    const interval =
        getPanelInterval(
            panel,
            sideCode
        );

    const minX =
        interval.start;

    const maxX =
        interval.end;

    const minY =
        interval.minY;

    const isEndWall =
        sideCode === 'F' ||
        sideCode === 'B';

    const topLeft =
        isEndWall
            ? getTopYAtX(
                wallData.shapePoints,
                minX
            )
            : getTopYAtX(
                wallData.shapePoints,
                minX
            );

    const topRight =
        isEndWall
            ? getTopYAtX(
                wallData.shapePoints,
                maxX
            )
            : getTopYAtX(
                wallData.shapePoints,
                maxX
            );

    if (
        topLeft <= minY ||
        topRight <= minY
    ) {
        throw new Error(
            `Invalid wall panel shape: ${sideCode}:${panel.index}`
        );
    }

    const shape =
        new THREE.Shape();

    shape.moveTo(
        minX,
        minY
    );

    shape.lineTo(
        maxX,
        minY
    );

    shape.lineTo(
        maxX,
        topRight
    );

    shape.lineTo(
        minX,
        topLeft
    );

    shape.closePath();

    return shape;
}

function addPanelOpenings(
    shape,
    openings,
    sideCode,
    panel,
    envelope
) {
    const interval =
        getPanelInterval(
            panel,
            sideCode
        );

    for (
        const opening
        of openings
    ) {
        if (
            opening.side !==
            sideCode
        ) {
            continue;
        }

        const width =
            opening.dimensions?.width;

        const height =
            opening.dimensions?.height;

        const y =
            opening.bounds?.min?.y;

        if (
            !Number.isFinite(
                width
            ) ||
            !Number.isFinite(
                height
            ) ||
            !Number.isFinite(
                y
            )
        ) {
            continue;
        }

        let centerX =
            opening.x;

        if (
            !Number.isFinite(
                centerX
            )
        ) {
            continue;
        }

        if (
            sideCode === 'R'
        ) {
            centerX =
                envelope.length -
                centerX;
        }

        const openingMinX =
            centerX -
            width / 2;

        const openingMaxX =
            centerX +
            width / 2;

        const minX =
            Math.max(
                interval.start,
                openingMinX
            );

        const maxX =
            Math.min(
                interval.end,
                openingMaxX
            );

        if (
            maxX - minX <=
            EPSILON
        ) {
            continue;
        }

        const hole =
            new THREE.Path();

        hole.moveTo(
            minX,
            y
        );

        hole.lineTo(
            maxX,
            y
        );

        hole.lineTo(
            maxX,
            y + height
        );

        hole.lineTo(
            minX,
            y + height
        );

        hole.closePath();

        shape.holes.push(
            hole
        );
    }
}

function normalizePanelUVs(
    geometry,
    minX,
    maxX,
    minY,
    maxY
) {
    /*
     * ExtrudeGeometry writes shape-space metres into UVs.
     * Unify with roof: UV.u = 0..1 across panel width, UV.v = 0..1 across height.
     * Then createPanelMaterial(span = panel.width) yields the same
     * corrugation density as on the roof, independent of panelWidth.
     */
    const position =
        geometry.getAttribute(
            'position'
        );

    if (
        !position
    ) {
        return;
    }

    const width =
        Math.max(
            maxX - minX,
            EPSILON
        );

    const height =
        Math.max(
            maxY - minY,
            EPSILON
        );

    const count =
        position.count;

    const uvs =
        new Float32Array(
            count * 2
        );

    for (
        let i = 0;
        i < count;
        i++
    ) {
        const x =
            position.getX(
                i
            );

        const y =
            position.getY(
                i
            );

        uvs[i * 2] =
            (x - minX) /
            width;

        uvs[i * 2 + 1] =
            (y - minY) /
            height;
    }

    geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(
            uvs,
            2
        )
    );

    geometry.attributes.uv.needsUpdate =
        true;
}

function createGeometry(
    wallData,
    panel,
    openings,
    sideCode,
    envelope
) {
    const interval =
        getPanelInterval(
            panel,
            sideCode
        );

    const minX =
        interval.start;

    const maxX =
        interval.end;

    const minY =
        interval.minY;

    const shape =
        createPanelShape(
            wallData,
            panel,
            sideCode
        );

    addPanelOpenings(
        shape,
        openings,
        sideCode,
        panel,
        envelope
    );

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth:
                    wallData.thickness,

                bevelEnabled:
                    false
            }
        );

    let maxY =
        minY;

    const position =
        geometry.getAttribute(
            'position'
        );

    if (
        position
    ) {
        for (
            let i = 0;
            i < position.count;
            i++
        ) {
            maxY =
                Math.max(
                    maxY,
                    position.getY(
                        i
                    )
                );
        }
    }

    normalizePanelUVs(
        geometry,
        minX,
        maxX,
        minY,
        maxY
    );

    return geometry;
}

function placeMesh(
    mesh,
    sideCode,
    envelope,
    thickness
) {
    if (
        sideCode === 'F'
    ) {
        mesh.position.set(
            0,
            0,
            0
        );

        return;
    }

    if (
        sideCode === 'B'
    ) {
        mesh.position.set(
            0,
            0,
            envelope.length -
            thickness
        );

        return;
    }

    if (
        sideCode === 'L'
    ) {
        mesh.position.set(
            -envelope.width / 2 +
            thickness,
            0,
            0
        );

        mesh.rotation.y =
            -Math.PI / 2;

        return;
    }

    mesh.position.set(
        envelope.width / 2 -
        thickness,
        0,
        envelope.length
    );

    mesh.rotation.y =
        Math.PI / 2;
}

function createWallPanelMesh(
    wallData,
    panel,
    openings,
    wallKey,
    sourceMaterial,
    envelope,
    profileId
) {
    const sideCode =
        SIDE_MAP[wallKey];

    const geometry =
        createGeometry(
            wallData,
            panel,
            openings,
            sideCode,
            envelope
        );

    const material =
        createMaterial(
            sourceMaterial,
            profileId,
            wallKey,
            panel
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        `wall-panel-${sideCode}-${panel.index}`;

    mesh.userData.wallKey =
        wallKey;

    mesh.userData.panelIndex =
        panel.index;

    mesh.userData.panelWidth =
        panel.width;

    mesh.userData.isLast =
        panel.isLast === true;

    placeMesh(
        mesh,
        sideCode,
        envelope,
        wallData.thickness
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function isWallVisible(
    wallKey,
    visibility
) {
    const key =
        VISIBILITY_MAP[wallKey];

    if (
        !key
    ) {
        return true;
    }

    return visibility[key] !==
        false;
}

function createWallGroup(
    context,
    wallKey,
    wallData,
    panels,
    sourceMaterial,
    profileId,
    openings,
    envelope
) {
    const group =
        new THREE.Group();

    group.name =
        `wall-${SIDE_MAP[wallKey]}`;

    for (
        const panel
        of panels
    ) {
        group.add(
            createWallPanelMesh(
                wallData,
                panel,
                openings,
                wallKey,
                sourceMaterial,
                envelope,
                profileId
            )
        );
    }

    return group;
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const root =
        new THREE.Group();

    root.name =
        'walls';

    if (
        context.model?.visibility?.walls ===
        false
    ) {
        return root;
    }

    const profileId =
        getProfileId(
            context
        );

    const sourceMaterial =
        getMaterial(
            context
        );

    const openings =
        context.geometry.openings ||
        [];

    const envelope =
        context.geometry.envelope;

    const visibility =
        context.model?.visibility ||
        {};

    for (
        const wallKey
        of [
            'front',
            'back',
            'left',
            'right'
        ]
    ) {
        if (
            !isWallVisible(
                wallKey,
                visibility
            )
        ) {
            continue;
        }

        const wallData =
            context.geometry.walls[
                wallKey
            ];

        const panels =
            context.panelGeometry.walls[
                wallKey
            ];

        if (
            !wallData ||
            !Array.isArray(
                panels
            ) ||
            panels.length === 0
        ) {
            continue;
        }

        root.add(
            createWallGroup(
                context,
                wallKey,
                wallData,
                panels,
                sourceMaterial,
                profileId,
                openings,
                envelope
            )
        );
    }

    return root;
}

function disposeMaterial(
    material,
    disposed
) {
    if (
        !material ||
        disposed.has(
            material
        )
    ) {
        return;
    }

    disposed.add(
        material
    );

    material.dispose();
}

function disposeObject(
    object
) {
    if (
        !object
    ) {
        return;
    }

    const disposedMaterials =
        new Set();

    object.traverse(
        child => {
            if (
                !child.isMesh
            ) {
                return;
            }

            child.geometry?.dispose();

            if (
                Array.isArray(
                    child.material
                )
            ) {
                for (
                    const material
                    of child.material
                ) {
                    disposeMaterial(
                        material,
                        disposedMaterials
                    );
                }
            } else {
                disposeMaterial(
                    child.material,
                    disposedMaterials
                );
            }

            child.geometry =
                null;

            child.material =
                null;
        }
    );

    for (
        const child
        of object.children.slice()
    ) {
        object.remove(
            child
        );
    }

    object.removeFromParent();
}

export const WallOrchestrator =
    Object.freeze({
        id:
            'wall',

        create(
            context
        ) {
            return createObject(
                context
            );
        },

        update(
            object,
            context
        ) {
            if (
                !object
            ) {
                return createObject(
                    context
                );
            }

            disposeObject(
                object
            );

            return createObject(
                context
            );
        },

        dispose(
            object
        ) {
            disposeObject(
                object
            );
        }
    });