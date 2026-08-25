import * as THREE from 'three';
import { state, getFloorBaseY, getGlobalHeight } from './state.js';
import { getWallLength } from './utils.js';
import { camera, scene, renderer, controls } from './scene.js';
import { updateEditorUI, showDistanceOverlay } from './ui.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let dragMesh = null;
let dragOffset = new THREE.Vector3();
let dragPlane = new THREE.Plane();

export function initInteractions() {
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
}

function handleDoubleClick(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const interactables = [];
    scene.traverse(child => { if (child.userData && child.userData.isOpening) interactables.push(child); });
    
    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length > 0) {
        dragMesh = hits[0].object;
        controls.enabled = false;
        dragPlane.setFromNormalAndCoplanarPoint(hits[0].face.normal, hits[0].point);
        dragOffset.copy(hits[0].point).sub(dragMesh.position);
        document.getElementById('canvas-container').style.cursor = 'grabbing';
    }
}

function handlePointerMove(e) {
    if (!dragMesh) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; 
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, point)) {
        const localPos = dragMesh.parent.worldToLocal(point.clone().sub(dragOffset));
        const wallId = dragMesh.userData.wallId;
        const floorId = dragMesh.userData.floorId;
        
        let wallLen = getWallLength(wallId, state.params);
        const minX = -wallLen/2 + dragMesh.userData.w/2 + 0.5; 
        const maxX = wallLen/2 - dragMesh.userData.w/2 - 0.5;
        
        dragMesh.position.x = Math.max(minX, Math.min(maxX, localPos.x));
        
        const distLeft = wallLen/2 + dragMesh.position.x - dragMesh.userData.w/2;
        const distRight = wallLen/2 - dragMesh.position.x - dragMesh.userData.w/2;
        showDistanceOverlay(distLeft, distRight);

        if (!dragMesh.userData.isDoor) {
            const floorBaseY = getFloorBaseY(floorId);
            const floorData = state.params.floors.find(f => f.id === floorId);
            
            let globalMaxY = getGlobalHeight() - dragMesh.userData.h/2 - 0.5;
            let localMaxY = floorBaseY + floorData.height - dragMesh.userData.h/2 - 0.5;
            
            let finalMaxY = Math.min(globalMaxY, localMaxY);

            // Roof collision logic for top floor limits
            if (floorId === state.params.floors.length - 1) {
                if (state.params.modelType === 'm_shaped' && (wallId === 'front' || wallId === 'back')) {
                    const pX = state.params.width / 6; const m = state.params.pitch / 12;
                    if (Math.abs(dragMesh.position.x) >= pX) finalMaxY = getGlobalHeight() + (state.params.width/2 - Math.abs(dragMesh.position.x)) * m - 1.0 - dragMesh.userData.h/2;
                    else finalMaxY = getGlobalHeight() + Math.abs(dragMesh.position.x) * (m*2) - 1.0 - dragMesh.userData.h/2;
                } else if ((state.params.modelType === 'shed' || state.params.modelType === 'skillion_leanto') && (wallId === 'front' || wallId === 'back')) {
                    finalMaxY = getGlobalHeight() + (dragMesh.position.x + state.params.width/2) * (state.params.pitch / 12) - 1.0 - dragMesh.userData.h/2;
                } else if (state.params.modelType === 'jerkinhead' && (wallId === 'front' || wallId === 'back')) {
                    const m = state.params.pitch / 12; const peak = (state.params.width / 2) * m;
                    const actOff = Math.max(0.1, state.params.hipOffset); const cWallX = actOff - 0.5;
                    if (cWallX > 0 && Math.abs(dragMesh.position.x) <= cWallX) finalMaxY = getGlobalHeight() + peak - cWallX * m - 1.0 - dragMesh.userData.h/2;
                    else finalMaxY = getGlobalHeight() + (state.params.width / 2 - Math.abs(dragMesh.position.x)) * m - 1.0 - dragMesh.userData.h/2;
                }
            }

            const minY = floorBaseY + dragMesh.userData.h/2;
            dragMesh.position.y = Math.max(minY, Math.min(finalMaxY, localPos.y));
        }
    }
}

function handlePointerDown(e) {
    if (dragMesh) {
        const floor = state.params.floors.find(f => f.id === dragMesh.userData.floorId);
        const op = floor.openings[dragMesh.userData.wallId].find(o => o.id === dragMesh.userData.id);
        
        if (op) { 
            op.cx = dragMesh.position.x; 
            op.cy = dragMesh.position.y - getFloorBaseY(dragMesh.userData.floorId); 
        }
        
        dragMesh = null; 
        controls.enabled = true;
        document.getElementById('canvas-container').style.cursor = 'grab';
        document.getElementById('dist-overlay').style.display = 'none';
        
        updateEditorUI();
        return;
    }

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const interactables = [];
    scene.traverse(child => { if (child.userData && child.userData.isOpening) interactables.push(child); });
    const hits = raycaster.intersectObjects(interactables, false);

    const editor = document.getElementById('opening-editor');
    if (hits.length > 0) {
        const hitMesh = hits[0].object;
        state.selectedOpeningInfo = { floorId: hitMesh.userData.floorId, wallId: hitMesh.userData.wallId, id: hitMesh.userData.id };
        if (editor) editor.style.display = 'block';
        updateEditorUI();
        
        interactables.forEach(m => m.material.color.setHex(0x111111));
        hitMesh.material.color.setHex(0xff0000);
    } else {
        state.selectedOpeningInfo = null;
        if (editor) editor.style.display = 'none';
        interactables.forEach(m => m.material.color.setHex(0x111111));
    }
}