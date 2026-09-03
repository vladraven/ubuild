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
    1;

const DEFAULT_REPEAT_Y =
    1;

const DEFAULT_NORMAL_SCALE =
    1;

const DEFAULT_BUMP_SCALE =
    0.25;

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

function createScale(
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
        map ?
        createScale(
            normalScale
        ) :
        new THREE.Vector2(
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
        map ?
        getPositive(
            bumpScale,
            DEFAULT_BUMP_SCALE
        ) :
        0;
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

    const span =
        getPositive(
            options.span,
            DEFAULT_SPAN
        );

    const repeatX =
        getPanelRepeat(
            span,
            profileId
        );

    const repeatY =
        getPositive(
            options.repeatY,
            DEFAULT_REPEAT_Y
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

        return;
    }

    applyHeightMap(
        material,
        profileId,
        slot,
        repeatX,
        repeatY,
        options.bumpScale
    );
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