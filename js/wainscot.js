import * as THREE from 'three';
import { openingsData, openingDefs } from './state.js';
import { wainscotMat } from './colorise.js';

function alignUVs(geometry, fullWidth) {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        const x = pos.getX(i);
        const u = (x + fullWidth / 2) / fullWidth;
        uv.setX(i, u);
    }
    uv.needsUpdate = true;
}

export function createWainscotGroup(width, length, height, pitchRatio, roofType, wsHeight, wsColorHex, enabled, vis = {}) {
    const group = new THREE.Group();

    if (!enabled || wsHeight <= 0) return group;

    const wsThick = 0.02;
    const offsetZ = 0.005; // Смещение для предотвращения Z-fighting
    const halfW = width / 2;
    const halfL = length / 2;

    const isLeftSloped = roofType === 'left-sloped';
    const isRightSloped = roofType === 'right-sloped';
    const isSingleSlope = isLeftSloped || isRightSloped;
    const totalRise = isSingleSlope ? width * pitchRatio : halfW * pitchRatio;

    let maxLeftWallH = height;
    let maxRightWallH = height;

    if (isLeftSloped) {
        maxRightWallH = height + totalRise;
    } else if (isRightSloped) {
        maxLeftWallH = height + totalRise;
    }

    function addOpeningHolesToShape(shape, side, maxH) {
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
    }

    // Left Panel (L)
    if (vis.wL) {
        const leftWSH = Math.min(wsHeight, maxLeftWallH);
        if (leftWSH > 0) {
            const shapeL = new THREE.Shape();
            shapeL.moveTo(-halfL, 0);
            shapeL.lineTo(halfL, 0);
            shapeL.lineTo(halfL, leftWSH);
            shapeL.lineTo(-halfL, leftWSH);
            shapeL.lineTo(-halfL, 0);

            addOpeningHolesToShape(shapeL, 'L', leftWSH);

            const geoL = new THREE.ExtrudeGeometry(shapeL, { steps: 1, depth: wsThick, bevelEnabled: false });
            alignUVs(geoL, length);
            const meshL = new THREE.Mesh(geoL, wainscotMat);
            meshL.rotation.y = Math.PI / 2;
            meshL.position.set(-halfW - wsThick - offsetZ, 0, 0);
            meshL.castShadow = true;
            meshL.receiveShadow = true;
            group.add(meshL);
        }
    }

    // Right Panel (R)
    if (vis.wR) {
        const rightWSH = Math.min(wsHeight, maxRightWallH);
        if (rightWSH > 0) {
            const shapeR = new THREE.Shape();
            shapeR.moveTo(-halfL, 0);
            shapeR.lineTo(halfL, 0);
            shapeR.lineTo(halfL, rightWSH);
            shapeR.lineTo(-halfL, rightWSH);
            shapeR.lineTo(-halfL, 0);

            addOpeningHolesToShape(shapeR, 'R', rightWSH);

            const geoR = new THREE.ExtrudeGeometry(shapeR, { steps: 1, depth: wsThick, bevelEnabled: false });
            alignUVs(geoR, length);
            const meshR = new THREE.Mesh(geoR, wainscotMat);
            meshR.rotation.y = -Math.PI / 2;
            meshR.position.set(halfW + wsThick + offsetZ, 0, 0);
            meshR.castShadow = true;
            meshR.receiveShadow = true;
            group.add(meshR);
        }
    }

    // Front Panel (F)
    if (vis.wF) {
        const effectiveWSHeight = Math.min(wsHeight, height);
        if (effectiveWSHeight > 0) {
            const shapeF = new THREE.Shape();
            shapeF.moveTo(-halfW, 0);
            shapeF.lineTo(halfW, 0);
            shapeF.lineTo(halfW, effectiveWSHeight);
            shapeF.lineTo(-halfW, effectiveWSHeight);
            shapeF.lineTo(-halfW, 0);

            addOpeningHolesToShape(shapeF, 'F', effectiveWSHeight);

            const geoF = new THREE.ExtrudeGeometry(shapeF, { steps: 1, depth: wsThick, bevelEnabled: false });
            alignUVs(geoF, width);
            const meshF = new THREE.Mesh(geoF, wainscotMat);
            meshF.position.set(0, 0, halfL + wsThick + offsetZ);
            meshF.castShadow = true;
            meshF.receiveShadow = true;
            group.add(meshF);
        }
    }

    // Back Panel (B)
    if (vis.wB) {
        const effectiveWSHeight = Math.min(wsHeight, height);
        if (effectiveWSHeight > 0) {
            const shapeB = new THREE.Shape();
            shapeB.moveTo(-halfW, 0);
            shapeB.lineTo(halfW, 0);
            shapeB.lineTo(halfW, effectiveWSHeight);
            shapeB.lineTo(-halfW, effectiveWSHeight);
            shapeB.lineTo(-halfW, 0);

            addOpeningHolesToShape(shapeB, 'B', effectiveWSHeight);

            const geoB = new THREE.ExtrudeGeometry(shapeB, { steps: 1, depth: wsThick, bevelEnabled: false });
            alignUVs(geoB, width);
            const meshB = new THREE.Mesh(geoB, wainscotMat);
            meshB.rotation.y = Math.PI;
            meshB.position.set(0, 0, -halfL - wsThick - offsetZ);
            meshB.castShadow = true;
            meshB.receiveShadow = true;
            group.add(meshB);
        }
    }

    return group;
}