const SIDES = Object.freeze({
    FRONT: 'F',
    BACK: 'B',
    LEFT: 'L',
    RIGHT: 'R'
});

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function edge(start, end) {
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

function plane(normal, constant) {
    return Object.freeze({
        normal: point(
            normal.x,
            normal.y,
            normal.z
        ),
        constant
    });
}

function bounds(min, max) {
    return Object.freeze({
        min,
        max,
        width: max.x - min.x,
        height: max.y - min.y,
        length: max.z - min.z
    });
}

function createFrontWall(envelope) {
    const {
        width,
        height
    } = envelope;

    const halfWidth = width / 2;

    const bottomLeft = point(
        -halfWidth,
        0,
        0
    );

    const bottomRight = point(
        halfWidth,
        0,
        0
    );

    const topLeft = point(
        -halfWidth,
        height,
        0
    );

    const topRight = point(
        halfWidth,
        height,
        0
    );

    return {
        side: SIDES.FRONT,

        bounds: bounds(
            bottomLeft,
            topRight
        ),

        corners: Object.freeze({
            bottomLeft,
            bottomRight,
            topLeft,
            topRight
        }),

        edges: Object.freeze({
            bottom: edge(
                bottomLeft,
                bottomRight
            ),
            top: edge(
                topLeft,
                topRight
            ),
            left: edge(
                bottomLeft,
                topLeft
            ),
            right: edge(
                bottomRight,
                topRight
            )
        }),

        plane: plane(
            { x: 0, y: 0, z: 1 },
            0
        )
    };
}

function createBackWall(envelope) {
    const {
        width,
        length,
        height
    } = envelope;

    const halfWidth = width / 2;

    const bottomLeft = point(
        -halfWidth,
        0,
        length
    );

    const bottomRight = point(
        halfWidth,
        0,
        length
    );

    const topLeft = point(
        -halfWidth,
        height,
        length
    );

    const topRight = point(
        halfWidth,
        height,
        length
    );

    return {
        side: SIDES.BACK,

        bounds: bounds(
            bottomLeft,
            topRight
        ),

        corners: Object.freeze({
            bottomLeft,
            bottomRight,
            topLeft,
            topRight
        }),

        edges: Object.freeze({
            bottom: edge(
                bottomRight,
                bottomLeft
            ),
            top: edge(
                topRight,
                topLeft
            ),
            left: edge(
                bottomLeft,
                topLeft
            ),
            right: edge(
                bottomRight,
                topRight
            )
        }),

        plane: plane(
            { x: 0, y: 0, z: -1 },
            length
        )
    };
}

function createLeftWall(envelope) {
    const {
        width,
        length,
        height
    } = envelope;

    const x = -width / 2;

    const frontBottom = point(
        x,
        0,
        0
    );

    const backBottom = point(
        x,
        0,
        length
    );

    const frontTop = point(
        x,
        height,
        0
    );

    const backTop = point(
        x,
        height,
        length
    );

    return {
        side: SIDES.LEFT,

        bounds: bounds(
            point(x, 0, 0),
            point(x, height, length)
        ),

        corners: Object.freeze({
            frontBottom,
            backBottom,
            frontTop,
            backTop
        }),

        edges: Object.freeze({
            bottom: edge(
                frontBottom,
                backBottom
            ),
            top: edge(
                frontTop,
                backTop
            ),
            front: edge(
                frontBottom,
                frontTop
            ),
            back: edge(
                backBottom,
                backTop
            )
        }),

        plane: plane(
            { x: 1, y: 0, z: 0 },
            width / 2
        )
    };
}

function createRightWall(envelope) {
    const {
        width,
        length,
        height
    } = envelope;

    const x = width / 2;

    const frontBottom = point(
        x,
        0,
        0
    );

    const backBottom = point(
        x,
        0,
        length
    );

    const frontTop = point(
        x,
        height,
        0
    );

    const backTop = point(
        x,
        height,
        length
    );

    return {
        side: SIDES.RIGHT,

        bounds: bounds(
            point(x, 0, 0),
            point(x, height, length)
        ),

        corners: Object.freeze({
            frontBottom,
            backBottom,
            frontTop,
            backTop
        }),

        edges: Object.freeze({
            bottom: edge(
                backBottom,
                frontBottom
            ),
            top: edge(
                backTop,
                frontTop
            ),
            front: edge(
                frontBottom,
                frontTop
            ),
            back: edge(
                backBottom,
                backTop
            )
        }),

        plane: plane(
            { x: -1, y: 0, z: 0 },
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

    const walls = {
        front: createFrontWall(envelope),
        back: createBackWall(envelope),
        left: createLeftWall(envelope),
        right: createRightWall(envelope)
    };

    return Object.freeze(walls);
}