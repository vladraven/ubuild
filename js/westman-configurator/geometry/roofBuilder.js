import * as THREE from 'three';

export const createGenericRoofMesh = (pts, indices, params, materials, isFlat = false, customTY = null) => {
    const geom = new THREE.BufferGeometry();
    const peak = (params.width / 2) * (params.pitch / 12);
    
    const O = params.hasOverhang ? (params.overhang || 0) : 0; 
    
    const baseThickness = params.thickness;
    let totalDepth = baseThickness * 5.0; 
    
    if (customTY !== null && customTY !== undefined) {
        totalDepth = customTY * 5.0; 
    }
    
    const tY = isFlat ? totalDepth : (totalDepth / Math.cos(Math.atan(peak / (params.width / 2))));
    const n = pts.length;
    const allPts = [];
    
    const dropY = isFlat ? 0 : O * (params.pitch / 12);
    
    for (let i = 0; i < n; i++) {
        let px = pts[i].x;
        let py = pts[i].y;
        let pz = pts[i].z;
        
        if (px > 0.01) px += O;
        else if (px < -0.01) px -= O;
        
        if (pz > 0.01) pz += O;
        else if (pz < -0.01) pz -= O;
        
        if (!isFlat && Math.abs(py - params.height) < 0.1) {
            py -= dropY;
        }

        allPts.push(new THREE.Vector3(px, py, pz));
    }
    
    for (let i = 0; i < n; i++) {
        allPts.push(new THREE.Vector3(allPts[i].x, allPts[i].y - tY, allPts[i].z));
    }
    
    const allIndices = [...indices];
    const topIndicesCount = indices.length;
    
    // SOFFIT
    for (let i = 0; i < indices.length; i += 3) {
        allIndices.push(indices[i] + n, indices[i + 2] + n, indices[i + 1] + n);
    }
    const bottomIndicesCount = indices.length;

    // TRIM
    const edges = {};
    for (let i = 0; i < indices.length; i += 3) {
        edges[`${indices[i]}_${indices[i+1]}`] = true; 
        edges[`${indices[i+1]}_${indices[i+2]}`] = true; 
        edges[`${indices[i+2]}_${indices[i]}`] = true;
    }
    
    for (let key in edges) {
        const parts = key.split('_'); 
        const u = parseInt(parts[0]);
        const v = parseInt(parts[1]);
        if (!edges[`${v}_${u}`]) { 
            const uBot = u + n;
            const vBot = v + n;
            allIndices.push(v, u, uBot, v, uBot, vBot);
        }
    }

    geom.setFromPoints(allPts); 
    geom.setIndex(allIndices); 
    geom.computeVertexNormals();

    const uvs = [];
    const totalW = params.width + O * 2;
    const totalD = params.depth + O * 2;
    for (let i = 0; i < allPts.length; i++) {
        const u = totalW > 0 ? (allPts[i].x / totalW + 0.5) : 0;
        const v = totalD > 0 ? (allPts[i].z / totalD + 0.5) : 0;
        uvs.push(u, v);
    }
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    geom.clearGroups();
    geom.addGroup(0, topIndicesCount, 0); 
    geom.addGroup(topIndicesCount, bottomIndicesCount, 2); 
    geom.addGroup(topIndicesCount + bottomIndicesCount, allIndices.length - (topIndicesCount + bottomIndicesCount), 1); 
    
    const matTrim = materials.trim || materials.roof;
    const matSoffit = materials.soffit || matTrim; 
    const multiMat = [materials.roof, matTrim, matSoffit];
    
    const mesh = new THREE.Mesh(geom, multiMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
};