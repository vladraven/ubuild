import * as THREE from 'three';

export let concreteMat, roofMat, ridgeCapMat, wallMat, wainscotMat, trimMat, eaveTrimMat, steelMat, craneMat, ceilingMat, mezzMat;
export let frameMat, glassMat, panelMat, grassMeshMat, skyMaterials;

const wallMaterialsBySide = {
    F: { mMat: null, wMat: null, intMat: null },
    B: { mMat: null, wMat: null, intMat: null },
    L: { mMat: null, wMat: null, intMat: null },
    R: { mMat: null, wMat: null, intMat: null }
};

const textureLoader = new THREE.TextureLoader();

function createSheetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.2, '#bbbbbb');
    grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(0.8, '#bbbbbb'); grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(15, 15);
    return tex;
}

export function initMaterials() {
    const sheetTex = createSheetTexture();

    // Восстановлена базовая матовость для бетона и каркаса из старой реализации
    concreteMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.1 });
    steelMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.5, roughness: 0.8 });
    craneMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.4, roughness: 0.5 });
    ceilingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.9, side: THREE.DoubleSide });
    mezzMat = new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.8, side: THREE.DoubleSide });

    // Оптимизация металличности и шероховатости кровли для раскрытия чистого цвета
    roofMat = new THREE.MeshStandardMaterial({ 
        metalness: 0.01, 
        roughness: 0.85, 
        map: sheetTex, 
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1.5,
        polygonOffsetUnits: -4
    });
    
    ridgeCapMat = new THREE.MeshStandardMaterial({ metalness: 0.01, roughness: 0.85 });
    trimMat = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide });
    eaveTrimMat = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide });
    
    frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    glassMat = new THREE.MeshStandardMaterial({ color: 0x87ceeb, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    panelMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });

    // Восстановление оригинальных параметров текстуры травы
    const grassTex = textureLoader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/terrain/grasslight-big.jpg');
    grassTex.wrapS = THREE.RepeatWrapping; grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(80, 80);
    grassMeshMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1.0 });

    const skyPath = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/cube/skyboxsun25deg/';
    const skySides = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
    skyMaterials = skySides.map(side => {
        return new THREE.MeshBasicMaterial({ map: textureLoader.load(skyPath + side), side: THREE.BackSide });
    });

    ['F', 'B', 'L', 'R'].forEach(s => {
        // ИСПРАВЛЕНИЕ: Убрана избыточная металлизация, добавлен flatShading для четкого выделения ребер профиля наружу
        wallMaterialsBySide[s].mMat = new THREE.MeshStandardMaterial({ metalness: 0.01, roughness: 0.85, flatShading: true, side: THREE.DoubleSide, map: sheetTex.clone() });
        wallMaterialsBySide[s].wMat = new THREE.MeshStandardMaterial({ metalness: 0.01, roughness: 0.85, side: THREE.DoubleSide, map: sheetTex.clone() });
        wallMaterialsBySide[s].intMat = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.8, side: THREE.DoubleSide, map: sheetTex.clone() });
        
        wallMaterialsBySide[s].mMat.clippingShadows = true;
        wallMaterialsBySide[s].wMat.clippingShadows = true;
        wallMaterialsBySide[s].intMat.clippingShadows = true;
    });
}

export function getWallMaterials(side) {
    return wallMaterialsBySide[side] || null;
}

export function updateMaterialColors() {
    if (!concreteMat) initMaterials();

    const hexRoof = document.getElementById('colorRoof')?.value || '#3d3834';
    const hexWall = document.getElementById('colorWall')?.value || '#ffffff';
    const hexTrim = document.getElementById('colorTrim')?.value || '#707170';
    const hexEave = document.getElementById('colorEaveTrim')?.value || hexTrim;
    const hexWainscot = document.getElementById('colorWainscot')?.value || '#707170';
    const hexMezzanine = document.getElementById('colorMezzanine')?.value || '#707170';
    const hexCeiling = document.getElementById('colorCeiling')?.value || '#ffffff';

    roofMat.color.set(hexRoof);
    ridgeCapMat.color.set(hexRoof);
    trimMat.color.set(hexTrim);
    eaveTrimMat.color.set(hexEave);
    frameMat.color.set(hexTrim);
    mezzMat.color.set(hexMezzanine);
    ceilingMat.color.set(hexCeiling);

    ['F', 'B', 'L', 'R'].forEach(s => {
        wallMaterialsBySide[s].mMat.color.set(hexWall);
        wallMaterialsBySide[s].wMat.color.set(hexWainscot);
        wallMaterialsBySide[s].intMat.color.set(hexWall);
    });
}