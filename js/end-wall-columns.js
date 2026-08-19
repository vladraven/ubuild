// js/end-wall-columns.js
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.5,
    roughness: 0.5
});

export function createEndWallColumnsGroup(geometry, enabled) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.endWallColumns) return group;

    const columnsData = geometry.endWallColumns.columns;

    columnsData.forEach(colData => {
        const col = new THREE.Mesh(
            new THREE.BoxGeometry(colData.thickness, colData.height, colData.thickness),
            steelMat
        );
        col.position.set(colData.x, colData.height / 2, colData.z);
        col.castShadow = true;
        group.add(col);
    });

    return group;
}