import * as THREE from 'three';
import { trimMat, eaveTrimMat } from './colorise.js';

// =========================================================================
// ЕДИНЫЕ НАСТРОЙКИ ВОДОСТОКОВ И ТРУБ
// =========================================================================
export const GUTTER_CONFIG = {
    // 1. ГОРИЗОНТАЛЬНЫЙ ЖЕЛОБ
    gutter: {
        lengthOffset: 0.125,     // Изменение длины желоба (+/- в метрах)
        widthOffset: 0.0,        // Изменение ширины желоба (+/- в метрах)
        offsetX: 0.0,            // Смещение желоба по X
        offsetY: -0.135          // Смещение желоба по высоте Y относительно карниза
    },

    // 2. ВЕРХНЕЕ КОЛЕНО
    topElbow: {
        angleDeg: 25,            // Угол наклона верхнего отрезка
        length: 0.35,            // Длина колена
        offsetX: 0.0,            // Сдвиг по X относительно верха трубы
        offsetY: -0.025,            // Сдвиг по Y относительно верха трубы
        offsetZ: 0.0             // Сдвиг по Z относительно верха трубы
    },

    // 3. НИЖНЕЕ КОЛЕНО
    bottomElbow: {
        angleDeg: 45,            // Угол наклона нижнего отвода в градусах
        length: 0.12,            // Длина отвода
        offsetX: 0.0,            // Сдвиг по X относительно низа трубы
        offsetY: 0.025,            // Сдвиг по Y относительно низа трубы
        offsetZ: 0.0             // Сдвиг по Z относительно низа трубы
    },

    // 4. ВЕРТИКАЛЬНАЯ ТРУБА (ФИКСИРОВАННЫЙ СТВОЛ)
    pipe: {
        wallOffset: 0.06,        // Отступ вертикальной трубы НАРУЖУ от стены (в метрах)
        heightOffset: 0.0,       // Изменение высоты трубы (+/-)
        groundOffset: 0.15,      // Высота нижнего среза трубы от земли
        width: 0.08,             // Ширина прямоугольного профиля
        depth: 0.06              // Глубина прямоугольного профиля
    }
};

const TRIM_CONFIG = {
    eaveLengthOffset: -0.124,
    eaveHeightExtra: 0.03,
    eaveYOffset: 0.0,
    rakeLengthOffset: 0.0,
    rakeHeightExtra: 0.03,
    rakeZOffset: 0.0,
    ridgeLengthOffset: -0.124,
    tS: 0.12
};
// =========================================================================

function createGutter(length) {
    const shape = new THREE.Shape();
    const w = 0.14 + GUTTER_CONFIG.gutter.widthOffset; 
    const h = 0.12; 
    const t = 0.01; 

    shape.moveTo(0, h);
    shape.lineTo(0, 0);
    shape.absarc(w / 2, 0, w / 2, Math.PI, 0, true);
    shape.lineTo(w, h);
    shape.lineTo(w - t, h);
    shape.absarc(w / 2, 0, w / 2 - t, 0, Math.PI, false);
    shape.lineTo(t, h);
    shape.closePath();

    const safeLength = Math.max(0.01, length + GUTTER_CONFIG.gutter.lengthOffset);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: safeLength, bevelEnabled: false });
    geo.translate(0, 0, -safeLength / 2);
    const mesh = new THREE.Mesh(geo, eaveTrimMat);
    mesh.castShadow = true;
    mesh.renderOrder = 2;

    // The trough shape above only fills the material (channel wall), leaving the
    // hollow interior open at both ends. Add flat end-cap plates (matching the
    // gutter's outer silhouette) to close off that hollow cross-section.
    const capShape = new THREE.Shape();
    capShape.moveTo(0, h);
    capShape.lineTo(0, 0);
    capShape.absarc(w / 2, 0, w / 2, Math.PI, 0, true);
    capShape.lineTo(w, h);
    capShape.closePath();
    const capGeo = new THREE.ShapeGeometry(capShape);

    const capFront = new THREE.Mesh(capGeo, eaveTrimMat);
    capFront.position.z = safeLength / 2;
    capFront.renderOrder = 2;
    mesh.add(capFront);

    const capBack = new THREE.Mesh(capGeo, eaveTrimMat);
    capBack.position.z = -safeLength / 2;
    capBack.renderOrder = 2;
    mesh.add(capBack);

    return mesh;
}

