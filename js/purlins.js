// js/purlins.js
import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.45,
    roughness: 0.48
});

export function createPurlinsGroup(width, length, height, pitchRatio, roofType, enabled, geometry = null) {
    const group = new THREE.Group();
    if (!enabled || !geometry) return group;

    const innerW = geometry.interior.width;
    const innerL = geometry.interior.length;
    const halfW = innerW / 2;

    const isG = roofType === 'gabled';
    const isRSloped = roofType === 'right-sloped';
    const ang = geometry.building.pitchAngle || Math.atan(pitchRatio);

    const pSize = 0.1;
    const stepDist = 1.2;
    const offset = pSize / 2;

    function placePurlin(distFromEave, angle, sideDirection) {
        const purlin = new THREE.Mesh(new THREE.BoxGeometry(pSize, pSize, innerL), steelMat);
        const xOnSlope = sideDirection * (halfW - distFromEave * Math.cos(ang));
        const yOnSlope = height + distFromEave * Math.sin(ang);
        const offsetX = offset * Math.sin(angle);
        const offsetY = -offset * Math.cos(Math.abs(angle));

        purlin.position.set(xOnSlope + offsetX, yOnSlope + offsetY, 0);
        purlin.rotation.z = angle;
        purlin.castShadow = true;
        group.add(purlin);
    }

    if (isG) {
        const numPurlins = Math.floor(halfW / (stepDist * Math.cos(ang)));
        for (let i = 1; i <= numPurlins; i++) {
            const dist = i * stepDist;
            placePurlin(dist, ang, 1);
            placePurlin(dist, -ang, -1);
        }
    } else {
        const totalSpan = innerW / Math.cos(ang);
        const numPurlins = Math.floor(totalSpan / stepDist);
        const dir = isRSloped ? -1 : 1;
        const startX = isRSloped ? halfW : -halfW;

        for (let i = 1; i <= numPurlins; i++) {
            const dist = i * stepDist;
            const p = new THREE.Mesh(new THREE.BoxGeometry(pSize, pSize, innerL), steelMat);
            const posX = startX + dir * (dist * Math.cos(ang));
            const posY = height + dist * Math.sin(ang);
            const offsetX = offset * Math.sin(dir * ang);
            const offsetY = -offset * Math.cos(ang);

            p.position.set(posX + offsetX, posY + offsetY, 0);
            p.rotation.z = dir * ang;
            p.castShadow = true;
            group.add(p);
        }
    }

    return group;
}