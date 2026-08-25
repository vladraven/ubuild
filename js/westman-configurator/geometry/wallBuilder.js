import * as THREE from 'three';

export const createWallGroup = (w, h, pos, rot, isGable, wallId, floorData, isFirstFloor, params, materials, activeModule) => {
    const shape = (activeModule.getWallShape ? activeModule.getWallShape(w, h, isGable, wallId, params, THREE) : null);
    if (!shape) return new THREE.Group();

    const wallGroup = new THREE.Group();
    const floorOpenings = floorData.openings[wallId] || [];

    // ВРЕЗКА ОКОН С ЗАЩИТНЫМ CLAMPING
    if (floorOpenings.length > 0) {
        floorOpenings.forEach(o => {
            let hx = o.offsetX !== undefined ? (-w / 2 + o.offsetX - o.w / 2) : (o.cx - o.w / 2);
            const minX = -w / 2;
            const maxX = w / 2 - o.w;
            hx = Math.max(minX, Math.min(maxX, hx));

            let hy = (o.isDoor || (o.cy - o.h / 2) <= 0) ? 0.01 : (o.cy - o.h / 2);
            const maxY = h - o.h;
            hy = Math.max(0.01, Math.min(maxY, hy));

            o._safeCx = hx + o.w / 2;
            o._safeCy = hy + o.h / 2;
            o._safeHx = hx;
            o._safeHy = hy;

            const holePath = new THREE.Path();
            holePath.moveTo(hx, hy);
            holePath.lineTo(hx + o.w, hy);
            holePath.lineTo(hx + o.w, hy + o.h);
            holePath.lineTo(hx, hy + o.h);
            holePath.closePath();
            
            shape.holes.push(holePath);
        });
    }

    const geom = new THREE.ExtrudeGeometry(shape, { depth: params.thickness, bevelEnabled: false });
    const wallMesh = new THREE.Mesh(geom, materials.wall);
    wallMesh.castShadow = true; wallMesh.receiveShadow = true;
    wallGroup.add(wallMesh);

    // WAINSCOT (только на первом этаже)
    if (isFirstFloor && params.hasWainscot && h > params.wainscotHeight && params.wainscotHeight > 0) {
        const wShape = new THREE.Shape();
        wShape.moveTo(-w/2, 0); wShape.lineTo(w/2, 0);
        wShape.lineTo(w/2, params.wainscotHeight); wShape.lineTo(-w/2, params.wainscotHeight);
        wShape.closePath();
        
        if (floorOpenings.length > 0) {
            floorOpenings.forEach(o => {
                if (o._safeHy < params.wainscotHeight) {
                    const holeTop = Math.min(o._safeHy + o.h, params.wainscotHeight - 0.01);
                    const holeH = holeTop - o._safeHy;
                    if (holeH > 0) {
                        const holePath = new THREE.Path();
                        holePath.moveTo(o._safeHx, o._safeHy); 
                        holePath.lineTo(o._safeHx + o.w, o._safeHy);
                        holePath.lineTo(o._safeHx + o.w, o._safeHy + holeH); 
                        holePath.lineTo(o._safeHx, o._safeHy + holeH);
                        holePath.closePath();
                        wShape.holes.push(holePath);
                    }
                }
            });
        }

        const wGeom = new THREE.ExtrudeGeometry(wShape, { depth: params.thickness + 0.1, bevelEnabled: false });
        const matWainscot = materials.wainscot || materials.wall;
        const wainscotMesh = new THREE.Mesh(wGeom, matWainscot);
        wainscotMesh.position.set(0, 0, -0.05); 
        wainscotMesh.castShadow = true; wainscotMesh.receiveShadow = true;
        wallGroup.add(wainscotMesh);
    }

    // ВИЗУАЛЬНЫЕ ОКНА
    if (floorOpenings.length > 0) {
        floorOpenings.forEach(o => {
            const glassMat = new THREE.MeshStandardMaterial({ 
                color: 0x111111, transparent: true, opacity: 0.4, metalness: 0.0, roughness: 0.9 
            });
            
            const openDepth = params.thickness * 10;
            const visualMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth), glassMat);
            
            visualMesh.position.set(o._safeCx, o._safeCy, params.thickness / 2); 
            visualMesh.userData = { isOpening: true, id: o.id, wallId: wallId, floorId: floorData.id, w: o.w, h: o.h, isDoor: o.isDoor };
            
            const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
            const maskMesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, openDepth - 0.05), maskMat);
            maskMesh.renderOrder = -1;
            visualMesh.add(maskMesh);
            
            wallGroup.add(visualMesh);
        });
    }
    
    // TRIMS
    if (w > 1.0) {
        const trimW = 0.5; const trimD = params.thickness + 0.2; 
        let trimHL = h; let trimHR = h;

        if (shape) {
            const pts = shape.getPoints();
            let maxYL = 0; let maxYR = 0;
            for (let i = 0; i < pts.length; i++) {
                const pt = pts[i];
                if (Math.abs(pt.x - (-w / 2)) < 0.1 && pt.y > maxYL) maxYL = pt.y - .2;
                if (Math.abs(pt.x - (w / 2)) < 0.1 && pt.y > maxYR) maxYR = pt.y - .2;
            }
            if (maxYL > 0) trimHL = maxYL;
            if (maxYR > 0) trimHR = maxYR;
        }

        const matTrim = materials.trim || materials.wall;

        const trimGeomL = new THREE.BoxGeometry(trimW, trimHL, trimD);
        trimGeomL.translate(0, trimHL / 2, params.thickness / 2);
        const trimMeshL = new THREE.Mesh(trimGeomL, matTrim);
        trimMeshL.position.set(-w / 2 + trimW / 2, 0, 0);
        trimMeshL.castShadow = true; trimMeshL.receiveShadow = true;
        
        const trimGeomR = new THREE.BoxGeometry(trimW, trimHR, trimD);
        trimGeomR.translate(0, trimHR / 2, params.thickness / 2);
        const trimMeshR = new THREE.Mesh(trimGeomR, matTrim);
        trimMeshR.position.set(w / 2 - trimW / 2, 0, 0);
        trimMeshR.castShadow = true; trimMeshR.receiveShadow = true;

        wallGroup.add(trimMeshL, trimMeshR);

        if (params.hasGableDivider && isGable) {
            const matGD = materials.gableDivider || materials.trim || materials.wall;
            const gdGeom = new THREE.BoxGeometry(w + 0.2, trimW, trimD);
            gdGeom.translate(0, h, params.thickness / 2); 
            
            const gdMesh = new THREE.Mesh(gdGeom, matGD);
            gdMesh.castShadow = true; 
            gdMesh.receiveShadow = true;
            wallGroup.add(gdMesh);
        }
    }

    wallGroup.position.set(pos.x, pos.y, pos.z);
    wallGroup.rotation.set(rot.x, rot.y, rot.z);

    return wallGroup;
};