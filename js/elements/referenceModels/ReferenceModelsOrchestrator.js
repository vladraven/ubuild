// js/elements/referenceModels/ReferenceModelsOrchestrator.js
import * as THREE from 'three';

const MODEL_TARGET_SIZES = Object.freeze({
    'ergoninane-fast-74.glb': { length: 4.8 },
    'forza1903-low-poly-2490.glb': { height: 2.2 },
    'plane.glb': { maxDim: 11.0 },
    'scania.glb': { height: 3.8 }
});

export function createReferenceModelsOrchestrator() {
    const group = new THREE.Group();
    group.name = 'reference-models';

    const loadedModels = new Map();
    let nextSpawnOffset = 0;

    function adjustModelScaleAndPosition(model, fileName, buildingBounds) {
        model.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(model);
        const rawSize = new THREE.Vector3();
        bbox.getSize(rawSize);

        let scaleFactor = 1.0;
        const targetSpec = MODEL_TARGET_SIZES[fileName];

        if (targetSpec) {
            if (targetSpec.length && rawSize.z > 0) {
                scaleFactor = targetSpec.length / Math.max(rawSize.x, rawSize.z);
            } else if (targetSpec.height && rawSize.y > 0) {
                scaleFactor = targetSpec.height / rawSize.y;
            } else if (targetSpec.maxDim) {
                const maxD = Math.max(rawSize.x, rawSize.y, rawSize.z);
                if (maxD > 0) scaleFactor = targetSpec.maxDim / maxD;
            }
        }

        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        model.updateMatrixWorld(true);
        bbox.setFromObject(model);

        const spawnZ = (buildingBounds?.max?.z || 15) + (rawSize.z * scaleFactor) / 2 + 2.0;
        const spawnX = -10.0 + nextSpawnOffset;

        model.position.set(spawnX, -bbox.min.y, spawnZ);
        nextSpawnOffset += Math.max(rawSize.x * scaleFactor, 4.0) + 2.0;

        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    function toggleModel(fileName, enabled, gltfLoader, themeUri, buildingBounds, onLoaded) {
        if (!enabled) {
            const existing = loadedModels.get(fileName);
            if (existing) {
                group.remove(existing);
            }
            return;
        }

        if (loadedModels.has(fileName)) {
            group.add(loadedModels.get(fileName));
            if (typeof onLoaded === 'function') onLoaded();
            return;
        }

        if (!gltfLoader) return;

        const path = `${themeUri}/3d-models/${fileName}`;
        gltfLoader.load(
            path,
            (gltf) => {
                const model = gltf.scene;
                adjustModelScaleAndPosition(model, fileName, buildingBounds);
                loadedModels.set(fileName, model);
                group.add(model);
                if (typeof onLoaded === 'function') onLoaded();
            },
            undefined,
            (err) => {
                console.error(`Error loading reference model: ${fileName}`, err);
            }
        );
    }

    function dispose() {
        loadedModels.forEach(model => {
            model.traverse(child => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material?.dispose();
                    }
                }
            });
        });
        loadedModels.clear();
        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        id: 'referenceModels',
        group,
        toggleModel,
        dispose
    });
}