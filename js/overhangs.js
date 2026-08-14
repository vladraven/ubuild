import * as THREE from 'three';
import { roofMat } from './colorise.js';

export function createOverhangsGroup(width, length, height, pitchRatio, roofType, overL, overR, overF, overB, vis = {}) {
    const group = new THREE.Group();

    if (!vis.checkRoof) return group;
    if (overL <= 0 && overR <= 0 && overF <= 0 && overB <= 0) return group;

    const roofThickness = 0.15;
    const halfW = width / 2;
    const isLeftSloped = roofType === 'left-sloped';
    const isRightSloped = roofType === 'right-sloped';
    const isSingleSlope = isLeftSloped || isRightSloped;

    const totalRise = isSingleSlope ? width * pitchRatio : halfW * pitchRatio;

    const totalLength = length + overF + overB;
    const zOffset = (overF - overB) / 2;

    if (isSingleSlope) {
        const angle = Math.atan2(totalRise, width);
        const totalProjWidth = width + overL + overR;
        const slopeWidth = totalProjWidth / Math.cos(angle);

        const roofGeo = new THREE.BoxGeometry(slopeWidth, roofThickness, totalLength);
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);

        const xOffset = (overR - overL) / 2;
        const yBase = height + totalRise / 2;
        const yOffset = xOffset * Math.tan(angle) * (isLeftSloped ? 1 : -1);

        roofMesh.rotation.z = isLeftSloped ? angle : -angle;
        roofMesh.position.set(xOffset, yBase + yOffset, zOffset);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        group.add(roofMesh);

    } else {
        const pitchAngle = Math.atan2(totalRise, halfW);

        const leftProjW = halfW + overL;
        const leftSlopeLen = leftProjW / Math.cos(pitchAngle);
        const leftSlopeGeo = new THREE.BoxGeometry(leftSlopeLen, roofThickness, totalLength);
        const leftSlope = new THREE.Mesh(leftSlopeGeo, roofMat);

        const leftX = -halfW / 2 - overL / 2;
        const leftY = height + (totalRise - overL * pitchRatio) / 2;
        leftSlope.position.set(leftX, leftY, zOffset);
        leftSlope.rotation.z = pitchAngle;
        leftSlope.castShadow = true;
        leftSlope.receiveShadow = true;
        group.add(leftSlope);

        const rightProjW = halfW + overR;
        const rightSlopeLen = rightProjW / Math.cos(pitchAngle);
        const rightSlopeGeo = new THREE.BoxGeometry(rightSlopeLen, roofThickness, totalLength);
        const rightSlope = new THREE.Mesh(rightSlopeGeo, roofMat);

        const rightX = halfW / 2 + overR / 2;
        const rightY = height + (totalRise - overR * pitchRatio) / 2;
        rightSlope.position.set(rightX, rightY, zOffset);
        rightSlope.rotation.z = -pitchAngle;
        rightSlope.castShadow = true;
        rightSlope.receiveShadow = true;
        group.add(rightSlope);
    }

    return group;
}