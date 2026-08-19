// js/purlins.js
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.45,
    roughness: 0.48
});

export function createPurlinsGroup(geometry, enabled) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.purlins) return group;

    const pData = geometry.purlins;

    pData.items.forEach(item => {
        const purlin = new THREE.Mesh(
            new THREE.BoxGeometry(item.size, item.size, item.length),
            steelMat
        );
        purlin.position.set(item.position.x, item.position.y, item.position.z);
        purlin.rotation.z = item.rotationZ;
        purlin.castShadow = true;
        group.add(purlin);
    });

    return group;
}