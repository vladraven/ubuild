export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        const shape = new THREE.Shape();
        const m = params.pitch / 12;
        
        // Для M-Shaped коньки находятся на 1/6 и 5/6 ширины (или +/- w/6 от центра)
        // Внешний скат имеет пробег (run) = w/3. Пик равен (w/3) * m.
        const peak = (params.width / 3) * m; 
        const tY = params.thickness / Math.cos(Math.atan(m)); 

        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        
        if (isGable) {
            const pX = w / 6; // Позиция пиков по оси X
            shape.lineTo(w/2, h - tY);              // Правый край (карниз)
            shape.lineTo(pX, h + peak - tY);        // Правый конек
            shape.lineTo(0, h - tY);                // Центральная долина (ендова)
            shape.lineTo(-pX, h + peak - tY);       // Левый конек
            shape.lineTo(-w/2, h - tY);             // Левый край (карниз)
        } else {
            shape.lineTo(w/2, h - tY);
            shape.lineTo(-w/2, h - tY);
        }
        
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const m = params.pitch / 12;
        const peak = (params.width / 3) * m;
        const oh = 0.5;
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        const pX = params.width / 6; // Смещение коньков от центра
        
        const hBase = params.height - oh * m; // Высота внешних карнизов со свесом
        const hPeak = params.height + peak;
        const hValley = params.height; // Долина в центре ровно на уровне высоты стен

        const pts = [
            // Передний фасад
            new THREE.Vector3(-w2, hBase, d2),    // 0: Внешний левый угол
            new THREE.Vector3(-pX, hPeak, d2),    // 1: Левый конек
            new THREE.Vector3(0, hValley, d2),    // 2: Центр (долина)
            new THREE.Vector3(pX, hPeak, d2),     // 3: Правый конек
            new THREE.Vector3(w2, hBase, d2),     // 4: Внешний правый угол
            
            // Задний фасад
            new THREE.Vector3(-w2, hBase, -d2),   // 5
            new THREE.Vector3(-pX, hPeak, -d2),   // 6
            new THREE.Vector3(0, hValley, -d2),   // 7
            new THREE.Vector3(pX, hPeak, -d2),    // 8
            new THREE.Vector3(w2, hBase, -d2)     // 9
        ];

        const indices = [
            0, 1, 6,  0, 6, 5,  // Внешний левый скат
            1, 2, 7,  1, 7, 6,  // Внутренний левый скат (крутой)
            2, 3, 8,  2, 8, 7,  // Внутренний правый скат (крутой)
            3, 4, 9,  3, 9, 8   // Внешний правый скат
        ];
        
        // Кастомная вертикальная толщина (tY) на основе реального угла M-Shaped
        const customTY = params.thickness / Math.cos(Math.atan(m));

        return { pts, indices, isFlat: false, customTY };
    }
};