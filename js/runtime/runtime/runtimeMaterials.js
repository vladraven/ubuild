import {
    THREE
}
from './runtimeImports.js';

const MATERIAL_COLOR_DEBUG =
    true;

const COLOR_MUTATION_METHODS = [
    'copy',
    'set',
    'setHex',
    'setRGB',
    'setHSL',
    'fromArray'
];

const LINER_RIDGE_UNITS =
    4;

const LINER_GAP_UNITS =
    4;

const LINER_TEXTURE_WIDTH =
    512;

const LINER_TEXTURE_HEIGHT =
    2;

const LINER_BUMP_SCALE =
    0.2;

function normalizeColor(
    value,
    fallback) {
    if (
        value instanceof THREE.Color) {
        return value.clone();
    }

    if (
        typeof value === 'number' &&
        Number.isFinite(value)) {
        return new THREE.Color(
            value);
    }

    if (
        typeof value === 'string') {
        const normalized =
            value.trim();

        if (
            normalized !== '') {
            try {
                return new THREE.Color(
                    normalized);
            } catch {}
        }
    }

    return new THREE.Color(
        fallback);
}

function formatColor(
    color) {
    if (
        !color ||
        typeof color.getHexString !==
        'function') {
        return null;
    }

    return `#${color.getHexString()}`;
}

function logMaterialColor(
    label,
    material) {
    if (
        !MATERIAL_COLOR_DEBUG) {
        return;
    }

    console.log(
        'MATERIAL COLOR',
        label, {
        uuid:
        material?.uuid,

        color:
        formatColor(
            material?.color)
    });
}

function watchMaterialColor(
    label,
    material) {
    if (
        !MATERIAL_COLOR_DEBUG ||
        !material?.color ||
        material.userData
        ?.materialColorWatchEnabled) {
        return;
    }

    material.userData =
        material.userData || {};

    material.userData
    .materialColorWatchEnabled =
        true;

    for (
        const methodName
        of COLOR_MUTATION_METHODS) {
        const original =
            material.color[
                methodName
            ];

        if (
            typeof original !==
            'function') {
            continue;
        }

        material.color[
            methodName
        ] =
        function watchedColorMutation(
            ...args) {
            const before =
                formatColor(
                    this);

            const result =
                original.apply(
                    this,
                    args);

            const after =
                formatColor(
                    this);

            if (
                before === after) {
                return result;
            }

            console.groupCollapsed(
                'MATERIAL COLOR MUTATION',
                label,
                material.uuid,
                methodName,
`${before} -> ${after}`);

            console.log(
                'material',
                material);

            console.log(
                'arguments',
                args);

            console.trace(
                'Color mutation stack');

            console.groupEnd();

            return result;
        };
    }
}

function createPanelMaterial(
    color) {
    return new THREE.MeshStandardMaterial({
        color,

        metalness:
        0.1,

        roughness:
        0.55,

        envMapIntensity:
        1.0,

        side:
        THREE.DoubleSide
    });
}

function createMetalMaterial(
    color,
    metalness,
    roughness) {
    return new THREE.MeshStandardMaterial({
        color,
        metalness,
        roughness,
        side:
        THREE.DoubleSide
    });
}

function createLinerBumpMap() {
    const data =
        new Uint8Array(
            LINER_TEXTURE_WIDTH *
            LINER_TEXTURE_HEIGHT);

    const periodUnits =
        LINER_RIDGE_UNITS +
        LINER_GAP_UNITS;

    const ridgeRatio =
        LINER_RIDGE_UNITS /
        periodUnits;

    for (
        let y = 0;
        y < LINER_TEXTURE_HEIGHT;
        y++) {
        for (
            let x = 0;
            x < LINER_TEXTURE_WIDTH;
            x++) {
            const index =
                (
                y *
                LINER_TEXTURE_WIDTH) +
            x;

            const position =
                x /
                LINER_TEXTURE_WIDTH;

            // 4H ridge, 4H gap.
            data[index] =
                position < ridgeRatio ?
                255 :
                0;
        }
    }

    const texture =
        new THREE.DataTexture(
            data,
            LINER_TEXTURE_WIDTH,
            LINER_TEXTURE_HEIGHT,
            THREE.RedFormat,
            THREE.UnsignedByteType);

    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.magFilter =
        THREE.LinearFilter;

    texture.minFilter =
        THREE.LinearFilter;

    texture.generateMipmaps =
        false;

    texture.colorSpace =
        THREE.NoColorSpace;

    texture.needsUpdate =
        true;

    return texture;
}

