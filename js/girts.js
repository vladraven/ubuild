// js/girts.js
import * as THREE from 'three';
import { steelMat } from './colorise.js';

export function createGirtsGroup(geometry, enabled) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.girts) return group;

    const gData = geometry.girts;
    const gT = gData.thickness;

    gData.levels.forEach(lvl => {
        const y = lvl.y;

        const gL = new THREE.Mesh(new THREE.BoxGeometry(gT, gT, lvl.left.length), steelMat);
        gL.position.set(lvl.left.x, y, lvl.left.z);
        gL.castShadow = true;
        group.add(gL);

        const gR = new THREE.Mesh(new THREE.BoxGeometry(gT, gT, lvl.right.length), steelMat);
        gR.position.set(lvl.right.x, y, lvl.right.z);
        gR.castShadow = true;
        group.add(gR);

        const gF = new THREE.Mesh(new THREE.BoxGeometry(lvl.front.width, gT, gT), steelMat);
        gF.position.set(lvl.front.x, y, lvl.front.z);
        gF.castShadow = true;
        group.add(gF);

        const gB = new THREE.Mesh(new THREE.BoxGeometry(lvl.back.width, gT, gT), steelMat);
        gB.position.set(lvl.back.x, y, lvl.back.z);
        gB.castShadow = true;
        group.add(gB);
    });

    return group;
}