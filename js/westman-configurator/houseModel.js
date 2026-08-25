// houseModel.js
import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';

import standard from './roofs/standard.js';
import saltbox from './roofs/saltbox.js';
import gambrel from './roofs/gambrel.js';
import butterfly from './roofs/butterfly.js';
import shed from './roofs/shed.js';
import flat from './roofs/flat.js';
import mansard from './roofs/mansard.js';
import hip from './roofs/hip.js';
import split from './roofs/split.js';
import pyramid from './roofs/pyramid.js';
import hexagonal from './roofs/hexagonal.js';
import m_shaped from './roofs/m_shaped.js';
import skillion_leanto from './roofs/skillion_leanto.js';
import jerkinhead from './roofs/jerkinhead.js';
import dutch_gable from './roofs/dutch_gable.js';
import combination from './roofs/combination.js';
import cross_hipped from './roofs/cross_hipped.js';
import hip_and_valley from './roofs/hip_and_valley.js';

const csgEvaluator = new Evaluator();

const RoofModules = {
    standard, saltbox, gambrel, butterfly, shed, 
    flat, mansard, hip, split, pyramid, hexagonal, 
    m_shaped, skillion_leanto, jerkinhead, dutch_gable, combination, cross_hipped, hip_and_valley
};

const createGenericRoofMesh = (pts, indices, params, materials, isFlat = false, customTY = null) => {
    const geom = new THREE.BufferGeometry();
    const peak = (params.width / 2) * (params.pitch / 12);
    
    const O = params.hasOverhang ? (params.overhang || 0) : 0; 
    
    const baseThickness = params.thickness;
    let totalDepth = baseThickness * 5.0; 
    
    if (customTY !== null && customTY !== undefined) {
        totalDepth = customTY * 5.0; 
    }
    
    const tY = isFlat ? totalDepth : (totalDepth / Math.cos(Math.atan(peak / (params.width / 2))));
    const n = pts.length;
    const allPts = [];
    
    const dropY = isFlat ? 0 : O * (params.pitch / 12);
    
    for (let i = 0; i < n; i++) {
        let px = pts[i].x;
        let py = pts[i].y;
        let pz = pts[i].z;
        
        if (px > 0.01) px += O;
        else if (px < -0.01) px -= O;
        
        if (pz > 0.01) pz += O;
        else if (pz < -0.01) pz -= O;
        
        if (!isFlat && Math.abs(py - params.height) < 0.1) {
            py -= dropY;
        }

        allPts.push(new THREE.Vector3(px, py, pz));
    }
    
    for (let i = 0; i < n; i++) {
        allPts.push(new THREE.Vector3(allPts[i].x, allPts[i].y - tY, allPts[i].z));
    }
    
    const allIndices = [...indices];
    const topIndicesCount = indices.length;
    
    // ДОБАВЛЯЕМ НИЖНИЕ ПОЛИГОНЫ (SOFFIT)
    for (let i = 0; i < indices.length; i += 3) {
        allIndices.push(indices[i] + n, indices[i + 2] + n, indices[i + 1] + n);
    }
    const bottomIndicesCount = indices.length;

    // ДОБАВЛЯЕМ БОКОВЫЕ ТОРЦЫ (TRIM)
    const edges = {};
    for (let i = 0; i < indices.length; i += 3) {
        edges[`${indices[i]}_${indices[i+1]}`] = true; 
        edges[`${indices[i+1]}_${indices[i+2]}`] = true; 
        edges[`${indices[i+2]}_${indices[i]}`] = true;
    }
    
    for (let key in edges) {
        const parts = key.split('_'); 
        const u = parseInt(parts[0]);
        const v = parseInt(parts[1]);
        if (!edges[`${v}_${u}`]) { 
            const uBot = u + n;
            const vBot = v + n;
            allIndices.push(v, u, uBot, v, uBot, vBot);
        }
    }

    geom.setFromPoints(allPts); 
    geom.setIndex(allIndices); 
    geom.computeVertexNormals();

    const uvs = [];
    const totalW = params.width + O * 2;
    const totalD = params.depth + O * 2;
    for (let i = 0; i < allPts.length; i++) {
        const u = totalW > 0 ? (allPts[i].x / totalW + 0.5) : 0;
        const v = totalD > 0 ? (allPts[i].z / totalD + 0.5) : 0;
        uvs.push(u, v);
    }
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    // РАЗДЕЛЯЕМ МАТЕРИАЛЫ
    geom.clearGroups();
    geom.addGroup(0, topIndicesCount, 0); // 0 = Roof (Верх)
    geom.addGroup(topIndicesCount, bottomIndicesCount, 2); // 2 = Soffit (Низ)
    geom.addGroup(topIndicesCount + bottomIndicesCount, allIndices.length - (topIndicesCount + bottomIndicesCount), 1); // 1 = Trim (Торцы)
    
    const matTrim = materials.trim || materials.roof;
    const matSoffit = materials.soffit || matTrim; 
    const multiMat = [materials.roof, matTrim, matSoffit];
    
    const mesh = new THREE.Mesh(geom, multiMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
};

// Функция для расчета смещения UV-координат (центрирование текстур)
function calculateUvOffset(width, alignment, textureScale) {
    if (alignment === 'middle') {
        return (width / 2) / textureScale;
    } else if (alignment === 'right') {
        return width / textureScale;
    }
    return 0; // 'left' по умолчанию
}

export const HouseGenerator = {
    createBuilding(params, materials) {
        const group = new THREE.Group();
        const activeModule = RoofModules[params.modelType] || RoofModules['standard'];

        const roofData = activeModule.getRoofData(params, THREE);
        if (roofData && roofData.pts && roofData.pts.length > 0) {
            const roofMesh = createGenericRoofMesh(roofData.pts, roofData.indices, params, materials, roofData.isFlat, roofData.customTY);
            group.add(roofMesh);
        }

        const createWallGroup = (w, h, pos, rot, isGable, wallId, customShape = null) => {
            const shape = customShape || (activeModule.getWallShape ? activeModule.getWallShape(w, h, isGable, wallId, params, THREE) : null);
            if (!shape) return new THREE.Group();

            const wallGroup = new THREE.Group();
            
            // Расчет смещения текстуры в зависимости от выравнивания (panelAlignment)
            // textureScaleWall (26.0) берется из глобальных параметров или жестко,
            // здесь используем примерное значение 26.0 как в app.js, если нужно точнее - нужно передавать как параметр.
            const texScale = 26.0; 
            const uvOffset = calculateUvOffset(w, params.panelAlignment || 'left', texScale);

            // ВРЕЗКА ОКОН ДЛЯ БАЗОВОЙ СТЕНЫ
            if (params.openings && params.openings[wallId] && params.openings[wallId].length > 0) {
                params.openings[wallId].forEach(o => {
                    let hx = o.offsetX !== undefined ? (-w / 2 + o.offsetX - o.w / 2) : (o.cx - o.w / 2);
                    const minX = -w / 2;
                    const maxX = w / 2 - o.w;
                    hx = Math.max(minX, Math.min(maxX, hx));

                    let hy = (o.isDoor || (o.cy - o.h / 2) <= 0) ? 0.01 : (o.cy - o.h / 2);
                    const maxY = h - o.h;
                    hy = Math.max(0.01, Math.min(maxY, hy));

                    o._safeCx = hx + o.w / 2;
                    o._safeCy = hy + o.h / 2;
                    o._safeHx = hx;
                    o._safeHy = hy;

                    const holePath = new THREE.Path();
                    holePath.moveTo(hx, hy);
                    holePath.lineTo(hx + o.w, hy);
                    holePath.lineTo(hx + o.w, hy + o.h);
                    holePath.lineTo(hx, hy + o.h);
                    holePath.closePath();
                    
                    shape.holes.push(holePath);
                });
            }

            const geom = new THREE.ExtrudeGeometry(shape, { depth: params.thickness, bevelEnabled: false });
            
            // ПРИМЕНЕНИЕ СМЕЩЕНИЯ ТЕКСТУРЫ ДЛЯ БАЗОВОЙ СТЕНЫ
            if (geom.attributes.uv) {
                const uvs = geom.attributes.uv.array;
                for (let i = 0; i < uvs.length; i += 2) {
                    uvs[i] += uvOffset;
                }
            }

            const wallMesh = new THREE.Mesh(geom, materials.wall);
            wallMesh.castShadow = true; wallMesh.receiveShadow = true;
            wallGroup.add(wallMesh);

            // --- НОВЫЙ СЛОЙ: FIRST FLOOR (ПЕРВЫЙ ЭТАЖ) ---
            if (params.hasTwoFloors && h > params.firstFloorHeight && params.firstFloorHeight > 0) {
                const ffShape = new THREE.Shape();
                ffShape.moveTo(-w/2, 0); ffShape.lineTo(w/2, 0);
                ffShape.lineTo(w/2, params.firstFloorHeight); ffShape.lineTo(-w/2, params.firstFloorHeight);
                ffShape.closePath();
                
                if (params.openings && params.openings[wallId] && params.openings[wallId].length > 0) {
                    params.openings[wallId].forEach(o => {
                        if (o._safeHy < params.firstFloorHeight) {
                            const holeTop = Math.min(o._safeHy + o.h, params.firstFloorHeight - 0.01);
                            const holeH = holeTop - o._safeHy;
                            if (holeH > 0) {
                                const holePath = new THREE.Path();
                                holePath.moveTo(o._safeHx, o._safeHy); 
                                holePath.lineTo(o._safeHx + o.w, o._safeHy);
                                holePath.lineTo(o._safeHx + o.w, o._safeHy + holeH); 
                                holePath.lineTo(o._safeHx, o._safeHy + holeH);
                                holePath.closePath();
                                ffShape.holes.push(holePath);
                            }
                        }
                    });
                }

                const ffGeom = new THREE.ExtrudeGeometry(ffShape, { depth: params.thickness + 0.05, bevelEnabled: false });
                
                // ПРИМЕНЕНИЕ СМЕЩЕНИЯ ТЕКСТУРЫ ДЛЯ ПЕРВОГО ЭТАЖА
                if (ffGeom.attributes.uv) {
                    const uvs = ffGeom.attributes.uv.array;
                    for (let i = 0; i < uvs.length; i += 2) {
                        uvs[i] += uvOffset;
                    }
                }

                const ffMat = materials.firstFloor || materials.wall;
                const ffMesh = new THREE.Mesh(ffGeom, ffMat);
                ffMesh.position.set(0, 0, -0.025); 
                ffMesh.castShadow = true; ffMesh.receiveShadow = true;
                wallGroup.add(ffMesh);
            }

            // --- WAINSCOT (ЦОКОЛЬ) ---
            if (params.hasWainscot && h > params.wainscotHeight && params.wainscotHeight > 0) {
                const wShape = new THREE.Shape();
                wShape.moveTo(-w/2, 0); wShape.lineTo(w/2, 0);
                wShape.lineTo(w/2, params.wainscotHeight); wShape.lineTo(-w/2, params.wainscotHeight);
                wShape.closePath();
                
                if (params.openings && params.openings[wallId] && params.openings[wallId].length > 0) {
                    params.openings[wallId].forEach(o => {
                        if (o._safeHy < params.wainscotHeight) {
                            const holeTop = Math.min(o._safeHy + o.h, params.wainscotHeight - 0.01);
                            const holeH = holeTop - o._safeHy;
                            if (holeH > 0) {
                                const holePath = new THREE.Path();
                                holePath.moveTo(o._safeHx, o._safeHy); 
                                holePath.lineTo(o._safeHx + o.w, o._safeHy);
                                holePath.lineTo(o._safeHx + o.w, o._safeHy + holeH); 
                                holePath.lineTo(o._safeHx, o._safeHy + holeH);
                                holePath.closePath();
                                wShape.holes.push(holePath);
                            }
                        }
                    });
                }

                const wGeom = new THREE.ExtrudeGeometry(wShape, { depth: params.thickness + 0.1, bevelEnabled: false });
                
                // ПРИМЕНЕНИЕ СМЕЩЕНИЯ ТЕКСТУРЫ ДЛЯ ЦОКОЛЯ
                if (wGeom.attributes.uv) {
                    const uvs = wGeom.attributes.uv.array;
                    for (let i = 0; i < uvs.length; i += 2) {
                        uvs[i] += uvOffset;
                    }
                }

                const matWainscot = materials.wainscot || materials.wall;
                const wainscotMesh = new THREE.Mesh(wGeom, matWainscot);
                wainscotMesh.position.set(0, 0, -0.05); 
                wainscotMesh.castShadow = true; wainscotMesh.receiveShadow = true;
                wallGroup.add(wainscotMesh);
            }

            // ВИЗУАЛЬНЫЕ ОКНА
            if (params.openings && params.openings[wallId] && params.openings[wallId].length > 0) {
                params.openings[wallId].forEach(o => {
                    const glassMat = new THREE.MeshStandardMaterial({ 
                        color: 0x111111, transparent: true, opacity: 0.4, metalness: 0.0, roughness: 0.9 
                    });
                    
                    const openDepth = params.thickness * 10;
                    const visualMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth), glassMat);
                    
                    visualMesh.position.set(o._safeCx, o._safeCy, params.thickness / 2); 
                    visualMesh.userData = { isOpening: true, id: o.id, wallId: wallId, w: o.w, h: o.h, isDoor: o.isDoor };
                    
                    const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
                    const maskMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth - 0.05), maskMat);
                    maskMesh.renderOrder = -1;
                    visualMesh.add(maskMesh);
                    
                    wallGroup.add(visualMesh);
                });
            }
            
            // TRIMS
            if (w > 1.0) {
                const trimW = 0.5; const trimD = params.thickness + 0.2; 
                
                let trimHL = h;
                let trimHR = h;

                if (shape) {
                    const pts = shape.getPoints();
                    let maxYL = 0;
                    let maxYR = 0;
                    for (let i = 0; i < pts.length; i++) {
                        const pt = pts[i];
                        if (Math.abs(pt.x - (-w / 2)) < 0.1 && pt.y > maxYL) {
                            maxYL = pt.y - .2;
                        }
                        if (Math.abs(pt.x - (w / 2)) < 0.1 && pt.y > maxYR) {
                            maxYR = pt.y - .2;
                        }
                    }
                    if (maxYL > 0) trimHL = maxYL;
                    if (maxYR > 0) trimHR = maxYR;
                }

                const matTrim = materials.trim || materials.wall;

                const trimGeomL = new THREE.BoxGeometry(trimW, trimHL, trimD);
                trimGeomL.translate(0, trimHL / 2, params.thickness / 2);
                const trimMeshL = new THREE.Mesh(trimGeomL, matTrim);
                trimMeshL.position.set(-w / 2 + trimW / 2, 0, 0);
                trimMeshL.castShadow = true; trimMeshL.receiveShadow = true;
                
                const trimGeomR = new THREE.BoxGeometry(trimW, trimHR, trimD);
                trimGeomR.translate(0, trimHR / 2, params.thickness / 2);
                const trimMeshR = new THREE.Mesh(trimGeomR, matTrim);
                trimMeshR.position.set(w / 2 - trimW / 2, 0, 0);
                trimMeshR.castShadow = true; trimMeshR.receiveShadow = true;

                wallGroup.add(trimMeshL, trimMeshR);

                if (params.hasGableDivider && isGable) {
                    const matGD = materials.gableDivider || materials.trim || materials.wall;
                    const gdGeom = new THREE.BoxGeometry(w + 0.2, trimW, trimD);
                    gdGeom.translate(0, h, params.thickness / 2); 
                    
                    const gdMesh = new THREE.Mesh(gdGeom, matGD);
                    gdMesh.castShadow = true; 
                    gdMesh.receiveShadow = true;
                    wallGroup.add(gdMesh);
                }
            }

            wallGroup.position.set(pos.x, pos.y, pos.z);
            wallGroup.rotation.set(rot.x, rot.y, rot.z);

            return wallGroup;
        };

        if (activeModule.buildCustomElements) {
            activeModule.buildCustomElements(params, materials, THREE, group, createGenericRoofMesh, csgEvaluator, createWallGroup);
        }

        if (activeModule.useDefaultWalls !== false) {
            if (params.modelType === 'hexagonal') {
                const R = params.width / 2; const a = R * Math.cos(Math.PI / 6); 
                const wallMap = ['front', 'right', 'back_right', 'back', 'left', 'front_left'];
                
                for (let i = 0; i < 6; i++) {
                    const angle = i * (Math.PI / 3);
                    const posZ = (a - params.thickness) * Math.cos(angle);
                    const posX = (a - params.thickness) * Math.sin(angle);
                    group.add(createWallGroup(R, params.height, {x: posX, y: 0, z: posZ}, {x: 0, y: angle, z: 0}, false, wallMap[i]));
                }
            } else {
                const isGableWall = !['mansard', 'hip', 'pyramid', 'flat', 'split', 'hexagonal', 'skillion_leanto', 'dutch_gable', 'combination'].includes(params.modelType);
                group.add(createWallGroup(params.width, params.height, {x: 0, y: 0, z: params.depth/2 - params.thickness}, {x:0, y:0, z:0}, isGableWall, 'front'));
                group.add(createWallGroup(params.width, params.height, {x: 0, y: 0, z: -params.depth/2}, {x:0, y:0, z:0}, isGableWall, 'back'));
                group.add(createWallGroup(params.depth, params.height, {x: params.width/2 - params.thickness, y: 0, z: 0}, {x:0, y: -Math.PI/2, z:0}, false, 'right'));
                group.add(createWallGroup(params.depth, params.height, {x: -params.width/2, y: 0, z: 0}, {x:0, y: Math.PI/2, z:0}, false, 'left'));
            }
        }

        // --- DORMER ---
        if (params.hasDormer && !['flat', 'shed', 'butterfly', 'pyramid', 'hexagonal', 'm_shaped', 'skillion_leanto', 'dutch_gable', 'combination', 'cross_hipped', 'hip_and_valley'].includes(params.modelType)) {
            const dw = params.dormerWidth; const dx = params.dormerDepth; 
            const dz = params.dormerZ; const dh = params.dormerHeight; 
            const O = params.hasOverhang ? (params.overhang || 0) : 0; 
            
            const mMain = params.pitch / 12; 
            const mDormer = (params.dormerPitch !== undefined ? params.dormerPitch : params.pitch) / 12;

            let run = (params.modelType === 'saltbox') ? (params.width * 0.66) : (params.width / 2);
            let ridgeX = (params.modelType === 'saltbox') ? (params.width / 2 - params.width * 0.33) : 0;

            const dPeak = (dw / 2) * mDormer; 
            const yRidge = params.height + (run * mMain);
            const yRoofAtFront = yRidge - (mMain * dx); 
            const dropY = O * mDormer; 

            const dormerGroup = new THREE.Group();
            const hFront = dh - yRoofAtFront; 
            
            if (hFront > 0) {
                const tY = params.thickness / Math.cos(Math.atan(mMain));
                const wallBaseY = yRoofAtFront - tY * 0.95;
                
                const frontS = new THREE.Shape();
                frontS.moveTo(-dw/2, wallBaseY); 
                frontS.lineTo(dw/2, wallBaseY); 
                frontS.lineTo(dw/2, dh);
                frontS.lineTo(0, dh + dPeak); 
                frontS.lineTo(-dw/2, dh); 
                frontS.closePath();
                
                if (params.openings && params.openings['dormer_front']) {
                    params.openings['dormer_front'].forEach(o => {
                        let hx = o.offsetX !== undefined ? (-dw / 2 + o.offsetX - o.w / 2) : (o.cx - o.w / 2);
                        hx = Math.max(-dw / 2, Math.min(dw / 2 - o.w, hx));
                        
                        let hy = (o.isDoor || (o.cy - o.h / 2) <= 0) ? 0.01 : (o.cy - o.h / 2);
                        hy = Math.max(0.01, Math.min(dh - o.h, hy));
                        
                        o._safeCx = hx + o.w / 2;
                        o._safeCy = hy + o.h / 2;

                        const holePath = new THREE.Path();
                        holePath.moveTo(hx, hy);
                        holePath.lineTo(hx + o.w, hy);
                        holePath.lineTo(hx + o.w, hy + o.h);
                        holePath.lineTo(hx, hy + o.h);
                        holePath.closePath();
                        
                        frontS.holes.push(holePath);
                    });
                }

                const frontGeom = new THREE.ExtrudeGeometry(frontS, { depth: params.thickness, bevelEnabled: false });
                
                // Смещение текстуры для Дормера
                const dormerUvOffset = calculateUvOffset(dw, params.panelAlignment || 'left', 26.0);
                if (frontGeom.attributes.uv) {
                    const uvs = frontGeom.attributes.uv.array;
                    for (let i = 0; i < uvs.length; i += 2) {
                        uvs[i] += dormerUvOffset;
                    }
                }

                const frontM = new THREE.Mesh(frontGeom, materials.wall);
                frontM.rotation.y = Math.PI / 2; 
                frontM.position.set(dx, 0, 0); 
                frontM.castShadow = true; frontM.receiveShadow = true;
                
                if (params.openings && params.openings['dormer_front']) {
                    params.openings['dormer_front'].forEach(o => {
                        const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.4 });
                        const openDepth = params.thickness * 10;
                        const visualMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth), glassMat);
                        visualMesh.position.set(o._safeCx, o._safeCy, params.thickness / 2); 
                        visualMesh.userData = { isOpening: true, id: o.id, wallId: 'dormer_front', w: o.w, h: o.h, isDoor: o.isDoor };
                        
                        const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
                        const maskMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth - 0.05), maskMat);
                        maskMesh.renderOrder = -1;
                        visualMesh.add(maskMesh);

                        frontM.add(visualMesh);
                    });
                }

                if (params.hasGableDivider) {
                    const matGD = materials.gableDivider || materials.trim || materials.wall;
                    const gdGeom = new THREE.BoxGeometry(dw + 0.2, 0.5, params.thickness + 0.2);
                    gdGeom.translate(0, dh, params.thickness / 2);
                    const gdMesh = new THREE.Mesh(gdGeom, matGD);
                    gdMesh.castShadow = true; gdMesh.receiveShadow = true;
                    frontM.add(gdMesh);
                }

                dormerGroup.add(frontM);

                const trimW = 0.5; const trimD = params.thickness + 0.2; const trimH = dh - wallBaseY;
                const matTrim = materials.trim || materials.wall;

                const trimGeomL = new THREE.BoxGeometry(trimW, trimH, trimD);
                trimGeomL.translate(-dw/2 + trimW/2, wallBaseY + trimH/2, params.thickness/2);
                const trimMeshL = new THREE.Mesh(trimGeomL, matTrim);
                trimMeshL.position.set(dx, 0, 0); trimMeshL.rotation.y = Math.PI / 2;
                trimMeshL.castShadow = true; trimMeshL.receiveShadow = true;
                dormerGroup.add(trimMeshL);

                const trimGeomR = new THREE.BoxGeometry(trimW, trimH, trimD);
                trimGeomR.translate(dw/2 - trimW/2, wallBaseY + trimH/2, params.thickness/2);
                const trimMeshR = new THREE.Mesh(trimGeomR, matTrim);
                trimMeshR.position.set(dx, 0, 0); trimMeshR.rotation.y = Math.PI / 2;
                trimMeshR.castShadow = true; trimMeshR.receiveShadow = true;
                dormerGroup.add(trimMeshR);

                const xIntersect = Math.max(0, (yRidge - dh) / mMain); 

                const sideS = new THREE.Shape();
                sideS.moveTo(xIntersect, dh); 
                sideS.lineTo(dx, yRoofAtFront); 
                sideS.lineTo(dx, dh);
                sideS.closePath();

                const sideG = new THREE.ExtrudeGeometry(sideS, { depth: params.thickness, bevelEnabled: false });
                
                // Смещение текстуры боковых стен дормера
                const sideUvOffset = calculateUvOffset(dx, params.panelAlignment || 'left', 26.0);
                if (sideG.attributes.uv) {
                    const uvs = sideG.attributes.uv.array;
                    for (let i = 0; i < uvs.length; i += 2) {
                        uvs[i] += sideUvOffset;
                    }
                }

                const sideR = new THREE.Mesh(sideG, materials.wall);
                sideR.position.set(0, 0, -dw/2 - params.thickness); 
                sideR.castShadow = true; sideR.receiveShadow = true;
                dormerGroup.add(sideR);
                
                const sideL = new THREE.Mesh(sideG, materials.wall);
                sideL.position.set(0, 0, dw/2); 
                sideL.castShadow = true; sideL.receiveShadow = true;
                dormerGroup.add(sideL);

                const rGeom = new THREE.BufferGeometry();
                const yR = dh + dPeak; const yE = dh - dropY; 
                const zE = dw/2 + O; const dXFront = dx + O; 
                
                const dT = (params.thickness * 5.0) / Math.cos(Math.atan(dPeak / (dw/2)));

                const pts = [
                    new THREE.Vector3(dXFront, yE, zE), new THREE.Vector3(dXFront, yR, 0),
                    new THREE.Vector3(dXFront, yE, -zE), 
                    new THREE.Vector3(dXFront, yE - dT, -zE),
                    new THREE.Vector3(dXFront, yR - dT, 0), 
                    new THREE.Vector3(dXFront, yE - dT, zE),
                    new THREE.Vector3(xIntersect, dh, zE), new THREE.Vector3((yRidge - yR)/mMain, yR, 0),
                    new THREE.Vector3(xIntersect, dh, -zE), 
                    new THREE.Vector3((yRidge - (dh - dT))/mMain, dh - dT, -zE),
                    new THREE.Vector3((yRidge - (yR - dT))/mMain, yR - dT, 0), 
                    new THREE.Vector3((yRidge - (dh - dT))/mMain, dh - dT, zE)
                ];

                const indices = [
                    0, 1, 7,  0, 7, 6, 1, 2, 8,  1, 8, 7, 
                    5, 11, 10, 5, 10, 4, 4, 10, 9, 4, 9, 3, 
                    0, 5, 4, 0, 4, 1, 1, 4, 3, 1, 3, 2, 
                    6, 7, 10, 6, 10, 11, 7, 8, 9, 7, 9, 10 
                ];

                const uvs = [];
                for(let i=0; i<12; i++) uvs.push(pts[i].x/params.width + 0.5, pts[i].z/params.depth + 0.5);

                const matSoffit = materials.soffit || matTrim;

                rGeom.setFromPoints(pts); rGeom.setIndex(indices); rGeom.computeVertexNormals();
                rGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                rGeom.clearGroups(); 
                rGeom.addGroup(0, 12, 0);  
                rGeom.addGroup(12, 12, 2); 
                rGeom.addGroup(24, 24, 1); 
                
                const roofM = new THREE.Mesh(rGeom, [materials.roof, matTrim, matSoffit]);
                roofM.castShadow = true; roofM.receiveShadow = true;
                dormerGroup.add(roofM);

                const side = params.dormerSide || 'right';
                let dZ = dz;
                let rY = 0;
                
                if (side === 'left') {
                    rY = Math.PI;
                    dZ = -dz;     
                }
                
                dormerGroup.position.set(ridgeX, 0, dZ);
                
                if (params.modelType === 'saltbox') {
                    rY += Math.PI; 
                }
                
                dormerGroup.rotation.y = rY;
                group.add(dormerGroup);
            }
        }

        return group;
    }
};