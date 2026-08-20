import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.liner) {
        throw new TypeError('Liner geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get('interiorWall', context.colors?.interiorWall || '#EEEEEE');
    }
    return context.materials.interiorWall || context.materials.wallMetal;
}

function createSideMesh(sideData, material) {
    const shape = new THREE.Shape();
    sideData.shapeData.points.forEach((p, idx) => {
        if (idx === 0) shape.moveTo(p.x, p.y);
        else shape.lineTo(p.x, p.y);
    });

    for (const hole of sideData.shapeData.holes) {
        const path = new THREE.Path();
        path.moveTo(hole.minX, hole.minY);
        path.lineTo(hole.maxX, hole.minY);
        path.lineTo(hole.maxX, hole.maxY);
        path.lineTo(hole.minX, hole.maxY);
        path.closePath();
        shape.holes.push(path);
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: sideData.thickness,
        bevelEnabled: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `liner-side-${sideData.side}`;
    mesh.position.set(sideData.position.x, sideData.position.y, sideData.position.z);
    mesh.rotation.y = sideData.rotationY;
    mesh.receiveShadow = true;
    return mesh;
}

function createObject(context) {
    assertContext(context);
    const liner = context.geometry.liner;
    const root = new THREE.Group();
    root.name = 'liner';

    if (!liner.enabled) {
        return root;
    }

    const material = resolveMaterial(context);
    for (const side of ['F', 'B', 'L', 'R']) {
        const sideData = liner.sides[side];
        if (sideData) {
            root.add(createSideMesh(sideData, material));
        }
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

export const LinerOrchestrator = Object.freeze({
    id: 'liner',
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