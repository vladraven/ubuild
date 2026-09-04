import * as THREE from 'three';

const PANEL_WIDTH_M =
    1.0;

const PANEL_TEXTURE_SIZE =
    1024;

const RIB_HEIGHT =
    1;

const SMOOTH_HEIGHT =
    0;

const NORMAL_STRENGTH =
    1.5;

const NORMAL_SAMPLE_PIXELS =
    2;

/*
 * Profile periods packed into one panel-width of texture UV.
 * With UV.u = 0..1 across a physical span of `profile.width` metres,
 * corrugation density is TEXTURE_REPEATS_PER_PANEL periods per panel width.
 * Keep this in sync with the UV contract in PanelMaterialFactory.
 */
const TEXTURE_REPEATS_PER_PANEL =
    1;

const heightMapCache =
    new Map();

const normalMapCache =
    new Map();

const slotMapCache =
    new Map();

export const PROFILE_DEFINITIONS =
    Object.freeze({

        awr: Object.freeze({
            id: 'awr',
            name: 'AWR',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0.08, 0],
                [0.08, 1],
                [0.16, 1],
                [0.16, 0],

                [0.33, 0],
                [0.33, 1],
                [0.41, 1],
                [0.41, 0],

                [0.58, 0],
                [0.58, 1],
                [0.66, 1],
                [0.66, 0],

                [0.83, 0],
                [0.83, 1],
                [0.91, 1],
                [0.91, 0],

                [1, 0]
            ])
        }),

        deltaSpan: Object.freeze({
            id: 'deltaSpan',
            name: 'Delta Span',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0.08, 0],
                [0.08, 1],
                [0.16, 1],
                [0.16, 0],

                [0.33, 0],
                [0.33, 1],
                [0.41, 1],
                [0.41, 0],

                [0.58, 0],
                [0.58, 1],
                [0.66, 1],
                [0.66, 0],

                [0.83, 0],
                [0.83, 1],
                [0.91, 1],
                [0.91, 0],

                [1, 0]
            ])
        }),

        eliteRib: Object.freeze({
            id: 'eliteRib',
            name: 'Elite Rib',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0.05, 0],
                [0.05, 1],
                [0.12, 1],
                [0.12, 0],

                [0.30, 0],
                [0.30, 1],
                [0.37, 1],
                [0.37, 0],

                [0.55, 0],
                [0.55, 1],
                [0.62, 1],
                [0.62, 0],

                [0.80, 0],
                [0.80, 1],
                [0.87, 1],
                [0.87, 0],

                [1, 0]
            ])
        }),

        imp: Object.freeze({
            id: 'imp',
            name: 'IMP',
            width: PANEL_WIDTH_M,
            height: SMOOTH_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [1, 0]
            ])
        }),

        ssr24: Object.freeze({
            id: 'ssr24',
            name: 'SSR24',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0.04, 0],
                [0.04, 1],
                [0.08, 1],
                [0.08, 0],

                [0.29, 0],
                [0.29, 1],
                [0.33, 1],
                [0.33, 0],

                [0.54, 0],
                [0.54, 1],
                [0.58, 1],
                [0.58, 0],

                [0.79, 0],
                [0.79, 1],
                [0.83, 1],
                [0.83, 0],

                [1, 0]
            ])
        }),

        ultraSpan: Object.freeze({
            id: 'ultraSpan',
            name: 'Ultra Span',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0.06, 0],
                [0.06, 1],
                [0.14, 1],
                [0.14, 0],

                [0.36, 0],
                [0.36, 1],
                [0.44, 1],
                [0.44, 0],

                [0.66, 0],
                [0.66, 1],
                [0.74, 1],
                [0.74, 0],

                [0.94, 0],
                [0.94, 1],
                [1, 1]
            ])
        }),

        wideSpan: Object.freeze({
            id: 'wideSpan',
            name: 'Wide Span',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [1, 0],
                [1, 1],
                [3, 1],
                [3, 0],
                [4, 0]
            ])
        })
    });

export const PANEL_PROFILES =
    PROFILE_DEFINITIONS;

export const WALL_PANEL_PROFILES =
    Object.freeze([
        'awr',
        'deltaSpan',
        'eliteRib',
        'imp',
        'ultraSpan',
        'wideSpan'
    ]);

export const ROOF_PANEL_PROFILES =
    Object.freeze([
        'awr',
        'ssr24'
    ]);

const PROFILE_ALIASES =
    Object.freeze({

        awr: 'awr',
        'a wr': 'awr',

        delta: 'deltaSpan',
        'delta span': 'deltaSpan',
        deltaspan: 'deltaSpan',

        elite: 'eliteRib',
        'elite rib': 'eliteRib',
        eliterib: 'eliteRib',

        imp: 'imp',

        ssr: 'ssr24',
        ssr24: 'ssr24',
        'ssr 24': 'ssr24',

        ultra: 'ultraSpan',
        'ultra span': 'ultraSpan',
        ultraspan: 'ultraSpan',

        wide: 'wideSpan',
        'wide span': 'wideSpan',
        widespan: 'wideSpan'
    });

