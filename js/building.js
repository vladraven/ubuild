import * as THREE from 'three';
import { openingsData, openingDefs } from './state.js';
import { createWindowsGroupForWall } from './windows.js';
import { createDoorsGroupForWall } from './doors.js';
import { wallMat, roofMat } from './colorise.js';

/**
 * Назначает корректные UV-координаты для плоскостей стен,
 * чтобы карты нормалей и текстуры ребер распределялись без искажений.
 */
function assignWallUVs(geometry, wallWidth, maxWallHeight) {
    const pos = geometry.attributes.position;
    const uvs = new Float32Array(pos.count * 2);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);

        uvs[i * 2] = (x + wallWidth / 2) / wallWidth;
        uvs[i * 2 + 1] = y / maxWallHeight;
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.uvsNeedUpdate = true;
}

function createWallShapeWithHoles(shapePoints, side) {
    const wallShape = new THREE.Shape();
    shapePoints.forEach((pt, idx) => {
        if (idx === 0) wallShape.moveTo(pt.x, pt.y);
        else wallShape.lineTo(pt.x, pt.y);
    });

    if (openingsData[side] && openingsData[side].length > 0) {
        openingsData[side].forEach(op => {
            const def = openingDefs[op.type];
            const w = op.w || (def ? def.w : 1.0);
            const h = op.h || (def ? def.h : 1.0);
            const yOff = (op.type === 'Window') ? (op.yOff !== undefined ? op.yOff : 1.0) : 0;

            const hole = new THREE.Path();
            const minX = op.x - w / 2;
            const maxX = op.x + w / 2;
            const minY = yOff;
            const maxY = yOff + h;

            hole.moveTo(minX, minY);
            hole.lineTo(maxX, minY);
            hole.lineTo(maxX, maxY);
            hole.lineTo(minX, maxY);
            hole.lineTo(minX, minY);

            wallShape.holes.push(hole);
        });
    }

    return wallShape;
}

