import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.driveway) {
        throw new TypeError('Driveway geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get('concrete', context.colors?.concrete || '#B8B8B8');
    }
    return context.materials.concrete;
}

function createObject(context) {
    assertContext(context);
    const driveway = context.geometry.driveway;
    const root = new THREE.Group();
    root.name = 'driveway';

    if (!driveway.enabled) {
        return root;
    }

    const material = resolveMaterial(context);
    const geometry = new THREE.BoxGeometry(driveway.width, driveway.height, driveway.length);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'driveway-slab';
    mesh.position.set(driveway.position.x, driveway.position.y, driveway.position.z);
    mesh.receiveShadow = true;

    root.add(mesh);
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

export const DrivewayOrchestrator = Object.freeze({
    id: 'driveway',
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