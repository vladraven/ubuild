// texturiser.js
import * as THREE from 'three';
import { wallMat, roofMat, wainscotMat, intWallMat } from './colorise.js';

let cachedWallNormalMap = null;
let cachedRoofNormalMap = null;

// Создание контрастной и резкой нормаль-карты профилированного листа
function createRibbedNormalTexture(width = 512, height = 512, ribCount = 16) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, width, height);

    const step = width / ribCount;
    const ribWidth = step * 0.3; 

    for (let i = 0; i < ribCount; i++) {
        const x = i * step;

        const gradLeft = ctx.createLinearGradient(x, 0, x + ribWidth / 2, 0);
        gradLeft.addColorStop(0, 'rgb(0, 64, 255)');
        gradLeft.addColorStop(1, 'rgb(128, 128, 255)');
        ctx.fillStyle = gradLeft;
        ctx.fillRect(x, 0, ribWidth / 2, height);

        ctx.fillStyle = 'rgb(128, 128, 255)';
        ctx.fillRect(x + ribWidth / 2, 0, ribWidth / 2, height);

        const gradRight = ctx.createLinearGradient(x + ribWidth, 0, x + ribWidth + ribWidth / 2, 0);
        gradRight.addColorStop(0, 'rgb(128, 128, 255)');
        gradRight.addColorStop(1, 'rgb(255, 192, 255)');
        ctx.fillStyle = gradRight;
        ctx.fillRect(x + ribWidth, 0, ribWidth / 2, height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
}

export function updateBuildingTextures(buildingW = 18, buildingL = 30, buildingH = 5) {
    const roofProfileSelect = document.getElementById('roofProfile');
    const wallProfileSelect = document.getElementById('wallProfile');

    const roofProfile = roofProfileSelect ? roofProfileSelect.value.toLowerCase() : 'awr';
    const wallProfile = wallProfileSelect ? wallProfileSelect.value.toLowerCase() : 'awr';

    if (!cachedWallNormalMap) {
        cachedWallNormalMap = createRibbedNormalTexture(512, 512, 2); // 2 ребра на блок
    }

    // 1. ТЕКСТУРА ДЛЯ СТЕН
    const wallTex = cachedWallNormalMap.clone();
    wallTex.needsUpdate = true;
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.anisotropy = 4;

    // 1.1 ТЕКСТУРА ДЛЯ ЦОКОЛЯ (Отдельный клон)
    const wainscotTex = cachedWallNormalMap.clone();
    wainscotTex.needsUpdate = true;
    wainscotTex.wrapS = THREE.RepeatWrapping;
    wainscotTex.wrapT = THREE.RepeatWrapping;
    wainscotTex.anisotropy = 4;

    const wallDensities = {
        'awr': 1.0,
        'ssr24': 1.5,
        'delta': 1.2,
        'elite': 1.3,
        'ultra': 1.1,
        'widespan': 0.8,
        '936': 0.9
    };

    if (wallProfile !== 'imp') {
        const density = wallDensities[wallProfile] || 1.0;
        
        // Тайлинг для стен
        wallTex.repeat.set(buildingL * density, 1);
        
        // Тайлинг для цоколя (должен совпадать по X, чтобы ребра стыковались)
        wainscotTex.repeat.set(buildingL * density, 1);

        wallMat.normalMap = wallTex;
        wallMat.normalScale.set(.5, .5); 

        wainscotMat.normalMap = wainscotTex;
        wainscotMat.normalScale.set(.5, .5);

        intWallMat.normalMap = wallTex;
        intWallMat.normalScale.set(2.0, 2.0);
    } else {
        wallMat.normalMap = null;
        wainscotMat.normalMap = null;
        intWallMat.normalMap = null;
    }

    // 2. КРЫША
    if (!cachedRoofNormalMap) {
        cachedRoofNormalMap = createRibbedNormalTexture(512, 512, 3); // 3 ребра на блок
    }

    const roofTex = cachedRoofNormalMap.clone();
    roofTex.needsUpdate = true;
    roofTex.wrapS = THREE.RepeatWrapping;
    roofTex.wrapT = THREE.RepeatWrapping;
    roofTex.anisotropy = 4;

    roofTex.center.set(0.5, 0.5);
    roofTex.rotation = Math.PI / 2;

    const roofDensities = {
        'awr': 1.5,
        'ssr24': 2.0,
        'delta': 1.8,
        'snap12': 2.0
    };

    const roofDensity = roofDensities[roofProfile] || 1.5;
    
    roofTex.repeat.set(buildingL * 0.8, (buildingW / 2) * roofDensity);

    roofMat.normalMap = roofTex;
    roofMat.normalScale.set(6.0, 6.0); 

    wallMat.needsUpdate = true;
    wainscotMat.needsUpdate = true;
    roofMat.needsUpdate = true;
    intWallMat.needsUpdate = true;
}

export function initTexturiserUI(renderCallback) {
    ['roofProfile', 'wallProfile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                if (typeof renderCallback === 'function') {
                    renderCallback();
                }
            });
        }
    });
}