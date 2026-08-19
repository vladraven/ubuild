// js/purlins.js
import * as THREE from 'three';
import { steelMat } from './colorise.js';

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