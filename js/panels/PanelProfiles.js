import * as THREE from 'three';

export const PANEL_PROFILES = Object.freeze({
    awr: Object.freeze({
        id: 'awr',
        name: 'AWR Panel',
        width: 0.9144,
        ribSpacing: 0.3048,
        ribHeight: 0.019,
        majorRibWidth: 0.038,
        minorRibsCount: 2
    }),

    pbr: Object.freeze({
        id: 'pbr',
        name: 'PBR Panel',
        width: 0.9144,
        ribSpacing: 0.3048,
        ribHeight: 0.03175,
        majorRibWidth: 0.05,
        minorRibsCount: 2
    }),

    corrugated: Object.freeze({
        id: 'corrugated',
        name: 'Corrugated Panel',
        width: 0.6604,
        ribSpacing: 0.0635,
        ribHeight: 0.0127,
        majorRibWidth: 0.03,
        minorRibsCount: 0
    })
});

const normalMapCache =
    new Map();

const slotMapCache =
    new Map();

export function getPanelProfile(
    profileId = 'awr'
) {
    return (
        PANEL_PROFILES[profileId] ||
        PANEL_PROFILES.awr
    );
}

function createPanelNormalMapTexture(
    profileId
) {
    const profile =
        getPanelProfile(
            profileId
        );

    const size =
        512;

    const canvas =
        document.createElement(
            'canvas'
        );

    canvas.width =
        size;

    canvas.height =
        size;

    const ctx =
        canvas.getContext(
            '2d'
        );

    if (
        !ctx
    ) {
        throw new Error(
            '2D canvas context unavailable for panel normal map'
        );
    }

    ctx.fillStyle =
        'rgb(128, 128, 255)';

    ctx.fillRect(
        0,
        0,
        size,
        size
    );

    const ribsTotal =
        Math.max(
            1,
            Math.round(
                profile.width /
                profile.ribSpacing
            )
        );

    const stepPx =
        size /
        ribsTotal;

    for (
        let i = 0;
        i < ribsTotal;
        i++
    ) {
        const x =
            i *
            stepPx;

        const ribWidthPx =
            Math.max(
                4,
                stepPx *
                0.25
            );

        const gradLeft =
            ctx.createLinearGradient(
                x,
                0,
                x +
                ribWidthPx /
                2,
                0
            );

        gradLeft.addColorStop(
            0,
            'rgb(128, 128, 255)'
        );

        gradLeft.addColorStop(
            1,
            'rgb(220, 128, 200)'
        );

        ctx.fillStyle =
            gradLeft;

        ctx.fillRect(
            x,
            0,
            ribWidthPx /
            2,
            size
        );

        const gradRight =
            ctx.createLinearGradient(
                x +
                ribWidthPx /
                2,
                0,
                x +
                ribWidthPx,
                0
            );

        gradRight.addColorStop(
            0,
            'rgb(35, 128, 200)'
        );

        gradRight.addColorStop(
            1,
            'rgb(128, 128, 255)'
        );

        ctx.fillStyle =
            gradRight;

        ctx.fillRect(
            x +
            ribWidthPx /
            2,
            0,
            ribWidthPx /
            2,
            size
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

    texture.anisotropy =
        4;

    texture.userData = {
        isSharedProcedural:
            true,

        kind:
            'panelNormalMap',

        profileId:
            profile.id
    };

    return texture;
}

export function generatePanelNormalMap(
    profileId = 'awr'
) {
    const key =
        getPanelProfile(
            profileId
        ).id;

    if (
        !normalMapCache.has(
            key
        )
    ) {
        normalMapCache.set(
            key,
            createPanelNormalMapTexture(
                key
            )
        );
    }

    return normalMapCache.get(
        key
    );
}

function createSlotNormalMap(
    profileId,
    slot
) {
    const base =
        generatePanelNormalMap(
            profileId
        );

    const image =
        base.image;

    if (
        !image
    ) {
        throw new Error(
            `Panel normal map image is unavailable for profile "${profileId}"`
        );
    }

    const texture =
        new THREE.Texture(
            image
        );

    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.magFilter =
        base.magFilter;

    texture.minFilter =
        base.minFilter;

    texture.generateMipmaps =
        base.generateMipmaps;

    texture.anisotropy =
        base.anisotropy;

    texture.flipY =
        base.flipY;

    texture.colorSpace =
        base.colorSpace;

    texture.needsUpdate =
        true;

    texture.userData = {
        ...(base.userData || {}),

        isSharedProcedural:
            false,

        isSlotTexture:
            true,

        slot
    };

    return texture;
}

export function clonePanelNormalMap(
    profileId = 'awr'
) {
    return createSlotNormalMap(
        profileId,
        'clone'
    );
}

export function getPanelNormalMapForUse(
    profileId = 'awr',
    slot = 'default',
    repeatX = 1,
    repeatY = 1
) {
    const profileKey =
        getPanelProfile(
            profileId
        ).id;

    const cacheKey =
        `${profileKey}:${slot}`;

    let texture =
        slotMapCache.get(
            cacheKey
        );

    if (
        !texture
    ) {
        texture =
            createSlotNormalMap(
                profileKey,
                slot
            );

        slotMapCache.set(
            cacheKey,
            texture
        );
    }

    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.repeat.set(
        repeatX,
        repeatY
    );

    return texture;
}

export function applyPhysicalPanelUVs(
    geometry,
    widthM,
    heightM,
    profileId = 'awr'
) {
    if (
        !geometry ||
        !geometry.attributes.position
    ) {
        return;
    }

    const profile =
        getPanelProfile(
            profileId
        );

    const uRepeat =
        widthM /
        profile.width;

    const vRepeat =
        heightM /
        profile.width;

    const uvAttr =
        geometry.attributes.uv;

    if (
        !uvAttr
    ) {
        return;
    }

    for (
        let i = 0;
        i < uvAttr.count;
        i++
    ) {
        const u =
            uvAttr.getX(
                i
            ) *
            uRepeat;

        const v =
            uvAttr.getY(
                i
            ) *
            vRepeat;

        uvAttr.setXY(
            i,
            u,
            v
        );
    }

    uvAttr.needsUpdate =
        true;
}

export function disposePanelNormalMaps() {
    for (
        const texture
        of slotMapCache.values()
    ) {
        texture.dispose();
    }

    slotMapCache.clear();

    for (
        const texture
        of normalMapCache.values()
    ) {
        texture.dispose();
    }

    normalMapCache.clear();
}