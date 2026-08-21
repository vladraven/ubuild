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

function resolveWallTopHeight(
    envelope
) {
    return (
        envelope.height +
        ROOF_SURFACE_CLEARANCE
    );
}

function createFrontWall(
    envelope,
    thickness,
    model
) {
    const width =
        envelope.width;

    const baseHeight =
        resolveWallTopHeight(
            envelope
        );

    const halfWidth =
        width / 2;

    const isGabled =
        model.roof.type ===
        'gabled';

    const isLeftSloped =
        model.roof.type ===
        'left-sloped';

    const isRightSloped =
        model.roof.type ===
        'right-sloped';

    const run =
        isGabled
            ? halfWidth
            : width;

    const rise =
        run *
        model.roof.pitchRatio;

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
        isGabled
    ) {
        topLeft =
            point(
                -halfWidth,
                baseHeight,
                0
            );

        topRight =
            point(
                halfWidth,
                baseHeight,
                0
            );

        peakPoint =
            point(
                0,
                baseHeight +
                    rise,
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
                    baseHeight
            },

            {
                x:
                    0,
                y:
                    baseHeight +
                    rise
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight
            }
        ];
    } else if (
        isLeftSloped
    ) {
        topLeft =
            point(
                -halfWidth,
                baseHeight +
                    rise,
                0
            );

        topRight =
            point(
                halfWidth,
                baseHeight,
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
                    baseHeight
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight +
                    rise
            }
        ];
    } else if (
        isRightSloped
    ) {
        topLeft =
            point(
                -halfWidth,
                baseHeight,
                0
            );

        topRight =
            point(
                halfWidth,
                baseHeight +
                    rise,
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
                    baseHeight +
                    rise
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight
            }
        ];
    } else {
        topLeft =
            point(
                -halfWidth,
                baseHeight,
                0
            );

        topRight =
            point(
                halfWidth,
                baseHeight,
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
                    baseHeight
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight
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

    const baseHeight =
        resolveWallTopHeight(
            envelope
        );

    const halfWidth =
        width / 2;

    const isGabled =
        model.roof.type ===
        'gabled';

    const isLeftSloped =
        model.roof.type ===
        'left-sloped';

    const isRightSloped =
        model.roof.type ===
        'right-sloped';

    const run =
        isGabled
            ? halfWidth
            : width;

    const rise =
        run *
        model.roof.pitchRatio;

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
        isGabled
    ) {
        topLeft =
            point(
                -halfWidth,
                baseHeight,
                length
            );

        topRight =
            point(
                halfWidth,
                baseHeight,
                length
            );

        peakPoint =
            point(
                0,
                baseHeight +
                    rise,
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
                    baseHeight
            },

            {
                x:
                    0,
                y:
                    baseHeight +
                    rise
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight
            }
        ];
    } else if (
        isLeftSloped
    ) {
        topLeft =
            point(
                -halfWidth,
                baseHeight +
                    rise,
                length
            );

        topRight =
            point(
                halfWidth,
                baseHeight,
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
                    baseHeight
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight +
                    rise
            }
        ];
    } else if (
        isRightSloped
    ) {
        topLeft =
            point(
                -halfWidth,
                baseHeight,
                length
            );

        topRight =
            point(
                halfWidth,
                baseHeight +
                    rise,
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
                    baseHeight +
                    rise
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight
            }
        ];
    } else {
        topLeft =
            point(
                -halfWidth,
                baseHeight,
                length
            );

        topRight =
            point(
                halfWidth,
                baseHeight,
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
                    baseHeight
            },

            {
                x:
                    -halfWidth,
                y:
                    baseHeight
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

    const baseHeight =
        resolveWallTopHeight(
            envelope
        );

    const isLeftSloped =
        model.roof.type ===
        'left-sloped';

    const rise =
        width *
        model.roof.pitchRatio;

    const wallHeight =
        isLeftSloped
            ? baseHeight +
                rise
            : baseHeight;

    const x =
        -width / 2;

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
            x: 0,
            y: 0
        },

        {
            x: length,
            y: 0
        },

        {
            x: length,
            y: wallHeight
        },

        {
            x: 0,
            y: wallHeight
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

    const baseHeight =
        resolveWallTopHeight(
            envelope
        );

    const isRightSloped =
        model.roof.type ===
        'right-sloped';

    const rise =
        width *
        model.roof.pitchRatio;

    const wallHeight =
        isRightSloped
            ? baseHeight +
                rise
            : baseHeight;

    const x =
        width / 2;

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
            x: 0,
            y: 0
        },

        {
            x: length,
            y: 0
        },

        {
            x: length,
            y: wallHeight
        },

        {
            x: 0,
            y: wallHeight
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