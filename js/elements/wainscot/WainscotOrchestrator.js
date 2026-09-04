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

const SIDE_MAP =
    Object.freeze({
        front: 'F',
        back: 'B',
        left: 'L',
        right: 'R'
    });

const WALL_KEYS =
    Object.freeze([
        'front',
        'back',
        'left',
        'right'
    ]);

const WAINSCOT_SURFACE_OFFSET =
    0.003;

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

function getSourceMaterial(
    context
) {
    if (
        typeof context.materials.get ===
        'function'
    ) {
        return context.materials.get(
            'wainscotMetal'
        );
    }

    return (
        context.materials.wainscotMetal ||
        context.materials.wallMetal
    );
}

function getSpan(
    sideCode,
    envelope
) {
    if (
        sideCode === 'F' ||
        sideCode === 'B'
    ) {
        return envelope.width;
    }

    return envelope.length;
}

function resolveMaterial(
    context,
    profileId,
    wallKey,
    span
) {
    const source =
        getSourceMaterial(
            context
        );

    if (
        !source
    ) {
        return null;
    }

    const material =
        createPanelMaterial(
            source,
            {
                profileId,

                slot:
                    `wainscot-${wallKey}`,

                span,

                mapType:
                    PanelMapType.HEIGHT,

                bumpScale:
                    BUMP_SCALE,

                side:
                    THREE.FrontSide
            }
        );

    material.name =
        `wainscot-${wallKey}`;

    return material;
}

function getRange(
    sideCode,
    span
) {
    if (
        sideCode === 'F' ||
        sideCode === 'B'
    ) {
        return {
            min:
                -span / 2,

            max:
                span / 2
        };
    }

    return {
        min:
            0,

        max:
            span
    };
}

function getMaskCenter(
    opening,
    sideCode,
    envelope
) {
    if (
        sideCode === 'R'
    ) {
        return (
            envelope.length -
            opening.x
        );
    }

    return opening.x;
}

function getMasks(
    openings,
    sideCode,
    envelope,
    wainscotHeight
) {
    const span =
        getSpan(
            sideCode,
            envelope
        );

    const range =
        getRange(
            sideCode,
            span
        );

    const masks =
        [];

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

        const center =
            getMaskCenter(
                opening,
                sideCode,
                envelope
            );

        const halfWidth =
            opening.dimensions.width /
            2;

        const minX =
            center -
            halfWidth;

        const maxX =
            center +
            halfWidth;

        const minY =
            opening.bounds.min.y;

        const maxY =
            opening.bounds.max.y;

        if (
            maxX <= range.min ||
            minX >= range.max ||
            maxY <= 0 ||
            minY >= wainscotHeight
        ) {
            continue;
        }

        masks.push(
            Object.freeze({
                minX,
                maxX,
                minY,
                maxY
            })
        );
    }

    return masks;
}

function addEdges(
    values,
    min,
    max,
    maskMin,
    maskMax
) {
    if (
        maskMax <= min ||
        maskMin >= max
    ) {
        return;
    }

    values.add(
        Math.max(
            min,
            maskMin
        )
    );

    values.add(
        Math.min(
            max,
            maskMax
        )
    );
}

function getGrid(
    range,
    wainscotHeight,
    masks
) {
    const xEdges =
        new Set([
            range.min,
            range.max
        ]);

    const yEdges =
        new Set([
            0,
            wainscotHeight
        ]);

    for (
        const mask
        of masks
    ) {
        addEdges(
            xEdges,
            range.min,
            range.max,
            mask.minX,
            mask.maxX
        );

        addEdges(
            yEdges,
            0,
            wainscotHeight,
            mask.minY,
            mask.maxY
        );
    }

    return {
        x:
            Array.from(
                xEdges
            ).sort(
                (
                    a,
                    b
                ) =>
                    a - b
            ),

        y:
            Array.from(
                yEdges
            ).sort(
                (
                    a,
                    b
                ) =>
                    a - b
            )
    };
}

function isMasked(
    x,
    y,
    masks
) {
    for (
        const mask
        of masks
    ) {
        if (
            x >= mask.minX &&
            x <= mask.maxX &&
            y >= mask.minY &&
            y <= mask.maxY
        ) {
            return true;
        }
    }

    return false;
}

