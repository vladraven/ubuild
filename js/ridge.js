// js/ridge.js
import * as THREE from 'three';
import { trimMat } from './colorise.js';

export const RIDGE_CONFIG = {
    width: 0.4,
    thickness: 0.03,
    rise: 0.08,
    lengthOffset: 0.0
};

export function createRidgeGroup(geometry) {
    const group = new THREE.Group();
    if (!geometry || !geometry.trims || !geometry.trims.ridge) {
        return group;
    }

    const ridgeData = geometry.trims.ridge;
    const capWidth = RIDGE_CONFIG.width;
    const capThickness = RIDGE_CONFIG.thickness;
    const halfWidth = capWidth / 2;

    const roofPlaneRise = halfWidth * Math.tan(ridgeData.roofAngle);
    const capPeakHeight = roofPlaneRise + RIDGE_CONFIG.rise;

    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth, 0);
    shape.lineTo(0, capPeakHeight);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(halfWidth, -capThickness);
    shape.lineTo(0, capPeakHeight - capThickness);
    shape.lineTo(-halfWidth, -capThickness);
    shape.closePath();

    const ridgeLength = Math.max(0.01, ridgeData.length + RIDGE_CONFIG.lengthOffset);
    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: ridgeLength,
        bevelEnabled: false
    });
    extrudeGeo.translate(0, 0, -ridgeLength / 2);

    const ridgeMesh = new THREE.Mesh(extrudeGeo, trimMat);
    ridgeMesh.position.set(ridgeData.x, ridgeData.y, ridgeData.z);
    ridgeMesh.castShadow = true;
    ridgeMesh.receiveShadow = true;
    ridgeMesh.renderOrder = 6;

    group.add(ridgeMesh);
    return group;
}