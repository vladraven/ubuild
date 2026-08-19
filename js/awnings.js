// js/awnings.js
import * as THREE from 'three';
import { ltState } from './state.js';
import { roofMat, wallMat, trimMat } from './colorise.js';

export function createAwningsGroup(geometry) {
    const group = new THREE.Group();
    if (!geometry || !geometry.awnings) return group;

    const wallThick = geometry.building.wallThickness;

    ['L', 'R', 'F', 'B'].forEach(side => {
        const c = ltState[side];
        const awnData = geometry.awnings[side];

        if (!c || !c.active || !awnData) return;

        const awnGroup = new THREE.Group();
        awnGroup.position.set(awnData.position.x, awnData.position.y, awnData.position.z);
        awnGroup.rotation.y = awnData.rotationY;
        awnGroup.updateMatrixWorld();

        // 1. Кровля пристройки
        const roofGeo = new THREE.BoxGeometry(awnData.roof.lengthOnSlope, 0.1, awnData.width);
        roofGeo.translate(awnData.roof.lengthOnSlope / 2, 0, 0);

        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.rotation.z = -awnData.roof.pitchAngle;
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        awnGroup.add(roofMesh);

        // 2. Фасадная стена
        if (c.wallF) {
            const frontShape = new THREE.Shape();
            frontShape.moveTo(-awnData.width / 2, 0);
            frontShape.lineTo(awnData.width / 2, 0);
            frontShape.lineTo(awnData.width / 2, awnData.postH);
            frontShape.lineTo(-awnData.width / 2, awnData.postH);
            frontShape.lineTo(-awnData.width / 2, 0);

            const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: wallThick, bevelEnabled: false });
            const frontMesh = new THREE.Mesh(frontGeo, wallMat);
            frontMesh.rotation.y = Math.PI / 2;
            frontMesh.position.set(awnData.depth - wallThick / 2, -awnData.startY, 0);
            frontMesh.castShadow = true;
            frontMesh.receiveShadow = true;
            awnGroup.add(frontMesh);
        }

        // 3. Боковые стены с плоскостью отсечения ската
        const clipPlane = new THREE.Plane(
            new THREE.Vector3(-Math.sin(awnData.roof.pitchAngle), -Math.cos(awnData.roof.pitchAngle), 0).normalize(),
            0
        );
        clipPlane.applyMatrix4(awnGroup.matrixWorld);

        const createSideWallMesh = (isLeft) => {
            const sideShape = new THREE.Shape();
            sideShape.moveTo(0, 0);
            sideShape.lineTo(awnData.depth, 0);
            sideShape.lineTo(awnData.depth, awnData.startY + 0.2);
            sideShape.lineTo(0, awnData.startY + 0.2);
            sideShape.lineTo(0, 0);

            const clippedMat = wallMat.clone();
            clippedMat.clippingPlanes = [clipPlane];

            const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: wallThick, bevelEnabled: false });
            const sideMesh = new THREE.Mesh(sideGeo, clippedMat);

            if (isLeft) {
                sideMesh.rotation.y = Math.PI / 2;
                sideMesh.position.set(0, -awnData.startY, -awnData.width / 2);
            } else {
                sideMesh.rotation.y = -Math.PI / 2;
                sideMesh.position.set(awnData.depth, -awnData.startY, awnData.width / 2);
            }
            sideMesh.castShadow = true;
            sideMesh.receiveShadow = true;
            awnGroup.add(sideMesh);
        };

        if (c.wallL) createSideWallMesh(true);
        if (c.wallR) createSideWallMesh(false);

        // 4. Опорные стойки
        const colSize = 0.15;
        const colGeo = new THREE.BoxGeometry(colSize, awnData.postH, colSize);
        const colY = -awnData.startY + awnData.postH / 2;
        const colX = awnData.depth - colSize / 2;

        const col1 = new THREE.Mesh(colGeo, trimMat);
        col1.position.set(colX, colY, -awnData.width / 2 + colSize / 2);
        col1.castShadow = true;
        awnGroup.add(col1);

        const col2 = new THREE.Mesh(colGeo, trimMat);
        col2.position.set(colX, colY, awnData.width / 2 - colSize / 2);
        col2.castShadow = true;
        awnGroup.add(col2);

        group.add(awnGroup);
    });

    return group;
}