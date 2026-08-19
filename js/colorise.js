// js/colorise.js
import * as THREE from 'three';
import {
    getWallPanelMaterial,
    getWainscotPanelMaterial,
    setWallPanelColor,
    setWainscotPanelColor
} from './panelSystem.js';

export const concreteMat = new THREE.MeshStandardMaterial({
    color: 0xbdc3c7,
    roughness: 0.9,
    metalness: 0.1
});

export const roofMat = new THREE.MeshStandardMaterial({
    color: 0x3d3834,
    metalness: 0.55,
    roughness: 0.34,
    side: THREE.DoubleSide,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 1.15
});

export const trimMat = new THREE.MeshStandardMaterial({
    color: 0x707170,
    metalness: 0.65,
    roughness: 0.28,
    side: THREE.DoubleSide,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 1.2,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
});

export const eaveTrimMat = new THREE.MeshStandardMaterial({
    color: 0x707170,
    metalness: 0.65,
    roughness: 0.28,
    side: THREE.DoubleSide,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 1.2,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
});

export const rakeTrimMat = new THREE.MeshStandardMaterial({
    color: 0x707170,
    metalness: 0.65,
    roughness: 0.28,
    side: THREE.DoubleSide,
    shadowSide: THREE.DoubleSide,
    envMapIntensity: 1.2,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
});

export const steelMat = new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    metalness: 0.7,
    roughness: 0.3,
    envMapIntensity: 1.2
});

export const glassMat = new THREE.MeshStandardMaterial({
    color: 0x87ceeb,
    metalness: 0.9,
    roughness: 0.05,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    envMapIntensity: 2.0
});

export const frameMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8
});

export const wallMat = getWallPanelMaterial();
export const wainscotMat = getWainscotPanelMaterial();
export const panelMat = wallMat;

export const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.9,
    side: THREE.DoubleSide
});

export const mezzMat = new THREE.MeshStandardMaterial({
    metalness: 0.4,
    roughness: 0.4,
    side: THREE.DoubleSide
});

export const intWallMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.15,
    roughness: 0.5,
    side: THREE.DoubleSide
});

export function updateMaterialColors() {
    const roofColor = document.getElementById('colorRoof')?.value || '#3d3834';
    const wallColor = document.getElementById('colorWall')?.value || '#007cba';
    const trimColor = document.getElementById('colorTrim')?.value || '#707170';
    const eaveTrimColor = document.getElementById('colorEaveTrim')?.value || trimColor;
    const wainscotColor = document.getElementById('colorWainscot')?.value || '#707170';

    roofMat.color.set(roofColor);
    setWallPanelColor(wallColor);
    setWainscotPanelColor(wainscotColor);
    trimMat.color.set(trimColor);
    eaveTrimMat.color.set(eaveTrimColor);
    rakeTrimMat.color.set(trimColor);

    const ceilingEl = document.getElementById('colorCeiling');
    if (ceilingEl) ceilingMat.color.set(ceilingEl.value);

    const mezzEl = document.getElementById('colorMezzanine');
    if (mezzEl) mezzMat.color.set(mezzEl.value);

    intWallMat.color.set(wallColor);
}

export function initColoriseUI(renderCallback) {
    const colorSelectIds = [
        'colorRoof',
        'colorWall',
        'colorTrim',
        'colorEaveTrim',
        'colorWainscot',
        'colorCeiling',
        'colorMezzanine'
    ];

    colorSelectIds.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                updateMaterialColors();
                if (typeof renderCallback === 'function') {
                    renderCallback();
                }
            });
        }
    });
}