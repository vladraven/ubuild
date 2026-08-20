const ROOF_TYPES = Object.freeze([
    'gabled',
    'left-sloped',
    'right-sloped'
]);

const SIDES = Object.freeze([
    'F',
    'B',
    'L',
    'R'
]);

const OPENING_TYPES = Object.freeze([
    'Window',
    'Door'
]);

const DEFAULTS = Object.freeze({
    dimensions: Object.freeze({
        width: 18.288,
        length: 30.48,
        height: 4.8768
    }),

    roof: Object.freeze({
        type: 'gabled',
        pitchRatio: 0.1666666667,

        overhangs: Object.freeze({
            front: 0,
            back: 0,
            left: 0,
            right: 0
        })
    }),

    walls: Object.freeze({
        thickness: 0.15
    }),

    panels: Object.freeze({
        profile: 'awr',
        wallHeight: 4.8768,
        wainscotHeight: 0.9144
    }),

    foundation: Object.freeze({
        enabled: true,
        height: 0.3048
    }),

    openings: Object.freeze([]),

    awnings: Object.freeze([]),

    liner: Object.freeze({
        enabled: false,
        height: 0,
        thickness: 0
    }),

    mezzanine: Object.freeze({
        enabled: false,
        coverage: 0,
        z: 0,
        height: 0,
        color: null
    }),

    crane: Object.freeze({
        enabled: false,
        z: 0
    }),

    driveway: Object.freeze({
        enabled: false,
        width: 0,
        length: 0,
        height: 0
    }),

    logo: Object.freeze({
        enabled: false,
        width: 0,
        height: 0,
        thickness: 0,
        margin: 0
    }),

    visibility: Object.freeze({
        walls: true,
        roof: true,
        foundation: true,
        panels: true,
        wainscot: true,
        frames: true,
        girts: true,
        purlins: true,
        endWallColumns: true,
        trims: true,
        ridge: true,
        gutters: true,
        awnings: true,
        liner: true,
        mezzanine: true,
        crane: true,
        driveway: true,
        logo: true,
        labels: true
    })
});

const LIMITS = Object.freeze({
    width: Object.freeze({
        min: 6.096,
        max: 24.384
    }),

    length: Object.freeze({
        min: 12.192,
        max: 45.72
    }),

    height: Object.freeze({
        min: 3.048,
        max: 7.3152
    }),

    overhang: Object.freeze({
        min: 0,
        max: 1.524
    }),

    foundationHeight: Object.freeze({
        min: 0,
        max: 0.6096
    }),

    wallThickness: Object.freeze({
        min: 0,
        max: 1
    })
});

function clone(value) {
    if (Array.isArray(value)) {
        return value.map(clone);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(
                ([key, item]) => [
                    key,
                    clone(item)
                ]
            )
        );
    }

    return value;
}

function freeze(value) {
    if (!value || typeof value !== 'object') {
        return value;
    }

    for (const item of Object.values(value)) {
        freeze(item);
    }

    return Object.freeze(value);
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

            continue;
        }

        result[key] = clone(value);
    }

    return result;
}

function assertFinite(value, path) {
    if (!Number.isFinite(value)) {
        throw new TypeError(
            `${path} must be a finite number`
        );
    }
}

function assertRange(
    value,
    min,
    max,
    path
) {
    assertFinite(value, path);

    if (value < min || value > max) {
        throw new RangeError(
            `${path} must be between ${min} and ${max}`
        );
    }
}

function validateDimensions(model) {
    assertRange(
        model.dimensions.width,
        LIMITS.width.min,
        LIMITS.width.max,
        'dimensions.width'
    );

    assertRange(
        model.dimensions.length,
        LIMITS.length.min,
        LIMITS.length.max,
        'dimensions.length'
    );

    assertRange(
        model.dimensions.height,
        LIMITS.height.min,
        LIMITS.height.max,
        'dimensions.height'
    );
}

function validateRoof(model) {
    if (!ROOF_TYPES.includes(model.roof.type)) {
        throw new RangeError(
            `Unsupported roof type: ${model.roof.type}`
        );
    }

    assertFinite(
        model.roof.pitchRatio,
        'roof.pitchRatio'
    );

    if (model.roof.pitchRatio <= 0) {
        throw new RangeError(
            'roof.pitchRatio must be greater than zero'
        );
    }

    for (const side of [
        'front',
        'back',
        'left',
        'right'
    ]) {
        assertRange(
            model.roof.overhangs[side],
            LIMITS.overhang.min,
            LIMITS.overhang.max,
            `roof.overhangs.${side}`
        );
    }
}

