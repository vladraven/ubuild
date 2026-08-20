import {
    OPENING_TYPES,
    OPENING_DEFINITIONS,
    getOpeningDefinition,
    normalizeOpening
} from '../openings/OpeningSchema.js';

const SIDE_TO_WALL = Object.freeze({
    F: 'front',
    B: 'back',
    L: 'left',
    R: 'right'
});

function point(
    x,
    y,
    z
) {
    return Object.freeze({
        x,
        y,
        z
    });
}

function bounds(
    min,
    max
) {
    return Object.freeze({
        min,
        max,

        width:
            max.x -
            min.x,

        height:
            max.y -
            min.y,

        length:
            max.z -
            min.z,

        center:
            point(
                (
                    min.x +
                    max.x
                ) / 2,

                (
                    min.y +
                    max.y
                ) / 2,

                (
                    min.z +
                    max.z
                ) / 2
            )
    });
}

function validateOpeningBounds(
    opening,
    model,
    wall
) {
    const wallLength =
        opening.side === 'F' ||
        opening.side === 'B'
            ? model.dimensions.width
            : model.dimensions.length;

    const start =
        opening.x -
        opening.width / 2;

    const end =
        opening.x +
        opening.width / 2;

    const localCenter =
        wallLength / 2 +
        opening.x;

    if (
        localCenter -
            opening.width / 2 <
            0 ||
        localCenter +
            opening.width / 2 >
            wallLength
    ) {
        throw new RangeError(
            `Opening ${opening.id} exceeds wall boundaries`
        );
    }

    if (
        opening.yOff < 0 ||
        opening.yOff +
            opening.height >
            wall.bounds.height
    ) {
        throw new RangeError(
            `Opening ${opening.id} exceeds wall height`
        );
    }

    return {
        start,
        end,
        localCenter
    };
}

function createFrontBackOpening(
    opening,
    wall,
    isBack
) {
    const centerX =
        opening.x;

    const minX =
        centerX -
        opening.width / 2;

    const maxX =
        centerX +
        opening.width / 2;

    const minY =
        opening.yOff;

    const maxY =
        minY +
        opening.height;

    const z =
        isBack
            ? wall.bounds.max.z
            : wall.bounds.min.z;

    return Object.freeze({
        id:
            opening.id,

        type:
            opening.type,

        side:
            opening.side,

        anchor:
            point(
                centerX,
                minY +
                    opening.height / 2,
                z
            ),

        bounds:
            bounds(
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

        normal:
            point(
                0,
                0,
                isBack
                    ? -1
                    : 1
            ),

        parameters:
            Object.freeze({
                ...opening
            })
    });
}

function createLeftRightOpening(
    opening,
    wall,
    isRight
) {
    const centerZ =
        opening.x;

    const minZ =
        centerZ -
        opening.width / 2;

    const maxZ =
        centerZ +
        opening.width / 2;

    const minY =
        opening.yOff;

    const maxY =
        minY +
        opening.height;

    const x =
        isRight
            ? wall.bounds.max.x
            : wall.bounds.min.x;

    return Object.freeze({
        id:
            opening.id,

        type:
            opening.type,

        side:
            opening.side,

        anchor:
            point(
                x,
                minY +
                    opening.height / 2,
                centerZ
            ),

        bounds:
            bounds(
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

        normal:
            point(
                isRight
                    ? -1
                    : 1,
                0,
                0
            ),

        parameters:
            Object.freeze({
                ...opening
            })
    });
}

function createOpening(
    opening,
    walls
) {
    const wall =
        walls[
            SIDE_TO_WALL[
                opening.side
            ]
        ];

    if (!wall) {
        throw new Error(
            `Wall geometry not found: ${opening.side}`
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
                a.x -
                a.width / 2;

            const aEnd =
                a.x +
                a.width / 2;

            const bStart =
                b.x -
                b.width / 2;

            const bEnd =
                b.x +
                b.width / 2;

            const horizontalOverlap =
                aStart < bEnd &&
                bStart < aEnd;

            const verticalOverlap =
                a.yOff <
                    b.yOff +
                        b.height &&
                b.yOff <
                    a.yOff +
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
    walls
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

    const source =
        Array.isArray(
            model.openings
        )
            ? model.openings
            : [];

    const normalized =
        source.map(
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
        geometries
    );
}

export {
    OPENING_TYPES,
    OPENING_DEFINITIONS
};