const SIDES = Object.freeze([
    'L',
    'R',
    'F',
    'B'
]);

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function createWall(
    points,
    thickness,
    position,
    rotationY
) {
    return Object.freeze({
        shapeData: Object.freeze({
            points: Object.freeze(
                points.map(
                    value =>
                        point(
                            value.x,
                            value.y
                        )
                )
            )
        }),

        thickness,

        position: point(
            position.x,
            position.y,
            position.z
        ),

        rotationY
    });
}

function createColumns(
    positions,
    size,
    height
) {
    return Object.freeze(
        positions.map(
            position =>
                Object.freeze({
                    size,
                    height,

                    position: point(
                        position.x,
                        position.y,
                        position.z
                    )
                })
        )
    );
}

function createSideGeometry(
    side,
    state,
    model,
    envelope
) {
    if (
        !state ||
        !state.active
    ) {
        return null;
    }

    const depth =
        Number(state.depth) || 0;

    const drop =
        Number(state.drop) || 0;

    const pitch =
        Number(state.pitch) || 0;

    const cutL =
        Number(state.cutL) || 0;

    const cutR =
        Number(state.cutR) || 0;

    const width =
        side === 'L' ||
        side === 'R'
            ? model.dimensions.length
            : model.dimensions.width;

    const usableWidth =
        Math.max(
            width -
            cutL -
            cutR,
            0
        );

    const pitchAngle =
        Math.atan(
            pitch
        );

    const rise =
        depth *
        pitch;

    const lengthOnSlope =
        Math.sqrt(
            depth * depth +
            rise * rise
        );

    const baseY =
        model.dimensions.height -
        drop;

    const position =
        side === 'L'
            ? point(
                envelope.bounds.min.x,
                baseY,
                0
            )
            : side === 'R'
                ? point(
                    envelope.bounds.max.x,
                    baseY,
                    0
                )
                : side === 'F'
                    ? point(
                        0,
                        baseY,
                        envelope.bounds.min.z
                    )
                    : point(
                        0,
                        baseY,
                        envelope.bounds.max.z
                    );

    const rotationY =
        side === 'L'
            ? Math.PI / 2
            : side === 'R'
                ? -Math.PI / 2
                : side === 'B'
                    ? Math.PI
                    : 0;

    const walls = {};

    if (state.wallF) {
        walls.wallF =
            createWall(
                [
                    {
                        x: 0,
                        y: 0
                    },
                    {
                        x: usableWidth,
                        y: 0
                    },
                    {
                        x: usableWidth,
                        y: baseY
                    },
                    {
                        x: 0,
                        y: baseY
                    }
                ],
                model.walls.thickness,
                point(0, 0, 0),
                0
            );
    }

    if (state.wallL) {
        walls.wallL =
            createWall(
                [
                    {
                        x: 0,
                        y: 0
                    },
                    {
                        x: depth,
                        y: 0
                    },
                    {
                        x: depth,
                        y: baseY
                    },
                    {
                        x: 0,
                        y: baseY
                    }
                ],
                model.walls.thickness,
                point(0, 0, 0),
                0
            );
    }

    if (state.wallR) {
        walls.wallR =
            createWall(
                [
                    {
                        x: 0,
                        y: 0
                    },
                    {
                        x: depth,
                        y: 0
                    },
                    {
                        x: depth,
                        y: baseY
                    },
                    {
                        x: 0,
                        y: baseY
                    }
                ],
                model.walls.thickness,
                point(0, 0, 0),
                0
            );
    }

    const columnPositions = [];

    if (state.wallL) {
        columnPositions.push(
            point(
                0,
                baseY / 2,
                0
            )
        );
    }

    if (state.wallR) {
        columnPositions.push(
            point(
                usableWidth,
                baseY / 2,
                0
            )
        );
    }

    return Object.freeze({
        side,

        active: true,

        position,

        rotationY,

        depth,

        drop,

        pitch,

        pitchAngle,

        width: usableWidth,

        roof: Object.freeze({
            lengthOnSlope,
            thickness:
                model.walls.thickness
        }),

        wallF:
            walls.wallF ?? null,

        wallL:
            walls.wallL ?? null,

        wallR:
            walls.wallR ?? null,

        columns:
            createColumns(
                columnPositions,
                model.walls.thickness,
                baseY
            )
    });
}

export function createAwningGeometry(
    model,
    envelope
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

    const source =
        model.awnings ?? {};

    const result = {};

    for (const side of SIDES) {
        result[side] =
            createSideGeometry(
                side,
                source[side],
                model,
                envelope
            );
    }

    return Object.freeze(
        result
    );
}