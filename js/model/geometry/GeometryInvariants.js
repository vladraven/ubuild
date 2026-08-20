// js/model/geometry/GeometryInvariants.js
const EPSILON = 1e-9;

function assertFinite(value, path) {
    if (!Number.isFinite(value)) {
        throw new TypeError(
            `${path} must be a finite number`
        );
    }
}

function assertClose(
    actual,
    expected,
    path,
    tolerance = EPSILON
) {
    assertFinite(
        actual,
        `${path}.actual`
    );

    assertFinite(
        expected,
        `${path}.expected`
    );

    if (
        Math.abs(actual - expected) >
        tolerance
    ) {
        throw new Error(
            `${path}: expected ${expected}, got ${actual}`
        );
    }
}

function assertPoint(
    value,
    path
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        throw new TypeError(
            `${path} must be a point`
        );
    }

    assertFinite(
        value.x,
        `${path}.x`
    );

    assertFinite(
        value.y,
        `${path}.y`
    );

    assertFinite(
        value.z,
        `${path}.z`
    );
}

function assertBounds(
    value,
    path
) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        throw new TypeError(
            `${path} must be bounds`
        );
    }

    assertPoint(
        value.min,
        `${path}.min`
    );

    assertPoint(
        value.max,
        `${path}.max`
    );

    assertClose(
        value.width,
        value.max.x - value.min.x,
        `${path}.width`
    );

    assertClose(
        value.height,
        value.max.y - value.min.y,
        `${path}.height`
    );

    assertClose(
        value.length,
        value.max.z - value.min.z,
        `${path}.length`
    );
}

function assertEnvelope(
    model,
    envelope
) {
    if (!envelope) {
        throw new TypeError('BuildingEnvelope is required');
    }

    assertBounds(
        envelope.bounds,
        'envelope.bounds'
    );

    assertClose(
        envelope.width,
        model.dimensions.width,
        'envelope.width'
    );

    assertClose(
        envelope.length,
        model.dimensions.length,
        'envelope.length'
    );

    assertClose(
        envelope.height,
        model.dimensions.height,
        'envelope.height'
    );
}

function assertWall(
    wall,
    name
) {
    if (!wall) {
        throw new Error(
            `Missing wall geometry: ${name}`
        );
    }

    assertBounds(
        wall.bounds,
        `walls.${name}.bounds`
    );

    if (!wall.plane) {
        throw new Error(
            `Missing wall plane: ${name}`
        );
    }

    if (!wall.corners) {
        throw new Error(
            `Missing wall corners: ${name}`
        );
    }
}

function assertWalls(
    walls,
    envelope
) {
    for (const side of [
        'front',
        'back',
        'left',
        'right'
    ]) {
        assertWall(
            walls[side],
            side
        );
    }

    assertClose(
        walls.front.bounds.width,
        envelope.width,
        'front wall width'
    );

    assertClose(
        walls.back.bounds.width,
        envelope.width,
        'back wall width'
    );

    assertClose(
        walls.left.bounds.length,
        envelope.length,
        'left wall length'
    );

    assertClose(
        walls.right.bounds.length,
        envelope.length,
        'right wall length'
    );

    assertClose(
        walls.front.bounds.min.z,
        envelope.bounds.min.z,
        'front wall position'
    );

    assertClose(
        walls.back.bounds.max.z,
        envelope.bounds.max.z,
        'back wall position'
    );

    assertClose(
        walls.left.bounds.min.x,
        envelope.bounds.min.x,
        'left wall position'
    );

    assertClose(
        walls.right.bounds.max.x,
        envelope.bounds.max.x,
        'right wall position'
    );
}

function assertRoof(
    model,
    roof,
    envelope
) {
    if (!roof) {
        throw new Error(
            'RoofGeometry is required'
        );
    }

    if (
        roof.type !==
        model.roof.type
    ) {
        throw new Error(
            'Roof type does not match BuildingModel'
        );
    }

    if (
        !Number.isFinite(
            roof.pitchRatio
        )
    ) {
        throw new Error(
            'Roof pitchRatio is required'
        );
    }

    if (
        !Number.isFinite(
            roof.pitchAngle
        )
    ) {
        throw new Error(
            'Roof pitchAngle is required'
        );
    }

    if (
        !Number.isFinite(
            roof.rise
        ) ||
        roof.rise < 0
    ) {
        throw new Error(
            'Roof rise must be non-negative'
        );
    }

    assertBounds(
        roof.bounds,
        'roof.bounds'
    );

    if (
        !Array.isArray(
            roof.planes
        ) ||
        roof.planes.length === 0
    ) {
        throw new Error(
            'Roof planes are required'
        );
    }

    for (const side of [
        'left',
        'right'
    ]) {
        if (!roof.eaves?.[side]) {
            throw new Error(
                `Missing roof eave: ${side}`
            );
        }

        assertPoint(
            roof.eaves[side].front,
            `roof.eaves.${side}.front`
        );

        assertPoint(
            roof.eaves[side].back,
            `roof.eaves.${side}.back`
        );
    }

    if (
        model.roof.type ===
        'gabled' &&
        !roof.ridge
    ) {
        throw new Error(
            'Gabled roof requires ridge geometry'
        );
    }

    if (
        model.roof.type !==
        'gabled' &&
        roof.ridge !== null
    ) {
        throw new Error(
            'Single-slope roof cannot have ridge geometry'
        );
    }

    assertClose(
        roof.eaves.left.front.x,
        -envelope.width / 2 - model.roof.overhangs.left,
        'left eave X position'
    );

    assertClose(
        roof.eaves.right.front.x,
        envelope.width / 2 + model.roof.overhangs.right,
        'right eave X position'
    );

    assertClose(
        roof.bounds.min.z,
        envelope.bounds.min.z -
            model.roof.overhangs.front,
        'roof.front overhang'
    );

    assertClose(
        roof.bounds.max.z,
        envelope.bounds.max.z +
            model.roof.overhangs.back,
        'roof.back overhang'
    );
}

