// ================================================
// FILE: js/texturiser.js
// ================================================
import * as THREE from 'three';
import { roofMat } from './colorise.js';
import { configurePanelSystem } from './panelSystem.js';

let cachedRoofNormalMap = null;

function createRoofNormalTexture(width = 512, height = 512, ribCount = 16) {
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

        const gradLeft = ctx.createLinearGradient(
            x,
            0,
            x + ribWidth / 2,
            0
        );

        gradLeft.addColorStop(0, 'rgb(0, 64, 255)');
        gradLeft.addColorStop(1, 'rgb(128, 128, 255)');

        ctx.fillStyle = gradLeft;
        ctx.fillRect(
            x,
            0,
            ribWidth / 2,
            height
        );

        ctx.fillStyle = 'rgb(128, 128, 255)';
        ctx.fillRect(
            x + ribWidth / 2,
            0,
            ribWidth / 2,
            height
        );

        const gradRight = ctx.createLinearGradient(
            x + ribWidth,
            0,
            x + ribWidth + ribWidth / 2,
            0
        );

        gradRight.addColorStop(
            0,
            'rgb(128, 128, 255)'
        );

        gradRight.addColorStop(
            1,
            'rgb(255, 192, 255)'
        );

        ctx.fillStyle = gradRight;
        ctx.fillRect(
            x + ribWidth,
            0,
            ribWidth / 2,
            height
        );
    }

    const texture = new THREE.CanvasTexture(canvas);

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    texture.needsUpdate = true;

    return texture;
}

function getRoofProfile() {
    const select = document.getElementById('roofProfile');

    return select
        ? select.value.toLowerCase()
        : 'awr';
}

function getWallProfile() {
    const select = document.getElementById('wallProfile');

    return select
        ? select.value.toLowerCase()
        : 'awr';
}

function disposeOwnedRoofNormalMap() {
    const currentMap = roofMat.normalMap;

    if (
        currentMap &&
        currentMap !== cachedRoofNormalMap
    ) {
        currentMap.dispose();
    }

    roofMat.normalMap = null;
}

export function updateBuildingTextures(
    buildingW = 18,
    buildingL = 30,
    buildingH = 5
) {
    const wallProfile = getWallProfile();

    configurePanelSystem(wallProfile);

    const roofProfile = getRoofProfile();

    if (!cachedRoofNormalMap) {
        cachedRoofNormalMap =
            createRoofNormalTexture(
                512,
                512,
                3
            );
    }

    disposeOwnedRoofNormalMap();

    const roofTex =
        cachedRoofNormalMap.clone();

    roofTex.needsUpdate = true;
    roofTex.wrapS = THREE.RepeatWrapping;
    roofTex.wrapT = THREE.RepeatWrapping;
    roofTex.anisotropy = 4;
    roofTex.center.set(0.5, 0.5);
    roofTex.rotation = Math.PI / 2;

    const roofDensities = {
        awr: 1.5,
        ssr24: 2.0,
        delta: 1.8,
        snap12: 2.0
    };

    const roofDensity =
        roofDensities[roofProfile] || 1.5;

    roofTex.repeat.set(
        buildingL * 0.8,
        (buildingW / 2) * roofDensity
    );

    roofMat.normalMap = roofTex;
    roofMat.normalScale.set(6.0, 6.0);
    roofMat.needsUpdate = true;
}

export function initTexturiserUI(renderCallback) {
    ['roofProfile', 'wallProfile'].forEach(id => {
        const el = document.getElementById(id);

        if (el) {
            el.addEventListener('change', () => {
                updateBuildingTextures();

                if (
                    typeof renderCallback ===
                    'function'
                ) {
                    renderCallback();
                }
            });
        }
    });
}