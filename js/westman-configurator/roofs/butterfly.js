export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        const shape = new THREE.Shape();
        const m = params.pitch / 12;
        const peak = (params.width / 2) * m;
        // Расчет вертикальной поправки толщины под углом наклона
        const tY = params.thickness / Math.cos(Math.atan(m));

        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        
        if (isGable) {
            // Фронтон: пятиугольник с "впадиной" по центру
            shape.lineTo(w/2, h - tY); 
            shape.lineTo(0, h - peak - tY); 
            shape.lineTo(-w/2, h - tY); 
        } else {
            // Боковые стены: прямоугольники
            shape.lineTo(w/2, h - tY);
            shape.lineTo(-w/2, h - tY);
        }
        
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const m = params.pitch / 12;
        const peak = (params.width / 2) * m;
        const oh = 0.5; // Свес (overhang)
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        
        // ИСПРАВЛЕНИЕ: Чтобы угол наклона крыши строго соответствовал углу стен, 
        // крайние точки крыши (на свесах) должны продолжать линию наклона вверх.
        const hOuter = params.height + (oh * m);
        // Центральная долина опускается точно до низа выреза фронтона
        const hCenter = params.height - peak;

        const pts = [
            new THREE.Vector3(-w2, hOuter, d2), 
            new THREE.Vector3(w2, hOuter, d2), 
            new THREE.Vector3(w2, hOuter, -d2), 
            new THREE.Vector3(-w2, hOuter, -d2), 
            new THREE.Vector3(0, hCenter, d2), 
            new THREE.Vector3(0, hCenter, -d2)
        ];
        const indices = [0, 4, 5, 0, 5, 3, 1, 2, 5, 1, 5, 4];
        
        return { pts, indices, isFlat: false };
    }
};