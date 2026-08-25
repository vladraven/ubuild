export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        const shape = new THREE.Shape();
        const m = params.pitch / 12;
        const peak = params.width * m; // Подъем крыши на всей ширине
        // Вертикальная поправка на толщину крыши под углом наклона
        const tY = params.thickness / Math.cos(Math.atan(m));

        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        
        if (wallId === 'front' || wallId === 'back') {
            // Фронтальная и задняя стены: четырехугольники со скошенным верхом
            // Левый край стены (низкий)
            const hLeft = h - tY;
            // Правый край стены (высокий)
            const hRight = h + peak - tY;
            
            shape.lineTo(w/2, hRight);
            shape.lineTo(-w/2, hLeft);
        } else if (wallId === 'left') {
            // Левая стена: прямоугольник базовой высоты
            shape.lineTo(w/2, h - tY);
            shape.lineTo(-w/2, h - tY);
        } else if (wallId === 'right') {
            // Правая стена: прямоугольник увеличенной высоты
            shape.lineTo(w/2, h + peak - tY);
            shape.lineTo(-w/2, h + peak - tY);
        }
        
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const m = params.pitch / 12;
        const peak = params.width * m;
        const oh = 0.5; // Свес
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        
        // ИСПРАВЛЕНИЕ: Точный расчет высоты крыши на краях свесов (продолжение наклона)
        // Слева крыша опускается ниже уровня стены на величину свеса
        const hLeft = params.height - (oh * m); 
        // Справа крыша поднимается выше уровня правой стены на величину свеса
        const hRight = params.height + peak + (oh * m);

        const pts = [
            new THREE.Vector3(-w2, hLeft, d2),    // 0: Передний левый угол (низкий)
            new THREE.Vector3(w2, hRight, d2),    // 1: Передний правый угол (высокий)
            new THREE.Vector3(w2, hRight, -d2),   // 2: Задний правый угол (высокий)
            new THREE.Vector3(-w2, hLeft, -d2)    // 3: Задний левый угол (низкий)
        ];
        
        const indices = [0, 1, 2, 0, 2, 3];
        
        return { pts, indices, isFlat: false };
    }
};