import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.roof) {
        throw new TypeError(
            'Roof geometry is required'
        );
    }

    if (!context.panelGeometry?.roof) {
        throw new TypeError(
            'Roof panel geometry is required'
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
            'roofMetal',
            context.colors.roof,
            context.textures?.roofPanel
        );
    }

    if (context.materials.roofMetal) {
        return context.materials.roofMetal;
    }

    if (context.materials.roof) {
        return context.materials.roof;
    }

    throw new Error(
        'Roof material is not available'
    );
}

function createPlaneGeometry(
    corners
) {
    const geometry =
        new THREE.BufferGeometry();

    const vertices = new Float32Array([
        corners[0].x,
        corners[0].y,
        corners[0].z,

        corners[1].x,
        corners[1].y,
        corners[1].z,

        corners[2].x,
        corners[2].y,
        corners[2].z,

        corners[3].x,
        corners[3].y,
        corners[3].z
    ]);

    const indices = [
        0, 1, 2,
        0, 2, 3
    ];

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            vertices,
            3
        )
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

function createPanelMesh(
    panel,
    material
) {
    const mesh = new THREE.Mesh(
        createPlaneGeometry(
            panel.corners
        ),
        material
    );

    mesh.userData.element = 'roof';
    mesh.userData.panelIndex = panel.index;

    return mesh;
}

function createPlaneGroup(
    planeId,
    panels,
    material
) {
    const group =
        new THREE.Group();

    group.name =
        `roof-${planeId}`;

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

    const root =
        new THREE.Group();

    root.name = 'roof';

    const material =
        resolveMaterial(context);

    for (
        const [planeId, panels]
        of Object.entries(
            context.panelGeometry.roof
        )
    ) {
        if (!Array.isArray(panels)) {
            continue;
        }

        root.add(
            createPlaneGroup(
                planeId,
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

    for (
        const [planeId, panels]
        of Object.entries(
            context.panelGeometry.roof
        )
    ) {
        if (!Array.isArray(panels)) {
            continue;
        }

        object.add(
            createPlaneGroup(
                planeId,
                panels,
                material
            )
        );
    }

    return object;
}

export const RoofOrchestrator = Object.freeze({
    id: 'roof',

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