// js/crane.js
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.5, roughness: 0.4 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

export function createCraneGroup(width, length, height, enabled, zPercent, geometry = null) {
    const group = new THREE.Group();
    if (!enabled || !geometry) return group;

    const innerW = geometry.interior.width;
    const innerL = geometry.interior.length;
    const craneY = height * 0.75;

    const railBeamGeo = new THREE.BoxGeometry(0.15, 0.25, innerL);

    const leftRail = new THREE.Mesh(railBeamGeo, railMat);
    leftRail.position.set(-innerW / 2 + 0.1, craneY, 0);
    leftRail.castShadow = true;
    group.add(leftRail);

    const rightRail = new THREE.Mesh(railBeamGeo, railMat);
    rightRail.position.set(innerW / 2 - 0.1, craneY, 0);
    rightRail.castShadow = true;
    group.add(rightRail);

    const bridgeZ = -innerL / 2 + innerL * (Math.min(100, Math.max(0, zPercent)) / 100);

    const bridgeGeo = new THREE.BoxGeometry(innerW - 0.2, 0.35, 0.3);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, steelMat);
    bridgeMesh.position.set(0, craneY + 0.2, bridgeZ);
    bridgeMesh.castShadow = true;
    group.add(bridgeMesh);

    const trolleyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const trolleyMesh = new THREE.Mesh(trolleyGeo, railMat);
    trolleyMesh.position.set(0, craneY, bridgeZ);
    trolleyMesh.castShadow = true;
    group.add(trolleyMesh);

    const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8);
    const cableMesh = new THREE.Mesh(cableGeo, railMat);
    cableMesh.position.set(0, craneY - 0.7, bridgeZ);
    group.add(cableMesh);

    return group;
}