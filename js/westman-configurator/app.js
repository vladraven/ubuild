import * as THREE from 'three';
import {
    OrbitControls
} from 'three/addons/controls/OrbitControls.js';
import {
    OBJLoader
} from 'three/addons/loaders/OBJLoader.js';
import {
    HouseGenerator
} from './houseModel.js';
import {
    WESTMAN_COLORS
} from './colors.js';
import {
    setupPanelUI
} from './panels.js';
import {
    UserProfiler
} from './userProfiler.js';
import {
    printProjectPDF
} from './pdfGenerator.js?v=20260731';
import {
    processAndUploadPDF
} from './savepdf.js?v=20260731';
import {
    AnalyticsTracker
} from './api.js';

window.Analytics = AnalyticsTracker;
AnalyticsTracker.init();

const CONFIG = {
    textureScaleRoof: 0.25,
    textureScaleWall: 26.0,
    wallMetalness: 0.35,
    wallRoughness: 0.50,
    roofMetalness: 0.45,
    roofRoughness: 0.40,
    cameraGroundMargin: 0.05,
    lightAmbientIntensityBase: 0.4,
    lightHemiIntensity: 0.6,
    lightDirIntensityBase: 1.2,
    lightDirIntensityEnvOn: 1.5,
    urlSkybox: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/cube/skyboxsun25deg/',
    urlGrass: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/terrain/grasslight-big.jpg',
    defaultBgColorHex: 0xf0f4f8,
    minSpacing: 3.28
};

const PRODUCT_CODES = {
    roof_panel: "RS-100-WM",
    wall_panel: "WS-200-WM",
    trim: "TR-50-WM",
    screw_wood: "SCW-15-WD",
    screw_metal: "SCM-12-MT",
    closure_vented: "CL-V-88",
    closure_solid: "CL-S-99"
};

const DEFAULT_PARAMS = {
    width: 30,
    depth: 40,
    height: 16,
    pitch: 4,
    upperPitch: 6,
    thickness: 0.05,
    hasOverhang: false,
    overhang: 1.0,
    modelType: 'standard',
    hipOffset: 15,
    hasDormer: false,
    dormerWidth: 6,
    dormerDepth: 7.5,
    dormerZ: 0,
    dormerHeight: 18,
    dormerPitch: 4,
    dormerSide: 'right',
    hasEnvironment: false,
    horizontalSiding: false,
    hasTwoFloors: false,
    firstFloorHeight: 10,
    hasWainscot: false,
    wainscotHeight: 3.0,
    crossWidth: 20,
    crossDepth: 20,
    crossOffset: 0,
    hvLeftExt: 15,
    hvRightExt: 15,
    hvLeftOffset: 0,
    hvRightOffset: 0,
    leanToWidth: 10,
    leanToDepth: 20,
    leanToHeight: 8,
    leanToPitch: 2,
    isVented: false,
    ventOffset: 0.5,
    eaveOverhangExt: 0.0,
    hasSoffit: false,
    soffitColor: null,
    soffitProfile: 'perforated',
    hasGableDivider: false,
    gableDividerColor: null,
    gableDividerProfile: 'standard',
    panelAlignment: 'left',
    trimLength: 10.5, 
    customTrims: [], 
    hasClosures: true,
    openings: {
        front: [], back: [], left: [], right: [],
        left_front: [], left_back: [], right_front: [], right_back: [],
        wing_l_front: [], wing_l_back: [], wing_l_end: [],
        wing_r_front: [], wing_r_back: [], wing_r_end: []
    },
    colors: { roof: null, wall: null, firstFloor: null, trim: null, wainscot: null },
    textureModels: { roof: null, wall: null, firstFloor: null }
};

