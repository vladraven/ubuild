const ROOF_TYPES = Object.freeze([
    'gabled',
    'left-sloped',
    'right-sloped'
]);

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function edge(start, end) {
    return Object.freeze({
        start,
        end,
        length: Math.hypot(
            end.x - start.x,
            end.y - start.y,
            end.z - start.z
        )
    });
}

function bounds(points) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const zs = points.map(point => point.z);

    return Object.freeze({
        min: point(
            Math.min(...xs),
            Math.min(...ys),
            Math.min(...zs)
        ),
        max: point(
            Math.max(...xs),
            Math.max(...ys),
            Math.max(...zs)
        )
    });
}

function calculateRise(width, pitch) {
    return width * pitch / 2;
}

function createGabledRoof(
    envelope,
    overhangs,
    pitch
) {
    const halfWidth = envelope.width / 2;
    const rise = calculateRise(
        envelope.width,
        pitch
    );

    const leftX =
        -halfWidth - overhangs.left;

    const rightX =
        halfWidth + overhangs.right;

    const frontZ =
        -overhangs.front;

    const backZ =
        envelope.length + overhangs.back;

    const eaveY = envelope.height;

    const ridgeY =
        envelope.height + rise;

    const leftFront = point(
        leftX,
        eaveY,
        frontZ
    );

    const leftBack = point(
        leftX,
        eaveY,
        backZ
    );

    const rightFront = point(
        rightX,
        eaveY,
        frontZ
    );

    const rightBack = point(
        rightX,
        eaveY,
        backZ
    );

    const ridgeFront = point(
        0,
        ridgeY,
        frontZ
    );

    const ridgeBack = point(
        0,
        ridgeY,
        backZ
    );

    return {
        type: 'gabled',

        rise,

        pitch: {
            ratio: pitch,
            angle: Math.atan(pitch)
        },

        eaves: {
            left: {
                front: leftFront,
                back: leftBack,
                edge: edge(
                    leftFront,
                    leftBack
                )
            },

            right: {
                front: rightFront,
                back: rightBack,
                edge: edge(
                    rightFront,
                    rightBack
                )
            }
        },

        ridge: {
            front: ridgeFront,
            back: ridgeBack,
            edge: edge(
                ridgeFront,
                ridgeBack
            )
        },

        edges: {
            front: edge(
                leftFront,
                rightFront
            ),

            back: edge(
                leftBack,
                rightBack
            )
        },

        planes: [
            {
                id: 'left',
                corners: [
                    leftFront,
                    ridgeFront,
                    ridgeBack,
                    leftBack
                ]
            },

            {
                id: 'right',
                corners: [
                    ridgeFront,
                    rightFront,
                    rightBack,
                    ridgeBack
                ]
            }
        ],

        bounds: bounds([
            leftFront,
            leftBack,
            rightFront,
            rightBack,
            ridgeFront,
            ridgeBack
        ])
    };
}

function createSingleSlopeRoof(
    envelope,
    overhangs,
    pitch,
    type
) {
    const halfWidth = envelope.width / 2;

    const rise = calculateRise(
        envelope.width,
        pitch
    );

    const leftX =
        -halfWidth - overhangs.left;

    const rightX =
        halfWidth + overhangs.right;

    const frontZ =
        -overhangs.front;

    const backZ =
        envelope.length + overhangs.back;

    let leftY = envelope.height;
    let rightY =
        envelope.height + rise;

    if (type === 'right-sloped') {
        leftY =
            envelope.height + rise;

        rightY =
            envelope.height;
    }

    const leftFront = point(
        leftX,
        leftY,
        frontZ
    );

    const leftBack = point(
        leftX,
        leftY,
        backZ
    );

    const rightFront = point(
        rightX,
        rightY,
        frontZ
    );

    const rightBack = point(
        rightX,
        rightY,
        backZ
    );

    return {
        type,

        rise,

        pitch: {
            ratio: pitch,
            angle: Math.atan(pitch)
        },

        eaves: {
            left: {
                front: leftFront,
                back: leftBack,
                edge: edge(
                    leftFront,
                    leftBack
                )
            },

            right: {
                front: rightFront,
                back: rightBack,
                edge: edge(
                    rightFront,
                    rightBack
                )
            }
        },

        ridge: null,

        edges: {
            front: edge(
                leftFront,
                rightFront
            ),

            back: edge(
                leftBack,
                rightBack
            )
        },

        planes: [
            {
                id: type,
                corners: [
                    leftFront,
                    rightFront,
                    rightBack,
                    leftBack
                ]
            }
        ],

        bounds: bounds([
            leftFront,
            leftBack,
            rightFront,
            rightBack
        ])
    };
}

export function createRoofGeometry(
    model,
    envelope,
    walls
) {
    if (!model?.roof) {
        throw new TypeError(
            'BuildingModel.roof is required'
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

    const {
        type,
        pitch,
        overhangs
    } = model.roof;

    if (!ROOF_TYPES.includes(type)) {
        throw new RangeError(
            `Unsupported roof type: ${type}`
        );
    }

    if (!Number.isFinite(pitch) || pitch <= 0) {
        throw new RangeError(
            'roof.pitch must be greater than zero'
        );
    }

    if (
        type === 'gabled'
    ) {
        return Object.freeze(
            createGabledRoof(
                envelope,
                overhangs,
                pitch
            )
        );
    }

    return Object.freeze(
        createSingleSlopeRoof(
            envelope,
            overhangs,
            pitch,
            type
        )
    );
}