import { Brush, SUBTRACTION, ADDITION } from 'three-bvh-csg';
import * as THREE from 'three';

export default {
    useDefaultWalls: false, 
    getWallShape: () => null, 
    getRoofData: () => null, 
    buildCustomElements: (params, materials, THREE, group, createGenericRoofMesh, csgEvaluator, createWallGroup) => {
        const W = Number(params.width) || 0;
        const D = Number(params.depth) || 0;
        const C = Number(params.crossDepth) || 20; 
        const O = Number(params.crossOffset) || 0; 
        
        const h = Number(params.height) || 0;
        const t = Number(params.thickness) || 0;
        const oh = 0.5;
        const m = (Number(params.pitch) || 0) / 12;
        const tY = t / Math.cos(Math.atan(m));
        const ho = Number(params.hipOffset) || 0;

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

        // 1. Основная крыша
        const mainData = getHipGeom(W, D);
        const mainMesh = createGenericRoofMesh(mainData.pts, mainData.indices, params, materials, false, tY);
        mainMesh.updateMatrixWorld();
        const mainBrush = new Brush(mainMesh.geometry, materials.roof);
        mainBrush.updateMatrixWorld();

        // 2. Крыша пристройки (с микро-зазором)
        const wingLen = 2000; 
        const wingW = W - 0.02; 
        const wingParams = { ...params, width: wingW, depth: wingLen };
        const wingData = getHipGeom(wingW, wingLen);
        const wingMesh = createGenericRoofMesh(wingData.pts, wingData.indices, wingParams, materials, false, tY);
        
        const wingBrush = new Brush(wingMesh.geometry, materials.roof);
        wingBrush.rotation.y = Math.PI / 2;
        wingBrush.position.set(W/2 + C - 1000, 0, O); 
        wingBrush.updateMatrixWorld();

        // 3. Отсекаем хвост
        const cutGeo = new THREE.BoxGeometry(3000, 3000, 3000);
        const cutBrush = new Brush(cutGeo);
        cutBrush.position.set(-1500.01, 0, 0); 
        cutBrush.updateMatrixWorld();

        const clippedWing = csgEvaluator.evaluate(wingBrush, cutBrush, SUBTRACTION);
        clippedWing.material = materials.roof;

        // 4. Слияние
        const finalRoof = csgEvaluator.evaluate(mainBrush, clippedWing, ADDITION);
        finalRoof.material = materials.roof;
        finalRoof.castShadow = true; finalRoof.receiveShadow = true;
        group.add(finalRoof);

        // 5. ПОСТРОЕНИЕ СТЕН
        const rectS = (len, id, globalStartX) => {
            const s = new THREE.Shape();
            s.moveTo(-len/2, 0); s.lineTo(len/2, 0);
            s.lineTo(len/2, h - tY); s.lineTo(-len/2, h - tY);
            s.closePath(); 
            
            // Фильтруем проемы: оставляем только те, что физически находятся на этой стене
            if (params.openings && params.openings[id]) {
                s._filteredOpenings = params.openings[id].filter(op => {
                    // Вычисляем абсолютный X центр окна (старая логика без offsetX)
                    let absoluteCx = op.cx; 
                    
                    // Если используется новая логика с offsetX (расстояние от левого края фасада)
                    if (op.offsetX !== undefined) {
                        absoluteCx = -W/2 + op.offsetX; // Переводим offsetX в глобальную координату
                    }
                    
                    // Проверяем, попадает ли центр окна в габариты ЭТОГО куска стены
                    // globalStartX - это координата левого края этого куска стены
                    // globalStartX + len - это координата правого края
                    return (absoluteCx >= globalStartX && absoluteCx <= globalStartX + len);
                });
                
                // Пересчитываем offsetX проемов так, чтобы он был локальным для ЭТОГО куска стены
                s._filteredOpenings.forEach(op => {
                     let absoluteCx = op.offsetX !== undefined ? (-W/2 + op.offsetX) : op.cx;
                     // Сохраняем локальное смещение окна относительно начала ЭТОЙ стены
                     op._localOffsetX = absoluteCx - globalStartX; 
                });
            } else {
                s._filteredOpenings = [];
            }
            
            return s;
        };

        // В addW передаем globalStartX - координату левого края стены в 3D пространстве здания (от -W/2 до W/2+C)
        const addW = (id, len, pos, rot, globalStartX) => {
            if (len > 0.05) {
                // Передаем кастомную форму с уже отфильтрованными окнами
                const customShape = rectS(len, id, globalStartX);
                
                // Чтобы функция createWallGroup использовала наши отфильтрованные окна,
                // мы временно подменим массив окон для этого ID в параметрах,
                // вызовем функцию, а потом вернем обратно.
                
                const originalOpenings = params.openings[id];
                
                // Передаем отфильтрованные окна, причем говорим использовать _localOffsetX
                if (customShape._filteredOpenings) {
                     params.openings[id] = customShape._filteredOpenings.map(op => ({
                         ...op,
                         offsetX: op._localOffsetX // Заставляем createWallGroup считать от начала этого куска стены
                     }));
                }
                
                const wallGroup = createWallGroup(len, h, pos, rot, false, id, customShape);
                group.add(wallGroup);
                
                // Возвращаем оригинальный массив на место
                params.openings[id] = originalOpenings;
            }
        };

        const cw = W; 
        const Zw_back = O - cw/2;
        const Zw_front = O + cw/2;

        // Левая стена (globalStartX для левой и правой стен мы не считаем сложно, так как они цельные)
        addW('left', D, {x: -W/2, y: 0, z: 0}, {x:0, y:Math.PI/2, z:0}, -D/2);

        // ЗАДНИЕ СТЕНЫ ('back')
        // Основная стена (от -W/2 до 0) -> ширина W/2 (чтобы не пересекаться с пристройкой, если она идет от центра)
        // Но так как основная стена идет на всю ширину W, ее левый край находится на -W/2
        addW('back', W, {x: 0, y: 0, z: -D/2}, {x:0, y:0, z:0}, -W/2); 
        
        // Стена пристройки ('back')
        const wingBackLen = C + t; 
        // Левый край пристройки по оси X начинается там, где кончается основная часть (W/2 - t)
        const wingBackStartX = W/2 - t; 
        addW('back', wingBackLen, {x: wingBackStartX + wingBackLen/2, y: 0, z: Zw_back}, {x:0, y:0, z:0}, wingBackStartX); 

        // ПРАВЫЕ СТЕНЫ ('right')
        const rightBackLen = Zw_back - (-D/2);
        if (rightBackLen > 0.05) {
            addW('right', rightBackLen, {x: W/2, y: 0, z: -D/2 + rightBackLen/2}, {x:0, y:-Math.PI/2, z:0}, -D/2);
        }
        addW('right', cw - 2*t, {x: W/2 + C, y: 0, z: O}, {x:0, y:-Math.PI/2, z:0}, O - cw/2 + t); // Примерный startX
        const rightFrontLen = D/2 - Zw_front;
        if (rightFrontLen > 0.05) {
            addW('right', rightFrontLen, {x: W/2, y: 0, z: D/2 - rightFrontLen/2}, {x:0, y:-Math.PI/2, z:0}, Zw_front);
        }

        // ПЕРЕДНИЕ СТЕНЫ ('front')
        // Основная стена
        addW('front', W, {x: 0, y: 0, z: D/2 - t}, {x:0, y:0, z:0}, -W/2); 
        
        // Стена пристройки ('front')
        const wingFrontLen = C + t;
        const wingFrontStartX = W/2 - t;
        addW('front', wingFrontLen, {x: wingFrontStartX + wingFrontLen/2, y: 0, z: Zw_front - t}, {x:0, y:0, z:0}, wingFrontStartX); 
    }
};