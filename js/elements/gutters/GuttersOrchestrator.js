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
        !context.geometry?.gutters
    ) {
        throw new TypeError(
            'Gutters geometry is required'
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

function resolveMaterial(
    context
) {
    if (
        typeof context.materials.get ===
        'function'
    ) {
        return context.materials.get(
            'eaveTrim',
            context.colors?.trim
        );
    }

    return (
        context.materials.eaveTrim ||
        context.materials.trimMetal ||
        context.materials.steel
    );
}

function createBox(
    width,
    height,
    length,
    x,
    y,
    z,
    material,
    name
) {
    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            length
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.set(
        x,
        y,
        z
    );

    mesh.name =
        name;

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createGutter(
    eave,
    profile,
    material
) {
    const group =
        new THREE.Group();

    group.name =
        `gutter-${eave.side}`;

    const width =
        profile.width;

    const thickness =
        profile.thickness;

    const innerHeight =
        profile.innerHeight;

    const outerHeight =
        profile.outerHeight;

    const length =
        eave.edge.length;

    const bottomY =
        eave.front.y -
        innerHeight;

    const centerX =
        eave.front.x;

    const centerZ =
        (
            eave.front.z +
            eave.back.z
        ) / 2;

    const innerX =
        centerX +
        (
            eave.side === 'L'
                ? width / 2 -
                    thickness / 2
                : -width / 2 +
                    thickness / 2
        );

    const innerWall =
        createBox(
            thickness,
            innerHeight,
            length,
            innerX,
            bottomY +
                innerHeight / 2,
            centerZ,
            material,
            `gutter-${eave.side}-inner`
        );

    const bottom =
        createBox(
            width,
            thickness,
            length,
            centerX,
            bottomY +
                thickness / 2,
            centerZ,
            material,
            `gutter-${eave.side}-bottom`
        );

    const outerX =
        centerX +
        (
            eave.side === 'L'
                ? -width / 2 +
                    thickness / 2
                : width / 2 -
                    thickness / 2
        );

    const outerWall =
        createBox(
            thickness,
            outerHeight,
            length,
            outerX,
            bottomY +
                outerHeight / 2,
            centerZ,
            material,
            `gutter-${eave.side}-outer`
        );

    group.add(
        innerWall,
        bottom,
        outerWall
    );

    return group;
}

function createDownspout(
    downspout,
    material
) {
    const geometry =
        new THREE.CylinderGeometry(
            downspout.radius,
            downspout.radius,
            downspout.height,
            12
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        `downspout-${downspout.id}`;

    mesh.position.set(
        downspout.position.x,
        downspout.position.y,
        downspout.position.z
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createDownspouts(
    data,
    material
) {
    const group =
        new THREE.Group();

    group.name =
        'downspouts';

    if (
        !data?.enabled ||
        !Array.isArray(
            data.items
        )
    ) {
        return group;
    }

    for (
        const downspout
        of data.items
    ) {
        group.add(
            createDownspout(
                downspout,
                material
            )
        );
    }

    return group;
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const data =
        context.geometry.gutters;

    const downspouts =
        context.geometry.downspouts;

    const root =
        new THREE.Group();

    root.name =
        'gutters';

    if (
        !data.enabled
    ) {
        return root;
    }

    if (
        context.model?.visibility?.gutters ===
        false
    ) {
        return root;
    }

    const material =
        resolveMaterial(
            context
        );

    if (
        data.eaves?.left
    ) {
        root.add(
            createGutter(
                data.eaves.left,
                data.profile,
                material
            )
        );
    }

    if (
        data.eaves?.right
    ) {
        root.add(
            createGutter(
                data.eaves.right,
                data.profile,
                material
            )
        );
    }

    root.add(
        createDownspouts(
            downspouts,
            material
        )
    );

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

export const GuttersOrchestrator =
    Object.freeze({
        id: 'gutters',

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