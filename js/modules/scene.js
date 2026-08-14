import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { grassMeshMat, skyMats } from './materials.js';
import { referenceModels, hitboxes, dragPlanesMap, openingsData, isMetric, placedModels } from './state.js';
import { updateBuilding, updateBuildingAlphaMaps } from './builder.js';
import { populateOpeningsUI } from './ui.js';

export const scene = new THREE.Scene();
export const mainGroup = new THREE.Group();
export let camera, renderer, controls;
export let grassMesh, skyMesh, grid;

// НАСТРОЙКА АВТОВРАЩЕНИЯ КАМЕРЫ (СКОРОСТЬ В ПЕРЕМЕННОЙ)
export const autoRotateSpeed = 0.3; 
let isUserInteracting = false; 

const savedOutsidePos = new THREE.Vector3();
const savedOutsideTarget = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const planeGrid = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); 
const intersection = new THREE.Vector3();

let draggedModel = null;      
let draggedOpening = null;    
let currentDragPlane = null;  
let dragInverseMatrix = null; 

let startClickPos = { x: 0, y: 0 };
let currentSelectedOpening = null;

export function initScene(container) {
    scene.background = new THREE.Color(0xf0f4f8);
    scene.fog = new THREE.Fog(0xf0f4f8, 150, 800);
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 5000);
    camera.position.set(90, 60, 90);

    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        preserveDrawingBuffer: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true;
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.zoomSpeed = 0.75;
    controls.maxDistance = 450; 
    controls.minDistance = 0; 

    // Настройка автоматического вращения через встроенный функционал OrbitControls
    controls.autoRotate = true;
    controls.autoRotateSpeed = autoRotateSpeed;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.01); 
    scene.add(ambientLight);   

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.castShadow = true;
    sun.shadow.bias = -0.001; 
    sun.shadow.normalBias = 0.02; 
    
    sun.shadow.camera.top = 250;
    sun.shadow.camera.bottom = -250;
    sun.shadow.camera.left = -250;
    sun.shadow.camera.right = 250;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 1000;
    sun.shadow.camera.far = 1000;
    sun.shadow.mapSize.width = 2048; 
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // ДИНАМИЧЕСКОЕ ОСВЕЩЕНИЕ И СВЕТ НЕБА ПО ВРЕМЕНИ СУТОК ПОЛЬЗОВАТЕЛЯ
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 11) {
        // УТРО
        sun.position.set(-180, 150, 100);
        sun.intensity = 0.7;
        scene.fog.color.setHex(0xfff1e6);
        renderer.setClearColor(0xfff1e6);
    } else if (currentHour >= 11 && currentHour < 17) {
        // ДЕНЬ
        sun.position.set(200, 350, 150);
        sun.intensity = 0.9;
        scene.fog.color.setHex(0xf0f4f8);
        renderer.setClearColor(0xf0f4f8);
    } else if (currentHour >= 17 && currentHour < 21) {
        // ЗАКАТ
        sun.position.set(180, 60, -150);
        sun.intensity = 0.5;
        sun.color.setHex(0xffaa66);
        scene.fog.color.setHex(0x3d354e);
        renderer.setClearColor(0x3d354e);
    } else {
        // НОЧЬ
        sun.position.set(50, 200, -50);
        sun.intensity = 0.15;
        sun.color.setHex(0x8899ff);
        scene.fog.color.setHex(0x0a0f1d);
        renderer.setClearColor(0x0a0f1d);
    }

    createHillyTerrain();

    skyMesh = new THREE.Mesh(new THREE.BoxGeometry(3500, 3500, 3500), skyMats);
    scene.add(skyMesh);
    scene.add(mainGroup);

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    setupViewInsideToggle();
    setupUnifiedDragAndDrop(container);
    setupPopupHandlers();
    setupQuoteModalTrigger();

    return { scene, camera, renderer, controls, mainGroup };
}

