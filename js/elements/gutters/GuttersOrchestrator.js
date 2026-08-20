import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.gutters) {
        throw new TypeError('Gutters geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context, name) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get(name, context.colors?.trim);
    }
    if (context.materials[name]) {
        return context.materials[name];
    }
    return context.materials.trimMetal || context.materials.steel;
}

function createGutterChannelMesh(eave, profile, material) {
    const shape = new THREE.Shape();
    const w = profile.width;
    const h = profile.height;
    const t = profile.wallThickness;
    const r = w / 2;

    shape.moveTo(0, h);
    shape.lineTo(0, 0);
    shape.absarc(r, 0, r, Math.PI, 0, true);
    shape.lineTo(w, h);
    shape.lineTo(w - t, h);
    shape.absarc(r, 0, r - t, 0, Math.PI, false);
    shape.lineTo(t, h);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: eave.length,
        bevelEnabled: false
    });

    geometry.translate(-w / 2, 0, -eave.length / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `gutter-channel-${eave.side}`;

    mesh.position.set(
        (eave.start.x + eave.end.x) / 2,
        (eave.start.y + eave.end.y) / 2,
        (eave.start.z + eave.end.z) / 2
    );

    return mesh;
}

function createDownspoutMesh(downspout, pipeConfig, material) {
    const group = new THREE.Group();
    group.name = `downspout-${downspout.id}`;

    for (const seg of downspout.segments) {
        const height = seg.length;
        const geometry = new THREE.BoxGeometry(pipeConfig.width, height, pipeConfig.depth);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (seg.start.x + seg.end.x) / 2,
            (seg.start.y + seg.end.y) / 2,
            (seg.start.z + seg.end.z) / 2
        );
        group.add(mesh);
    }

    if (downspout.shoe) {
        const shoeGeom = new THREE.BoxGeometry(pipeConfig.width, pipeConfig.depth, downspout.shoeLength);
        const shoeMesh = new THREE.Mesh(shoeGeom, material);
        shoeMesh.position.set(
            (downspout.shoe.start.x + downspout.shoe.end.x) / 2,
            (downspout.shoe.start.y + downspout.shoe.end.y) / 2,
            (downspout.shoe.start.z + downspout.shoe.end.z) / 2
        );
        group.add(shoeMesh);
    }

    for (const strap of downspout.straps) {
        const strapGeom = new THREE.BoxGeometry(pipeConfig.width * 1.2, 0.03, pipeConfig.depth * 1.2);
        const strapMesh = new THREE.Mesh(strapGeom, material);
        strapMesh.position.set(strap.x, strap.y, strap.z);
        group.add(strapMesh);
    }

    return group;
}

function createObject(context) {
    assertContext(context);
    const guttersData = context.geometry.gutters;
    const root = new THREE.Group();
    root.name = 'gutters';

    if (!guttersData.enabled) {
        return root;
    }

    const material = resolveMaterial(context, 'eaveTrim');

    if (guttersData.eaves.left) {
        root.add(createGutterChannelMesh(guttersData.eaves.left, guttersData.profile, material));
    }
    if (guttersData.eaves.right) {
        root.add(createGutterChannelMesh(guttersData.eaves.right, guttersData.profile, material));
    }

    for (const downspout of guttersData.downspouts) {
        if (downspout.visible) {
            root.add(createDownspoutMesh(downspout, guttersData.config.pipe, material));
        }
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

export const GuttersOrchestrator = Object.freeze({
    id: 'gutters',
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