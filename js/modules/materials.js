import * as THREE from 'three';

// Возвращаем исходные, проверенные параметры металличности (0.1) и шероховатости,
// чтобы цвета отображались корректно без карты окружения envMap
export const concreteMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.1 });

export const roofMat = new THREE.MeshStandardMaterial({ 
    color: 0x3d3834, 
    metalness: 0.01, 
    roughness: 0.85, // Стены и крыша станут матовыми, раскрывая чистый цвет
    side: THREE.DoubleSide, 
    polygonOffset: true, 
    polygonOffsetFactor: -1.5, 
    polygonOffsetUnits: -4 
});

export const wallMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.8,
    flatShading: true, // <--- ЭТО ЗАСТАВИТ РЕБРА БЫТЬ ВИДИМЫМИ ВСЕГДА
    side: THREE.DoubleSide 
});

export const wainscotMat = new THREE.MeshStandardMaterial({ 
    color: 0x707170, 
    metalness: 0.01, 
    roughness: 0.85, 
    side: THREE.DoubleSide 
});

export const trimMat = new THREE.MeshStandardMaterial({ color: 0x707170, metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide });
export const steelMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.5, roughness: 0.8 });

export const glassMat = new THREE.MeshStandardMaterial({ 
    color: 0x87ceeb, 
    metalness: 0.1, 
    roughness: 0.1, 
    transparent: true, 
    opacity: 0.1, 
    side: THREE.DoubleSide 
});

export const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
export const panelMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8 });
export const rollMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide });
export const craneMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.4, roughness: 0.5 });
export const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.9, side: THREE.DoubleSide });
export const mezzMat = new THREE.MeshStandardMaterial({ metalness: 0.2, roughness: 0.8, side: THREE.DoubleSide });
export const intWallMat = new THREE.MeshStandardMaterial({ metalness: 0.1, roughness: 0.8, side: THREE.DoubleSide });

export const textureLoader = new THREE.TextureLoader();
export const grassTex = textureLoader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/terrain/grasslight-big.jpg');
grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
grassTex.repeat.set(80, 80);
export const grassMeshMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1.0 });

const skyPath = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/cube/skyboxsun25deg/';
export const skyMats = [
    new THREE.MeshBasicMaterial({ map: textureLoader.load(skyPath + 'px.jpg'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: textureLoader.load(skyPath + 'nx.jpg'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: textureLoader.load(skyPath + 'py.jpg'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: textureLoader.load(skyPath + 'ny.jpg'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: textureLoader.load(skyPath + 'pz.jpg'), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: textureLoader.load(skyPath + 'nz.jpg'), side: THREE.BackSide })
];

export const wallMaterialsCache = {};

export function getWallMaterials(side) {
    if (!wallMaterialsCache[side]) {
        wallMaterialsCache[side] = {
            mMat: wallMat.clone(),
            wMat: wainscotMat.clone(),
            intMat: intWallMat.clone()
        };
    }

    // Включаем корректный рендеринг теней при отсечении для всех трех типов материалов
    [wallMaterialsCache[side].mMat, wallMaterialsCache[side].wMat, wallMaterialsCache[side].intMat].forEach(m => {
        m.clippingShadows = true;
    });    
    
    // Сброс карт только для внешних стен (mMat) и панели вейнскота (wMat)
    wallMaterialsCache[side].mMat.color.copy(wallMat.color);
    wallMaterialsCache[side].mMat.map = null;
    wallMaterialsCache[side].mMat.bumpMap = null; 
    wallMaterialsCache[side].mMat.bumpScale = 0;
    
    wallMaterialsCache[side].wMat.color.copy(wainscotMat.color);
    wallMaterialsCache[side].wMat.map = null;
    wallMaterialsCache[side].wMat.bumpMap = null; 
    wallMaterialsCache[side].wMat.bumpScale = 0;
    
    // Для внутреннего лайнера (intMat) сохраняем геометрию и отключаем flatShading, чтобы ребра "936" не размывались
    wallMaterialsCache[side].intMat.color.copy(intWallMat.color);
    wallMaterialsCache[side].intMat.flatShading = false;
    
    return wallMaterialsCache[side];
}

export function updateMaterialColors() {
    const roofColor = document.getElementById('colorRoof')?.value || '#3d3834';
    const wallColor = document.getElementById('colorWall')?.value || '#007cba';
    const wainscotColor = document.getElementById('colorWainscot')?.value || '#707170';
    const trimColor = document.getElementById('colorTrim')?.value || '#707170';
    
    roofMat.color.set(roofColor);
    wallMat.color.set(wallColor);
    wainscotMat.color.set(wainscotColor);
    trimMat.color.set(trimColor);
    
    const ceilingEl = document.getElementById('colorCeiling');
    if (ceilingEl) ceilingMat.color.set(ceilingEl.value);
    
    const mezzEl = document.getElementById('colorMezzanine');
    if (mezzEl) mezzMat.color.set(mezzEl.value);
    
    intWallMat.color.set(wallColor);
    
    Object.keys(wallMaterialsCache).forEach(side => {
        const cache = wallMaterialsCache[side];
        cache.mMat.color.set(wallColor);
        cache.wMat.color.set(wainscotColor);
        cache.intMat.color.set(wallColor);
    });
}