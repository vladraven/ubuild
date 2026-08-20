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
    assertFinite(actual, `${path}.actual`);
    assertFinite(expected, `${path}.expected`);

    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(
            `${path}: expected ${expected}, got ${actual}`
        );
    }
}

function assertPoint(point, path) {
    if (!point || typeof point !== 'object') {
        throw new TypeError(
            `${path} must be a point`
        );
    }

    assertFinite(point.x, `${path}.x`);
    assertFinite(point.y, `${path}.y`);
    assertFinite(point.z, `${path}.z`);
}

function assertBounds(bounds, path) {
    if (!bounds || typeof bounds !== 'object') {
        throw new TypeError(
            `${path} must be bounds`
        );
    }

    assertPoint(bounds.min, `${path}.min`);
    assertPoint(bounds.max, `${path}.max`);

    assertClose(
        bounds.width,
        bounds.max.x - bounds.min.x,
        `${path}.width`
    );

    assertClose(
        bounds.height,
        bounds.max.y - bounds.min.y,
        `${path}.height`
    );

    assertClose(
        bounds.length,
        bounds.max.z - bounds.min.z,
        `${path}.length`
    );
}

function assertEnvelope(
    model,
    envelope
) {
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

    assertClose(
        envelope.bounds.width,
        model.dimensions.width,
        'envelope.bounds.width'
    );

    assertClose(
        envelope.bounds.height,
        model.dimensions.height,
        'envelope.bounds.height'
    );

    assertClose(
        envelope.bounds.length,
        model.dimensions.length,
        'envelope.bounds.length'
    );
}

function assertWall(
    wall,
    envelope,
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

    if (!Array.isArray(wall.edges)) {
        throw new Error(
            `Missing wall edges: ${name}`
        );
    }
}

function assertWalls(
    walls,
    envelope
) {
    for (const name of [
        'front',
        'back',
        'left',
        'right'
    ]) {
        assertWall(
            walls[name],
            envelope,
            name
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
        walls.back.bounds.min.z,
        envelope.bounds.max.z,
        'back wall position'
    );

    assertClose(
        walls.left.bounds.min.x,
        envelope.bounds.min.x,
        'left wall position'
    );

    assertClose(
        walls.right.bounds.min.x,
        envelope.bounds.max.x,
        'right wall position'
    );
}

function assertRoof(
    model,
    roof,
    envelope,
    walls
) {
    if (!roof) {
        throw new Error(
            'RoofGeometry is required'
        );
    }

    if (roof.type !== model.roof.type) {
        throw new Error(
            'Roof type does not match BuildingModel'
        );
    }

    if (
        !Number.isFinite(roof.rise) ||
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

    for (const side of ['left', 'right']) {
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
        model.roof.type === 'gabled' &&
        !roof.ridge
    ) {
        throw new Error(
            'Gabled roof requires ridge geometry'
        );
    }

    if (
        model.roof.type !== 'gabled' &&
        roof.ridge !== null
    ) {
        throw new Error(
            'Single-slope roof cannot have ridge geometry'
        );
    }

    assertClose(
        roof.edges.front.start.z,
        roof.edges.front.end.z,
        'roof.frontEdge.z'
    );

    assertClose(
        roof.edges.back.start.z,
        roof.edges.back.end.z,
        'roof.backEdge.z'
    );

    assertClose(
        roof.edges.front.start.z,
        roof.eaves.left.front.z,
        'roof front/eave relation'
    );

    assertClose(
        roof.edges.back.start.z,
        roof.eaves.left.back.z,
        'roof back/eave relation'
    );

    assertClose(
        roof.eaves.left.front.z,
        roof.eaves.left.back.z,
        'left eave orientation'
    );

    assertClose(
        roof.eaves.right.front.z,
        roof.eaves.right.back.z,
        'right eave orientation'
    );

    if (walls.front && walls.back) {
        assertClose(
            roof.edges.front.start.z,
            walls.front.bounds.min.z +
                model.roof.overhangs.front,
            'roof/front wall relation'
        );

        assertClose(
            roof.edges.back.start.z,
            walls.back.bounds.max.z +
                model.roof.overhangs.back,
            'roof/back wall relation'
        );
    }

    void envelope;
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
    walls,
    model
) {
    if (!opening) {
        throw new Error(
            'Opening geometry cannot be null'
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
        walls[wallMap[opening.side]];

    if (!wall) {
        throw new Error(
            `Opening ${opening.id} references missing wall`
        );
    }

    const tolerance = EPSILON * 10;

    if (
        opening.side === 'F' ||
        opening.side === 'B'
    ) {
        if (
            opening.bounds.min.x <
                wall.bounds.min.x - tolerance ||
            opening.bounds.max.x >
                wall.bounds.max.x + tolerance
        ) {
            throw new Error(
                `Opening ${opening.id} exceeds wall width`
            );
        }
    } else {
        if (
            opening.bounds.min.z <
                wall.bounds.min.z - tolerance ||
            opening.bounds.max.z >
                wall.bounds.max.z + tolerance
        ) {
            throw new Error(
                `Opening ${opening.id} exceeds wall length`
            );
        }
    }

    if (
        opening.bounds.min.y <
            wall.bounds.min.y - tolerance ||
        opening.bounds.max.y >
            wall.bounds.max.y + tolerance
    ) {
        throw new Error(
            `Opening ${opening.id} exceeds wall height`
        );
    }

    void model;
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
        geometry.envelope,
        geometry.walls
    );

    assertFoundation(
        model,
        geometry.foundation,
        geometry.envelope
    );

    for (const opening of geometry.openings) {
        assertOpening(
            opening,
            geometry.walls,
            model
        );
    }

    return true;
}