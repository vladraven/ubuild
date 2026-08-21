import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.foundation) {
        throw new TypeError('Foundation geometry is required');
    }

    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get(
            'concrete',
            context.colors?.concrete || '#B8B8B8'
        );
    }

    if (context.materials.concrete) {
        return context.materials.concrete;
    }

    throw new Error('Concrete material is required');
}

/**
 * Canvas-based side labels (Front / Back / Left / Right).
 * Restored from legacy/js/foundation.js createTextLabel().
 */
function createTextLabel(txt) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(30,40,50,0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 124);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 256, 64);

    const texture = new THREE.CanvasTexture(c);
    // Three r0.136 compatibility
    if ('colorSpace' in texture && THREE.SRGBColorSpace !== undefined) {
        texture.colorSpace = THREE.SRGBColorSpace;
    } else if ('encoding' in texture && THREE.sRGBEncoding !== undefined) {
        texture.encoding = THREE.sRGBEncoding;
    }
    texture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 2.5),
        material
    );
    mesh.name = `label-${txt}`;
    return mesh;
}

function createLabels(context) {
    const foundation = context.geometry.foundation;
    const showLabels = context.model?.visibility?.labels !== false;
    const labelsData = foundation.labels;

    if (!showLabels || !labelsData) {
        return null;
    }

    const group = new THREE.Group();
    group.name = 'foundation-labels';

    for (const key of ['F', 'B', 'R', 'L']) {
        const data = labelsData[key];
        if (!data) continue;

        const mesh = createTextLabel(data.text || key);
        mesh.position.set(
            Number(data.x) || 0,
            Number(data.y) || 0,
            Number(data.z) || 0
        );

        const rot = data.rotation;
        if (Array.isArray(rot) && rot.length >= 3) {
            mesh.rotation.set(rot[0], rot[1], rot[2]);
        } else if (rot && typeof rot === 'object') {
            mesh.rotation.set(
                Number(rot.x) || 0,
                Number(rot.y) || 0,
                Number(rot.z) || 0
            );
        }

        group.add(mesh);
    }

    return group;
}

function createFoundationMesh(context) {
    const foundation = context.geometry.foundation;

    if (!foundation.enabled) {
        return null;
    }

    const bounds = foundation.bounds;
    const material = resolveMaterial(context);

    const geometry = new THREE.BoxGeometry(
        bounds.width,
        bounds.height,
        bounds.length
    );

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'foundation';
    mesh.position.set(
        bounds.center.x,
        bounds.center.y,
        bounds.center.z
    );
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return mesh;
}

function disposeObject(object) {
    if (!object) return;

    object.traverse(child => {
        if (!child.isMesh) return;

        if (child.geometry) {
            child.geometry.dispose();
            child.geometry = null;
        }

        if (child.material) {
            const mats = Array.isArray(child.material)
                ? child.material
                : [child.material];
            for (const mat of mats) {
                if (mat.map) mat.map.dispose();
                mat.dispose();
            }
            child.material = null;
        }
    });

    object.removeFromParent();
}

function createObject(context) {
    assertContext(context);

    const root = new THREE.Group();
    root.name = 'foundation-root';

    // FIX: this never checked visibility.foundation - the slab mesh was
    // created unconditionally, so toggling foundation off in visibility
    // did nothing (only visibility.labels was ever read, for the F/B/L/R
    // text labels).
    const showFoundation = context.model?.visibility?.foundation !== false;
    const foundationMesh = showFoundation ? createFoundationMesh(context) : null;
    if (foundationMesh) {
        root.add(foundationMesh);
    }

    const labels = createLabels(context);
    if (labels) {
        root.add(labels);
    }

    if (root.children.length === 0) {
        return null;
    }

    return root;
}

export const FoundationOrchestrator = Object.freeze({
    id: 'foundation',

    create(context) {
        return createObject(context);
    },

    update(object, context) {
        if (object) {
            disposeObject(object);
        }
        return createObject(context);
    },

    dispose(object) {
        disposeObject(object);
    }
});