function createSegment(
    minX,
    maxX,
    minY,
    maxY,
    material
) {
    const geometry =
        new THREE.PlaneGeometry(
            maxX - minX,
            maxY - minY,
            1,
            1
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        (
            minX +
            maxX
        ) /
            2,

        (
            minY +
            maxY
        ) /
            2,

        0
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createSegments(
    range,
    wainscotHeight,
    masks,
    material
) {
    const grid =
        getGrid(
            range,
            wainscotHeight,
            masks
        );

    const group =
        new THREE.Group();

    for (
        let yIndex = 0;
        yIndex <
        grid.y.length - 1;
        yIndex++
    ) {
        const minY =
            grid.y[
                yIndex
            ];

        const maxY =
            grid.y[
                yIndex + 1
            ];

        const centerY =
            (
                minY +
                maxY
            ) /
            2;

        for (
            let xIndex = 0;
            xIndex <
            grid.x.length - 1;
            xIndex++
        ) {
            const minX =
                grid.x[
                    xIndex
                ];

            const maxX =
                grid.x[
                    xIndex + 1
                ];

            const centerX =
                (
                    minX +
                    maxX
                ) /
                2;

            if (
                isMasked(
                    centerX,
                    centerY,
                    masks
                )
            ) {
                continue;
            }

            group.add(
                createSegment(
                    minX,
                    maxX,
                    minY,
                    maxY,
                    material
                )
            );
        }
    }

    return group;
}

function placeMesh(
    object,
    sideCode,
    envelope
) {
    if (
        sideCode === 'F'
    ) {
        object.position.set(
            0,
            0,
            -WAINSCOT_SURFACE_OFFSET
        );

        object.rotation.set(
            0,
            Math.PI,
            0
        );

        return;
    }

    if (
        sideCode === 'B'
    ) {
        object.position.set(
            0,
            0,
            envelope.length +
            WAINSCOT_SURFACE_OFFSET
        );

        object.rotation.set(
            0,
            0,
            0
        );

        return;
    }

    if (
        sideCode === 'L'
    ) {
        object.position.set(
            -envelope.width /
            2 -
            WAINSCOT_SURFACE_OFFSET,
            0,
            0
        );

        object.rotation.set(
            0,
            -Math.PI /
            2,
            0
        );

        return;
    }

    object.position.set(
        envelope.width /
        2 +
        WAINSCOT_SURFACE_OFFSET,
        0,
        envelope.length
    );

    object.rotation.set(
        0,
        Math.PI /
        2,
        0
    );
}

function createWainscotMesh(
    context,
    wallKey,
    wainscotHeight,
    openings,
    envelope,
    profileId
) {
    const sideCode =
        SIDE_MAP[
            wallKey
        ];

    const span =
        getSpan(
            sideCode,
            envelope
        );

    const material =
        resolveMaterial(
            context,
            profileId,
            wallKey,
            span
        );

    if (
        !material
    ) {
        return null;
    }

    const range =
        getRange(
            sideCode,
            span
        );

    const masks =
        getMasks(
            openings,
            sideCode,
            envelope,
            wainscotHeight
        );

    const mesh =
        createSegments(
            range,
            wainscotHeight,
            masks,
            material
        );

    mesh.name =
        `wainscot-mesh-${sideCode}`;

    placeMesh(
        mesh,
        sideCode,
        envelope
    );

    return mesh;
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
        'wainscot';

    const wainscotHeight =
        context.model?.panels?.
            wainscotHeight ||
        0;

    if (
        wainscotHeight <= 0 ||
        context.model?.visibility?.
            wainscot === false
    ) {
        return root;
    }

    const profileId =
        getProfileId(
            context
        );

    const openings =
        context.geometry.openings ||
        [];

    const envelope =
        context.geometry.envelope;

    for (
        const wallKey
        of WALL_KEYS
    ) {
        const mesh =
            createWainscotMesh(
                context,
                wallKey,
                wainscotHeight,
                openings,
                envelope,
                profileId
            );

        if (
            !mesh
        ) {
            continue;
        }

        root.add(
            mesh
        );
    }

    return root;
}

function disposeObject(
    object
) {
    if (
        !object
    ) {
        return;
    }

    const materials =
        new Set();

    object.traverse(
        child => {
            if (
                !child.isMesh
            ) {
                return;
            }

            child.geometry?.dispose();

            child.geometry =
                null;

            if (
                child.material &&
                !materials.has(
                    child.material
                )
            ) {
                materials.add(
                    child.material
                );

                child.material.dispose();
            }

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

export const WainscotOrchestrator =
    Object.freeze({

        id:
            'wainscot',

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