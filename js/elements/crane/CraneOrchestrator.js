import * as THREE from 'three';

function assertContext(
    context
) {
    if (
        !context ||
        typeof context !== 'object'
    ) {
        throw new TypeError(
            'Element context is required'
        );
    }

    if (
        !context.geometry?.crane
    ) {
        throw new TypeError(
            'Crane geometry is required'
        );
    }

    if (
        !context.materials
    ) {
        throw new TypeError(
            'Material system is required'
        );
    }
}

function resolveMaterials(
    context
) {
    const steelMat =
        typeof context.materials.get ===
        'function'
            ? context.materials.get(
                'structuralSteel',
                context.colors?.frame
            )
            : (
                context.materials.structuralSteel ||
                context.materials.steel
            );

    const bodyMat =
        typeof context.materials.get ===
        'function'
            ? context.materials.get(
                'trimMetal',
                '#EAB308'
            )
            : (
                context.materials.trimMetal ||
                context.materials.steel
            );

    return {
        steelMat,
        bodyMat
    };
}

function createRail(
    rail,
    material,
    name
) {
    const geometry =
        new THREE.BoxGeometry(
            rail.width,
            rail.height,
            rail.length
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        name;

    /*
     * rail.position is explicitly
     * the center of the rail.
     */

    mesh.position.set(
        rail.position.x,
        rail.position.y,
        rail.position.z
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createBox(
    data,
    material,
    name
) {
    const geometry =
        new THREE.BoxGeometry(
            data.width,
            data.height,
            data.depth
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        name;

    mesh.position.set(
        data.position.x,
        data.position.y,
        data.position.z
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createCable(
    cable,
    material
) {
    const geometry =
        new THREE.CylinderGeometry(
            cable.radius,
            cable.radius,
            cable.length,
            8
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        'crane-cable';

    mesh.position.set(
        cable.position.x,
        cable.position.y,
        cable.position.z
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const craneData =
        context.geometry.crane;

    const root =
        new THREE.Group();

    root.name =
        'crane';

    if (
        !craneData.enabled
    ) {
        return root;
    }

    if (
        context.model?.visibility?.crane ===
        false
    ) {
        return root;
    }

    const {
        steelMat,
        bodyMat
    } =
        resolveMaterials(
            context
        );

    if (
        craneData.rails.left
    ) {
        root.add(
            createRail(
                craneData.rails.left,
                steelMat,
                'crane-rail-left'
            )
        );
    }

    if (
        craneData.rails.right
    ) {
        root.add(
            createRail(
                craneData.rails.right,
                steelMat,
                'crane-rail-right'
            )
        );
    }

    if (
        craneData.bridge
    ) {
        root.add(
            createBox(
                craneData.bridge,
                bodyMat,
                'crane-bridge'
            )
        );
    }

    if (
        craneData.trolley
    ) {
        root.add(
            createBox(
                craneData.trolley,
                steelMat,
                'crane-trolley'
            )
        );
    }

    if (
        craneData.cable
    ) {
        root.add(
            createCable(
                craneData.cable,
                steelMat
            )
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

    object.traverse(
        child => {
            if (
                !child.isMesh
            ) {
                return;
            }

            if (
                child.geometry
            ) {
                child.geometry.dispose();

                child.geometry =
                    null;
            }
        }
    );

    const children =
        object.children.slice();

    for (
        const child
        of children
    ) {
        object.remove(
            child
        );
    }

    object.removeFromParent();
}

export const CraneOrchestrator =
    Object.freeze({
        id: 'crane',

        create(
            context
        ) {
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

        dispose(
            object
        ) {
            disposeObject(
                object
            );
        }
    });