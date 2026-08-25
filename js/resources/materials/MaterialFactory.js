import * as THREE from 'three';

const MATERIAL_TYPES = Object.freeze({
    METAL: 'metal',
    DIELECTRIC: 'dielectric'
});

const MATERIAL_COLOR_KEYS = Object.freeze({
    steel: 'steel',
    structuralSteel: 'frame',
    wallMetal: 'wall',
    wainscotMetal: 'wainscot',
    roofMetal: 'roof',
    trimMetal: 'trim',
    concrete: 'concrete',
    glass: 'glass',
    ceiling: 'ceiling',
    interiorWall: 'interiorWall',
    mezzanine: 'mezzanine'
});

function assertDefinition(
    definition,
    name
) {
    if (
        !definition ||
        typeof definition !== 'object'
    ) {
        throw new TypeError(
            `Material definition is required: ${name}`
        );
    }

    if (
        !Number.isFinite(
            definition.roughness
        ) ||
        definition.roughness < 0 ||
        definition.roughness > 1
    ) {
        throw new RangeError(
            `${name}.roughness must be between 0 and 1`
        );
    }

    if (
        !Number.isFinite(
            definition.metalness
        ) ||
        definition.metalness < 0 ||
        definition.metalness > 1
    ) {
        throw new RangeError(
            `${name}.metalness must be between 0 and 1`
        );
    }
}

function resolveColor(
    palette,
    materialName
) {
    const colorKey =
        MATERIAL_COLOR_KEYS[
            materialName
        ];

    if (
        colorKey &&
        palette[colorKey] !== undefined &&
        palette[colorKey] !== null &&
        palette[colorKey] !== ''
    ) {
        return palette[colorKey];
    }

    if (
        palette[materialName] !== undefined &&
        palette[materialName] !== null &&
        palette[materialName] !== ''
    ) {
        return palette[materialName];
    }

    if (
        palette.wall !== undefined &&
        palette.wall !== null &&
        palette.wall !== ''
    ) {
        return palette.wall;
    }

    return '#FFFFFF';
}

function createParameters(
    definition,
    color
) {
    const parameters = {
        color,
        roughness:
            definition.roughness,
        metalness:
            definition.type ===
            MATERIAL_TYPES.METAL
                ? definition.metalness
                : 0
    };

    if (
        definition.transparent === true
    ) {
        parameters.transparent =
            true;

        parameters.opacity =
            Number.isFinite(
                definition.opacity
            )
                ? definition.opacity
                : 1;
    } else {
        parameters.transparent =
            false;

        parameters.opacity = 1;
    }

    if (
        definition.side !== undefined
    ) {
        parameters.side =
            definition.side;
    }

    if (
        definition.depthWrite !== undefined
    ) {
        parameters.depthWrite =
            definition.depthWrite;
    }

    if (
        definition.depthTest !== undefined
    ) {
        parameters.depthTest =
            definition.depthTest;
    }

    if (
        definition.alphaTest !== undefined
    ) {
        parameters.alphaTest =
            definition.alphaTest;
    }

    return parameters;
}

export function createMaterial(
    definition,
    color
) {
    assertDefinition(
        definition,
        'material'
    );

    const material =
        new THREE.MeshStandardMaterial(
            createParameters(
                definition,
                color
            )
        );

    material.userData = {
        ...(material.userData || {}),
        ubuildMaterial: true
    };

    return material;
}

export function createMaterialSet(
    catalog,
    palette
) {
    if (
        !catalog ||
        typeof catalog !== 'object'
    ) {
        throw new TypeError(
            'Material catalog is required'
        );
    }

    if (
        !palette ||
        typeof palette !== 'object'
    ) {
        throw new TypeError(
            'Color palette is required'
        );
    }

    const materials = {};

    for (
        const [
            name,
            definition
        ]
        of Object.entries(catalog)
    ) {
        const color =
            resolveColor(
                palette,
                name
            );

        materials[name] =
            createMaterial(
                definition,
                color
            );
    }

    return Object.freeze(
        materials
    );
}

export function updateMaterialColor(
    material,
    color
) {
    if (
        !material?.color
    ) {
        throw new TypeError(
            'Three.js material is required'
        );
    }

    if (
        color === undefined ||
        color === null ||
        color === ''
    ) {
        return material;
    }

    material.color.set(
        color
    );

    return material;
}

export function updateMaterialColors(
    materials,
    palette
) {
    if (
        !materials ||
        typeof materials !== 'object'
    ) {
        throw new TypeError(
            'Materials are required'
        );
    }

    if (
        !palette ||
        typeof palette !== 'object'
    ) {
        throw new TypeError(
            'Color palette is required'
        );
    }

    for (
        const [
            name,
            material
        ]
        of Object.entries(materials)
    ) {
        const color =
            resolveColor(
                palette,
                name
            );

        if (
            material?.color
        ) {
            material.color.set(
                color
            );
        }
    }

    return materials;
}

export function getMaterialColorKey(
    materialName
) {
    return (
        MATERIAL_COLOR_KEYS[
            materialName
        ] || null
    );
}

export function disposeMaterial(
    material
) {
    if (!material) {
        return;
    }

    material.dispose();
}

export function disposeMaterialSet(
    materials
) {
    if (
        !materials ||
        typeof materials !== 'object'
    ) {
        return;
    }

    for (
        const material
        of Object.values(materials)
    ) {
        disposeMaterial(
            material
        );
    }
}