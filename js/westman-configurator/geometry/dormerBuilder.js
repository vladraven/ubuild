import * as THREE from 'three';

export const buildDormerGroup = (params, materials) => {
    const dw = params.dormerWidth; const dx = params.dormerDepth; 
    const dz = params.dormerZ; const dh = params.dormerHeight; 
    const O = params.hasOverhang ? (params.overhang || 0) : 0; 
    
    const mMain = params.pitch / 12; 
    const mDormer = (params.dormerPitch !== undefined ? params.dormerPitch : params.pitch) / 12;

    let run = (params.modelType === 'saltbox') ? (params.width * 0.66) : (params.width / 2);
    let ridgeX = (params.modelType === 'saltbox') ? (params.width / 2 - params.width * 0.33) : 0;

    const dPeak = (dw / 2) * mDormer; 
    const yRidge = params.height + (run * mMain);
    const yRoofAtFront = yRidge - (mMain * dx); 
    const dropY = O * mDormer; 

    const dormerGroup = new THREE.Group();
    const hFront = dh - yRoofAtFront; 
    
    if (hFront <= 0) return dormerGroup;

    const tY = params.thickness / Math.cos(Math.atan(mMain));
    const wallBaseY = yRoofAtFront - tY * 0.95;
    
    const frontS = new THREE.Shape();
    frontS.moveTo(-dw/2, wallBaseY); 
    frontS.lineTo(dw/2, wallBaseY); 
    frontS.lineTo(dw/2, dh);
    frontS.lineTo(0, dh + dPeak); 
    frontS.lineTo(-dw/2, dh); 
    frontS.closePath();
    
    // ПРИМЕЧАНИЕ: Окна в дормерах пока привязаны к корневому params, если они там сохранены.
    // Если нужно привязать их к этажам, лучше брать из последнего этажа. Здесь оставляем совместимость.
    if (params.openings && params.openings['dormer_front']) {
        params.openings['dormer_front'].forEach(o => {
            let hx = o.offsetX !== undefined ? (-dw / 2 + o.offsetX - o.w / 2) : (o.cx - o.w / 2);
            hx = Math.max(-dw / 2, Math.min(dw / 2 - o.w, hx));
            
            let hy = (o.isDoor || (o.cy - o.h / 2) <= 0) ? 0.01 : (o.cy - o.h / 2);
            hy = Math.max(0.01, Math.min(dh - o.h, hy));
            
            o._safeCx = hx + o.w / 2;
            o._safeCy = hy + o.h / 2;

            const holePath = new THREE.Path();
            holePath.moveTo(hx, hy);
            holePath.lineTo(hx + o.w, hy);
            holePath.lineTo(hx + o.w, hy + o.h);
            holePath.lineTo(hx, hy + o.h);
            holePath.closePath();
            
            frontS.holes.push(holePath);
        });
    }

    const frontM = new THREE.Mesh(new THREE.ExtrudeGeometry(frontS, { depth: params.thickness, bevelEnabled: false }), materials.wall);
    frontM.rotation.y = Math.PI / 2; 
    frontM.position.set(dx, 0, 0); 
    frontM.castShadow = true; frontM.receiveShadow = true;
    
    if (params.openings && params.openings['dormer_front']) {
        params.openings['dormer_front'].forEach(o => {
            const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.4 });
            const openDepth = params.thickness * 10;
            const visualMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth), glassMat);
            visualMesh.position.set(o._safeCx, o._safeCy, params.thickness / 2); 
            visualMesh.userData = { isOpening: true, id: o.id, wallId: 'dormer_front', w: o.w, h: o.h, isDoor: o.isDoor };
            
            const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
            const maskMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth - 0.05), maskMat);
            maskMesh.renderOrder = -1;
            visualMesh.add(maskMesh);

            frontM.add(visualMesh);
        });
    }

    if (params.hasGableDivider) {
        const matGD = materials.gableDivider || materials.trim || materials.wall;
        const gdGeom = new THREE.BoxGeometry(dw + 0.2, 0.5, params.thickness + 0.2);
        gdGeom.translate(0, dh, params.thickness / 2);
        const gdMesh = new THREE.Mesh(gdGeom, matGD);
        gdMesh.castShadow = true; gdMesh.receiveShadow = true;
        frontM.add(gdMesh);
    }

    dormerGroup.add(frontM);

    const trimW = 0.5; const trimD = params.thickness + 0.2; const trimH = dh - wallBaseY;
    const matTrim = materials.trim || materials.wall;

    const trimGeomL = new THREE.BoxGeometry(trimW, trimH, trimD);
    trimGeomL.translate(-dw/2 + trimW/2, wallBaseY + trimH/2, params.thickness/2);
    const trimMeshL = new THREE.Mesh(trimGeomL, matTrim);
    trimMeshL.position.set(dx, 0, 0); trimMeshL.rotation.y = Math.PI / 2;
    trimMeshL.castShadow = true; trimMeshL.receiveShadow = true;
    dormerGroup.add(trimMeshL);

    const trimGeomR = new THREE.BoxGeometry(trimW, trimH, trimD);
    trimGeomR.translate(dw/2 - trimW/2, wallBaseY + trimH/2, params.thickness/2);
    const trimMeshR = new THREE.Mesh(trimGeomR, matTrim);
    trimMeshR.position.set(dx, 0, 0); trimMeshR.rotation.y = Math.PI / 2;
    trimMeshR.castShadow = true; trimMeshR.receiveShadow = true;
    dormerGroup.add(trimMeshR);

    const xIntersect = Math.max(0, (yRidge - dh) / mMain); 

    const sideS = new THREE.Shape();
    sideS.moveTo(xIntersect, dh); 
    sideS.lineTo(dx, yRoofAtFront); 
    sideS.lineTo(dx, dh);
    sideS.closePath();

    const sideG = new THREE.ExtrudeGeometry(sideS, { depth: params.thickness, bevelEnabled: false });
    
    const sideR = new THREE.Mesh(sideG, materials.wall);
    sideR.position.set(0, 0, -dw/2 - params.thickness); 
    sideR.castShadow = true; sideR.receiveShadow = true;
    dormerGroup.add(sideR);
    
    const sideL = new THREE.Mesh(sideG, materials.wall);
    sideL.position.set(0, 0, dw/2); 
    sideL.castShadow = true; sideL.receiveShadow = true;
    dormerGroup.add(sideL);

    const rGeom = new THREE.BufferGeometry();
    const yR = dh + dPeak; const yE = dh - dropY; 
    const zE = dw/2 + O; const dXFront = dx + O; 
    
    const dT = (params.thickness * 5.0) / Math.cos(Math.atan(dPeak / (dw/2)));

    const pts = [
        new THREE.Vector3(dXFront, yE, zE), new THREE.Vector3(dXFront, yR, 0),
        new THREE.Vector3(dXFront, yE, -zE), 
        new THREE.Vector3(dXFront, yE - dT, -zE),
        new THREE.Vector3(dXFront, yR - dT, 0), 
        new THREE.Vector3(dXFront, yE - dT, zE),
        new THREE.Vector3(xIntersect, dh, zE), new THREE.Vector3((yRidge - yR)/mMain, yR, 0),
        new THREE.Vector3(xIntersect, dh, -zE), 
        new THREE.Vector3((yRidge - (dh - dT))/mMain, dh - dT, -zE),
        new THREE.Vector3((yRidge - (yR - dT))/mMain, yR - dT, 0), 
        new THREE.Vector3((yRidge - (dh - dT))/mMain, dh - dT, zE)
    ];

    const indices = [
        0, 1, 7,  0, 7, 6, 1, 2, 8,  1, 8, 7, 
        5, 11, 10, 5, 10, 4, 4, 10, 9, 4, 9, 3, 
        0, 5, 4, 0, 4, 1, 1, 4, 3, 1, 3, 2, 
        6, 7, 10, 6, 10, 11, 7, 8, 9, 7, 9, 10 
    ];

    const uvs = [];
    for(let i=0; i<12; i++) uvs.push(pts[i].x/params.width + 0.5, pts[i].z/params.depth + 0.5);

    const matSoffit = materials.soffit || matTrim;

    rGeom.setFromPoints(pts); rGeom.setIndex(indices); rGeom.computeVertexNormals();
    rGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    rGeom.clearGroups(); 
    rGeom.addGroup(0, 12, 0);  
    rGeom.addGroup(12, 12, 2); 
    rGeom.addGroup(24, 24, 1); 
    
    const roofM = new THREE.Mesh(rGeom, [materials.roof, matTrim, matSoffit]);
    roofM.castShadow = true; roofM.receiveShadow = true;
    dormerGroup.add(roofM);

    const side = params.dormerSide || 'right';
    let dZ = dz;
    let rY = 0;
    
    if (side === 'left') {
        rY = Math.PI; 
        dZ = -dz;     
    }
    
    dormerGroup.position.set(ridgeX, 0, dZ);
    
    if (params.modelType === 'saltbox') {
        rY += Math.PI; 
    }
    
    dormerGroup.rotation.y = rY;
    
    return dormerGroup;
}