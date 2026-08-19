// js/mezzanine.js
import * as THREE from 'three';
import { mezzMat, steelMat } from './colorise.js';

export function createMezzanineGroup(geometry, enabled, cov, z, h, color) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.mezzanine) return group;

    const m = geometry.mezzanine;
    
    // mezzMat является shared, обновляем цвет
    mezzMat.color.set(color || 0x334155);

    const floorThick = 0.15;
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(m.width, floorThick, m.length), mezzMat);
    floorMesh.position.set(0, m.height - floorThick / 2, m.zOffset);
    floorMesh.castShadow = true;
    group.add(floorMesh);

    const colGeo = new THREE.CylinderGeometry(0.1, 0.1, m.height - floorThick, 16);
    m.columnPositions.forEach(pos => {
        const col = new THREE.Mesh(colGeo, steelMat);
        col.position.set(pos.x, (m.height - floorThick) / 2, pos.z);
        col.castShadow = true;
        group.add(col);
    });
    return group;
}