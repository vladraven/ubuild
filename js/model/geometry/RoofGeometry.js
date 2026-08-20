const ROOF_TYPES = Object.freeze([
    'gabled',
    'left-sloped',
    'right-sloped'
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

function edge(
    start,
    end
) {
    return Object.freeze({
        start,
        end,

        length:
            Math.hypot(
                end.x - start.x,
                end.y - start.y,
                end.z - start.z
            )
    });
}

function bounds(
    points
) {
    const xs =
        points.map(
            value =>
                value.x
        );

    const ys =
        points.map(
            value =>
                value.y
        );

    const zs =
        points.map(
            value =>
                value.z
        );

    const min =
        point(
            Math.min(
                ...xs
            ),
            Math.min(
                ...ys
            ),
            Math.min(
                ...zs
            )
        );

    const max =
        point(
            Math.max(
                ...xs
            ),
            Math.max(
                ...ys
            ),
            Math.max(
                ...zs
            )
        );

    return Object.freeze({
        min,
        max,

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
            ),

        width:
            max.x - min.x,

        height:
            max.y - min.y,

        length:
            max.z - min.z
    });
}

function calculateRise(
    width,
    pitchRatio
) {
    return (
        width *
        pitchRatio
    );
}

function createGabledRakes(
    leftFront,
    ridgeFront,
    rightFront,
    leftBack,
    ridgeBack,
    rightBack
) {
    return Object.freeze([
        Object.freeze({
            id:
                'front-left',

            side:
                'front',

            slope:
                'left',

            edge:
                edge(
                    leftFront,
                    ridgeFront
                )
        }),

        Object.freeze({
            id:
                'front-right',

            side:
                'front',

            slope:
                'right',

            edge:
                edge(
                    ridgeFront,
                    rightFront
                )
        }),

        Object.freeze({
            id:
                'back-left',

            side:
                'back',

            slope:
                'left',

            edge:
                edge(
                    leftBack,
                    ridgeBack
                )
        }),

        Object.freeze({
            id:
                'back-right',

            side:
                'back',

            slope:
                'right',

            edge:
                edge(
                    ridgeBack,
                    rightBack
                )
        })
    ]);
}

function createMonoSlopeRakes(
    leftFront,
    rightFront,
    leftBack,
    rightBack
) {
    return Object.freeze([
        Object.freeze({
            id:
                'front',

            side:
                'front',

            slope:
                null,

            edge:
                edge(
                    leftFront,
                    rightFront
                )
        }),

        Object.freeze({
            id:
                'back',

            side:
                'back',

            slope:
                null,

            edge:
                edge(
                    leftBack,
                    rightBack
                )
        })
    ]);
}

function createRoof(
    model,
    envelope
) {
    const {
        type,
        pitchRatio,
        overhangs
    } = model.roof;

    const width =
        envelope.width;

    const length =
        envelope.length;

    const height =
        envelope.height;

    const halfWidth =
        width / 2;

    const leftX =
        -halfWidth -
        overhangs.left;

    const rightX =
        halfWidth +
        overhangs.right;

    const frontZ =
        -overhangs.front;

    const backZ =
        length +
        overhangs.back;

    const rise =
        calculateRise(
            width,
            pitchRatio
        );

    const leftY =
        type === 'right-sloped'
            ? height + rise
            : height;

    const rightY =
        type === 'left-sloped'
            ? height + rise
            : height;

    const leftFront =
        point(
            leftX,
            leftY,
            frontZ
        );

    const leftBack =
        point(
            leftX,
            leftY,
            backZ
        );

    const rightFront =
        point(
            rightX,
            rightY,
            frontZ
        );

    const rightBack =
        point(
            rightX,
            rightY,
            backZ
        );

    const ridgeFront =
        type === 'gabled'
            ? point(
                0,
                height + rise,
                frontZ
            )
            : null;

    const ridgeBack =
        type === 'gabled'
            ? point(
                0,
                height + rise,
                backZ
            )
            : null;

    const planes =
        type === 'gabled'
            ? [
                {
                    id:
                        'left',

                    corners: [
                        leftFront,
                        ridgeFront,
                        ridgeBack,
                        leftBack
                    ]
                },

                {
                    id:
                        'right',

                    corners: [
                        ridgeFront,
                        rightFront,
                        rightBack,
                        ridgeBack
                    ]
                }
            ]
            : [
                {
                    id:
                        type,

                    corners: [
                        leftFront,
                        rightFront,
                        rightBack,
                        leftBack
                    ]
                }
            ];

    const frontEdge =
        edge(
            leftFront,
            rightFront
        );

    const backEdge =
        edge(
            leftBack,
            rightBack
        );

    const leftEave =
        edge(
            leftFront,
            leftBack
        );

    const rightEave =
        edge(
            rightFront,
            rightBack
        );

    const rake =
        type === 'gabled'
            ? createGabledRakes(
                leftFront,
                ridgeFront,
                rightFront,
                leftBack,
                ridgeBack,
                rightBack
            )
            : createMonoSlopeRakes(
                leftFront,
                rightFront,
                leftBack,
                rightBack
            );

    const points = [
        leftFront,
        leftBack,
        rightFront,
        rightBack
    ];

    if (
        ridgeFront
    ) {
        points.push(
            ridgeFront,
            ridgeBack
        );
    }

    return {
        type,

        pitchRatio,

        pitchAngle:
            Math.atan(
                pitchRatio
            ),

        rise,

        overhangs:
            Object.freeze({
                front:
                    overhangs.front,

                back:
                    overhangs.back,

                left:
                    overhangs.left,

                right:
                    overhangs.right
            }),

        eaves:
            Object.freeze({
                left:
                    Object.freeze({
                        front:
                            leftFront,

                        back:
                            leftBack,

                        edge:
                            leftEave
                    }),

                right:
                    Object.freeze({
                        front:
                            rightFront,

                        back:
                            rightBack,

                        edge:
                            rightEave
                    })
            }),

        ridge:
            ridgeFront
                ? Object.freeze({
                    front:
                        ridgeFront,

                    back:
                        ridgeBack,

                    edge:
                        edge(
                            ridgeFront,
                            ridgeBack
                        )
                })
                : null,

        edges:
            Object.freeze({
                front:
                    frontEdge,

                back:
                    backEdge,

                left:
                    leftEave,

                right:
                    rightEave
            }),

        rake,

        planes:
            Object.freeze(
                planes.map(
                    plane =>
                        Object.freeze({
                            id:
                                plane.id,

                            corners:
                                Object.freeze([
                                    ...plane.corners
                                ])
                        })
                )
            ),

        bounds:
            bounds(
                points
            )
    };
}

export function createRoofGeometry(
    model,
    envelope,
    walls
) {
    if (
        !model?.roof
    ) {
        throw new TypeError(
            'BuildingModel.roof is required'
        );
    }

    if (
        !envelope
    ) {
        throw new TypeError(
            'BuildingEnvelope is required'
        );
    }

    if (
        !walls
    ) {
        throw new TypeError(
            'WallGeometry is required'
        );
    }

    const {
        type,
        pitchRatio,
        overhangs
    } = model.roof;

    if (
        !ROOF_TYPES.includes(
            type
        )
    ) {
        throw new RangeError(
            `Unsupported roof type: ${type}`
        );
    }

    if (
        !Number.isFinite(
            pitchRatio
        ) ||
        pitchRatio <= 0
    ) {
        throw new RangeError(
            'roof.pitchRatio must be greater than zero'
        );
    }

    if (
        !overhangs ||
        typeof overhangs !==
            'object'
    ) {
        throw new TypeError(
            'roof.overhangs is required'
        );
    }

    const requiredOverhangs = [
        'front',
        'back',
        'left',
        'right'
    ];

    for (
        const side
        of requiredOverhangs
    ) {
        if (
            !Number.isFinite(
                overhangs[side]
            ) ||
            overhangs[side] < 0
        ) {
            throw new RangeError(
                `roof.overhangs.${side} must be a non-negative number`
            );
        }
    }

    return Object.freeze(
        createRoof(
            model,
            envelope
        )
    );
}

export {
    ROOF_TYPES
};