function initializeParameters() {
    try {
        const localData = localStorage.getItem('westman_current_project_params');
        if (localData) {
            const parsed = JSON.parse(localData);
            if (parsed && typeof parsed === 'object' && parsed.modelType) {
                if (!parsed.customTrims) parsed.customTrims = [];
                if (!parsed.trimLength) parsed.trimLength = 10.5;
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Ошибка чтения localStorage, применен дефолтный шаблон:', e);
    }
    localStorage.setItem('westman_current_project_params', JSON.stringify(DEFAULT_PARAMS));
    return JSON.parse(JSON.stringify(DEFAULT_PARAMS));
}

let params = initializeParameters();
let currentHouse = null;
let selectedRoofWidth = 36, selectedWallWidth = 36;
let cachedScrews = 0, elementIdCounter = 0;
let selectedOpeningInfo = null;
let savedHistoryData = [];

function getWallLength(wallId, p) {
    let wallLen = (wallId === 'front' || wallId === 'back') ? p.width : p.depth;
    if (p.modelType === 'hip_and_valley') {
        const A = p.width; const B = p.depth;
        const L = p.hvLeftExt || 0; const R = p.hvRightExt || 0;
        const OL = p.hvLeftOffset || 0; const OR = p.hvRightOffset || 0;
        const Zw_L_front = OL + A / 2; const Zw_L_back = OL - A / 2;
        const Zw_R_front = OR + A / 2; const Zw_R_back = OR - A / 2;
        if (['front', 'back', 'wing_l_end', 'wing_r_end'].includes(wallId)) wallLen = A;
        if (wallId === 'wing_l_front' || wallId === 'wing_l_back') wallLen = L;
        if (wallId === 'wing_r_front' || wallId === 'wing_r_back') wallLen = R;
        if (wallId === 'left_front') wallLen = B / 2 - Zw_L_front;
        if (wallId === 'left_back') wallLen = Zw_L_back - (-B / 2);
        if (wallId === 'right_front') wallLen = B / 2 - Zw_R_front;
        if (wallId === 'right_back') wallLen = Zw_R_back - (-B / 2);
        if (wallId === 'left' || wallId === 'right') wallLen = B;
    } else if (p.modelType === 'hexagonal') {
        wallLen = p.width / 2;
    } else if (p.modelType === 'cross_hipped') {
        const A = p.width; const B = p.depth; const D = p.width; const X = p.crossOffset || 0;
        if (wallId === 'front_left') wallLen = (X - D / 2) - (-A / 2);
        if (wallId === 'front_right') wallLen = A / 2 - (X + D / 2);
        if (wallId === 'wing_front') wallLen = D;
        if (wallId === 'wing_left' || wallId === 'wing_right') wallLen = p.crossDepth;
        if (wallId === 'left') wallLen = ((X - D / 2) - (-A / 2)) < 0.1 ? B + p.crossDepth : B;
        if (wallId === 'right') wallLen = (A / 2 - (X + D / 2)) < 0.1 ? B + p.crossDepth : B;
    }
    return wallLen;
}

async function fetchSavedConfigs() {
    if (typeof wpApiSettings === 'undefined') return [];
    try {
        const response = await fetch(wpApiSettings.root + 'configurator/v1/history', { headers: { 'X-WP-Nonce': wpApiSettings.nonce }});
        if (!response.ok) return [];
        const data = await response.json();
        return data.history || [];
    } catch (e) {
        console.error('Fetch history error:', e);
        return [];
    }
}

async function saveToServerConfig() {
    if (typeof wpApiSettings === 'undefined') { showToast('Error: WordPress environment not detected.'); return; }
    const selectEl = document.getElementById('building-model-type');
    const roofName = selectEl.options[selectEl.selectedIndex].text;
    const configName = `${roofName} (${new Date().toLocaleDateString('en-CA')})`;
    const payload = { name: configName, params: params, timestamp: Date.now() };
    const saveBtn = document.getElementById('btn-save-project');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    try {
        const response = await fetch(wpApiSettings.root + 'configurator/v1/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpApiSettings.nonce },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(await getApiError(response, 'Save failed'));
        showToast('Configuration saved successfully!');
        await refreshProjectsDropdown();
    } catch (error) {
        showToast(error.message || 'Save failed. Please try again.');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

async function getApiError(response, fallback) {
    try {
        const payload = await response.json();
        return payload.message || payload.data?.message || fallback;
    } catch {
        return `${fallback} (HTTP ${response.status})`;
    }
}

async function refreshProjectsDropdown() {
    savedHistoryData = await fetchSavedConfigs();
    const dropdownContainer = document.getElementById('dropdown-container');
    const dropdown = document.getElementById('saved-projects-dropdown');
    if (savedHistoryData.length > 0) {
        dropdownContainer.style.display = 'flex';
        dropdown.innerHTML = '';
        savedHistoryData.forEach((item, index) => {
            const opt = document.createElement('option');
            opt.value = index; opt.textContent = item.name;
            dropdown.appendChild(opt);
        });
    } else {
        dropdownContainer.style.display = 'none';
    }
}

function loadSelectedProject() {
    const index = document.getElementById('saved-projects-dropdown').value;
    if (savedHistoryData[index]) {
        const loadedParams = savedHistoryData[index].params;
        Object.assign(params, loadedParams);
        if (loadedParams.openings) params.openings = loadedParams.openings;
        if (!params.customTrims) params.customTrims = [];
        if (!params.trimLength) params.trimLength = 10.5;
        let maxId = 0;
        Object.values(params.openings).forEach(arr => arr.forEach(o => { if (o.id > maxId) maxId = o.id; }));
        elementIdCounter = maxId + 1;
        syncUIToParams();
        updateScene();
        showToast('Configuration loaded!');
    }
}

window.loadProjectData = async function(index, sharedUserId = null) {
    let apiUrl = wpApiSettings.root + 'configurator/v1/history';
    if (sharedUserId) apiUrl += `?user_id=${sharedUserId}`;
    try {
        const res = await fetch(apiUrl, { headers: { 'X-WP-Nonce': wpApiSettings.nonce } });
        const data = await res.json();
        if (data.history && data.history[index]) {
            const loadedParams = data.history[index].params;
            Object.assign(params, loadedParams);
            if (loadedParams.openings) params.openings = JSON.parse(JSON.stringify(loadedParams.openings));
            if (!params.customTrims) params.customTrims = [];
            if (!params.trimLength) params.trimLength = 10.5;
            let maxId = 0;
            Object.values(params.openings).forEach(arr => arr.forEach(o => { if (o.id > maxId) maxId = o.id; }));
            elementIdCounter = maxId + 1;
            syncUIToParams();
            updateScene();
            showToast(sharedUserId ? 'Viewing shared project' : 'Project loaded');
        }
    } catch (e) {
        console.error('Failed to load project:', e);
    }
};

async function initProjectsUI() {
    document.getElementById('btn-save-project')?.addEventListener('click', saveToServerConfig);
    document.getElementById('btn-load-project')?.addEventListener('click', loadSelectedProject);
    await refreshProjectsDropdown();
}

// ---------------------------------------------------------
// CUSTOM TRIMS LOGIC
// ---------------------------------------------------------
function renderCustomTrims() {
    const container = document.getElementById('custom-trims-container');
    if (!container) return;
    container.innerHTML = '';
    if (!params.customTrims) params.customTrims = [];
    
    params.customTrims.forEach((ct, idx) => {
        const div = document.createElement('div');
        div.className = 'd-flex justify-content-between align-items-center mb-1 pb-1 border-bottom border-light';
        div.innerHTML = `
            <div style="font-size: 11px;"><strong>${ct.name}</strong> (${ct.length} ft) x ${ct.qty}</div>
            <button class="btn btn-sm text-danger p-0 delete-ct" data-idx="${idx}"><i class="bi bi-x-circle"></i></button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.delete-ct').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
            params.customTrims.splice(idx, 1);
            renderCustomTrims();
            calculateInfo();
        });
    });
    
    // Update summary box
    const wrapper = document.getElementById('spec-custom-trims-wrapper');
    const list = document.getElementById('spec-custom-trims-list');
    if (wrapper && list) {
        if (params.customTrims.length > 0) {
            wrapper.style.display = 'block';
            list.innerHTML = params.customTrims.map(ct => `<div class="d-flex justify-content-between"><span>${ct.name} (${ct.length}'):</span> <strong>${ct.qty} pcs</strong></div>`).join('');
        } else {
            wrapper.style.display = 'none';
        }
    }
}

document.getElementById('btn-add-custom-trim')?.addEventListener('click', () => {
    const name = document.getElementById('ct-name').value;
    const length = parseFloat(document.getElementById('ct-length').value);
    const qty = parseInt(document.getElementById('ct-qty').value);
    if (!name || isNaN(length) || isNaN(qty)) {
        showToast('Please fill out all custom trim fields correctly.');
        return;
    }
    if (!params.customTrims) params.customTrims = [];
    params.customTrims.push({ name, length, qty });
    document.getElementById('ct-name').value = '';
    document.getElementById('ct-length').value = '';
    document.getElementById('ct-qty').value = '';
    renderCustomTrims();
    calculateInfo();
});
// ---------------------------------------------------------

function enforceGeometryConstraints() {
    const minWallHeight = params.hasWainscot ? params.wainscotHeight : 1;
    if (params.height < minWallHeight) {
        params.height = minWallHeight;
        const hEl = document.getElementById('h-height');
        if (hEl && document.activeElement !== hEl) hEl.value = params.height;
    }
    if (params.modelType === 'butterfly') {
        const drop = (params.width / 2) * (params.pitch / 12);
        let roofLowPoint = params.height - drop;
        if (roofLowPoint < minWallHeight) {
            const maxPitch = ((params.height - minWallHeight) / (params.width / 2)) * 12;
            params.pitch = Math.max(0, maxPitch);
            const pitchEl = document.getElementById('h-pitch');
            if (pitchEl && document.activeElement !== pitchEl) pitchEl.value = params.pitch;
        }
    }
    if (params.modelType === 'cross_hipped') {
        if (params.width > params.depth) {
            params.width = params.depth;
            const wEl = document.getElementById('h-width');
            if (wEl && document.activeElement !== wEl) wEl.value = params.width;
        }
    }
}

function syncColorsAndTexturesToParams() {
    params.colors = {
        roof: document.getElementById('roof-color')?.value,
        wall: document.getElementById('wall-color')?.value,
        firstFloor: document.getElementById('first-floor-color')?.value,
        trim: document.getElementById('trim-color')?.value,
        wainscot: document.getElementById('wainscot-color')?.value,
        soffit: document.getElementById('soffit-color')?.value,
        text_color: document.getElementById('text-color')?.value,
        gableDivider: document.getElementById('gable-divider-color')?.value
    };
    params.textureModels = {
        roof: document.getElementById('roof-panel-model')?.value,
        wall: document.getElementById('wall-panel-model')?.value,
        firstFloor: document.getElementById('first-floor-panel-model')?.value
    };
}

function syncUIToParams() {
    const uiMapping = [
        { id: 'width', p: 'width' }, { id: 'depth', p: 'depth' }, { id: 'height', p: 'height' }, 
        { id: 'pitch', p: 'pitch' }, { id: 'overhang', p: 'overhang' }, { id: 'upperPitch', p: 'upperPitch' }, 
        { id: 'hipOffset', p: 'hipOffset' }, { id: 'firstFloorHeight', p: 'firstFloorHeight' }, 
        { id: 'wainscotHeight', p: 'wainscotHeight' }, { id: 'leanToWidth', p: 'leanToWidth' }, 
        { id: 'leanToDepth', p: 'leanToDepth' }, { id: 'leanToHeight', p: 'leanToHeight' }, 
        { id: 'leanToPitch', p: 'leanToPitch' }, { id: 'crossDepth', p: 'crossDepth' }, 
        { id: 'crossOffset', p: 'crossOffset' }, { id: 'hvLeftExt', p: 'hvLeftExt' }, 
        { id: 'hvRightExt', p: 'hvRightExt' }, { id: 'hvLeftOffset', p: 'hvLeftOffset' }, 
        { id: 'hvRightOffset', p: 'hvRightOffset' }, { id: 'dormerWidth', p: 'dormerWidth' }, 
        { id: 'dormerDepth', p: 'dormerDepth' }, { id: 'dormerHeight', p: 'dormerHeight' }, 
        { id: 'dormerZ', p: 'dormerZ' }, { id: 'vent-offset', p: 'ventOffset' }, 
        { id: 'eave-ext', p: 'eaveOverhangExt' }, { id: 'dormerPitch', p: 'dormerPitch' }
    ];
    uiMapping.forEach(item => {
        const el = document.getElementById('h-' + item.id);
        if (el && params[item.p] !== undefined) el.value = params[item.p];
    });
    
    if (params.modelType) {
        const mEl = document.getElementById('building-model-type');
        if (mEl) mEl.value = params.modelType;
    }
    if (params.dormerSide) {
        const sideEl = document.getElementById('h-dormerSide');
        if (sideEl) sideEl.value = params.dormerSide;
    }
    if (params.panelAlignment) {
        const alignEl = document.getElementById('h-panel-alignment');
        if (alignEl) alignEl.value = params.panelAlignment;
    }
    if (params.trimLength) {
        const tlEl = document.getElementById('h-trim-length');
        if (tlEl) tlEl.value = params.trimLength;
    }
    
    if (document.getElementById('d-enable')) document.getElementById('d-enable').checked = params.hasDormer;
    if (document.getElementById('two-floors-enable')) document.getElementById('two-floors-enable').checked = params.hasTwoFloors;
    if (document.getElementById('wainscot-enable')) document.getElementById('wainscot-enable').checked = params.hasWainscot;
    if (document.getElementById('env-enable')) document.getElementById('env-enable').checked = params.hasEnvironment;
    if (document.getElementById('w-tex-rot')) document.getElementById('w-tex-rot').checked = params.horizontalSiding;
    if (document.getElementById('oh-enable')) document.getElementById('oh-enable').checked = params.hasOverhang;
    if (document.getElementById('vented-enable')) document.getElementById('vented-enable').checked = params.isVented;
    if (document.getElementById('closures-enable')) document.getElementById('closures-enable').checked = params.hasClosures;
    if (document.getElementById('gable-divider-enable')) document.getElementById('gable-divider-enable').checked = params.hasGableDivider;
    
    if (params.colors) {
        ['roof','wall','firstFloor','trim','wainscot','soffit','gableDivider'].forEach(k => {
            const el = document.getElementById(k === 'gableDivider' ? 'gable-divider-color' : (k === 'firstFloor' ? 'first-floor-color' : `${k}-color`));
            if (el && params.colors[k]) el.value = params.colors[k];
        });
    }
    if (params.textureModels) {
        ['roof','wall','firstFloor'].forEach(k => {
            const el = document.getElementById(k === 'firstFloor' ? 'first-floor-panel-model' : `${k}-panel-model`);
            if (el && params.textureModels[k]) el.value = params.textureModels[k];
        });
    }

    renderCustomTrims();
}

const STD_WINDOWS = [{ w: 2, h: 2 }, { w: 2, h: 3 }, { w: 2, h: 4 }, { w: 3, h: 3 }, { w: 3, h: 4 }, { w: 3, h: 5 }, { w: 4, h: 3 }, { w: 4, h: 4 }, { w: 4, h: 5 }, { w: 5, h: 4 }, { w: 6, h: 4 }];
const STD_DOORS = [{ w: 3, h: 7 }, { w: 6, h: 7 }, { w: 8, h: 7 }, { w: 9, h: 7 }, { w: 10, h: 10 }, { w: 12, h: 12 }, { w: 16, h: 7 }, { w: 16, h: 16 }];

function getClosestStandard(w, h, isDoor) {
    const list = isDoor ? STD_DOORS : STD_WINDOWS;
    let closest = list[0]; let minD = Infinity;
    list.forEach(std => {
        const d = Math.sqrt(Math.pow(std.w - w, 2) + Math.pow(std.h - h, 2));
        if (d < minD) { minD = d; closest = std; }
    });
    return { ...closest, dist: minD };
}

const SVG_WINDOW_1 = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="20" y="20" width="60" height="60"/><line x1="20" y1="50" x2="80" y2="50"/><line x1="50" y1="20" x2="50" y2="80"/></svg>`;
const SVG_WINDOW_2 = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="10" y="20" width="80" height="60"/><line x1="50" y1="20" x2="50" y2="80"/></svg>`;
const SVG_WINDOW_3 = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="10" y="20" width="80" height="60"/><line x1="36" y1="20" x2="36" y2="80"/><line x1="63" y1="20" x2="63" y2="80"/></svg>`;
const SVG_DOOR_1 = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="30" y="10" width="40" height="90"/><circle cx="60" cy="55" r="3" fill="currentColor"/></svg>`;
const SVG_DOOR_2 = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="10" y="10" width="80" height="90"/><line x1="50" y1="10" x2="50" y2="100"/><circle cx="42" cy="55" r="3" fill="currentColor"/><circle cx="58" cy="55" r="3" fill="currentColor"/></svg>`;
const SVG_DOOR_3 = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4">    <rect x="10" y="10" width="80" height="90"/>    <line x1="10" y1="32" x2="90" y2="32"/>    <line x1="10" y1="54" x2="90" y2="54"/>    <line x1="10" y1="76" x2="90" y2="76"/></svg>`;

const scene = new THREE.Scene();
const defaultBgColor = new THREE.Color(CONFIG.defaultBgColorHex);
scene.background = defaultBgColor;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(50, 40, 50);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = (Math.PI / 2) * (1 - CONFIG.cameraGroundMargin);

window.setCameraView = function(view) {
    const dist = Math.max(params.width, params.depth) * 1.5;
    const h2 = params.height / 2;
    controls.target.set(0, h2, 0);
    switch (view) {
        case 'top': camera.position.set(0, dist * 1.5, 0); controls.target.set(0, 0, 0); break;
        case 'front': camera.position.set(0, h2, dist); break;
        case 'back': camera.position.set(0, h2, -dist); break;
        case 'left': camera.position.set(-dist, h2, 0); break;
        case 'right': camera.position.set(dist, h2, 0); break;
        case 'reset': camera.position.set(50, 40, 50); controls.target.set(0, 0, 0); break;
    }
    controls.update();
};
document.getElementById('btn-reset-building')?.addEventListener('click', () => {
    params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
    selectedOpeningInfo = null;
    const editor = document.getElementById('opening-editor');
    if (editor) editor.style.display = 'none';
    syncUIToParams();
    updateScene();
    window.setCameraView('reset');
});

const ambLight = new THREE.AmbientLight(0xffffff, CONFIG.lightAmbientIntensityBase); scene.add(ambLight);
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, CONFIG.lightHemiIntensity); hemiLight.position.set(0, 200, 0); scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, CONFIG.lightDirIntensityBase); dirLight.position.set(60, 120, 60); dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048; dirLight.shadow.bias = -0.0005;
dirLight.shadow.camera.left = -100; dirLight.shadow.camera.right = 100; dirLight.shadow.camera.top = 100; dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);
const grid = new THREE.GridHelper(2000, 100, 0xcccccc, 0xdddddd); grid.position.y = -0.04; scene.add(grid);

const wallMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
const firstFloorMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
const roofMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.roofMetalness, roughness: CONFIG.roofRoughness, side: THREE.DoubleSide });
const gableMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
const trimMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
const wainscotMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
const soffitMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
const gableDividerMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });

const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();
let skyboxTexture = null, grassMesh = null, environmentReady = false;

function loadEnvironmentAssets() {
    const envSwitch = document.getElementById('env-enable');
    if (envSwitch) envSwitch.disabled = true;
    cubeTextureLoader.setPath(CONFIG.urlSkybox);
    cubeTextureLoader.load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'], (texture) => {
        skyboxTexture = texture; scene.environment = skyboxTexture; environmentReady = true;
        if (envSwitch) { envSwitch.disabled = false; if (params.hasEnvironment) updateEnvironment(); }
    }, undefined, (err) => console.error("Skybox error:", err));
    const grassMap = textureLoader.load(CONFIG.urlGrass);
    grassMap.wrapS = THREE.RepeatWrapping; grassMap.wrapT = THREE.RepeatWrapping; grassMap.repeat.set(100, 100);
    const grassMat = new THREE.MeshStandardMaterial({ map: grassMap, roughness: 0.9, metalness: 0.05, color: 0x88bb88 });
    const grassGeo = new THREE.PlaneGeometry(5000, 5000);
    grassMesh = new THREE.Mesh(grassGeo, grassMat); grassMesh.rotation.x = -Math.PI / 2; grassMesh.position.y = -0.05;
    grassMesh.receiveShadow = true; grassMesh.visible = params.hasEnvironment; scene.add(grassMesh);
}

function updateEnvironment() {
    if (params.hasEnvironment && environmentReady && skyboxTexture) {
        scene.background = skyboxTexture; grid.visible = false; if (grassMesh) grassMesh.visible = true; dirLight.intensity = CONFIG.lightDirIntensityEnvOn;
    } else {
        scene.background = defaultBgColor; grid.visible = true; if (grassMesh) grassMesh.visible = false; dirLight.intensity = CONFIG.lightDirIntensityBase;
    }
}
loadEnvironmentAssets();

function checkOverlap(wallId, currentOp) {
    const wallOps = params.openings[wallId] || [];
    for (let other of wallOps) {
        if (other.id === currentOp.id) continue;
        const combinedW = (currentOp.w + other.w) / 2 + 1.0;
        const combinedH = (currentOp.h + other.h) / 2 + 1.0;
        const dx = Math.abs(currentOp.cx - other.cx);
        const dy = Math.abs(currentOp.cy - other.cy);
        if (dx < combinedW && dy < combinedH) return true;
    }
    return false;
}

function sanitizeAndAlign() {
    const invalidDormerTypes = ['butterfly', 'flat', 'shed', 'pyramid', 'hexagonal', 'm_shaped', 'skillion_leanto', 'dutch_gable', 'combination', 'cross_hipped', 'hip_and_valley'];
    const dEnable = document.getElementById('d-enable'); const dormerControls = document.getElementById('dormer-controls');
    const dormerSection = dEnable ? dEnable.closest('.p-3') : null;
    if (invalidDormerTypes.includes(params.modelType)) {
        params.hasDormer = false;
        if (dEnable) { dEnable.checked = false; dEnable.disabled = true; }
        if (dormerSection) dormerSection.style.display = 'none';
    } else {
        if (dEnable && !dEnable.disabled) params.hasDormer = dEnable.checked;
        if (dEnable) dEnable.disabled = false;
        if (dormerSection) dormerSection.style.display = 'block';
        if (dormerControls) dormerControls.style.display = params.hasDormer ? 'block' : 'none';
    }
    Object.keys(params.openings).forEach(wall => {
        params.openings[wall].forEach(o => {
            const oldY = o.cy;
            let maxAllowedY = params.height - o.h / 2 - 0.5;
            if ((wall === 'front' || wall === 'back') && !['mansard', 'hip', 'pyramid', 'hexagonal', 'dutch_gable', 'combination', 'cross_hipped', 'hip_and_valley'].includes(params.modelType)) {
                if (params.modelType === 'butterfly') maxAllowedY = (params.height - (params.width / 2) * (params.pitch / 12)) - o.h / 2 - 0.5;
                else if (params.modelType === 'm_shaped') {
                    const pX = params.width / 6; const m = params.pitch / 12; let localRoofY = params.height;
                    if (Math.abs(o.cx) >= pX) localRoofY = params.height + (params.width / 2 - Math.abs(o.cx)) * m;
                    else localRoofY = params.height + Math.abs(o.cx) * (m * 2);
                    maxAllowedY = localRoofY - 1.0 - o.h / 2;
                } else if (params.modelType === 'jerkinhead') {
                    const m = params.pitch / 12; const peak = (params.width / 2) * m;
                    const actOff = Math.max(0.1, params.hipOffset); const cWallX = actOff - 0.5; let localRoofY;
                    if (cWallX <= 0) localRoofY = params.height + (params.width / 2 - Math.abs(o.cx)) * m;
                    else {
                        if (Math.abs(o.cx) <= cWallX) localRoofY = params.height + peak - cWallX * m;
                        else localRoofY = params.height + (params.width / 2 - Math.abs(o.cx)) * m;
                    }
                    maxAllowedY = localRoofY - o.h / 2 - 0.5;
                } else if (['standard', 'saltbox', 'gambrel', 'split'].includes(params.modelType)) {
                    const run = (params.modelType === 'saltbox') ? (params.width * 0.66) : (params.width / 2);
                    const ridgeX = (params.modelType === 'saltbox') ? (params.width / 2 - params.width * 0.33) : 0;
                    const localPeak = (run - Math.abs(o.cx - ridgeX)) * (params.pitch / 12);
                    maxAllowedY = (params.height + localPeak) - o.h / 2 - 0.5;
                } else if (params.modelType === 'skillion_leanto' || params.modelType === 'shed') {
                    maxAllowedY = (params.height + (o.cx + params.width / 2) * (params.pitch / 12)) - o.h / 2 - 0.5;
                }
            }
            o.cy = Math.min(o.cy, maxAllowedY);
            if (o.isDoor) o.cy = o.h / 2; else { const minY = o.h / 2; o.cy = Math.max(o.cy, minY); }
            if (checkOverlap(wall, o)) {
                o.cx += (o.cx >= 0) ? 2.0 : -2.0;
                if (checkOverlap(wall, o)) o.cy = oldY;
            }
        });
    });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerText = msg; t.className = "show px-4 py-3 rounded shadow fw-bold text-center";
    setTimeout(() => { t.className = t.className.replace("show", ""); }, 3000);
}

function showDistanceOverlay(left, right) {
    const overlay = document.getElementById('dist-overlay');
    if (!overlay) return;
    overlay.style.display = 'block'; overlay.innerHTML = `L: ${left.toFixed(2)}' | R: ${right.toFixed(2)}'`;
}

function updateBuildingLimits() {
    const reqSpace = (wallId) => {
        const ops = params.openings[wallId] || [];
        if (ops.length === 0) return 0;
        const totalW = ops.reduce((sum, o) => sum + o.w, 0);
        return totalW + (ops.length + 1) * CONFIG.minSpacing;
    };
    let minW = 10, minD = 10, maxH = params.hasWainscot ? params.wainscotHeight + 1 : 8;
    if (params.hasTwoFloors && params.firstFloorHeight + 1 > maxH) maxH = params.firstFloorHeight + 1;
    Object.keys(params.openings).forEach(w => {
        if (!params.openings[w]) return;
        const ws = reqSpace(w);
        if (w.includes('front') || w.includes('back') || w.includes('end')) minW = Math.max(minW, ws);
        if (w.includes('left') || w.includes('right')) minD = Math.max(minD, ws);
        params.openings[w].forEach(o => { const topEdge = o.cy + o.h / 2; if (topEdge + 1 > maxH) maxH = topEdge + 1; });
    });
    const wInput = document.getElementById('h-width'); const dInput = document.getElementById('h-depth');
    const hInput = document.getElementById('h-height'); const hipInput = document.getElementById('h-hipOffset');
    if (wInput) { wInput.min = minW; if (params.width < minW) { params.width = minW; if (document.activeElement !== wInput) wInput.value = minW; } }
    if (dInput) { dInput.min = minD; if (params.depth < minD) { params.depth = minD; if (document.activeElement !== dInput) dInput.value = minD; } }
    if (hInput) { hInput.min = maxH; if (params.height < maxH) { params.height = maxH; if (document.activeElement !== hInput) hInput.value = maxH; } }
    if (hipInput) {
        let maxAllowedOffset = Math.max(0.1, (params.depth / 2) - 2);
        if (['dutch_gable', 'combination'].includes(params.modelType)) maxAllowedOffset = Math.max(0.1, Math.min(params.width / 2 - 1, params.depth / 2 - 1));
        else if (['cross_hipped', 'hip_and_valley'].includes(params.modelType)) maxAllowedOffset = Math.max(0, params.width / 2 - 0.1);
        hipInput.max = maxAllowedOffset;
        if (params.hipOffset > maxAllowedOffset) { params.hipOffset = maxAllowedOffset; if (document.activeElement !== hipInput) hipInput.value = maxAllowedOffset; }
    }
    if (params.modelType === 'cross_hipped') {
        const hco = document.getElementById('h-crossOffset');
        if (hco) {
            const maxRange = Math.max(0, params.depth / 2 - params.width / 2);
            hco.min = -maxRange; hco.max = maxRange;
            params.crossOffset = THREE.MathUtils.clamp(params.crossOffset || 0, -maxRange, maxRange);
            if (document.activeElement !== hco) hco.value = params.crossOffset;
        }
    }
    if (params.modelType === 'hip_and_valley') {
        const hvlo = document.getElementById('h-hvLeftOffset'); const hvro = document.getElementById('h-hvRightOffset');
        const maxRange = Math.max(0, params.depth / 2 - params.width / 2);
        if (hvlo) { hvlo.min = -maxRange; hvlo.max = maxRange; params.hvLeftOffset = THREE.MathUtils.clamp(params.hvLeftOffset || 0, -maxRange, maxRange); if (document.activeElement !== hvlo) hvlo.value = params.hvLeftOffset; }
        if (hvro) { hvro.min = -maxRange; hvro.max = maxRange; params.hvRightOffset = THREE.MathUtils.clamp(params.hvRightOffset || 0, -maxRange, maxRange); if (document.activeElement !== hvro) hvro.value = params.hvRightOffset; }
    }
    if (params.modelType === 'skillion_leanto') {
        const hLTDepth = document.getElementById('h-leanToDepth'); const hLTHeight = document.getElementById('h-leanToHeight');
        if (hLTDepth) { hLTDepth.max = params.depth; params.leanToDepth = Math.min(params.leanToDepth, params.depth); if (document.activeElement !== hLTDepth) hLTDepth.value = params.leanToDepth; }
        if (hLTHeight) {
            const peakLean = params.leanToWidth * (params.leanToPitch / 12); const maxLH = params.height - peakLean;
            hLTHeight.max = Math.max(1, maxLH);
            if (params.leanToHeight > maxLH) { params.leanToHeight = Math.max(1, maxLH); if (document.activeElement !== hLTHeight) hLTHeight.value = params.leanToHeight; }
        }
    }
    updateDormerLimits();
}

