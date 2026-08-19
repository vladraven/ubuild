// js/awnings.js
import * as THREE from 'three';
import { roofMat, wallMat, trimMat } from './colorise.js';

export function createAwningsGroup(geometry) {
    const group = new THREE.Group();
    if (!geometry || !geometry.awnings) return group;

    const wallThick = geometry.building.wallThickness;
    const awnDataMap = geometry.awnings;

    ['L', 'R', 'F', 'B'].forEach(side => {
        const awn = awnDataMap[side];
        if (!awn) return;

        const awnGroup = new THREE.Group();
        awnGroup.position.set(awn.position.x, awn.position.y, awn.position.z);
        awnGroup.rotation.y = awn.rotationY;
        awnGroup.updateMatrixWorld();

        // 1. Кровля пристройки
        const roofGeo = new THREE.BoxGeometry(awn.roof.lengthOnSlope, 0.1, awn.width);
        roofGeo.translate(awn.roof.lengthOnSlope / 2, 0, 0);

        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.rotation.z = -awn.roof.pitchAngle;
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        awnGroup.add(roofMesh);

        // 2. Фасадная стена
        if (awn.wallF) {
            const frontShape = new THREE.Shape();
            frontShape.moveTo(-awn.width / 2, 0);
            frontShape.lineTo(awn.width / 2, 0);
            frontShape.lineTo(awn.width / 2, awn.postH);
            frontShape.lineTo(-awn.width / 2, awn.postH);
            frontShape.lineTo(-awn.width / 2, 0);

            const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: wallThick, bevelEnabled: false });
            const frontMesh = new THREE.Mesh(frontGeo, wallMat);
            frontMesh.rotation.y = Math.PI / 2;
            frontMesh.position.set(awn.depth - wallThick / 2, -awn.startY, 0);
            frontMesh.castShadow = true;
            frontMesh.receiveShadow = true;
            awnGroup.add(frontMesh);
        }

        // 3. Боковые стены с плоскостью отсечения ската
        const clipPlane = new THREE.Plane(
            new THREE.Vector3(-Math.sin(awn.roof.pitchAngle), -Math.cos(awn.roof.pitchAngle), 0).normalize(),
            0
        );
        clipPlane.applyMatrix4(awnGroup.matrixWorld);

        const createSideWallMesh = (isLeft) => {
            const sideShape = new THREE.Shape();
            sideShape.moveTo(0, 0);
            sideShape.lineTo(awn.depth, 0);
            sideShape.lineTo(awn.depth, awn.startY + 0.2);
            sideShape.lineTo(0, awn.startY + 0.2);
            sideShape.lineTo(0, 0);

            const clippedMat = wallMat.clone();
            clippedMat.clippingPlanes = [clipPlane];

            const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: wallThick, bevelEnabled: false });
            const sideMesh = new THREE.Mesh(sideGeo, clippedMat);

            if (isLeft) {
                sideMesh.rotation.y = Math.PI / 2;
                sideMesh.position.set(0, -awn.startY, -awn.width / 2);
            } else {
                sideMesh.rotation.y = -Math.PI / 2;
                sideMesh.position.set(awn.depth, -awn.startY, awn.width / 2);
            }
            sideMesh.castShadow = true;
            sideMesh.receiveShadow = true;
            awnGroup.add(sideMesh);
        };

        if (awn.wallL) createSideWallMesh(true);
        if (awn.wallR) createSideWallMesh(false);

        // 4. Опорные стойки
        const colSize = 0.15;
        const colGeo = new THREE.BoxGeometry(colSize, awn.postH, colSize);
        const colY = -awn.startY + awn.postH / 2;
        const colX = awn.depth - colSize / 2;

        const col1 = new THREE.Mesh(colGeo, trimMat);
        col1.position.set(colX, colY, -awn.width / 2 + colSize / 2);
        col1.castShadow = true;
        awnGroup.add(col1);

        const col2 = new THREE.Mesh(colGeo, trimMat);
        col2.position.set(colX, colY, awn.width / 2 - colSize / 2);
        col2.castShadow = true;
        awnGroup.add(col2);

        group.add(awnGroup);
    });

    return group;
}