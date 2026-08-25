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
        const actOff = Math.max(0, params.hipOffset);
        const rPos = Math.max(0, d2 - actOff);

        const pts = [
            new THREE.Vector3(-w2, params.height, d2), 
            new THREE.Vector3(w2, params.height, d2), 
            new THREE.Vector3(w2, params.height, -d2), 
            new THREE.Vector3(-w2, params.height, -d2), 
            new THREE.Vector3(0, params.height + peak, rPos), 
            new THREE.Vector3(0, params.height + peak, -rPos)
        ];
        const indices = [0, 1, 4, 1, 2, 5, 1, 5, 4, 2, 3, 5, 3, 0, 4, 3, 4, 5];
        return { pts, indices, isFlat: false };
    }
};