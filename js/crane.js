// js/crane.js
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.5, roughness: 0.4 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

export function createCraneGroup(geometry, enabled, zPercent) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.crane) return group;

    const c = geometry.crane;
    const railBeamGeo = new THREE.BoxGeometry(0.15, 0.25, c.runwayLength);

    const leftRail = new THREE.Mesh(railBeamGeo, railMat);
    leftRail.position.set(c.rails.left.x, c.rails.left.y, c.rails.left.z);
    leftRail.castShadow = true;
    group.add(leftRail);

    const rightRail = new THREE.Mesh(railBeamGeo, railMat);
    rightRail.position.set(c.rails.right.x, c.rails.right.y, c.rails.right.z);
    rightRail.castShadow = true;
    group.add(rightRail);

    const bridgeGeo = new THREE.BoxGeometry(c.bridge.width, 0.35, 0.3);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, steelMat);
    bridgeMesh.position.set(0, c.bridge.y, c.bridge.z);
    bridgeMesh.castShadow = true;
    group.add(bridgeMesh);

    const trolleyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const trolleyMesh = new THREE.Mesh(trolleyGeo, railMat);
    trolleyMesh.position.set(0, c.bridge.y - 0.2, c.bridge.z);
    trolleyMesh.castShadow = true;
    group.add(trolleyMesh);

    return group;
}