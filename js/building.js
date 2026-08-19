// js/building.js
import * as THREE from 'three';
import { createWindowsGroupForWall } from './windows.js';
import { createDoorsGroupForWall } from './doors.js';
import { roofMat } from './colorise.js';
import { getWallPanelMaterial, applyPanelUVs } from './panelSystem.js';

function createWallShape(wall) {
    const shape = new THREE.Shape();

    wall.points.forEach((point, index) => {
        if (index === 0) {
            shape.moveTo(point.x, point.y);
            return;
        }
        shape.lineTo(point.x, point.y);
    });

    wall.holes.forEach(holeData => {
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

function createWallMesh(wall, panelMaterial) {
    const shape = createWallShape(wall);
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: wall.thickness,
        bevelEnabled: false
    });

    applyPanelUVs(geometry, wall.uvOriginX, 0);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, panelMaterial);
    mesh.position.set(wall.transform.position.x, wall.transform.position.y, wall.transform.position.z);
    mesh.rotation.y = wall.transform.rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function addWallAssemblies(group, side, wall, width, length) {
    if (!wall) return;

    const isLongWall = side === 'L' || side === 'R';
    const wallLength = isLongWall ? length : width;
    const transform = wall.transform;

    const windows = createWindowsGroupForWall(side, wallLength);
    windows.position.set(transform.position.x, transform.position.y, transform.position.z);
    windows.rotation.y = transform.rotationY;
    group.add(windows);

    const doors = createDoorsGroupForWall(side, wallLength);
    doors.position.set(transform.position.x, transform.position.y, transform.position.z);
    doors.rotation.y = transform.rotationY;
    group.add(doors);
}

function createRoofMesh(roof) {
    if (!roof || !roof.visible || roof.overhang.enabled) {
        return null;
    }

    if (roof.isSingleSlope && roof.singleSlope) {
        const geometry = new THREE.BoxGeometry(roof.singleSlope.slopeLength, roof.thickness, roof.length);
        const mesh = new THREE.Mesh(geometry, roofMat);
        mesh.rotation.z = roof.singleSlope.rotationZ;
        mesh.position.set(roof.singleSlope.position.x, roof.singleSlope.position.y, roof.singleSlope.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    if (!roof.gabled) return null;

    const group = new THREE.Group();

    const leftGeometry = new THREE.BoxGeometry(roof.gabled.left.slopeLength, roof.thickness, roof.length);
    const leftSlope = new THREE.Mesh(leftGeometry, roofMat);
    leftSlope.position.set(roof.gabled.left.position.x, roof.gabled.left.position.y, roof.gabled.left.position.z);
    leftSlope.rotation.z = roof.gabled.left.rotationZ;
    leftSlope.castShadow = true;
    leftSlope.receiveShadow = true;
    group.add(leftSlope);

    const rightGeometry = new THREE.BoxGeometry(roof.gabled.right.slopeLength, roof.thickness, roof.length);
    const rightSlope = new THREE.Mesh(rightGeometry, roofMat);
    rightSlope.position.set(roof.gabled.right.position.x, roof.gabled.right.position.y, roof.gabled.right.position.z);
    rightSlope.rotation.z = roof.gabled.right.rotationZ;
    rightSlope.castShadow = true;
    rightSlope.receiveShadow = true;
    group.add(rightSlope);

    return group;
}

export function createBuildingGroup(
    width,
    length,
    height,
    pitchRatio,
    roofType,
    hasOverhangs = false,
    vis = {},
    geometry = null
) {
    const group = new THREE.Group();
    if (!geometry) return group;

    const panelMaterial = getWallPanelMaterial();
    const wallSides = ['L', 'R', 'F', 'B'];

    wallSides.forEach(side => {
        const wall = geometry.walls[side];
        if (!wall) return;

        const wallMesh = createWallMesh(wall, panelMaterial);
        group.add(wallMesh);

        addWallAssemblies(group, side, wall, geometry.building.width, geometry.building.length);
    });

    if (!hasOverhangs && vis.checkRoof) {
        const roof = createRoofMesh(geometry.roof);
        if (roof) group.add(roof);
    }

    return group;
}