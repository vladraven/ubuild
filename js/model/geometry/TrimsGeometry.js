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
    if (
        !model ||
        !envelope ||
        !roof
    ) {
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

    const halfWidth =
        envelope.width / 2;

    const length =
        envelope.length;

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

    // RoofGeometry owns the roof plane.
    const leftY =
        roof.eaves.left.front.y;

    const rightY =
        roof.eaves.right.front.y;

    const ridgeY =
        roof.ridge?.front.y;

    /* EAVE TRIMS */

    const eaves = [
        Object.freeze({
            id: 'eave-left',
            side: 'L',

            start:
                roof.eaves.left.front,

            end:
                roof.eaves.left.back,

            edge:
                roof.eaves.left.edge
        }),

        Object.freeze({
            id: 'eave-right',
            side: 'R',

            start:
                roof.eaves.right.front,

            end:
                roof.eaves.right.back,

            edge:
                roof.eaves.right.edge
        })
    ];

    /* RAKE TRIMS */

    const rake = [];

    if (
        isGabled
    ) {
        const frontLeft =
            roof.eaves.left.front;

        const frontRidge =
            roof.ridge.front;

        const frontRight =
            roof.eaves.right.front;

        const backLeft =
            roof.eaves.left.back;

        const backRidge =
            roof.ridge.back;

        const backRight =
            roof.eaves.right.back;

        rake.push(
            Object.freeze({
                id: 'rake-front-left',
                side: 'F',
                slope: 'left',

                start:
                    frontLeft,

                end:
                    frontRidge,

                edge:
                    segment(
                        frontLeft,
                        frontRidge
                    )
            }),

            Object.freeze({
                id: 'rake-front-right',
                side: 'F',
                slope: 'right',

                start:
                    frontRidge,

                end:
                    frontRight,

                edge:
                    segment(
                        frontRidge,
                        frontRight
                    )
            }),

            Object.freeze({
                id: 'rake-back-left',
                side: 'B',
                slope: 'left',

                start:
                    backLeft,

                end:
                    backRidge,

                edge:
                    segment(
                        backLeft,
                        backRidge
                    )
            }),

            Object.freeze({
                id: 'rake-back-right',
                side: 'B',
                slope: 'right',

                start:
                    backRidge,

                end:
                    backRight,

                edge:
                    segment(
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

                start:
                    roof.eaves.left.front,

                end:
                    roof.eaves.right.front,

                edge:
                    segment(
                        roof.eaves.left.front,
                        roof.eaves.right.front
                    )
            }),

            Object.freeze({
                id: 'rake-back',
                side: 'B',

                start:
                    roof.eaves.left.back,

                end:
                    roof.eaves.right.back,

                edge:
                    segment(
                        roof.eaves.left.back,
                        roof.eaves.right.back
                    )
            })
        );
    }

    /* RIDGE TRIM */

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

    /* CORNER TRIMS */

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

    /* ROOF END EDGES */

    const roofEdges = [
        segment(
            roof.eaves.left.front,
            roof.eaves.right.front
        ),

        segment(
            roof.eaves.left.back,
            roof.eaves.right.back
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