export function normalizePanelProfile(
    profileId = 'awr'
) {
    const raw =
        String(
            profileId
        ).trim();

    if (
        PANEL_PROFILES[raw]
    ) {
        return raw;
    }

    const normalized =
        raw
            .toLowerCase()
            .replace(
                /[\s_-]+/g,
                ' '
            )
            .trim();

    return (
        PROFILE_ALIASES[normalized] ||
        PROFILE_ALIASES[
            normalized.replace(
                /\s+/g,
                ''
            )
        ] ||
        'awr'
    );
}

export function getPanelProfile(
    profileId = 'awr'
) {
    const key =
        normalizePanelProfile(
            profileId
        );

    return PANEL_PROFILES[key];
}

export function getPanelRepeat(
    widthM,
    profileId = 'awr'
) {
    const width =
        Number(
            widthM
        );

    const profile =
        getPanelProfile(
            profileId
        );

    if (
        !Number.isFinite(
            width
        ) ||
        width <= 0
    ) {
        return TEXTURE_REPEATS_PER_PANEL;
    }

    return (
        width /
        profile.width
    ) *
    TEXTURE_REPEATS_PER_PANEL;
}

function getHeightAt(
    profile,
    position
) {
    const points =
        profile.profile;

    const period =
        points[
            points.length - 1
        ][0];

    let x =
        (
            position *
            period
        ) %
        period;

    if (
        x < 0
    ) {
        x += period;
    }

    for (
        let i = 0;
        i < points.length - 1;
        i++
    ) {
        const current =
            points[i];

        const next =
            points[i + 1];

        if (
            x < current[0] ||
            x > next[0]
        ) {
            continue;
        }

        const span =
            next[0] -
            current[0];

        if (
            span === 0
        ) {
            return current[1];
        }

        const progress =
            (
                x -
                current[0]
            ) /
            span;

        return (
            current[1] +
            (
                next[1] -
                current[1]
            ) *
            progress
        );
    }

    return points[0][1];
}

function createHeightMapData(
    profile
) {
    const size =
        PANEL_TEXTURE_SIZE;

    const data =
        new Uint8Array(
            size *
            size
        );

    for (
        let x = 0;
        x < size;
        x++
    ) {
        const height =
            getHeightAt(
                profile,
                x / size
            );

        const value =
            Math.round(
                height *
                255
            );

        for (
            let y = 0;
            y < size;
            y++
        ) {
            data[
                y *
                size +
                x
            ] =
                value;
        }
    }

    return data;
}

function getNormalAt(
    profile,
    position,
    sampleStep
) {
    const left =
        getHeightAt(
            profile,
            position -
            sampleStep
        );

    const right =
        getHeightAt(
            profile,
            position +
            sampleStep
        );

    const slope =
        (
            right -
            left
        ) /
        (
            sampleStep *
            2
        );

    const nx =
        -slope *
        NORMAL_STRENGTH;

    const ny =
        0;

    const nz =
        1;

    const length =
        Math.hypot(
            nx,
            ny,
            nz
        );

    return {
        x:
            nx /
            length,

        y:
            ny,

        z:
            nz /
            length
    };
}

function createNormalMapData(
    profile
) {
    const size =
        PANEL_TEXTURE_SIZE;

    const data =
        new Uint8Array(
            size *
            size *
            4
        );

    const sampleStep =
        NORMAL_SAMPLE_PIXELS /
        size;

    for (
        let x = 0;
        x < size;
        x++
    ) {
        const normal =
            getNormalAt(
                profile,
                x / size,
                sampleStep
            );

        const red =
            Math.round(
                (
                    normal.x *
                    0.5 +
                    0.5
                ) *
                255
            );

        const green =
            Math.round(
                (
                    normal.y *
                    0.5 +
                    0.5
                ) *
                255
            );

        const blue =
            Math.round(
                (
                    normal.z *
                    0.5 +
                    0.5
                ) *
                255
            );

        for (
            let y = 0;
            y < size;
            y++
        ) {
            const index =
                (
                    y *
                    size +
                    x
                ) *
                4;

            data[index] =
                red;

            data[
                index +
                1
            ] =
                green;

            data[
                index +
                2
            ] =
                blue;

            data[
                index +
                3
            ] =
                255;
        }
    }

    return data;
}

