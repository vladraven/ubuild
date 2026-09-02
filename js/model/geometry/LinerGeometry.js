const SIDES =
    Object.freeze([
        'L',
        'R',
        'F',
        'B'
    ]);

const DEFAULT_THICKNESS =
    0.01;

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

function createDisabledGeometry() {
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

function resolveConfig(
    model
) {
    return (
        model.liner ??
        model.interiorLiner ??
        null
    );
}

function resolveBuildingHeight(
    model,
    envelope
) {
    return (
        envelope.height ??
        model.dimensions?.height
    );
}

function resolveLinerHeight(
    config,
    buildingHeight
) {
    const height =
        config.height ??
        (
            buildingHeight *
            (
                config.hPercent ??
                1
            )
        );

    if (
        !Number.isFinite(
            height
        ) ||
        height <= 0 ||
        height >
        buildingHeight
    ) {
        throw new RangeError(
            'liner.height must be inside building height'
        );
    }

    return height;
}

function resolveThickness(
    config
) {
    const thickness =
        config.thickness ??
        DEFAULT_THICKNESS;

    if (
        !Number.isFinite(
            thickness
        ) ||
        thickness <= 0
    ) {
        throw new RangeError(
            'liner.thickness must be greater than zero'
        );
    }

    return thickness;
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
    const holeWidth =
        hole.width ??
        hole.w ??
        null;

    const holeHeight =
        hole.height ??
        hole.h ??
        null;

    const minX =
        hole.minX ??
        (
            hole.x -
            (
                holeWidth ??
                0
            ) / 2
        );

    const minY =
        hole.minY ??
        hole.y ??
        0;

    const maxX =
        hole.maxX ??
        (
            minX +
            (
                holeWidth ??
                0
            )
        );

    const maxY =
        hole.maxY ??
        (
            minY +
            (
                holeHeight ??
                0
            )
        );

    if (
        !Number.isFinite(
            minX
        ) ||
        !Number.isFinite(
            minY
        ) ||
        !Number.isFinite(
            maxX
        ) ||
        !Number.isFinite(
            maxY
        )
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

function getSideBounds(
    side,
    envelope,
    height,
    thickness
) {
    const min =
        envelope.bounds?.min ??
        point(
            -envelope.width / 2,
            0,
            -envelope.length / 2
        );

    const max =
        envelope.bounds?.max ??
        point(
            envelope.width / 2,
            envelope.height,
            envelope.length / 2
        );

    if (
        side === 'F'
    ) {
        return createBounds(
            point(
                min.x,
                0,
                min.z
            ),

            point(
                max.x,
                height,
                min.z +
                thickness
            )
        );
    }

    if (
        side === 'B'
    ) {
        return createBounds(
            point(
                min.x,
                0,
                max.z -
                thickness
            ),

            point(
                max.x,
                height,
                max.z
            )
        );
    }

    if (
        side === 'L'
    ) {
        return createBounds(
            point(
                min.x,
                0,
                min.z
            ),

            point(
                min.x +
                thickness,
                height,
                max.z
            )
        );
    }

    return createBounds(
        point(
            max.x -
            thickness,
            0,
            min.z
        ),

        point(
            max.x,
            height,
            max.z
        )
    );
}

function createSide(
    side,
    width,
    height,
    thickness,
    holes,
    envelope
) {
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

        bounds:
            getSideBounds(
                side,
                envelope,
                height,
                thickness
            )
    });
}

function createCombinedBounds(
    sides
) {
    const values =
        SIDES.map(
            side =>
                sides[side].bounds
        );

    return createBounds(
        point(
            Math.min(
                ...values.map(
                    value =>
                        value.min.x
                )
            ),

            Math.min(
                ...values.map(
                    value =>
                        value.min.y
                )
            ),

            Math.min(
                ...values.map(
                    value =>
                        value.min.z
                )
            )
        ),

        point(
            Math.max(
                ...values.map(
                    value =>
                        value.max.x
                )
            ),

            Math.max(
                ...values.map(
                    value =>
                        value.max.y
                )
            ),

            Math.max(
                ...values.map(
                    value =>
                        value.max.z
                )
            )
        )
    );
}

function getOpeningSide(
    opening
) {
    return (
        opening?.side ??
        opening?.wall ??
        null
    );
}

function getSideHoles(
    side,
    openings,
    width,
    height
) {
    return openings
        .filter(
            opening =>
                opening &&
                getOpeningSide(
                    opening
                ) ===
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
}

export function createLinerGeometry(
    model,
    envelope,
    openings = []
) {
    if (
        !model ||
        typeof model !==
        'object'
    ) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (
        !envelope ||
        typeof envelope !==
        'object'
    ) {
        throw new TypeError(
            'BuildingEnvelope is required'
        );
    }

    const config =
        resolveConfig(
            model
        );

    if (
        !config ||
        !config.enabled
    ) {
        return createDisabledGeometry();
    }

    const buildingHeight =
        resolveBuildingHeight(
            model,
            envelope
        );

    if (
        !Number.isFinite(
            envelope.width
        ) ||
        envelope.width <= 0
    ) {
        throw new RangeError(
            'envelope.width must be greater than zero'
        );
    }

    if (
        !Number.isFinite(
            envelope.length
        ) ||
        envelope.length <= 0
    ) {
        throw new RangeError(
            'envelope.length must be greater than zero'
        );
    }

    if (
        !Number.isFinite(
            buildingHeight
        ) ||
        buildingHeight <= 0
    ) {
        throw new RangeError(
            'envelope.height must be greater than zero'
        );
    }

    const height =
        resolveLinerHeight(
            config,
            buildingHeight
        );

    const thickness =
        resolveThickness(
            config
        );

    const normalizedOpenings =
        Array.isArray(
            openings
        )
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
            getSideHoles(
                side,
                normalizedOpenings,
                width,
                height
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

    return Object.freeze({
        enabled: true,

        height,

        thickness,

        sides:
            Object.freeze(
                sides
            ),

        bounds:
            createCombinedBounds(
                sides
            )
    });
}