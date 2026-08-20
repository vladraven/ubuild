// js/wainscot.js
import * as THREE from 'three';
import { getWainscotPanelMaterial, applyPanelUVs } from './panelSystem.js';

function createWainscotShapeFromData(shapeData) {
    const shape = new THREE.Shape();
    shapeData.points.forEach((point, index) => {
        if (index === 0) {
            shape.moveTo(point.x, point.y);
            return;
        }
        shape.lineTo(point.x, point.y);
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

function createWainscotMesh(shapeData, material, uvOriginX, thickness) {
    const shape = createWainscotShapeFromData(shapeData);
    const meshGeometry = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: thickness,
        bevelEnabled: false
    });

    applyPanelUVs(meshGeometry, uvOriginX, 0);
    meshGeometry.computeVertexNormals();

    const mesh = new THREE.Mesh(meshGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    return mesh;
}

export function createWainscotGroup(geometry) {
    const group = new THREE.Group();
    if (!geometry || !geometry.wainscot || !geometry.wainscot.enabled) {
        return group;
    }

    const panelMaterial = getWainscotPanelMaterial();
    const wainscotData = geometry.wainscot;

    ['L', 'R', 'F', 'B'].forEach(side => {
        const sideData = wainscotData.sides[side];
        if (!sideData) return;

        const mesh = createWainscotMesh(
            sideData.shapeData,
            panelMaterial,
            sideData.uvOriginX,
            wainscotData.thickness
        );

        mesh.position.set(sideData.position.x, sideData.position.y, sideData.position.z);
        mesh.rotation.y = sideData.rotationY;
        group.add(mesh);
    });

    return group;
}