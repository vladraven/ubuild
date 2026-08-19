// js/driveway.js
import * as THREE from 'three';

const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.9
});

export function createDrivewayGroup(geometry, enabled) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.driveway) return group;

    const dData = geometry.driveway;
    const geo = new THREE.BoxGeometry(dData.width, dData.height, dData.length);
    const driveway = new THREE.Mesh(geo, concreteMat);
    driveway.position.set(dData.position.x, dData.position.y, dData.position.z);
    driveway.receiveShadow = true;

    group.add(driveway);
    return group;
}