export function createBuildingGroup(width, length, height, pitchRatio, roofType, hasOverhangs = false, vis = {}) {
    const group = new THREE.Group();

    const wallThick = 0.05;
    const halfW = width / 2;
    const halfL = length / 2;

    const isLeftSloped = roofType === 'left-sloped';
    const isRightSloped = roofType === 'right-sloped';
    const isSingleSlope = isLeftSloped || isRightSloped;

    const totalRise = isSingleSlope ? width * pitchRatio : halfW * pitchRatio;

    let leftWallHeight = height;
    let rightWallHeight = height;

    if (isLeftSloped) rightWallHeight = height + totalRise;
    else if (isRightSloped) leftWallHeight = height + totalRise;

    const maxFrontBackH = height + totalRise;

    // 1. СТЕНА LEFT (L)
    if (vis.wL) {
        const shapeL = createWallShapeWithHoles([
            { x: -halfL, y: 0 }, { x: halfL, y: 0 },
            { x: halfL, y: leftWallHeight }, { x: -halfL, y: leftWallHeight }
        ], 'L');

        const geoL = new THREE.ExtrudeGeometry(shapeL, { depth: wallThick, bevelEnabled: false });
        assignWallUVs(geoL, length, leftWallHeight);
        geoL.computeVertexNormals();

        const wallLeft = new THREE.Mesh(geoL, wallMat);
        wallLeft.rotation.y = Math.PI / 2;
        wallLeft.position.set(-halfW + wallThick / 2, 0, 0);
        wallLeft.castShadow = true;
        wallLeft.receiveShadow = true;
        group.add(wallLeft);

        const winL = createWindowsGroupForWall('L', length);
        winL.rotation.y = Math.PI / 2;
        winL.position.set(-halfW + wallThick / 2, 0, 0);
        group.add(winL);

        const doorL = createDoorsGroupForWall('L', length);
        doorL.rotation.y = Math.PI / 2;
        doorL.position.set(-halfW + wallThick / 2, 0, 0);
        group.add(doorL);
    }

    // 2. СТЕНА RIGHT (R)
    if (vis.wR) {
        const shapeR = createWallShapeWithHoles([
            { x: -halfL, y: 0 }, { x: halfL, y: 0 },
            { x: halfL, y: rightWallHeight }, { x: -halfL, y: rightWallHeight }
        ], 'R');

        const geoR = new THREE.ExtrudeGeometry(shapeR, { depth: wallThick, bevelEnabled: false });
        assignWallUVs(geoR, length, rightWallHeight);
        geoR.computeVertexNormals();

        const wallRight = new THREE.Mesh(geoR, wallMat);
        wallRight.rotation.y = -Math.PI / 2;
        wallRight.position.set(halfW - wallThick / 2, 0, 0);
        wallRight.castShadow = true;
        wallRight.receiveShadow = true;
        group.add(wallRight);

        const winR = createWindowsGroupForWall('R', length);
        winR.rotation.y = -Math.PI / 2;
        winR.position.set(halfW - wallThick / 2, 0, 0);
        group.add(winR);

        const doorR = createDoorsGroupForWall('R', length);
        doorR.rotation.y = -Math.PI / 2;
        doorR.position.set(halfW - wallThick / 2, 0, 0);
        group.add(doorR);
    }

    // 3. СТЕНЫ FRONT (F) И BACK (B)
    const getFrontBackPoints = (isBack = false) => {
        const hLeft = isBack ? rightWallHeight : leftWallHeight;
        const hRight = isBack ? leftWallHeight : rightWallHeight;

        if (isSingleSlope) {
            return [
                { x: -halfW, y: 0 },
                { x: halfW, y: 0 },
                { x: halfW, y: hRight },
                { x: -halfW, y: hLeft }
            ];
        } else {
            return [
                { x: -halfW, y: 0 },
                { x: halfW, y: 0 },
                { x: halfW, y: height },
                { x: 0, y: height + totalRise },
                { x: -halfW, y: height }
            ];
        }
    };

    if (vis.wF) {
        const shapeF = createWallShapeWithHoles(getFrontBackPoints(false), 'F');
        const geoF = new THREE.ExtrudeGeometry(shapeF, { depth: wallThick, bevelEnabled: false });
        assignWallUVs(geoF, width, maxFrontBackH);
        geoF.computeVertexNormals();

        const wallFront = new THREE.Mesh(geoF, wallMat);
        wallFront.position.set(0, 0, halfL - wallThick / 2);
        wallFront.castShadow = true;
        wallFront.receiveShadow = true;
        group.add(wallFront);

        const winF = createWindowsGroupForWall('F', width);
        winF.position.set(0, 0, halfL);
        group.add(winF);

        const doorF = createDoorsGroupForWall('F', width);
        doorF.position.set(0, 0, halfL);
        group.add(doorF);
    }

    if (vis.wB) {
        const shapeB = createWallShapeWithHoles(getFrontBackPoints(true), 'B');
        const geoB = new THREE.ExtrudeGeometry(shapeB, { depth: wallThick, bevelEnabled: false });
        assignWallUVs(geoB, width, maxFrontBackH);
        geoB.computeVertexNormals();

        const wallBack = new THREE.Mesh(geoB, wallMat);
        wallBack.rotation.y = Math.PI;
        wallBack.position.set(0, 0, -halfL + wallThick / 2);
        wallBack.castShadow = true;
        wallBack.receiveShadow = true;
        group.add(wallBack);

        const winB = createWindowsGroupForWall('B', width);
        winB.rotation.y = Math.PI;
        winB.position.set(0, 0, -halfL);
        group.add(winB);

        const doorB = createDoorsGroupForWall('B', width);
        doorB.rotation.y = Math.PI;
        doorB.position.set(0, 0, -halfL);
        group.add(doorB);
    }

    // 4. БАЗОВАЯ КРЫША С ТЕКСТУРОЙ
    if (!hasOverhangs && vis.checkRoof) {
        const roofThickness = 0.12;
        if (isSingleSlope) {
            const angle = Math.atan2(totalRise, width);
            const roofWidth = Math.sqrt(width * width + totalRise * totalRise);

            const singleRoofGeo = new THREE.BoxGeometry(roofWidth, roofThickness, length);
            const singleRoof = new THREE.Mesh(singleRoofGeo, roofMat);

            const rotSign = isLeftSloped ? 1 : -1;
            singleRoof.rotation.z = rotSign * angle;

            const yCenter = height + totalRise / 2;
            singleRoof.position.set(0, yCenter, 0);
            singleRoof.castShadow = true;
            singleRoof.receiveShadow = true;
            group.add(singleRoof);
        } else {
            const pitchAngle = Math.atan2(totalRise, halfW);
            const slopeLength = Math.sqrt(halfW * halfW + totalRise * totalRise);

            const slopeGeo = new THREE.BoxGeometry(slopeLength, roofThickness, length);

            // Левый скат
            const leftSlope = new THREE.Mesh(slopeGeo, roofMat);
            leftSlope.position.set(-halfW / 2, height + totalRise / 2, 0);
            leftSlope.rotation.z = pitchAngle;
            leftSlope.castShadow = true;
            leftSlope.receiveShadow = true;
            group.add(leftSlope);

            // Правый скат
            const rightSlope = new THREE.Mesh(slopeGeo, roofMat);
            rightSlope.position.set(halfW / 2, height + totalRise / 2, 0);
            rightSlope.rotation.z = -pitchAngle;
            rightSlope.castShadow = true;
            rightSlope.receiveShadow = true;
            group.add(rightSlope);
        }
    }

    return group;
}