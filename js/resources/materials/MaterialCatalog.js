const MATERIAL_NAMES = Object.freeze([
    'steel',
    'structuralSteel',
    'wallMetal',
    'roofMetal',
    'trimMetal',
    'concrete',
    'glass',
    'ceiling',
    'interiorWall',
    'mezzanine'
]);

const MATERIAL_DEFINITIONS = Object.freeze({
    steel: Object.freeze({
        type: 'metal',
        roughness: 0.45,
        metalness: 0.85
    }),

    structuralSteel: Object.freeze({
        type: 'metal',
        roughness: 0.5,
        metalness: 0.9
    }),

    wallMetal: Object.freeze({
        type: 'metal',
        roughness: 0.5,
        metalness: 0.85
    }),

    roofMetal: Object.freeze({
        type: 'metal',
        roughness: 0.48,
        metalness: 0.85
    }),

    trimMetal: Object.freeze({
        type: 'metal',
        roughness: 0.5,
        metalness: 0.85
    }),

    concrete: Object.freeze({
        type: 'dielectric',
        roughness: 0.85,
        metalness: 0
    }),

    glass: Object.freeze({
        type: 'dielectric',
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.45
    }),

    ceiling: Object.freeze({
        type: 'dielectric',
        roughness: 0.7,
        metalness: 0
    }),

    interiorWall: Object.freeze({
        type: 'dielectric',
        roughness: 0.7,
        metalness: 0
    }),

    mezzanine: Object.freeze({
        type: 'metal',
        roughness: 0.55,
        metalness: 0.8
    })
});

function cloneDefinition(
    definition
) {
    return Object.fromEntries(
        Object.entries(definition)
    );
}

function assertMaterialName(name) {
    if (!MATERIAL_NAMES.includes(name)) {
        throw new RangeError(
            `Unknown material: ${name}`
        );
    }
}

function validateDefinition(
    definition,
    name
) {
    if (!definition || typeof definition !== 'object') {
        throw new TypeError(
            `Material definition is invalid: ${name}`
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

export function createMaterialCatalog(
    overrides = {}
) {
    const definitions = {};

    for (const name of MATERIAL_NAMES) {
        const definition = {
            ...MATERIAL_DEFINITIONS[name],
            ...(overrides[name] || {})
        };

        validateDefinition(
            definition,
            name
        );

        definitions[name] = Object.freeze(
            definition
        );
    }

    return Object.freeze(definitions);
}

export function getMaterialDefinition(
    catalog,
    name
) {
    assertMaterialName(name);

    const definition = catalog?.[name];

    if (!definition) {
        throw new Error(
            `Material definition is missing: ${name}`
        );
    }

    return cloneDefinition(definition);
}

export function getMaterialNames() {
    return [...MATERIAL_NAMES];
}

export function getDefaultMaterialCatalog() {
    return createMaterialCatalog();
}