function createHillyTerrain() {
    const worldSize = 3000; 
    const segments = 128; 
    
    const terrainGeo = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments);
    const position = terrainGeo.attributes.position;
    
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const distFromCenter = Math.sqrt(x * x + y * y);
        
        if (distFromCenter > 90) { 
            const factor = Math.min(1.0, (distFromCenter - 90) / 150);
            const z = (Math.sin(x * 0.012) * Math.cos(y * 0.012) * 12.0 + Math.sin(x * 0.003) * 18.0) * factor;
            position.setZ(i, z);
        } else {
            position.setZ(i, 0); 
        }
    }
    
    terrainGeo.computeVertexNormals();
    
    grassMesh = new THREE.Mesh(terrainGeo, grassMeshMat);
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.y = -0.42;
    grassMesh.receiveShadow = true; 
    scene.add(grassMesh);
}

function setupViewInsideToggle() {
    const viewInsideToggle = document.getElementById('viewInsideToggle');
    if (viewInsideToggle) {
        viewInsideToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                savedOutsidePos.copy(camera.position);
                savedOutsideTarget.copy(controls.target);

                const inputW = document.getElementById('inputW');
                const inputL = document.getElementById('inputL');
                const W = inputW ? parseFloat(inputW.getAttribute('data-current-m')) : 30;
                const L = inputL ? parseFloat(inputL.getAttribute('data-current-m')) : 45;

                camera.position.set(0, 1.8, Math.min(10, L / 4));
                controls.target.set(0, 1.8, 0);

                controls.maxDistance = Math.max(W, L) * 2;
                controls.minDistance = 0;
                controls.maxPolarAngle = Math.PI - 0.01;
                controls.autoRotate = false; // Выключаем автовращение внутри здания
            } else {
                camera.position.copy(savedOutsidePos);
                controls.target.copy(savedOutsideTarget);

                controls.maxDistance = 450; 
                controls.minDistance = 0;
                controls.maxPolarAngle = Math.PI / 2 - 0.05;
                if (!isUserInteracting) controls.autoRotate = true; // Возвращаем автовращение, если не было клика
            }
            controls.update();
        });
    }
}

function setupUnifiedDragAndDrop(container) {
    const disableAutoRotationOnInteraction = () => {
        isUserInteracting = true;
        controls.autoRotate = false; // Навсегда глушим автовращение, если пользователь сам двигает сцену
    };

    container.addEventListener('pointerdown', (e) => {
        disableAutoRotationOnInteraction();

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        startClickPos.x = e.clientX;
        startClickPos.y = e.clientY;

        raycaster.setFromCamera(mouse, camera);
        
        const openingIntersects = raycaster.intersectObjects(hitboxes);
        if (openingIntersects.length > 0) {
            const hitMesh = openingIntersects[0].object;
            if (hitMesh.userData && hitMesh.userData.isOpening) {
                draggedOpening = hitMesh.userData;
                const side = draggedOpening.side;
                
                if (dragPlanesMap[side]) {
                    currentDragPlane = dragPlanesMap[side].mathPlane;
                    dragInverseMatrix = dragPlanesMap[side].inverseMatrix;
                    controls.enabled = false; 
                    return;
                }
            }
        }

        const modelIntersects = raycaster.intersectObjects(referenceModels, true);
        if (modelIntersects.length > 0) {
            let obj = modelIntersects[0].object;
            while (obj.parent && !referenceModels.includes(obj)) {
                obj = obj.parent;
            }
            
            if (referenceModels.includes(obj)) {
                draggedModel = obj;
                controls.enabled = false; 
            }
        }
    });

    container.addEventListener('pointermove', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        
        if (draggedOpening && currentDragPlane && dragInverseMatrix) {
            if (raycaster.ray.intersectPlane(currentDragPlane, intersection)) {
                const localPoint = intersection.clone().applyMatrix4(dragInverseMatrix);
                
                const maxWallX = draggedOpening.wallLength / 2;
                const minWallX = -draggedOpening.wallLength / 2;
                const halfOpW = (draggedOpening.opData.w || 1.0) / 2;
                const opH = draggedOpening.opData.h || 1.0;

                let targetX = localPoint.z; 
                targetX = Math.max(minWallX + halfOpW, Math.min(maxWallX - halfOpW, targetX));
                
                const inputH = document.getElementById('inputH');
                const maxBuildingH = inputH ? parseFloat(inputH.getAttribute('data-current-m')) : 4.88;
                
                let targetY = localPoint.y - opH / 2;
                targetY = Math.max(0, Math.min(maxBuildingH - opH - 0.1, targetY));
                
                if (draggedOpening.opData.type.indexOf('Door') !== -1 && draggedOpening.opData.type !== 'Window' && targetY < 0.3) {
                    targetY = 0;
                }

                draggedOpening.opData.x = targetX;
                draggedOpening.opData.yOff = targetY; 

                draggedOpening.meshGroup.position.z = targetX;
                draggedOpening.meshGroup.position.y = targetY + opH / 2;

                updateBuildingAlphaMaps(draggedOpening.side);
            }
            return;
        }

        if (draggedModel) {
            if (raycaster.ray.intersectPlane(planeGrid, intersection)) {
                draggedModel.position.x = intersection.x;
                draggedModel.position.z = intersection.z;
            }
        }
    });

    container.addEventListener('pointerup', (e) => {
        const dx = Math.abs(e.clientX - startClickPos.x);
        const dy = Math.abs(e.clientY - startClickPos.y);

        if (draggedOpening && dx < 3 && dy < 3) {
            openOpeningPopup(draggedOpening, e.clientX, e.clientY);
        }

        if (draggedModel && draggedModel.userData && draggedModel.userData.modelType) {
            const type = draggedModel.userData.modelType;
            
            let stateModel = placedModels.find(m => m.type === type);
            if (!stateModel) {
                stateModel = { type: type, x: draggedModel.position.x, z: draggedModel.position.z };
                placedModels.push(stateModel);
            } else {
                stateModel.x = draggedModel.position.x;
                stateModel.z = draggedModel.position.z;
            }
        }

        if (draggedModel || draggedOpening) {
            draggedModel = null;
            draggedOpening = null;
            currentDragPlane = null;
            dragInverseMatrix = null;
            controls.enabled = true; 
            updateBuilding();
        }
    });

    container.addEventListener('pointerleave', () => {
        if (draggedModel && draggedModel.userData && draggedModel.userData.modelType) {
            const type = draggedModel.userData.modelType;
            let stateModel = placedModels.find(m => m.type === type);
            if (stateModel) {
                stateModel.x = draggedModel.position.x;
                stateModel.z = draggedModel.position.z;
            }
        }
        draggedModel = null;
        draggedOpening = null;
        currentDragPlane = null;
        dragInverseMatrix = null;
        controls.enabled = true; 
        updateBuilding();
    });
}

