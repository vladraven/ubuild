// js/awnings.js
import * as THREE from 'three';
import {
    roofMat,
    wallMat,
    trimMat
} from './colorise.js';

function createExtrudedWall(
    wallData,
    material
) {
    if (!wallData) {
        return null;
    }

    const shape = new THREE.Shape();

    wallData.shapeData.points.forEach(
        (point, index) => {
            if (index === 0) {
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

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth: wallData.thickness,
                bevelEnabled: false
            }
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        wallData.position.x,
        wallData.position.y,
        wallData.position.z
    );

    mesh.rotation.y =
        wallData.rotationY;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

export function createAwningsGroup(
    geometry
) {
    const group =
        new THREE.Group();

    if (
        !geometry ||
        !geometry.awnings
    ) {
        return group;
    }

    const awnDataMap =
        geometry.awnings;

    [
        'L',
        'R',
        'F',
        'B'
    ].forEach(side => {
        const awn =
            awnDataMap[side];

        if (!awn) {
            return;
        }

        const awnGroup =
            new THREE.Group();

        awnGroup.position.set(
            awn.position.x,
            awn.position.y,
            awn.position.z
        );

        awnGroup.rotation.y =
            awn.rotationY;

        const roofGeometry =
            new THREE.BoxGeometry(
                awn.roof.lengthOnSlope,
                awn.roof.thickness,
                awn.width
            );

        roofGeometry.translate(
            awn.roof.lengthOnSlope / 2,
            0,
            0
        );

        const roofMesh =
            new THREE.Mesh(
                roofGeometry,
                roofMat
            );

        roofMesh.rotation.z =
            -awn.roof.pitchAngle;

        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;

        awnGroup.add(
            roofMesh
        );

        if (awn.wallF) {
            const frontWall =
                createExtrudedWall(
                    awn.wallF,
                    wallMat
                );

            if (frontWall) {
                awnGroup.add(
                    frontWall
                );
            }
        }

        if (awn.wallL) {
            const leftWall =
                createExtrudedWall(
                    awn.wallL,
                    wallMat
                );

            if (leftWall) {
                awnGroup.add(
                    leftWall
                );
            }
        }

        if (awn.wallR) {
            const rightWall =
                createExtrudedWall(
                    awn.wallR,
                    wallMat
                );

            if (rightWall) {
                awnGroup.add(
                    rightWall
                );
            }
        }

        if (awn.columns) {
            awn.columns.forEach(
                columnData => {
                    const columnGeometry =
                        new THREE.BoxGeometry(
                            columnData.size,
                            columnData.height,
                            columnData.size
                        );

                    const column =
                        new THREE.Mesh(
                            columnGeometry,
                            trimMat
                        );

                    column.position.set(
                        columnData.position.x,
                        columnData.position.y,
                        columnData.position.z
                    );

                    column.castShadow = true;

                    awnGroup.add(
                        column
                    );
                }
            );
        }

        group.add(
            awnGroup
        );
    });

    return group;
}