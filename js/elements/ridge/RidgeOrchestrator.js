import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.roof) {
        throw new TypeError('Roof geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get('trimMetal', context.colors?.trim);
    }
    return context.materials.trimMetal || context.materials.steel;
}

function createObject(context) {
    assertContext(context);
    const roof = context.geometry.roof;
    const root = new THREE.Group();
    root.name = 'ridge';

    if (roof.type !== 'gabled' || !roof.ridge) {
        return root;
    }

    const material = resolveMaterial(context);
    const edge = roof.ridge.edge;
    const length = edge.length;
    const width = 0.25;
    const thickness = 0.02;

    const shape = new THREE.Shape();
    const halfW = width / 2;
    const rise = halfW * Math.tan(roof.pitchAngle);

    shape.moveTo(-halfW, -rise);
    shape.lineTo(0, 0);
    shape.lineTo(halfW, -rise);
    shape.lineTo(halfW, -rise + thickness);
    shape.lineTo(0, thickness);
    shape.lineTo(-halfW, -rise + thickness);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: length,
        bevelEnabled: false
    });
    geometry.translate(0, 0, -length / 2);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'ridge-cap';
    mesh.position.set(
        (edge.start.x + edge.end.x) / 2,
        (edge.start.y + edge.end.y) / 2,
        (edge.start.z + edge.end.z) / 2
    );

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

export const RidgeOrchestrator = Object.freeze({
    id: 'ridge',
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