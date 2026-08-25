export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        // У гексагональной крыши нет фронтонов, стены ровные
        const shape = new THREE.Shape();
        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        shape.lineTo(w/2, h); 
        shape.lineTo(-w/2, h); 
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const peak = (params.width / 2) * (params.pitch / 12);
        const oh = 0.5; // Свес
        const R = params.width / 2; // Радиус описанной окружности (длина стороны)
        
        // Внешний радиус крыши с учетом свеса
        const R_outer = R + oh / Math.cos(Math.PI / 6);

        const pts = [];
        // Генерируем 6 вершин основания крыши
        for(let i = 0; i < 6; i++) {
            // Смещаем углы крыши на 30 градусов, чтобы они совпадали со стыками стен
            const angle = i * (Math.PI / 3) + (Math.PI / 6);
            pts.push(new THREE.Vector3(
                R_outer * Math.sin(angle), 
                params.height, 
                R_outer * Math.cos(angle)
            ));
        }
        
        // Вершина (пик) в центре
        pts.push(new THREE.Vector3(0, params.height + peak, 0));

        // Индексы для 6 треугольников
        const indices = [
            5, 0, 6, // Передний скат
            0, 1, 6, // Передний правый скат
            1, 2, 6, // Задний правый скат
            2, 3, 6, // Задний скат
            3, 4, 6, // Задний левый скат
            4, 5, 6  // Передний левый скат
        ];
        
        return { pts, indices, isFlat: false };
    }
};