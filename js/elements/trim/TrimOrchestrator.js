import * as THREE from 'three';

const EPSILON = 1e-9;

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.roof) {
        throw new TypeError(
            'Roof geometry is required'
        );
    }

    if (!context.materials) {
        throw new TypeError(
            'Material system is required'
        );
    }
}

function resolveMaterial(context) {
    if (
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            'trimMetal',
            context.colors?.trim
        );
    }

    if (context.materials.trimMetal) {
        return context.materials.trimMetal;
    }

    if (context.materials.steel) {
        return context.materials.steel;
    }

    throw new Error(
        'Trim material is not available'
    );
}

function createProfile(
    line,
    material,
    width = 0.1,
    depth = 0.05
) {
    if (!line?.start || !line?.end) {
        return null;
    }

    const start =
        new THREE.Vector3(
            line.start.x,
            line.start.y,
            line.start.z
        );

    const end =
        new THREE.Vector3(
            line.end.x,
            line.end.y,
            line.end.z
        );

    const direction =
        end.clone().sub(start);

    const length =
        direction.length();

    if (length <= EPSILON) {
        return null;
    }

    const geometry =
        new THREE.BoxGeometry(
            width,
            depth,
            length
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.copy(
        start
            .clone()
            .add(end)
            .multiplyScalar(0.5)
    );

    mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction.normalize()
    );

    return mesh;
}

function addLine(
    group,
    name,
    line,
    material
) {
    const mesh =
        createProfile(
            line,
            material
        );

    if (!mesh) {
        return;
    }

    mesh.name = name;

    group.add(mesh);
}

function createObject(context) {
    assertContext(context);

    const root =
        new THREE.Group();

    root.name = 'trim';

    const material =
        resolveMaterial(context);

    const roof =
        context.geometry.roof;

    addLine(
        root,
        'front-edge',
        roof.edges?.front,
        material
    );

    addLine(
        root,
        'back-edge',
        roof.edges?.back,
        material
    );

    if (roof.ridge) {
        addLine(
            root,
            'ridge',
            roof.ridge.edge,
            material
        );
    }

    for (
        const side
        of ['left', 'right']
    ) {
        const eave =
            roof.eaves?.[side];

        if (!eave) {
            continue;
        }

        addLine(
            root,
            `${side}-eave`,
            eave.edge,
            material
        );
    }

    return root;
}

function disposeObject(object) {
    if (!object) {
        return;
    }

    for (
        const child
        of [...object.children]
    ) {
        disposeObject(child);
    }

    object.geometry?.dispose();
    object.removeFromParent();
}

export const TrimOrchestrator =
    Object.freeze({
        id: 'trim',

        create(context) {
            return createObject(context);
        },

        update(object, context) {
            if (!object) {
                return createObject(context);
            }

            disposeObject(object);

            return createObject(context);
        },

        dispose(object) {
            disposeObject(object);
        }
    });