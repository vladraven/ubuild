import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state, getGlobalHeight } from './state.js';
import { CONFIG } from './config.js';
import { loadEnvironmentAssets, updateEnvironment, wallMat, roofMat, gableMat, trimMat, wainscotMat, soffitMat, gableDividerMat, updateMaterials } from './materials.js';
import { HouseGenerator } from './houseModel.js';
import { sanitizeAndAlign, updateBuildingLimits } from './utils.js';
import { syncColorsAndTexturesToParams } from './ui.js';

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
export const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
export let controls;
export let ambLight, hemiLight, dirLight, grid;

export function initScene() {
    scene.background = new THREE.Color(CONFIG.defaultBgColorHex);
    camera.position.set(50, 40, 50);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = (Math.PI / 2) * (1 - CONFIG.cameraGroundMargin);

    ambLight = new THREE.AmbientLight(0xffffff, CONFIG.lightAmbientIntensityBase); 
    scene.add(ambLight);

    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, CONFIG.lightHemiIntensity);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xffffff, CONFIG.lightDirIntensityBase);
    dirLight.position.set(60, 120, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005; 
    dirLight.shadow.camera.left = -100; dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100; dirLight.shadow.camera.bottom = -100;
    scene.add(dirLight);

    grid = new THREE.GridHelper(2000, 100, 0xcccccc, 0xdddddd);
    grid.position.y = -0.04;
    scene.add(grid);

    loadEnvironmentAssets(scene, dirLight);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function setCameraView(view) {
    const dist = Math.max(state.params.width, state.params.depth) * 1.5;
    const h2 = getGlobalHeight() / 2;
    controls.target.set(0, h2, 0);
    switch(view) {
        case 'top': camera.position.set(0, dist * 1.5, 0); controls.target.set(0, 0, 0); break;
        case 'front': camera.position.set(0, h2, dist); break;
        case 'back': camera.position.set(0, h2, -dist); break;
        case 'left': camera.position.set(-dist, h2, 0); break;
        case 'right': camera.position.set(dist, h2, 0); break;
        case 'reset': camera.position.set(50, 40, 50); controls.target.set(0, 0, 0); break;
    }
    controls.update();
}

window.setCameraView = setCameraView;

export function updateScene() {
    const mEl = document.getElementById('building-model-type');
    if(mEl) state.params.modelType = mEl.value;

    state.params.hasWainscot = document.getElementById('wainscot-enable')?.checked || false;
    state.params.hasDormer = document.getElementById('d-enable')?.checked || false;
    state.params.horizontalSiding = document.getElementById('w-tex-rot')?.checked || false;
    state.params.hasEnvironment = document.getElementById('env-enable')?.checked || false;
    state.params.hasOverhang = document.getElementById('oh-enable')?.checked || false;
    
    state.params.isVented = document.getElementById('vented-enable')?.checked || false;
    state.params.hasClosures = document.getElementById('closures-enable')?.checked || false;
    state.params.hasSoffit = state.params.hasOverhang;
    state.params.hasGableDivider = document.getElementById('gable-divider-enable')?.checked || false;

    const ohControls = document.getElementById('overhang-controls');
    if (ohControls) ohControls.style.display = state.params.hasOverhang ? 'block' : 'none';

    const ventControls = document.getElementById('vent-controls');
    if (ventControls) ventControls.style.display = state.params.isVented ? 'block' : 'none';

    const gableDivControls = document.getElementById('gable-divider-controls');
    if (gableDivControls) gableDivControls.style.display = state.params.hasGableDivider ? 'block' : 'none';

    const wsControls = document.getElementById('wainscot-controls');
    if (wsControls) wsControls.style.display = state.params.hasWainscot ? 'block' : 'none';

    const hipGroup = document.getElementById('hip-offset-group');
    if (hipGroup) hipGroup.style.display = (['hip', 'mansard', 'jerkinhead', 'dutch_gable', 'combination', 'cross_hipped', 'hip_and_valley'].includes(state.params.modelType)) ? 'block' : 'none';

    const upGroup = document.getElementById('upper-pitch-group');
    if (upGroup) upGroup.style.display = (['dutch_gable', 'combination'].includes(state.params.modelType)) ? 'block' : 'none';

    const hvControls = document.getElementById('hip-valley-controls');
    if (hvControls) hvControls.style.display = (state.params.modelType === 'hip_and_valley') ? 'block' : 'none';

    const chControls = document.getElementById('cross-hipped-controls');
    if (chControls) chControls.style.display = (state.params.modelType === 'cross_hipped') ? 'block' : 'none';

    const leanToControls = document.getElementById('leanto-controls');
    if (leanToControls) leanToControls.style.display = (state.params.modelType === 'skillion_leanto') ? 'block' : 'none';

    const wdWall = document.getElementById('wd-wall');
    if (wdWall) {
        const isHV = (state.params.modelType === 'hip_and_valley');
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

    updateEnvironment(scene, dirLight, grid);
    sanitizeAndAlign(); 
    updateBuildingLimits(); 

    const rCol = document.getElementById('roof-color');
    const wCol = document.getElementById('wall-color');
    const tCol = document.getElementById('trim-color');
    const wsCol = document.getElementById('wainscot-color');
    const soffitCol = document.getElementById('soffit-color');
    const gdCol = document.getElementById('gable-divider-color');
    
    if(rCol) roofMat.color.setHex(Number(rCol.value));
    if(wCol) wallMat.color.setHex(Number(wCol.value));
    if(tCol) trimMat.color.setHex(Number(tCol.value));
    if(wsCol) wainscotMat.color.setHex(Number(wsCol.value));
    if(soffitCol) soffitMat.color.setHex(Number(soffitCol.value));
    if(gdCol) gableDividerMat.color.setHex(Number(gdCol.value));
    
    const splitLike = (state.params.modelType === 'split' || state.params.modelType === 'gambrel');
    gableMat.color.setHex(splitLike ? Number(rCol.value) : Number(wCol.value));

    if (state.currentHouse) {
        scene.remove(state.currentHouse);
        state.currentHouse.traverse(child => { 
            if (child.isMesh && child.geometry) { child.geometry.dispose(); } 
        });
    }
    
    // Pass entire state.params.floors to the generator
    state.currentHouse = HouseGenerator.createBuilding(state.params, { 
        wall: wallMat, roof: roofMat, gable: gableMat, trim: trimMat, wainscot: wainscotMat, soffit: soffitMat, gableDivider: gableDividerMat
    });
    scene.add(state.currentHouse);
    
    reHighlightSelection();
    syncColorsAndTexturesToParams();
}

function reHighlightSelection() {
    if (!state.selectedOpeningInfo) return;
    scene.traverse(child => {
        if (child.userData && child.userData.id === state.selectedOpeningInfo.id && child.userData.floorId === state.selectedOpeningInfo.floorId) {
            child.material.color.setHex(0xff0000);
        }
    });
}

export function animate() { 
    requestAnimationFrame(animate); 
    if(controls) controls.update(); 
    renderer.render(scene, camera); 
}