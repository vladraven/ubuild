// js/mezzanine.js
import * as THREE from 'three';

export function createMezzanineGroup(geometry, enabled, coverageFraction, zPercent, hPercent, colorHex) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.mezzanine) return group;

    const mezzData = geometry.mezzanine;

    const mezzMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex || 0x334155),
        roughness: 0.4
    });

    const steelMaterial = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.6,
        roughness: 0.3
    });

    // 1. Плита перекрытия антресоли
    const floorThick = 0.15;
    const floorGeo = new THREE.BoxGeometry(mezzData.width, floorThick, mezzData.length);
    const floorMesh = new THREE.Mesh(floorGeo, mezzMaterial);
    floorMesh.position.set(0, mezzData.height - floorThick / 2, mezzData.zOffset);
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 2. Опорные колонны
    const colRadius = 0.1;
    const colGeo = new THREE.CylinderGeometry(colRadius, colRadius, mezzData.height - floorThick, 16);

    mezzData.columnPositions.forEach(pos => {
        const col = new THREE.Mesh(colGeo, steelMaterial);
        col.position.set(pos.x, (mezzData.height - floorThick) / 2, pos.z);
        col.castShadow = true;
        col.receiveShadow = true;
        group.add(col);
    });

    return group;
}