function updateDormerLimits() {
    const run = (params.modelType === 'saltbox') ? (params.width * 0.66) : (params.width / 2);
    const m = params.pitch / 12; const peak = run * m;
    const hDormerWidth = document.getElementById('h-dormerWidth'); const hDormerDepth = document.getElementById('h-dormerDepth');
    const hDormerHeight = document.getElementById('h-dormerHeight'); const hDormerZ = document.getElementById('h-dormerZ');
    if (hDormerWidth) { hDormerWidth.max = params.depth; params.dormerWidth = Math.min(params.dormerWidth, params.depth); hDormerWidth.value = params.dormerWidth; }
    if (hDormerZ) {
        let maxZ = Math.max(0, (params.depth / 2) - (params.dormerWidth / 2));
        if (params.modelType === 'jerkinhead') {
            const actOff = Math.max(0.1, params.hipOffset);
            maxZ = Math.max(0, (params.depth / 2) - actOff - (params.dormerWidth / 2));
        }
        hDormerZ.min = -maxZ; hDormerZ.max = maxZ; params.dormerZ = THREE.MathUtils.clamp(params.dormerZ, -maxZ, maxZ); hDormerZ.value = params.dormerZ;
    }
    if (hDormerDepth) {
        const minDx = Math.max(((params.dormerWidth / 2) * m + 0.5) / m, run * 0.2); const maxDx = run;
        hDormerDepth.min = minDx; hDormerDepth.max = maxDx; params.dormerDepth = THREE.MathUtils.clamp(params.dormerDepth, minDx, maxDx); hDormerDepth.value = params.dormerDepth;
    }
    if (hDormerHeight) {
        const yRidge = params.height + peak;
        const maxDh = yRidge - ((params.dormerWidth / 2) * m) - 0.1;
        const yRoofAtFront = yRidge - m * params.dormerDepth;
        const minDh = yRoofAtFront + 0.1; const finalMinDh = Math.min(minDh, maxDh);
        hDormerHeight.min = finalMinDh; hDormerHeight.max = maxDh; params.dormerHeight = THREE.MathUtils.clamp(params.dormerHeight, finalMinDh, maxDh); hDormerHeight.value = params.dormerHeight;
    }
}

function clampOpenings() {
    Object.keys(params.openings).forEach(w => {
        let len = getWallLength(w, params);
        if (len <= 0.1) { params.openings[w] = []; return; }
        params.openings[w].forEach(o => {
            const limit = len / 2 - o.w / 2 - 0.5;
            if (limit < 0) o.cx = 0; else o.cx = THREE.MathUtils.clamp(o.cx, -limit, limit);
        });
    });
}

function updateEditorUI() {
    if (!selectedOpeningInfo) return;
    const op = params.openings[selectedOpeningInfo.wallId].find(o => o.id === selectedOpeningInfo.id);
    if (!op) return;
    document.getElementById('oe-width').value = op.w;
    document.getElementById('oe-height').value = op.h;
    document.getElementById('oe-ffl').value = Math.max(0, op.cy - op.h / 2).toFixed(1);
    document.getElementById('oe-current-size').innerText = `${op.w.toFixed(1)} x ${op.h.toFixed(1)}`;
    document.getElementById('oe-type-label').innerText = op.isDoor ? 'Door' : 'Window';
    let svgIcon = SVG_WINDOW_1;
    if (op.type === 'window_2') svgIcon = SVG_WINDOW_2;
    else if (op.type === 'window_3') svgIcon = SVG_WINDOW_3;
    else if (op.type === 'door_1') svgIcon = SVG_DOOR_1;
    else if (op.type === 'door_2') svgIcon = SVG_DOOR_2;
    else if (op.type === 'door_3' || op.type === 'door_4') svgIcon = SVG_DOOR_3;
    document.getElementById('oe-svg').innerHTML = svgIcon;
    let wallLen = getWallLength(selectedOpeningInfo.wallId, params);
    const distLeft = wallLen / 2 + op.cx - op.w / 2;
    const distRight = wallLen / 2 - op.cx - op.w / 2;
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
            op.w = std.w; op.h = std.h;
            if (op.isDoor) op.cy = op.h / 2; else op.cy = currentFFL + op.h / 2;
            clampOpenings(); sanitizeAndAlign(); updateScene(); updateEditorUI();
        };
    } else { warningEl.style.display = 'none'; }
}

function reHighlightSelection() {
    if (!selectedOpeningInfo) return;
    scene.traverse(child => { if (child.userData && child.userData.id === selectedOpeningInfo.id) child.material.color.setHex(0xff0000); });
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let dragMesh = null, dragOffset = new THREE.Vector3(), dragPlane = new THREE.Plane();

renderer.domElement.addEventListener('dblclick', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const interactables = [];
    scene.traverse(child => { if (child.userData && child.userData.isOpening) interactables.push(child); });
    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length > 0) {
        dragMesh = hits[0].object; controls.enabled = false;
        dragPlane.setFromNormalAndCoplanarPoint(hits[0].face.normal, hits[0].point);
        dragOffset.copy(hits[0].point).sub(dragMesh.position);
        document.getElementById('canvas-container').style.cursor = 'grabbing';
    }
});
renderer.domElement.addEventListener('pointermove', (e) => {
    if (!dragMesh) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, point)) {
        const localPos = dragMesh.parent.worldToLocal(point.clone().sub(dragOffset));
        const wallId = dragMesh.userData.wallId;
        let wallLen = getWallLength(wallId, params);
        const minX = -wallLen / 2 + dragMesh.userData.w / 2 + 0.5;
        const maxX = wallLen / 2 - dragMesh.userData.w / 2 - 0.5;
        dragMesh.position.x = Math.max(minX, Math.min(maxX, localPos.x));
        const distLeft = wallLen / 2 + dragMesh.position.x - dragMesh.userData.w / 2;
        const distRight = wallLen / 2 - dragMesh.position.x - dragMesh.userData.w / 2;
        showDistanceOverlay(distLeft, distRight);
        if (!dragMesh.userData.isDoor) {
            let maxY = params.height - dragMesh.userData.h / 2 - 0.5;
            if (params.modelType === 'm_shaped' && (wallId === 'front' || wallId === 'back')) {
                const pX = params.width / 6; const m = params.pitch / 12;
                if (Math.abs(dragMesh.position.x) >= pX) maxY = params.height + (params.width / 2 - Math.abs(dragMesh.position.x)) * m - 1.0 - dragMesh.userData.h / 2;
                else maxY = params.height + Math.abs(dragMesh.position.x) * (m * 2) - 1.0 - dragMesh.userData.h / 2;
            } else if ((params.modelType === 'shed' || params.modelType === 'skillion_leanto') && (wallId === 'front' || wallId === 'back')) {
                maxY = params.height + (dragMesh.position.x + params.width / 2) * (params.pitch / 12) - 1.0 - dragMesh.userData.h / 2;
            } else if (params.modelType === 'jerkinhead' && (wallId === 'front' || wallId === 'back')) {
                const m = params.pitch / 12; const peak = (params.width / 2) * m;
                const actOff = Math.max(0.1, params.hipOffset); const cWallX = actOff - 0.5;
                if (cWallX > 0 && Math.abs(dragMesh.position.x) <= cWallX) maxY = params.height + peak - cWallX * m - 1.0 - dragMesh.userData.h / 2;
                else maxY = params.height + (params.width / 2 - Math.abs(dragMesh.position.x)) * m - 1.0 - dragMesh.userData.h / 2;
            }
            const minY = dragMesh.userData.h / 2;
            dragMesh.position.y = Math.max(minY, Math.min(maxY, localPos.y));
        }
    }
});
renderer.domElement.addEventListener('pointerdown', (e) => {
    if (dragMesh) {
        const op = params.openings[dragMesh.userData.wallId].find(o => o.id === dragMesh.userData.id);
        if (op) { op.cx = dragMesh.position.x; op.cy = dragMesh.position.y; }
        dragMesh = null; controls.enabled = true;
        document.getElementById('canvas-container').style.cursor = 'grab';
        document.getElementById('dist-overlay').style.display = 'none';
        updateScene(); updateEditorUI(); return;
    }
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const interactables = [];
    scene.traverse(child => { if (child.userData && child.userData.isOpening) interactables.push(child); });
    const hits = raycaster.intersectObjects(interactables, false);
    const editor = document.getElementById('opening-editor');
    if (hits.length > 0) {
        const hitMesh = hits[0].object;
        selectedOpeningInfo = { wallId: hitMesh.userData.wallId, id: hitMesh.userData.id };
        if (editor) editor.style.display = 'block';
        updateEditorUI();
        interactables.forEach(m => m.material.color.setHex(0x111111));
        hitMesh.material.color.setHex(0xff0000);
    } else {
        selectedOpeningInfo = null;
        if (editor) editor.style.display = 'none';
        interactables.forEach(m => m.material.color.setHex(0x111111));
    }
});
document.getElementById('oe-width')?.addEventListener('input', (e) => {
    if (!selectedOpeningInfo) return; const val = parseFloat(e.target.value); if (isNaN(val)) return;
    const op = params.openings[selectedOpeningInfo.wallId].find(o => o.id === selectedOpeningInfo.id);
    if (op) { op.w = val; clampOpenings(); updateScene(); updateEditorUI(); }
});
document.getElementById('oe-height')?.addEventListener('input', (e) => {
    if (!selectedOpeningInfo) return; const val = parseFloat(e.target.value); if (isNaN(val)) return;
    const op = params.openings[selectedOpeningInfo.wallId].find(o => o.id === selectedOpeningInfo.id);
    if (op) {
        const currentFFL = op.cy - op.h / 2; op.h = val;
        if (op.isDoor) op.cy = op.h / 2; else op.cy = currentFFL + op.h / 2;
        clampOpenings(); sanitizeAndAlign(); updateScene(); updateEditorUI();
    }
});
document.getElementById('oe-ffl')?.addEventListener('input', (e) => {
    if (!selectedOpeningInfo) return; const val = parseFloat(e.target.value); if (isNaN(val)) return;
    const op = params.openings[selectedOpeningInfo.wallId].find(o => o.id === selectedOpeningInfo.id);
    if (op && !op.isDoor) { op.cy = val + op.h / 2; sanitizeAndAlign(); updateScene(); updateEditorUI(); }
});
document.getElementById('btn-delete-opening')?.addEventListener('click', () => {
    if (!selectedOpeningInfo) return;
    params.openings[selectedOpeningInfo.wallId] = params.openings[selectedOpeningInfo.wallId].filter(o => o.id !== selectedOpeningInfo.id);
    selectedOpeningInfo = null; document.getElementById('opening-editor').style.display = 'none'; updateScene();
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
    let wallLen = getWallLength(wall, params);
    if (!params.openings[wall]) params.openings[wall] = [];
    const current = params.openings[wall];
    let cx = (current.length > 0) ? current[current.length - 1].cx + current[current.length - 1].w / 2 + CONFIG.minSpacing + w / 2 : -wallLen / 2 + CONFIG.minSpacing + w / 2;
    if (cx + w / 2 + CONFIG.minSpacing <= wallLen / 2) {
        params.openings[wall].push({ id: elementIdCounter++, type: typeVal, w, h, isDoor, cx, cy: isDoor ? h / 2 : h / 2 + 3 });
        updateScene();
    } else { showToast(`Not enough space on this wall!`); }
});
document.getElementById('btn-clear-elements')?.addEventListener('click', () => {
    Object.keys(params.openings).forEach(k => params.openings[k] = []);
    selectedOpeningInfo = null; document.getElementById('opening-editor').style.display = 'none'; updateScene();
});

