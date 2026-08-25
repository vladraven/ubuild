export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
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
        
        const jX = w2 * 0.75; 
        const jZ = Math.max(0.1, d2 - params.hipOffset * 0.5); 
        const jY = params.height + peak * 0.6; 
        const rZ = Math.max(0, d2 - params.hipOffset); 
        const rY = params.height + peak;

        const pts = [
            new THREE.Vector3(-w2, params.height, d2),  
            new THREE.Vector3(w2, params.height, d2),
            new THREE.Vector3(w2, params.height, -d2), 
            new THREE.Vector3(-w2, params.height, -d2),
            new THREE.Vector3(-jX, jY, jZ), 
            new THREE.Vector3(jX, jY, jZ),
            new THREE.Vector3(jX, jY, -jZ), 
            new THREE.Vector3(-jX, jY, -jZ),
            new THREE.Vector3(0, rY, rZ), 
            new THREE.Vector3(0, rY, -rZ)
        ];
        const indices = [
            0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 
            2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 
            4, 5, 8, 5, 6, 8, 8, 6, 9, 6, 7, 9, 
            7, 4, 9, 9, 4, 8 
        ];
        return { pts, indices, isFlat: false };
    }
};