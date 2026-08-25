import { state, resetState, getFloorBaseY } from './state.js';
import { updateScene, setCameraView, scene } from './scene.js';
import { getWallLength, clampOpenings, sanitizeAndAlign, getClosestStandard, updateBuildingLimits } from './utils.js';
import { SVGS, CONFIG } from './config.js';
import { WESTMAN_COLORS } from './colors.js';

export function showToast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.innerText = msg; t.className = "show px-4 py-3 rounded shadow fw-bold text-center";
    setTimeout(() => { t.className = t.className.replace("show", ""); }, 3000);
}

export function showDistanceOverlay(left, right) {
    const overlay = document.getElementById('dist-overlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    overlay.innerHTML = `L: ${left.toFixed(2)}' | R: ${right.toFixed(2)}'`;
}

export function syncColorsAndTexturesToParams() {
    state.params.colors = {
        roof: document.getElementById('roof-color')?.value,
        wall: document.getElementById('wall-color')?.value,
        trim: document.getElementById('trim-color')?.value,
        wainscot: document.getElementById('wainscot-color')?.value,
        soffit: document.getElementById('soffit-color')?.value,
        gableDivider: document.getElementById('gable-divider-color')?.value
    };
    state.params.textureModels = {
        roof: document.getElementById('roof-panel-model')?.value,
        wall: document.getElementById('wall-panel-model')?.value
    };
}

export function syncUIToParams() {
    const uiMapping = [
        { id: 'width', p: 'width' }, { id: 'depth', p: 'depth' }, { id: 'pitch', p: 'pitch' },
        { id: 'overhang', p: 'overhang' },
        { id: 'upperPitch', p: 'upperPitch' }, { id: 'hipOffset', p: 'hipOffset' }, { id: 'wainscotHeight', p: 'wainscotHeight' },
        { id: 'leanToWidth', p: 'leanToWidth' }, { id: 'leanToDepth', p: 'leanToDepth' }, { id: 'leanToHeight', p: 'leanToHeight' }, { id: 'leanToPitch', p: 'leanToPitch' },
        { id: 'crossDepth', p: 'crossDepth' }, { id: 'crossOffset', p: 'crossOffset' }, { id: 'hvLeftExt', p: 'hvLeftExt' }, { id: 'hvRightExt', p: 'hvRightExt' },
        { id: 'hvLeftOffset', p: 'hvLeftOffset' }, { id: 'hvRightOffset', p: 'hvRightOffset' }, { id: 'dormerWidth', p: 'dormerWidth' }, { id: 'dormerDepth', p: 'dormerDepth' },
        { id: 'dormerHeight', p: 'dormerHeight' }, { id: 'dormerZ', p: 'dormerZ' }, { id: 'vent-offset', p: 'ventOffset' }, { id: 'eave-ext', p: 'eaveOverhangExt' },
        { id: 'dormerPitch', p: 'dormerPitch'}
    ];
    
    uiMapping.forEach(item => {
        const el = document.getElementById('h-' + item.id); 
        if (el && state.params[item.p] !== undefined) el.value = state.params[item.p];
    });

    const activeFloor = state.params.floors.find(f => f.id === state.activeFloorId);
    const hEl = document.getElementById('h-height');
    if (hEl && activeFloor) hEl.value = activeFloor.height;

    if (state.params.modelType) { const mEl = document.getElementById('building-model-type'); if(mEl) mEl.value = state.params.modelType; }
    if (state.params.dormerSide) { const sideEl = document.getElementById('h-dormerSide'); if (sideEl) sideEl.value = state.params.dormerSide; }
    
    if(document.getElementById('d-enable')) document.getElementById('d-enable').checked = state.params.hasDormer;
    if(document.getElementById('wainscot-enable')) document.getElementById('wainscot-enable').checked = state.params.hasWainscot;
    if(document.getElementById('env-enable')) document.getElementById('env-enable').checked = state.params.hasEnvironment;
    if(document.getElementById('w-tex-rot')) document.getElementById('w-tex-rot').checked = state.params.horizontalSiding;
    if(document.getElementById('oh-enable')) document.getElementById('oh-enable').checked = state.params.hasOverhang;
    if(document.getElementById('vented-enable')) document.getElementById('vented-enable').checked = state.params.isVented;
    if(document.getElementById('closures-enable')) document.getElementById('closures-enable').checked = state.params.hasClosures;
    if(document.getElementById('gable-divider-enable')) document.getElementById('gable-divider-enable').checked = state.params.hasGableDivider;

    renderFloorControls();
}

function renderFloorControls() {
    const container = document.getElementById('floor-controls-container');
    if (!container) return;
    container.innerHTML = '';

    state.params.floors.forEach((floor, index) => {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${state.activeFloorId === floor.id ? 'btn-primary' : 'btn-outline-secondary'} me-2`;
        btn.innerText = `Floor ${index + 1}`;
        btn.onclick = () => {
            state.activeFloorId = floor.id;
            syncUIToParams();
            // Optional: update opacity of unselected floors in scene for visual feedback
        };
        container.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm btn-success';
    addBtn.innerText = '+ Floor';
    addBtn.onclick = () => {
        const newId = state.params.floors.length;
        state.params.floors.push({
            id: newId,
            height: 9,
            openings: { 
                front: [], back: [], left: [], right: [], 
                left_front: [], left_back: [], right_front: [], right_back: [], 
                wing_l_front: [], wing_l_back: [], wing_l_end: [], 
                wing_r_front: [], wing_r_back: [], wing_r_end: [] 
            }
        });
        state.activeFloorId = newId;
        syncUIToParams();
        updateBuildingLimits();
        updateScene();
    };
    container.appendChild(addBtn);

    if (state.params.floors.length > 1) {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger ms-2';
        delBtn.innerText = '- Remove Top';
        delBtn.onclick = () => {
            state.params.floors.pop();
            state.activeFloorId = state.params.floors[state.params.floors.length - 1].id;
            syncUIToParams();
            updateBuildingLimits();
            updateScene();
        };
        container.appendChild(delBtn);
    }
}

export function updateEditorUI() {
    if (!state.selectedOpeningInfo) return;
    const floor = state.params.floors.find(f => f.id === state.selectedOpeningInfo.floorId);
    if (!floor) return;
    const op = floor.openings[state.selectedOpeningInfo.wallId].find(o => o.id === state.selectedOpeningInfo.id);
    if (!op) return;

    document.getElementById('oe-width').value = op.w;
    document.getElementById('oe-height').value = op.h;
    document.getElementById('oe-ffl').value = Math.max(0, op.cy - op.h / 2).toFixed(1);
    document.getElementById('oe-current-size').innerText = `${op.w.toFixed(1)} x ${op.h.toFixed(1)}`;
    
    document.getElementById('oe-type-label').innerText = op.isDoor ? 'Door' : 'Window';
    
    let svgIcon = SVGS.WINDOW_1;
    if (op.type === 'window_2') svgIcon = SVGS.WINDOW_2;
    else if (op.type === 'window_3') svgIcon = SVGS.WINDOW_3;
    else if (op.type === 'door_1') svgIcon = SVGS.DOOR_1;
    else if (op.type === 'door_2') svgIcon = SVGS.DOOR_2;
    else if (op.type === 'door_3' || op.type === 'door_4') svgIcon = SVGS.DOOR_3;
    document.getElementById('oe-svg').innerHTML = svgIcon;

    let wallLen = getWallLength(state.selectedOpeningInfo.wallId, state.params);
    const distLeft = wallLen/2 + op.cx - op.w/2;
    const distRight = wallLen/2 - op.cx - op.w/2;
    const distLEl = document.getElementById('oe-dist-l');
    const distREl = document.getElementById('oe-dist-r');
    if (distLEl) distLEl.value = distLeft.toFixed(2);
    if (distREl) distREl.value = distRight.toFixed(2);

    const std = getClosestStandard(op.w, op.h, op.isDoor);
    const warningEl = document.getElementById('oe-warning');
    
    if (std.dist > 0.1) {
        warningEl.style.display = 'block';
        document.getElementById('oe-std-size').innerText = `${std.w}' x ${std.h}'`;
        document.getElementById('btn-apply-std').onclick = () => {
            const currentFFL = op.cy - op.h / 2;
            op.w = std.w;
            op.h = std.h;
            if (op.isDoor) op.cy = op.h / 2;
            else op.cy = currentFFL + op.h / 2;
            clampOpenings();
            sanitizeAndAlign();
            updateScene();
            updateEditorUI();
        };
    } else {
        warningEl.style.display = 'none';
    }
}

export function initUI() {
    // 1. ЗАПОЛНЯЕМ ВЫПАДАЮЩИЕ СПИСКИ ЦВЕТОВ
    if (typeof WESTMAN_COLORS !== 'undefined') {
        WESTMAN_COLORS.forEach(c => { 
            ['roof-color', 'wall-color', 'trim-color', 'wainscot-color', 'soffit-color', 'gable-divider-color'].forEach(id => { 
                const el = document.getElementById(id); 
                if (el) el.add(new Option(c.name, c.hex)); 
            }); 
        });
    }

    // 2. СИНХРОНИЗИРУЕМ ПАРАМЕТРЫ С ИНТЕРФЕЙСОМ
    syncUIToParams();

    // 3. ПРИВЯЗЫВАЕМ СЛУШАТЕЛИ СОБЫТИЙ
    [
        { id: 'h-width', p: 'width' }, { id: 'h-depth', p: 'depth' },
        { id: 'h-pitch', p: 'pitch' }, { id: 'h-overhang', p: 'overhang' },
        { id: 'h-upperPitch', p: 'upperPitch' }, { id: 'h-hipOffset', p: 'hipOffset' },
        { id: 'h-wainscotHeight', p: 'wainscotHeight' }, { id: 'h-leanToWidth', p: 'leanToWidth' },
        { id: 'h-leanToDepth', p: 'leanToDepth' }, { id: 'h-leanToHeight', p: 'leanToHeight' },
        { id: 'h-leanToPitch', p: 'leanToPitch' }, { id: 'h-crossDepth', p: 'crossDepth' },
        { id: 'h-crossOffset', p: 'crossOffset' }, { id: 'h-hvLeftExt', p: 'hvLeftExt' },
        { id: 'h-hvRightExt', p: 'hvRightExt' }, { id: 'h-hvLeftOffset', p: 'hvLeftOffset' },
        { id: 'h-hvRightOffset', p: 'hvRightOffset' }, { id: 'h-dormerWidth', p: 'dormerWidth' },
        { id: 'h-dormerDepth', p: 'dormerDepth' }, { id: 'h-dormerHeight', p: 'dormerHeight' },
        { id: 'h-dormerZ', p: 'dormerZ' }, { id: 'h-vent-offset', p: 'ventOffset' },
        { id: 'h-eave-ext', p: 'eaveOverhangExt' }, { id: 'h-dormerPitch', p: 'dormerPitch' }
    ].forEach(m => {
        const el = document.getElementById(m.id);
        if (el) {
            el.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    state.params[m.p] = val;
                    updateBuildingLimits(); 
                    updateScene();
                }
            });
        }
    });

    const hEl = document.getElementById('h-height');
    if (hEl) {
        hEl.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                const floor = state.params.floors.find(f => f.id === state.activeFloorId);
                if (floor) {
                    floor.height = val;
                    updateBuildingLimits();
                    updateScene();
                }
            }
        });
    }

    document.getElementById('btn-reset-building')?.addEventListener('click', () => {
        resetState();
        const editor = document.getElementById('opening-editor');
        if (editor) editor.style.display = 'none';
        syncUIToParams();
        updateScene();
        setCameraView('reset');
    });

    document.getElementById('btn-add-element')?.addEventListener('click', () => {
        const wall = document.getElementById('wd-wall').value;
        const typeVal = document.getElementById('wd-type').value;
        let w = 0, h = 0, isDoor = false;
        if (typeVal === 'window_1') { w = 2; h = 3; }
        else if (typeVal === 'window_2') { w = 4; h = 3; }
        else if (typeVal === 'window_3') { w = 6; h = 3; }
        else if (typeVal === 'door_1') { w = 3; h = 7; isDoor = true; }
        else if (typeVal === 'door_2') { w = 6; h = 7; isDoor = true; }
        else if (typeVal === 'door_3') { w = 8; h = 7; isDoor = true; }
        else if (typeVal === 'door_4') { w = 16; h = 7; isDoor = true; }
        
        let wallLen = getWallLength(wall, state.params);
        const floor = state.params.floors.find(f => f.id === state.activeFloorId);

        if (!floor.openings[wall]) floor.openings[wall] = [];
        const current = floor.openings[wall];
        let cx = (current.length > 0) ? current[current.length-1].cx + current[current.length-1].w/2 + CONFIG.minSpacing + w/2 : -wallLen/2 + CONFIG.minSpacing + w/2;
        
        if (cx + w/2 + CONFIG.minSpacing <= wallLen/2) {
            floor.openings[wall].push({ id: state.elementIdCounter++, type: typeVal, w, h, isDoor, cx, cy: isDoor ? h/2 : h/2 + 3 });
            updateScene();
        } else { showToast(`Not enough space on this wall!`); }
    });

    document.getElementById('btn-clear-elements')?.addEventListener('click', () => { 
        const floor = state.params.floors.find(f => f.id === state.activeFloorId);
        Object.keys(floor.openings).forEach(k => floor.openings[k] = []); 
        state.selectedOpeningInfo = null; 
        document.getElementById('opening-editor').style.display = 'none'; 
        updateScene(); 
    });

    document.getElementById('btn-delete-opening')?.addEventListener('click', () => {
        if (!state.selectedOpeningInfo) return;
        const floor = state.params.floors.find(f => f.id === state.selectedOpeningInfo.floorId);
        floor.openings[state.selectedOpeningInfo.wallId] = floor.openings[state.selectedOpeningInfo.wallId].filter(o => o.id !== state.selectedOpeningInfo.id);
        state.selectedOpeningInfo = null;
        document.getElementById('opening-editor').style.display = 'none';
        updateScene();
    });

    document.getElementById('oe-width')?.addEventListener('input', (e) => {
        if (!state.selectedOpeningInfo) return;
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        const floor = state.params.floors.find(f => f.id === state.selectedOpeningInfo.floorId);
        const op = floor.openings[state.selectedOpeningInfo.wallId].find(o => o.id === state.selectedOpeningInfo.id);
        if (op) { op.w = val; clampOpenings(); updateScene(); updateEditorUI(); }
    });

    document.getElementById('oe-height')?.addEventListener('input', (e) => {
        if (!state.selectedOpeningInfo) return;
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        const floor = state.params.floors.find(f => f.id === state.selectedOpeningInfo.floorId);
        const op = floor.openings[state.selectedOpeningInfo.wallId].find(o => o.id === state.selectedOpeningInfo.id);
        if (op) { 
            const currentFFL = op.cy - op.h / 2;
            op.h = val; 
            if (op.isDoor) op.cy = op.h / 2; 
            else op.cy = currentFFL + op.h / 2;
            clampOpenings(); 
            sanitizeAndAlign();
            updateScene(); 
            updateEditorUI();
        }
    });

    document.getElementById('oe-ffl')?.addEventListener('input', (e) => {
        if (!state.selectedOpeningInfo) return;
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        const floor = state.params.floors.find(f => f.id === state.selectedOpeningInfo.floorId);
        const op = floor.openings[state.selectedOpeningInfo.wallId].find(o => o.id === state.selectedOpeningInfo.id);
        if (op) { 
            if (!op.isDoor) {
                op.cy = val + op.h / 2;
                sanitizeAndAlign();
                updateScene();
                updateEditorUI();
            }
        }
    });

    ['d-enable', 'wainscot-enable', 'env-enable', 'w-tex-rot', 'oh-enable', 'vented-enable', 'closures-enable', 'gable-divider-enable'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateScene);
    });
    
    ['roof-color', 'wall-color', 'trim-color', 'wainscot-color', 'soffit-color', 'gable-divider-color'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updateScene);
    });
    document.getElementById('building-model-type')?.addEventListener('change', updateScene);
}