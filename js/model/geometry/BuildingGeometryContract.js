const REQUIRED_SECTIONS = Object.freeze([
    'bounds',
    'envelope',
    'walls',
    'foundation',
    'roof',
    'panels',
    'openings',
    'frames',
    'girts',
    'purlins',
    'endWallColumns',
    'wainscot',
    'trims',
    'gutters',
    'downspouts',
    'awnings',
    'liner',
    'mezzanine',
    'crane',
    'driveway',
    'logo'
]);

function assertObject(
    value,
    name
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        throw new TypeError(
            `${name} must be an object`
        );
    }
}

function assertSection(
    data,
    name
) {
    if (
        data[name] === undefined ||
        data[name] === null
    ) {
        throw new TypeError(
            `BuildingGeometry.${name} is required`
        );
    }
}

function freezeDeep(
    value
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return value;
    }

    for (
        const child
        of Object.values(
            value
        )
    ) {
        freezeDeep(
            child
        );
    }

    return Object.freeze(
        value
    );
}

function validateGeometry(
    data
) {
    assertObject(
        data,
        'BuildingGeometry'
    );

    if (
        !data.model
    ) {
        throw new TypeError(
            'BuildingGeometry.model is required'
        );
    }

    for (
        const section
        of REQUIRED_SECTIONS
    ) {
        assertSection(
            data,
            section
        );
    }

    /*
     * Ridge is conditional.
     *
     * Gabled:
     *     ridge must contain geometry.
     *
     * Left/right sloped:
     *     ridge is allowed to be null.
     */
    const roofType =
        data.model?.roof?.type ||
        data.roof?.type ||
        'gabled';

    if (
        roofType === 'gabled'
    ) {
        if (
            data.ridge === undefined ||
            data.ridge === null
        ) {
            throw new TypeError(
                'BuildingGeometry.ridge is required for gabled roof'
            );
        }
    } else if (
        roofType === 'left-sloped' ||
        roofType === 'right-sloped'
    ) {
        if (
            data.ridge === undefined
        ) {
            throw new TypeError(
                'BuildingGeometry.ridge must be null or a valid section for a sloped roof'
            );
        }
    } else {
        throw new TypeError(
            `Unsupported roof type: ${roofType}`
        );
    }

    return data;
}

export function createBuildingGeometryContract(
    data
) {
    validateGeometry(
        data
    );

    return freezeDeep({
        coordinateSystem: {
            x: 'width',
            y: 'height',
            z: 'length'
        },

        model:
            data.model,

        bounds:
            data.bounds,

        envelope:
            data.envelope,

        walls:
            data.walls,

        foundation:
            data.foundation,

        roof:
            data.roof,

        panels:
            data.panels,

        openings:
            data.openings,

        frames:
            data.frames,

        girts:
            data.girts,

        purlins:
            data.purlins,

        endWallColumns:
            data.endWallColumns,

        wainscot:
            data.wainscot,

        trims:
            data.trims,

        ridge:
            data.ridge,

        gutters:
            data.gutters,

        downspouts:
            data.downspouts,

        awnings:
            data.awnings,

        liner:
            data.liner,

        mezzanine:
            data.mezzanine,

        crane:
            data.crane,

        driveway:
            data.driveway,

        logo:
            data.logo
    });
}

export function validateBuildingGeometry(
    geometry
) {
    validateGeometry(
        geometry
    );

    return true;
}