function createRectPipeGeo(length) {
    const safeLength = Math.max(0.01, length);
    const shape = new THREE.Shape();
    const w = GUTTER_CONFIG.pipe.width;
    const d = GUTTER_CONFIG.pipe.depth;
    const r = 0.012;

    shape.moveTo(-w / 2 + r, d / 2);
    shape.lineTo(w / 2 - r, d / 2);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2, d / 2 - r);
    shape.lineTo(w / 2, -d / 2 + r);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2 - r, -d / 2);
    shape.lineTo(-w / 2 + r, -d / 2);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2, -d / 2 + r);
    shape.lineTo(-w / 2, d / 2 - r);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2 + r, d / 2);

    const geo = new THREE.ExtrudeGeometry(shape, { depth: safeLength, bevelEnabled: false, curveSegments: 4 });
    geo.translate(0, 0, -safeLength / 2);
    geo.rotateX(Math.PI / 2);
    return geo;
}

function createDownspout(eaveY, sideX, overhang, width) {
    const group = new THREE.Group();
    const pipeMat = trimMat;

    const pipeWidth = GUTTER_CONFIG.pipe.width;
    const pipeDepth = GUTTER_CONFIG.pipe.depth;
    
    // Позиция стены здания + свес + заданный wallOffset
    const halfW = width / 2;
    const wallX = sideX * (halfW + overhang + GUTTER_CONFIG.pipe.wallOffset);

    // Торцы вертикальной трубы
    const pipeBottomY = Math.max(0.02, GUTTER_CONFIG.pipe.groundOffset);
    const topAngleRad = (GUTTER_CONFIG.topElbow.angleDeg * Math.PI) / 180;
    const topElbowLen = GUTTER_CONFIG.topElbow.length;
    
    const gutterBottomY = eaveY + GUTTER_CONFIG.gutter.offsetY;
    const topDropY = topElbowLen * Math.cos(topAngleRad);
    const pipeTopY = gutterBottomY - topDropY;

    const pipeH = Math.max(0.01, (pipeTopY - pipeBottomY) + GUTTER_CONFIG.pipe.heightOffset);

    // 1. ВЕРТИКАЛЬНАЯ ТРУБА
    const pipeGeo = createRectPipeGeo(pipeH);
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(wallX, pipeBottomY + pipeH / 2, 0);
    pipe.castShadow = true;
    group.add(pipe);

    const actualPipeTopY = pipeBottomY + pipeH;

    // 2. ВЕРХНЕЕ КОЛЕНО
    if (topElbowLen > 0) {
        const topGeo = createRectPipeGeo(topElbowLen);
        const topMesh = new THREE.Mesh(topGeo, pipeMat);
        const topRotZ = -sideX * topAngleRad;

        const shiftX = (topElbowLen / 2) * Math.sin(topAngleRad);
        const shiftY = (topElbowLen / 2) * Math.cos(topAngleRad);

        // NOTE: intentionally NOT applying GUTTER_CONFIG.topElbow.offsetY here.
        // pipeTopY/actualPipeTopY are derived directly from gutterBottomY above,
        // so the elbow's far end lands exactly on the gutter's bottom face
        // (downspout connects directly to the gutter with no floating gap).
        topMesh.position.set(
            wallX + (sideX * shiftX) + (sideX * GUTTER_CONFIG.topElbow.offsetX), 
            actualPipeTopY + shiftY, 
            GUTTER_CONFIG.topElbow.offsetZ
        );
        topMesh.rotation.z = topRotZ;
        topMesh.castShadow = true;
        group.add(topMesh);
    }

    // 3. НИЖНЕЕ КОЛЕНО
    const shoeLen = GUTTER_CONFIG.bottomElbow.length;
    if (shoeLen > 0) {
        const btmAngleRad = (GUTTER_CONFIG.bottomElbow.angleDeg * Math.PI) / 180;
        const btmMesh = new THREE.Mesh(createRectPipeGeo(shoeLen), pipeMat);
        
        const btmShiftX = (shoeLen / 2) * Math.sin(btmAngleRad);
        const btmDropY = (shoeLen / 2) * Math.cos(btmAngleRad);

        btmMesh.position.set(
            wallX + (sideX * btmShiftX) + (sideX * GUTTER_CONFIG.bottomElbow.offsetX), 
            pipeBottomY - btmDropY + GUTTER_CONFIG.bottomElbow.offsetY, 
            GUTTER_CONFIG.bottomElbow.offsetZ
        );
        btmMesh.rotation.z = sideX * btmAngleRad;
        btmMesh.castShadow = true;
        group.add(btmMesh);
    }

    // 4. ХОМУТЫ
    const strapGeo = new THREE.BoxGeometry(pipeWidth * 1.3, 0.02, pipeDepth * 1.3);
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });

    [0.3, (actualPipeTopY + pipeBottomY) * 0.5, actualPipeTopY - 0.1].forEach(yPos => {
        if (yPos > pipeBottomY && yPos < actualPipeTopY) {
            const bracket = new THREE.Mesh(strapGeo, strapMat);
            bracket.position.set(wallX, yPos, 0);
            bracket.castShadow = true;
            group.add(bracket);
        }
    });

    return group;
}

