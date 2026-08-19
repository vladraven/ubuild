// js/mezzanine.js
import * as THREE from 'three';

export function createMezzanineGroup(geometry, enabled, cov, z, h, color) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.mezzanine) return group;

    const m = geometry.mezzanine;
    const mezzMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(color || 0x334155), roughness: 0.4 });
    const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.3 });

    const floorThick = 0.15;
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(m.width, floorThick, m.length), mezzMaterial);
    floorMesh.position.set(0, m.height - floorThick / 2, m.zOffset);
    floorMesh.castShadow = true;
    group.add(floorMesh);

    const colGeo = new THREE.CylinderGeometry(0.1, 0.1, m.height - floorThick, 16);
    m.columnPositions.forEach(pos => {
        const col = new THREE.Mesh(colGeo, steelMaterial);
        col.position.set(pos.x, (m.height - floorThick) / 2, pos.z);
        col.castShadow = true;
        group.add(col);
    });
    return group;
}