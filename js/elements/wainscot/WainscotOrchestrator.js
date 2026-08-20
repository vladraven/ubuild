import * as THREE from 'three';

const SIDES = Object.freeze([
    'front',
    'back',
    'left',
    'right'
]);

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.walls) {
        throw new TypeError(
            'Wall geometry is required'
        );
    }

    if (!context.panelGeometry?.wainscot) {
        throw new TypeError(
            'Wainscot panel geometry is required'
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

function resolveMaterial(context) {
    if (
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            'wallMetal',
            context.colors.wainscot,
            context.textures?.wainscotPanel
        );
    }

    if (context.materials.wallMetal) {
        return context.materials.wallMetal;
    }

    throw new Error(
        'Wainscot material is not available'
    );
}

function createPanelGeometry(panel) {
    const bounds = panel.bounds;

    const width = Math.max(
        bounds.max.x - bounds.min.x,
        0.001
    );

    const height = Math.max(
        bounds.max.y - bounds.min.y,
        0.001
    );

    const length = Math.max(
        bounds.max.z - bounds.min.z,
        0.001
    );

    return new THREE.BoxGeometry(
        width,
        height,
        length
    );
}

function createPanel(
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

    mesh.userData.element =
        'wainscot';

    mesh.userData.panelIndex =
        panel.index;

    return mesh;
}

function createSide(
    side,
    panels,
    material
) {
    const group =
        new THREE.Group();

    group.name =
        `wainscot-${side}`;

    for (const panel of panels) {
        group.add(
            createPanel(
                panel,
                material
            )
        );
    }

    return group;
}

function createObject(context) {
    assertContext(context);

    const root =
        new THREE.Group();

    root.name = 'wainscot';

    const material =
        resolveMaterial(context);

    for (const side of SIDES) {
        const panels =
            context.panelGeometry
                .wainscot[side];

        if (!Array.isArray(panels)) {
            continue;
        }

        root.add(
            createSide(
                side,
                panels,
                material
            )
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

function updateObject(
    object,
    context
) {
    assertContext(context);

    if (!object) {
        return createObject(context);
    }

    for (
        const child
        of [...object.children]
    ) {
        disposeObject(child);
    }

    object.clear();

    const material =
        resolveMaterial(context);

    for (const side of SIDES) {
        const panels =
            context.panelGeometry
                .wainscot[side];

        if (!Array.isArray(panels)) {
            continue;
        }

        object.add(
            createSide(
                side,
                panels,
                material
            )
        );
    }

    return object;
}

export const WainscotOrchestrator =
    Object.freeze({
        id: 'wainscot',

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