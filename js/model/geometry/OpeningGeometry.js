const SIDE_TO_WALL = Object.freeze({
    F: 'front',
    B: 'back',
    L: 'left',
    R: 'right'
});

const OPENING_TYPES = Object.freeze([
    'Window',
    'Walk Door Solid',
    'Walk Door Solid Double',
    'Overhead Panel Door',
    'Bi-Fold Door',
    'Hydraulic Door'
]);

const OPENING_DEFS = Object.freeze({
    Window: Object.freeze({
        width: 1,
        height: 1,
        yOff: 1
    }),

    'Walk Door Solid': Object.freeze({
        width: 1,
        height: 2.1,
        yOff: 0
    }),

    'Walk Door Solid Double': Object.freeze({
        width: 2,
        height: 2.1,
        yOff: 0
    }),

    'Overhead Panel Door': Object.freeze({
        width: 3,
        height: 3,
        yOff: 0
    }),

    'Bi-Fold Door': Object.freeze({
        width: 4,
        height: 3,
        yOff: 0
    }),

    'Hydraulic Door': Object.freeze({
        width: 4,
        height: 3,
        yOff: 0
    })
});

function point(x, y, z) {
    return Object.freeze({
        x,
        y,
        z
    });
}

function bounds(min, max) {
    return Object.freeze({
        min,
        max,

        width:
            max.x - min.x,

        height:
            max.y - min.y,

        length:
            max.z - min.z,

        center: point(
            (min.x + max.x) / 2,
            (min.y + max.y) / 2,
            (min.z + max.z) / 2
        )
    });
}

function getDefinition(
    opening
) {
    const definition =
        OPENING_DEFS[
            opening.type
        ];

    if (!definition) {
        throw new RangeError(
            `Unsupported opening type: ${opening.type}`
        );
    }

    return definition;
}

function normalizeOpening(
    opening
) {
    if (
        !opening ||
        typeof opening !== 'object'
    ) {
        throw new TypeError(
            'Opening must be an object'
        );
    }

    if (
        typeof opening.id !== 'string' ||
        opening.id.trim() === ''
    ) {
        throw new TypeError(
            'Opening id is required'
        );
    }

    if (
        !OPENING_TYPES.includes(
            opening.type
        )
    ) {
        throw new RangeError(
            `Unsupported opening type: ${opening.type}`
        );
    }

    if (
        !Object.prototype.hasOwnProperty.call(
            SIDE_TO_WALL,
            opening.side
        )
    ) {
        throw new RangeError(
            `Unsupported opening side: ${opening.side}`
        );
    }

    const definition =
        getDefinition(opening);

    const width =
        opening.w ??
        opening.width ??
        definition.width;

    const height =
        opening.h ??
        opening.height ??
        definition.height;

    const verticalOffset =
        opening.yOff ??
        opening.verticalOffset ??
        definition.yOff;

    const position =
        opening.position ??
        opening.x;

    if (!Number.isFinite(position)) {
        throw new RangeError(
            `Invalid opening.position: ${opening.id}`
        );
    }

    if (
        !Number.isFinite(width) ||
        width <= 0
    ) {
        throw new RangeError(
            `Invalid opening.width: ${opening.id}`
        );
    }

    if (
        !Number.isFinite(height) ||
        height <= 0
    ) {
        throw new RangeError(
            `Invalid opening.height: ${opening.id}`
        );
    }

    if (
        !Number.isFinite(
            verticalOffset
        ) ||
        verticalOffset < 0
    ) {
        throw new RangeError(
            `Invalid opening.yOff: ${opening.id}`
        );
    }

    return Object.freeze({
        ...opening,

        width,
        height,

        position,

        verticalOffset
    });
}

function createFrontBackOpening(
    opening,
    wall,
    isBack
) {
    const centerX =
        opening.position;

    const minY =
        opening.verticalOffset;

    const maxY =
        minY + opening.height;

    const minX =
        centerX -
        opening.width / 2;

    const maxX =
        centerX +
        opening.width / 2;

    const z =
        isBack
            ? wall.bounds.max.z
            : wall.bounds.min.z;

    return {
        id: opening.id,
        type: opening.type,
        side: opening.side,

        anchor: point(
            centerX,
            minY +
                opening.height / 2,
            z
        ),

        bounds: bounds(
            point(
                minX,
                minY,
                z
            ),
            point(
                maxX,
                maxY,
                z
            )
        ),

        dimensions:
            Object.freeze({
                width:
                    opening.width,

                height:
                    opening.height
            }),

        normal: point(
            0,
            0,
            isBack ? -1 : 1
        ),

        parameters:
            Object.freeze({
                ...opening
            })
    };
}

function createLeftRightOpening(
    opening,
    wall,
    isRight
) {
    const centerZ =
        opening.position;

    const minY =
        opening.verticalOffset;

    const maxY =
        minY + opening.height;

    const minZ =
        centerZ -
        opening.width / 2;

    const maxZ =
        centerZ +
        opening.width / 2;

    const x =
        isRight
            ? wall.bounds.max.x
            : wall.bounds.min.x;

    return {
        id: opening.id,
        type: opening.type,
        side: opening.side,

        anchor: point(
            x,
            minY +
                opening.height / 2,
            centerZ
        ),

        bounds: bounds(
            point(
                x,
                minY,
                minZ
            ),
            point(
                x,
                maxY,
                maxZ
            )
        ),

        dimensions:
            Object.freeze({
                width:
                    opening.width,

                height:
                    opening.height
            }),

        normal: point(
            isRight ? -1 : 1,
            0,
            0
        ),

        parameters:
            Object.freeze({
                ...opening
            })
    };
}

function createOpening(
    opening,
    walls
) {
    const wallName =
        SIDE_TO_WALL[
            opening.side
        ];

    const wall =
        walls[wallName];

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

    if (
        start < 0 ||
        end > wallSpan
    ) {
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

function validateCollisions(
    openings
) {
    for (
        let i = 0;
        i < openings.length;
        i++
    ) {
        for (
            let j = i + 1;
            j < openings.length;
            j++
        ) {
            const a =
                openings[i];

            const b =
                openings[j];

            if (
                a.side !==
                b.side
            ) {
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
                    b.verticalOffset +
                        b.height &&
                b.verticalOffset <
                    a.verticalOffset +
                        a.height;

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
        Array.isArray(
            model.openings
        )
            ? model.openings
            : [];

    const normalized =
        sourceOpenings.map(
            normalizeOpening
        );

    const geometries =
        normalized.map(
            opening => {
                const wall =
                    walls[
                        SIDE_TO_WALL[
                            opening.side
                        ]
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

    validateCollisions(
        normalized
    );

    return Object.freeze(
        geometries.map(
            geometry =>
                Object.freeze(
                    geometry
                )
        )
    );
}

export {
    OPENING_TYPES,
    OPENING_DEFS
};