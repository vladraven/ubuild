import * as THREE from 'three';

const PANEL_TEXTURE_SIZE =
    512;

const PANEL_WIDTH_M =
    0.9144;

const TEXTURE_REPEATS_PER_PANEL =
    2;

const HEIGHT_UNITS =
    4;

const RIB_HEIGHT_UNITS =
    1;

const RIB_HEIGHT =
    RIB_HEIGHT_UNITS /
    HEIGHT_UNITS;

const SMOOTH_HEIGHT =
    0;

const normalMapCache =
    new Map();

const heightMapCache =
    new Map();

const slotMapCache =
    new Map();

const PROFILE_ALIASES =
    Object.freeze({
        awr: 'awr',

        ssr24: 'ssr24',
        'ssr 24': 'ssr24',

        deltaspan: 'deltaSpan',
        'delta span': 'deltaSpan',
        delta_span: 'deltaSpan',

        eliterib: 'eliteRib',
        'elite rib': 'eliteRib',
        elite_rib: 'eliteRib',

        imp: 'imp',

        ultraspan: 'ultraSpan',
        'ultra span': 'ultraSpan',
        ultra_span: 'ultraSpan',

        widespan: 'wideSpan',
        'wide span': 'wideSpan',
        wide_span: 'wideSpan'
    });

const PROFILE_DEFINITIONS =
    Object.freeze({

        awr: Object.freeze({
            id: 'awr',
            name: 'AWR',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0, 1],
                [3, 1],
                [3, 0],
                [4, 0],
                [4, 1]
            ])
        }),

        ssr24: Object.freeze({
            id: 'ssr24',
            name: 'SSR24',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0, 1],
                [3, 1],
                [3, 0],
                [4, 0]
            ])
        }),

        deltaSpan: Object.freeze({
            id: 'deltaSpan',
            name: 'Delta Span',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [2, 0],
                [2, 1],
                [3, 1],
                [3, 0],
                [4, 0]
            ])
        }),

        eliteRib: Object.freeze({
            id: 'eliteRib',
            name: 'Elite Rib',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0, 1],
                [3, 1],
                [4, 0]
            ])
        }),

        imp: Object.freeze({
            id: 'imp',
            name: 'IMP',
            width: PANEL_WIDTH_M,
            height: SMOOTH_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [4, 0]
            ])
        }),

        ultraSpan: Object.freeze({
            id: 'ultraSpan',
            name: 'Ultra Span',
            width: PANEL_WIDTH_M,
            height: RIB_HEIGHT,

            profile: Object.freeze([
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [3, 0],
                [3, 1],
                [4, 1],
                [4, 0]
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
    const profile =
        getPanelProfile(
            profileId
        );

    return Math.max(
        1,
        (
            widthM /
            profile.width
        ) *
        TEXTURE_REPEATS_PER_PANEL
    );
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
        1 /
        size;

    for (
        let x = 0;
        x < size;
        x++
    ) {
        const position =
            x /
            size;

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
            ) *
            0.5;

        const nx =
            -slope;

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

        const normalizedX =
            nx /
            length;

        const normalizedY =
            ny /
            length;

        const normalizedZ =
            nz /
            length;

        const red =
            Math.round(
                (
                    normalizedX *
                    0.5 +
                    0.5
                ) *
                255
            );

        const green =
            Math.round(
                (
                    normalizedY *
                    0.5 +
                    0.5
                ) *
                255
            );

        const blue =
            Math.round(
                (
                    normalizedZ *
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
                index + 1
            ] =
                green;

            data[
                index + 2
            ] =
                blue;

            data[
                index + 3
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

    texture.needsUpdate =
        true;

    texture.userData = {
        isSharedProcedural:
            true,

        kind:
            'panelHeightMap',

        profileId:
            profile.id,

        panelDirection:
            'vertical'
    };

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

    texture.needsUpdate =
        true;

    texture.userData = {
        isSharedProcedural:
            true,

        kind:
            'panelNormalMap',

        profileId:
            profile.id,

        panelDirection:
            'vertical'
    };

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
    kind
) {
    if (
        !base
    ) {
        return null;
    }

    const texture =
        base.clone();

    texture.userData = {
        ...(base.userData || {}),

        isSharedProcedural:
            false,

        isSlotTexture:
            true,

        slot,
        kind
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
            'height' ?
            generatePanelHeightMap(
                profile.id
            ) :
            generatePanelNormalMap(
                profile.id
            );

        texture =
            createSlotTexture(
                base,
                slot,
                kind
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
    profileId = 'awr',
    slot = 'default',
    repeatX = 1,
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
    profileId = 'awr',
    slot = 'default',
    repeatX = 1,
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

export function clonePanelNormalMap(
    profileId = 'awr'
) {
    return createSlotTexture(
        generatePanelNormalMap(
            profileId
        ),
        'clone',
        'normal'
    );
}

export function clonePanelHeightMap(
    profileId = 'awr'
) {
    return createSlotTexture(
        generatePanelHeightMap(
            profileId
        ),
        'clone',
        'height'
    );
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

    for (
        const texture
        of heightMapCache.values()
    ) {
        texture.dispose();
    }

    heightMapCache.clear();
}