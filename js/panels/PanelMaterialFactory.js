import * as THREE from 'three';

import {
    getPanelHeightMapForUse,
    getPanelNormalMapForUse,
    getPanelRepeat,
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

const DEFAULT_NORMAL_SCALE =
    1.0;

const DEFAULT_BUMP_SCALE =
    0.25;

const ROOF_SLOT_PREFIX =
    'roof-';

export const PanelMapType =
    Object.freeze({
        NONE:
            'none',

        NORMAL:
            'normal',

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
        Object.values(
            PanelMapType
        ).includes(
            mapType
        )
    ) {
        return mapType;
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

function createNormalScale(
    value
) {
    const scale =
        getPositive(
            value,
            DEFAULT_NORMAL_SCALE
        );

    return new THREE.Vector2(
        scale,
        scale
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

function isRoofSlot(
    slot
) {
    return (
        typeof slot ===
        'string'
    ) &&
    slot.startsWith(
        ROOF_SLOT_PREFIX
    ) &&
    slot !==
    'roof-ceiling' &&
    slot !==
    'roof-side';
}

function logRoofMaterial(
    {
        profileId,
        slot,
        span,
        repeatX,
        repeatY,
        mapType,
        material
    }
) {
    if (
        !isRoofSlot(
            slot
        )
    ) {
        return;
    }

    console.log(
        '[Roof Panel Material]',
        {
            slot,

            profileId,

            mapType,

            span,

            repeatX,

            repeatY,

            sourceMap:
                material.map
                    ? {
                        uuid:
                            material.map.uuid,

                        repeat:
                            {
                                x:
                                    material
                                        .map
                                        .repeat
                                        .x,

                                y:
                                    material
                                        .map
                                        .repeat
                                        .y
                            }
                    }
                    : null,

            bumpMap:
                material.bumpMap
                    ? {
                        uuid:
                            material
                                .bumpMap
                                .uuid,

                        profileId:
                            material
                                .bumpMap
                                .userData
                                ?.profileId,

                        panelWidth:
                            material
                                .bumpMap
                                .userData
                                ?.panelWidth,

                        repeat:
                            {
                                x:
                                    material
                                        .bumpMap
                                        .repeat
                                        .x,

                                y:
                                    material
                                        .bumpMap
                                        .repeat
                                        .y
                            }
                    }
                    : null,

            normalMap:
                material.normalMap
                    ? {
                        uuid:
                            material
                                .normalMap
                                .uuid,

                        profileId:
                            material
                                .normalMap
                                .userData
                                ?.profileId,

                        panelWidth:
                            material
                                .normalMap
                                .userData
                                ?.panelWidth,

                        repeat:
                            {
                                x:
                                    material
                                        .normalMap
                                        .repeat
                                        .x,

                                y:
                                    material
                                        .normalMap
                                        .repeat
                                        .y
                            }
                    }
                    : null,

            bumpScale:
                material.bumpScale,

            normalScale:
                material
                    .normalScale
                    ?.toArray(),

            baseMapStillPresent:
                Boolean(
                    material.map
                )
        }
    );
}

function applyNormalMap(
    material,
    profileId,
    slot,
    repeatX,
    repeatY,
    normalScale
) {
    const map =
        getPanelNormalMapForUse(
            profileId,
            slot,
            repeatX,
            repeatY
        );

    material.normalMap =
        map;

    material.bumpMap =
        null;

    material.bumpScale =
        0;

    material.normalScale =
        map
            ? createNormalScale(
                normalScale
            )
            : new THREE.Vector2(
                0,
                0
            );
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
}

function resolveRepeatX(
    options,
    profileId
) {
    if (
        Number.isFinite(
            options.repeatX
        ) &&
        options.repeatX > 0
    ) {
        return options.repeatX;
    }

    const span =
        getPositive(
            options.span,
            DEFAULT_SPAN
        );

    return getPanelRepeat(
        span,
        profileId
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

function applyMaps(
    material,
    options
) {
    const mapType =
        normalizeMapType(
            options.mapType
        );

    clearMaps(
        material
    );

    if (
        mapType ===
        PanelMapType.NONE
    ) {
        return;
    }

    const profileId =
        normalizePanelProfile(
            options.profileId ||
            DEFAULT_PROFILE
        );

    const slot =
        options.slot ||
        DEFAULT_SLOT;

    const repeatX =
        resolveRepeatX(
            options,
            profileId
        );

    const repeatY =
        resolveRepeatY(
            options
        );

    if (
        mapType ===
        PanelMapType.NORMAL
    ) {
        applyNormalMap(
            material,
            profileId,
            slot,
            repeatX,
            repeatY,
            options.normalScale
        );

        logRoofMaterial(
            {
                profileId,

                slot,

                span:
                    getPositive(
                        options.span,
                        DEFAULT_SPAN
                    ),

                repeatX,

                repeatY,

                mapType,

                material
            }
        );

        return;
    }

    if (
        mapType ===
        PanelMapType.HEIGHT
    ) {
        applyHeightMap(
            material,
            profileId,
            slot,
            repeatX,
            repeatY,
            options.bumpScale
        );

        logRoofMaterial(
            {
                profileId,

                slot,

                span:
                    getPositive(
                        options.span,
                        DEFAULT_SPAN
                    ),

                repeatX,

                repeatY,

                mapType,

                material
            }
        );
    }
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
    options,
    slot
) {
    const profileId =
        normalizePanelProfile(
            options.profileId ||
            DEFAULT_PROFILE
        );

    material.userData =
        {
            ...material.userData,

            panelMaterial:
                true,

            panelProfile:
                profileId,

            panelSlot:
                slot,

            panelMapType:
                normalizeMapType(
                    options.mapType
                ),

            panelSpan:
                getPositive(
                    options.span,
                    DEFAULT_SPAN
                )
        };
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

    applyMetadata(
        material,
        options,
        slot
    );

    applyMaps(
        material,
        {
            ...options,

            slot
        }
    );

    material.needsUpdate =
        true;

    return material;
}