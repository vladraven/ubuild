// js/trims.js
import * as THREE from 'three';
import {
    TRIM_CONFIG,
    createEaveTrim,
    createCornerTrimGeo,
    createRakeTrim
} from './trimParts.js';
import { trimMat } from './colorise.js';

export function createTrimsGroup(geometry, enabled = true) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.trims) {
        return group;
    }

    const trimsData = geometry.trims;
    const tS = TRIM_CONFIG.tS;
    const extraH = TRIM_CONFIG.eaveHeightExtra;

    // 1. Угловые нащельники
    trimsData.corners.forEach(c => {
        const corner = new THREE.Mesh(createCornerTrimGeo(c.colH, tS, c.sx, c.sz), trimMat);
        corner.position.set(c.x, 0, c.z);
        corner.castShadow = true;
        corner.renderOrder = 8;
        group.add(corner);
    });

    // 2. Карнизные планки (Eave Trims)
    const eaveLength = trimsData.eaves.left.length;

    const eaveL = createEaveTrim(eaveLength, -1, tS, extraH);
    eaveL.position.set(trimsData.eaves.left.x, trimsData.eaves.left.y + extraH / 2, trimsData.eaves.left.z);
    eaveL.castShadow = true;
    eaveL.renderOrder = 4;
    group.add(eaveL);

    const eaveR = createEaveTrim(eaveLength, 1, tS, extraH);
    eaveR.position.set(trimsData.eaves.right.x, trimsData.eaves.right.y + extraH / 2, trimsData.eaves.right.z);
    eaveR.castShadow = true;
    eaveR.renderOrder = 4;
    group.add(eaveR);

    // 3. Фронтонные торцевые планки (Rake Trims)
    trimsData.rakes.forEach(rake => {
        const rakeG = new THREE.Group();
        rakeG.position.set(rake.position.x, rake.position.y + extraH / 2, rake.position.z);
        rakeG.rotation.z = rake.rotationZ;

        const rMesh = createRakeTrim(rake.slopeLength, rake.sideZ, tS, extraH);
        rMesh.rotation.y = Math.PI / 2;
        rakeG.add(rMesh);
        rakeG.renderOrder = 5;

        group.add(rakeG);
    });

    return group;
}