function assertFoundation(
    model,
    foundation,
    envelope
) {
    if (!foundation) {
        throw new Error(
            'FoundationGeometry is required'
        );
    }

    assertBounds(
        foundation.bounds,
        'foundation.bounds'
    );

    assertClose(
        foundation.bounds.min.x,
        envelope.bounds.min.x,
        'foundation.left'
    );

    assertClose(
        foundation.bounds.max.x,
        envelope.bounds.max.x,
        'foundation.right'
    );

    assertClose(
        foundation.bounds.min.z,
        envelope.bounds.min.z,
        'foundation.front'
    );

    assertClose(
        foundation.bounds.max.z,
        envelope.bounds.max.z,
        'foundation.back'
    );

    assertClose(
        foundation.bounds.max.y,
        0,
        'foundation.top'
    );

    assertClose(
        foundation.bounds.min.y,
        -model.foundation.height,
        'foundation.bottom'
    );
}

function assertOpening(
    opening,
    walls
) {
    if (!opening) {
        throw new Error(
            'Opening geometry cannot be null'
        );
    }

    if (
        typeof opening.id !==
        'string'
    ) {
        throw new Error(
            'Opening geometry requires id'
        );
    }

    assertPoint(
        opening.anchor,
        `opening.${opening.id}.anchor`
    );

    assertBounds(
        opening.bounds,
        `opening.${opening.id}.bounds`
    );

    const wallMap = {
        F: 'front',
        B: 'back',
        L: 'left',
        R: 'right'
    };

    const wall =
        walls[
            wallMap[opening.side]
        ];

    if (!wall) {
        throw new Error(
            `Opening ${opening.id} references missing wall`
        );
    }

    const tolerance =
        EPSILON * 10;

    if (
        opening.side === 'F' ||
        opening.side === 'B'
    ) {
        if (
            opening.bounds.min.x <
                wall.bounds.min.x -
                    tolerance ||
            opening.bounds.max.x >
                wall.bounds.max.x +
                    tolerance
        ) {
            throw new Error(
                `Opening ${opening.id} exceeds wall width`
            );
        }
    } else {
        if (
            opening.bounds.min.z <
                wall.bounds.min.z -
                    tolerance ||
            opening.bounds.max.z >
                wall.bounds.max.z +
                    tolerance
        ) {
            throw new Error(
                `Opening ${opening.id} exceeds wall length`
            );
        }
    }

    if (
        opening.bounds.min.y <
            wall.bounds.min.y -
                tolerance ||
        opening.bounds.max.y >
            wall.bounds.max.y +
                tolerance
    ) {
        throw new Error(
            `Opening ${opening.id} exceeds wall height`
        );
    }
}

function assertStructural(
    geometry
) {
    for (const name of [
        'frames',
        'girts',
        'purlins',
        'endWallColumns'
    ]) {
        if (
            !Array.isArray(
                geometry[name]
            )
        ) {
            throw new Error(
                `StructuralGeometry.${name} must be an array`
            );
        }
    }

    for (
        const frame
        of geometry.frames
    ) {
        if (
            !frame.leftColumn ||
            !frame.rightColumn
        ) {
            throw new Error(
                'Structural frame requires columns'
            );
        }
    }

    for (
        const girt
        of geometry.girts
    ) {
        if (
            !Array.isArray(girt.frontSegments) ||
            !Array.isArray(girt.backSegments) ||
            !Array.isArray(girt.leftSegments) ||
            !Array.isArray(girt.rightSegments)
        ) {
            throw new Error(
                'Girt is missing segments'
            );
        }
    }

    for (
        const purlin
        of geometry.purlins
    ) {
        if (
            !purlin.plane &&
            !purlin.planes
        ) {
            throw new Error(
                'Purlin requires plane geometry'
            );
        }
    }
}

export function validateGeometryInvariants(
    model,
    geometry
) {
    if (!model) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (!geometry) {
        throw new TypeError(
            'BuildingGeometry is required'
        );
    }

    assertEnvelope(
        model,
        geometry.envelope
    );

    assertWalls(
        geometry.walls,
        geometry.envelope
    );

    assertRoof(
        model,
        geometry.roof,
        geometry.envelope
    );

    assertFoundation(
        model,
        geometry.foundation,
        geometry.envelope
    );

    if (
        !Array.isArray(
            geometry.openings
        )
    ) {
        throw new TypeError(
            'BuildingGeometry.openings must be an array'
        );
    }

    for (
        const opening
        of geometry.openings
    ) {
        assertOpening(
            opening,
            geometry.walls
        );
    }

    assertStructural(
        geometry
    );

    return true;
}