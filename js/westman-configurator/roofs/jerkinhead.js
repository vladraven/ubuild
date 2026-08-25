export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        const shape = new THREE.Shape();
        const m = params.pitch / 12;
        const tY = params.thickness / Math.cos(Math.atan(m));

        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        
        if (isGable) {
            const peak = (params.width / 2) * m;
            const oh = 0.5; // Свес
            const actOff = Math.max(0.1, params.hipOffset); // Глубина среза
            
            // Расчет ширины плоской верхушки фронтона на линии стены
            const cWallX = actOff - oh; 

            if (cWallX <= 0) {
                // Если срез слишком мал (находится только в зоне свеса), стена остается треугольной
                shape.lineTo(w/2, h - tY); 
                shape.lineTo(0, h + peak - tY); 
                shape.lineTo(-w/2, h - tY); 
            } else {
                // Шестиугольная стена со срезанным верхом
                const hWallClip = h + peak - cWallX * m;
                shape.lineTo(w/2, h - tY); 
                shape.lineTo(cWallX, hWallClip - tY); 
                shape.lineTo(-cWallX, hWallClip - tY); 
                shape.lineTo(-w/2, h - tY); 
            }
        } else {
            shape.lineTo(w/2, h - tY);
            shape.lineTo(-w/2, h - tY);
        }
        
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const m = params.pitch / 12;
        const peak = (params.width / 2) * m;
        const oh = 0.5;
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;

        // Глубина вальмы (среза)
        const actOff = Math.min(params.hipOffset, params.depth / 2);
        
        const rZ = d2 - actOff; // Смещение конька
        const hBase = params.height - oh * m;
        const hPeak = params.height + peak;
        const hClip = hPeak - actOff * m; // Высота начала среза
        const cX = actOff; // Ширина плоской части

        // 10 вершин крыши Jerkinhead
        const pts = [
            new THREE.Vector3(-w2, hBase, d2),    // 0: Передний левый карниз
            new THREE.Vector3(-cX, hClip, d2),    // 1: Передний левый срез
            new THREE.Vector3(cX, hClip, d2),     // 2: Передний правый срез
            new THREE.Vector3(w2, hBase, d2),     // 3: Передний правый карниз
            new THREE.Vector3(0, hPeak, rZ),      // 4: Передняя точка конька

            new THREE.Vector3(-w2, hBase, -d2),   // 5: Задний левый карниз
            new THREE.Vector3(-cX, hClip, -d2),   // 6: Задний левый срез
            new THREE.Vector3(cX, hClip, -d2),    // 7: Задний правый срез
            new THREE.Vector3(w2, hBase, -d2),    // 8: Задний правый карниз
            new THREE.Vector3(0, hPeak, -rZ)      // 9: Задняя точка конька
        ];

        // Точная триангуляция для 4 скатов (10-угольной оболочки)
        const indices = [
            1, 2, 4,        // Передняя вальма (срез)
            7, 6, 9,        // Задняя вальма (срез)
            0, 1, 4, 0, 4, 9, 0, 9, 6, 0, 6, 5, // Левый скат
            3, 8, 7, 3, 7, 9, 3, 9, 4, 3, 4, 2  // Правый скат
        ];
        
        return { pts, indices, isFlat: false };
    }
};