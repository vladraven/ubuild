import {
    THREE
}
from './runtimeImports.js';

import {
    createMaterialCatalog,
    getMaterialDefinition
}
from '../../resources/materials/MaterialCatalog.js';

import {
    createMaterial,
    createMaterialSet,
    disposeMaterialSet,
    updateMaterialColor,
    updateMaterialColors
}
from '../../resources/materials/MaterialFactory.js';

const MATERIAL_COLOR_DEBUG =
    true;

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

const DEFAULT_COLORS =
    Object.freeze({
        wall:
            '#ffffff',

        wainscot:
            '#ffffff',

        roof:
            '#ffffff',

        trim:
            '#ffffff',

        steel:
            '#ffffff',

        frame:
            '#ffffff',

        concrete:
            '#b8b8b8',

        glass:
            '#9fc5e8',

        mezzanine:
            '#ffffff',

        ceiling:
            '#ffffff',

        interiorWall:
            '#ffffff'
    });

function resolveColor(
    value,
    fallback
) {
    if (
        value instanceof
        THREE.Color
    ) {
        return value;
    }

    if (
        typeof value ===
        'string' &&
        value.trim() !== ''
    ) {
        return value;
    }

    if (
        typeof value ===
        'number' &&
        Number.isFinite(
            value
        )
    ) {
        return value;
    }

    return fallback;
}

function formatColor(
    color
) {
    if (
        !color ||
        typeof color.getHexString !==
        'function'
    ) {
        return null;
    }

    return `#${color.getHexString()}`;
}

function logMaterialColor(
    label,
    material
) {
    if (
        !MATERIAL_COLOR_DEBUG
    ) {
        return;
    }

    console.log(
        'MATERIAL COLOR',
        label,
        {
            uuid:
                material?.uuid,

            color:
                formatColor(
                    material?.color
                ),

            roughness:
                material?.roughness,

            metalness:
                material?.metalness
        }
    );
}

function applyDoubleSide(
    material
) {
    material.side =
        THREE.DoubleSide;

    material.needsUpdate =
        true;

    return material;
}

function createRuntimeMaterial(
    catalog,
    materialName,
    color
) {
    const definition =
        getMaterialDefinition(
            catalog,
            materialName
        );

    const material =
        createMaterial(
            definition,
            color
        );

    return applyDoubleSide(
        material
    );
}

