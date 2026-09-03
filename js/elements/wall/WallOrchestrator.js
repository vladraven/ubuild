import * as THREE from 'three';

import {
    getPanelNormalMapForUse,
    getPanelRepeat,
    normalizePanelProfile
} from '../../panels/PanelProfiles.js';

const DEFAULT_PROFILE =
    'awr';

const NORMAL_SCALE =
    0.8;

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

function getWallWidth(
    wallKey,
    envelope
) {
    if (
        wallKey === 'left' ||
        wallKey === 'right'
    ) {
        return envelope.length;
    }

    return envelope.width;
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

function createMaterial(
    source,
    profileId,
    wallKey,
    width
) {
    const material =
        source.clone();

    const normalMap =
        getPanelNormalMapForUse(
            profileId,
            `wall-${wallKey}`,
            getPanelRepeat(
                width,
                profileId
            ),
            1
        );

    material.normalMap =
        normalMap;

    material.normalScale =
        normalMap ?
        new THREE.Vector2(
            NORMAL_SCALE,
            NORMAL_SCALE
        ) :
        new THREE.Vector2(
            0,
            0
        );

    material.side =
        THREE.DoubleSide;

    material.needsUpdate =
        true;

    return material;
}

function createShape(
    wallData,
    wallKey,
    envelope
) {
    const shape =
        new THREE.Shape();

    const sideCode =
        SIDE_MAP[wallKey];

    let points =
        wallData.shapePoints;

    if (
        sideCode === 'L' ||
        sideCode === 'R'
    ) {
        points = [
            {
                x: 0,
                y: points[0].y
            },
            {
                x: envelope.length,
                y: points[1].y
            },
            {
                x: envelope.length,
                y: points[2].y
            },
            {
                x: 0,
                y: points[3].y
            }
        ];
    }

    points.forEach(
        (
            point,
            index
        ) => {
            if (
                index === 0
            ) {
                shape.moveTo(
                    point.x,
                    point.y
                );

                return;
            }

            shape.lineTo(
                point.x,
                point.y
            );
        }
    );

    shape.closePath();

    return shape;
}

function addOpenings(
    shape,
    openings,
    sideCode,
    envelope
) {
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
            opening.dimensions.width;

        const height =
            opening.dimensions.height;

        const y =
            opening.bounds.min.y;

        let centerX =
            opening.x;

        if (
            sideCode === 'R'
        ) {
            centerX =
                envelope.length -
                opening.x;
        }

        const minX =
            centerX -
            width / 2;

        const maxX =
            centerX +
            width / 2;

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

function createGeometry(
    wallData,
    openings,
    wallKey,
    envelope
) {
    const shape =
        createShape(
            wallData,
            wallKey,
            envelope
        );

    addOpenings(
        shape,
        openings,
        SIDE_MAP[wallKey],
        envelope
    );

    return new THREE.ExtrudeGeometry(
        shape,
        {
            depth:
                wallData.thickness,

            bevelEnabled:
                false
        }
    );
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

function createWallMesh(
    wallData,
    openings,
    wallKey,
    sourceMaterial,
    envelope,
    profileId
) {
    const geometry =
        createGeometry(
            wallData,
            openings,
            wallKey,
            envelope
        );

    const material =
        createMaterial(
            sourceMaterial,
            profileId,
            wallKey,
            getWallWidth(
                wallKey,
                envelope
            )
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    const sideCode =
        SIDE_MAP[wallKey];

    mesh.name =
        `wall-mesh-${sideCode}`;

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
        const [
            wallKey,
            wallData
        ]
        of Object.entries(
            context.geometry.walls
        )
    ) {
        if (
            !wallData?.shapePoints
        ) {
            continue;
        }

        if (
            !isWallVisible(
                wallKey,
                visibility
            )
        ) {
            continue;
        }

        root.add(
            createWallMesh(
                wallData,
                openings,
                wallKey,
                sourceMaterial,
                envelope,
                profileId
            )
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
                    material.dispose();
                }
            } else {
                child.material?.dispose();
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

        id: 'walls',

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