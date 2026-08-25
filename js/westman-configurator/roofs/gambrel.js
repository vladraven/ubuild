export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        const shape = new THREE.Shape();
        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        shape.lineTo(w/2, h);
        if (isGable) {
            const peak = (params.width / 2) * (params.pitch / 12);
            const jX = (w / 2) * 0.6; 
            const jY = h + peak * 0.7; 
            shape.lineTo(jX, jY); 
            shape.lineTo(0, h + peak); 
            shape.lineTo(-jX, jY); 
        }
        shape.lineTo(-w/2, h); 
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const peak = (params.width / 2) * (params.pitch / 12);
        const oh = 0.5;
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        const jX = w2 * 0.6;
        const jY = params.height + peak * 0.7;

        const pts = [
            new THREE.Vector3(-w2, params.height, d2), 
            new THREE.Vector3(w2, params.height, d2),
            new THREE.Vector3(w2, params.height, -d2), 
            new THREE.Vector3(-w2, params.height, -d2),
            new THREE.Vector3(-jX, jY, d2), 
            new THREE.Vector3(jX, jY, d2),
            new THREE.Vector3(jX, jY, -d2), 
            new THREE.Vector3(-jX, jY, -d2),
            new THREE.Vector3(0, params.height + peak, d2), 
            new THREE.Vector3(0, params.height + peak, -d2)
        ];
        const indices = [
            0, 3, 7, 0, 7, 4, 
            4, 7, 9, 4, 9, 8, 
            1, 2, 6, 1, 6, 5, 
            5, 6, 9, 5, 9, 8  
        ];
        return { pts, indices, isFlat: false };
    }
};