import * as THREE from 'three';
import { raycaster, mouse, camera, controls, renderer, planeGrid, intersection, openOpeningPopup } from './scene.js';
import { 
    hitboxes, referenceModels, dragPlanesMap, placedModels 
} from './state.js';
import { updateBuilding, updateBuildingAlphaMaps } from './builder.js';

let draggedModel = null;      
let draggedOpening = null;    
let currentDragPlane = null;  
let dragInverseMatrix = null; 
let startClickPos = { x: 0, y: 0 };

export function setupUnifiedDragAndDrop(container) {
    const disableAutoRotationOnInteraction = () => {
        window.isUserInteracting = true;
        controls.autoRotate = false; 
    };

    // Подписка всех чекбоксов моделей и элементов на мгновенную перерисовку сцены
    document.querySelectorAll('.ref-model-checkbox, .form-check-input').forEach(input => {
        input.addEventListener('change', () => {
            updateBuilding();
        });
    });

    container.addEventListener('pointerdown', (e) => {
        disableAutoRotationOnInteraction();
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        startClickPos.x = e.clientX; startClickPos.y = e.clientY;

        raycaster.setFromCamera(mouse, camera);
        const openingIntersects = raycaster.intersectObjects(hitboxes);
        if (openingIntersects.length > 0) {
            const hitMesh = openingIntersects[0].object;
            if (hitMesh.userData?.isOpening) {
                draggedOpening = hitMesh.userData;
                const side = draggedOpening.side;
                if (dragPlanesMap[side]) {
                    currentDragPlane = dragPlanesMap[side].mathPlane;
                    dragInverseMatrix = dragPlanesMap[side].inverseMatrix;
                    controls.enabled = false; return;
                }
            }
        }

        const modelIntersects = raycaster.intersectObjects(referenceModels, true);
        if (modelIntersects.length > 0) {
            let obj = modelIntersects[0].object;
            while (obj.parent && !referenceModels.includes(obj)) obj = obj.parent;
            if (referenceModels.includes(obj)) { draggedModel = obj; controls.enabled = false; }
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
                const maxWallX = draggedOpening.wallLength / 2, minWallX = -draggedOpening.wallLength / 2;
                const halfOpW = (draggedOpening.opData.w || 1.0) / 2, opH = draggedOpening.opData.h || 1.0;
                
                let targetX = Math.max(minWallX + halfOpW, Math.min(maxWallX - halfOpW, localPoint.z));
                let targetY = 0;
                
                // ЖЕСТКАЯ ПРОВЕРКА: Изменение Y позволено только окнам ("Window"). Все типы дверей принудительно заземлены в 0.
                if (draggedOpening.opData.type === 'Window') {
                    targetY = Math.max(0, Math.min(parseFloat(document.getElementById('inputH')?.getAttribute('data-current-m') || 4.88) - opH - 0.1, localPoint.y - opH / 2));
                } else {
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

        if (draggedModel && raycaster.ray.intersectPlane(planeGrid, intersection)) {
            draggedModel.position.x = intersection.x; draggedModel.position.z = intersection.z;
        }
    });

    container.addEventListener('pointerup', (e) => {
        const dx = Math.abs(e.clientX - startClickPos.x), dy = Math.abs(e.clientY - startClickPos.y);
        if (draggedOpening && dx < 3 && dy < 3) openOpeningPopup(draggedOpening, e.clientX, e.clientY);
        if (draggedModel?.userData?.modelType) {
            const type = draggedModel.userData.modelType;
            let stateModel = placedModels.find(m => m.type === type);
            if (!stateModel) {
                stateModel = { type, x: draggedModel.position.x, z: draggedModel.position.z };
                placedModels.push(stateModel);
            } else {
                stateModel.x = draggedModel.position.x; stateModel.z = draggedModel.position.z;
            }
        }
        if (draggedModel || draggedOpening) {
            draggedModel = null; draggedOpening = null; currentDragPlane = null; dragInverseMatrix = null;
            controls.enabled = true; updateBuilding();
        }
    });
}