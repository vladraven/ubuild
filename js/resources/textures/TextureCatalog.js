const TEXTURE_NAMES = Object.freeze([
    'wallPanel',
    'wainscotPanel',
    'roofPanel',
    'trim',
    'steel',
    'concrete',
    'glass',
    'ceiling',
    'interiorWall',
    'mezzanine',
    'springGround',
    'summerGround',
    'fallGround',
    'winterGround'
]);

const DEFAULT_TEXTURES = Object.freeze({
    wallPanel: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    wainscotPanel: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    roofPanel: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    trim: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    steel: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    concrete: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    glass: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    ceiling: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    interiorWall: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    mezzanine: Object.freeze({
        colorMap: null,
        normalMap: null,
        bumpMap: null,
        roughnessMap: null,
        repeat: Object.freeze({ x: 1, y: 1 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    springGround: Object.freeze({
        colorMap: '/js/environment/spring.jpg',
        normalMap: null,
        bumpMap: '/js/environment/spring.jpg',
        roughnessMap: null,
        repeat: Object.freeze({ x: 80, y: 80 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    summerGround: Object.freeze({
        colorMap: '/js/environment/summer.jpg',
        normalMap: null,
        bumpMap: 'js/environment/summer.jpg',
        roughnessMap: null,
        repeat: Object.freeze({ x: 80, y: 80 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    fallGround: Object.freeze({
        colorMap: '/js/environment/fall.jpg',
        normalMap: null,
        bumpMap: '/js/environment/fall.jpg',
        roughnessMap: null,
        repeat: Object.freeze({ x: 80, y: 80 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    }),
    winterGround: Object.freeze({
        colorMap: '/js/environment/winter.jpg',
        normalMap: null,
        bumpMap: '/js/environment/winter.jpg',
        roughnessMap: null,
        repeat: Object.freeze({ x: 80, y: 80 }),
        rotation: 0,
        physicalWidth: 1,
        physicalHeight: 1
    })
});

function clone(value) {
    if (Array.isArray(value)) {
        return value.map(clone);
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                clone(item)
            ])
        );
    }
    return value;
}

function assertPositive(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(`${name} must be greater than zero`);
    }
}

function validateTextureDefinition(definition, name) {
    if (!definition || typeof definition !== 'object') {
        throw new TypeError(`Invalid texture definition: ${name}`);
    }

    assertPositive(
        definition.physicalWidth,
        `${name}.physicalWidth`
    );

    assertPositive(
        definition.physicalHeight,
        `${name}.physicalHeight`
    );

    if (!definition.repeat || typeof definition.repeat !== 'object') {
        throw new TypeError(`${name}.repeat is required`);
    }

    assertPositive(
        definition.repeat.x,
        `${name}.repeat.x`
    );

    assertPositive(
        definition.repeat.y,
        `${name}.repeat.y`
    );

    if (!Number.isFinite(definition.rotation)) {
        throw new TypeError(`${name}.rotation must be finite`);
    }
}

function merge(base, override) {
    const result = clone(base);

    if (!override || typeof override !== 'object') {
        return result;
    }

    for (const [key, value] of Object.entries(override)) {
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            result[key] &&
            typeof result[key] === 'object' &&
            !Array.isArray(result[key])
        ) {
            result[key] = merge(
                result[key],
                value
            );
        } else {
            result[key] = clone(value);
        }
    }

    return result;
}

export function createTextureCatalog(overrides = {}) {
    const catalog = {};

    for (const name of TEXTURE_NAMES) {
        const definition = merge(
            DEFAULT_TEXTURES[name],
            overrides[name]
        );

        validateTextureDefinition(
            definition,
            name
        );

        catalog[name] = Object.freeze(
            definition
        );
    }

    return Object.freeze(catalog);
}

export function getTextureDefinition(catalog, name) {
    if (!TEXTURE_NAMES.includes(name)) {
        throw new RangeError(
            `Unknown texture: ${name}`
        );
    }

    if (!catalog?.[name]) {
        throw new Error(
            `Texture definition is missing: ${name}`
        );
    }

    return clone(
        catalog[name]
    );
}

export function getTextureNames() {
    return [...TEXTURE_NAMES];
}

export function getDefaultTextureCatalog() {
    return createTextureCatalog();
}