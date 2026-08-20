import * as THREE from 'three';

const TYPES = Object.freeze({
    WINDOW: 'Window',
    WALK_DOOR_SOLID: 'Walk Door Solid',
    WALK_DOOR_SOLID_DOUBLE: 'Walk Door Solid Double',
    OVERHEAD_PANEL_DOOR: 'Overhead Panel Door',
    BI_FOLD_DOOR: 'Bi-Fold Door',
    HYDRAULIC_DOOR: 'Hydraulic Door'
});

const DEFAULTS = Object.freeze({
    frameThickness: 0.05,
    depth: 0.2,
    windowDepth: 0.15,
    glassDepth: 0.02,
    panelGap: 0.02
});

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!Array.isArray(context.geometry?.openings)) {
        throw new TypeError('Opening geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context, name, color = null) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get(name, color);
    }
    if (context.materials[name]) {
        return context.materials[name];
    }
    if (context.materials.steel) {
        return context.materials.steel;
    }
    throw new Error(`Opening material is not available: ${name}`);
}

function createBox(width, height, depth, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createFrame(width, height, context) {
    const material = resolveMaterial(context, 'trimMetal', context.colors?.trim);
    const thickness = DEFAULTS.frameThickness;
    const depth = DEFAULTS.depth;

    const group = new THREE.Group();
    group.name = 'frame';

    group.add(createBox(width, thickness, depth, material, 0, -height / 2 + thickness / 2, 0));
    group.add(createBox(width, thickness, depth, material, 0, height / 2 - thickness / 2, 0));
    group.add(createBox(thickness, height - thickness * 2, depth, material, -width / 2 + thickness / 2, 0, 0));
    group.add(createBox(thickness, height - thickness * 2, depth, material, width / 2 - thickness / 2, 0, 0));

    return group;
}

function createWindow(opening, context) {
    const group = new THREE.Group();
    group.name = 'window';

    const width = opening.dimensions.width;
    const height = opening.dimensions.height;
    const frameThickness = DEFAULTS.frameThickness;
    const frameDepth = DEFAULTS.windowDepth;

    const frameMaterial = resolveMaterial(context, 'frame', context.colors?.trim);
    const glassMaterial = resolveMaterial(context, 'glass', context.colors?.glass);

    group.add(createBox(width, frameThickness, frameDepth, frameMaterial, 0, -height / 2 + frameThickness / 2, 0));
    group.add(createBox(width, frameThickness, frameDepth, frameMaterial, 0, height / 2 - frameThickness / 2, 0));
    group.add(createBox(frameThickness, height - frameThickness * 2, frameDepth, frameMaterial, -width / 2 + frameThickness / 2, 0, 0));
    group.add(createBox(frameThickness, height - frameThickness * 2, frameDepth, frameMaterial, width / 2 - frameThickness / 2, 0, 0));

    const paneWidth = (width - frameThickness * 3) / 2;
    const paneHeight = (height - frameThickness * 3) / 2;
    const paneDepth = DEFAULTS.glassDepth;

    group.add(createBox(paneWidth, paneHeight, paneDepth, glassMaterial, -width / 4, -height / 4, 0));
    group.add(createBox(paneWidth, paneHeight, paneDepth, glassMaterial, width / 4, -height / 4, 0));
    group.add(createBox(paneWidth, paneHeight, paneDepth, glassMaterial, -width / 4, height / 4, 0));
    group.add(createBox(paneWidth, paneHeight, paneDepth, glassMaterial, width / 4, height / 4, 0));

    return group;
}

function createWalkDoor(opening, context, doubleDoor) {
    const group = new THREE.Group();
    group.name = doubleDoor ? 'walk-door-double' : 'walk-door';

    const width = opening.dimensions.width;
    const height = opening.dimensions.height;
    const f = DEFAULTS.frameThickness;
    const d = DEFAULTS.depth;

    group.add(createFrame(width, height, context));

    const panelMaterial = resolveMaterial(context, 'doorPanel', context.colors?.wall);
    const trimMaterial = resolveMaterial(context, 'doorTrim', context.colors?.trim);

    if (!doubleDoor) {
        group.add(createBox(width - f * 2, height - f, d - 0.05, panelMaterial, 0, f / 2, 0));
        group.add(createBox(0.05, 0.2, 0.3, trimMaterial, width / 2 - 0.15, 0, 0));
    } else {
        group.add(createBox(width / 2 - f, height - f, d - 0.05, panelMaterial, -width / 4, f / 2, 0));
        group.add(createBox(width / 2 - f, height - f, d - 0.05, panelMaterial, width / 4, f / 2, 0));
        group.add(createBox(0.05, 0.2, 0.3, trimMaterial, -0.1, 0, 0));
        group.add(createBox(0.05, 0.2, 0.3, trimMaterial, 0.1, 0, 0));
    }

    return group;
}

function createOverheadPanelDoor(opening, context) {
    const group = new THREE.Group();
    group.name = 'overhead-panel-door';

    const width = opening.dimensions.width;
    const height = opening.dimensions.height;

    group.add(createFrame(width, height, context));

    const material = resolveMaterial(context, 'doorPanel', context.colors?.wall);
    const f = DEFAULTS.frameThickness;
    const panelWidth = width - f * 2;
    const panelHeight = (height - f) / 4;

    for (let i = 0; i < 4; i++) {
        const y = -height / 2 + f + panelHeight * i + panelHeight / 2;
        group.add(createBox(panelWidth, panelHeight - DEFAULTS.panelGap, DEFAULTS.depth - 0.05, material, 0, y, 0));
    }

    return group;
}

function createBiFoldDoor(opening, context) {
    const group = new THREE.Group();
    group.name = 'bi-fold-door';

    const width = opening.dimensions.width;
    const height = opening.dimensions.height;

    group.add(createFrame(width, height, context));

    const material = resolveMaterial(context, 'doorPanel', context.colors?.wall);
    const f = DEFAULTS.frameThickness;
    const panelWidth = width - f * 2;
    const panelHeight = (height - f) / 2;
    const zOffset = 0.22;

    const bottom = createBox(panelWidth, panelHeight - 0.01, DEFAULTS.depth - 0.05, material, 0, -height / 4 + f / 2, zOffset);
    bottom.rotation.x = 0.1;
    group.add(bottom);

    const top = createBox(panelWidth, panelHeight - 0.01, DEFAULTS.depth - 0.05, material, 0, height / 4 + f / 2, zOffset);
    top.rotation.x = -0.1;
    group.add(top);

    return group;
}

function createHydraulicDoor(opening, context) {
    const group = new THREE.Group();
    group.name = 'hydraulic-door';

    const width = opening.dimensions.width;
    const height = opening.dimensions.height;

    group.add(createFrame(width, height, context));

    const material = resolveMaterial(context, 'doorPanel', context.colors?.wall);
    const panel = createBox(width, height, DEFAULTS.depth - 0.05, material, 0, height / 4, height / 4);
    panel.rotation.x = -0.3;
    group.add(panel);

    return group;
}

function createOpening(opening, context) {
    switch (opening.type) {
        case TYPES.WINDOW:
            return createWindow(opening, context);
        case TYPES.WALK_DOOR_SOLID:
            return createWalkDoor(opening, context, false);
        case TYPES.WALK_DOOR_SOLID_DOUBLE:
            return createWalkDoor(opening, context, true);
        case TYPES.OVERHEAD_PANEL_DOOR:
            return createOverheadPanelDoor(opening, context);
        case TYPES.BI_FOLD_DOOR:
            return createBiFoldDoor(opening, context);
        case TYPES.HYDRAULIC_DOOR:
            return createHydraulicDoor(opening, context);
        default:
            return createWindow(opening, context);
    }
}

function orientOpening(object, opening) {
    object.position.set(opening.anchor.x, opening.anchor.y, opening.anchor.z);

    switch (opening.side) {
        case 'B':
            object.rotation.y = Math.PI;
            break;
        case 'L':
            object.rotation.y = -Math.PI / 2;
            break;
        case 'R':
            object.rotation.y = Math.PI / 2;
            break;
        default:
            object.rotation.y = 0;
    }
}

function createObject(context) {
    assertContext(context);
    const root = new THREE.Group();
    root.name = 'openings';

    for (const opening of context.geometry.openings) {
        const object = createOpening(opening, context);
        orientOpening(object, opening);

        object.userData.element = 'opening';
        object.userData.openingId = opening.id;
        object.userData.openingType = opening.type;
        object.userData.side = opening.side;
        object.userData.geometry = opening;

        root.add(object);
    }

    return root;
}

function disposeObject(object) {
    if (!object) return;

    object.traverse((child) => {
        if (!child.isMesh) return;
        if (child.geometry) {
            child.geometry.dispose();
            child.geometry = null;
        }
    });

    const children = object.children.slice();
    for (let i = 0; i < children.length; i++) {
        object.remove(children[i]);
    }

    object.removeFromParent();
}

export const OpeningOrchestrator = Object.freeze({
    id: 'openings',
    create(context) {
        return createObject(context);
    },
    update(object, context) {
        if (!object) return createObject(context);
        disposeObject(object);
        return createObject(context);
    },
    dispose(object) {
        disposeObject(object);
    }
});