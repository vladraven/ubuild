import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.logo) {
        throw new TypeError('Logo geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function createObject(context) {
    assertContext(context);
    const logoData = context.geometry.logo;
    const root = new THREE.Group();
    root.name = 'logo';

    if (!logoData.enabled || !logoData.position) {
        return root;
    }

    const width = logoData.width || 3.0;
    const height = logoData.height || 1.0;
    const thickness = logoData.thickness || 0.05;

    const plateMat = typeof context.materials.get === 'function'
        ? context.materials.get('trimMetal', '#FFFFFF')
        : context.materials.trimMetal;

    const geometry = new THREE.BoxGeometry(width, height, thickness);
    const mesh = new THREE.Mesh(geometry, plateMat);
    mesh.name = 'logo-sign';
    mesh.position.set(logoData.position.x, logoData.position.y, logoData.position.z);
    mesh.castShadow = true;

    root.add(mesh);
    return root;
}

function disposeObject(object) {
    if (!object) return;
    object.traverse(child => {
        if (child.isMesh) {
            child.geometry?.dispose();
        }
    });
    while (object.children.length > 0) {
        object.remove(object.children[0]);
    }
    object.removeFromParent();
}

export const LogoOrchestrator = Object.freeze({
    id: 'logo',
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