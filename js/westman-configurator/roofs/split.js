export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        // Стены под Split Gable всегда прямоугольные (фронтоны строятся отдельно)
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
        const oh = 0.5;
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        const gap = 0.05; 

        // Координаты скатов крыши
        const pts = [
            new THREE.Vector3(-w2, params.height, d2), new THREE.Vector3(-gap, params.height + peak, d2), new THREE.Vector3(-gap, params.height + peak, gap), new THREE.Vector3(-w2, params.height, gap),
            new THREE.Vector3(gap, params.height + peak, d2), new THREE.Vector3(w2, params.height, d2), new THREE.Vector3(w2, params.height, gap), new THREE.Vector3(gap, params.height + peak, gap),
            new THREE.Vector3(-w2, params.height, -gap), new THREE.Vector3(-gap, params.height + peak, -gap), new THREE.Vector3(-gap, params.height + peak, -d2), new THREE.Vector3(-w2, params.height, -d2),
            new THREE.Vector3(gap, params.height + peak, -gap), new THREE.Vector3(w2, params.height, -gap), new THREE.Vector3(w2, params.height, -d2), new THREE.Vector3(gap, params.height + peak, -d2)
        ];
        const indices = [
            0,1,2, 0,2,3, 
            4,5,6, 4,6,7, 
            8,9,10, 8,10,11, 
            12,13,14, 12,14,15
        ];
        return { pts, indices, isFlat: false };
    },
    // Кастомная функция для постройки разделенных фронтонов из материала крыши
    buildCustomElements: (params, materials, THREE, group) => {
        const peak = (params.width / 2) * (params.pitch / 12);
        const oh = 0.5; // Свес за пределы стен
        const gap = 0.05;
        const w2 = params.width / 2 + oh; 
        const t = params.thickness;

        const createGableHalf = (isLeft, zPos) => {
            const shape = new THREE.Shape();
            if (isLeft) {
                shape.moveTo(-w2, params.height);
                shape.lineTo(-gap, params.height);
                shape.lineTo(-gap, params.height + peak);
            } else {
                shape.moveTo(gap, params.height);
                shape.lineTo(w2, params.height);
                shape.lineTo(gap, params.height + peak);
            }
            shape.closePath();

            const geom = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
            // Используем материал фронтона (который берет текстуру крыши в app.js)
            const mesh = new THREE.Mesh(geom, materials.gable);
            mesh.position.set(0, 0, zPos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        };

        // Передний фронтон
        group.add(createGableHalf(true, params.depth / 2 - t)); // Левая часть
        group.add(createGableHalf(false, params.depth / 2 - t)); // Правая часть

        // Задний фронтон
        group.add(createGableHalf(true, -params.depth / 2)); // Левая часть
        group.add(createGableHalf(false, -params.depth / 2)); // Правая часть
    }
};