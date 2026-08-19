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

export function createMainFramesGroup(geometry) {
    const group = new THREE.Group();
    if (!geometry || !geometry.mainFrames) return group;

    const framesData = geometry.mainFrames.frames;

    framesData.forEach(frameData => {
        const frame = new THREE.Group();

        // 1. Колонны
        const colLData = frameData.columns.left;
        const colL = createSolidColumnMesh(colLData.height, colLData.dStart, colLData.dEnd);
        colL.position.set(colLData.x, colLData.y, 0);
        colL.scale.x = colLData.scaleX;
        frame.add(colL);

        const colRData = frameData.columns.right;
        const colR = createSolidColumnMesh(colRData.height, colRData.dStart, colRData.dEnd);
        colR.position.set(colRData.x, colRData.y, 0);
        colR.scale.x = colRData.scaleX;
        frame.add(colR);

        // 2. Стропила
        frameData.rafters.forEach(raftData => {
            const raft = createRafterBeam(raftData.length, raftData.dStart, raftData.dEnd);
            raft.position.set(raftData.position.x, raftData.position.y, raftData.position.z);
            raft.rotation.z = raftData.rotationZ;
            frame.add(raft);
        });

        frame.position.z = frameData.zPos;
        group.add(frame);
    });

    return group;
}