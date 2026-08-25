import { Brush, SUBTRACTION, ADDITION } from 'three-bvh-csg';
import * as THREE from 'three';

export default {
    useDefaultWalls: false, 
    getWallShape: () => null, 
    getRoofData: () => null, 
    buildCustomElements: (params, materials, THREE, group, createGenericRoofMesh, csgEvaluator, createWallGroup) => {
        const A = params.width;           // Ширина основного здания (Она же ширина крыльев)
        const B = params.depth;           // Глубина основного здания
        const L = params.hvLeftExt || 0;  // Вылет левого крыла
        const R = params.hvRightExt || 0; // Вылет правого крыла
        const OL = params.hvLeftOffset || 0;  // Смещение левого крыла вдоль Z
        const OR = params.hvRightOffset || 0; // Смещение правого крыла вдоль Z
        
        const h = params.height;
        const t = params.thickness;
        const oh = 0.5;
        const m = params.pitch / 12;
        const tY = t / Math.cos(Math.atan(m));
        const ho = params.hipOffset || 0;

        // Универсальный генератор вальмы
        const getHipGeom = (spanX, spanZ) => {
            const w2 = spanX / 2 + oh;
            const d2 = spanZ / 2 + oh;
            const peak = (spanX / 2) * m;
            let rX = 0, rZ = 0, indices;

            if (spanX >= spanZ) {
                rX = Math.max(0, w2 - d2 - ho);
                indices = [0,1,5, 0,5,4, 2,3,4, 2,4,5, 3,0,4, 1,2,5];
            } else {
                rZ = Math.max(0, d2 - w2 - ho);
                indices = [0,1,4, 2,3,5, 3,0,4, 3,4,5, 1,2,5, 1,5,4];
            }

            const pts = [
                new THREE.Vector3(-w2, h - oh*m, d2), new THREE.Vector3(w2, h - oh*m, d2),
                new THREE.Vector3(w2, h - oh*m, -d2), new THREE.Vector3(-w2, h - oh*m, -d2),
                new THREE.Vector3(-rX, h + peak, rZ), new THREE.Vector3(rX, h + peak, -rZ)
            ];
            return { pts, indices };
        };

        // 1. Основная крыша (Main Roof)
        const mainData = getHipGeom(A, B);
        const mainMesh = createGenericRoofMesh(mainData.pts, mainData.indices, params, materials, false, tY);
        mainMesh.updateMatrixWorld();
        let finalRoof = new Brush(mainMesh.geometry, materials.roof);
        finalRoof.updateMatrixWorld();

        // 2. Левое крыло (Left Wing)
        if (L > 0) {
            const wingLen = 2000; 
            const wingParams = { ...params, width: A, depth: wingLen };
            const wingData = getHipGeom(A, wingLen);
            const wingMesh = createGenericRoofMesh(wingData.pts, wingData.indices, wingParams, materials, false, tY);
            
            const wingBrush = new Brush(wingMesh.geometry, materials.roof);
            wingBrush.rotation.y = Math.PI / 2; 
            // Левый край находится на -A/2 - L. Так как центр на 1000 дальше, координата центра:
            wingBrush.position.set(-A/2 - L + 1000, 0, OL); 
            wingBrush.updateMatrixWorld();

            // Отрезаем внутренний кусок крыла (всё что правее оси X=0)
            const cutGeo = new THREE.BoxGeometry(3000, 3000, 3000);
            const cutBrush = new Brush(cutGeo);
            cutBrush.position.set(1500, 0, 0); 
            cutBrush.updateMatrixWorld();

            const clippedWing = csgEvaluator.evaluate(wingBrush, cutBrush, SUBTRACTION);
            clippedWing.material = materials.roof;
            finalRoof = csgEvaluator.evaluate(finalRoof, clippedWing, ADDITION);
        }

        // 3. Правое крыло (Right Wing)
        if (R > 0) {
            const wingLen = 2000; 
            const wingParams = { ...params, width: A, depth: wingLen };
            const wingData = getHipGeom(A, wingLen);
            const wingMesh = createGenericRoofMesh(wingData.pts, wingData.indices, wingParams, materials, false, tY);
            
            const wingBrush = new Brush(wingMesh.geometry, materials.roof);
            wingBrush.rotation.y = Math.PI / 2; 
            // Правый край на A/2 + R. Координата центра:
            wingBrush.position.set(A/2 + R - 1000, 0, OR); 
            wingBrush.updateMatrixWorld();

            // Отрезаем внутренний кусок крыла (всё что левее оси X=0)
            const cutGeo = new THREE.BoxGeometry(3000, 3000, 3000);
            const cutBrush = new Brush(cutGeo);
            cutBrush.position.set(-1500, 0, 0); 
            cutBrush.updateMatrixWorld();

            const clippedWing = csgEvaluator.evaluate(wingBrush, cutBrush, SUBTRACTION);
            clippedWing.material = materials.roof;
            finalRoof = csgEvaluator.evaluate(finalRoof, clippedWing, ADDITION);
        }

        finalRoof.material = materials.roof;
        finalRoof.castShadow = true; finalRoof.receiveShadow = true;
        group.add(finalRoof);

        // 4. Построение динамического периметра стен
        const rectS = (len) => {
            const s = new THREE.Shape();
            s.moveTo(-len/2, 0); s.lineTo(len/2, 0);
            s.lineTo(len/2, h - tY); s.lineTo(-len/2, h - tY);
            s.closePath(); return s;
        };

        const addW = (id, len, pos, rot) => {
            if (len > 0.05) group.add(createWallGroup(len, h, pos, rot, false, id, rectS(len)));
        };

        const Zw_L_front = OL + A/2;
        const Zw_L_back = OL - A/2;
        const Zw_R_front = OR + A/2;
        const Zw_R_back = OR - A/2;

        addW('front', A, {x: 0, y: 0, z: B/2 - t}, {x:0, y:0, z:0});
        addW('back', A, {x: 0, y: 0, z: -B/2}, {x:0, y:0, z:0});

        // Левая сторона
        if (L <= 0.1) {
            addW('left', B, {x: -A/2, y: 0, z: 0}, {x:0, y:Math.PI/2, z:0});
        } else {
            const lf_len = B/2 - Zw_L_front;
            const lb_len = Zw_L_back - (-B/2);
            addW('left_front', lf_len, {x: -A/2, y: 0, z: B/2 - lf_len/2}, {x:0, y:Math.PI/2, z:0});
            addW('left_back', lb_len, {x: -A/2, y: 0, z: -B/2 + lb_len/2}, {x:0, y:Math.PI/2, z:0});
            addW('wing_l_front', L, {x: -A/2 - L/2, y: 0, z: Zw_L_front - t}, {x:0, y:0, z:0});
            addW('wing_l_back', L, {x: -A/2 - L/2, y: 0, z: Zw_L_back}, {x:0, y:0, z:0});
            addW('wing_l_end', A, {x: -A/2 - L, y: 0, z: OL}, {x:0, y:Math.PI/2, z:0});
        }

        // Правая сторона
        if (R <= 0.1) {
            addW('right', B, {x: A/2 - t, y: 0, z: 0}, {x:0, y:-Math.PI/2, z:0});
        } else {
            const rf_len = B/2 - Zw_R_front;
            const rb_len = Zw_R_back - (-B/2);
            addW('right_front', rf_len, {x: A/2 - t, y: 0, z: B/2 - rf_len/2}, {x:0, y:-Math.PI/2, z:0});
            addW('right_back', rb_len, {x: A/2 - t, y: 0, z: -B/2 + rb_len/2}, {x:0, y:-Math.PI/2, z:0});
            addW('wing_r_front', R, {x: A/2 + R/2, y: 0, z: Zw_R_front - t}, {x:0, y:0, z:0});
            addW('wing_r_back', R, {x: A/2 + R/2, y: 0, z: Zw_R_back}, {x:0, y:0, z:0});
            addW('wing_r_end', A, {x: A/2 + R - t, y: 0, z: OR}, {x:0, y:-Math.PI/2, z:0});
        }
    }
};