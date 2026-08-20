const SIDE_TO_WALL = Object.freeze({
    F: 'front',
    B: 'back',
    L: 'left',
    R: 'right'
});

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function bounds(min, max) {
    return Object.freeze({
        min,
        max,
        width: max.x - min.x,
        height: max.y - min.y,
        length: max.z - min.z,
        center: point(
            (min.x + max.x) / 2,
            (min.y + max.y) / 2,
            (min.z + max.z) / 2
        )
    });
}

function normalizeOpening(opening) {
    if (!opening || typeof opening !== 'object') {
        throw new TypeError(
            'Opening must be an object'
        );
    }

    if (!opening.id) {
        throw new TypeError(
            'Opening id is required'
        );
    }

    if (!['window', 'door'].includes(opening.type)) {
        throw new RangeError(
            `Unsupported opening type: ${opening.type}`
        );
    }

    if (!Object.prototype.hasOwnProperty.call(
        SIDE_TO_WALL,
        opening.side
    )) {
        throw new RangeError(
            `Unsupported opening side: ${opening.side}`
        );
    }

    for (const field of [
        'width',
        'height',
        'position',
        'verticalOffset'
    ]) {
        if (
            !Number.isFinite(opening[field]) ||
            opening[field] <= 0 &&
            field !== 'verticalOffset'
        ) {
            throw new RangeError(
                `Invalid opening.${field}`
            );
        }
    }

    return opening;
}

function createFrontBackOpening(
    opening,
    wall,
    isBack
) {
    const centerX = opening.position;
    const minY = opening.verticalOffset;
    const maxY = minY + opening.height;

    const minX =
        centerX - opening.width / 2;

    const maxX =
        centerX + opening.width / 2;

    const z = wall.bounds.min.z;

    return {
        id: opening.id,
        type: opening.type,
        side: opening.side,

        anchor: point(
            centerX,
            minY + opening.height / 2,
            z
        ),

        bounds: bounds(
            point(minX, minY, z),
            point(maxX, maxY, z)
        ),

        dimensions: Object.freeze({
            width: opening.width,
            height: opening.height
        }),

        normal: point(
            0,
            0,
            isBack ? -1 : 1
        )
    };
}

function createLeftRightOpening(
    opening,
    wall,
    isRight
) {
    const centerZ = opening.position;
    const minY = opening.verticalOffset;
    const maxY = minY + opening.height;

    const minZ =
        centerZ - opening.width / 2;

    const maxZ =
        centerZ + opening.width / 2;

    const x = wall.bounds.min.x;

    return {
        id: opening.id,
        type: opening.type,
        side: opening.side,

        anchor: point(
            x,
            minY + opening.height / 2,
            centerZ
        ),

        bounds: bounds(
            point(x, minY, minZ),
            point(x, maxY, maxZ)
        ),

        dimensions: Object.freeze({
            width: opening.width,
            height: opening.height
        }),

        normal: point(
            isRight ? -1 : 1,
            0,
            0
        )
    };
}

function createOpening(
    opening,
    walls
) {
    const wallName =
        SIDE_TO_WALL[opening.side];

    const wall = walls[wallName];

    if (!wall) {
        throw new Error(
            `Wall geometry not found: ${wallName}`
        );
    }

    if (
        opening.side === 'F' ||
        opening.side === 'B'
    ) {
        return createFrontBackOpening(
            opening,
            wall,
            opening.side === 'B'
        );
    }

    return createLeftRightOpening(
        opening,
        wall,
        opening.side === 'R'
    );
}

function validateOpeningBounds(
    opening,
    model,
    wall
) {
    const wallSpan =
        opening.side === 'F' ||
        opening.side === 'B'
            ? model.dimensions.width
            : model.dimensions.length;

    const start =
        opening.position -
        opening.width / 2;

    const end =
        opening.position +
        opening.width / 2;

    if (start < 0 || end > wallSpan) {
        throw new RangeError(
            `Opening ${opening.id} exceeds wall boundaries`
        );
    }

    if (
        opening.verticalOffset < 0 ||
        opening.verticalOffset +
            opening.height >
            wall.bounds.height
    ) {
        throw new RangeError(
            `Opening ${opening.id} exceeds wall height`
        );
    }
}

function validateCollisions(openings) {
    for (let i = 0; i < openings.length; i++) {
        for (let j = i + 1; j < openings.length; j++) {
            const a = openings[i];
            const b = openings[j];

            if (a.side !== b.side) {
                continue;
            }

            const aStart =
                a.position -
                a.width / 2;

            const aEnd =
                a.position +
                a.width / 2;

            const bStart =
                b.position -
                b.width / 2;

            const bEnd =
                b.position +
                b.width / 2;

            const horizontalOverlap =
                aStart < bEnd &&
                bStart < aEnd;

            const verticalOverlap =
                a.verticalOffset <
                    b.verticalOffset + b.height &&
                b.verticalOffset <
                    a.verticalOffset + a.height;

            if (
                horizontalOverlap &&
                verticalOverlap
            ) {
                throw new RangeError(
                    `Openings ${a.id} and ${b.id} overlap`
                );
            }
        }
    }
}

export function createOpeningGeometry(
    model,
    envelope,
    walls,
    roof
) {
    if (!model) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (!envelope) {
        throw new TypeError(
            'BuildingEnvelope is required'
        );
    }

    if (!walls) {
        throw new TypeError(
            'WallGeometry is required'
        );
    }

    if (!roof) {
        throw new TypeError(
            'RoofGeometry is required'
        );
    }

    const sourceOpenings =
        Array.isArray(model.openings)
            ? model.openings
            : [];

    const normalized =
        sourceOpenings.map(normalizeOpening);

    const geometries = normalized.map(
        opening => {
            const wall =
                walls[
                    SIDE_TO_WALL[opening.side]
                ];

            validateOpeningBounds(
                opening,
                model,
                wall
            );

            return createOpening(
                opening,
                walls
            );
        }
    );

    validateCollisions(normalized);

    return Object.freeze(
        geometries
    );
}