// js/elements/wall/WallOrchestrator.js
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

function getWallMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get('wallMetal', context.colors?.wall);
    }
    return context.materials.wallMetal || context.materials.wall;
}

function createWallMeshWithHoles(wallData, openings, wallKey, material, envelope) {
    const shape = new THREE.Shape();
    const sideCode = SIDE_MAP[wallKey];
    const isEndWall = sideCode === 'F' || sideCode === 'B';
    const halfSpan = (isEndWall ? envelope.width : envelope.length) / 2;

    wallData.shapePoints.forEach((p, idx) => {
        if (idx === 0) shape.moveTo(p.x, p.y);
        else shape.lineTo(p.x, p.y);
    });

    const relevantOpenings = openings.filter(op => op.side === sideCode);

    relevantOpenings.forEach(op => {
        const opX = op.x;
        const opW = op.dimensions.width;
        const opH = op.dimensions.height;
        const opY = op.bounds.min.y;

        let holeMinX, holeMaxX;

        if (isEndWall) {
            holeMinX = opX - opW / 2;
            holeMaxX = opX + opW / 2;
        } else {
            // Для боковых стен (L/R) начало Shape в x=0 (Z=0)
            holeMinX = opX - opW / 2;
            holeMaxX = opX + opW / 2;
        }

        const holePath = new THREE.Path();
        holePath.moveTo(holeMinX, opY);
        holePath.lineTo(holeMaxX, opY);
        holePath.lineTo(holeMaxX, opY + opH);
        holePath.lineTo(holeMinX, opY + opH);
        holePath.closePath();
        shape.holes.push(holePath);
    });

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: wallData.thickness,
        bevelEnabled: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `wall-mesh-${sideCode}`;

    if (sideCode === 'F') {
        mesh.position.set(0, 0, -wallData.thickness);
    } else if (sideCode === 'B') {
        mesh.position.set(0, 0, envelope.length);
    } else if (sideCode === 'L') {
        mesh.position.set(-envelope.width / 2, 0, 0);
        mesh.rotation.y = Math.PI / 2;
    } else if (sideCode === 'R') {
        mesh.position.set(envelope.width / 2 + wallData.thickness, 0, 0);
        mesh.rotation.y = Math.PI / 2;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createObject(context) {
    assertContext(context);

    const root = new THREE.Group();
    root.name = 'walls';

    if (context.model?.visibility?.walls === false) {
        return root;
    }

    const material = getWallMaterial(context);
    const openings = context.geometry.openings || [];
    const envelope = context.geometry.envelope;

    for (const [wallKey, wallData] of Object.entries(context.geometry.walls)) {
        if (wallData && wallData.shapePoints) {
            root.add(createWallMeshWithHoles(wallData, openings, wallKey, material, envelope));
        }
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

export const WallOrchestrator = Object.freeze({
    id: 'walls',
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