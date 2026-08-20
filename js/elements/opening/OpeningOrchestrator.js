import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.openings) {
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
    type
) {
    const name =
        type === 'glass'
            ? 'glass'
            : 'trimMetal';

    if (
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            name,
            context.colors?.[type]
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

function createBox(
    bounds
) {
    return new THREE.BoxGeometry(
        Math.max(
            bounds.max.x - bounds.min.x,
            0.001
        ),
        Math.max(
            bounds.max.y - bounds.min.y,
            0.001
        ),
        Math.max(
            bounds.max.z - bounds.min.z,
            0.001
        )
    );
}

function createOpening(
    opening,
    context
) {
    const group =
        new THREE.Group();

    group.name =
        `opening-${opening.id}`;

    const bounds =
        opening.bounds;

    const frameMaterial =
        resolveMaterial(
            context,
            'frame'
        );

    const frame =
        new THREE.Mesh(
            createBox(bounds),
            frameMaterial
        );

    frame.name = 'frame';

    const inset =
        0.04;

    const innerBounds = {
        min: {
            x: bounds.min.x + inset,
            y: bounds.min.y + inset,
            z: bounds.min.z + inset
        },

        max: {
            x: bounds.max.x - inset,
            y: bounds.max.y - inset,
            z: bounds.max.z - inset
        }
    };

    if (
        opening.type === 'window'
    ) {
        const glassMaterial =
            resolveMaterial(
                context,
                'glass'
            );

        const glass =
            new THREE.Mesh(
                createBox(
                    innerBounds
                ),
                glassMaterial
            );

        glass.name = 'glass';

        group.add(glass);
    }

    group.add(frame);

    group.userData.element =
        'opening';

    group.userData.openingId =
        opening.id;

    return group;
}

function createObject(context) {
    assertContext(context);

    const root =
        new THREE.Group();

    root.name = 'openings';

    for (
        const opening
        of context.geometry.openings
    ) {
        root.add(
            createOpening(
                opening,
                context
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

export const OpeningOrchestrator =
    Object.freeze({
        id: 'openings',

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