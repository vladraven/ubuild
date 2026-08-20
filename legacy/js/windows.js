// js/windows.js
import * as THREE from 'three';
import { openingsData, openingDefs, hitboxes } from './state.js';
import { frameMat, glassMat } from './colorise.js';

function createBox(w, h, d, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
}

export function buildWindowMesh(op) {
    const grp = new THREE.Group();
    const def = openingDefs[op.type] || { w: 1.0, h: 1.0 };
    const w = op.w || def.w;
    const h = op.h || def.h;
    const d = 0.15;
    const f = 0.05; 

    grp.add(createBox(w, f, d, frameMat, 0, -h / 2 + f / 2, 0));
    grp.add(createBox(w, f, d, frameMat, 0, h / 2 - f / 2, 0));
    grp.add(createBox(f, h - f * 2, d, frameMat, -w / 2 + f / 2, 0, 0));
    grp.add(createBox(f, h - f * 2, d, frameMat, w / 2 - f / 2, 0, 0));

    grp.add(createBox(f, h - f * 2, d - 0.02, frameMat, 0, 0, 0));
    grp.add(createBox(w - f * 2, f, d - 0.02, frameMat, 0, 0, 0));

    const paneW = (w - f * 3) / 2;
    const paneH = (h - f * 3) / 2;
    const glassD = 0.02;

    grp.add(createBox(paneW, paneH, glassD, glassMat, -w / 4, -h / 4, 0));
    grp.add(createBox(paneW, paneH, glassD, glassMat, w / 4, -h / 4, 0));
    grp.add(createBox(paneW, paneH, glassD, glassMat, -w / 4, h / 4, 0));
    grp.add(createBox(paneW, paneH, glassD, glassMat, w / 4, h / 4, 0));

    const hit = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.z = 0.2;
    grp.add(hit);

    return { mesh: grp, hit: hit };
}

export function createWindowsGroupForWall(side, wallLength) {
    const group = new THREE.Group();
    if (!openingsData[side]) return group;

    openingsData[side].forEach(op => {
        if (op.type !== 'Window') return;

        const def = openingDefs[op.type] || { w: 1.0, h: 1.0, yOff: 1.0 };
        const opW = op.w || def.w;
        const opH = op.h || def.h;
        const yOff = op.yOff !== undefined ? op.yOff : def.yOff;

        const opObj = buildWindowMesh(op);
        
        opObj.mesh.position.set(op.x, yOff + opH / 2, 0);

        opObj.hit.userData = {
            isOpening: true,
            side: side,
            opId: op.id,
            opData: op,
            meshGroup: opObj.mesh,
            wallLength: wallLength
        };

        hitboxes.push(opObj.hit);
        group.add(opObj.mesh);
    });

    return group;
}