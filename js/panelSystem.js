import * as THREE from 'three';

const METERS_TO_FEET = 3.28084;

const DEFAULT_PANEL_WIDTH_FT = 1.0;
const DEFAULT_PANEL_HEIGHT_FT = 1.0;

const TEXTURE_PANEL_COUNT_X = 2;
const TEXTURE_PANEL_COUNT_Y = 1;

const DEFAULT_PANEL_WIDTH_M =
    DEFAULT_PANEL_WIDTH_FT / METERS_TO_FEET;

const DEFAULT_PANEL_HEIGHT_M =
    DEFAULT_PANEL_HEIGHT_FT / METERS_TO_FEET;

let cachedNormalMap = null;

const panelProfiles = {
    awr: {
        density: 1.0
    },

    ssr24: {
        density: 1.5
    },

    delta: {
        density: 1.2
    },

    elite: {
        density: 1.3
    },

    ultra: {
        density: 1.1
    },

    widespan: {
        density: 0.8
    },

    '936': {
        density: 0.9
    }
};

let activeProfile = 'awr';
let activeDensity = 1.0;

let activePanelWidthM =
    DEFAULT_PANEL_WIDTH_M;

let activePanelHeightM =
    DEFAULT_PANEL_HEIGHT_M;

const wallPanelMaterial =
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.42,
        roughness: 0.42,
        side: THREE.DoubleSide,
        shadowSide: THREE.DoubleSide,
        envMapIntensity: 1.05
    });

const wainscotPanelMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x707170,
        metalness: 0.42,
        roughness: 0.42,
        side: THREE.DoubleSide,
        shadowSide: THREE.DoubleSide,
        envMapIntensity: 1.05
    });

