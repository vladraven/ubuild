function point(x, y, z) {
    return Object.freeze({
        x,
        y,
        z
    });
}

function segment(start, end) {
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

export function createTrimsGeometry(
    model,
    envelope,
    roof
) {
    if (!model || !envelope || !roof) {
        throw new TypeError(
            'BuildingModel, BuildingEnvelope, and RoofGeometry are required'
        );
    }

    if (
        model.visibility?.trims === false
    ) {
        return Object.freeze({
            enabled: false,
            eaves: Object.freeze([]),
            rake: Object.freeze([]),
            ridge: Object.freeze([]),
            corners: Object.freeze([]),
            roofEdges: Object.freeze([])
        });
    }

    const overhangs =
        model.roof.overhangs;

    const isGabled =
        model.roof.type === 'gabled';

    const isLeftSloped =
        model.roof.type === 'left-sloped';

    const isRightSloped =
        model.roof.type === 'right-sloped';

    const halfWidth =
        envelope.width / 2;

    const length =
        envelope.length;

    const height =
        envelope.height;

    const rise =
        roof.rise;

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

    /*
     * IMPORTANT:
     *
     * These heights must describe the same roof
     * plane as RoofGeometry.
     *
     * left-sloped:
     *     LEFT  = HIGH
     *     RIGHT = LOW
     *
     * right-sloped:
     *     LEFT  = LOW
     *     RIGHT = HIGH
     *
     * gabled:
     *     both eaves are at wall height.
     */

    const leftY =
        isLeftSloped
            ? height + rise
            : height;

    const rightY =
        isRightSloped
            ? height + rise
            : height;

    const ridgeY =
        height + rise;

    /*
     * EAVE TRIMS
     */

    const eaves = [
        Object.freeze({
            id: 'eave-left',
            side: 'L',

            start: point(
                leftX,
                leftY,
                frontZ
            ),

            end: point(
                leftX,
                leftY,
                backZ
            ),

            edge: segment(
                point(
                    leftX,
                    leftY,
                    frontZ
                ),

                point(
                    leftX,
                    leftY,
                    backZ
                )
            )
        }),

        Object.freeze({
            id: 'eave-right',
            side: 'R',

            start: point(
                rightX,
                rightY,
                frontZ
            ),

            end: point(
                rightX,
                rightY,
                backZ
            ),

            edge: segment(
                point(
                    rightX,
                    rightY,
                    frontZ
                ),

                point(
                    rightX,
                    rightY,
                    backZ
                )
            )
        })
    ];

    /*
     * RAKE TRIMS
     */

    const rake = [];

    if (isGabled) {
        const frontLeft =
            point(
                leftX,
                height,
                frontZ
            );

        const frontRidge =
            point(
                0,
                ridgeY,
                frontZ
            );

        const frontRight =
            point(
                rightX,
                height,
                frontZ
            );

        const backLeft =
            point(
                leftX,
                height,
                backZ
            );

        const backRidge =
            point(
                0,
                ridgeY,
                backZ
            );

        const backRight =
            point(
                rightX,
                height,
                backZ
            );

        rake.push(
            Object.freeze({
                id: 'rake-front-left',
                side: 'F',
                slope: 'left',

                start: frontLeft,
                end: frontRidge,

                edge: segment(
                    frontLeft,
                    frontRidge
                )
            }),

            Object.freeze({
                id: 'rake-front-right',
                side: 'F',
                slope: 'right',

                start: frontRidge,
                end: frontRight,

                edge: segment(
                    frontRidge,
                    frontRight
                )
            }),

            Object.freeze({
                id: 'rake-back-left',
                side: 'B',
                slope: 'left',

                start: backLeft,
                end: backRidge,

                edge: segment(
                    backLeft,
                    backRidge
                )
            }),

            Object.freeze({
                id: 'rake-back-right',
                side: 'B',
                slope: 'right',

                start: backRidge,
                end: backRight,

                edge: segment(
                    backRidge,
                    backRight
                )
            })
        );
    } else {
        rake.push(
            Object.freeze({
                id: 'rake-front',
                side: 'F',

                start: point(
                    leftX,
                    leftY,
                    frontZ
                ),

                end: point(
                    rightX,
                    rightY,
                    frontZ
                ),

                edge: segment(
                    point(
                        leftX,
                        leftY,
                        frontZ
                    ),

                    point(
                        rightX,
                        rightY,
                        frontZ
                    )
                )
            }),

            Object.freeze({
                id: 'rake-back',
                side: 'B',

                start: point(
                    leftX,
                    leftY,
                    backZ
                ),

                end: point(
                    rightX,
                    rightY,
                    backZ
                ),

                edge: segment(
                    point(
                        leftX,
                        leftY,
                        backZ
                    ),

                    point(
                        rightX,
                        rightY,
                        backZ
                    )
                )
            })
        );
    }

    /*
     * RIDGE TRIM
     */

    const ridge = [];

    if (
        isGabled &&
        roof.ridge
    ) {
        ridge.push(
            Object.freeze({
                id: 'ridge-trim',
                side: 'center',

                start:
                    roof.ridge.front,

                end:
                    roof.ridge.back,

                edge:
                    roof.ridge.edge,

                profile:
                    Object.freeze({
                        halfWidth:
                            Math.max(
                                0.12,
                                Math.min(
                                    0.22,
                                    envelope.width * 0.015
                                )
                            ),

                        pitchRatio:
                            model.roof.pitchRatio
                    })
            })
        );
    }

    /*
     * CORNER TRIMS
     */

    const corners = [
        Object.freeze({
            id: 'corner-FL',
            sx: -1,
            sz: -1,

            edge: segment(
                point(
                    -halfWidth,
                    0,
                    0
                ),

                point(
                    -halfWidth,
                    leftY,
                    0
                )
            )
        }),

        Object.freeze({
            id: 'corner-FR',
            sx: 1,
            sz: -1,

            edge: segment(
                point(
                    halfWidth,
                    0,
                    0
                ),

                point(
                    halfWidth,
                    rightY,
                    0
                )
            )
        }),

        Object.freeze({
            id: 'corner-BL',
            sx: -1,
            sz: 1,

            edge: segment(
                point(
                    -halfWidth,
                    0,
                    length
                ),

                point(
                    -halfWidth,
                    leftY,
                    length
                )
            )
        }),

        Object.freeze({
            id: 'corner-BR',
            sx: 1,
            sz: 1,

            edge: segment(
                point(
                    halfWidth,
                    0,
                    length
                ),

                point(
                    halfWidth,
                    rightY,
                    length
                )
            )
        })
    ];

    /*
     * ROOF END EDGES
     */

    const roofEdges = [
        segment(
            point(
                leftX,
                leftY,
                frontZ
            ),

            point(
                rightX,
                rightY,
                frontZ
            )
        ),

        segment(
            point(
                leftX,
                leftY,
                backZ
            ),

            point(
                rightX,
                rightY,
                backZ
            )
        )
    ];

    return Object.freeze({
        enabled: true,

        eaves:
            Object.freeze(
                eaves
            ),

        rake:
            Object.freeze(
                rake
            ),

        ridge:
            Object.freeze(
                ridge
            ),

        corners:
            Object.freeze(
                corners
            ),

        roofEdges:
            Object.freeze(
                roofEdges
            )
    });
}