// Beveled Z/L-profile eave trim (real metal flashing profile), instead of a plain box.
// Cross-section (in the local X/Y plane, extruded along Z = wall length direction):
//  - a top "hem" lip that returns slightly toward the wall (rigidity fold)
//  - an angled main face
//  - a kicked-out drip edge at the bottom so water sheds away from the wall
function createEaveTrim(len, sideX, tS, extraH) {
    const shape = new THREE.Shape();
    const h = tS + extraH;
    const w = tS;
    const t = Math.max(0.006, tS * 0.15);
    const lip = w * 0.4;
    const drip = w * 0.28;

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
    const geo = new THREE.ExtrudeGeometry(shape, { depth: safeLength, bevelEnabled: false });
    geo.translate(0, 0, -safeLength / 2);
    const mesh = new THREE.Mesh(geo, eaveTrimMat);
    mesh.castShadow = true;
    // Render on top of wall/roof panels so underlying textures never bleed through
    mesh.renderOrder = 2;
    return mesh;
}

// Small L-shaped angle-bracket profile for corner trim (replaces the plain box column).
function createCornerTrimGeo(colH, tS, sx, sz) {
    const halfT = tS / 2;
    const legT = tS * 0.28;
    const shape = new THREE.Shape();

    shape.moveTo(sx * -halfT, sz * -halfT);
    shape.lineTo(sx * halfT, sz * -halfT);
    shape.lineTo(sx * halfT, sz * (-halfT + legT));
    shape.lineTo(sx * (-halfT + legT), sz * (-halfT + legT));
    shape.lineTo(sx * (-halfT + legT), sz * halfT);
    shape.lineTo(sx * -halfT, sz * halfT);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: colH, bevelEnabled: false });
    // Extrusion runs along Z by default; rotate so it runs along Y (building height)
    geo.rotateX(-Math.PI / 2);
    return geo;
}

function createRakeTrim(len, signZ, tS, extraH) {
    const depthS = tS;
    const h = tS + extraH;
    const shape = new THREE.Shape();
    
    shape.moveTo(0, h / 2);
    shape.lineTo(0, -h / 2);
    shape.lineTo(signZ * depthS, -h / 2);
    shape.lineTo(signZ * depthS, h / 2);
    shape.closePath();

    const safeLength = Math.max(0.01, len);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: safeLength, bevelEnabled: false });
    geo.translate(0, 0, -safeLength / 2);
    const mesh = new THREE.Mesh(geo, trimMat);
    mesh.castShadow = true;
    mesh.renderOrder = 1;
    return mesh;
}

