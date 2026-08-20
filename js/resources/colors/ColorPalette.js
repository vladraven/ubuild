const COLOR_NAMES = Object.freeze([
    'wall',
    'wainscot',
    'roof',
    'trim',
    'eaveTrim',
    'rakeTrim',
    'frame',
    'steel',
    'concrete',
    'glass',
    'ceiling',
    'mezzanine',
    'interiorWall'
]);

const DEFAULT_COLORS = Object.freeze({
    wall: '#FFFFFF',
    wainscot: '#FFFFFF',
    roof: '#FFFFFF',
    trim: '#FFFFFF',
    eaveTrim: '#FFFFFF',
    rakeTrim: '#FFFFFF',
    frame: '#FFFFFF',
    steel: '#FFFFFF',
    concrete: '#B8B8B8',
    glass: '#9FC5E8',
    ceiling: '#FFFFFF',
    mezzanine: '#FFFFFF',
    interiorWall: '#FFFFFF'
});

function assertHexColor(value, path) {
    if (
        typeof value !== 'string' ||
        !/^#[0-9A-Fa-f]{6}$/.test(value)
    ) {
        throw new TypeError(
            `${path} must be a #RRGGBB color`
        );
    }
}

function clone(value) {
    return Object.fromEntries(
        Object.entries(value).map(
            ([key, item]) => [key, item]
        )
    );
}

function normalizePalette(
    overrides = {}
) {
    const palette = {
        ...DEFAULT_COLORS,
        ...overrides
    };

    for (const name of COLOR_NAMES) {
        assertHexColor(
            palette[name],
            `colors.${name}`
        );
    }

    return palette;
}

export function createColorPalette(
    overrides = {}
) {
    return Object.freeze(
        normalizePalette(overrides)
    );
}

export function getDefaultColorPalette() {
    return clone(DEFAULT_COLORS);
}

export function getColorNames() {
    return [...COLOR_NAMES];
}

export function getColor(
    palette,
    name
) {
    if (!COLOR_NAMES.includes(name)) {
        throw new RangeError(
            `Unknown color: ${name}`
        );
    }

    assertHexColor(
        palette?.[name],
        `colors.${name}`
    );

    return palette[name];
}

export function withColor(
    palette,
    name,
    value
) {
    if (!COLOR_NAMES.includes(name)) {
        throw new RangeError(
            `Unknown color: ${name}`
        );
    }

    assertHexColor(
        value,
        `colors.${name}`
    );

    return createColorPalette({
        ...palette,
        [name]: value
    });
}