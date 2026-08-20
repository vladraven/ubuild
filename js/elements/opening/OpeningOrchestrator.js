import * as THREE from 'three';

const TYPES = Object.freeze({
    WINDOW: 'Window',
    WALK_DOOR_SOLID: 'Walk Door Solid',
    WALK_DOOR_SOLID_DOUBLE: 'Walk Door Solid Double',
    OVERHEAD_PANEL_DOOR: 'Overhead Panel Door',
    BI_FOLD_DOOR: 'Bi-Fold Door',
    HYDRAULIC_DOOR: 'Hydraulic Door'
});

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!Array.isArray(context.geometry?.openings)) {
        throw new TypeError(
            'Opening geometry is required'
        );
    }

    if (!context.materials) {
        throw new TypeError(
            'Material system is required'
        );
    }
}

function resolveMaterial(
    context,
    name,
    color = null
) {
    if (
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            name,
            color
        );
    }

    if (context.materials[name]) {
        return context.materials[name];
    }

    if (context.materials.steel) {
        return context.materials.steel;
    }

    throw new Error(
        `Opening material is not available: ${name}`
    );
}

function createBoxFromBounds(
    bounds,
    depth = 0.08
) {
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
        depth
    );

    return new THREE.BoxGeometry(
        width,
        height,
        length
    );
}

function createFrame(
    opening,
    context
) {
    const material =
        resolveMaterial(
            context,
            'trimMetal',
            context.colors?.trim
        );

    const frame =
        new THREE.Mesh(
            createBoxFromBounds(
                opening.bounds
            ),
            material
        );

    frame.name = 'frame';

    return frame;
}

function createWindow(
    opening,
    context
) {
    const group =
        new THREE.Group();

    group.name =
        'window';

    const glassMaterial =
        resolveMaterial(
            context,
            'glass',
            context.colors?.glass
        );

    const glass =
        new THREE.Mesh(
            createBoxFromBounds(
                opening.bounds,
                0.02
            ),
            glassMaterial
        );

    glass.name = 'glass';

    group.add(
        glass
    );

    group.add(
        createFrame(
            opening,
            context
        )
    );

    return group;
}

function createWalkDoor(
    opening,
    context,
    doubleDoor
) {
    const group =
        new THREE.Group();

    group.name =
        doubleDoor
            ? 'walk-door-double'
            : 'walk-door';

    const material =
        resolveMaterial(
            context,
            'doorPanel',
            context.colors?.wall
        );

    const panel =
        new THREE.Mesh(
            createBoxFromBounds(
                opening.bounds,
                0.06
            ),
            material
        );

    panel.name = 'door-panel';

    group.add(
        panel
    );

    group.add(
        createFrame(
            opening,
            context
        )
    );

    return group;
}

function createLargeDoor(
    opening,
    context,
    name
) {
    const group =
        new THREE.Group();

    group.name = name;

    const panelMaterial =
        resolveMaterial(
            context,
            'doorPanel',
            context.colors?.wall
        );

    const panel =
        new THREE.Mesh(
            createBoxFromBounds(
                opening.bounds,
                0.08
            ),
            panelMaterial
        );

    panel.name =
        'door-panel';

    group.add(
        panel
    );

    group.add(
        createFrame(
            opening,
            context
        )
    );

    return group;
}

function createOpening(
    opening,
    context
) {
    switch (opening.type) {
        case TYPES.WINDOW:
            return createWindow(
                opening,
                context
            );

        case TYPES.WALK_DOOR_SOLID:
            return createWalkDoor(
                opening,
                context,
                false
            );

        case TYPES.WALK_DOOR_SOLID_DOUBLE:
            return createWalkDoor(
                opening,
                context,
                true
            );

        case TYPES.OVERHEAD_PANEL_DOOR:
            return createLargeDoor(
                opening,
                context,
                'overhead-panel-door'
            );

        case TYPES.BI_FOLD_DOOR:
            return createLargeDoor(
                opening,
                context,
                'bi-fold-door'
            );

        case TYPES.HYDRAULIC_DOOR:
            return createLargeDoor(
                opening,
                context,
                'hydraulic-door'
            );

        default:
            throw new RangeError(
                `Unsupported opening type: ${opening.type}`
            );
    }
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const root =
        new THREE.Group();

    root.name =
        'openings';

    for (
        const opening
        of context.geometry.openings
    ) {
        const object =
            createOpening(
                opening,
                context
            );

        object.userData.element =
            'opening';

        object.userData.openingId =
            opening.id;

        object.userData.openingType =
            opening.type;

        object.userData.side =
            opening.side;

        root.add(
            object
        );
    }

    return root;
}

function disposeObject(
    object
) {
    if (!object) {
        return;
    }

    for (
        const child
        of [...object.children]
    ) {
        disposeObject(
            child
        );
    }

    object.geometry?.dispose();

    object.material?.dispose?.();

    object.removeFromParent();
}

export const OpeningOrchestrator =
    Object.freeze({
        id: 'openings',

        create(context) {
            return createObject(
                context
            );
        },

        update(
            object,
            context
        ) {
            if (!object) {
                return createObject(
                    context
                );
            }

            disposeObject(
                object
            );

            return createObject(
                context
            );
        },

        dispose(object) {
            disposeObject(
                object
            );
        }
    });