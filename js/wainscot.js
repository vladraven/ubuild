import * as THREE from 'three';

import {
    openingsData,
    openingDefs
} from './state.js';

import {
    getWainscotPanelMaterial,
    applyPanelUVs
} from './panelSystem.js';

import {
    createBuildingGeometry
} from './buildingGeometry.js';

function createWainscotShape(
    points,
    openings,
    maxHeight
) {
    const shape =
        new THREE.Shape();

    points.forEach(
        (point, index) => {
            if (index === 0) {
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

    openings.forEach(
        opening => {
            const def =
                openingDefs[
                    opening.type
                ] || {
                    w: 1.0,
                    h: 1.0
                };

            const width =
                opening.w ||
                def.w;

            const height =
                opening.h ||
                def.h;

            const yOffset =
                opening.type === 'Window'
                    ? (
                        opening.yOff !==
                        undefined
                            ? opening.yOff
                            : 1.0
                    )
                    : 0;

            const minY =
                yOffset;

            const maxY =
                yOffset +
                height;

            if (
                minY >= maxHeight
            ) {
                return;
            }

            const holeMinY =
                Math.max(
                    0,
                    minY
                );

            const holeMaxY =
                Math.min(
                    maxHeight,
                    maxY
                );

            if (
                holeMaxY <=
                holeMinY
            ) {
                return;
            }

            const minX =
                opening.x -
                width / 2;

            const maxX =
                opening.x +
                width / 2;

            const hole =
                new THREE.Path();

            hole.moveTo(
                minX,
                holeMinY
            );

            hole.lineTo(
                maxX,
                holeMinY
            );

            hole.lineTo(
                maxX,
                holeMaxY
            );

            hole.lineTo(
                minX,
                holeMaxY
            );

            hole.lineTo(
                minX,
                holeMinY
            );

            shape.holes.push(
                hole
            );
        }
    );

    return shape;
}

function createWainscotMesh(
    geometry,
    material,
    uvOriginX,
    uvOriginY
) {
    const meshGeometry =
        new THREE.ExtrudeGeometry(
            geometry,
            {
                steps: 1,
                depth: 0.02,
                bevelEnabled: false
            }
        );

    applyPanelUVs(
        meshGeometry,
        uvOriginX,
        uvOriginY
    );

    meshGeometry.computeVertexNormals();

    const mesh =
        new THREE.Mesh(
            meshGeometry,
            material
        );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function getSideOpenings(
    side
) {
    return openingsData[side] || [];
}

function createSideWainscot(
    group,
    side,
    sideGeometry,
    material,
    width,
    length
) {
    if (!sideGeometry) {
        return;
    }

    const mesh =
        createWainscotMesh(
            sideGeometry.shape,
            material,
            sideGeometry.uvOriginX,
            0
        );

    mesh.position.set(
        sideGeometry.position.x,
        sideGeometry.position.y,
        sideGeometry.position.z
    );

    mesh.rotation.y =
        sideGeometry.rotationY;

    group.add(
        mesh
    );
}

export function createWainscotGroup(
    width,
    length,
    height,
    pitchRatio,
    roofType,
    wsHeight,
    wsColorHex,
    enabled,
    vis = {}
) {
    const group =
        new THREE.Group();

    if (
        !enabled ||
        wsHeight <= 0
    ) {
        return group;
    }

    const panelMaterial =
        getWainscotPanelMaterial();

    const visibility = {
        wF:
            vis.wF ??
            true,

        wB:
            vis.wB ??
            true,

        wL:
            vis.wL ??
            true,

        wR:
            vis.wR ??
            true
    };

    const geometry =
        createBuildingGeometry({
            width,
            length,
            height,
            pitchRatio,
            roofType,

            openingsData,

            openingDefs,

            visibility
        });

    const wallGeometry =
        geometry.walls;

    const wainscotGeometry = {};

    const wsThickness =
        0.02;

    const offset =
        0.005;

    const leftWallHeight =
        geometry.building
            .leftWallHeight;

    const rightWallHeight =
        geometry.building
            .rightWallHeight;

    const leftHeight =
        Math.min(
            wsHeight,
            leftWallHeight
        );

    const rightHeight =
        Math.min(
            wsHeight,
            rightWallHeight
        );

    const frontHeight =
        Math.min(
            wsHeight,
            leftWallHeight
        );

    const backHeight =
        Math.min(
            wsHeight,
            rightWallHeight
        );

    if (visibility.wL) {
        const wall =
            wallGeometry.L;

        if (wall) {
            const halfL =
                wall.width / 2;

            wainscotGeometry.L = {
                shape:
                    createWainscotShape(
                        [
                            {
                                x: -halfL,
                                y: 0
                            },
                            {
                                x: halfL,
                                y: 0
                            },
                            {
                                x: halfL,
                                y: leftHeight
                            },
                            {
                                x: -halfL,
                                y: leftHeight
                            },
                            {
                                x: -halfL,
                                y: 0
                            }
                        ],
                        getSideOpenings('L'),
                        leftHeight
                    ),

                uvOriginX:
                    -length / 2,

                position: {
                    x:
                        geometry
                            .referencePlanes
                            .left
                            .x -
                        wsThickness -
                        offset,

                    y: 0,

                    z: 0
                },

                rotationY:
                    Math.PI / 2
            };

            createSideWainscot(
                group,
                'L',
                wainscotGeometry.L,
                panelMaterial,
                width,
                length
            );
        }
    }

    if (visibility.wR) {
        const wall =
            wallGeometry.R;

        if (wall) {
            const halfL =
                wall.width / 2;

            wainscotGeometry.R = {
                shape:
                    createWainscotShape(
                        [
                            {
                                x: -halfL,
                                y: 0
                            },
                            {
                                x: halfL,
                                y: 0
                            },
                            {
                                x: halfL,
                                y: rightHeight
                            },
                            {
                                x: -halfL,
                                y: rightHeight
                            },
                            {
                                x: -halfL,
                                y: 0
                            }
                        ],
                        getSideOpenings('R'),
                        rightHeight
                    ),

                uvOriginX:
                    -length / 2,

                position: {
                    x:
                        geometry
                            .referencePlanes
                            .right
                            .x +
                        wsThickness +
                        offset,

                    y: 0,

                    z: 0
                },

                rotationY:
                    -Math.PI / 2
            };

            createSideWainscot(
                group,
                'R',
                wainscotGeometry.R,
                panelMaterial,
                width,
                length
            );
        }
    }

    if (visibility.wF) {
        const wall =
            wallGeometry.F;

        if (wall) {
            const halfW =
                wall.width / 2;

            wainscotGeometry.F = {
                shape:
                    createWainscotShape(
                        [
                            {
                                x: -halfW,
                                y: 0
                            },
                            {
                                x: halfW,
                                y: 0
                            },
                            {
                                x: halfW,
                                y: frontHeight
                            },
                            {
                                x: -halfW,
                                y: frontHeight
                            },
                            {
                                x: -halfW,
                                y: 0
                            }
                        ],
                        getSideOpenings('F'),
                        frontHeight
                    ),

                uvOriginX:
                    -width / 2,

                position: {
                    x: 0,

                    y: 0,

                    z:
                        geometry
                            .referencePlanes
                            .front
                            .z +
                        wsThickness +
                        offset
                },

                rotationY: 0
            };

            createSideWainscot(
                group,
                'F',
                wainscotGeometry.F,
                panelMaterial,
                width,
                length
            );
        }
    }

    if (visibility.wB) {
        const wall =
            wallGeometry.B;

        if (wall) {
            const halfW =
                wall.width / 2;

            wainscotGeometry.B = {
                shape:
                    createWainscotShape(
                        [
                            {
                                x: -halfW,
                                y: 0
                            },
                            {
                                x: halfW,
                                y: 0
                            },
                            {
                                x: halfW,
                                y: backHeight
                            },
                            {
                                x: -halfW,
                                y: backHeight
                            },
                            {
                                x: -halfW,
                                y: 0
                            }
                        ],
                        getSideOpenings('B'),
                        backHeight
                    ),

                uvOriginX:
                    -width / 2,

                position: {
                    x: 0,

                    y: 0,

                    z:
                        geometry
                            .referencePlanes
                            .back
                            .z -
                        wsThickness -
                        offset
                },

                rotationY:
                    Math.PI
            };

            createSideWainscot(
                group,
                'B',
                wainscotGeometry.B,
                panelMaterial,
                width,
                length
            );
        }
    }

    return group;
}