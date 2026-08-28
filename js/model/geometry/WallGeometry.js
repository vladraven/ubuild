// js/model/geometry/WallGeometry.js

const SIDES = Object.freeze({
    FRONT: 'F',
    BACK: 'B',
    LEFT: 'L',
    RIGHT: 'R'
});

const ROOF_TYPES = Object.freeze([
    'gabled',
    'left-sloped',
    'right-sloped'
]);

const ROOF_SURFACE_CLEARANCE = 0.015;

const ROOF_PANEL_THICKNESS = 0.10;

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

function edge(
    start,
    end
) {
    return Object.freeze({
        start,
        end,

        length:
            Math.sqrt(
                (end.x - start.x) ** 2 +
                (end.y - start.y) ** 2 +
                (end.z - start.z) ** 2
            )
    });
}

function plane(
    normal,
    constant
) {
    return Object.freeze({
        normal:
            point(
                normal.x,
                normal.y,
                normal.z
            ),

        constant
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

function resolveThickness(
    model
) {
    const thickness =
        model.walls?.thickness;

    if (
        !Number.isFinite(
            thickness
        ) ||
        thickness <= 0
    ) {
        throw new RangeError(
            'walls.thickness must be greater than zero'
        );
    }

    return thickness;
}

/*
 * RoofGeometry uses:
 *
 * roofBaseHeight =
 *     envelope.height +
 *     ROOF_SURFACE_CLEARANCE
 *
 * The wall must terminate below the
 * corresponding roof surface rather than
 * continuing through it.
 */
function resolveRoofHeights(
    envelope,
    model
) {
    const baseHeight =
        envelope.height +
        ROOF_SURFACE_CLEARANCE;

    const width =
        envelope.width;

    const halfWidth =
        width / 2;

    const pitchRatio =
        model.roof.pitchRatio;

    const type =
        model.roof.type;

    const overhangs =
        model.roof.overhangs;

    const rise =
        type === 'gabled'
            ? halfWidth *
                pitchRatio
            : width *
                pitchRatio;

    let leftRoofY;
    let rightRoofY;
    let ridgeRoofY = null;

    if (
        type === 'gabled'
    ) {
        leftRoofY =
            baseHeight -
            (
                overhangs.left *
                pitchRatio
            );

        rightRoofY =
            baseHeight -
            (
                overhangs.right *
                pitchRatio
            );

        ridgeRoofY =
            baseHeight +
            rise;
    } else if (
        type === 'left-sloped'
    ) {
        leftRoofY =
            baseHeight +
            rise +
            (
                overhangs.left *
                pitchRatio
            );

        rightRoofY =
            baseHeight -
            (
                overhangs.right *
                pitchRatio
            );
    } else if (
        type === 'right-sloped'
    ) {
        leftRoofY =
            baseHeight -
            (
                overhangs.left *
                pitchRatio
            );

        rightRoofY =
            baseHeight +
            rise +
            (
                overhangs.right *
                pitchRatio
            );
    } else {
        leftRoofY =
            baseHeight;

        rightRoofY =
            baseHeight;
    }

    /*
     * RoofOrchestrator currently creates a
     * 0.10 ft solid roof panel.
     *
     * Put the wall top below the roof outer
     * surface so the wall does not occupy the
     * same visual plane as the roof.
     */
    const wallOffset =
        ROOF_PANEL_THICKNESS;

    return Object.freeze({
        baseHeight,

        leftRoofY,

        rightRoofY,

        ridgeRoofY,

        leftWallY:
            leftRoofY -
            wallOffset,

        rightWallY:
            rightRoofY -
            wallOffset,

        ridgeWallY:
            ridgeRoofY === null
                ? null
                : ridgeRoofY -
                    wallOffset,

        rise
    });
}

function createFrontWall(
    envelope,
    thickness,
    model
) {
    const width =
        envelope.width;

    const halfWidth =
        width / 2;

    const roof =
        resolveRoofHeights(
            envelope,
            model
        );

    const bottomLeft =
        point(
            -halfWidth,
            0,
            0
        );

    const bottomRight =
        point(
            halfWidth,
            0,
            0
        );

    let topLeft;
    let topRight;
    let peakPoint = null;
    let shapePoints = [];

    if (
        model.roof.type ===
        'gabled'
    ) {
        topLeft =
            point(
                -halfWidth,
                roof.leftWallY,
                0
            );

        topRight =
            point(
                halfWidth,
                roof.rightWallY,
                0
            );

        peakPoint =
            point(
                0,
                roof.ridgeWallY,
                0
            );

        shapePoints = [
            {
                x:
                    -halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    roof.rightWallY
            },

            {
                x:
                    0,
                y:
                    roof.ridgeWallY
            },

            {
                x:
                    -halfWidth,
                y:
                    roof.leftWallY
            }
        ];
    } else {
        topLeft =
            point(
                -halfWidth,
                roof.leftWallY,
                0
            );

        topRight =
            point(
                halfWidth,
                roof.rightWallY,
                0
            );

        shapePoints = [
            {
                x:
                    -halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    roof.rightWallY
            },

            {
                x:
                    -halfWidth,
                y:
                    roof.leftWallY
            }
        ];
    }

    const maxHeight =
        peakPoint
            ? peakPoint.y
            : Math.max(
                topLeft.y,
                topRight.y
            );

    return {
        side:
            SIDES.FRONT,

        thickness,

        shapePoints:
            Object.freeze(
                shapePoints
            ),

        bounds:
            bounds(
                point(
                    -halfWidth,
                    0,
                    0
                ),

                point(
                    halfWidth,
                    maxHeight,
                    0
                )
            ),

        corners:
            Object.freeze({
                bottomLeft,
                bottomRight,
                topLeft,
                topRight,
                peak:
                    peakPoint
            }),

        edges:
            Object.freeze({
                bottom:
                    edge(
                        bottomLeft,
                        bottomRight
                    ),

                left:
                    edge(
                        bottomLeft,
                        topLeft
                    ),

                right:
                    edge(
                        bottomRight,
                        topRight
                    ),

                top:
                    edge(
                        topLeft,
                        topRight
                    )
            }),

        plane:
            plane(
                {
                    x: 0,
                    y: 0,
                    z: 1
                },
                0
            )
    };
}

function createBackWall(
    envelope,
    thickness,
    model
) {
    const width =
        envelope.width;

    const length =
        envelope.length;

    const halfWidth =
        width / 2;

    const roof =
        resolveRoofHeights(
            envelope,
            model
        );

    const bottomLeft =
        point(
            -halfWidth,
            0,
            length
        );

    const bottomRight =
        point(
            halfWidth,
            0,
            length
        );

    let topLeft;
    let topRight;
    let peakPoint = null;
    let shapePoints = [];

    if (
        model.roof.type ===
        'gabled'
    ) {
        topLeft =
            point(
                -halfWidth,
                roof.leftWallY,
                length
            );

        topRight =
            point(
                halfWidth,
                roof.rightWallY,
                length
            );

        peakPoint =
            point(
                0,
                roof.ridgeWallY,
                length
            );

        shapePoints = [
            {
                x:
                    -halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    roof.rightWallY
            },

            {
                x:
                    0,
                y:
                    roof.ridgeWallY
            },

            {
                x:
                    -halfWidth,
                y:
                    roof.leftWallY
            }
        ];
    } else {
        topLeft =
            point(
                -halfWidth,
                roof.leftWallY,
                length
            );

        topRight =
            point(
                halfWidth,
                roof.rightWallY,
                length
            );

        shapePoints = [
            {
                x:
                    -halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    0
            },

            {
                x:
                    halfWidth,
                y:
                    roof.rightWallY
            },

            {
                x:
                    -halfWidth,
                y:
                    roof.leftWallY
            }
        ];
    }

    const maxHeight =
        peakPoint
            ? peakPoint.y
            : Math.max(
                topLeft.y,
                topRight.y
            );

    return {
        side:
            SIDES.BACK,

        thickness,

        shapePoints:
            Object.freeze(
                shapePoints
            ),

        bounds:
            bounds(
                point(
                    -halfWidth,
                    0,
                    length
                ),

                point(
                    halfWidth,
                    maxHeight,
                    length
                )
            ),

        corners:
            Object.freeze({
                bottomLeft,
                bottomRight,
                topLeft,
                topRight,
                peak:
                    peakPoint
            }),

        edges:
            Object.freeze({
                bottom:
                    edge(
                        bottomRight,
                        bottomLeft
                    ),

                left:
                    edge(
                        bottomLeft,
                        topLeft
                    ),

                right:
                    edge(
                        bottomRight,
                        topRight
                    ),

                top:
                    edge(
                        topRight,
                        topLeft
                    )
            }),

        plane:
            plane(
                {
                    x: 0,
                    y: 0,
                    z: -1
                },
                length
            )
    };
}

function createLeftWall(
    envelope,
    thickness,
    model
) {
    const width =
        envelope.width;

    const length =
        envelope.length;

    const roof =
        resolveRoofHeights(
            envelope,
            model
        );

    const x =
        -width / 2;

    const wallHeight =
        roof.leftWallY;

    const frontBottom =
        point(
            x,
            0,
            0
        );

    const backBottom =
        point(
            x,
            0,
            length
        );

    const frontTop =
        point(
            x,
            wallHeight,
            0
        );

    const backTop =
        point(
            x,
            wallHeight,
            length
        );

    const shapePoints = [
        {
            x:
                0,
            y:
                0
        },

        {
            x:
                length,
            y:
                0
        },

        {
            x:
                length,
            y:
                wallHeight
        },

        {
            x:
                0,
            y:
                wallHeight
        }
    ];

    return {
        side:
            SIDES.LEFT,

        thickness,

        shapePoints:
            Object.freeze(
                shapePoints
            ),

        bounds:
            bounds(
                point(
                    x,
                    0,
                    0
                ),

                point(
                    x,
                    wallHeight,
                    length
                )
            ),

        corners:
            Object.freeze({
                frontBottom,
                backBottom,
                frontTop,
                backTop
            }),

        edges:
            Object.freeze({
                bottom:
                    edge(
                        frontBottom,
                        backBottom
                    ),

                top:
                    edge(
                        frontTop,
                        backTop
                    ),

                front:
                    edge(
                        frontBottom,
                        frontTop
                    ),

                back:
                    edge(
                        backBottom,
                        backTop
                    )
            }),

        plane:
            plane(
                {
                    x: 1,
                    y: 0,
                    z: 0
                },
                width / 2
            )
    };
}

function createRightWall(
    envelope,
    thickness,
    model
) {
    const width =
        envelope.width;

    const length =
        envelope.length;

    const roof =
        resolveRoofHeights(
            envelope,
            model
        );

    const x =
        width / 2;

    const wallHeight =
        roof.rightWallY;

    const frontBottom =
        point(
            x,
            0,
            0
        );

    const backBottom =
        point(
            x,
            0,
            length
        );

    const frontTop =
        point(
            x,
            wallHeight,
            0
        );

    const backTop =
        point(
            x,
            wallHeight,
            length
        );

    const shapePoints = [
        {
            x:
                0,
            y:
                0
        },

        {
            x:
                length,
            y:
                0
        },

        {
            x:
                length,
            y:
                wallHeight
        },

        {
            x:
                0,
            y:
                wallHeight
        }
    ];

    return {
        side:
            SIDES.RIGHT,

        thickness,

        shapePoints:
            Object.freeze(
                shapePoints
            ),

        bounds:
            bounds(
                point(
                    x,
                    0,
                    0
                ),

                point(
                    x,
                    wallHeight,
                    length
                )
            ),

        corners:
            Object.freeze({
                frontBottom,
                backBottom,
                frontTop,
                backTop
            }),

        edges:
            Object.freeze({
                bottom:
                    edge(
                        backBottom,
                        frontBottom
                    ),

                top:
                    edge(
                        backTop,
                        frontTop
                    ),

                front:
                    edge(
                        frontBottom,
                        frontTop
                    ),

                back:
                    edge(
                        backBottom,
                        backTop
                    )
            }),

        plane:
            plane(
                {
                    x: -1,
                    y: 0,
                    z: 0
                },
                width / 2
            )
    };
}

export function createWallGeometry(
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

    if (
        !model.roof ||
        !ROOF_TYPES.includes(
            model.roof.type
        )
    ) {
        throw new RangeError(
            `Unsupported roof type: ${model.roof?.type}`
        );
    }

    const thickness =
        resolveThickness(
            model
        );

    const walls = {
        front:
            createFrontWall(
                envelope,
                thickness,
                model
            ),

        back:
            createBackWall(
                envelope,
                thickness,
                model
            ),

        left:
            createLeftWall(
                envelope,
                thickness,
                model
            ),

        right:
            createRightWall(
                envelope,
                thickness,
                model
            )
    };

    return Object.freeze(
        walls
    );
}