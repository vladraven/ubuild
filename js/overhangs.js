// js/overhangs.js
import * as THREE from 'three';
import { roofMat } from './colorise.js';

export function createOverhangsGroup(geometry, vis = {}) {
    const group = new THREE.Group();

    if (!vis.checkRoof || !geometry || !geometry.overhangs?.enabled) {
        return group;
    }

    const roof = geometry.roof;
    if (!roof) return group;

    const roofThickness = roof.thickness;

    if (roof.isSingleSlope && roof.singleSlope) {
        const slope = roof.singleSlope;
        const roofGeometry = new THREE.BoxGeometry(slope.slopeLength, roofThickness, roof.totalLength);
        const roofMesh = new THREE.Mesh(roofGeometry, roofMat);

        roofMesh.rotation.z = slope.rotationZ;
        roofMesh.position.set(slope.position.x, slope.position.y, slope.position.z);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;

        group.add(roofMesh);
        return group;
    }

    if (!roof.gabled) return group;

    const left = roof.gabled.left;
    const leftGeometry = new THREE.BoxGeometry(left.slopeLength, roofThickness, roof.totalLength);
    const leftSlope = new THREE.Mesh(leftGeometry, roofMat);

    leftSlope.position.set(left.position.x, left.position.y, left.position.z);
    leftSlope.rotation.z = left.rotationZ;
    leftSlope.castShadow = true;
    leftSlope.receiveShadow = true;
    group.add(leftSlope);

    const right = roof.gabled.right;
    const rightGeometry = new THREE.BoxGeometry(right.slopeLength, roofThickness, roof.totalLength);
    const rightSlope = new THREE.Mesh(rightGeometry, roofMat);

    rightSlope.position.set(right.position.x, right.position.y, right.position.z);
    rightSlope.rotation.z = right.rotationZ;
    rightSlope.castShadow = true;
    rightSlope.receiveShadow = true;
    group.add(rightSlope);

    return group;
}