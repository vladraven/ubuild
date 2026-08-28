import {
    THREE
} from './runtimeImports.js';

export function createRoot(
    name = 'root'
) {
    const root =
        new THREE.Group();

    root.name =
        name;

    return root;
}

export function addInstances(
    root,
    instances
) {
    if (
        !root ||
        typeof root.add !== 'function'
    ) {
        throw new TypeError(
            'A valid THREE.Object3D root is required'
        );
    }

    if (!instances) {
        return;
    }

    const entries =
        instances instanceof Map
            ? instances.entries()
            : Object.entries(instances);

    for (
        const [
            id,
            instance
        ]
        of entries
    ) {
        if (!instance) {
            continue;
        }

        const object =
            instance.object ??
            instance;

        if (
            object &&
            object.isObject3D
        ) {
            object.name =
                id;

            root.add(
                object
            );
        }
    }
}

export function clearRoot(root) {
    if (
        !root ||
        !Array.isArray(root.children)
    ) {
        return;
    }

    while (
        root.children.length > 0
    ) {
        root.remove(
            root.children[0]
        );
    }
}