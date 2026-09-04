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
    /*
     * Source materials may already have maps.
     * Panel profile is the only geometry map that
     * belongs to this generated panel material.
     */
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
        createNormalScale(
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

function resolveRepeatX(
    options,
    profileId
) {
    /*
     * UV / repeat contract (must be the same for roof, walls, wainscot):
     *
     * - Mesh UV.u runs 0..1 across the physical panel (or segment) width.
     * - options.span is that physical width in metres.
     * - repeatX = getPanelRepeat(span) = (span / profile.width) * TEXTURE_REPEATS_PER_PANEL
     *
     * Density of corrugation is therefore constant in periods per metre and
     * does not depend on how the wall/roof is subdivided into panels.
     *
     * Partial end panels pass their actual width as span so the last
     * period is proportional.
     *
     * Do NOT pass full-wall length as span when UV is 0..1 on a segment.
     * Do NOT use metre-space UVs with span-proportional repeatX (that
     * makes density proportional to panel width).
     */
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

    /*
     * Each physical panel owns its material.
     *
     * Texture ownership remains in PanelProfiles:
     * the material may be disposed without disposing
     * the shared procedural profile texture.
     */
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