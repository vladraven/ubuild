// js/girts.js
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.45,
    roughness: 0.48
});

export function createGirtsGroup(width, length, height, enabled, geometry = null) {
    const group = new THREE.Group();
    if (!enabled || !geometry) return group;

    const innerW = geometry.interior.width;
    const innerL = geometry.interior.length;
    const girtThick = 0.08;
    const stepY = 1.2;
    const numGirts = Math.floor(height / stepY);

    for (let i = 1; i <= numGirts; i++) {
        const y = i * stepY;

        const gL = new THREE.Mesh(new THREE.BoxGeometry(girtThick, girtThick, innerL), steelMat);
        gL.position.set(-innerW / 2 + girtThick / 2, y, 0);
        gL.castShadow = true;
        group.add(gL);

        const gR = new THREE.Mesh(new THREE.BoxGeometry(girtThick, girtThick, innerL), steelMat);
        gR.position.set(innerW / 2 - girtThick / 2, y, 0);
        gR.castShadow = true;
        group.add(gR);

        const gF = new THREE.Mesh(new THREE.BoxGeometry(innerW - girtThick * 2, girtThick, girtThick), steelMat);
        gF.position.set(0, y, innerL / 2 - girtThick / 2);
        gF.castShadow = true;
        group.add(gF);

        const gB = new THREE.Mesh(new THREE.BoxGeometry(innerW - girtThick * 2, girtThick, girtThick), steelMat);
        gB.position.set(0, y, -innerL / 2 + girtThick / 2);
        gB.castShadow = true;
        group.add(gB);
    }

    return group;
}