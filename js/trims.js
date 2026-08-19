import * as THREE from 'three';
import {
    TRIM_CONFIG,
    createEaveTrim,
    createCornerTrimGeo,
    createRakeTrim
} from './trimParts.js';

import { createRidge } from './ridge.js';
import { createGuttersGroup } from './gutters.js';
import { trimMat } from './colorise.js';

const WALL_THICKNESS = 0.05;

export function createTrimsGroup(
    width,
    length,
    height,
    pitchRatio,
    roofType,
    enabled,
    overL = 0,
    overR = 0,
    overF = 0,
    overB = 0,
    guttersEnabled = false,
    buildingGeometry = null
) {
    const group = new THREE.Group();

    if (!enabled && !guttersEnabled) {
        return group;
    }

    const tS = TRIM_CONFIG.tS;
    const extraH = TRIM_CONFIG.eaveHeightExtra;

    const halfW = width / 2;
    const halfL = length / 2;

    const isG = roofType === 'gabled';
    const isLSloped = roofType === 'left-sloped';
    const isRSloped = roofType === 'right-sloped';
    const isSingle = isLSloped || isRSloped;

    const totalRise = isSingle ? width * pitchRatio : halfW * pitchRatio;
    const roofAngle = Math.atan2(totalRise, isSingle ? width : halfW);

    const roofLength = buildingGeometry?.roof?.totalLength || (length + overF + overB);
    const roofZOffset = buildingGeometry?.roof?.zOffset ?? ((overF - overB) / 2);

    const outerLeftX = -halfW - WALL_THICKNESS / 2 - overL;
    const outerRightX = halfW + WALL_THICKNESS / 2 + overR;

    if (enabled) {
        [
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1]
        ].forEach(([sx, sz]) => {
            let colH = height;
            if (sx > 0 && isLSloped) colH = height + totalRise;
            if (sx < 0 && isRSloped) colH = height + totalRise;

            // Micro-shift (+0.002m) prevents corner trims from z-fighting wall/wainscot faces
            const x = (sx < 0 ? outerLeftX : outerRightX) + (sx * 0.002);
            const z = (sz > 0 ? (halfL + overF) : (-halfL - overB)) + (sz * 0.002);

            const corner = new THREE.Mesh(createCornerTrimGeo(colH, tS, sx, sz), trimMat);
            corner.position.set(x, 0, z);
            corner.castShadow = true;
            corner.renderOrder = 3;
            group.add(corner);
        });
    }

    const eaveDropL = overL * pitchRatio;
    const eaveDropR = overR * pitchRatio;

    let leftEaveY = height - eaveDropL + extraH / 2 + TRIM_CONFIG.eaveYOffset;
    let rightEaveY = height - eaveDropR + extraH / 2 + TRIM_CONFIG.eaveYOffset;

    if (isLSloped) rightEaveY = height + totalRise + eaveDropR + extraH / 2 + TRIM_CONFIG.eaveYOffset;
    if (isRSloped) leftEaveY = height + totalRise + eaveDropL + extraH / 2 + TRIM_CONFIG.eaveYOffset;

    if (enabled) {
        const eaveLength = roofLength + tS * 2 + TRIM_CONFIG.eaveLengthOffset;

        const eaveL = createEaveTrim(eaveLength, -1, tS, extraH);
        eaveL.position.set(outerLeftX - 0.001, leftEaveY, roofZOffset);
        eaveL.castShadow = true;
        eaveL.renderOrder = 4;
        group.add(eaveL);

        const eaveR = createEaveTrim(eaveLength, 1, tS, extraH);
        eaveR.position.set(outerRightX + 0.001, rightEaveY, roofZOffset);
        eaveR.castShadow = true;
        eaveR.renderOrder = 4;
        group.add(eaveR);
    }

    if (guttersEnabled) {
        group.add(createGuttersGroup(width, length, height, pitchRatio, roofType, true, overL, overR, overF, overB));
    }

    if (!enabled) {
        return group;
    }

    const frontZ = halfL + overF + WALL_THICKNESS / 2 + tS / 2 + TRIM_CONFIG.rakeZOffset + 0.003;
    const backZ = -halfL - overB - WALL_THICKNESS / 2 - tS / 2 - TRIM_CONFIG.rakeZOffset - 0.003;

    for (const sideZ of [-1, 1]) {
        const zPos = sideZ > 0 ? frontZ : backZ;

        if (isG) {
            const slopeLenL = Math.hypot(halfW + overL + tS, totalRise + eaveDropL) + TRIM_CONFIG.rakeLengthOffset;
            const slopeLenR = Math.hypot(halfW + overR + tS, totalRise + eaveDropR) + TRIM_CONFIG.rakeLengthOffset;

            const rakeLG = new THREE.Group();
            rakeLG.position.set(-halfW / 2 - overL / 2, height + totalRise / 2 - eaveDropL / 2 + TRIM_CONFIG.rakeHeightExtra / 2, zPos);
            rakeLG.rotation.z = roofAngle;

            const rMeshL = createRakeTrim(slopeLenL, sideZ, tS, TRIM_CONFIG.rakeHeightExtra);
            rMeshL.rotation.y = Math.PI / 2;
            rakeLG.add(rMeshL);
            group.add(rakeLG);

            const rakeRG = new THREE.Group();
            rakeRG.position.set(halfW / 2 + overR / 2, height + totalRise / 2 - eaveDropR / 2 + TRIM_CONFIG.rakeHeightExtra / 2, zPos);
            rakeRG.rotation.z = -roofAngle;

            const rMeshR = createRakeTrim(slopeLenR, sideZ, tS, TRIM_CONFIG.rakeHeightExtra);
            rMeshR.rotation.y = Math.PI / 2;
            rakeRG.add(rMeshR);
            group.add(rakeRG);
        } else {
            const activeOverhang = isLSloped ? overL : overR;
            const activeEaveDrop = isLSloped ? eaveDropL : eaveDropR;
            const slopeLen = Math.hypot(width + (activeOverhang + tS) * 2, totalRise + activeEaveDrop * 2) + TRIM_CONFIG.rakeLengthOffset;
            const rotAngle = isLSloped ? roofAngle : -roofAngle;

            const rakeG = new THREE.Group();
            rakeG.position.set(0, height + totalRise / 2 + TRIM_CONFIG.rakeHeightExtra / 2, zPos);
            rakeG.rotation.z = rotAngle;

            const rMesh = createRakeTrim(slopeLen, sideZ, tS, TRIM_CONFIG.rakeHeightExtra);
            rMesh.rotation.y = Math.PI / 2;
            rakeG.add(rMesh);
            group.add(rakeG);
        }
    }

    if (isG) {
        group.add(createRidge(roofLength, height, totalRise, roofAngle, tS, roofZOffset));
    }

    return group;
}