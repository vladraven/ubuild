export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        const shape = new THREE.Shape();
        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        shape.lineTo(w/2, h);
        if (isGable) {
            const peak = (params.width / 2) * (params.pitch / 12);
            const tY = params.thickness / Math.cos(Math.atan(peak / (params.width / 2)));
            shape.lineTo(0, h + peak - tY);
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
        const hB = params.height - oh * (params.pitch / 12);
        const hP = params.height + peak;

        const pts = [
            new THREE.Vector3(-w2, hB, d2), 
            new THREE.Vector3(0, hP, d2), 
            new THREE.Vector3(w2, hB, d2),
            new THREE.Vector3(w2, hB, -d2), 
            new THREE.Vector3(0, hP, -d2), 
            new THREE.Vector3(-w2, hB, -d2)
        ];
        const indices = [0, 1, 4, 0, 4, 5, 1, 2, 3, 1, 3, 4];
        return { pts, indices, isFlat: false };
    }
};