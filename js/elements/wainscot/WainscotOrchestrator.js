// js/elements/wainscot/WainscotOrchestrator.js
import * as THREE from 'three';

const SIDE_MAP = Object.freeze({
    front: 'F',
    back: 'B',
    left: 'L',
    right: 'R'
});

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.geometry?.walls) {
        throw new TypeError('Wall geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get('wallMetal', context.colors?.wainscot);
    }
    return context.materials.wallMetal;
}

function createWainscotMesh(wallKey, wsHeight, openings, material, envelope, wallThickness) {
    const sideCode = SIDE_MAP[wallKey];
    const isEndWall = sideCode === 'F' || sideCode === 'B';
    const span = isEndWall ? envelope.width : envelope.length;
    const halfSpan = span / 2;

    const shape = new THREE.Shape();
    if (isEndWall) {
        shape.moveTo(-halfSpan, 0);
        shape.lineTo(halfSpan, 0);
        shape.lineTo(halfSpan, wsHeight);
        shape.lineTo(-halfSpan, wsHeight);
        shape.closePath();
    } else {
        shape.moveTo(0, 0);
        shape.lineTo(span, 0);
        shape.lineTo(span, wsHeight);
        shape.lineTo(0, wsHeight);
        shape.closePath();
    }

    // Двери и проёмы, пересекающие цоколь снизу (yOff < wsHeight)
    const relevantOpenings = openings.filter(op => op.side === sideCode && op.bounds.min.y < wsHeight);

    relevantOpenings.forEach(op => {
        const opX = op.x;
        const opW = op.dimensions.width;
        const opH = Math.min(wsHeight, op.dimensions.height);
        const opY = op.bounds.min.y;

        const holeMinX = opX - opW / 2;
        const holeMaxX = opX + opW / 2;

        const holePath = new THREE.Path();
        holePath.moveTo(holeMinX, opY);
        holePath.lineTo(holeMaxX, opY);
        holePath.lineTo(holeMaxX, opY + opH);
        holePath.lineTo(holeMinX, opY + opH);
        holePath.closePath();
        shape.holes.push(holePath);
    });

    const wsThickness = wallThickness + 0.005;
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: wsThickness,
        bevelEnabled: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `wainscot-mesh-${sideCode}`;

    if (sideCode === 'F') {
        mesh.position.set(0, 0, -wsThickness);
    } else if (sideCode === 'B') {
        mesh.position.set(0, 0, envelope.length);
    } else if (sideCode === 'L') {
        mesh.position.set(-envelope.width / 2, 0, 0);
        mesh.rotation.y = Math.PI / 2;
    } else if (sideCode === 'R') {
        mesh.position.set(envelope.width / 2 + wsThickness, 0, 0);
        mesh.rotation.y = Math.PI / 2;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createObject(context) {
    assertContext(context);
    const root = new THREE.Group();
    root.name = 'wainscot';

    const wsHeight = context.model?.panels?.wainscotHeight || 0;
    if (wsHeight <= 0 || context.model?.visibility?.wainscot === false) {
        return root;
    }

    const material = resolveMaterial(context);
    const openings = context.geometry.openings || [];
    const envelope = context.geometry.envelope;
    const wallThickness = context.model.walls.thickness;

    for (const wallKey of ['front', 'back', 'left', 'right']) {
        root.add(createWainscotMesh(wallKey, wsHeight, openings, material, envelope, wallThickness));
    }

    return root;
}

function disposeObject(object) {
    if (!object) return;
    object.traverse(child => {
        if (child.isMesh) {
            child.geometry?.dispose();
        }
    });
    while (object.children.length > 0) {
        object.remove(object.children[0]);
    }
    object.removeFromParent();
}

export const WainscotOrchestrator = Object.freeze({
    id: 'wainscot',
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