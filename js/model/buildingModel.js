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
    'Walk Door Solid',
    'Walk Door Solid Double',
    'Overhead Panel Door',
    'Bi-Fold Door',
    'Hydraulic Door'
]);

const OPENING_DEFS = Object.freeze({
    'Window': Object.freeze({
        width: 1.0,
        height: 1.0,
        yOff: 1.0
    }),
    'Walk Door Solid': Object.freeze({
        width: 1.0,
        height: 2.1,
        yOff: 0
    }),
    'Walk Door Solid Double': Object.freeze({
        width: 2.0,
        height: 2.1,
        yOff: 0
    }),
    'Overhead Panel Door': Object.freeze({
        width: 3.0,
        height: 3.0,
        yOff: 0
    }),
    'Bi-Fold Door': Object.freeze({
        width: 4.0,
        height: 3.0,
        yOff: 0
    }),
    'Hydraulic Door': Object.freeze({
        width: 4.0,
        height: 3.0,
        yOff: 0
    })
});

const DEFAULT_AWNING_SIDE = Object.freeze({
    active: false,
    depth: 0,
    drop: 0,
    pitch: 0,
    cutL: 0,
    cutR: 0,
    wallF: false,
    wallL: false,
    wallR: false
});

const DEFAULT_AWNINGS = Object.freeze({
    L: DEFAULT_AWNING_SIDE,
    R: DEFAULT_AWNING_SIDE,
    F: DEFAULT_AWNING_SIDE,
    B: DEFAULT_AWNING_SIDE
});

const DEFAULT_COLORS = Object.freeze({
    wall: '#FFFFFF',
    wainscot: '#FFFFFF',
    roof: '#FFFFFF',
    trim: '#FFFFFF',
    eaveTrim: '#FFFFFF',
    rakeTrim: '#FFFFFF',
    frame: '#444444',
    steel: '#444444',
    concrete: '#B8B8B8',
    glass: '#9FC5E8',
    ceiling: '#FFFFFF',
    mezzanine: '#FFFFFF',
    interiorWall: '#EEEEEE'
});

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

    colors: DEFAULT_COLORS,

    openings: Object.freeze([]),

    awnings: DEFAULT_AWNINGS,

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
        z: 0,
        zPercent: 0
    }),

    driveway: Object.freeze({
        enabled: false,
        width: 0,
        length: 0,
        height: 0
    }),

    /*
     * Legacy logo defaults.
     *
     * The logo exists by default.
     * It can still be disabled explicitly
     * with logo.enabled = false.
     */
    logo: Object.freeze({
        enabled: true,
        width: 1.0,
        height: 0.33,
        thickness: 0.08,
        margin: 0.5
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
        min: 3.0,
        max: 60.0
    }),

    length: Object.freeze({
        min: 3.0,
        max: 120.0
    }),

    height: Object.freeze({
        min: 2.0,
        max: 20.0
    }),

    overhang: Object.freeze({
        min: 0,
        max: 5.0
    }),

    foundationHeight: Object.freeze({
        min: 0,
        max: 2.0
    }),

    wallThickness: Object.freeze({
        min: 0.01,
        max: 1.0
    }),

    craneZPercent: Object.freeze({
        min: 0,
        max: 1
    })
});

function clone(value) {
    if (Array.isArray(value)) {
        return value.map(clone);
    }

    if (
        value &&
        typeof value === 'object'
    ) {
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
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return value;
    }

    for (
        const item
        of Object.values(value)
    ) {
        freeze(item);
    }

    return Object.freeze(value);
}

function merge(
    base,
    override
) {
    const result =
        clone(base);

    if (
        !override ||
        typeof override !== 'object'
    ) {
        return result;
    }

    for (
        const [key, value]
        of Object.entries(override)
    ) {
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            result[key] &&
            typeof result[key] === 'object' &&
            !Array.isArray(result[key])
        ) {
            result[key] =
                merge(
                    result[key],
                    value
                );

            continue;
        }

        result[key] =
            clone(value);
    }

    return result;
}

