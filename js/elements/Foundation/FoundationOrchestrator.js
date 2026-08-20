import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.foundation) {
        throw new TypeError(
            'Foundation geometry is required'
        );
    }

    if (!context.materials?.concrete) {
        throw new Error(
            'Concrete material is required'
        );
    }
}

function createMesh(context) {
    const foundation = context.geometry.foundation;

    if (!foundation.enabled) {
        return null;
    }

    const bounds = foundation.bounds;

    const geometry = new THREE.BoxGeometry(
        bounds.width,
        bounds.height,
        bounds.length
    );

    const mesh = new THREE.Mesh(
        geometry,
        context.materials.concrete
    );

    mesh.name = 'foundation';

    mesh.position.set(
        bounds.center.x,
        bounds.center.y,
        bounds.center.z
    );

    return mesh;
}

function updateMesh(mesh, context) {
    if (!mesh) {
        return createMesh(context);
    }

    const foundation =
        context.geometry.foundation;

    if (!foundation.enabled) {
        disposeMesh(mesh);
        return null;
    }

    const bounds = foundation.bounds;

    mesh.geometry.dispose();

    mesh.geometry = new THREE.BoxGeometry(
        bounds.width,
        bounds.height,
        bounds.length
    );

    mesh.position.set(
        bounds.center.x,
        bounds.center.y,
        bounds.center.z
    );

    return mesh;
}

function disposeMesh(mesh) {
    if (!mesh) {
        return;
    }

    mesh.geometry?.dispose();
    mesh.removeFromParent();
}

export const FoundationOrchestrator = Object.freeze({
    id: 'foundation',

    create(context) {
        assertContext(context);

        return createMesh(context);
    },

    update(mesh, context) {
        assertContext(context);

        return updateMesh(
            mesh,
            context
        );
    },

    dispose(mesh) {
        disposeMesh(mesh);
    }
});