function createHeightMapTexture(
    profileId
) {
    const profile =
        getPanelProfile(
            profileId
        );

    if (
        profile.height ===
        SMOOTH_HEIGHT
    ) {
        return null;
    }

    const texture =
        new THREE.DataTexture(
            createHeightMapData(
                profile
            ),
            PANEL_TEXTURE_SIZE,
            PANEL_TEXTURE_SIZE,
            THREE.RedFormat,
            THREE.UnsignedByteType
        );

    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.magFilter =
        THREE.LinearFilter;

    texture.minFilter =
        THREE.LinearMipmapLinearFilter;

    texture.generateMipmaps =
        true;

    texture.colorSpace =
        THREE.NoColorSpace;

    texture.userData = {
        isSharedProcedural:
            true,

        kind:
            'panelHeightMap',

        profileId:
            profile.id,

        panelWidth:
            PANEL_WIDTH_M,

        repeatsPerPanel:
            TEXTURE_REPEATS_PER_PANEL,

        panelDirection:
            'vertical'
    };

    texture.needsUpdate =
        true;

    return texture;
}

function createPanelNormalMapTexture(
    profileId
) {
    const profile =
        getPanelProfile(
            profileId
        );

    if (
        profile.height ===
        SMOOTH_HEIGHT
    ) {
        return null;
    }

    const texture =
        new THREE.DataTexture(
            createNormalMapData(
                profile
            ),
            PANEL_TEXTURE_SIZE,
            PANEL_TEXTURE_SIZE,
            THREE.RGBAFormat,
            THREE.UnsignedByteType
        );

    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.magFilter =
        THREE.LinearFilter;

    texture.minFilter =
        THREE.LinearMipmapLinearFilter;

    texture.generateMipmaps =
        true;

    texture.colorSpace =
        THREE.NoColorSpace;

    texture.userData = {
        isSharedProcedural:
            true,

        kind:
            'panelNormalMap',

        profileId:
            profile.id,

        panelWidth:
            PANEL_WIDTH_M,

        repeatsPerPanel:
            TEXTURE_REPEATS_PER_PANEL,

        panelDirection:
            'vertical'
    };

    texture.needsUpdate =
        true;

    return texture;
}

export function generatePanelHeightMap(
    profileId = 'awr'
) {
    const key =
        getPanelProfile(
            profileId
        ).id;

    if (
        key === 'imp'
    ) {
        return null;
    }

    if (
        !heightMapCache.has(
            key
        )
    ) {
        heightMapCache.set(
            key,
            createHeightMapTexture(
                key
            )
        );
    }

    return heightMapCache.get(
        key
    );
}

export function generatePanelNormalMap(
    profileId = 'awr'
) {
    const key =
        getPanelProfile(
            profileId
        ).id;

    if (
        key === 'imp'
    ) {
        return null;
    }

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

function createSlotTexture(
    base,
    slot,
    kind,
    profileId
) {
    if (
        !base
    ) {
        return null;
    }

    const texture =
        base.clone();

    texture.userData = {
        ...(
            base.userData ||
            {}
        ),

        isSharedProcedural:
            false,

        isSlotTexture:
            true,

        slot,

        kind,

        profileId
    };

    texture.needsUpdate =
        true;

    return texture;
}

function getSlotTexture(
    profileId,
    slot,
    repeatX,
    repeatY,
    kind
) {
    const profile =
        getPanelProfile(
            profileId
        );

    if (
        profile.height ===
        SMOOTH_HEIGHT
    ) {
        return null;
    }

    const cacheKey =
        `${kind}:${profile.id}:${slot}`;

    let texture =
        slotMapCache.get(
            cacheKey
        );

    if (
        !texture
    ) {
        const base =
            kind ===
            'height'
                ? generatePanelHeightMap(
                    profile.id
                )
                : generatePanelNormalMap(
                    profile.id
                );

        texture =
            createSlotTexture(
                base,
                slot,
                kind,
                profile.id
            );

        slotMapCache.set(
            cacheKey,
            texture
        );
    }

    texture.repeat.set(
        repeatX,
        repeatY
    );

    texture.needsUpdate =
        true;

    return texture;
}

export function getPanelHeightMapForUse(
    profileId,
    slot,
    repeatX,
    repeatY = 1
) {
    return getSlotTexture(
        profileId,
        slot,
        repeatX,
        repeatY,
        'height'
    );
}

export function getPanelNormalMapForUse(
    profileId,
    slot,
    repeatX,
    repeatY = 1
) {
    return getSlotTexture(
        profileId,
        slot,
        repeatX,
        repeatY,
        'normal'
    );
}

export function clearPanelTextureCache() {
    for (
        const texture
        of heightMapCache.values()
    ) {
        texture.dispose();
    }

    for (
        const texture
        of normalMapCache.values()
    ) {
        texture.dispose();
    }

    for (
        const texture
        of slotMapCache.values()
    ) {
        texture.dispose();
    }

    heightMapCache.clear();

    normalMapCache.clear();

    slotMapCache.clear();
}