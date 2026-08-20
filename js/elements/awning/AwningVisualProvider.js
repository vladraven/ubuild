import * as THREE from 'three';

function createMaterial(context) {
    if (
        context?.materials &&
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            'wallMetal',
            context.colors?.wall
        );
    }

    if (context?.materials?.wallMetal) {
        return context.materials.wallMetal;
    }

    if (context?.materials?.wall) {
        return context.materials.wall;
    }

    return new THREE.MeshStandardMaterial();
}

function createMesh(geometry, material) {
    const shape = geometry.shapeData?.points;

    if (!Array.isArray(shape) || shape.length < 3) {
        return null;
    }

    const vertices = [];

    for (const point of shape) {
        vertices.push(point.x, point.y, 0);
    }

    const indices = [];

    for (let i = 1; i < shape.length - 1; i++) {
        indices.push(0, i, i + 1);
    }

    const buffer = new THREE.BufferGeometry();

    buffer.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    buffer.setIndex(indices);
    buffer.computeVertexNormals();

    const mesh = new THREE.Mesh(buffer, material);

    mesh.position.set(
        geometry.position.x,
        geometry.position.y,
        geometry.position.z
    );

    mesh.rotation.y = geometry.rotationY;

    return mesh;
}

function createRoof(side, data, context) {
    if (!data?.active) {
        return null;
    }

    const material = createMaterial(context);
    const group = new THREE.Group();
    group.name = `${side}-awning-roof`;

    const geometry = new THREE.BoxGeometry(
        data.width,
        context.model.walls.thickness,
        data.roof.lengthOnSlope
    );

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = data.pitchAngle;
    mesh.position.set(
        data.position.x,
        data.position.y,
        data.position.z
    );

    group.add(mesh);
    return group;
}

function createWalls(side, data, context) {
    const group = new THREE.Group();
    group.name = `${side}-awning-walls`;

    const material = createMaterial(context);

    for (const key of ['wallF', 'wallL', 'wallR']) {
        const wall = data[key];
        if (!wall) continue;

        const mesh = createMesh(wall, material);
        if (mesh) group.add(mesh);
    }

    return group;
}

function createColumns(data, context) {
    const group = new THREE.Group();
    const material = createMaterial(context);

    for (const column of data.columns ?? []) {
        const geometry = new THREE.BoxGeometry(
            column.size,
            column.height,
            column.size
        );

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            column.position.x,
            column.position.y,
            column.position.z
        );

        group.add(mesh);
    }

    return group;
}

function createSide(side, data, context) {
    if (!data?.active) {
        return null;
    }

    const group = new THREE.Group();
    group.name = `awning-${side}`;

    const roof = createRoof(side, data, context);
    if (roof) group.add(roof);

    group.add(createWalls(side, data, context));
    group.add(createColumns(data, context));

    group.position.set(
        data.position.x,
        data.position.y,
        data.position.z
    );
    group.rotation.y = data.rotationY;

    return group;
}

function create(context) {
    if (!context?.geometry) {
        throw new TypeError('Awning geometry is required');
    }

    const root = new THREE.Group();
    root.name = 'awnings';

    for (const side of ['L', 'R', 'F', 'B']) {
        const object = createSide(side, context.geometry[side], context);
        if (object) root.add(object);
    }

    return root;
}

function dispose(object) {
    if (!object) return;

    object.traverse((child) => {
        if (!child.isMesh) return;
        if (child.geometry) {
            child.geometry.dispose();
            child.geometry = null;
        }
    });

    if (object.children) {
        const children = object.children.slice();
        for (let i = 0; i < children.length; i++) {
            object.remove(children[i]);
        }
    }

    object.removeFromParent();
}

export const AwningVisualProvider = Object.freeze({
    create,
    update(object, context) {
        const replacement = create(context);
        if (object?.parent) {
            object.parent.add(replacement);
        }
        dispose(object);
        return replacement;
    },
    dispose
});