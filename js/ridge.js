import * as THREE from 'three';
import { trimMat } from './colorise.js';

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
    const capWidth =
        RIDGE_CONFIG.width;

    const capThickness =
        RIDGE_CONFIG.thickness;

    const halfWidth =
        capWidth / 2;

    /*
     * The two lower edges of the ridge cap
     * sit on the two roof planes.
     */

    const roofPlaneRise =
        halfWidth *
        Math.tan(roofAngle);

    /*
     * Explicit additional height above
     * the theoretical roof-plane apex.
     */

    const capPeakHeight =
        roofPlaneRise +
        RIDGE_CONFIG.rise;

    const shape =
        new THREE.Shape();

    shape.moveTo(
        -halfWidth,
        0
    );

    shape.lineTo(
        0,
        capPeakHeight
    );

    shape.lineTo(
        halfWidth,
        0
    );

    shape.lineTo(
        halfWidth,
        -capThickness
    );

    shape.lineTo(
        0,
        capPeakHeight -
            capThickness
    );

    shape.lineTo(
        -halfWidth,
        -capThickness
    );

    shape.closePath();

    /*
     * The ridge follows the exact longitudinal
     * roof dimension.
     */

    const ridgeLength =
        Math.max(
            0.01,
            roofLength +
            trimThickness * 2 +
            RIDGE_CONFIG.lengthOffset
        );

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth: ridgeLength,
                bevelEnabled: false
            }
        );

    geometry.translate(
        0,
        0,
        -ridgeLength / 2
    );

    const ridge =
        new THREE.Mesh(
            geometry,
            trimMat
        );

    /*
     * Same apex and same Z centre as the roof.
     */

    ridge.position.set(
        0,
        height + totalRise,
        zOffset
    );

    ridge.castShadow = true;
    ridge.receiveShadow = true;
    ridge.renderOrder = 2;

    return ridge;
}