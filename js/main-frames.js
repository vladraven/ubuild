// js/main-frames.js
import * as THREE from 'three';

const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.32,
    metalness: 0.68
});

function createSolidColumnMesh(height, dBottom, dTop, flangeW = 0.20, flangeT = 0.012, webT = 0.008) {
    const colShape = new THREE.Shape();
    colShape.moveTo(0, 0);
    colShape.lineTo(0, height);
    colShape.lineTo(dTop, height);
    colShape.lineTo(dBottom, 0);
    colShape.closePath();

    const group = new THREE.Group();

    // 1. Web
    const webGeo = new THREE.ExtrudeGeometry(colShape, { depth: webT, bevelEnabled: false });
    const webMesh = new THREE.Mesh(webGeo, frameMat);
    webMesh.position.z = -webT / 2;
    webMesh.castShadow = true;
    webMesh.receiveShadow = true;
    group.add(webMesh);

    // 2. Inner Flange
    const innerFlangeGeo = new THREE.BoxGeometry(flangeT, height, flangeW);
    const innerFlange = new THREE.Mesh(innerFlangeGeo, frameMat);
    innerFlange.position.set(-flangeT / 2, height / 2, 0);
    innerFlange.castShadow = true;
    innerFlange.receiveShadow = true;
    group.add(innerFlange);

    // 3. Outer Flange
    const outerLen = Math.hypot(height, dTop - dBottom);
    const outerFlangeGeo = new THREE.BoxGeometry(flangeT, outerLen, flangeW);
    const outerFlange = new THREE.Mesh(outerFlangeGeo, frameMat);
    const taperAngle = Math.atan2(dTop - dBottom, height);

    outerFlange.position.set((dBottom + dTop) / 2, height / 2, 0);
    outerFlange.rotation.z = -taperAngle;
    outerFlange.castShadow = true;
    outerFlange.receiveShadow = true;
    group.add(outerFlange);

    return group;
}

function createRafterBeam(rafterLength, dStart, dEnd, flangeW = 0.20, flangeT = 0.012, webT = 0.008) {
    const group = new THREE.Group();
    const shape = new THREE.Shape();

    shape.moveTo(0, 0);
    shape.lineTo(rafterLength, 0);
    shape.lineTo(rafterLength, -dEnd);
    shape.lineTo(0, -dStart);
    shape.closePath();

    const webGeo = new THREE.ExtrudeGeometry(shape, { depth: webT, bevelEnabled: false });
    const web = new THREE.Mesh(webGeo, frameMat);
    web.position.z = -webT / 2;
    web.castShadow = true;
    web.receiveShadow = true;
    group.add(web);

    const topFlangeGeo = new THREE.BoxGeometry(rafterLength, flangeT, flangeW);
    const topFlange = new THREE.Mesh(topFlangeGeo, frameMat);
    topFlange.position.set(rafterLength / 2, -flangeT / 2, 0);
    topFlange.castShadow = true;
    topFlange.receiveShadow = true;
    group.add(topFlange);

    const bottomLen = Math.hypot(rafterLength, dStart - dEnd);
    const bottomFlangeGeo = new THREE.BoxGeometry(bottomLen, flangeT, flangeW);
    const bottomFlange = new THREE.Mesh(bottomFlangeGeo, frameMat);
    const taperAngle = Math.atan2(dStart - dEnd, rafterLength);

    bottomFlange.position.set(rafterLength / 2, -(dStart + dEnd) / 2, 0);
    bottomFlange.rotation.z = taperAngle;
    bottomFlange.castShadow = true;
    bottomFlange.receiveShadow = true;
    group.add(bottomFlange);

    return group;
}

export function createMainFramesGroup(width, length, height, pitchRatio, roofType, geometry = null) {
    const group = new THREE.Group();
    if (!geometry) return group;

    const isGabled = roofType === 'gabled';
    const numFrames = Math.max(2, Math.round(length / 6) + 1);

    const halfW = geometry.building.halfWidth;
    const halfL = geometry.building.halfLength;
    const ang = geometry.building.pitchAngle || Math.atan(pitchRatio);

    const colDStart = 0.20;
    const colDEnd = 0.40;
    const rafterDStart = 0.40;
    const rafterDEnd = 0.20;

    const insetX = 0.18;
    const insetZ = 0.15;
    const innerHalfW = halfW - insetX;
    const usableLength = length - insetZ * 2;
    const spacing = usableLength / (numFrames - 1);

    for (let i = 0; i < numFrames; i++) {
        const frame = new THREE.Group();
        const zPos = -halfL + insetZ + i * spacing;

        if (isGabled) {
            const colL = createSolidColumnMesh(height, colDStart, colDEnd);
            colL.position.set(-innerHalfW, 0, 0);
            frame.add(colL);

            const colR = createSolidColumnMesh(height, colDStart, colDEnd);
            colR.position.set(innerHalfW, 0, 0);
            colR.scale.x = -1;
            frame.add(colR);

            const rafterSpan = innerHalfW - colDEnd / 2;
            const rafterLen = rafterSpan / Math.cos(ang);

            const raftL = createRafterBeam(rafterLen, rafterDStart, rafterDEnd);
            raftL.position.set(-innerHalfW + colDEnd / 2, height, 0);
            raftL.rotation.z = ang;
            frame.add(raftL);

            const raftR = createRafterBeam(rafterLen, rafterDEnd, rafterDStart);
            raftR.position.set(0, height + rafterSpan * Math.tan(ang), 0);
            raftR.rotation.z = -ang;
            frame.add(raftR);
        } else {
            const isLeftSloped = (roofType === 'left-sloped');
            const totalRise = geometry.building.totalRise;
            const hL = isLeftSloped ? height : height + totalRise;
            const hR = isLeftSloped ? height + totalRise : height;

            const colL = createSolidColumnMesh(hL, colDStart, colDEnd);
            colL.position.set(-innerHalfW, 0, 0);
            frame.add(colL);

            const colR = createSolidColumnMesh(hR, colDStart, colDEnd);
            colR.position.set(innerHalfW, 0, 0);
            colR.scale.x = -1;
            frame.add(colR);

            const rafterSpan = (innerHalfW * 2) - colDEnd;
            const rafterLen = rafterSpan / Math.cos(ang);

            if (isLeftSloped) {
                const raft = createRafterBeam(rafterLen, rafterDEnd, rafterDStart);
                raft.position.set(-innerHalfW + colDEnd / 2, hL, 0);
                raft.rotation.z = ang;
                frame.add(raft);
            } else {
                const raft = createRafterBeam(rafterLen, rafterDStart, rafterDEnd);
                raft.position.set(-innerHalfW + colDEnd / 2, hL, 0);
                raft.rotation.z = -ang;
                frame.add(raft);
            }
        }

        frame.position.z = zPos;
        group.add(frame);
    }

    return group;
}