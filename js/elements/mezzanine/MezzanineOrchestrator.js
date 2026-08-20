import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.mezzanine) {
        throw new TypeError('Mezzanine geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterials(context) {
    const deckMat = typeof context.materials.get === 'function'
        ? context.materials.get('mezzanine', context.model.mezzanine?.color || context.colors?.mezzanine)
        : (context.materials.mezzanine || context.materials.steel);

    const steelMat = typeof context.materials.get === 'function'
        ? context.materials.get('structuralSteel', context.colors?.frame)
        : (context.materials.structuralSteel || context.materials.steel);

    return { deckMat, steelMat };
}

function createObject(context) {
    assertContext(context);
    const mezzData = context.geometry.mezzanine;
    const root = new THREE.Group();
    root.name = 'mezzanine';

    if (!mezzData.enabled || !mezzData.floor) {
        return root;
    }

    const { deckMat, steelMat } = resolveMaterials(context);

    const floorGeo = new THREE.BoxGeometry(
        mezzData.floor.width,
        mezzData.floor.thickness,
        mezzData.floor.length
    );
    const floorMesh = new THREE.Mesh(floorGeo, deckMat);
    floorMesh.name = 'mezzanine-deck';
    floorMesh.position.set(
        mezzData.floor.top.x,
        mezzData.floor.top.y - mezzData.floor.thickness / 2,
        mezzData.floor.top.z
    );
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    root.add(floorMesh);

    const colRadius = mezzData.column.radius;
    for (const col of mezzData.columns) {
        const colGeo = new THREE.CylinderGeometry(colRadius, colRadius, col.height, 16);
        const colMesh = new THREE.Mesh(colGeo, steelMat);
        colMesh.name = col.id;
        colMesh.position.set(col.anchor.x, col.height / 2, col.anchor.z);
        colMesh.castShadow = true;
        colMesh.receiveShadow = true;
        root.add(colMesh);
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

export const MezzanineOrchestrator = Object.freeze({
    id: 'mezzanine',
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