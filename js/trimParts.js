// js/trimParts.js
import * as THREE from 'three';
import { trimMat, eaveTrimMat, rakeTrimMat } from './colorise.js';

export const TRIM_CONFIG = {
    eaveLengthOffset: 0.0,
    eaveHeightExtra: 0.03,
    eaveYOffset: 0.0,
    rakeLengthOffset: 0.0,
    rakeHeightExtra: 0.03,
    rakeZOffset: 0.0,
    tS: 0.12
};

export function createEaveTrim(len, sideX, tS, extraH) {
    const shape = new THREE.Shape();
    const h = tS + extraH;
    const w = tS;
    const t = Math.max(0.006, tS * 0.15);
    const lip = w * 0.4;
    const drip = w * 0.28;

    shape.moveTo(0, h / 2);
    shape.lineTo(sideX * lip, h / 2);
    shape.lineTo(sideX * lip, h / 2 - t);
    shape.lineTo(sideX * (lip - t), h / 2 - t);
    shape.lineTo(sideX * (lip - t), -h / 2 + t + drip);
    shape.lineTo(sideX * w, -h / 2 + drip);
    shape.lineTo(sideX * w, -h / 2);
    shape.lineTo(sideX * (w - t), -h / 2);
    shape.lineTo(sideX * (w - t), -h / 2 + t);
    shape.lineTo(0, -h / 2 + t);
    shape.closePath();

    const safeLength = Math.max(0.01, len);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: safeLength,
        bevelEnabled: false
    });

    geo.translate(0, 0, -safeLength / 2);

    const mesh = new THREE.Mesh(geo, eaveTrimMat);
    mesh.castShadow = true;
    mesh.renderOrder = 4;

    return mesh;
}

export function createCornerTrimGeo(colH, tS, sx, sz) {
    const halfT = tS / 2;
    const legT = tS * 0.28;

    const shape = new THREE.Shape();
    shape.moveTo(sx * -halfT, sz * -halfT);
    shape.lineTo(sx * halfT, sz * -halfT);
    shape.lineTo(sx * halfT, sz * (-halfT + legT));
    shape.lineTo(sx * (-halfT + legT), sz * (-halfT + legT));
    shape.lineTo(sx * (-halfT + legT), sz * halfT);
    shape.lineTo(sx * -halfT, sz * halfT);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: colH,
        bevelEnabled: false
    });

    geo.rotateX(-Math.PI / 2);
    return geo;
}

export function createRakeTrim(len, signZ, tS, extraH) {
    const depthS = tS;
    const h = tS + extraH;

    const shape = new THREE.Shape();
    shape.moveTo(0, h / 2);
    shape.lineTo(0, -h / 2);
    shape.lineTo(signZ * depthS, -h / 2);
    shape.lineTo(signZ * depthS, h / 2);
    shape.closePath();

    const safeLength = Math.max(0.01, len);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: safeLength,
        bevelEnabled: false
    });

    geo.translate(0, 0, -safeLength / 2);

    const mesh = new THREE.Mesh(geo, rakeTrimMat || trimMat);
    mesh.castShadow = true;
    mesh.renderOrder = 5;

    return mesh;
}