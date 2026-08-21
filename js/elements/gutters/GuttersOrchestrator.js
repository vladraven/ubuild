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

    /*
     * eave.y is the roof-edge elevation.
     *
     * The TOP of the inner gutter wall
     * is exactly at the roof edge.
     *
     * Therefore the gutter bottom is:
     *
     * roofEdgeY - innerHeight
     */

    const bottomY =
        eave.front.y -
        innerHeight;

    /*
     * eave.x is the CENTER of the gutter.
     *
     * Half of the gutter therefore lies
     * inside the roof edge and half outside.
     */

    const centerX =
        eave.front.x;

    const centerZ =
        (
            eave.front.z +
            eave.back.z
        ) / 2;

    /*
     * INNER WALL
     *
     * Full height: 1.75 × W
     *
     * This is the wall facing the building.
     */

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

    /*
     * BOTTOM
     *
     * Full gutter width.
     */

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

    /*
     * OUTER WALL
     *
     * Height: 0.75 × W
     *
     * Shorter than the inner wall.
     */

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

function createObject(
    context
) {
    assertContext(
        context
    );

    const data =
        context.geometry.gutters;

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

    /*
     * Deliberately no downspouts.
     */

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
                child.geometry = null;
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