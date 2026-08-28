import * as THREE from 'three';

import {
    getPanelNormalMapForUse,
    applyPhysicalPanelUVs
} from '../../panels/PanelProfiles.js';

const SIDE_MAP = Object.freeze({
    front: 'F',
    back: 'B',
    left: 'L',
    right: 'R'
});

function assertContext(context) {
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

function getWallMaterial(context) {
    const profileId =
        context.model?.panels?.profile ||
        'awr';

    const normalMap =
        getPanelNormalMapForUse(
            profileId,
            'wall',
            Math.max(
                1,
                context.model?.dimensions?.length ||
                10
            ),
            Math.max(
                1,
                context.model?.dimensions?.height ||
                5
            )
        );

    if (
        typeof context.materials.get ===
        'function'
    ) {
        const material =
            context.materials.get(
                'wallMetal',
                context.colors?.wall,
                {
                    normalMap
                }
            );

        material.side =
            THREE.DoubleSide;

        material.needsUpdate =
            true;

        return material;
    }

    return (
        context.materials.wallMetal ||
        context.materials.wall
    );
}

function createWallMeshWithHoles(
    wallData,
    openings,
    wallKey,
    material,
    envelope,
    profileId
) {
    const shape =
        new THREE.Shape();

    const sideCode =
        SIDE_MAP[wallKey];

    const thickness =
        wallData.thickness;

    let points =
        wallData.shapePoints;

    /*
     * Walls are real solid panels with thickness.
     *
     * Do not enlarge the wall footprint here.
     *
     * The wall geometry already describes the building
     * envelope. Extrusion provides the physical wall
     * thickness.
     *
     * Previous implementation introduced:
     *
     *     overlap = thickness * 0.5
     *
     * and extended every wall beyond the envelope.
     *
     * That created an artificial solid volume at the
     * building corners which covered the foundation
     * and corner trims.
     */

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
        (point, index) => {
            if (
                index === 0
            ) {
                shape.moveTo(
                    point.x,
                    point.y
                );
            } else {
                shape.lineTo(
                    point.x,
                    point.y
                );
            }
        }
    );

    shape.closePath();

    openings
        .filter(
            opening =>
                opening.side ===
                sideCode
        )
        .forEach(
            opening => {

                const openingWidth =
                    opening.dimensions.width;

                const openingHeight =
                    opening.dimensions.height;

                const openingY =
                    opening.bounds.min.y;

                let holeCenterX;

                if (
                    sideCode === 'F' ||
                    sideCode === 'B'
                ) {
                    holeCenterX =
                        opening.x;
                } else if (
                    sideCode === 'L'
                ) {
                    holeCenterX =
                        opening.x;
                } else {
                    holeCenterX =
                        envelope.length -
                        opening.x;
                }

                const holeMinX =
                    holeCenterX -
                    openingWidth / 2;

                const holeMaxX =
                    holeCenterX +
                    openingWidth / 2;

                const holePath =
                    new THREE.Path();

                holePath.moveTo(
                    holeMinX,
                    openingY
                );

                holePath.lineTo(
                    holeMaxX,
                    openingY
                );

                holePath.lineTo(
                    holeMaxX,
                    openingY +
                    openingHeight
                );

                holePath.lineTo(
                    holeMinX,
                    openingY +
                    openingHeight
                );

                holePath.closePath();

                shape.holes.push(
                    holePath
                );
            }
        );

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth:
                    thickness,

                bevelEnabled:
                    false
            }
        );

    applyPhysicalPanelUVs(
        geometry,
        envelope.width,
        wallData.height ??
            envelope.height,
        profileId
    );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        `wall-mesh-${sideCode}`;

    /*
     * Position the extruded wall so that
     * its OUTER face remains on the envelope.
     */

    if (
        sideCode === 'F'
    ) {
        /*
         * Front wall:
         *
         * local extrusion +Z
         * points toward the building interior.
         */
        mesh.position.set(
            0,
            0,
            0
        );
    } else if (
        sideCode === 'B'
    ) {
        /*
         * Back wall:
         *
         * extrusion extends toward -Z.
         */
        mesh.position.set(
            0,
            0,
            envelope.length -
            thickness
        );
    } else if (
        sideCode === 'L'
    ) {
        /*
         * Local +Z becomes world -X
         * after Y rotation.
         *
         * Outer face remains:
         *
         *     x = -width / 2
         */
        mesh.position.set(
            -envelope.width / 2 +
            thickness,
            0,
            0
        );

        mesh.rotation.y =
            -Math.PI / 2;
    } else if (
        sideCode === 'R'
    ) {
        /*
         * Local +Z becomes world +X.
         *
         * Outer face remains:
         *
         *     x = +width / 2
         */
        mesh.position.set(
            envelope.width / 2 -
            thickness,
            0,
            envelope.length
        );

        mesh.rotation.y =
            Math.PI / 2;
    }

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

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
        'walls';

    if (
        context.model?.visibility?.walls ===
        false
    ) {
        return root;
    }

    const profileId =
        context.model?.panels?.profile ||
        'awr';

    const material =
        getWallMaterial(
            context
        );

    const openings =
        context.geometry.openings ||
        [];

    const envelope =
        context.geometry.envelope;

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
            wallData?.shapePoints
        ) {
            root.add(
                createWallMeshWithHoles(
                    wallData,
                    openings,
                    wallKey,
                    material,
                    envelope,
                    profileId
                )
            );
        }
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

            if (
                child.geometry
            ) {
                child.geometry.dispose();

                child.geometry =
                    null;
            }
        }
    );

    const children =
        object.children.slice();

    for (
        let i = 0;
        i < children.length;
        i++
    ) {
        object.remove(
            children[i]
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