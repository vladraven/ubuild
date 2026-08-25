import * as THREE from 'three';

export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        // У Dutch Gable все базовые стены прямоугольные (как просил заказчик)
        const shape = new THREE.Shape();
        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        shape.lineTo(w/2, h); 
        shape.lineTo(-w/2, h); 
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const m1 = params.pitch / 12; // Наклон нижней вальмовой части
        const m2 = (params.upperPitch || 6) / 12; // Наклон верхней двускатной части
        const oh = 0.5;
        
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        
        // Ограничиваем Hip Offset, чтобы переход не пересек центр здания
        const actOff = Math.min(params.hipOffset, Math.min(params.width/2 - 0.1, params.depth/2 - 0.1));
        const inX = params.width / 2 - actOff;
        const inZ = params.depth / 2 - actOff;

        // Расчет высот
        const hBase = params.height - oh * m1;
        const hTrans = params.height + actOff * m1; // Высота перехода вальма -> фронтон
        const hPeak = hTrans + inX * m2; // Высота конька

        const pts = [
            // 0-3: Нижние углы карниза
            new THREE.Vector3(-w2, hBase, d2),
            new THREE.Vector3(w2, hBase, d2),
            new THREE.Vector3(w2, hBase, -d2),
            new THREE.Vector3(-w2, hBase, -d2),
            
            // 4-7: Углы перехода (линия излома)
            new THREE.Vector3(-inX, hTrans, inZ),
            new THREE.Vector3(inX, hTrans, inZ),
            new THREE.Vector3(inX, hTrans, -inZ),
            new THREE.Vector3(-inX, hTrans, -inZ),
            
            // 8-9: Вершины конька
            new THREE.Vector3(0, hPeak, inZ),
            new THREE.Vector3(0, hPeak, -inZ)
        ];

        const indices = [
            // Нижний передний скат
            0, 1, 5,   0, 5, 4,
            // Нижний правый скат
            1, 2, 6,   1, 6, 5,
            // Нижний задний скат
            2, 3, 7,   2, 7, 6,
            // Нижний левый скат
            3, 0, 4,   3, 4, 7,
            // Верхний левый скат
            4, 8, 9,   4, 9, 7,
            // Верхний правый скат
            8, 5, 6,   8, 6, 9
        ];
        
        return { pts, indices, isFlat: false };
    },
    buildCustomElements: (params, materials, THREE, group) => {
        const m1 = params.pitch / 12;
        const m2 = (params.upperPitch || 6) / 12;
        
        const actOff = Math.min(params.hipOffset, Math.min(params.width/2 - 0.1, params.depth/2 - 0.1));
        const inX = params.width / 2 - actOff;
        const inZ = params.depth / 2 - actOff;
        
        const hTrans = params.height + actOff * m1;
        const hPeak = hTrans + inX * m2;
        const t = params.thickness;
        const tY = t / Math.cos(Math.atan(m2));

        // Функция постройки вертикальных треугольников, которые закрывают дыры верхнего фронтона
        const createGable = (zPos, isFront) => {
            const shape = new THREE.Shape();
            shape.moveTo(-inX, hTrans - tY);
            shape.lineTo(inX, hTrans - tY);
            shape.lineTo(0, hPeak - tY);
            shape.closePath();

            const geom = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
            
            // Фронтоны голландской крыши красятся в цвет стен
            const mesh = new THREE.Mesh(geom, materials.wall);
            mesh.position.set(0, 0, zPos);
            
            // Разворачиваем задний фронтон
            if (!isFront) {
                mesh.rotation.y = Math.PI;
            }
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
        };

        // Размещаем фронтоны точно под коньком, с учетом толщины
        createGable(inZ, true);
        createGable(-inZ, false);
    }
};