function createPanelTextures(name, coverage, isRoof) {
    const size = 1024;
    const canvasMap = document.createElement('canvas'); const canvasBump = document.createElement('canvas');
    canvasMap.width = canvasBump.width = size; canvasMap.height = canvasBump.height = size;
    const ctxMap = canvasMap.getContext('2d'); const ctxBump = canvasBump.getContext('2d');
    ctxMap.fillStyle = '#ffffff'; ctxMap.fillRect(0, 0, size, size);
    ctxBump.fillStyle = '#808080'; ctxBump.fillRect(0, 0, size, size);
    const isVert = isRoof ? true : !params.horizontalSiding;
    const drawProfile = (x, y, w, h, type) => {
        let gMap = isVert ? ctxMap.createLinearGradient(x, 0, x + w, 0) : ctxMap.createLinearGradient(0, y, 0, y + h);
        let gBump = isVert ? ctxBump.createLinearGradient(x, 0, x + w, 0) : ctxBump.createLinearGradient(0, y, 0, y + h);
        if (type === 'rib') {
            gMap.addColorStop(0, 'rgba(0,0,0,0.3)'); gMap.addColorStop(0.2, 'rgba(255,255,255,0.4)');
            gMap.addColorStop(0.8, 'rgba(255,255,255,0.4)'); gMap.addColorStop(1, 'rgba(0,0,0,0.3)');
            gBump.addColorStop(0, '#404040'); gBump.addColorStop(0.2, '#ffffff');
            gBump.addColorStop(0.8, '#ffffff'); gBump.addColorStop(1, '#404040');
        } else {
            gMap.addColorStop(0, 'rgba(0,0,0,0.2)'); gMap.addColorStop(0.5, 'rgba(255,255,255,0.3)');
            gMap.addColorStop(1, 'rgba(0,0,0,0.2)');
            gBump.addColorStop(0, '#404040'); gBump.addColorStop(0.5, '#ffffff'); gBump.addColorStop(1, '#404040');
        }
        ctxMap.fillStyle = gMap; ctxBump.fillStyle = gBump;
        isVert ? (ctxMap.fillRect(x, 0, w, size), ctxBump.fillRect(x, 0, w, size)) : (ctxMap.fillRect(0, y, size, h), ctxBump.fillRect(0, y, size, h));
    };
    const label = name ? name.toUpperCase() : "";
    if (label.includes("CORRUGATED")) {
        for (let i = 0; i < 14; i++) drawProfile(i * (size / 14), i * (size / 14), size / 14, size / 14, 'wave');
    } else if (label.includes("SNAP SEAM") || label.includes("SNAP-SEAM")) {
        drawProfile(0, 0, 25, 25, 'seam');
    } else {
        for (let i = 0; i < 4; i++) drawProfile(i * (size / 4), i * (size / 4), 55, 55, 'rib');
    }
    const mapTex = new THREE.CanvasTexture(canvasMap); const bumpTex = new THREE.CanvasTexture(canvasBump);
    mapTex.wrapS = mapTex.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    const currentScale = isRoof ? CONFIG.textureScaleRoof : CONFIG.textureScaleWall;
    const repX = isRoof ? (params.depth / (coverage / 12)) / currentScale : (isVert ? (params.width / (coverage / 12)) / currentScale : (params.height / (coverage / 12)) / currentScale);
    const repY = isRoof ? 1 / currentScale : (isVert ? 1 / currentScale : (params.width / (coverage / 12)) / currentScale);
    mapTex.repeat.set(repX, repY); bumpTex.repeat.set(repX, repY);
    return { map: mapTex, bumpMap: bumpTex };
}

function updateMaterials() {
    const rEl = document.getElementById('roof-panel-model');
    const wEl = document.getElementById('wall-panel-model');
    const ffEl = document.getElementById('first-floor-panel-model');
    if (!rEl || !wEl) return;
    if (roofMat.map) { roofMat.map.dispose(); roofMat.bumpMap.dispose(); }
    if (wallMat.map) { wallMat.map.dispose(); wallMat.bumpMap.dispose(); }
    if (firstFloorMat.map) { firstFloorMat.map.dispose(); firstFloorMat.bumpMap.dispose(); }
    const rData = createPanelTextures(rEl.value, selectedRoofWidth, true);
    const wData = createPanelTextures(wEl.value, selectedWallWidth, false);
    const ffPanelValue = ffEl && ffEl.value ? ffEl.value : wEl.value;
    const ffData = createPanelTextures(ffPanelValue, selectedWallWidth, false);
    roofMat.map = rData.map; roofMat.bumpMap = rData.bumpMap; roofMat.bumpScale = 0.02; roofMat.needsUpdate = true;
    wallMat.map = wData.map; wallMat.bumpMap = wData.bumpMap; wallMat.bumpScale = 0.01; wallMat.needsUpdate = true;
    firstFloorMat.map = ffData.map; firstFloorMat.bumpMap = ffData.bumpMap; firstFloorMat.bumpScale = 0.01; firstFloorMat.needsUpdate = true;
    wainscotMat.map = wData.map; wainscotMat.bumpMap = wData.bumpMap; wainscotMat.bumpScale = 0.01; wainscotMat.needsUpdate = true;
    const splitLike = (params.modelType === 'split' || params.modelType === 'gambrel');
    const rCol = document.getElementById('roof-color'); const wCol = document.getElementById('wall-color');
    gableMat.map = splitLike ? rData.map : wData.map;
    gableMat.color.setHex(splitLike ? Number(rCol?.value || 0) : Number(wCol?.value || 0));
    gableMat.needsUpdate = true;
}

// НОВАЯ МАТЕМАТИКА ВЫРАВНИВАНИЯ
function getPanelBoundaries(totalWidth, coverage, alignment) {
    let boundaries = [];
    if (alignment === 'right') {
        let firstW = totalWidth % coverage;
        if (firstW < 0.001) firstW = coverage;
        if (firstW < totalWidth) {
            boundaries.push([0, firstW]);
            for (let x = firstW; x < totalWidth - 0.001; x += coverage) boundaries.push([x, Math.min(x + coverage, totalWidth)]);
        } else { boundaries.push([0, totalWidth]); }
    } else if (alignment === 'middle') {
        let mid = totalWidth / 2; let leftStart = mid;
        while (leftStart > 0) leftStart -= coverage;
        for (let x = leftStart; x < totalWidth - 0.001; x += coverage) {
            let s = Math.max(0, x); let e = Math.min(totalWidth, x + coverage);
            if (e - s > 0.001) boundaries.push([s, e]);
        }
    } else { // 'left'
        for (let x = 0; x < totalWidth - 0.001; x += coverage) boundaries.push([x, Math.min(x + coverage, totalWidth)]);
    }
    return boundaries;
}

