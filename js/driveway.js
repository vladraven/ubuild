// js/driveway.js
import * as THREE from 'three';

const concreteMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });

export function createDrivewayGroup(geometry, enabled) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.driveway) return group;

    const d = geometry.driveway;
    const driveway = new THREE.Mesh(new THREE.BoxGeometry(d.width, d.height, d.length), concreteMat);
    driveway.position.set(d.position.x, d.position.y, d.position.z);
    driveway.receiveShadow = true;
    group.add(driveway);
    return group;
}