function registerMaterial(
    materials,
    name,
    material) {
    materials.set(
        name,
        material);

    watchMaterialColor(
        name,
        material);

    logMaterialColor(
`REGISTER ${name}`,
        material);

    return material;
}

function copyMaterialColor(
    name,
    material,
    color) {
    const before =
        formatColor(
            material.color);

    const requested =
        formatColor(
            color);

    console.log(
        'APPLY MATERIAL COLOR',
        name, {
        uuid:
        material.uuid,

        before,

        requested
    });

    material.color.copy(
        color);

    console.log(
        'APPLY MATERIAL COLOR RESULT',
        name, {
        uuid:
        material.uuid,

        after:
        formatColor(
            material.color)
    });
}

export function createMaterialSystem(
    model) {
    const colors =
        model?.colors || {};

    const linerBumpMap =
        createLinerBumpMap();

    const materials =
        new Map();

    registerMaterial(
        materials,
        'wallMetal',
        createPanelMaterial(
            normalizeColor(
                colors.wall,
                0xffffff)));

    registerMaterial(
        materials,
        'wall',
        createPanelMaterial(
            normalizeColor(
                colors.wall,
                0xffffff)));

    registerMaterial(
        materials,
        'wainscotMetal',
        createPanelMaterial(
            normalizeColor(
                colors.wainscot,
                0xffffff)));

    registerMaterial(
        materials,
        'roofMetal',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.roof,
                0xffffff),

            metalness:
            0.55,

            roughness:
            0.34,

            envMapIntensity:
            1.15,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'structuralSteel',
        createMetalMaterial(
            normalizeColor(
                colors.steel ??
                colors.frame,
                0xffffff),
            0.65,
            0.45));

    registerMaterial(
        materials,
        'steel',
        createMetalMaterial(
            normalizeColor(
                colors.steel ??
                colors.frame,
                0xffffff),
            0.65,
            0.45));

    registerMaterial(
        materials,
        'concrete',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.concrete,
                0xb8b8b8),

            metalness:
            0.1,

            roughness:
            0.9,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'trimMetal',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.trim,
                0xffffff),

            metalness:
            0.65,

            roughness:
            0.28,

            envMapIntensity:
            1.2,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'eaveTrim',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.eaveTrim ??
                colors.trim,
                0xffffff),

            metalness:
            0.65,

            roughness:
            0.28,

            envMapIntensity:
            1.2,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'doorTrim',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.trim,
                0xffffff),

            metalness:
            0.65,

            roughness:
            0.28,

            envMapIntensity:
            1.2,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'doorFrame',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.trim,
                0xffffff),

            metalness:
            0.65,

            roughness:
            0.28,

            envMapIntensity:
            1.2,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'frame',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.frame ??
                colors.steel,
                0xffffff),

            metalness:
            0.55,

            roughness:
            0.5,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'doorPanel',
        createPanelMaterial(
            normalizeColor(
                colors.doorPanel ??
                colors.wall,
                0xffffff)));

    registerMaterial(
        materials,
        'glass',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.glass,
                0x9fc5e8),

            transparent:
            true,

            opacity:
            0.45,

            roughness:
            0.1,

            metalness:
            0,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'mezzanine',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.mezzanine,
                0xffffff),

            metalness:
            0.4,

            roughness:
            0.6,

            side:
            THREE.DoubleSide
        }));

    registerMaterial(
        materials,
        'interiorWall',
        new THREE.MeshStandardMaterial({
            color:
            normalizeColor(
                colors.interiorWall ??
                colors.wall,
                0xffffff),

            metalness:
            0.1,

            roughness:
            0.55,

            bumpMap:
            linerBumpMap,

            bumpScale:
            LINER_BUMP_SCALE,

            side:
            THREE.DoubleSide
        }));

    function applyColors(
        nextColors = {}) {
        console.groupCollapsed(
            'MATERIAL SYSTEM APPLY COLORS');

        console.log(
            'input colors',
            nextColors);

        console.trace(
            'applyColors stack');

        const wall =
            normalizeColor(
                nextColors.wall,
                0xffffff);

        const roof =
            normalizeColor(
                nextColors.roof,
                0xffffff);

        const trim =
            normalizeColor(
                nextColors.trim,
                0xffffff);

        const eaveTrim =
            normalizeColor(
                nextColors.eaveTrim ??
                nextColors.trim,
                0xffffff);

        const frame =
            normalizeColor(
                nextColors.frame ??
                nextColors.steel,
                0xffffff);

        const steel =
            normalizeColor(
                nextColors.steel ??
                nextColors.frame,
                0xffffff);

        const concrete =
            normalizeColor(
                nextColors.concrete,
                0xb8b8b8);

        const glass =
            normalizeColor(
                nextColors.glass,
                0x9fc5e8);

        const mezzanine =
            normalizeColor(
                nextColors.mezzanine,
                0xffffff);

        const interiorWall =
            normalizeColor(
                nextColors.interiorWall ??
                nextColors.wall,
                0xffffff);

        const wainscot =
            normalizeColor(
                nextColors.wainscot,
                0xffffff);

        const doorPanel =
            normalizeColor(
                nextColors.doorPanel ??
                nextColors.wall,
                0xffffff);

        copyMaterialColor(
            'wallMetal',
            materials.get(
                'wallMetal'),
            wall);

        copyMaterialColor(
            'wall',
            materials.get(
                'wall'),
            wall);

        copyMaterialColor(
            'wainscotMetal',
            materials.get(
                'wainscotMetal'),
            wainscot);

        copyMaterialColor(
            'roofMetal',
            materials.get(
                'roofMetal'),
            roof);

        copyMaterialColor(
            'trimMetal',
            materials.get(
                'trimMetal'),
            trim);

        copyMaterialColor(
            'doorTrim',
            materials.get(
                'doorTrim'),
            trim);

        copyMaterialColor(
            'doorFrame',
            materials.get(
                'doorFrame'),
            trim);

        copyMaterialColor(
            'eaveTrim',
            materials.get(
                'eaveTrim'),
            eaveTrim);

        copyMaterialColor(
            'frame',
            materials.get(
                'frame'),
            frame);

        copyMaterialColor(
            'structuralSteel',
            materials.get(
                'structuralSteel'),
            steel);

        copyMaterialColor(
            'steel',
            materials.get(
                'steel'),
            steel);

        copyMaterialColor(
            'concrete',
            materials.get(
                'concrete'),
            concrete);

        copyMaterialColor(
            'glass',
            materials.get(
                'glass'),
            glass);

        copyMaterialColor(
            'mezzanine',
            materials.get(
                'mezzanine'),
            mezzanine);

        copyMaterialColor(
            'interiorWall',
            materials.get(
                'interiorWall'),
            interiorWall);

        copyMaterialColor(
            'doorPanel',
            materials.get(
                'doorPanel'),
            doorPanel);

        for (
            const [
                name,
                material
            ]
            of materials) {
            material.needsUpdate =
                true;

            logMaterialColor(
`AFTER APPLY ${name}`,
                material);
        }

        console.groupEnd();
    }

    applyColors(
        colors);

    return Object.freeze({
        get(name) {
            return (
                materials.get(name) ??
                materials.get('steel'));
        },

        applyColors,

        dispose() {
            linerBumpMap.dispose();

            for (
                const material
                of materials.values()) {
                material.dispose();
            }

            materials.clear();
        }
    });
}