function calculateInfo() {
    const { width, depth, height, pitch, modelType, isVented, ventOffset, eaveOverhangExt, panelAlignment } = params;
    
    const alignment = panelAlignment || 'left';
    const trimLen = params.trimLength ? Number(params.trimLength) : 10.5; // НОВАЯ ДЛИНА ТРИМОВ
    const m = pitch / 12;
    const O = params.hasOverhang ? Number(params.overhang) : 0;
    const eaveExtFt = params.hasOverhang ? ((Number(eaveOverhangExt) || 0) / 12) : 0;
    const effectiveWidth = width + (O + eaveExtFt) * 2;
    const effectiveDepth = depth + (O + eaveExtFt) * 2;
    
    let rafterLength = Math.sqrt(Math.pow(effectiveWidth / 2, 2) + Math.pow((effectiveWidth / 2) * m, 2));
    if (modelType === 'flat') rafterLength = effectiveWidth / 2;
    if (modelType === 'shed' || modelType === 'skillion_leanto') {
        rafterLength = Math.sqrt(Math.pow(effectiveWidth, 2) + Math.pow(effectiveWidth * m, 2));
    }
    let finalSheetLength = rafterLength;
    if (isVented) finalSheetLength -= (ventOffset / 12);
    
    const baseArea = effectiveWidth * effectiveDepth;
    let roofArea = baseArea * Math.sqrt(1 + m * m);
    if (!['standard', 'butterfly', 'hip', 'pyramid', 'saltbox', 'gambrel', 'jerkinhead'].includes(modelType)) {
        roofArea = baseArea * 1.1;
    }
    
    const perimeter = 2 * (width + depth);
    const wallArea = perimeter * height;
    const roofSelect = document.getElementById('roof-panel-model');
    const roofPanelName = roofSelect && roofSelect.options.length > 0 ? roofSelect.options[roofSelect.selectedIndex].text.toUpperCase() : '';
    let isSnapLok = roofPanelName.includes('SNAP SEAM') || roofPanelName.includes('SNAP-SEAM');
    
    let roofCovFt = selectedRoofWidth / 12;
    let wallCovFt = selectedWallWidth / 12;
    
    let roofPcs = 0; let totalRoofLF = 0;
    
    // ИСПРАВЛЕНИЕ КАЛЬКУЛЯЦИИ ЛИСТОВ КРЫШИ ПО НОВОЙ МАТЕМАТИКЕ
    if (modelType === 'hip' || modelType === 'pyramid') {
        let longestSide = Math.max(effectiveWidth, effectiveDepth);
        let pcsPerSide = getPanelBoundaries(longestSide, roofCovFt, alignment).length;
        if (isSnapLok && pcsPerSide % 2 !== 0) pcsPerSide++;
        roofPcs = (pcsPerSide * 2) + 4;
        totalRoofLF = roofPcs * finalSheetLength;
    } else {
        let runs = (modelType === 'shed' || modelType === 'skillion_leanto' || modelType === 'flat') ? 1 : 2;
        let pcsPerSide = getPanelBoundaries(effectiveDepth, roofCovFt, alignment).length;
        if (isSnapLok && pcsPerSide % 2 !== 0) pcsPerSide++;
        roofPcs = pcsPerSide * runs;
        totalRoofLF = roofPcs * finalSheetLength;
    }
    
    // ИСПРАВЛЕНИЕ КАЛЬКУЛЯЦИИ СТЕН
    let wallPcsFrontBack = getPanelBoundaries(width, wallCovFt, alignment).length;
    let wallPcsLeftRight = getPanelBoundaries(depth, wallCovFt, alignment).length;
    let wallPcs = (wallPcsFrontBack * 2) + (wallPcsLeftRight * 2);
    let wallSheetLen = Math.round(height * 24) / 24;
    
    const getTrimPcs = (len) => len <= 0 ? 0 : Math.ceil(len / trimLen); // ИСПОЛЬЗУЕТСЯ НОВАЯ ДЛИНА
    
    let eaveLF = (modelType === 'shed' || modelType === 'skillion_leanto') ? effectiveDepth : effectiveDepth * 2;
    if (modelType === 'hip' || modelType === 'pyramid') eaveLF = 2 * (effectiveWidth + effectiveDepth);
    let eaveTrimPcs = 0;
    if (modelType === 'hip' || modelType === 'pyramid') {
        eaveTrimPcs = (getTrimPcs(effectiveWidth) * 2) + (getTrimPcs(effectiveDepth) * 2);
    } else {
        eaveTrimPcs = getTrimPcs(effectiveDepth) * ((modelType === 'shed' || modelType === 'skillion_leanto') ? 1 : 2);
    }
    
    let gableLF = (modelType === 'standard' || modelType === 'butterfly') ? rafterLength * 4 : 0;
    if (modelType === 'shed') gableLF = rafterLength * 2;
    let gableTrimPcs = gableLF > 0 ? getTrimPcs(rafterLength) * (gableLF / rafterLength) : 0;
    let ridgeLF = (modelType === 'hip') ? Math.abs(effectiveDepth - effectiveWidth) : effectiveDepth;
    let ridgeTrimPcs = (modelType === 'shed' || modelType === 'flat' || modelType === 'pyramid') ? 0 : getTrimPcs(ridgeLF);
    
    let hipLF = 0;
    if (modelType === 'hip' || modelType === 'pyramid') {
        let hipRafter = Math.sqrt(Math.pow(rafterLength, 2) + Math.pow(effectiveWidth / 2, 2));
        hipLF = hipRafter * 4;
    }
    let hipTrimPcs = hipLF > 0 ? getTrimPcs(hipLF / 4) * 4 : 0;
    
    let valleyLF = 0;
    if (params.modelType === 'hip_and_valley' || params.modelType === 'cross_hipped') {
        valleyLF = rafterLength * 4;
    }
    let valleyTrimPcs = valleyLF > 0 ? getTrimPcs(valleyLF / 4) * 4 : 0;
    
    let woodScrews = 0; let pancakeScrews = 0; let stitchScrews = 0; let roofClips = 0;
    let screwType = PRODUCT_CODES.screw_wood;
    
    const rowClips = document.getElementById('row-clips');
    if (isSnapLok) {
        pancakeScrews = Math.ceil(totalRoofLF * 12 / 15);
        woodScrews += Math.ceil(eaveLF * 12 / 6);
        let totalTrimLF = (eaveTrimPcs + gableTrimPcs + ridgeTrimPcs + hipTrimPcs + valleyTrimPcs) * trimLen;
        stitchScrews += Math.ceil(totalTrimLF);
        stitchScrews += Math.ceil(ridgeLF * 2);
        woodScrews += Math.ceil(wallArea * 0.75);
        screwType = `Pancake: ${pancakeScrews}, Stitch: ${stitchScrews}, Wood: ${woodScrews}`;
        cachedScrews = woodScrews + pancakeScrews + stitchScrews;
        roofClips = Math.ceil(roofArea / 2.0);
        if (rowClips) {
            rowClips.style.setProperty('display', 'flex', 'important');
            const clipEl = document.getElementById('mat-clips');
            if (clipEl) clipEl.innerText = `${roofClips} pcs`;
        }
    } else {
        woodScrews += Math.ceil(roofArea * 1.0);
        woodScrews += Math.ceil(wallArea * 0.75);
        cachedScrews = woodScrews;
        screwType = params.hasEnvironment ? PRODUCT_CODES.screw_metal : PRODUCT_CODES.screw_wood;
        if (rowClips) { rowClips.style.setProperty('display', 'none', 'important'); }
    }
    
    // БУТИЛОВАЯ ЛЕНТА
    const butylTapeLF = totalRoofLF;
    const tapeRow = document.getElementById('row-butyl-tape');
    const tapeMat = document.getElementById('mat-butyl-tape');
    if (tapeRow && tapeMat) {
        tapeRow.style.display = 'flex';
        tapeMat.innerText = `${butylTapeLF.toFixed(1)} LF`;
    }
    
    const setText = (id, txt) => { const e = document.getElementById(id); if (e) e.innerText = txt; };
    
    setText('spec-roof-area', `${roofArea.toFixed(1)} ft²`);
    setText('spec-wall-area', `${wallArea.toFixed(1)} ft²`);
    setText('mat-roof-pcs', `${roofPcs} pcs (@ ${finalSheetLength.toFixed(2)}' ea)`);
    setText('mat-wall-pcs', `${wallPcs} pcs (@ ${wallSheetLen.toFixed(2)}' ea)`);
    
    let ridgeText = `${Math.ceil(ridgeTrimPcs)} pcs`;
    if (hipTrimPcs > 0) ridgeText += ` / Hip: ${Math.ceil(hipTrimPcs)} pcs`;
    if (valleyTrimPcs > 0) ridgeText += ` / Valley: ${Math.ceil(valleyTrimPcs)} pcs`;
    setText('mat-ridge', ridgeText);
    
    if (isSnapLok) setText('mat-screws', screwType);
    else setText('mat-screws', `${cachedScrews} pcs (${screwType})`);
    
    return {
        finalSheetLength, screwType, roofArea, wallArea, roofPcs, wallPcs,
        ridgeTrimPcs, hipTrimPcs, valleyTrimPcs, isSnapLok, roofClips, butylTapeLF, trimLen
    };
}

const btnPrint = document.getElementById('btn-print');
if (btnPrint) {
    btnPrint.addEventListener('click', () => {
        if (!currentHouse) return;
        const info = calculateInfo();
        printProjectPDF({
            params, currentHouse, renderer, scene, camera, grid, grassMesh, 
            cachedScrews, selectedWallWidth, selectedRoofWidth,
            finalSheetLength: info.finalSheetLength, screwType: info.screwType,
            productCodes: PRODUCT_CODES,
            getSelectText: (id) => {
                const el = document.getElementById(id);
                return el && el.options.length > 0 ? el.options[el.selectedIndex].text : 'N/A';
            }
        });
    });
}

function updateScene() {
    const mEl = document.getElementById('building-model-type');
    if (mEl) params.modelType = mEl.value;
    const paEl = document.getElementById('h-panel-alignment');
    if (paEl) params.panelAlignment = paEl.value;
    const tlEl = document.getElementById('h-trim-length');
    if (tlEl) params.trimLength = parseFloat(tlEl.value);
    
    params.hasTwoFloors = document.getElementById('two-floors-enable')?.checked || false;
    params.hasWainscot = document.getElementById('wainscot-enable')?.checked || false;
    params.hasDormer = document.getElementById('d-enable')?.checked || false;
    params.horizontalSiding = document.getElementById('w-tex-rot')?.checked || false;
    params.hasEnvironment = document.getElementById('env-enable')?.checked || false;
    params.hasOverhang = document.getElementById('oh-enable')?.checked || false;
    params.isVented = document.getElementById('vented-enable')?.checked || false;
    params.hasClosures = document.getElementById('closures-enable')?.checked || false;
    params.hasSoffit = params.hasOverhang;
    params.hasGableDivider = document.getElementById('gable-divider-enable')?.checked || false;
    
    const ohControls = document.getElementById('overhang-controls');
    if (ohControls) ohControls.style.display = params.hasOverhang ? 'block' : 'none';
    const ventControls = document.getElementById('vent-controls');
    if (ventControls) ventControls.style.display = params.isVented ? 'block' : 'none';
    const gableDivControls = document.getElementById('gable-divider-controls');
    if (gableDivControls) gableDivControls.style.display = params.hasGableDivider ? 'block' : 'none';
    const ffControls = document.getElementById('first-floor-controls');
    if (ffControls) ffControls.style.display = params.hasTwoFloors ? 'block' : 'none';
    const ffPanelGroup = document.getElementById('ff-panel-group');
    if (ffPanelGroup) ffPanelGroup.style.display = params.hasTwoFloors ? 'block' : 'none';
    const ffColorGroup = document.getElementById('ff-color-group');
    if (ffColorGroup) ffColorGroup.style.display = params.hasTwoFloors ? 'block' : 'none';
    const wsControls = document.getElementById('wainscot-controls');
    if (wsControls) wsControls.style.display = params.hasWainscot ? 'block' : 'none';
    
    const hipGroup = document.getElementById('hip-offset-group');
    if (hipGroup) hipGroup.style.display = (['hip', 'mansard', 'jerkinhead', 'dutch_gable', 'combination', 'cross_hipped', 'hip_and_valley'].includes(params.modelType)) ? 'block' : 'none';
    const upGroup = document.getElementById('upper-pitch-group');
    if (upGroup) upGroup.style.display = (['dutch_gable', 'combination'].includes(params.modelType)) ? 'block' : 'none';
    const hvControls = document.getElementById('hip-valley-controls');
    if (hvControls) hvControls.style.display = (params.modelType === 'hip_and_valley') ? 'block' : 'none';
    const chControls = document.getElementById('cross-hipped-controls');
    if (chControls) chControls.style.display = (params.modelType === 'cross_hipped') ? 'block' : 'none';
    const leanToControls = document.getElementById('leanto-controls');
    if (leanToControls) leanToControls.style.display = (params.modelType === 'skillion_leanto') ? 'block' : 'none';
    
    const wdWall = document.getElementById('wd-wall');
    if (wdWall) {
        const isHV = (params.modelType === 'hip_and_valley');
        Array.from(wdWall.options).forEach(opt => {
            if (['left_front', 'left_back', 'right_front', 'right_back', 'wing_l_front', 'wing_l_back', 'wing_l_end', 'wing_r_front', 'wing_r_back', 'wing_r_end'].includes(opt.value)) {
                opt.style.display = isHV ? 'block' : 'none';
            } else if (['left', 'right'].includes(opt.value)) {
                opt.style.display = isHV ? 'none' : 'block';
            }
        });
        if (isHV && ['left', 'right'].includes(wdWall.value)) wdWall.value = 'front';
        if (!isHV && ['left_front', 'left_back', 'right_front', 'right_back', 'wing_l_front', 'wing_l_back', 'wing_l_end', 'wing_r_front', 'wing_r_back', 'wing_r_end'].includes(wdWall.value)) wdWall.value = 'front';
    }
    
    updateEnvironment(); enforceGeometryConstraints(); sanitizeAndAlign(); updateBuildingLimits();
    
    const rCol = document.getElementById('roof-color'); const wCol = document.getElementById('wall-color');
    const ffCol = document.getElementById('first-floor-color'); const tCol = document.getElementById('trim-color');
    const wsCol = document.getElementById('wainscot-color'); const soffitCol = document.getElementById('soffit-color');
    const gdCol = document.getElementById('gable-divider-color');
    
    if (rCol) roofMat.color.setHex(Number(rCol.value)); if (wCol) wallMat.color.setHex(Number(wCol.value));
    if (ffCol) firstFloorMat.color.setHex(Number(ffCol.value)); if (tCol) trimMat.color.setHex(Number(tCol.value));
    if (wsCol) wainscotMat.color.setHex(Number(wsCol.value)); if (soffitCol) soffitMat.color.setHex(Number(soffitCol.value));
    if (gdCol) gableDividerMat.color.setHex(Number(gdCol.value));
    
    const splitLike = (params.modelType === 'split' || params.modelType === 'gambrel');
    gableMat.color.setHex(splitLike ? Number(rCol?.value || 0) : Number(wCol?.value || 0));
    
    if (currentHouse) {
        scene.remove(currentHouse);
        currentHouse.traverse(child => { if (child.isMesh && child.geometry) { child.geometry.dispose(); } });
    }
    
    currentHouse = HouseGenerator.createBuilding(params, {
        wall: wallMat, firstFloor: firstFloorMat, roof: roofMat, gable: gableMat,
        trim: trimMat, wainscot: wainscotMat, soffit: soffitMat, gableDivider: gableDividerMat
    });
    scene.add(currentHouse);
    calculateInfo(); reHighlightSelection(); syncColorsAndTexturesToParams();
} 

