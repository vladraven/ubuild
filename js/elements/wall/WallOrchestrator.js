import * as THREE from 'three';
import {
    getPanelNormalMapForUse,
    applyPhysicalPanelUVs
} from '../../panels/PanelProfiles.js';

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
    const profileId = context.model?.panels?.profile || 'awr';
    const normalMap = getPanelNormalMapForUse(
        profileId,
        'wall',
        Math.max(1, context.model?.dimensions?.length || 10),
        Math.max(1, context.model?.dimensions?.height || 5)
    );

    if (typeof context.materials.get === 'function') {
        const mat = context.materials.get('wallMetal', context.colors?.wall, {
            normalMap
        });
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
        return mat;
    }

    return context.materials.wallMetal || context.materials.wall;
}

/**
 * Build extruded wall mesh.
 * Corner strategy: front/back span full width; left/right span full length and
 * overlap the front/back thickness so outer faces meet without a visible gap.
 */
function createWallMeshWithHoles(
    wallData,
    openings,
    wallKey,
    material,
    envelope,
    profileId
) {
    const shape = new THREE.Shape();
    const sideCode = SIDE_MAP[wallKey];
    const t = wallData.thickness;
    // Small overlap so adjacent walls share a solid corner volume
    const overlap = Math.max(0.001, t * 0.5);

    let points = wallData.shapePoints;
    if (sideCode === 'L' || sideCode === 'R') {
        // Extend along building length past front/back faces
        points = [
            { x: -overlap, y: points[0].y },
            { x: envelope.length + overlap, y: points[1].y },
            { x: envelope.length + overlap, y: points[2].y },
            { x: -overlap, y: points[3].y }
        ];
    } else if (sideCode === 'F' || sideCode === 'B') {
        // Extend past side faces so corner is closed from both directions
        const halfW = envelope.width / 2;
        // shapePoints for F/B use x as width axis
        const ys = points.map((p) => p.y);
        // Keep original Y profile (gabled peak etc.) but expand min/max X slightly
        points = points.map((p) => {
            if (p.x <= 0) return { x: -halfW - overlap, y: p.y };
            if (p.x > 0 && Math.abs(p.x) < 1e-6) return p;
            // peak at x=0 stays; extremes push outward
            if (Math.abs(p.x - halfW) < 1e-6 || p.x >= halfW - 1e-6) {
                return { x: halfW + overlap, y: p.y };
            }
            if (Math.abs(p.x + halfW) < 1e-6 || p.x <= -halfW + 1e-6) {
                return { x: -halfW - overlap, y: p.y };
            }
            return p;
        });
        // Simpler reliable expansion for rectangle-like and gable shapes:
        points = wallData.shapePoints.map((p) => {
            let x = p.x;
            if (x <= -halfW + 1e-6) x = -halfW - overlap;
            else if (x >= halfW - 1e-6) x = halfW + overlap;
            return { x, y: p.y };
        });
        void ys;
    }

    points.forEach((p, idx) => {
        if (idx === 0) shape.moveTo(p.x, p.y);
        else shape.lineTo(p.x, p.y);
    });
    shape.closePath();

    openings
        .filter((op) => op.side === sideCode)
        .forEach((op) => {
            const opW = op.dimensions.width;
            const opH = op.dimensions.height;
            const opY = op.bounds.min.y;

            let holeCenterX;
            if (sideCode === 'F' || sideCode === 'B') holeCenterX = op.x;
            else if (sideCode === 'L') holeCenterX = op.x;
            else holeCenterX = envelope.length - op.x;

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

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: t,
        bevelEnabled: false
    });

    applyPhysicalPanelUVs(
        geometry,
        envelope.width,
        wallData.height ?? envelope.height,
        profileId
    );

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `wall-mesh-${sideCode}`;

    // Place so OUTER face sits on the building envelope outer plane
    if (sideCode === 'F') {
        mesh.position.set(0, 0, 0);
    } else if (sideCode === 'B') {
        mesh.position.set(0, 0, envelope.length - t);
    } else if (sideCode === 'L') {
        // After Y=-90°, local +Z maps to world -X; outer face at x = -width/2
        mesh.position.set(-envelope.width / 2 + t, 0, 0);
        mesh.rotation.y = -Math.PI / 2;
    } else if (sideCode === 'R') {
        // After Y=+90°, outer face at x = +width/2
        mesh.position.set(envelope.width / 2 - t, 0, envelope.length);
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

    const profileId = context.model?.panels?.profile || 'awr';
    const material = getWallMaterial(context);
    const openings = context.geometry.openings || [];
    const envelope = context.geometry.envelope;

    for (const [wallKey, wallData] of Object.entries(context.geometry.walls)) {
        if (wallData?.shapePoints) {
            root.add(
                createWallMeshWithHoles(
                    wallData,
                    openings,
                    wallKey,
                    material,
                    envelope,
                    profileId
                )
            );
        }
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
