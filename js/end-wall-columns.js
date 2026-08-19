// ================================================
// FILE: js/end-wall-columns.js
// ================================================
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.5,
    roughness: 0.5
});

export function createEndWallColumnsGroup(width, length, height, pitchRatio, roofType, enabled) {
    const group = new THREE.Group();
    if (!enabled) return group;

    const wallThick = 0.1;
    const innerW = width - wallThick * 2;
    const innerL = length - wallThick * 2;
    const colThick = 0.15;

    const isG = roofType === 'gabled';
    const isLSloped = roofType === 'left-sloped';
    const isRSloped = roofType === 'right-sloped';

    const colStep = 3.5;
    const halfW = innerW / 2;
    const zOffset = colThick / 2 + 0.25;

    for (let z of [-innerL / 2 + zOffset, innerL / 2 - zOffset]) {
        for (let x = -halfW + colStep; x <= halfW - colStep; x += colStep) {
            let colH = height;
            if (isG) {
                colH += (halfW - Math.abs(x)) * pitchRatio;
            } else if (isLSloped) {
                colH += (x + halfW) * pitchRatio;
            } else if (isRSloped) {
                colH += (halfW - x) * pitchRatio;
            }

            const col = new THREE.Mesh(new THREE.BoxGeometry(colThick, colH, colThick), steelMat);
            col.position.set(x, colH / 2, z);
            col.castShadow = true;
            group.add(col);
        }
    }

    return group;
}