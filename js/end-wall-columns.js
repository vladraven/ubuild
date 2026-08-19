// js/end-wall-columns.js
import * as THREE from 'three';
import { steelMat } from './colorise.js';

export function createEndWallColumnsGroup(geometry, enabled) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.endWallColumns) return group;

    geometry.endWallColumns.columns.forEach(colData => {
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