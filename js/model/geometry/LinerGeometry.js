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

function createPoint2D(
    x,
    y
) {
    return Object.freeze({
        x,
        y
    });
}

function createBounds(
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

function createSideShape(
    width,
    height,
    holes
) {
    return Object.freeze({
        points:
            Object.freeze([
                createPoint2D(
                    0,
                    0
                ),

                createPoint2D(
                    width,
                    0
                ),

                createPoint2D(
                    width,
                    height
                ),

                createPoint2D(
                    0,
                    height
                )
            ]),

        holes:
            Object.freeze(
                holes.map(
                    hole =>
                        Object.freeze({
                            minX:
                                hole.minX,

                            minY:
                                hole.minY,

                            maxX:
                                hole.maxX,

                            maxY:
                                hole.maxY
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
        (
            hole.x -
            (
                hole.width ??
                hole.w ??
                0
            ) / 2
        );

    const minY =
        hole.minY ??
        hole.y ??
        0;

    const holeWidth =
        hole.width ??
        hole.w ??
        (
            (
                hole.maxX ??
                0
            ) -
            minX
        );

    const holeHeight =
        hole.height ??
        hole.h ??
        (
            (
                hole.maxY ??
                0
            ) -
            minY
        );

    const maxX =
        hole.maxX ??
        (
            minX +
            holeWidth
        );

    const maxY =
        hole.maxY ??
        (
            minY +
            holeHeight
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
        maxY,
        width:
            maxX -
            minX,
        height:
            maxY -
            minY
    });
}

function createSide(
    side,
    width,
    height,
    thickness,
    holes,
    envelope
) {
    const halfWidth =
        envelope.width /
        2;

    const halfLength =
        envelope.length /
        2;

    let position;
    let rotationY;
    let bounds;

    if (side === 'F') {
        position =
            point(
                -width / 2,
                0,
                0
            );

        rotationY = 0;

        bounds =
            createBounds(
                point(
                    -halfWidth,
                    0,
                    0
                ),
                point(
                    halfWidth,
                    height,
                    thickness
                )
            );
    }

    if (side === 'B') {
        position =
            point(
                width / 2,
                0,
                0
            );

        rotationY =
            Math.PI;

        bounds =
            createBounds(
                point(
                    -halfWidth,
                    0,
                    envelope.length -
                        thickness
                ),
                point(
                    halfWidth,
                    height,
                    envelope.length
                )
            );
    }

    if (side === 'L') {
        position =
            point(
                -halfLength,
                0,
                0
            );

        rotationY =
            Math.PI / 2;

        bounds =
            createBounds(
                point(
                    -halfWidth -
                        thickness,
                    0,
                    0
                ),
                point(
                    -halfWidth,
                    height,
                    envelope.length
                )
            );
    }

    if (side === 'R') {
        position =
            point(
                halfLength,
                0,
                0
            );

        rotationY =
            -Math.PI / 2;

        bounds =
            createBounds(
                point(
                    halfWidth,
                    0,
                    0
                ),
                point(
                    halfWidth +
                        thickness,
                    height,
                    envelope.length
                )
            );
    }

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
            ),

        bounds
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
    openings = []
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
                }),

            bounds: null
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
        0.01;

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
            openings
                .filter(
                    opening =>
                        opening &&
                        opening.side ===
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
                holes,
                envelope
            );
    }

    const allBounds =
        SIDES
            .map(
                side =>
                    sides[side].bounds
            );

    const min =
        point(
            Math.min(
                ...allBounds.map(
                    value =>
                        value.min.x
                )
            ),

            Math.min(
                ...allBounds.map(
                    value =>
                        value.min.y
                )
            ),

            Math.min(
                ...allBounds.map(
                    value =>
                        value.min.z
                )
            )
        );

    const max =
        point(
            Math.max(
                ...allBounds.map(
                    value =>
                        value.max.x
                )
            ),

            Math.max(
                ...allBounds.map(
                    value =>
                        value.max.y
                )
            ),

            Math.max(
                ...allBounds.map(
                    value =>
                        value.max.z
                )
            )
        );

    return Object.freeze({
        enabled: true,

        height,

        thickness,

        sides:
            Object.freeze(
                sides
            ),

        bounds:
            createBounds(
                min,
                max
            )
    });
}