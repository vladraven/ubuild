// roofs/skillion_leanto.js
export default {
    getWallShape: (w, h, isGable, wallId, params, THREE) => {
        const shape = new THREE.Shape();
        const m = params.pitch / 12;
        const peak = params.width * m; 
        const tY = params.thickness / Math.cos(Math.atan(m));

        shape.moveTo(-w/2, 0); 
        shape.lineTo(w/2, 0); 
        
        if (wallId === 'front' || wallId === 'back') {
            const hLeft = h - tY;
            const hRight = h + peak - tY;
            shape.lineTo(w/2, hRight);
            shape.lineTo(-w/2, hLeft);
        } else if (wallId === 'left') {
            shape.lineTo(w/2, h - tY);
            shape.lineTo(-w/2, h - tY);
        } else if (wallId === 'right') {
            shape.lineTo(w/2, h + peak - tY);
            shape.lineTo(-w/2, h + peak - tY);
        }
        
        shape.closePath();
        return shape;
    },
    getRoofData: (params, THREE) => {
        const m = params.pitch / 12;
        const peak = params.width * m;
        const oh = 0.5; 
        const w2 = params.width / 2 + oh; 
        const d2 = params.depth / 2 + oh;
        
        const hLeft = params.height - (oh * m); 
        const hRight = params.height + peak + (oh * m);

        const pts = [
            new THREE.Vector3(-w2, hLeft, d2),    
            new THREE.Vector3(w2, hRight, d2),    
            new THREE.Vector3(w2, hRight, -d2),   
            new THREE.Vector3(-w2, hLeft, -d2)    
        ];
        
        const indices = [0, 1, 2, 0, 2, 3];
        return { pts, indices, isFlat: false };
    },
    buildCustomElements: (params, materials, THREE, group, createGenericRoofMesh) => {
        const lw = params.leanToWidth || 10;
        const ld = params.leanToDepth || 20;
        const lh = params.leanToHeight || 8;
        const lp = params.leanToPitch || 2;
        const t = params.thickness;
        const oh = 0.5;

        const m_lean = lp / 12;
        const peak_lean = lw * m_lean;
        const tY = t / Math.cos(Math.atan(m_lean));

        // Стартовая позиция (примыкает к правой стене основного здания)
        const startX = params.width / 2;
        const endX = startX + lw;

        // Высоты (самая высокая точка у стены дома, низкая - внешний край)
        const hHighest = lh + peak_lean; 
        const hLowest = lh;

        const z1 = ld / 2 + oh;
        const z2 = -ld / 2 - oh;
        const xOuter = endX + oh;

        // Точки ската пристройки
        const pts = [
            new THREE.Vector3(startX, hHighest, z1),
            new THREE.Vector3(xOuter, hLowest - (oh * m_lean), z1),
            new THREE.Vector3(xOuter, hLowest - (oh * m_lean), z2),
            new THREE.Vector3(startX, hHighest, z2)
        ];
        const indices = [0, 1, 2, 0, 2, 3];

        const pseudoParams = { width: lw * 2, depth: ld, pitch: lp, thickness: t };
        const roofMesh = createGenericRoofMesh(pts, indices, pseudoParams, materials, false);
        group.add(roofMesh);

        const createWall = (shape, pos, rot) => {
            const geom = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
            const mesh = new THREE.Mesh(geom, materials.wall);
            mesh.position.set(pos.x, pos.y, pos.z);
            mesh.rotation.set(rot.x, rot.y, rot.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
        };

        // ИСПРАВЛЕНИЕ: Форма передней и задней стен пристройки (Side Shape)
        // Строится строго от центра своего габарита (-lw/2 до lw/2).
        const sideS = new THREE.Shape();
        sideS.moveTo(-lw/2, 0);
        sideS.lineTo(lw/2, 0);
        // Правый край (внешний) - низкий
        sideS.lineTo(lw/2, hLowest - tY);
        // Левый край (примыкает к дому) - высокий
        sideS.lineTo(-lw/2, hHighest - tY);
        sideS.closePath();

        // Передняя стена пристройки
        createWall(sideS, {x: startX + lw/2, y: 0, z: ld/2 - t}, {x: 0, y: 0, z: 0});

        // Задняя стена пристройки (Использует ту же форму и тот же угол без разворота)
        createWall(sideS, {x: startX + lw/2, y: 0, z: -ld/2}, {x: 0, y: 0, z: 0});

        // Правая стена пристройки (внешняя ровная стена)
        const rightS = new THREE.Shape();
        rightS.moveTo(-ld/2, 0);
        rightS.lineTo(ld/2, 0);
        rightS.lineTo(ld/2, hLowest - tY);
        rightS.lineTo(-ld/2, hLowest - tY);
        rightS.closePath();
        
        createWall(rightS, {x: endX - t, y: 0, z: 0}, {x: 0, y: -Math.PI/2, z: 0});
    }
};