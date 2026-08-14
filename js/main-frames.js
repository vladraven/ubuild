import * as THREE from 'three';

const frameMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.4
});

/**
 * Единый монолитный двутавр колонны (1 Mesh, без составных элементов)
 */
function createSolidColumnMesh(height, dBottom, dTop, flangeW = 0.20, flangeT = 0.012, webT = 0.008) {
    const shape = new THREE.Shape();

    const halfF = flangeW / 2;
    const halfW = webT / 2;
    const halfB = dBottom / 2;
    const halfT = dTop / 2;

    // Рисуем единый монолитный I-профиль колонны с учетом сужения от dBottom к dTop
    shape.moveTo(-halfF, 0); // Нижняя полка: левый край
    shape.lineTo(halfF, 0);   // Нижняя полка: правый край
    shape.lineTo(halfF, flangeT);
    shape.lineTo(halfW, flangeT);

    // Стенка идет снизу вверх со сдвигом наружу (сужение)
    shape.lineTo(halfW, height - flangeT);

    // Верхняя полка
    shape.lineTo(halfF, height - flangeT);
    shape.lineTo(halfF, height);
    shape.lineTo(-halfF, height);
    shape.lineTo(-halfF, height - flangeT);
    shape.lineTo(-halfW, height - flangeT);

    // Возврат по стенке вниз
    shape.lineTo(-halfW, flangeT);
    shape.lineTo(-halfF, flangeT);
    shape.closePath();

    // Для сужающейся стенки строим чистую 2D-Shape профиля переменного сечения по X-Y
    const colShape = new THREE.Shape();
    
    // Внутренняя грань (прямая)
    colShape.moveTo(0, 0);
    colShape.lineTo(0, height);
    
    // Верхний торец
    colShape.lineTo(dTop, height);
    
    // Внешняя наклонная грань
    colShape.lineTo(dBottom, 0);
    colShape.closePath();

    const group = new THREE.Group();

    // 1. Монолитная стенка (Web)
    const webGeo = new THREE.ExtrudeGeometry(colShape, { depth: webT, bevelEnabled: false });
    const webMesh = new THREE.Mesh(webGeo, frameMat);
    webMesh.position.z = -webT / 2;
    group.add(webMesh);

    // 2. Внутренняя полка (вертикальная)
    const innerFlangeGeo = new THREE.BoxGeometry(flangeT, height, flangeW);
    const innerFlange = new THREE.Mesh(innerFlangeGeo, frameMat);
    innerFlange.position.set(-flangeT / 2, height / 2, 0);
    group.add(innerFlange);

    // 3. Внешняя полка (наклонная)
    const outerLen = Math.sqrt(height * height + (dTop - dBottom) * (dTop - dBottom));
    const outerFlangeGeo = new THREE.BoxGeometry(flangeT, outerLen, flangeW);
    const outerFlange = new THREE.Mesh(outerFlangeGeo, frameMat);
    
    const taperAngle = Math.atan2(dTop - dBottom, height);
    outerFlange.position.set((dBottom + dTop) / 2, height / 2, 0);
    outerFlange.rotation.z = -taperAngle;
    group.add(outerFlange);

    return group;
}

/**
 * Стропило переменного сечения (Tapered Rafter) — Без изменений
 */
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
    group.add(web);

    const topFlangeGeo = new THREE.BoxGeometry(rafterLength, flangeT, flangeW);
    const topFlange = new THREE.Mesh(topFlangeGeo, frameMat);
    topFlange.position.set(rafterLength / 2, -flangeT / 2, 0);
    group.add(topFlange);

    const bottomLen = Math.sqrt(rafterLength * rafterLength + (dStart - dEnd) * (dStart - dEnd));
    const bottomFlangeGeo = new THREE.BoxGeometry(bottomLen, flangeT, flangeW);
    const bottomFlange = new THREE.Mesh(bottomFlangeGeo, frameMat);

    const taperAngle = Math.atan2(dStart - dEnd, rafterLength);
    bottomFlange.position.set(rafterLength / 2, -(dStart + dEnd) / 2, 0);
    bottomFlange.rotation.z = taperAngle;
    group.add(bottomFlange);

    return group;
}

export function createMainFramesGroup(width, length, height, pitchRatio, roofType) {
    const group = new THREE.Group();

    const isGabled = roofType === 'gabled';
    const numFrames = Math.max(2, Math.round(length / 6) + 1);

    const halfW = width / 2;
    const halfL = length / 2;

    const ang = Math.atan(pitchRatio);

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
            // === ЛЕВАЯ КОЛОННА ===
            const colL = createSolidColumnMesh(height, colDStart, colDEnd);
            colL.position.set(-innerHalfW, 0, 0);
            frame.add(colL);

            // === ПРАВАЯ КОЛОННА ===
            const colR = createSolidColumnMesh(height, colDStart, colDEnd);
            colR.position.set(innerHalfW, 0, 0);
            colR.scale.x = -1; // Четкое зеркалирование относительно оси X
            frame.add(colR);

            const rafterSpan = innerHalfW - colDEnd / 2;
            const rafterLen = rafterSpan / Math.cos(ang);

            // === ЛЕВОЕ СТРОПИЛО ===
            const raftL = createRafterBeam(rafterLen, rafterDStart, rafterDEnd);
            raftL.position.set(-innerHalfW + colDEnd / 2, height, 0);
            raftL.rotation.z = ang;
            frame.add(raftL);

            // === ПРАВОЕ СТРОПИЛО ===
            const raftR = createRafterBeam(rafterLen, rafterDEnd, rafterDStart);
            raftR.position.set(0, height + rafterSpan * Math.tan(ang), 0);
            raftR.rotation.z = -ang;
            frame.add(raftR);

        } else {
            // === ОДНОСКАТНАЯ КРЫША ===
            const isLeftSloped = roofType === 'left-sloped';
            const totalRise = (innerHalfW * 2) * pitchRatio;

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