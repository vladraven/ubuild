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
    tS: 0.10 // 10 см - реалистичная ширина полки нащельника
};

export function createEaveTrim(len, sideX, tS, extraH) {
    const shape = new THREE.Shape();
    const h = tS + extraH;
    const w = tS;
    const t = 0.01;
    const lip = w * 0.35;
    const drip = w * 0.25;

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
    const t = 0.01; // Толщина металла нащельника (1 см)
    const shape = new THREE.Shape();

    // L-образный профиль, внутренний угол которого плотно садится ровно на (0, 0)
    // а полки шириной tS идут строго вдоль внешних граней стен
    shape.moveTo(0, 0);
    shape.lineTo(sx * tS, 0);
    shape.lineTo(sx * tS, sz * t);
    shape.lineTo(sx * t, sz * t);
    shape.lineTo(sx * t, sz * tS);
    shape.lineTo(0, sz * tS);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: colH,
        bevelEnabled: false
    });

    geo.rotateX(-Math.PI / 2);
    return geo;
}

export function createRakeTrim(len, signZ, tS, extraH) {
    const h = tS + extraH;
    const t = 0.01;

    const shape = new THREE.Shape();
    shape.moveTo(0, h / 2);
    shape.lineTo(0, -h / 2);
    shape.lineTo(signZ * tS, -h / 2);
    shape.lineTo(signZ * tS, -h / 2 + t);
    shape.lineTo(signZ * t, -h / 2 + t);
    shape.lineTo(signZ * t, h / 2);
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