// ================================================
// FILE: js/driveway.js
// ================================================
import * as THREE from 'three';

const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.9
});

export function createDrivewayGroup(width, length, enabled) {
    const group = new THREE.Group();
    if (!enabled) return group;

    const halfL = length / 2;
    const driveW = width * 0.25;
    const driveL = 8.0;
    const driveH = 0.08;

    const geo = new THREE.BoxGeometry(driveW, driveH, driveL);
    const driveway = new THREE.Mesh(geo, concreteMat);
    driveway.position.set(0, -driveH / 2, halfL + driveL / 2);
    driveway.receiveShadow = true;

    group.add(driveway);
    return group;
}