function createLinerBumpMap() {
    const data =
        new Uint8Array(
            LINER_TEXTURE_WIDTH *
            LINER_TEXTURE_HEIGHT
        );

    const periodUnits =
        LINER_RIDGE_UNITS +
        LINER_GAP_UNITS;

    const ridgeRatio =
        LINER_RIDGE_UNITS /
        periodUnits;

    for (
        let y = 0;
        y < LINER_TEXTURE_HEIGHT;
        y++
    ) {
        for (
            let x = 0;
            x < LINER_TEXTURE_WIDTH;
            x++
        ) {
            const index =
                (
                    y *
                    LINER_TEXTURE_WIDTH
                ) +
                x;

            const position =
                x /
                LINER_TEXTURE_WIDTH;

            data[index] =
                position < ridgeRatio
                    ? 255
                    : 0;
        }
    }

    const texture =
        new THREE.DataTexture(
            data,
            LINER_TEXTURE_WIDTH,
            LINER_TEXTURE_HEIGHT,
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
        THREE.LinearFilter;

    texture.generateMipmaps =
        false;

    texture.colorSpace =
        THREE.NoColorSpace;

    texture.needsUpdate =
        true;

    return texture;
}

function createPalette(
    colors = {}
) {
    return {
        steel:
            resolveColor(
                colors.steel ??
                colors.frame,
                DEFAULT_COLORS.steel
            ),

        structuralSteel:
            resolveColor(
                colors.steel ??
                colors.frame,
                DEFAULT_COLORS.steel
            ),

        wall:
            resolveColor(
                colors.wall,
                DEFAULT_COLORS.wall
            ),

        wainscot:
            resolveColor(
                colors.wainscot,
                DEFAULT_COLORS.wainscot
            ),

        roof:
            resolveColor(
                colors.roof,
                DEFAULT_COLORS.roof
            ),

        trim:
            resolveColor(
                colors.trim,
                DEFAULT_COLORS.trim
            ),

        concrete:
            resolveColor(
                colors.concrete,
                DEFAULT_COLORS.concrete
            ),

        glass:
            resolveColor(
                colors.glass,
                DEFAULT_COLORS.glass
            ),

        ceiling:
            resolveColor(
                colors.ceiling,
                DEFAULT_COLORS.ceiling
            ),

        interiorWall:
            resolveColor(
                colors.interiorWall ??
                colors.wall,
                DEFAULT_COLORS.interiorWall
            ),

        mezzanine:
            resolveColor(
                colors.mezzanine,
                DEFAULT_COLORS.mezzanine
            ),

        frame:
            resolveColor(
                colors.frame ??
                colors.steel,
                DEFAULT_COLORS.frame
            ),

        doorPanel:
            resolveColor(
                colors.doorPanel ??
                colors.wall,
                DEFAULT_COLORS.wall
            ),

        eaveTrim:
            resolveColor(
                colors.eaveTrim ??
                colors.trim,
                DEFAULT_COLORS.trim
            )
    };
}

function applyDoubleSideToSet(
    materials
) {
    for (
        const material
        of Object.values(
            materials
        )
    ) {
        applyDoubleSide(
            material
        );
    }
}

function createAliasMaterials(
    catalog,
    palette,
    linerBumpMap
) {
    const wall =
        createRuntimeMaterial(
            catalog,
            'wallMetal',
            palette.wall
        );

    const eaveTrim =
        createRuntimeMaterial(
            catalog,
            'trimMetal',
            palette.eaveTrim
        );

    const doorTrim =
        createRuntimeMaterial(
            catalog,
            'trimMetal',
            palette.trim
        );

    const doorFrame =
        createRuntimeMaterial(
            catalog,
            'trimMetal',
            palette.trim
        );

    const frame =
        createRuntimeMaterial(
            catalog,
            'structuralSteel',
            palette.frame
        );

    const doorPanel =
        createRuntimeMaterial(
            catalog,
            'wallMetal',
            palette.doorPanel
        );

    const interiorWall =
        createRuntimeMaterial(
            catalog,
            'interiorWall',
            palette.interiorWall
        );

    interiorWall.bumpMap =
        linerBumpMap;

    interiorWall.bumpScale =
        LINER_BUMP_SCALE;

    interiorWall.needsUpdate =
        true;

    return {
        wall,
        eaveTrim,
        doorTrim,
        doorFrame,
        frame,
        doorPanel,
        interiorWall
    };
}

function registerMaterials(
    materialMap,
    materialSet,
    aliasMaterials
) {
    for (
        const [
            name,
            material
        ]
        of Object.entries(
            materialSet
        )
    ) {
        materialMap.set(
            name,
            material
        );
    }

    for (
        const [
            name,
            material
        ]
        of Object.entries(
            aliasMaterials
        )
    ) {
        materialMap.set(
            name,
            material
        );
    }
}

function updateAliasColors(
    aliasMaterials,
    palette
) {
    updateMaterialColor(
        aliasMaterials.wall,
        palette.wall
    );

    updateMaterialColor(
        aliasMaterials.eaveTrim,
        palette.eaveTrim
    );

    updateMaterialColor(
        aliasMaterials.doorTrim,
        palette.trim
    );

    updateMaterialColor(
        aliasMaterials.doorFrame,
        palette.trim
    );

    updateMaterialColor(
        aliasMaterials.frame,
        palette.frame
    );

    updateMaterialColor(
        aliasMaterials.doorPanel,
        palette.doorPanel
    );

    updateMaterialColor(
        aliasMaterials.interiorWall,
        palette.interiorWall
    );
}

function markMaterialsForUpdate(
    materials
) {
    for (
        const material
        of materials.values()
    ) {
        material.needsUpdate =
            true;
    }
}

function logMaterials(
    materials,
    label
) {
    if (
        !MATERIAL_COLOR_DEBUG
    ) {
        return;
    }

    for (
        const [
            name,
            material
        ]
        of materials
    ) {
        logMaterialColor(
            `${label} ${name}`,
            material
        );
    }
}

export function createMaterialSystem(
    model
) {
    const catalog =
        createMaterialCatalog();

    const initialColors =
        model?.colors || {};

    const initialPalette =
        createPalette(
            initialColors
        );

    const linerBumpMap =
        createLinerBumpMap();

    const materialSet =
        createMaterialSet(
            catalog,
            initialPalette
        );

    applyDoubleSideToSet(
        materialSet
    );

    const aliasMaterials =
        createAliasMaterials(
            catalog,
            initialPalette,
            linerBumpMap
        );

    const materials =
        new Map();

    registerMaterials(
        materials,
        materialSet,
        aliasMaterials
    );

    function applyColors(
        nextColors = {}
    ) {
        const palette =
            createPalette(
                nextColors
            );

        updateMaterialColors(
            materialSet,
            palette
        );

        updateAliasColors(
            aliasMaterials,
            palette
        );

        markMaterialsForUpdate(
            materials
        );

        logMaterials(
            materials,
            'AFTER APPLY'
        );
    }

    applyColors(
        initialColors
    );

    return Object.freeze({
        get(name) {
            return (
                materials.get(
                    name
                ) ??
                materials.get(
                    'steel'
                )
            );
        },

        applyColors,

        dispose() {
            linerBumpMap.dispose();

            disposeMaterialSet(
                materialSet
            );

            disposeMaterialSet(
                aliasMaterials
            );

            materials.clear();
        }
    });
}