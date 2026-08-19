// js/crane.js
import * as THREE from 'three';
import {
    craneMat,
    craneRailMat
} from './colorise.js';

export function createCraneGroup(
    geometry,
    enabled,
    zPercent
) {
    const group =
        new THREE.Group();

    if (
        !enabled ||
        !geometry ||
        !geometry.crane
    ) {
        return group;
    }

    const craneData =
        geometry.crane;

    const railBeamGeo =
        new THREE.BoxGeometry(
            0.15,
            0.25,
            craneData.runwayLength
        );

    const leftRail =
        new THREE.Mesh(
            railBeamGeo,
            craneRailMat
        );

    leftRail.position.set(
        craneData.rails.left.x,
        craneData.rails.left.y,
        craneData.rails.left.z
    );

    leftRail.castShadow = true;
    group.add(leftRail);

    const rightRail =
        new THREE.Mesh(
            railBeamGeo,
            craneRailMat
        );

    rightRail.position.set(
        craneData.rails.right.x,
        craneData.rails.right.y,
        craneData.rails.right.z
    );

    rightRail.castShadow = true;
    group.add(rightRail);

    const bridgeGeo =
        new THREE.BoxGeometry(
            craneData.bridge.width,
            0.35,
            0.3
        );

    const bridgeMesh =
        new THREE.Mesh(
            bridgeGeo,
            craneMat
        );

    bridgeMesh.position.set(
        0,
        craneData.bridge.y,
        craneData.bridge.z
    );

    bridgeMesh.castShadow = true;
    group.add(bridgeMesh);

    const trolleyGeo =
        new THREE.BoxGeometry(
            0.4,
            0.4,
            0.4
        );

    const trolleyMesh =
        new THREE.Mesh(
            trolleyGeo,
            craneRailMat
        );

    trolleyMesh.position.set(
        0,
        craneData.bridge.y - 0.2,
        craneData.bridge.z
    );

    trolleyMesh.castShadow = true;
    group.add(trolleyMesh);

    const cableGeo =
        new THREE.CylinderGeometry(
            0.015,
            0.015,
            1.2,
            8
        );

    const cableMesh =
        new THREE.Mesh(
            cableGeo,
            craneRailMat
        );

    cableMesh.position.set(
        0,
        craneData.bridge.y - 0.9,
        craneData.bridge.z
    );

    group.add(cableMesh);

    return group;
}