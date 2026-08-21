const ROOF_TYPES = Object.freeze([
    'gabled',
    'left-sloped',
    'right-sloped'
]);

const ROOF_SURFACE_CLEARANCE = 0.015;

function assertFinite(
    value,
    name
) {
    if (
        !Number.isFinite(value)
    ) {
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

    if (
        value <= 0
    ) {
        throw new RangeError(
            `${name} must be greater than zero`
        );
    }
}

function assertNonNegative(
    value,
    name
) {
    assertFinite(
        value,
        name
    );

    if (
        value < 0
    ) {
        throw new RangeError(
            `${name} must be non-negative`
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
            value => value.x
        );

    const ys =
        points.map(
            value => value.y
        );

    const zs =
        points.map(
            value => value.z
        );

    const min =
        point(
            Math.min(...xs),
            Math.min(...ys),
            Math.min(...zs)
        );

    const max =
        point(
            Math.max(...xs),
            Math.max(...ys),
            Math.max(...zs)
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
            max.x -
            min.x,

        height:
            max.y -
            min.y,

        length:
            max.z -
            min.z
    });
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
            id: 'front-left',
            side: 'front',
            slope: 'left',
            edge:
                edge(
                    leftFront,
                    ridgeFront
                )
        }),

        Object.freeze({
            id: 'front-right',
            side: 'front',
            slope: 'right',
            edge:
                edge(
                    ridgeFront,
                    rightFront
                )
        }),

        Object.freeze({
            id: 'back-left',
            side: 'back',
            slope: 'left',
            edge:
                edge(
                    leftBack,
                    ridgeBack
                )
        }),

        Object.freeze({
            id: 'back-right',
            side: 'back',
            slope: 'right',
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
            id: 'front',
            side: 'front',
            slope: null,
            edge:
                edge(
                    leftFront,
                    rightFront
                )
        }),

        Object.freeze({
            id: 'back',
            side: 'back',
            slope: null,
            edge:
                edge(
                    leftBack,
                    rightBack
                )
        })
    ]);
}

function calculateGabledRise(
    width,
    pitchRatio
) {
    return (
        width /
        2
    ) * pitchRatio;
}

function calculateSingleSlopeRise(
    width,
    pitchRatio
) {
    return (
        width *
        pitchRatio
    );
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

    const pitchAngle =
        Math.atan(
            pitchRatio
        );

    const rise =
        type === 'gabled'
            ? calculateGabledRise(
                width,
                pitchRatio
            )
            : calculateSingleSlopeRise(
                width,
                pitchRatio
            );

    const frontZ =
        -overhangs.front;

    const backZ =
        length +
        overhangs.back;

    /*
     * The roof surface must sit slightly above
     * the wall top. Otherwise the two surfaces
     * occupy the same mathematical plane and
     * produce z-fighting.
     */

    const roofBaseHeight =
        height +
        ROOF_SURFACE_CLEARANCE;

    let leftY;
    let rightY;

    if (
        type === 'gabled'
    ) {
        leftY =
            roofBaseHeight -
            (
                overhangs.left *
                pitchRatio
            );

        rightY =
            roofBaseHeight -
            (
                overhangs.right *
                pitchRatio
            );
    } else if (
        type === 'left-sloped'
    ) {
        leftY =
            roofBaseHeight -
            (
                overhangs.left *
                pitchRatio
            );

        rightY =
            roofBaseHeight +
            rise +
            (
                overhangs.right *
                pitchRatio
            );
    } else {
        leftY =
            roofBaseHeight +
            rise +
            (
                overhangs.left *
                pitchRatio
            );

        rightY =
            roofBaseHeight -
            (
                overhangs.right *
                pitchRatio
            );
    }

    const leftX =
        -halfWidth -
        overhangs.left;

    const rightX =
        halfWidth +
        overhangs.right;

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
                roofBaseHeight +
                    rise,
                frontZ
            )
            : null;

    const ridgeBack =
        type === 'gabled'
            ? point(
                0,
                roofBaseHeight +
                    rise,
                backZ
            )
            : null;

    const planes =
        type === 'gabled'
            ? [
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
            ]
            : [
                {
                    id: type,

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

        pitchAngle,

        rise,

        surfaceClearance:
            ROOF_SURFACE_CLEARANCE,

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

    for (
        const side
        of [
            'front',
            'back',
            'left',
            'right'
        ]
    ) {
        assertNonNegative(
            overhangs[side],
            `roof.overhangs.${side}`
        );
    }

    assertPositive(
        model.dimensions.width,
        'dimensions.width'
    );

    assertPositive(
        model.dimensions.length,
        'dimensions.length'
    );

    assertPositive(
        model.dimensions.height,
        'dimensions.height'
    );

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