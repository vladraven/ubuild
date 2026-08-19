// ================================================
// FILE: js/interior-liner.js
// ================================================
import * as THREE from 'three';
import { openingsData, openingDefs } from './state.js';
import { intWallMat } from './colorise.js';

function createLinerShapeWithHoles(shapePoints, side, maxH) {
    const shape = new THREE.Shape();
    shapePoints.forEach((pt, idx) => {
        if (idx === 0) shape.moveTo(pt.x, pt.y);
        else shape.lineTo(pt.x, pt.y);
    });

    const ops = openingsData[side] || [];
    ops.forEach(op => {
        const def = openingDefs[op.type] || { w: 1.0, h: 1.0 };
        const w = op.w || def.w;
        const h = op.h || def.h;
        const yOff = (op.type === 'Window') ? (op.yOff !== undefined ? op.yOff : 1.0) : 0;

        const minY = yOff;
        const maxY = yOff + h;

        if (minY < maxH) {
            const holeMinY = Math.max(0, minY);
            const holeMaxY = Math.min(maxH, maxY);

            if (holeMaxY > holeMinY) {
                const hole = new THREE.Path();
                const minX = op.x - w / 2;
                const maxX = op.x + w / 2;

                hole.moveTo(minX, holeMinY);
                hole.lineTo(maxX, holeMinY);
                hole.lineTo(maxX, holeMaxY);
                hole.lineTo(minX, holeMaxY);
                hole.lineTo(minX, holeMinY);

                shape.holes.push(hole);
            }
        }
    });

    return shape;
}

export function createInteriorLinerGroup(width, length, height, pitchRatio, roofType, enabled, hPercent) {
    const group = new THREE.Group();
    if (!enabled || hPercent <= 0) {
        return group;
    }

    const offsetIn = 0.75;
    const linerThick = 0.01;

    const innerW = width - offsetIn * 2;
    const innerL = length - offsetIn * 2;
    const halfW = innerW / 2;
    const halfL = innerL / 2;

    const isLeftSloped = roofType === 'left-sloped';
    const isRightSloped = roofType === 'right-sloped';
    const isSingleSlope = isLeftSloped || isRightSloped;
    const totalRise = isSingleSlope ? width * pitchRatio : (width / 2) * pitchRatio;

    let leftWallH = height;
    let rightWallH = height;

    if (isLeftSloped) rightWallH = height + totalRise;
    else if (isRightSloped) leftWallH = height + totalRise;

    const factor = Math.min(100, Math.max(0, hPercent)) / 100;
    const actualLeftH = leftWallH * factor;
    const actualRightH = rightWallH * factor;

    // 1. Left & Right Walls
    const shapeL = createLinerShapeWithHoles([
        { x: -halfL, y: 0 }, { x: halfL, y: 0 },
        { x: halfL, y: actualLeftH }, { x: -halfL, y: actualLeftH }
    ], 'L', actualLeftH);

    const geoL = new THREE.ExtrudeGeometry(shapeL, { depth: linerThick, bevelEnabled: false });
    geoL.computeVertexNormals();
    const meshL = new THREE.Mesh(geoL, intWallMat);
    meshL.rotation.y = Math.PI / 2;
    meshL.position.set(-halfW, 0, 0);
    meshL.castShadow = true;
    meshL.receiveShadow = true;
    group.add(meshL);

    const shapeR = createLinerShapeWithHoles([
        { x: -halfL, y: 0 }, { x: halfL, y: 0 },
        { x: halfL, y: actualRightH }, { x: -halfL, y: actualRightH }
    ], 'R', actualRightH);

    const geoR = new THREE.ExtrudeGeometry(shapeR, { depth: linerThick, bevelEnabled: false });
    geoR.computeVertexNormals();
    const meshR = new THREE.Mesh(geoR, intWallMat);
    meshR.rotation.y = -Math.PI / 2;
    meshR.position.set(halfW, 0, 0);
    meshR.castShadow = true;
    meshR.receiveShadow = true;
    group.add(meshR);

    // 2. Front & Back Walls
    const getFrontBackPoints = (isBack = false) => {
        const hL = isBack ? actualRightH : actualLeftH;
        const hR = isBack ? actualLeftH : actualRightH;

        if (isSingleSlope) {
            return [
                { x: -halfW, y: 0 },
                { x: halfW, y: 0 },
                { x: halfW, y: hR },
                { x: -halfW, y: hL }
            ];
        } else {
            const centerH = (height + totalRise) * factor;
            return [
                { x: -halfW, y: 0 },
                { x: halfW, y: 0 },
                { x: halfW, y: hR },
                { x: 0, y: centerH },
                { x: -halfW, y: hL }
            ];
        }
    };

    const maxFrontH = Math.max(actualLeftH, actualRightH);

    const shapeF = createLinerShapeWithHoles(getFrontBackPoints(false), 'F', maxFrontH);
    const geoF = new THREE.ExtrudeGeometry(shapeF, { depth: linerThick, bevelEnabled: false });
    geoF.computeVertexNormals();
    const meshF = new THREE.Mesh(geoF, intWallMat);
    meshF.position.set(0, 0, halfL - linerThick);
    meshF.castShadow = true;
    meshF.receiveShadow = true;
    group.add(meshF);

    const shapeB = createLinerShapeWithHoles(getFrontBackPoints(true), 'B', maxFrontH);
    const geoB = new THREE.ExtrudeGeometry(shapeB, { depth: linerThick, bevelEnabled: false });
    geoB.computeVertexNormals();
    const meshB = new THREE.Mesh(geoB, intWallMat);
    meshB.rotation.y = Math.PI;
    meshB.position.set(0, 0, -halfL + linerThick);
    meshB.castShadow = true;
    meshB.receiveShadow = true;
    group.add(meshB);

    return group;
}