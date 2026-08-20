import * as THREE from 'three';

const MATERIAL_TYPES = Object.freeze({
    METAL: 'metal',
    DIELECTRIC: 'dielectric'
});

function assertDefinition(
    definition,
    name
) {
    if (!definition || typeof definition !== 'object') {
        throw new TypeError(
            `Material definition is required: ${name}`
        );
    }

    if (
        !Number.isFinite(definition.roughness) ||
        definition.roughness < 0 ||
        definition.roughness > 1
    ) {
        throw new RangeError(
            `${name}.roughness must be between 0 and 1`
        );
    }

    if (
        !Number.isFinite(definition.metalness) ||
        definition.metalness < 0 ||
        definition.metalness > 1
    ) {
        throw new RangeError(
            `${name}.metalness must be between 0 and 1`
        );
    }
}

function createParameters(
    definition,
    color
) {
    return {
        color,
        roughness: definition.roughness,
        metalness:
            definition.type === MATERIAL_TYPES.METAL
                ? definition.metalness
                : 0,
        transparent:
            definition.transparent === true,
        opacity:
            definition.opacity ?? 1
    };
}

export function createMaterial(
    definition,
    color
) {
    assertDefinition(
        definition,
        'material'
    );

    return new THREE.MeshStandardMaterial(
        createParameters(
            definition,
            color
        )
    );
}

export function createMaterialSet(
    catalog,
    palette
) {
    if (!catalog || typeof catalog !== 'object') {
        throw new TypeError(
            'Material catalog is required'
        );
    }

    if (!palette || typeof palette !== 'object') {
        throw new TypeError(
            'Color palette is required'
        );
    }

    const materials = {};

    for (const [
        name,
        definition
    ] of Object.entries(catalog)) {
        const color =
            palette[name] ??
            palette.wall;

        materials[name] = createMaterial(
            definition,
            color
        );
    }

    return Object.freeze(materials);
}

export function updateMaterialColor(
    material,
    color
) {
    if (!material?.color) {
        throw new TypeError(
            'Three.js material is required'
        );
    }

    material.color.set(color);

    return material;
}

export function disposeMaterial(
    material
) {
    if (!material) {
        return;
    }

    material.dispose();
}