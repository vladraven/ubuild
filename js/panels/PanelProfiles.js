// js/panels/PanelProfiles.js
import * as THREE from 'three';

export const PANEL_PROFILES = Object.freeze({
    awr: Object.freeze({
        id: 'awr',
        name: 'AWR Panel',
        width: 0.9144, // 36 inches
        ribSpacing: 0.3048, // 12 inches
        ribHeight: 0.019, // 3/4 inch
        majorRibWidth: 0.038,
        minorRibsCount: 2
    }),
    pbr: Object.freeze({
        id: 'pbr',
        name: 'PBR Panel',
        width: 0.9144, // 36 inches
        ribSpacing: 0.3048, // 12 inches
        ribHeight: 0.03175, // 1.25 inches
        majorRibWidth: 0.05,
        minorRibsCount: 2
    }),
    corrugated: Object.freeze({
        id: 'corrugated',
        name: 'Corrugated Panel',
        width: 0.6604, // 26 inches
        ribSpacing: 0.0635, // 2.5 inches
        ribHeight: 0.0127, // 0.5 inch
        majorRibWidth: 0.03,
        minorRibsCount: 0
    })
});

export function getPanelProfile(profileId = 'awr') {
    return PANEL_PROFILES[profileId] || PANEL_PROFILES.awr;
}

export function generatePanelNormalMap(profileId = 'awr') {
    const profile = getPanelProfile(profileId);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgb(128, 128, 255)'; // нейтральная нормаль (0, 0, 1)
    ctx.fillRect(0, 0, 512, 512);

    const ribsTotal = Math.max(1, Math.round(profile.width / profile.ribSpacing));
    const stepPx = 512 / ribsTotal;

    for (let i = 0; i < ribsTotal; i++) {
        const x = i * stepPx;
        const ribWidthPx = Math.max(4, stepPx * 0.25);

        // Левый склон ребра (наклон нормали влево)
        const gradLeft = ctx.createLinearGradient(x, 0, x + ribWidthPx / 2, 0);
        gradLeft.addColorStop(0, 'rgb(128, 128, 255)');
        gradLeft.addColorStop(1, 'rgb(220, 128, 200)');
        ctx.fillStyle = gradLeft;
        ctx.fillRect(x, 0, ribWidthPx / 2, 512);

        // Правый склон ребра (наклон нормали вправо)
        const gradRight = ctx.createLinearGradient(x + ribWidthPx / 2, 0, x + ribWidthPx, 0);
        gradRight.addColorStop(0, 'rgb(35, 128, 200)');
        gradRight.addColorStop(1, 'rgb(128, 128, 255)');
        ctx.fillStyle = gradRight;
        ctx.fillRect(x + ribWidthPx / 2, 0, ribWidthPx / 2, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

export function applyPhysicalPanelUVs(geometry, widthM, heightM, profileId = 'awr') {
    if (!geometry || !geometry.attributes.position) return;
    const profile = getPanelProfile(profileId);

    const uRepeat = widthM / profile.width;
    const vRepeat = heightM / profile.width;

    const uvAttr = geometry.attributes.uv;
    if (!uvAttr) return;

    for (let i = 0; i < uvAttr.count; i++) {
        const u = uvAttr.getX(i) * uRepeat;
        const v = uvAttr.getY(i) * vRepeat;
        uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;
}