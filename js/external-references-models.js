import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const refModelsGroup = new THREE.Group();

const loadedModelsMap = {};
const loader = new GLTFLoader();

let nextSpawnOffsetX = 0;

// Целевые габариты объектов в метрах
const MODEL_TARGET_SIZES = {
    'ergoninane-fast-74.glb': { length: 4.8 },
    'forza1903-low-poly-2490.glb': { height: 2.2 },
    'plane.glb': { maxDim: 11.0 },
    'scania.glb': { height: 3.8 }
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const planeIntersectPoint = new THREE.Vector3();

let selectedModel = null;
let dragOffset = new THREE.Vector3();
let isDragging = false;
let globalRenderer = null;
let globalCamera = null;
let globalControls = null;

function initDragControls(renderer, camera, controls) {
    globalRenderer = renderer;
    globalCamera = camera;
    globalControls = controls;

    const domElement = renderer?.domElement;
    if (!domElement) return;

    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
}

function onPointerDown(event) {
    if (!globalCamera || !refModelsGroup.children.length || !globalRenderer) return;

    const rect = globalRenderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, globalCamera);

    const intersects = raycaster.intersectObjects(refModelsGroup.children, true);

    if (intersects.length > 0) {
        let rootObj = intersects[0].object;
        while (rootObj.parent && rootObj.parent !== refModelsGroup) {
            rootObj = rootObj.parent;
        }

        selectedModel = rootObj;
        isDragging = true;

        if (globalControls) globalControls.enabled = false;

        raycaster.ray.intersectPlane(dragPlane, planeIntersectPoint);
        dragOffset.copy(selectedModel.position).sub(planeIntersectPoint);
    }
}

function onPointerMove(event) {
    if (!isDragging || !selectedModel || !globalRenderer || !globalCamera) return;

    const rect = globalRenderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, globalCamera);

    if (raycaster.ray.intersectPlane(dragPlane, planeIntersectPoint)) {
        selectedModel.position.x = planeIntersectPoint.x + dragOffset.x;
        selectedModel.position.z = planeIntersectPoint.z + dragOffset.z;
    }
}

function onPointerUp() {
    if (isDragging) {
        isDragging = false;
        selectedModel = null;
        if (globalControls) globalControls.enabled = true;
    }
}

export function initExternalModelsUI(renderCallback, scene, renderer, camera, controls) {
    if (scene && !scene.children.includes(refModelsGroup)) {
        scene.add(refModelsGroup);
    }

    const bc = window.ConfiguratorBackendConstraints || {};

    const modelMapping = [
        { id: 'refVehicle', key: 'allow_vehicle' },
        { id: 'refForklift', key: 'allow_forklift' },
        { id: 'refAirplane', key: 'allow_airplane' },
        { id: 'refTruck', key: 'allow_truck' }
    ];

    modelMapping.forEach(item => {
        const checkbox = document.getElementById(item.id);
        if (checkbox) {
            const isAllowed = bc[item.key] !== undefined ? Boolean(bc[item.key]) : true;
            const container = checkbox.closest('.form-check');
            if (container) {
                container.style.display = isAllowed ? 'block' : 'none';
            }
            if (!isAllowed) {
                checkbox.checked = false;
            }
        }
    });

    document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const fileName = e.target.value;
            if (e.target.checked) {
                loadReferenceModel(fileName, renderCallback);
            } else {
                removeReferenceModel(fileName, renderCallback);
            }
        });
    });

    if (renderer && camera && controls) {
        initDragControls(renderer, camera, controls);
    }
}

export function loadReferenceModel(fileName, renderCallback) {
    if (loadedModelsMap[fileName]) {
        refModelsGroup.add(loadedModelsMap[fileName]);
        if (typeof renderCallback === 'function') renderCallback();
        return;
    }

    const themeUri = window.ConfiguratorData?.themeUri || '';
    const modelPath = `${themeUri}/3d-models/${fileName}`;

    loader.load(
        modelPath,
        (gltf) => {
            const model = gltf.scene;

            // Принудительно обновляем матрицы трансформаций для точного измерения исходного Box3
            model.updateMatrixWorld(true);
            let bbox = new THREE.Box3().setFromObject(model);
            const rawSize = new THREE.Vector3();
            bbox.getSize(rawSize);

            let scaleFactor = 1.0;
            const targetSpec = MODEL_TARGET_SIZES[fileName];

            if (targetSpec) {
                if (targetSpec.length) {
                    const currentLength = Math.max(rawSize.x, rawSize.z);
                    if (currentLength > 0) scaleFactor = targetSpec.length / currentLength;
                } else if (targetSpec.height) {
                    if (rawSize.y > 0) scaleFactor = targetSpec.height / rawSize.y;
                } else if (targetSpec.maxDim) {
                    const currentMax = Math.max(rawSize.x, rawSize.y, rawSize.z);
                    if (currentMax > 0) scaleFactor = targetSpec.maxDim / currentMax;
                }
            } else {
                const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
                if (maxDim > 0) scaleFactor = 5.0 / maxDim;
            }

            model.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Пересчитываем мировые координаты после изменения scale
            model.updateMatrixWorld(true);
            bbox.setFromObject(model);

            const size = new THREE.Vector3();
            bbox.getSize(size);

            const inputL = document.getElementById('inputL');
            const buildingL = inputL ? parseFloat(inputL.getAttribute('data-current-m')) || 30.48 : 30.48;

            const spawnZ = buildingL / 2 + size.z / 2 + 3.0;
            const spawnX = -10.0 + nextSpawnOffsetX;

            // Размещаем модель на Y = 0, затем компенсируем смещение по Y до самого нижнего полигона
            model.position.set(spawnX, 0, spawnZ);
            model.updateMatrixWorld(true);
            bbox.setFromObject(model);
            
            // Заземляем нижнюю точку модели ровно на уровень 0 (поверхность земли)
            model.position.y -= bbox.min.y;

            nextSpawnOffsetX += Math.max(size.x, 4.0) + 2.0;

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            loadedModelsMap[fileName] = model;
            refModelsGroup.add(model);

            if (typeof renderCallback === 'function') renderCallback();
        },
        undefined,
        (error) => {
            console.error(`Error loading GLTF model (${fileName}) from ${modelPath}:`, error);
        }
    );
}

export function removeReferenceModel(fileName, renderCallback) {
    const model = loadedModelsMap[fileName];
    if (model) {
        refModelsGroup.remove(model);
        if (typeof renderCallback === 'function') renderCallback();
    }
}

export function clearAllReferenceModels() {
    Object.keys(loadedModelsMap).forEach((fileName) => {
        if (loadedModelsMap[fileName]) {
            refModelsGroup.remove(loadedModelsMap[fileName]);
        }
    });
    nextSpawnOffsetX = 0;
}