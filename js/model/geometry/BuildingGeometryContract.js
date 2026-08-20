const REQUIRED_SECTIONS = Object.freeze([
    'envelope',
    'walls',
    'roof',
    'foundation',
    'openings',
    'structural'
]);

function assertObject(value, name) {
    if (!value || typeof value !== 'object') {
        throw new TypeError(
            `${name} must be an object`
        );
    }
}

function assertSection(
    data,
    name
) {
    assertObject(
        data[name],
        `BuildingGeometry.${name}`
    );
}

function freezeDeep(value) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return value;
    }

    for (
        const child
        of Object.values(value)
    ) {
        freezeDeep(child);
    }

    return Object.freeze(value);
}

function validateGeometry(data) {
    assertObject(
        data,
        'BuildingGeometry'
    );

    for (
        const section
        of REQUIRED_SECTIONS
    ) {
        assertSection(
            data,
            section
        );
    }

    if (!data.model) {
        throw new TypeError(
            'BuildingGeometry.model is required'
        );
    }

    return data;
}

export function createBuildingGeometryContract(
    data
) {
    validateGeometry(data);

    return freezeDeep({
        coordinateSystem: {
            x: 'width',
            y: 'height',
            z: 'length'
        },

        model: data.model,

        envelope:
            data.envelope,

        walls:
            data.walls,

        roof:
            data.roof,

        foundation:
            data.foundation,

        openings:
            data.openings,

        structural:
            data.structural
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