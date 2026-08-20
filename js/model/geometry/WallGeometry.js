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

function assertFinite(
    value,
    name
) {
    if (!Number.isFinite(value)) {
        throw new TypeError(
            `${name} must be a finite number`
        );
    }
}

function assertPositive(
    value,
    name
) {
    assertFinite(
        value,
        name
    );

    if (value <= 0) {
        throw new RangeError(
            `${name} must be greater than zero`
        );
    }
}

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

        length: Math.sqrt(
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
        normal: point(
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

function resolveThickness(
    model
) {
    const thickness =
        model.walls?.thickness;

    assertPositive(
        thickness,
        'walls.thickness'
    );

    return thickness;
}

function resolveRoofHeights(
    model,
    envelope
) {
    const type =
        model.roof?.type;

    if (
        !ROOF_TYPES.includes(type)
    ) {
        throw new RangeError(
            `Unsupported roof type: ${type}`
        );
    }

    const baseHeight =
        envelope.height;

    const pitchRatio =
        model.roof?.pitchRatio;

    assertFinite(
        pitchRatio,
        'roof.pitchRatio'
    );

    if (pitchRatio <= 0) {
        throw new RangeError(
            'roof.pitchRatio must be greater than zero'
        );
    }

    const rise =
        envelope.width *
        pitchRatio;

    if (type === 'left-sloped') {
        return Object.freeze({
            front: baseHeight + rise,
            back: baseHeight + rise,
            left: baseHeight + rise,
            right: baseHeight
        });
    }

    if (type === 'right-sloped') {
        return Object.freeze({
            front: baseHeight + rise,
            back: baseHeight + rise,
            left: baseHeight,
            right: baseHeight + rise
        });
    }

    return Object.freeze({
        front:
            baseHeight,

        back:
            baseHeight,

        left:
            baseHeight,

        right:
            baseHeight
    });
}

function createFrontWall(
    envelope,
    thickness,
    heights
) {
    const {
        width
    } = envelope;

    const halfWidth =
        width / 2;

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

    const topLeft =
        point(
            -halfWidth,
            heights.left,
            0
        );

    const topRight =
        point(
            halfWidth,
            heights.right,
            0
        );

    return {
        side:
            SIDES.FRONT,

        thickness,

        height: Object.freeze({
            left:
                heights.left,

            right:
                heights.right
        }),

        bounds:
            bounds(
                point(
                    -halfWidth,
                    0,
                    0
                ),
                point(
                    halfWidth,
                    Math.max(
                        heights.left,
                        heights.right
                    ),
                    0
                )
            ),

        corners:
            Object.freeze({
                bottomLeft,
                bottomRight,
                topLeft,
                topRight
            }),

        edges:
            Object.freeze({
                bottom:
                    edge(
                        bottomLeft,
                        bottomRight
                    ),

                top:
                    edge(
                        topLeft,
                        topRight
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
    heights
) {
    const {
        width,
        length
    } = envelope;

    const halfWidth =
        width / 2;

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

    const topLeft =
        point(
            -halfWidth,
            heights.left,
            length
        );

    const topRight =
        point(
            halfWidth,
            heights.right,
            length
        );

    return {
        side:
            SIDES.BACK,

        thickness,

        height: Object.freeze({
            left:
                heights.left,

            right:
                heights.right
        }),

        bounds:
            bounds(
                point(
                    -halfWidth,
                    0,
                    length
                ),
                point(
                    halfWidth,
                    Math.max(
                        heights.left,
                        heights.right
                    ),
                    length
                )
            ),

        corners:
            Object.freeze({
                bottomLeft,
                bottomRight,
                topLeft,
                topRight
            }),

        edges:
            Object.freeze({
                bottom:
                    edge(
                        bottomRight,
                        bottomLeft
                    ),

                top:
                    edge(
                        topRight,
                        topLeft
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
    heights
) {
    const {
        width,
        length
    } = envelope;

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
            heights.front,
            0
        );

    const backTop =
        point(
            x,
            heights.back,
            length
        );

    return {
        side:
            SIDES.LEFT,

        thickness,

        height: Object.freeze({
            front:
                heights.front,

            back:
                heights.back
        }),

        bounds:
            bounds(
                point(
                    x,
                    0,
                    0
                ),
                point(
                    x,
                    Math.max(
                        heights.front,
                        heights.back
                    ),
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
    heights
) {
    const {
        width,
        length
    } = envelope;

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
            heights.front,
            0
        );

    const backTop =
        point(
            x,
            heights.back,
            length
        );

    return {
        side:
            SIDES.RIGHT,

        thickness,

        height: Object.freeze({
            front:
                heights.front,

            back:
                heights.back
        }),

        bounds:
            bounds(
                point(
                    x,
                    0,
                    0
                ),
                point(
                    x,
                    Math.max(
                        heights.front,
                        heights.back
                    ),
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

    const heights =
        resolveRoofHeights(
            model,
            envelope
        );

    const walls = {
        front:
            createFrontWall(
                envelope,
                thickness,
                heights
            ),

        back:
            createBackWall(
                envelope,
                thickness,
                heights
            ),

        left:
            createLeftWall(
                envelope,
                thickness,
                heights
            ),

        right:
            createRightWall(
                envelope,
                thickness,
                heights
            )
    };

    return Object.freeze({
        ...walls,

        thickness,

        heights
    });
}