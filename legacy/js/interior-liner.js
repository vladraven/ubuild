// js/interior-liner.js
import * as THREE from 'three';
import { intWallMat } from './colorise.js';

function createLinerShapeFromData(shapeData) {
    const shape = new THREE.Shape();
    shapeData.points.forEach((pt, idx) => {
        if (idx === 0) shape.moveTo(pt.x, pt.y);
        else shape.lineTo(pt.x, pt.y);
    });
    shapeData.holes.forEach(holeData => {
        const hole = new THREE.Path();
        hole.moveTo(holeData.minX, holeData.minY);
        hole.lineTo(holeData.maxX, holeData.minY);
        hole.lineTo(holeData.maxX, holeData.maxY);
        hole.lineTo(holeData.minX, holeData.maxY);
        hole.lineTo(holeData.minX, holeData.minY);
        shape.holes.push(hole);
    });
    return shape;
}

export function createInteriorLinerGroup(geometry, enabled, hPercent) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.interiorLiner || !geometry.interiorLiner.enabled) {
        return group;
    }

    const liner = geometry.interiorLiner;
    ['L', 'R', 'F', 'B'].forEach(side => {
        const sideData = liner.sides[side];
        if (!sideData) return;

        const shape = createLinerShapeFromData(sideData.shapeData);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: liner.thickness, bevelEnabled: false });
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, intWallMat);
        mesh.position.set(sideData.position.x, sideData.position.y, sideData.position.z);
        mesh.rotation.y = sideData.rotationY;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    });
    return group;
}