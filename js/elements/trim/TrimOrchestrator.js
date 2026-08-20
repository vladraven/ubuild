// js/elements/trim/TrimOrchestrator.js
import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.trims) {
        throw new TypeError('Trims geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context, name = 'trimMetal') {
    if (typeof context.materials.get === 'function') {
        return context.materials.get(name, context.colors?.trim);
    }
    return context.materials[name] || context.materials.trimMetal || context.materials.steel;
}

function createProfileMesh(lineSeg, material, width = 0.1, depth = 0.05) {
    if (!lineSeg || !lineSeg.start || !lineSeg.end) return null;

    const start = new THREE.Vector3(lineSeg.start.x, lineSeg.start.y, lineSeg.start.z);
    const end = new THREE.Vector3(lineSeg.end.x, lineSeg.end.y, lineSeg.end.z);
    const direction = end.clone().sub(start);
    const length = direction.length();

    if (length <= 0.001) return null;

    const geometry = new THREE.BoxGeometry(width, depth, length);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
    mesh.castShadow = true;

    return mesh;
}

function createObject(context) {
    assertContext(context);
    const trimsData = context.geometry.trims;
    const root = new THREE.Group();
    root.name = 'trims';

    if (!trimsData.enabled) {
        return root;
    }

    const trimMaterial = resolveMaterial(context, 'trimMetal');
    const eaveMaterial = resolveMaterial(context, 'eaveTrim');

    // Карнизы
    for (const eave of trimsData.eaves) {
        const mesh = createProfileMesh(eave.edge, eaveMaterial, 0.12, 0.06);
        if (mesh) root.add(mesh);
    }

    // Фронтоны
    for (const r of trimsData.rake) {
        const mesh = createProfileMesh(r.edge, trimMaterial, 0.12, 0.06);
        if (mesh) root.add(mesh);
    }

    // Конёк
    for (const rd of trimsData.ridge) {
        const mesh = createProfileMesh(rd.edge, trimMaterial, 0.15, 0.04);
        if (mesh) root.add(mesh);
    }

    // Углы здания
    for (const c of trimsData.corners) {
        const mesh = createProfileMesh(c.edge, trimMaterial, 0.08, 0.08);
        if (mesh) root.add(mesh);
    }

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

export const TrimOrchestrator = Object.freeze({
    id: 'trims',
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