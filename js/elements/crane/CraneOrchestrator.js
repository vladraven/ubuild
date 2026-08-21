import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.crane) {
        throw new TypeError('Crane geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterials(context) {
    const steelMat = typeof context.materials.get === 'function'
        ? context.materials.get('structuralSteel', context.colors?.frame)
        : (context.materials.structuralSteel || context.materials.steel);

    const bodyMat = typeof context.materials.get === 'function'
        ? context.materials.get('trimMetal', '#EAB308')
        : (context.materials.trimMetal || context.materials.steel);

    return { steelMat, bodyMat };
}

function createObject(context) {
    assertContext(context);
    const craneData = context.geometry.crane;
    const root = new THREE.Group();
    root.name = 'crane';

    if (!craneData.enabled) {
        return root;
    }
    if (context.model?.visibility?.crane === false) {
        return root;
    }

    const { steelMat, bodyMat } = resolveMaterials(context);

    if (craneData.rails.left && craneData.rails.right) {
        const railGeo = new THREE.BoxGeometry(
            craneData.rails.left.width,
            craneData.rails.left.height,
            craneData.rails.left.length
        );

        const leftRailMesh = new THREE.Mesh(railGeo, steelMat);
        leftRailMesh.name = 'crane-rail-left';
        leftRailMesh.position.set(
            craneData.rails.left.position.x,
            craneData.rails.left.position.y,
            craneData.rails.left.position.z
        );
        leftRailMesh.castShadow = true;
        root.add(leftRailMesh);

        const rightRailMesh = new THREE.Mesh(railGeo, steelMat);
        rightRailMesh.name = 'crane-rail-right';
        rightRailMesh.position.set(
            craneData.rails.right.position.x,
            craneData.rails.right.position.y,
            craneData.rails.right.position.z
        );
        rightRailMesh.castShadow = true;
        root.add(rightRailMesh);
    }

    if (craneData.bridge) {
        const bridgeGeo = new THREE.BoxGeometry(
            craneData.bridge.width,
            craneData.bridge.height,
            craneData.bridge.depth
        );
        const bridgeMesh = new THREE.Mesh(bridgeGeo, bodyMat);
        bridgeMesh.name = 'crane-bridge';
        bridgeMesh.position.set(
            craneData.bridge.position.x,
            craneData.bridge.position.y,
            craneData.bridge.position.z
        );
        bridgeMesh.castShadow = true;
        root.add(bridgeMesh);
    }

    if (craneData.trolley) {
        const trolleyGeo = new THREE.BoxGeometry(
            craneData.trolley.width,
            craneData.trolley.height,
            craneData.trolley.depth
        );
        const trolleyMesh = new THREE.Mesh(trolleyGeo, steelMat);
        trolleyMesh.name = 'crane-trolley';
        trolleyMesh.position.set(
            craneData.trolley.position.x,
            craneData.trolley.position.y,
            craneData.trolley.position.z
        );
        trolleyMesh.castShadow = true;
        root.add(trolleyMesh);
    }

    if (craneData.cable) {
        const cableGeo = new THREE.CylinderGeometry(
            craneData.cable.radius,
            craneData.cable.radius,
            craneData.cable.length,
            8
        );
        const cableMesh = new THREE.Mesh(cableGeo, steelMat);
        cableMesh.name = 'crane-cable';
        cableMesh.position.set(
            craneData.cable.position.x,
            craneData.cable.position.y,
            craneData.cable.position.z
        );
        root.add(cableMesh);
    }

    return root;
}

function disposeObject(object) {
    if (!object) return;

    object.traverse((child) => {
        if (!child.isMesh) return;
        if (child.geometry) {
            child.geometry.dispose();
            child.geometry = null;
        }
    });

    const children = object.children.slice();
    for (let i = 0; i < children.length; i++) {
        object.remove(children[i]);
    }

    object.removeFromParent();
}

export const CraneOrchestrator = Object.freeze({
    id: 'crane',
    create(context) {
        return createObject(context);
    },
    update(object, context) {
        if (!object) return createObject(context);
        disposeObject(object);
        return createObject(context);
    },
    dispose(object) {
        disposeObject(object);
    }
});