[{ id: 'h-width', p: 'width' }, { id: 'h-depth', p: 'depth' }, { id: 'h-height', p: 'height' }, { id: 'h-pitch', p: 'pitch' }, { id: 'h-overhang', p: 'overhang' }, { id: 'h-upperPitch', p: 'upperPitch' }, { id: 'h-hipOffset', p: 'hipOffset' }, { id: 'h-firstFloorHeight', p: 'firstFloorHeight' }, { id: 'h-wainscotHeight', p: 'wainscotHeight' }, { id: 'h-leanToWidth', p: 'leanToWidth' }, { id: 'h-leanToDepth', p: 'leanToDepth' }, { id: 'h-leanToHeight', p: 'leanToHeight' }, { id: 'h-leanToPitch', p: 'leanToPitch' }, { id: 'h-crossDepth', p: 'crossDepth' }, { id: 'h-crossOffset', p: 'crossOffset' }, { id: 'h-hvLeftExt', p: 'hvLeftExt' }, { id: 'h-hvRightExt', p: 'hvRightExt' }, { id: 'h-hvLeftOffset', p: 'hvLeftOffset' }, { id: 'h-hvRightOffset', p: 'hvRightOffset' }, { id: 'h-dormerWidth', p: 'dormerWidth' }, { id: 'h-dormerDepth', p: 'dormerDepth' }, { id: 'h-dormerHeight', p: 'dormerHeight' }, { id: 'h-dormerZ', p: 'dormerZ' }, { id: 'h-vent-offset', p: 'ventOffset' }, { id: 'h-eave-ext', p: 'eaveOverhangExt' }, { id: 'h-dormerPitch', p: 'dormerPitch' }].forEach(m => {
    const el = document.getElementById(m.id);
    if (el) {
        el.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) { params[m.p] = val; enforceGeometryConstraints(); updateScene(); }
        });
        el.addEventListener('blur', (e) => { e.target.value = params[m.p]; });
    }
});

document.getElementById('h-dormerSide')?.addEventListener('change', (e) => { params.dormerSide = e.target.value; updateScene(); });
document.getElementById('h-panel-alignment')?.addEventListener('change', updateScene);
document.getElementById('h-trim-length')?.addEventListener('change', (e) => {
    params.trimLength = parseFloat(e.target.value);
    calculateInfo();
});

['d-enable', 'two-floors-enable', 'wainscot-enable', 'env-enable', 'w-tex-rot', 'oh-enable', 'vented-enable', 'closures-enable', 'gable-divider-enable'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
        updateScene(); if (id === 'w-tex-rot') updateMaterials();
    });
});

['roof-color', 'wall-color', 'first-floor-color', 'trim-color', 'wainscot-color', 'soffit-color', 'gable-divider-color'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateScene);
});

['roof-panel-model', 'wall-panel-model', 'first-floor-panel-model'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => { syncColorsAndTexturesToParams(); updateMaterials(); });
});
document.getElementById('building-model-type')?.addEventListener('change', updateScene);

let panelScene, panelCamera, panelRenderer, panelControls, currentPanelMesh;

function initPanelViewer() {
    const container = document.getElementById('panel-canvas-container');
    if (!container || panelRenderer) return;
    panelScene = new THREE.Scene(); panelScene.background = new THREE.Color(0xf0f4f8);
    panelCamera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    panelCamera.position.set(2, 2, 2);
    panelRenderer = new THREE.WebGLRenderer({ antialias: true });
    panelRenderer.setSize(container.clientWidth, container.clientHeight);
    panelRenderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(panelRenderer.domElement);
    panelControls = new OrbitControls(panelCamera, panelRenderer.domElement); panelControls.enableDamping = true;
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6); panelScene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5); dirLight.position.set(5, 10, 7); panelScene.add(dirLight);
    function animatePanel() { requestAnimationFrame(animatePanel); panelControls.update(); panelRenderer.render(panelScene, panelCamera); }
    animatePanel();
}

window.openPanelModal = function(selectId) {
    const select = document.getElementById(selectId);
    if (!select || select.options.length === 0) return;
    const rawName = select.options[select.selectedIndex].text;
    const fileName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.obj';
    const themeUrl = wpApiSettings?.themeUrl || '.';
    const url = `${themeUrl.replace(/\/$/, '')}/models/${fileName}`;
    document.getElementById('panelModalLabel').innerText = rawName;
    const modal = new bootstrap.Modal(document.getElementById('panelModal')); modal.show();
    setTimeout(() => {
        initPanelViewer();
        const container = document.getElementById('panel-canvas-container');
        panelCamera.aspect = container.clientWidth / container.clientHeight; panelCamera.updateProjectionMatrix();
        panelRenderer.setSize(container.clientWidth, container.clientHeight);
        const loader = new OBJLoader();
        document.getElementById('panel-loading').style.display = 'block';
        if (currentPanelMesh) { panelScene.remove(currentPanelMesh); currentPanelMesh = null; }
        loader.load(url, (object) => {
            document.getElementById('panel-loading').style.display = 'none';
            currentPanelMesh = object;
            const mat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide });
            object.traverse((child) => { if (child.isMesh) child.material = mat; });
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.sub(center);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            panelCamera.position.set(maxDim * 1.5, maxDim * 1.5, maxDim * 1.5);
            panelCamera.lookAt(0, 0, 0); panelControls.target.set(0, 0, 0);
            panelScene.add(object);
        }, undefined, (error) => {
            document.getElementById('panel-loading').style.display = 'none';
            showToast(`Unable to load ${fileName}.`);
        });
    }, 200);
};
document.getElementById('btn-view-roof')?.addEventListener('click', () => window.openPanelModal('roof-panel-model'));
document.getElementById('btn-view-wall')?.addEventListener('click', () => window.openPanelModal('wall-panel-model'));

function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
animate();

if (typeof setupPanelUI === 'function') {
    setupPanelUI('roof', () => {
        const checkedCov = document.querySelector('input[name="roof-cov"]:checked');
        if (checkedCov) selectedRoofWidth = parseFloat(checkedCov.value);
        updateMaterials(); calculateInfo();
    });
    setupPanelUI('wall', () => {
        const checkedCov = document.querySelector('input[name="wall-cov"]:checked');
        if (checkedCov) selectedWallWidth = parseFloat(checkedCov.value);
        const wSelect = document.getElementById('wall-panel-model'); const ffSelect = document.getElementById('first-floor-panel-model');
        if (wSelect && ffSelect && ffSelect.options.length === 0) { ffSelect.innerHTML = wSelect.innerHTML; }
        updateMaterials(); calculateInfo();
    });
}

function applyDefaultGauges() {
    const exclusions = ['SNAP', 'WS PANEL', 'AWR', 'WIDESPAN', 'DIAMOND', 'ULTRASPAN', 'ELITE', 'DECK MATE'];
    const selects = ['roof-panel-model', 'wall-panel-model'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.options.length === 0) return;
        let currentText = el.options[el.selectedIndex].text.toUpperCase();
        let isExcluded = exclusions.some(ex => currentText.includes(ex));
        if (!isExcluded) {
            let baseNameMatch = currentText.match(/^([^\d]+)/);
            if (baseNameMatch) {
                let baseName = baseNameMatch[1].trim();
                for (let i = 0; i < el.options.length; i++) {
                    let optText = el.options[i].text.toUpperCase();
                    if (optText.includes(baseName) && (optText.includes('28G') || optText.includes('28 GAUGE') || optText.includes('28 GA'))) {
                        el.selectedIndex = i; break;
                    }
                }
            }
        } else if (currentText.includes('SNAP') && (currentText.includes('12') || currentText.includes('16'))) {
            let is12 = currentText.includes('12'); let is16 = currentText.includes('16');
            for (let i = 0; i < el.options.length; i++) {
                let optText = el.options[i].text.toUpperCase();
                if (optText.includes('SNAP') && ((is12 && optText.includes('12')) || (is16 && optText.includes('16'))) && (optText.includes('26G') || optText.includes('26 GAUGE') || optText.includes('26 GA'))) {
                    el.selectedIndex = i; break;
                }
            }
        }
    });
}

setTimeout(async () => {
    WESTMAN_COLORS.forEach(c => {
        ['roof-color', 'wall-color', 'first-floor-color', 'trim-color', 'wainscot-color', 'soffit-color', 'gable-divider-color'].forEach(id => {
            const el = document.getElementById(id); if (el) el.add(new Option(c.name, c.hex));
        });
    });
    applyDefaultGauges();
    const wSelect = document.getElementById('wall-panel-model');
    const ffSelect = document.getElementById('first-floor-panel-model');
    if (wSelect && ffSelect && ffSelect.options.length === 0) { ffSelect.innerHTML = wSelect.innerHTML; }
    syncUIToParams(); updateScene(); await initProjectsUI();
}, 500);

