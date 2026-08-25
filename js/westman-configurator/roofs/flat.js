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
        const oh = 0.5;
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;

        const pts = [
            new THREE.Vector3(-w2, params.height, d2), 
            new THREE.Vector3(w2, params.height, d2), 
            new THREE.Vector3(w2, params.height, -d2), 
            new THREE.Vector3(-w2, params.height, -d2)
        ];
        const indices = [0, 1, 2, 0, 2, 3];
        return { pts, indices, isFlat: true };
    }
};