function validateWalls(model) {
    assertRange(
        model.walls.thickness,
        LIMITS.wallThickness.min,
        LIMITS.wallThickness.max,
        'walls.thickness'
    );
}

function validatePanels(model) {
    if (
        typeof model.panels.profile !== 'string' ||
        model.panels.profile.trim() === ''
    ) {
        throw new TypeError(
            'panels.profile is required'
        );
    }

    assertFinite(
        model.panels.wallHeight,
        'panels.wallHeight'
    );

    assertFinite(
        model.panels.wainscotHeight,
        'panels.wainscotHeight'
    );

    if (model.panels.wallHeight <= 0) {
        throw new RangeError(
            'panels.wallHeight must be greater than zero'
        );
    }

    if (model.panels.wallHeight > model.dimensions.height) {
        throw new RangeError(
            'panels.wallHeight cannot exceed building height'
        );
    }

    if (model.panels.wainscotHeight < 0) {
        throw new RangeError(
            'panels.wainscotHeight cannot be negative'
        );
    }

    if (
        model.panels.wainscotHeight >
        model.panels.wallHeight
    ) {
        throw new RangeError(
            'panels.wainscotHeight cannot exceed panel wall height'
        );
    }
}

function validateFoundation(model) {
    assertRange(
        model.foundation.height,
        LIMITS.foundationHeight.min,
        LIMITS.foundationHeight.max,
        'foundation.height'
    );
}

function validateOpening(
    opening,
    index
) {
    if (!opening || typeof opening !== 'object') {
        throw new TypeError(
            `openings[${index}] must be an object`
        );
    }

    if (
        typeof opening.id !== 'string' ||
        opening.id.trim() === ''
    ) {
        throw new TypeError(
            `openings[${index}].id is required`
        );
    }

    if (!OPENING_TYPES.includes(opening.type)) {
        throw new RangeError(
            `Unsupported opening type: ${opening.type}`
        );
    }

    if (!SIDES.includes(opening.side)) {
        throw new RangeError(
            `Unsupported opening side: ${opening.side}`
        );
    }

    for (const field of [
        'x',
        'yOff',
        'width',
        'height'
    ]) {
        assertFinite(
            opening[field],
            `openings[${index}].${field}`
        );
    }

    if (opening.width <= 0) {
        throw new RangeError(
            `openings[${index}].width must be greater than zero`
        );
    }

    if (opening.height <= 0) {
        throw new RangeError(
            `openings[${index}].height must be greater than zero`
        );
    }

    if (opening.x < 0) {
        throw new RangeError(
            `openings[${index}].x cannot be negative`
        );
    }

    if (opening.yOff < 0) {
        throw new RangeError(
            `openings[${index}].yOff cannot be negative`
        );
    }
}

function validateOpenings(model) {
    if (!Array.isArray(model.openings)) {
        throw new TypeError(
            'openings must be an array'
        );
    }

    const ids = new Set();

    model.openings.forEach(
        (opening, index) => {
            validateOpening(
                opening,
                index
            );

            if (ids.has(opening.id)) {
                throw new Error(
                    `Duplicate opening id: ${opening.id}`
                );
            }

            ids.add(opening.id);
        }
    );
}

function validate(model) {
    validateDimensions(model);
    validateRoof(model);
    validateWalls(model);
    validatePanels(model);
    validateFoundation(model);
    validateOpenings(model);

    return model;
}

export function createBuildingModel(
    overrides = {}
) {
    const model = merge(
        DEFAULTS,
        overrides
    );

    validate(model);

    return freeze(model);
}

export function updateBuildingModel(
    current,
    changes = {}
) {
    if (
        !current ||
        typeof current !== 'object'
    ) {
        throw new TypeError(
            'current building model is required'
        );
    }

    return createBuildingModel(
        merge(
            current,
            changes
        )
    );
}

export function validateBuildingModel(
    model
) {
    validate(
        clone(model)
    );

    return true;
}

export function cloneBuildingModel(
    model
) {
    return clone(model);
}

export function getBuildingModelDefaults() {
    return clone(DEFAULTS);
}

export function getBuildingModelLimits() {
    return clone(LIMITS);
}

export {
    ROOF_TYPES,
    SIDES,
    OPENING_TYPES
};