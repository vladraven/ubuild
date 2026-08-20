import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }
    if (!context.structuralGeometry) {
        throw new TypeError('Structural geometry is required');
    }
    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get('structuralSteel', context.colors?.frame);
    }
    return context.materials.structuralSteel || context.materials.steel;
}

function createBeam(lineSeg, material, thickness = 0.12) {
    if (!lineSeg || !lineSeg.start || !lineSeg.end) return null;

    const start = new THREE.Vector3(lineSeg.start.x, lineSeg.start.y, lineSeg.start.z);
    const end = new THREE.Vector3(lineSeg.end.x, lineSeg.end.y, lineSeg.end.z);
    const direction = end.clone().sub(start);
    const length = direction.length();

    if (length <= 0.001) return null;

    const geometry = new THREE.BoxGeometry(thickness, thickness, length);
    const mesh = new THREE.Mesh(geometry, material);

    const center = start.clone().add(end).multiplyScalar(0.5);
    mesh.position.copy(center);
    mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction.normalize()
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createObject(context) {
    assertContext(context);
    const root = new THREE.Group();
    root.name = 'structural';

    const material = resolveMaterial(context);
    const vis = context.model?.visibility || {};

    if (vis.frames !== false && context.structuralGeometry.frames) {
        for (const frame of context.structuralGeometry.frames) {
            const group = new THREE.Group();
            group.name = `frame-${frame.index}`;

            for (const key of ['leftColumn', 'leftRafter', 'rightRafter', 'rightColumn', 'rafter']) {
                if (frame[key]) {
                    const beam = createBeam(frame[key], material, 0.18);
                    if (beam) group.add(beam);
                }
            }
            root.add(group);
        }
    }

    if (vis.girts !== false && context.structuralGeometry.girts) {
        for (const girt of context.structuralGeometry.girts) {
            const sideKeys = ['frontSegments', 'backSegments', 'leftSegments', 'rightSegments'];
            sideKeys.forEach(sideKey => {
                const segs = girt[sideKey] || [];
                segs.forEach(seg => {
                    const beam = createBeam(seg, material, 0.08);
                    if (beam) root.add(beam);
                });
            });
        }
    }

    if (vis.purlins !== false && context.structuralGeometry.purlins) {
        for (const purlin of context.structuralGeometry.purlins) {
            if (purlin.planes) {
                for (const l of Object.values(purlin.planes)) {
                    const beam = createBeam(l, material, 0.08);
                    if (beam) root.add(beam);
                }
            } else if (purlin.plane) {
                const beam = createBeam(purlin.plane, material, 0.08);
                if (beam) root.add(beam);
            }
        }
    }

    if (vis.endWallColumns !== false && context.structuralGeometry.endWallColumns) {
        for (const col of context.structuralGeometry.endWallColumns) {
            const leftCol = createBeam(col.left, material, 0.14);
            const rightCol = createBeam(col.right, material, 0.14);
            if (leftCol) root.add(leftCol);
            if (rightCol) root.add(rightCol);
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

export const StructuralOrchestrator = Object.freeze({
    id: 'structural',
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