function createPanelNormalMap() {
    const width = 512;
    const height = 512;

    const canvas =
        document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const ctx =
        canvas.getContext('2d');

    ctx.fillStyle =
        'rgb(128, 128, 255)';

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    const step =
        width / TEXTURE_PANEL_COUNT_X;

    const ribWidth =
        step * 0.3;

    for (
        let i = 0;
        i < TEXTURE_PANEL_COUNT_X;
        i++
    ) {
        const x =
            i * step;

        const gradLeft =
            ctx.createLinearGradient(
                x,
                0,
                x + ribWidth / 2,
                0
            );

        gradLeft.addColorStop(
            0,
            'rgb(0, 64, 255)'
        );

        gradLeft.addColorStop(
            1,
            'rgb(128, 128, 255)'
        );

        ctx.fillStyle =
            gradLeft;

        ctx.fillRect(
            x,
            0,
            ribWidth / 2,
            height
        );

        ctx.fillStyle =
            'rgb(128, 128, 255)';

        ctx.fillRect(
            x + ribWidth / 2,
            0,
            ribWidth / 2,
            height
        );

        const gradRight =
            ctx.createLinearGradient(
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

        ctx.fillStyle =
            gradRight;

        ctx.fillRect(
            x + ribWidth,
            0,
            ribWidth / 2,
            height
        );
    }

    const texture =
        new THREE.CanvasTexture(
            canvas
        );

    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.anisotropy = 4;
    texture.needsUpdate = true;

    return texture;
}

function ensureNormalMap() {
    if (!cachedNormalMap) {
        cachedNormalMap =
            createPanelNormalMap();
    }

    return cachedNormalMap;
}

function applyMaterialPanelSettings(
    material
) {
    const normalMap =
        ensureNormalMap();

    material.normalMap =
        normalMap;

    material.normalScale.set(
        0.5,
        0.5
    );

    material.userData =
        material.userData || {};

    material.userData.panelProfile =
        activeProfile;

    material.userData.panelDensity =
        activeDensity;

    material.userData.panelWidthM =
        activePanelWidthM;

    material.userData.panelHeightM =
        activePanelHeightM;

    material.userData.texturePanelCountX =
        TEXTURE_PANEL_COUNT_X;

    material.userData.texturePanelCountY =
        TEXTURE_PANEL_COUNT_Y;

    material.needsUpdate = true;
}

export function configurePanelSystem(
    profile = 'awr'
) {
    const normalizedProfile =
        String(profile)
            .toLowerCase();

    const config =
        panelProfiles[
            normalizedProfile
        ] || panelProfiles.awr;

    activeProfile =
        normalizedProfile;

    activeDensity =
        config.density;

    activePanelWidthM =
        DEFAULT_PANEL_WIDTH_M /
        activeDensity;

    activePanelHeightM =
        DEFAULT_PANEL_HEIGHT_M;

    applyMaterialPanelSettings(
        wallPanelMaterial
    );

    applyMaterialPanelSettings(
        wainscotPanelMaterial
    );

    return {
        wallMaterial:
            wallPanelMaterial,

        wainscotMaterial:
            wainscotPanelMaterial
    };
}

export function getWallPanelMaterial() {
    applyMaterialPanelSettings(
        wallPanelMaterial
    );

    return wallPanelMaterial;
}

export function getWainscotPanelMaterial() {
    applyMaterialPanelSettings(
        wainscotPanelMaterial
    );

    return wainscotPanelMaterial;
}

export function setWallPanelColor(
    color
) {
    if (!color) {
        return;
    }

    wallPanelMaterial.color.set(
        color
    );
}

export function setWainscotPanelColor(
    color
) {
    if (!color) {
        return;
    }

    wainscotPanelMaterial.color.set(
        color
    );
}

export function setPanelColors(
    wallColor,
    wainscotColor
) {
    if (wallColor) {
        setWallPanelColor(
            wallColor
        );
    }

    if (wainscotColor) {
        setWainscotPanelColor(
            wainscotColor
        );
    }
}

export function getPanelWidth() {
    return activePanelWidthM;
}

export function getPanelHeight() {
    return activePanelHeightM;
}

export function getPanelSystemState() {
    return {
        profile:
            activeProfile,

        density:
            activeDensity,

        panelWidthM:
            activePanelWidthM,

        panelHeightM:
            activePanelHeightM,

        texturePanelCountX:
            TEXTURE_PANEL_COUNT_X,

        texturePanelCountY:
            TEXTURE_PANEL_COUNT_Y
    };
}

export function calculatePanelCoordinate(
    positionM
) {
    return (
        positionM /
        activePanelWidthM
    );
}

export function calculatePanelRow(
    positionM
) {
    return (
        positionM /
        activePanelHeightM
    );
}

export function applyPanelUVs(
    geometry,
    originX = 0,
    originY = 0
) {
    const position =
        geometry.attributes.position;

    let uv =
        geometry.attributes.uv;

    if (!uv) {
        uv =
            new THREE.BufferAttribute(
                new Float32Array(
                    position.count * 2
                ),
                2
            );

        geometry.setAttribute(
            'uv',
            uv
        );
    }

    for (
        let i = 0;
        i < position.count;
        i++
    ) {
        const x =
            position.getX(i) -
            originX;

        const y =
            position.getY(i) -
            originY;

        uv.setX(
            i,
            calculatePanelCoordinate(
                x
            )
        );

        uv.setY(
            i,
            calculatePanelRow(
                y
            )
        );
    }

    uv.needsUpdate = true;

    return geometry;
}

export function getPanelCount(
    lengthM
) {
    if (
        !Number.isFinite(lengthM) ||
        lengthM <= 0
    ) {
        return 0;
    }

    return Math.ceil(
        lengthM /
        activePanelWidthM
    );
}

export function getPanelBoundary(
    index
) {
    return (
        index *
        activePanelWidthM
    );
}

export function getPanelBoundaries(
    lengthM
) {
    const count =
        getPanelCount(
            lengthM
        );

    const boundaries = [];

    for (
        let i = 0;
        i <= count;
        i++
    ) {
        boundaries.push(
            getPanelBoundary(i)
        );
    }

    return boundaries;
}