function assertFinite(
    value,
    path
) {
    if (
        !Number.isFinite(value)
    ) {
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
    assertFinite(
        value,
        path
    );

    if (
        value < min ||
        value > max
    ) {
        throw new RangeError(
            `${path} must be between ${min} and ${max}`
        );
    }
}

function validateDimensions(
    model
) {
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

function validateRoof(
    model
) {
    if (
        !ROOF_TYPES.includes(
            model.roof.type
        )
    ) {
        throw new RangeError(
            `Unsupported roof type: ${model.roof.type}`
        );
    }

    assertFinite(
        model.roof.pitchRatio,
        'roof.pitchRatio'
    );

    if (
        model.roof.pitchRatio <= 0
    ) {
        throw new RangeError(
            'roof.pitchRatio must be greater than zero'
        );
    }

    for (
        const side
        of [
            'front',
            'back',
            'left',
            'right'
        ]
    ) {
        assertRange(
            model.roof.overhangs[side],
            LIMITS.overhang.min,
            LIMITS.overhang.max,
            `roof.overhangs.${side}`
        );
    }
}

function validateWalls(
    model
) {
    assertRange(
        model.walls.thickness,
        LIMITS.wallThickness.min,
        LIMITS.wallThickness.max,
        'walls.thickness'
    );
}

function validatePanels(
    model
) {
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
}

function validateFoundation(
    model
) {
    assertRange(
        model.foundation.height,
        LIMITS.foundationHeight.min,
        LIMITS.foundationHeight.max,
        'foundation.height'
    );
}

function validateLogo(
    model
) {
    if (
        typeof model.logo.enabled !== 'boolean'
    ) {
        throw new TypeError(
            'logo.enabled must be boolean'
        );
    }

    assertFinite(
        model.logo.width,
        'logo.width'
    );

    assertFinite(
        model.logo.height,
        'logo.height'
    );

    assertFinite(
        model.logo.thickness,
        'logo.thickness'
    );

    assertFinite(
        model.logo.margin,
        'logo.margin'
    );

    if (
        model.logo.enabled
    ) {
        if (
            model.logo.width <= 0
        ) {
            throw new RangeError(
                'logo.width must be greater than zero'
            );
        }

        if (
            model.logo.height <= 0
        ) {
            throw new RangeError(
                'logo.height must be greater than zero'
            );
        }

        if (
            model.logo.thickness <= 0
        ) {
            throw new RangeError(
                'logo.thickness must be greater than zero'
            );
        }

        if (
            model.logo.margin < 0
        ) {
            throw new RangeError(
                'logo.margin must not be negative'
            );
        }
    }
}

function validate(
    model
) {
    validateDimensions(
        model
    );

    validateRoof(
        model
    );

    validateWalls(
        model
    );

    validatePanels(
        model
    );

    validateFoundation(
        model
    );

    validateLogo(
        model
    );

    return model;
}

export function createBuildingModel(
    overrides = {}
) {
    const model =
        merge(
            DEFAULTS,
            overrides
        );

    if (
        model.crane.zPercent === undefined &&
        model.crane.z !== undefined
    ) {
        model.crane.zPercent =
            model.crane.z;
    }

    if (
        model.crane.z === undefined &&
        model.crane.zPercent !== undefined
    ) {
        model.crane.z =
            model.crane.zPercent;
    }

    validate(
        model
    );

    return freeze(
        model
    );
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
    return clone(
        model
    );
}

export function getBuildingModelDefaults() {
    return clone(
        DEFAULTS
    );
}

export function getBuildingModelLimits() {
    return clone(
        LIMITS
    );
}

export {
    ROOF_TYPES,
    SIDES,
    OPENING_TYPES,
    OPENING_DEFS
};