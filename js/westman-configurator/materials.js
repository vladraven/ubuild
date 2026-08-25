import * as THREE from 'three';
import { CONFIG } from './config.js';
import { state } from './state.js';

export const wallMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
export const roofMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.roofMetalness, roughness: CONFIG.roofRoughness, side: THREE.DoubleSide });
export const gableMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
export const trimMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
export const wainscotMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
export const soffitMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });
export const gableDividerMat = new THREE.MeshStandardMaterial({ metalness: CONFIG.wallMetalness, roughness: CONFIG.wallRoughness, side: THREE.DoubleSide });

export const textureLoader = new THREE.TextureLoader();
export const cubeTextureLoader = new THREE.CubeTextureLoader();

export let skyboxTexture = null;
export let grassMesh = null;
export let environmentReady = false;

export function loadEnvironmentAssets(scene, dirLight) {
    const envSwitch = document.getElementById('env-enable');
    if (envSwitch) envSwitch.disabled = true;

    cubeTextureLoader.setPath(CONFIG.urlSkybox);
    cubeTextureLoader.load(
        ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
        (texture) => { 
            skyboxTexture = texture;
            environmentReady = true;
            if (envSwitch) { envSwitch.disabled = false; if (state.params.hasEnvironment) updateEnvironment(scene, dirLight); }
        },
        undefined, (err) => console.error("Skybox error:", err)
    );

    const grassMap = textureLoader.load(CONFIG.urlGrass);
    grassMap.wrapS = THREE.RepeatWrapping; grassMap.wrapT = THREE.RepeatWrapping; grassMap.repeat.set(100, 100);
    const grassMat = new THREE.MeshStandardMaterial({ map: grassMap, roughness: 0.9, metalness: 0.05, color: 0x88bb88 });
    const grassGeo = new THREE.PlaneGeometry(5000, 5000);
    grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.rotation.x = -Math.PI / 2; grassMesh.position.y = -0.05; grassMesh.receiveShadow = true; grassMesh.visible = state.params.hasEnvironment;
    scene.add(grassMesh);
}

export function updateEnvironment(scene, dirLight, grid) {
    if (state.params.hasEnvironment && environmentReady && skyboxTexture) {
        scene.background = skyboxTexture; 
        if (grid) grid.visible = false;
        if (grassMesh) grassMesh.visible = true; 
        if (dirLight) dirLight.intensity = CONFIG.lightDirIntensityEnvOn;
    } else {
        scene.background = new THREE.Color(CONFIG.defaultBgColorHex); 
        if (grid) grid.visible = true;
        if (grassMesh) grassMesh.visible = false; 
        if (dirLight) dirLight.intensity = CONFIG.lightDirIntensityBase;
    }
}

export function createPanelTextures(name, coverage, isRoof) {
    const size = 1024;
    const canvasMap = document.createElement('canvas'); const canvasBump = document.createElement('canvas');
    canvasMap.width = canvasBump.width = size; canvasMap.height = canvasBump.height = size;
    const ctxMap = canvasMap.getContext('2d'); const ctxBump = canvasBump.getContext('2d');
    ctxMap.fillStyle = '#ffffff'; ctxMap.fillRect(0, 0, size, size);
    ctxBump.fillStyle = '#808080'; ctxBump.fillRect(0, 0, size, size);

    const isVert = isRoof ? true : !state.params.horizontalSiding;
    const drawProfile = (x, y, w, h, type) => {
        let gMap = isVert ? ctxMap.createLinearGradient(x, 0, x+w, 0) : ctxMap.createLinearGradient(0, y, 0, y+h);
        let gBump = isVert ? ctxBump.createLinearGradient(x, 0, x+w, 0) : ctxBump.createLinearGradient(0, y, 0, y+h);
        if (type === 'rib') {
            gMap.addColorStop(0, 'rgba(0,0,0,0.3)'); gMap.addColorStop(0.2, 'rgba(255,255,255,0.4)'); gMap.addColorStop(0.8, 'rgba(255,255,255,0.4)'); gMap.addColorStop(1, 'rgba(0,0,0,0.3)');
            gBump.addColorStop(0, '#404040'); gBump.addColorStop(0.2, '#ffffff'); gBump.addColorStop(0.8, '#ffffff'); gBump.addColorStop(1, '#404040');
        } else {
            gMap.addColorStop(0, 'rgba(0,0,0,0.2)'); gMap.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gMap.addColorStop(1, 'rgba(0,0,0,0.2)');
            gBump.addColorStop(0, '#404040'); gBump.addColorStop(0.5, '#ffffff'); gBump.addColorStop(1, '#404040');
        }
        ctxMap.fillStyle = gMap; ctxBump.fillStyle = gBump;
        isVert ? (ctxMap.fillRect(x,0,w,size), ctxBump.fillRect(x,0,w,size)) : (ctxMap.fillRect(0,y,size,h), ctxBump.fillRect(0,y,size,h));
    };

    const label = name ? name.toUpperCase() : "";
    if (label.includes("CORRUGATED")) { for (let i = 0; i < 14; i++) drawProfile(i*(size/14), i*(size/14), size/14, size/14, 'wave'); } 
    else if (label.includes("SNAP") || label.includes("LOCK") || label.includes("SEAM")) { drawProfile(0, 0, 25, 25, 'seam'); } 
    else { for (let i = 0; i < 4; i++) drawProfile(i*(size/4), i*(size/4), 55, 55, 'rib'); }

    const mapTex = new THREE.CanvasTexture(canvasMap); const bumpTex = new THREE.CanvasTexture(canvasBump);
    mapTex.wrapS = mapTex.wrapT = bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
    const currentScale = isRoof ? CONFIG.textureScaleRoof : CONFIG.textureScaleWall;
    
    // Scale recalculation to match global height
    const globalH = state.params.floors.reduce((sum, f) => sum + f.height, 0);
    const repX = isRoof ? (state.params.depth / (coverage / 12)) / currentScale : (isVert ? (state.params.width / (coverage / 12)) / currentScale : (globalH / (coverage / 12)) / currentScale);
    const repY = isRoof ? 1 / currentScale : (isVert ? 1 / currentScale : (state.params.width / (coverage / 12)) / currentScale);
    mapTex.repeat.set(repX, repY); bumpTex.repeat.set(repX, repY);
    return { map: mapTex, bumpMap: bumpTex };
}

export function updateMaterials() {
    const rEl = document.getElementById('roof-panel-model');
    const wEl = document.getElementById('wall-panel-model');
    if (!rEl || !wEl) return;
    
    if (roofMat.map) { roofMat.map.dispose(); roofMat.bumpMap.dispose(); }
    if (wallMat.map) { wallMat.map.dispose(); wallMat.bumpMap.dispose(); }

    const rData = createPanelTextures(rEl.value, state.selectedRoofWidth, true);
    const wData = createPanelTextures(wEl.value, state.selectedWallWidth, false);
    
    roofMat.map = rData.map; roofMat.bumpMap = rData.bumpMap; roofMat.bumpScale = 0.02; roofMat.needsUpdate = true;
    wallMat.map = wData.map; wallMat.bumpMap = wData.bumpMap; wallMat.bumpScale = 0.01; wallMat.needsUpdate = true;
    
    wainscotMat.map = wData.map; wainscotMat.bumpMap = wData.bumpMap; wainscotMat.bumpScale = 0.01; wainscotMat.needsUpdate = true;

    const splitLike = (state.params.modelType === 'split' || state.params.modelType === 'gambrel');
    gableMat.map = splitLike ? rData.map : wData.map; gableMat.needsUpdate = true;
}