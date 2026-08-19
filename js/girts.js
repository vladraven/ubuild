// js/girts.js
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.45,
    roughness: 0.48
});

export function createGirtsGroup(geometry, enabled) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.girts) return group;

    const girtsData = geometry.girts;
    const girtThick = girtsData.thickness;

    girtsData.levels.forEach(level => {
        const y = level.y;

        // Левый прогон
        const gL = new THREE.Mesh(new THREE.BoxGeometry(girtThick, girtThick, level.left.length), steelMat);
        gL.position.set(level.left.x, y, level.left.z);
        gL.castShadow = true;
        group.add(gL);

        // Правый прогон
        const gR = new THREE.Mesh(new THREE.BoxGeometry(girtThick, girtThick, level.right.length), steelMat);
        gR.position.set(level.right.x, y, level.right.z);
        gR.castShadow = true;
        group.add(gR);

        // Передний прогон
        const gF = new THREE.Mesh(new THREE.BoxGeometry(level.front.width, girtThick, girtThick), steelMat);
        gF.position.set(level.front.x, y, level.front.z);
        gF.castShadow = true;
        group.add(gF);

        // Задний прогон
        const gB = new THREE.Mesh(new THREE.BoxGeometry(level.back.width, girtThick, girtThick), steelMat);
        gB.position.set(level.back.x, y, level.back.z);
        gB.castShadow = true;
        group.add(gB);
    });

    return group;
}