function generateProjectSummaryText() {
    const getSelectText = (id) => { const el = document.getElementById(id); return el && el.options.length > 0 ? el.options[el.selectedIndex].text : 'N/A'; };
    const info = calculateInfo();
    const roofPanelName = getSelectText('roof-panel-model');
    const roofUpper = roofPanelName.toUpperCase();
    const isSnap12or16 = roofUpper.includes('SNAP LOK 16') || roofUpper.includes('SNAP LOK 12');

    let text = `WESTMAN STEEL - 3D PROJECT CONFIGURATION\n`;
    text += `========================================\n\n`;
    text += `--- DIMENSIONS & ARCHITECTURE ---\n`;
    text += `Building Model: ${getSelectText('building-model-type')}\n`;
    text += `Main Width: ${params.width}'\n`;
    text += `Main Depth: ${params.depth}'\n`;
    text += `Eave Height: ${params.height}'\n`;
    text += `Roof Pitch: ${params.pitch}/12\n`;
    text += `Roof Sheet Length: ${info.finalSheetLength.toFixed(2)}'\n`;
    text += `\n--- OPTIONS ---\n`;
    text += `Vented Roof: ${params.isVented ? 'YES (-' + params.ventOffset + '")' : 'NO'}\n`;
    text += `Eave Overhang: ${params.hasOverhang ? `YES (${params.overhang.toFixed(1)}' ext: +${params.eaveOverhangExt}")` : 'NO'}\n`;
    if (params.hasSoffit) text += `Soffit: ${getSelectText('soffit-color')} (${params.soffitProfile})\n`;
    if (params.hasGableDivider) text += `Gable Divider: ${getSelectText('gable-divider-color')} (${params.gableDividerProfile})\n`;
    if (params.hasTwoFloors) text += `First Floor Split Height: ${params.firstFloorHeight}'\n`;
    if (params.hasWainscot) text += `Wainscot Height: ${params.wainscotHeight}'\n`;
    if (params.hasDormer) text += `Dormer: ${params.dormerWidth}'W x ${params.dormerDepth}'D x ${params.dormerHeight}'H (Pitch: ${params.dormerPitch}/12, Side: ${params.dormerSide})\n`;
    text += `Closures: ${params.hasClosures ? 'YES' : 'NO'}\n`;
    text += `Trim Length Set To: ${info.trimLen}'\n`;
    text += `\n--- MATERIALS & COLORS ---\n`;
    text += `Roof Panel Profile: ${roofPanelName} [${PRODUCT_CODES.roof_panel}]\n`;
    text += `Wall Cladding Profile: ${getSelectText('wall-panel-model')} [${PRODUCT_CODES.wall_panel}]\n`;
    if (params.hasTwoFloors) text += `First Floor Panel Profile: ${getSelectText('first-floor-panel-model')} [${PRODUCT_CODES.wall_panel}]\n`;
    text += `Roof Color: ${getSelectText('roof-color')}\n`;
    text += `Wall Color: ${getSelectText('wall-color')}\n`;
    if (params.hasTwoFloors) text += `First Floor Color: ${getSelectText('first-floor-color')}\n`;
    text += `Trim Color: ${getSelectText('trim-color')}\n`;
    if (params.hasWainscot) text += `Wainscot Color: ${getSelectText('wainscot-color')}\n`;
    text += `Butyl Tape: ${info.butylTapeLF.toFixed(1)} LF\n`;
    
    // БЛОК КРЕПЕЖА
    text += `Fasteners Required: ${info.isSnapLok ? info.screwType : `${cachedScrews} pcs (${info.screwType})`}\n`;
    text += `Recommended Fastener SKUs:\n`;
    if (isSnap12or16) {
        text += `  - PH00011010C (#10 x 1" #2 Quadrex)\n`;
        text += `  - PH00011015NW (#10 x 1 1/2" #2 Quadrex)\n`;
        text += `  - PH00011210SD (#12 x 1" Self Drill #2 Quadrex)\n`;
    } else {
        text += `  - WS00011010 (#10 x 1" 1/4" Hex)\n`;
        text += `  - WS00011015 (#10 x 1 1/2" 1/4" Hex)\n`;
        text += `  - WS00011020 (#10 x 2" 1/4" Hex)\n`;
        text += `  - WS00011030 (#10 x 3" 1/4" Hex)\n`;
        text += `  - WS00011410 (#14 x 1" 3/8" Hex)\n`;
        text += `  - WS000114125 (#14 x 1 1/4" 3/8" Hex)\n`;
        text += `  - WS00011415 (#14 x 1 1/2" 3/8" Hex)\n`;
        text += `  - WS00011420 (#14 x 2" 3/8" Hex)\n`;
    }

    if (info.isSnapLok && info.roofClips > 0) { text += `Roof Clips: ${info.roofClips} pcs\n`; }
    
    if (params.customTrims && params.customTrims.length > 0) {
        text += `\n--- CUSTOM TRIMS / EXTRAS ---\n`;
        params.customTrims.forEach(ct => { text += `${ct.name}: ${ct.qty} pcs (${ct.length}' ea)\n`; });
    }

    text += `\n--- DOORS & WINDOWS ---\n`;
    let hasOpenings = false;
    Object.keys(params.openings).forEach(wallId => {
        if (params.openings[wallId].length > 0) {
            hasOpenings = true;
            text += `[Wall: ${wallId.replace('_', ' ').toUpperCase()}]\n`;
            params.openings[wallId].forEach((op, idx) => {
                const typeName = op.isDoor ? 'Door' : 'Window';
                const ffl = Math.max(0, op.cy - op.h / 2).toFixed(1);
                text += `  ${idx+1}. ${typeName}: ${Number(op.w).toFixed(1)}' W x ${Number(op.h).toFixed(1)}' H (FFL: ${ffl}')\n`;
            });
        }
    });
    if (!hasOpenings) text += `No doors or windows added.\n`;
    return text;
}

async function sendQuoteEmail() {
    if (typeof wpApiSettings === 'undefined') { showToast('Error: Form submission requires WordPress environment.'); return; }
    const disclaimerCheckbox = document.querySelector('#requestModal .form-check-input[required]');
    if (disclaimerCheckbox && !disclaimerCheckbox.checked) {
        showToast('You must accept the terms and conditions before submitting.'); disclaimerCheckbox.classList.add('is-invalid'); disclaimerCheckbox.focus(); return;
    } else if (disclaimerCheckbox) { disclaimerCheckbox.classList.remove('is-invalid'); }
    const submitBtn = document.getElementById('btn-submit-quote'); const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending Request...'; submitBtn.disabled = true;
    if (typeof saveToServerConfig === 'function') { await saveToServerConfig(); }
    const fName = document.getElementById('req-first-name')?.value || ""; const lName = document.getElementById('req-last-name')?.value || "";
    const email = document.getElementById('req-email')?.value || ""; const phone = document.getElementById('req-phone')?.value || "";
    const comments = document.getElementById('ui-project-comments')?.value || ""; const summary = document.getElementById('req-project-summary')?.value || "";
    const recipientEmail = document.getElementById('req-recepient')?.value || ""; const contactCode = document.getElementById('req-contact')?.value || "";
    const pdfLink = document.getElementById('pdf-file')?.value || "";
    if (!fName || !email) { showToast('Please fill out your name and email.'); submitBtn.innerHTML = originalText; submitBtn.disabled = false; return; }
    const payload = { name: `${fName} ${lName}`.trim(), email: email, phone: phone, summary: summary, recipient: recipientEmail, contact_code: contactCode, comments: comments, pdf_link: pdfLink };
    try {
        const response = await fetch(wpApiSettings.root + 'configurator/v1/submit-request', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpApiSettings.nonce }, body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) {
            if (window.Analytics) { window.Analytics.track('submission_completed', { entry_id: result.entry_id }); }
            const formWrapper = document.querySelector('#requestModal .modal-body .row'); if (formWrapper) formWrapper.style.display = 'none';
            const modalBody = document.querySelector('#requestModal .modal-body'); let successAlert = document.getElementById('quote-success-disclaimer');
            if (!successAlert) {
                successAlert = document.createElement('div'); successAlert.id = 'quote-success-disclaimer'; successAlert.className = 'alert alert-secondary p-4 m-0 border-0 text-center';
                successAlert.innerHTML = ` <div class="mb-3"><i class="bi bi-check-circle-fill text-success" style="font-size: 2.5rem;"></i><h4 class="fw-bold text-success mt-3 mb-3">Request Submitted Successfully</h4><p class="text-muted small">Thank you! Your configuration has been sent to our estimating team.</p></div><div class="mt-4 pt-2 border-top"><div class="spinner-border spinner-border-sm text-secondary me-2" role="status"></div><span class="text-muted small fw-bold">Closing window in 5 seconds...</span></div> `;
                modalBody.appendChild(successAlert);
            } else { successAlert.style.display = 'block'; }
            setTimeout(() => {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('requestModal'));
                if (modalInstance) { modalInstance.hide(); } submitBtn.innerHTML = originalText; submitBtn.disabled = false;
            }, 5000);
        } else { throw new Error(result.message || result.data?.message || 'Submission failed'); }
    } catch (error) {
        showToast(error.message || 'Submission failed. Please try again.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

setTimeout(() => {
    UserProfiler.generateReport().then(data => {
        const btnContainer = document.getElementById('request-btn-container'); if (!btnContainer) return;
        btnContainer.innerHTML = `<button id="btn-open-request" class="btn btn-primary w-100 fw-bold py-2 shadow-sm" style="background-color:#d11241; border-color:#d11241;"><i class="bi bi-send-fill me-2"></i> Submit Request</button>`;
        document.getElementById('btn-open-request').addEventListener('click', async () => {
            AnalyticsTracker.track('submission_started');
            const formWrapper = document.querySelector('#requestModal .modal-body .row'); if (formWrapper) formWrapper.style.display = 'flex';
            const successAlert = document.getElementById('quote-success-disclaimer'); if (successAlert) successAlert.style.display = 'none';
            const disclaimerCheckbox = document.querySelector('#requestModal .form-check-input[required]');
            if (disclaimerCheckbox) { disclaimerCheckbox.checked = false; disclaimerCheckbox.classList.remove('is-invalid'); }
            const modalEl = document.getElementById('requestModal'); const modal = new bootstrap.Modal(modalEl); modal.show();
            const summaryField = document.getElementById('req-project-summary'); if (summaryField) { summaryField.value = generateProjectSummaryText(); }
            const submitQuoteBtn = document.getElementById('btn-submit-quote'); let newBtn = null;
            if (submitQuoteBtn) { newBtn = submitQuoteBtn.cloneNode(true); submitQuoteBtn.parentNode.replaceChild(newBtn, submitQuoteBtn); newBtn.addEventListener('click', sendQuoteEmail); }
            const pdfInput = document.getElementById('pdf-file'); if (pdfInput) pdfInput.value = 'Generating PDF... Please wait';
            if (newBtn) newBtn.disabled = true;
            const info = typeof window.calculateInfo === 'function' ? window.calculateInfo() : calculateInfo();
            const context = {
                params: params, currentHouse: currentHouse, renderer: renderer, scene: scene, camera: camera, grid: grid, grassMesh: grassMesh,
                cachedScrews: cachedScrews, selectedWallWidth: selectedWallWidth, selectedRoofWidth: selectedRoofWidth,
                finalSheetLength: info.finalSheetLength, screwType: info.screwType,
                productCodes: typeof PRODUCT_CODES !== 'undefined' ? PRODUCT_CODES : {},
                getSelectText: (id) => { const el = document.getElementById(id); return el && el.options.length > 0 ? el.options[el.selectedIndex].text : 'N/A'; }
            };
            try { const pdfUrl = await processAndUploadPDF(context); if (pdfInput) pdfInput.value = pdfUrl; } 
            catch (err) { console.error(err); if (pdfInput) pdfInput.value = 'Error generating PDF'; } 
            finally { if (newBtn) newBtn.disabled = false; }
        });
    });
}, 1000);

(function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const autoLoadId = urlParams.get('load_project'); const sharedUserId = urlParams.get('user_id');
    if (autoLoadId !== null) { setTimeout(() => { if (typeof window.loadProjectData === 'function') { window.loadProjectData(autoLoadId, sharedUserId); } }, 500); }
})();