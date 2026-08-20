import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.walls) {
        throw new TypeError(
            'Wall geometry is required'
        );
    }

    if (!context.panelGeometry?.walls) {
        throw new TypeError(
            'Wall panel geometry is required'
        );
    }

    if (!context.materials) {
        throw new TypeError(
            'Material system is required'
        );
    }

    if (!context.colors) {
        throw new TypeError(
            'Color system is required'
        );
    }
}

function getWallMaterial(
    context,
    side
) {
    if (
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            'wallMetal',
            context.colors.wall,
            context.textures?.wallPanel
        );
    }

    if (context.materials.wallMetal) {
        return context.materials.wallMetal;
    }

    if (context.materials.wall) {
        return context.materials.wall;
    }

    throw new Error(
        `Wall material is not available for ${side}`
    );
}

function createPanelGeometry(
    panel
) {
    const bounds = panel.bounds;

    const width = Math.max(
        bounds.max.x - bounds.min.x,
        0
    );

    const height = Math.max(
        bounds.max.y - bounds.min.y,
        0
    );

    const length = Math.max(
        bounds.max.z - bounds.min.z,
        0
    );

    return new THREE.BoxGeometry(
        width || 0.001,
        height || 0.001,
        length || 0.001
    );
}

function createPanelMesh(
    panel,
    material
) {
    const mesh = new THREE.Mesh(
        createPanelGeometry(panel),
        material
    );

    const bounds = panel.bounds;

    mesh.position.set(
        (bounds.min.x + bounds.max.x) / 2,
        (bounds.min.y + bounds.max.y) / 2,
        (bounds.min.z + bounds.max.z) / 2
    );

    mesh.userData.element = 'wall';
    mesh.userData.panelIndex = panel.index;

    return mesh;
}

function createWallGroup(
    side,
    panels,
    material
) {
    const group = new THREE.Group();

    group.name = `wall-${side}`;

    for (const panel of panels) {
        group.add(
            createPanelMesh(
                panel,
                material
            )
        );
    }

    return group;
}

function createObject(context) {
    assertContext(context);

    const root = new THREE.Group();

    root.name = 'walls';

    for (const side of [
        'front',
        'back',
        'left',
        'right'
    ]) {
        const panels =
            context.panelGeometry.walls[side];

        if (!Array.isArray(panels)) {
            continue;
        }

        const material =
            getWallMaterial(
                context,
                side
            );

        root.add(
            createWallGroup(
                side,
                panels,
                material
            )
        );
    }

    return root;
}

function updateObject(
    object,
    context
) {
    assertContext(context);

    if (!object) {
        return createObject(context);
    }

    disposeChildren(object);

    for (const side of [
        'front',
        'back',
        'left',
        'right'
    ]) {
        const panels =
            context.panelGeometry.walls[side];

        if (!Array.isArray(panels)) {
            continue;
        }

        object.add(
            createWallGroup(
                side,
                panels,
                getWallMaterial(
                    context,
                    side
                )
            )
        );
    }

    return object;
}

function disposeChildren(
    group
) {
    while (group.children.length) {
        const child =
            group.children.pop();

        disposeObject(child);
    }
}

function disposeObject(
    object
) {
    if (!object) {
        return;
    }

    if (object.children) {
        for (
            const child
            of [...object.children]
        ) {
            disposeObject(child);
        }
    }

    object.geometry?.dispose();
    object.removeFromParent();
}

export const WallOrchestrator = Object.freeze({
    id: 'walls',

    create(context) {
        return createObject(context);
    },

    update(object, context) {
        return updateObject(
            object,
            context
        );
    },

    dispose(object) {
        disposeObject(object);
    }
});