function openOpeningPopup(openingUserData, screenX, screenY) {
    currentSelectedOpening = openingUserData;
    const op = openingUserData.opData;

    const popup = document.getElementById('openingPopup');
    if (!popup) return;

    document.querySelectorAll('.popup-unit').forEach(el => {
        el.innerText = isMetric ? 'm' : 'ft';
    });

    document.getElementById('popupTitle').innerText = `Edit ${op.type}`;

    const wDisp = isMetric ? op.w : op.w * 3.28084;
    const hDisp = isMetric ? op.h : op.h * 3.28084;
    const xDisp = isMetric ? op.x : op.x * 3.28084;
    const yDisp = isMetric ? (op.yOff || 0) : (op.yOff || 0) * 3.28084; 

    document.getElementById('popupOpWidth').value = wDisp.toFixed(1);
    document.getElementById('popupOpHeight').value = hDisp.toFixed(1);
    document.getElementById('popupOpOffset').value = xDisp.toFixed(1);
    document.getElementById('popupOpYOff').value = yDisp.toFixed(1); 

    popup.style.left = `${screenX + 10}px`;
    popup.style.top = `${screenY + 10}px`;
    popup.style.display = 'block';
}

function setupPopupHandlers() {
    const popup = document.getElementById('openingPopup');
    if (!popup) return;

    document.getElementById('btnPopupCancel')?.addEventListener('click', () => {
        popup.style.display = 'none';
        currentSelectedOpening = null;
    });

    document.getElementById('btnPopupDelete')?.addEventListener('click', () => {
        if (!currentSelectedOpening) return;
        const { side, opData } = currentSelectedOpening;
        openingsData[side] = openingsData[side].filter(o => o.id !== opData.id);
        
        popup.style.display = 'none';
        currentSelectedOpening = null;
        
        populateOpeningsUI(updateBuilding);
        updateBuilding();
    });

    document.getElementById('btnPopupUpdate')?.addEventListener('click', () => {
        if (!currentSelectedOpening) return;
        const { side, opData, wallLength } = currentSelectedOpening;

        let wVal = parseFloat(document.getElementById('popupOpWidth').value);
        let hVal = parseFloat(document.getElementById('popupOpHeight').value);
        let xVal = parseFloat(document.getElementById('popupOpOffset').value);
        let yVal = parseFloat(document.getElementById('popupOpYOff').value); 

        if (isNaN(wVal) || wVal < 2) wVal = 2;
        if (wVal > 40) wVal = 40;
        if (isNaN(hVal) || hVal < 2) hVal = 2;
        if (hVal > 40) hVal = 40;
        if (isNaN(xVal)) xVal = 0;
        if (isNaN(yVal) || yVal < 0) yVal = 0;

        const internalW = isMetric ? wVal : wVal * 0.3048;
        const internalH = isMetric ? hVal : hVal * 0.3048;
        let internalX = isMetric ? xVal : xVal * 0.3048;
        let internalY = isMetric ? yVal : yVal * 0.3048; 

        const halfWall = wallLength / 2;
        const halfOp = internalW / 2;
        internalX = Math.max(-halfWall + halfOp, Math.min(halfWall - halfOp, internalX));

        const inputH = document.getElementById('inputH');
        const maxBuildingH = inputH ? parseFloat(inputH.getAttribute('data-current-m')) : 4.88;
        internalY = Math.max(0, Math.min(maxBuildingH - internalH - 0.1, internalY));

        opData.w = internalW;
        opData.h = internalH;
        opData.x = internalX;
        opData.yOff = internalY; 

        popup.style.display = 'none';
        currentSelectedOpening = null;

        populateOpeningsUI(updateBuilding);
        updateBuilding();
    });

    window.addEventListener('pointerdown', (e) => {
        if (popup.style.display === 'block' && !popup.contains(e.target) && !e.target.classList.contains('form-check-input')) {
            if (draggedOpening) return;
            popup.style.display = 'none';
            currentSelectedOpening = null;
        }
    });
}

