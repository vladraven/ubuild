import * as THREE from 'three';
import { ridgeTrimMat } from './colorise.js';

export const RIDGE_CONFIG = {
    width: 0.4,
    thickness: 0.03,
    rise: 0.08,
    lengthOffset: -0.124
};

export function createRidge(
    roofLength,
    height,
    totalRise,
    roofAngle,
    trimThickness,
    zOffset = 0
) {
    const capWidth = RIDGE_CONFIG.width;
    const capThickness = RIDGE_CONFIG.thickness;
    const halfWidth = capWidth / 2;

    const roofPlaneRise = halfWidth * Math.tan(roofAngle);
    const capPeakHeight = roofPlaneRise + RIDGE_CONFIG.rise;

    const shape = new THREE.Shape();

    shape.moveTo(-halfWidth, 0);
    shape.lineTo(0, capPeakHeight);
    shape.lineTo(halfWidth, 0);
    shape.lineTo(halfWidth, -capThickness);
    shape.lineTo(0, capPeakHeight - capThickness);
    shape.lineTo(-halfWidth, -capThickness);
    shape.closePath();

    const ridgeLength = Math.max(
        0.01,
        roofLength + trimThickness * 2 + RIDGE_CONFIG.lengthOffset
    );

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: ridgeLength,
        bevelEnabled: false
    });

    geometry.translate(0, 0, -ridgeLength / 2);

    const ridge = new THREE.Mesh(geometry, ridgeTrimMat);

    // Micro-elevation of +0.003m avoids z-fighting with peak roof panels & rake trims
    ridge.position.set(
        0,
        height + totalRise + 0.003,
        zOffset
    );

    ridge.castShadow = true;
    ridge.receiveShadow = true;
    ridge.renderOrder = 6;

    return ridge;
}