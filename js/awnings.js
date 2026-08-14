import * as THREE from 'three';
import { ltState, openingsData, openingDefs } from './state.js';
import { roofMat, wallMat, trimMat } from './colorise.js';

function calculateAwningRoofTopLimits(side) {
    const wallOps = openingsData[side] || [];
    let minAllowedRoofTopY = 0;
    let windowForbiddenRanges = [];

    wallOps.forEach(op => {
        const def = openingDefs[op.type] || { w: 1.0, h: 1.0, yOff: 0 };
        const h = op.h || def.h;
        const isWindow = op.type === 'Window';

        if (isWindow) {
            const yOff = op.yOff !== undefined ? op.yOff : (def.yOff || 1.0);
            const winBottom = yOff;
            const winTop = yOff + h;

            windowForbiddenRanges.push({
                bottomBoundary: Math.max(0, winBottom - 0.05),
                topBoundary: winTop + 0.05
            });
        } else {
            const doorTop = h + 0.05;
            if (doorTop > minAllowedRoofTopY) {
                minAllowedRoofTopY = doorTop;
            }
        }
    });

    return { minAllowedRoofTopY, windowForbiddenRanges };
}

export function createAwningsGroup(width, length, height, pitchRatio, roofType) {
    const group = new THREE.Group();

    const wallOffset = 0.03;
    const wallThick = 0.05;
    const wOX = width / 2 + wallOffset;
    const wOZ = length / 2 + wallOffset;

    const maxAllowedDepth = width / 2;

    const buildSingleAwning = (side, c) => {
        if (!c || !c.active) return;

        const actualDepth = Math.min(c.depth, maxAllowedDepth);

        const isFB = (side === 'F' || side === 'B');
        const baseLength = isFB ? width : length;
        let actualW = baseLength - c.cutL - c.cutR;
        if (actualW <= 0) return;

        let startY = height - c.drop;
        const pitchAng = Math.atan(c.pitch / 12);
        const shiftOffset = (c.cutL - c.cutR) / 2;

        const { minAllowedRoofTopY, windowForbiddenRanges } = calculateAwningRoofTopLimits(side);

        if (minAllowedRoofTopY > 0 && startY < minAllowedRoofTopY) {
            startY = minAllowedRoofTopY;
        }

        windowForbiddenRanges.forEach(range => {
            if (startY > range.bottomBoundary && startY < range.topBoundary) {
                if (minAllowedRoofTopY > 0) {
                    startY = range.topBoundary;
                } else {
                    const distToTop = Math.abs(range.topBoundary - startY);
                    const distToBottom = Math.abs(startY - range.bottomBoundary);

                    if (distToTop <= distToBottom || range.bottomBoundary <= 0.2) {
                        startY = range.topBoundary;
                    } else {
                        startY = range.bottomBoundary;
                    }
                }
            }
        });

        if (startY > height) {
            startY = height;
        }

        let postH = startY - (actualDepth * Math.tan(pitchAng));

        if (postH <= 0.2) return;

        const awnGroup = new THREE.Group();

        if (side === 'F') { awnGroup.position.set(shiftOffset, startY, wOZ); awnGroup.rotation.y = -Math.PI / 2; }
        else if (side === 'B') { awnGroup.position.set(shiftOffset, startY, -wOZ); awnGroup.rotation.y = Math.PI / 2; }
        else if (side === 'R') { awnGroup.position.set(wOX, startY, shiftOffset); awnGroup.rotation.y = 0; }
        else if (side === 'L') { awnGroup.position.set(-wOX, startY, shiftOffset); awnGroup.rotation.y = Math.PI; }

        awnGroup.updateMatrixWorld();

        // Кровля пристройки
        const roofLenOnSlope = actualDepth / Math.cos(pitchAng);
        const roofGeo = new THREE.BoxGeometry(roofLenOnSlope, 0.1, actualW);
        roofGeo.translate(roofLenOnSlope / 2, 0, 0);

        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.rotation.z = -pitchAng;
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        awnGroup.add(roofMesh);

        // Фасадная стена пристройки
        if (c.wallF) {
            const frontShape = new THREE.Shape();
            frontShape.moveTo(-actualW / 2, 0);
            frontShape.lineTo(actualW / 2, 0);
            frontShape.lineTo(actualW / 2, postH);
            frontShape.lineTo(-actualW / 2, postH);
            frontShape.lineTo(-actualW / 2, 0);

            const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: wallThick, bevelEnabled: false });
            const frontMesh = new THREE.Mesh(frontGeo, wallMat);
            frontMesh.rotation.y = Math.PI / 2;
            frontMesh.position.set(actualDepth - wallThick / 2, -startY, 0);
            frontMesh.castShadow = true;
            frontMesh.receiveShadow = true;
            awnGroup.add(frontMesh);
        }

        // Боковые стены пристройки
        const clipPlane = new THREE.Plane(new THREE.Vector3(-Math.sin(pitchAng), -Math.cos(pitchAng), 0).normalize(), 0);
        clipPlane.applyMatrix4(awnGroup.matrixWorld);

        const createSideWallMesh = (isLeft) => {
            const sideShape = new THREE.Shape();
            sideShape.moveTo(0, 0);
            sideShape.lineTo(actualDepth, 0);
            sideShape.lineTo(actualDepth, startY + 0.2);
            sideShape.lineTo(0, startY + 0.2);
            sideShape.lineTo(0, 0);

            const clippedMat = wallMat.clone();
            clippedMat.clippingPlanes = [clipPlane];

            const sideGeo = new THREE.ExtrudeGeometry(sideShape, { depth: wallThick, bevelEnabled: false });
            const sideMesh = new THREE.Mesh(sideGeo, clippedMat);

            if (isLeft) {
                sideMesh.rotation.y = Math.PI / 2;
                sideMesh.position.set(0, -startY, -actualW / 2);
            } else {
                sideMesh.rotation.y = -Math.PI / 2;
                sideMesh.position.set(actualDepth, -startY, actualW / 2);
            }
            sideMesh.castShadow = true;
            sideMesh.receiveShadow = true;
            awnGroup.add(sideMesh);
        };

        if (c.wallL) createSideWallMesh(true);
        if (c.wallR) createSideWallMesh(false);

        // Опорные колонны
        const colSize = 0.15;
        const colGeo = new THREE.BoxGeometry(colSize, postH, colSize);
        const colY = -startY + postH / 2;
        const colX = actualDepth - colSize / 2;

        const col1 = new THREE.Mesh(colGeo, trimMat);
        col1.position.set(colX, colY, -actualW / 2 + colSize / 2);
        col1.castShadow = true;
        awnGroup.add(col1);

        const col2 = new THREE.Mesh(colGeo, trimMat);
        col2.position.set(colX, colY, actualW / 2 - colSize / 2);
        col2.castShadow = true;
        awnGroup.add(col2);

        group.add(awnGroup);
    };

    ['L', 'R', 'F', 'B'].forEach(side => {
        buildSingleAwning(side, ltState[side]);
    });

    return group;
}