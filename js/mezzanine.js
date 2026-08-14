import * as THREE from 'three';

export function createMezzanineGroup(width, length, height, enabled, coverageFraction, zPercent, hPercent, colorHex) {
    const group = new THREE.Group();

    if (!enabled) {
        return group;
    }

    const wallThick = 0.1;
    const innerW = width - wallThick * 2;
    const innerL = length - wallThick * 2;

    // Расчёт длины антресоли в зависимости от выбранного покрытия (1/3, 2/3, 3/3)
    const covFactor = (parseInt(coverageFraction) || 1) / 3;
    const mezzL = innerL * covFactor;

    // Расчёт высоты уровня антресоли
    const mezzH = height * (Math.min(100, Math.max(40, hPercent)) / 100);

    // Расчёт смещения по оси Z (от -halfL до +halfL)
    const maxZShift = innerL - mezzL;
    const zOffset = -innerL / 2 + mezzL / 2 + maxZShift * (Math.min(100, Math.max(0, zPercent)) / 100);

    const mezzMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex || 0x334155),
        roughness: 0.4
    });

    const steelMaterial = new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.6,
        roughness: 0.3
    });

    // 1. Настил антресоли (плита перекрытия)
    const floorThick = 0.15;
    const floorGeo = new THREE.BoxGeometry(innerW, floorThick, mezzL);
    const floorMesh = new THREE.Mesh(floorGeo, mezzMaterial);
    floorMesh.position.set(0, mezzH - floorThick / 2, zOffset);
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 2. Опорные колонны
    const colRadius = 0.1;
    const colGeo = new THREE.CylinderGeometry(colRadius, colRadius, mezzH - floorThick, 16);
    
    const xPositions = [-innerW / 2 + 0.3, innerW / 2 - 0.3];
    const zPositions = [zOffset - mezzL / 2 + 0.3, zOffset + mezzL / 2 - 0.3];

    xPositions.forEach(x => {
        zPositions.forEach(z => {
            const col = new THREE.Mesh(colGeo, steelMaterial);
            col.position.set(x, (mezzH - floorThick) / 2, z);
            col.castShadow = true;
            col.receiveShadow = true;
            group.add(col);
        });
    });

    return group;
}