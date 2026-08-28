import * as THREE from 'three';
import { getPanelNormalMapForUse } from '../../panels/PanelProfiles.js';

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
    const profileId = context.model?.panels?.profile || 'awr';
    const normalMap = getPanelNormalMapForUse(profileId, 'wainscot', 10, 3);

    if (typeof context.materials.get === 'function') {
        const mat = context.materials.get(
            'wainscotMetal',
            context.colors?.wainscot,
            { normalMap }
        );
        mat.side = THREE.FrontSide;
        mat.needsUpdate = true;
        return mat;
    }
    return context.materials.wainscotMetal || context.materials.wallMetal;
}

function createWainscotMesh(
    wallKey,
    wsHeight,
    openings,
    material,
    envelope,
    wallThickness
) {
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

    const relevantOpenings = openings.filter(
        (op) => op.side === sideCode && op.bounds.min.y < wsHeight
    );

    relevantOpenings.forEach((op) => {
        const opW = op.dimensions.width;
        const opH = Math.min(wsHeight, op.dimensions.height);
        const opY = op.bounds.min.y;

        let holeCenterX;
        if (sideCode === 'F' || sideCode === 'B') {
            holeCenterX = op.x;
        } else if (sideCode === 'L') {
            holeCenterX = op.x;
        } else {
            holeCenterX = envelope.length - op.x;
        }

        const holeMinX = holeCenterX - opW / 2;
        const holeMaxX = holeCenterX + opW / 2;

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

    const offset = 0.003;
    if (sideCode === 'F') {
        mesh.position.set(0, 0, -offset);
        mesh.rotation.set(0, 0, 0);
    } else if (sideCode === 'B') {
        mesh.position.set(0, 0, envelope.length - wsThickness + offset);
        mesh.rotation.set(0, 0, 0);
    } else if (sideCode === 'L') {
        mesh.position.set(-envelope.width / 2 + wsThickness - offset, 0, 0);
        mesh.rotation.set(0, -Math.PI / 2, 0);
    } else if (sideCode === 'R') {
        mesh.position.set(
            envelope.width / 2 - wsThickness + offset,
            0,
            envelope.length
        );
        mesh.rotation.set(0, Math.PI / 2, 0);
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
        root.add(
            createWainscotMesh(
                wallKey,
                wsHeight,
                openings,
                material,
                envelope,
                wallThickness
            )
        );
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