export function createTrimsGroup(width, length, height, pitchRatio, roofType, enabled, overL = 0, overR = 0, guttersEnabled = false) {
    const group = new THREE.Group();
    // Trims and gutters are independent visual layers: bail out only when BOTH
    // are disabled. This lets the "Gutters & Downspouts" toggle work even when
    // "Show Trim" is switched off (previously the trims `enabled` flag gated
    // the entire group, hiding gutters too).
    if (!enabled && !guttersEnabled) return group;

    const tS = TRIM_CONFIG.tS; 
    const extraH = TRIM_CONFIG.eaveHeightExtra;
    const halfW = width / 2;
    const halfL = length / 2;
    const isG = roofType === 'gabled';
    const isLSloped = roofType === 'left-sloped';
    const isRSloped = roofType === 'right-sloped';
    const isSingle = isLSloped || isRSloped;

    const totalRise = isSingle ? width * pitchRatio : halfW * pitchRatio;
    const ang = Math.atan2(totalRise, isSingle ? width : halfW);

    // Угловые колонны (L-shaped angle trim, only part of the "Show Trim" layer)
    if (enabled) {
        [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
            let colH = height;
            if (sx > 0 && isLSloped) colH = height + totalRise;
            if (sx < 0 && isRSloped) colH = height + totalRise;

            const posX = sx * halfW;
            const posZ = sz * halfL;

            const corner = new THREE.Mesh(createCornerTrimGeo(colH, tS, sx, sz), trimMat);
            corner.position.set(posX, 0, posZ);
            corner.castShadow = true;
            corner.renderOrder = 1;
            group.add(corner);
        });
    }

    // Eave height calculations are shared by both the eave trim AND the gutters,
    // so they must be computed unconditionally (not gated by `enabled`).
    const eaveDropL = overL * pitchRatio;
    const eaveDropR = overR * pitchRatio;
    
    let leftEaveY = height - eaveDropL + (extraH / 2) + TRIM_CONFIG.eaveYOffset;
    let rightEaveY = height - eaveDropR + (extraH / 2) + TRIM_CONFIG.eaveYOffset;

    if (isLSloped) rightEaveY = height + totalRise + eaveDropR + (extraH / 2) + TRIM_CONFIG.eaveYOffset;
    if (isRSloped) leftEaveY = height + totalRise + eaveDropL + (extraH / 2) + TRIM_CONFIG.eaveYOffset;

    if (enabled) {
        const eaveLength = length + (tS * 2) + TRIM_CONFIG.eaveLengthOffset; 

        const eaveL = createEaveTrim(eaveLength, -1, tS, extraH);
        eaveL.position.set(-halfW - overL, leftEaveY, 0);
        group.add(eaveL);

        const eaveR = createEaveTrim(eaveLength, 1, tS, extraH);
        eaveR.position.set(halfW + overR, rightEaveY, 0);
        group.add(eaveR);
    }

    // Водостоки (independent of the "Show Trim" toggle - only guttersEnabled matters)
    if (guttersEnabled) {
        const gutterL = createGutter(length);
        gutterL.scale.x = -1; 
        gutterL.position.set(-halfW - overL + GUTTER_CONFIG.gutter.offsetX, leftEaveY + GUTTER_CONFIG.gutter.offsetY, 0);
        group.add(gutterL);

        const gutterR = createGutter(length);
        gutterR.position.set(halfW + overR - GUTTER_CONFIG.gutter.offsetX, rightEaveY + GUTTER_CONFIG.gutter.offsetY, 0);
        group.add(gutterR);

        const metersPerSpout = 25 * 0.3048; 
        const numDownspouts = Math.max(2, Math.ceil(length / metersPerSpout) + 1);
        const spacing = (length - 0.6) / Math.max(1, numDownspouts - 1);

        for(let i = 0; i < numDownspouts; i++) {
            const zPos = -halfL + 0.3 + (i * spacing);
            
            const dsL = createDownspout(leftEaveY, -1, overL, width);
            dsL.position.set(0, 0, zPos);
            // Tag with wall side + position-along-wall so door-collision auto-hide
            // (updateDownspoutVisibility in gutters.js) can find and toggle it.
            dsL.userData = { isDownspout: true, side: 'L', wallPos: zPos };
            group.add(dsL);

            const dsR = createDownspout(rightEaveY, 1, overR, width);
            dsR.position.set(0, 0, zPos);
            dsR.userData = { isDownspout: true, side: 'R', wallPos: zPos };
            group.add(dsR);
        }
    }

    if (!enabled) return group;

    // Передний и задний трим
    for (let sZ of [-1, 1]) {
        const zPos = sZ * (halfL + (tS / 2) + TRIM_CONFIG.rakeZOffset);

        if (isG) {
            const slopeLenL = Math.sqrt(Math.pow(halfW + overL + tS, 2) + Math.pow(totalRise + eaveDropL, 2)) + TRIM_CONFIG.rakeLengthOffset;
            const slopeLenR = Math.sqrt(Math.pow(halfW + overR + tS, 2) + Math.pow(totalRise + eaveDropR, 2)) + TRIM_CONFIG.rakeLengthOffset;

            const rakeLG = new THREE.Group();
            rakeLG.position.set(-halfW / 2 - overL / 2, height + totalRise / 2 - eaveDropL / 2 + (TRIM_CONFIG.rakeHeightExtra / 2), zPos);
            rakeLG.rotation.z = ang;
            const rMeshL = createRakeTrim(slopeLenL, sZ, tS, TRIM_CONFIG.rakeHeightExtra);
            rMeshL.rotation.y = Math.PI / 2;
            rakeLG.add(rMeshL);
            group.add(rakeLG);

            const rakeRG = new THREE.Group();
            rakeRG.position.set(halfW / 2 + overR / 2, height + totalRise / 2 - eaveDropR / 2 + (TRIM_CONFIG.rakeHeightExtra / 2), zPos);
            rakeRG.rotation.z = -ang;
            const rMeshR = createRakeTrim(slopeLenR, sZ, tS, TRIM_CONFIG.rakeHeightExtra);
            rMeshR.rotation.y = Math.PI / 2;
            rakeRG.add(rMeshR);
            group.add(rakeRG);

        } else {
            const activeOverhang = isLSloped ? overL : overR;
            const activeEaveDrop = isLSloped ? eaveDropL : eaveDropR;
            const slopeLen = Math.sqrt(Math.pow(width + (activeOverhang + tS) * 2, 2) + Math.pow(totalRise + activeEaveDrop * 2, 2)) + TRIM_CONFIG.rakeLengthOffset;
            const rotAngle = isLSloped ? ang : -ang;

            const rakeG = new THREE.Group();
            rakeG.position.set(0, height + totalRise / 2 + (TRIM_CONFIG.rakeHeightExtra / 2), zPos);
            rakeG.rotation.z = rotAngle;
            const rMesh = createRakeTrim(slopeLen, sZ, tS, TRIM_CONFIG.rakeHeightExtra);
            rMesh.rotation.y = Math.PI / 2;
            rakeG.add(rMesh);
            group.add(rakeG);
        }
    }

    // Конёк (Ridge Cap) - must sit exactly at the roof apex with no gap
    if (isG) {
        const capWidth = 0.4; // ~15.75in - realistic ridge cap width (within 12-18in range)
        const capThickness = 0.03;
        const overlapMargin = 0.02; // small extra rise so the flanks fully overlap the roof surface
        // Flank slope must match the actual roof pitch angle so the cap sits flush
        // against both roof panels with no visible gap.
        const capPeakH = (capWidth / 2) * Math.tan(ang) + overlapMargin;

        const shape = new THREE.Shape();
        shape.moveTo(-capWidth / 2, 0);
        shape.lineTo(0, capPeakH);
        shape.lineTo(capWidth / 2, 0);
        shape.lineTo(capWidth / 2, -capThickness);
        shape.lineTo(0, capPeakH - capThickness);
        shape.lineTo(-capWidth / 2, -capThickness);
        shape.closePath();

        const ridgeLength = Math.max(0.01, length + (tS * 2) + TRIM_CONFIG.ridgeLengthOffset); 

        const ridgeGeo = new THREE.ExtrudeGeometry(shape, { depth: ridgeLength, bevelEnabled: false });
        ridgeGeo.translate(0, 0, -ridgeLength / 2);

        // apexY = eaveHeight + (buildingWidth/2) * tan(roofPitchAngle)
        // totalRise already equals halfW * pitchRatio (= halfW * tan(ang)), so:
        const apexY = height + totalRise;

        const ridgeCap = new THREE.Mesh(ridgeGeo, trimMat);
        ridgeCap.position.set(0, apexY, 0);
        ridgeCap.castShadow = true;
        ridgeCap.renderOrder = 2;
        group.add(ridgeCap);
    }

    return group;
}