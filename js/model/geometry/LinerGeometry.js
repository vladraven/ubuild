const SIDES = Object.freeze([
    'L',
    'R',
    'F',
    'B'
]);

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

function createSideShape(
    width,
    height,
    holes
) {
    return Object.freeze({
        points:
            Object.freeze([
                Object.freeze({
                    x: 0,
                    y: 0
                }),

                Object.freeze({
                    x: width,
                    y: 0
                }),

                Object.freeze({
                    x: width,
                    y: height
                }),

                Object.freeze({
                    x: 0,
                    y: height
                })
            ]),

        holes:
            Object.freeze(
                holes.map(
                    hole =>
                        Object.freeze({
                            minX: hole.minX,
                            minY: hole.minY,
                            maxX: hole.maxX,
                            maxY: hole.maxY
                        })
                )
            )
    });
}

function normalizeHole(
    hole,
    width,
    height
) {
    const minX =
        hole.minX ??
        hole.x ??
        0;

    const minY =
        hole.minY ??
        hole.y ??
        0;

    const maxX =
        hole.maxX ??
        (
            minX +
            (
                hole.width ??
                hole.w ??
                0
            )
        );

    const maxY =
        hole.maxY ??
        (
            minY +
            (
                hole.height ??
                hole.h ??
                0
            )
        );

    if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
    ) {
        throw new TypeError(
            'Liner opening coordinates must be finite'
        );
    }

    if (
        minX < 0 ||
        minY < 0 ||
        maxX <= minX ||
        maxY <= minY ||
        maxX > width ||
        maxY > height
    ) {
        throw new RangeError(
            'Liner opening must fit inside liner side'
        );
    }

    return Object.freeze({
        minX,
        minY,
        maxX,
        maxY
    });
}

function createSide(
    side,
    width,
    height,
    thickness,
    holes
) {
    const position =
        side === 'F'
            ? point(
                -width / 2,
                0,
                0
            )
            : side === 'B'
                ? point(
                    -width / 2,
                    0,
                    0
                )
                : side === 'L'
                    ? point(
                        0,
                        0,
                        -width / 2
                    )
                    : point(
                        0,
                        0,
                        -width / 2
                    );

    const rotationY =
        side === 'F'
            ? 0
            : side === 'B'
                ? Math.PI
                : side === 'L'
                    ? Math.PI / 2
                    : -Math.PI / 2;

    return Object.freeze({
        side,

        width,

        height,

        thickness,

        shapeData:
            createSideShape(
                width,
                height,
                holes
            ),

        position,

        rotationY,

        anchor:
            point(
                position.x,
                position.y,
                position.z
            )
    });
}

function getSideWidth(
    side,
    envelope
) {
    return (
        side === 'L' ||
        side === 'R'
    )
        ? envelope.length
        : envelope.width;
}

export function createLinerGeometry(
    model,
    envelope,
    openings
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

    const config =
        model.liner ??
        model.interiorLiner;

    if (
        !config ||
        !config.enabled
    ) {
        return Object.freeze({
            enabled: false,

            height: 0,

            thickness: 0,

            sides:
                Object.freeze({
                    L: null,
                    R: null,
                    F: null,
                    B: null
                })
        });
    }

    const height =
        config.height ??
        (
            model.dimensions.height *
            (
                config.hPercent ??
                1
            )
        );

    const thickness =
        config.thickness ??
        0.05;

    if (
        !Number.isFinite(height) ||
        height <= 0 ||
        height >
            model.dimensions.height
    ) {
        throw new RangeError(
            'liner.height must be inside building height'
        );
    }

    if (
        !Number.isFinite(thickness) ||
        thickness <= 0
    ) {
        throw new RangeError(
            'liner.thickness must be greater than zero'
        );
    }

    const sourceOpenings =
        Array.isArray(openings)
            ? openings
            : [];

    const sides = {};

    for (
        const side
        of SIDES
    ) {
        const width =
            getSideWidth(
                side,
                envelope
            );

        const holes =
            sourceOpenings
                .filter(
                    opening =>
                        opening?.side ===
                        side
                )
                .map(
                    opening =>
                        normalizeHole(
                            opening,
                            width,
                            height
                        )
                );

        sides[side] =
            createSide(
                side,
                width,
                height,
                thickness,
                holes
            );
    }

    return Object.freeze({
        enabled: true,

        height,

        thickness,

        sides:
            Object.freeze(
                sides
            )
    });
}