import * as THREE from 'three';

export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        // У Combination Roof все стены прямоугольные (скаты идут со всех 4 сторон)
        const shape = new THREE.Shape();
        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        shape.lineTo(w/2, h); 
        shape.lineTo(-w/2, h); 
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const m1 = params.pitch / 12; // Наклон нижней юбки
        const m2 = (params.upperPitch || 6) / 12; // Наклон верхней крыши
        const oh = 0.5; // Свес
        
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        
        // Линия перелома (переход от нижнего к верхнему скату)
        const actOff = Math.min(params.hipOffset, Math.min(params.width/2 - 0.1, params.depth/2 - 0.1));
        const inX = params.width / 2 - actOff;
        const inZ = params.depth / 2 - actOff;

        // Расчет высот
        const hBase = params.height - oh * m1;
        const hTrans = params.height + actOff * m1; 
        const hPeak = hTrans + inX * m2; 
        
        // Верхний конек
        const rZ = Math.max(0, inZ - inX);

        const pts = [
            // 0-3: Нижние углы карниза
            new THREE.Vector3(-w2, hBase, d2),
            new THREE.Vector3(w2, hBase, d2),
            new THREE.Vector3(w2, hBase, -d2),
            new THREE.Vector3(-w2, hBase, -d2),
            
            // 4-7: Углы перелома крыши
            new THREE.Vector3(-inX, hTrans, inZ),
            new THREE.Vector3(inX, hTrans, inZ),
            new THREE.Vector3(inX, hTrans, -inZ),
            new THREE.Vector3(-inX, hTrans, -inZ),
            
            // 8-9: Вершины конька
            new THREE.Vector3(0, hPeak, rZ),
            new THREE.Vector3(0, hPeak, -rZ)
        ];

        const indices = [
            // Нижняя юбка (4 ската)
            0, 1, 5,   0, 5, 4, // Перед
            1, 2, 6,   1, 6, 5, // Право
            2, 3, 7,   2, 7, 6, // Зад
            3, 0, 4,   3, 4, 7, // Лево
            
            // Верхняя часть (4 ската, как у вальмовой крыши)
            4, 5, 8,            // Передний верхний скат (треугольник)
            5, 6, 9,   5, 9, 8, // Правый верхний скат (трапеция)
            6, 7, 9,            // Задний верхний скат (треугольник)
            7, 4, 8,   7, 8, 9  // Левый верхний скат (трапеция)
        ];
        
        return { pts, indices, isFlat: false };
    }
};