// ГЕНЕРАЦИЯ И СИНХРОНИЗАЦИЯ СНИМКА JPEG ПРИ ОТКРЫТИИ МОДАЛКИ QUOTE
function setupQuoteModalTrigger() {
    const triggerBtn = document.getElementById('btn-trigger-quote-modal');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', () => {
            const thumbImg = document.getElementById('summary-building-thumb');
            const fallbackIcon = document.getElementById('summary-building-fallback');

            if (renderer && scene && camera && thumbImg && fallbackIcon) {
                renderer.render(scene, camera);
                const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.85);
                
                thumbImg.src = dataURL;
                thumbImg.style.display = 'block';
                fallbackIcon.style.display = 'none';
            }
        });
    }
}

export function applyCameraConstraints() {
    if (!camera || !controls) return;

    const inputW = document.getElementById('inputW');
    const inputL = document.getElementById('inputL');
    const inputH = document.getElementById('inputH');
    const inputPitch = document.getElementById('inputPitch');
    const viewInsideToggle = document.getElementById('viewInsideToggle');

    if (!inputW || !inputL || !inputH || !inputPitch) return;

    const W = parseFloat(inputW.getAttribute('data-current-m'));
    const L = parseFloat(inputL.getAttribute('data-current-m'));
    const H = parseFloat(inputH.getAttribute('data-current-m'));
    const Slope = parseFloat(inputPitch.value); 
    const isInside = viewInsideToggle && viewInsideToggle.checked;

    if (isInside) {
        const margin = 0.2; 
        const minX = -W / 2 + margin, maxX = W / 2 - margin;
        const minZ = -L / 2 + margin, maxZ = L / 2 - margin;
        const minY = 0.2, maxY = H + (W / 2) * Slope;

        camera.position.x = Math.max(minX, Math.min(maxX, camera.position.x));
        camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
        camera.position.y = Math.max(minY, Math.min(maxY, camera.position.y));
    }
}

export function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    applyCameraConstraints();

    const animToggle = document.getElementById('cloudsAnimToggle');
    if (animToggle && animToggle.checked && skyMesh) {
        skyMesh.rotation.y += 0.0005;
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}