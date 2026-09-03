import * as THREE from 'three';

const PANEL_TEXTURE_SIZE =
    512;

const PANEL_WIDTH_M =
    0.9144;

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

const slotMapCache =
    new Map();

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

export function getPanelProfile(
    profileId = 'awr'
) {
    return (
        PANEL_PROFILES[profileId] ||
        PANEL_PROFILES.awr
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

    const x =
        (
            position *
            period
        ) %
        period;

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

function createPanelNormalMapTexture(
    profileId
) {
    const profile =
        getPanelProfile(
            profileId
        );

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

    const texture =
        base.clone();

    texture.userData = {
        ...(base.userData || {}),

        isSharedProcedural:
            false,

        isSlotTexture:
            true,

        slot
    };

    texture.needsUpdate =
        true;

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