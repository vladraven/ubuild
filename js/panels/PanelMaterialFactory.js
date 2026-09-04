import * as THREE from 'three';

import {
    getPanelHeightMapForUse,
    getPanelProfile,
    normalizePanelProfile
} from './PanelProfiles.js';

const DEFAULT_PROFILE =
    'awr';

const DEFAULT_SLOT =
    'panel';

const DEFAULT_SPAN =
    1.0;

const DEFAULT_REPEAT_Y =
    1.0;

const DEFAULT_BUMP_SCALE =
    0.5;

const DEFAULT_PROFILE_WIDTH =
    1.0;

export const PanelMapType =
    Object.freeze({
        NONE:
            'none',

        HEIGHT:
            'height'
    });

function assertSource(
    source
) {
    if (
        !source ||
        !source.isMaterial
    ) {
        throw new TypeError(
            'Source material is required'
        );
    }
}

function normalizeMapType(
    mapType
) {
    if (
        mapType ===
        PanelMapType.HEIGHT
    ) {
        return PanelMapType.HEIGHT;
    }

    return PanelMapType.NONE;
}

function getPositive(
    value,
    fallback
) {
    if (
        Number.isFinite(
            value
        ) &&
        value > 0
    ) {
        return value;
    }

    return fallback;
}

function resolveProfileId(
    options
) {
    return normalizePanelProfile(
        options.profileId ||
        DEFAULT_PROFILE
    );
}

function resolveProfile(
    profileId
) {
    return getPanelProfile(
        profileId
    );
}

function resolveSpan(
    options
) {
    return getPositive(
        options.span,
        DEFAULT_SPAN
    );
}

function resolveProfileWidth(
    profile
) {
    return getPositive(
        profile?.width,
        DEFAULT_PROFILE_WIDTH
    );
}

function resolveRepeatX(
    options,
    profileId
) {
    const span =
        resolveSpan(
            options
        );

    const profile =
        resolveProfile(
            profileId
        );

    const profileWidth =
        resolveProfileWidth(
            profile
        );

    return (
        span /
        profileWidth
    );
}

function resolveRepeatY(
    options
) {
    return getPositive(
        options.repeatY,
        DEFAULT_REPEAT_Y
    );
}

function clearMaps(
    material
) {
    material.normalMap =
        null;

    material.bumpMap =
        null;

    material.normalScale =
        new THREE.Vector2(
            0,
            0
        );

    material.bumpScale =
        0;
}

function applyHeightMap(
    material,
    profileId,
    slot,
    repeatX,
    repeatY,
    bumpScale
) {
    const map =
        getPanelHeightMapForUse(
            profileId,
            slot,
            repeatX,
            repeatY
        );

    material.normalMap =
        null;

    material.normalScale =
        new THREE.Vector2(
            0,
            0
        );

    material.bumpMap =
        map;

    material.bumpScale =
        map
            ? getPositive(
                bumpScale,
                DEFAULT_BUMP_SCALE
            )
            : 0;

    return map;
}

function applyMaps(
    material,
    options
) {
    const slot =
        options.slot ||
        DEFAULT_SLOT;

    const mapType =
        normalizeMapType(
            options.mapType
        );

    clearMaps(
        material
    );

    const profileId =
        resolveProfileId(
            options
        );

    const span =
        resolveSpan(
            options
        );

    if (
        mapType ===
        PanelMapType.NONE
    ) {
        return {
            mapType,
            profileId,
            span,
            repeatX:
                0,
            repeatY:
                0,
            profileWidth:
                0,
            map:
                null
        };
    }

    const profile =
        resolveProfile(
            profileId
        );

    const profileWidth =
        resolveProfileWidth(
            profile
        );

    const repeatX =
        resolveRepeatX(
            options,
            profileId
        );

    const repeatY =
        resolveRepeatY(
            options
        );

    const map =
        applyHeightMap(
            material,
            profileId,
            slot,
            repeatX,
            repeatY,
            options.bumpScale
        );

    return {
        mapType,
        profileId,
        span,
        repeatX,
        repeatY,
        profileWidth,
        map
    };
}

function applySide(
    material,
    side
) {
    material.side =
        side ??
        THREE.DoubleSide;
}

function applyName(
    material,
    slot
) {
    material.name =
        `panel-${slot}`;
}

function applyMetadata(
    material,
    result,
    slot
) {
    material.userData =
        {
            ...material.userData,

            panelMaterial:
                true,

            panelProfile:
                result.profileId,

            panelSlot:
                slot,

            panelMapType:
                result.mapType,

            panelSpan:
                result.span,

            panelProfileWidth:
                result.profileWidth,

            panelRepeatX:
                result.repeatX,

            panelRepeatY:
                result.repeatY
        };
}

function getTextureData(
    texture
) {
    if (
        !texture
    ) {
        return null;
    }

    return {
        uuid:
            texture.uuid,

        profileId:
            texture.userData
                ?.profileId,

        slot:
            texture.userData
                ?.slot,

        repeat:
            {
                x:
                    texture.repeat.x,

                y:
                    texture.repeat.y
            },

        wrapS:
            texture.wrapS,

        wrapT:
            texture.wrapT,

        imageWidth:
            texture.image?.width,

        imageHeight:
            texture.image?.height,

        format:
            texture.format,

        type:
            texture.type
    };
}

function logRoofMaterial(
    slot,
    material,
    result
) {
    if (
        typeof slot !==
        'string'
    ) {
        return;
    }

    if (
        !slot.startsWith(
            'roof-'
        )
    ) {
        return;
    }

    console.log(
        '[Roof Panel Material]',
        {
            slot,

            profileId:
                result.profileId,

            mapType:
                result.mapType,

            span:
                result.span,

            profileWidth:
                result.profileWidth,

            repeatX:
                result.repeatX,

            repeatY:
                result.repeatY,

            expectedPanelCount:
                result.profileWidth > 0
                    ? result.span /
                    result.profileWidth
                    : 0,

            bumpMap:
                getTextureData(
                    material.bumpMap
                ),

            normalMap:
                getTextureData(
                    material.normalMap
                ),

            bumpScale:
                material.bumpScale,

            normalScale:
                material
                    .normalScale
                    ?.toArray(),

            side:
                material.side,

            materialType:
                material.type,

            materialName:
                material.name
        }
    );
}

export function createPanelMaterial(
    source,
    options = {}
) {
    assertSource(
        source
    );

    const material =
        source.clone();

    const slot =
        options.slot ||
        DEFAULT_SLOT;

    applyName(
        material,
        slot
    );

    applySide(
        material,
        options.side
    );

    const result =
        applyMaps(
            material,
            {
                ...options,
                slot
            }
        );

    applyMetadata(
        material,
        result,
        slot
    );

    logRoofMaterial(
        slot,
        material,
        result
    );

    material.needsUpdate =
        true;

    return material;
}