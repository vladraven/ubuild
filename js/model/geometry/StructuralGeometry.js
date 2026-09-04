const DEFAULTS = Object.freeze({
    frameSpacing: 6.096,
    girtSpacing: 1.524,
    purlinSpacing: 1.524
});

const FRAME_BEAM = 0.18;
const GIRT_BEAM = 0.08;
const PURLIN_BEAM = 0.08;
const END_COLUMN_BEAM = 0.14;
const CLEARANCE = 0.002;
const GABLE_SLOPE_TOLERANCE = 1e-9;
const ROOF_THICKNESS = 0.10;
const GIRT_ROOF_CLEARANCE = 0.002;
const PURLIN_END_CLEARANCE = 0.12;
const PURLIN_ROOF_CLEARANCE = 0.035;

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

function line(
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

function createPositions(
    start,
    end,
    spacing
) {
    if (
        !Number.isFinite(
            spacing
        ) ||
        spacing <= 0
    ) {
        throw new RangeError(
            'Structural spacing must be greater than zero'
        );
    }

    if (
        end < start
    ) {
        throw new RangeError(
            'Structural interval end must not precede start'
        );
    }

    const positions = [
        start
    ];

    let current =
        start;

    while (
        current + spacing < end
    ) {
        current += spacing;

        positions.push(
            current
        );
    }

    if (
        Math.abs(
            positions[
                positions.length - 1
            ] - end
        ) >
        GABLE_SLOPE_TOLERANCE
    ) {
        positions.push(
            end
        );
    }

    return positions;
}

function clamp(
    value,
    min,
    max
) {
    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}

function interpolateYAtX(
    x,
    start,
    end
) {
    const span =
        end.x -
        start.x;

    if (
        Math.abs(
            span
        ) <=
        GABLE_SLOPE_TOLERANCE
    ) {
        throw new RangeError(
            'Roof interpolation span must be greater than zero'
        );
    }

    const fraction =
        clamp(
            (
                x -
                start.x
            ) /
            span,
            0,
            1
        );

    return (
        start.y +
        (
            end.y -
            start.y
        ) *
        fraction
    );
}

function getRoofHeightAtX(
    x,
    roof
) {
    const left =
        roof.eaves?.left?.front;

    const right =
        roof.eaves?.right?.front;

    if (
        !left ||
        !right
    ) {
        throw new Error(
            'Roof eave geometry is required'
        );
    }

    if (
        roof.type ===
        'gabled'
    ) {
        const ridge =
            roof.ridge?.front;

        if (!ridge) {
            throw new Error(
                'Gabled roof ridge geometry is required'
            );
        }

        if (
            x <=
            ridge.x
        ) {
            return interpolateYAtX(
                x,
                left,
                ridge
            );
        }

        return interpolateYAtX(
            x,
            ridge,
            right
        );
    }

    return interpolateYAtX(
        x,
        left,
        right
    );
}

function createFrame(
    envelope,
    roof,
    z,
    index,
    wallThickness
) {
    const halfWidth =
        envelope.width / 2;

    const wallOffset =
        wallThickness / 2 +
        FRAME_BEAM / 2 +
        CLEARANCE;

    const leftX =
        -halfWidth +
        wallOffset;

    const rightX =
        halfWidth -
        wallOffset;

    const leftBase =
        point(
            leftX,
            0,
            z
        );

    const rightBase =
        point(
            rightX,
            0,
            z
        );

	const leftRoofHeight =
		getRoofHeightAtX(
			leftX,
			roof
		) -
		ROOF_THICKNESS;

	const rightRoofHeight =
		getRoofHeightAtX(
			rightX,
			roof
		) -
    ROOF_THICKNESS;

    const leftTop =
        point(
            leftX,
            leftRoofHeight,
            z
        );

    const rightTop =
        point(
            rightX,
            rightRoofHeight,
            z
        );

    if (
        roof.type ===
        'gabled'
    ) {
        const ridgeHeight =
            getRoofHeightAtX(
                0,
                roof
            );

        const ridge =
            point(
                0,
                ridgeHeight,
                z
            );

        return Object.freeze({
            index,
            position: z,

            leftColumn:
                line(
                    leftBase,
                    leftTop
                ),

            leftRafter:
                line(
                    leftTop,
                    ridge
                ),

            rightRafter:
                line(
                    ridge,
                    rightTop
                ),

            rightColumn:
                line(
                    rightTop,
                    rightBase
                )
        });
    }

    return Object.freeze({
        index,
        position: z,

        leftColumn:
            line(
                leftBase,
                leftTop
            ),

        rafter:
            line(
                leftTop,
                rightTop
            ),

        rightColumn:
            line(
                rightTop,
                rightBase
            )
    });
}

function resolveOpeningInterval(
    opening
) {
    const center =
        opening.x ??
        0;

    const width =
        opening.dimensions?.width ??
        opening.width ??
        0;

    if (
        !Number.isFinite(
            center
        ) ||
        !Number.isFinite(
            width
        ) ||
        width <= 0
    ) {
        return null;
    }

    return Object.freeze({
        min:
            center -
            width / 2,

        max:
            center +
            width / 2
    });
}

function splitSpan(
    start,
    end,
    y,
    openings,
    side
) {
    if (
        end <= start
    ) {
        return [];
    }

    const cuts =
        openings
            .filter(
                opening =>
                    opening.side ===
                    side
            )
            .filter(
                opening =>
                    Number.isFinite(
                        opening.bounds?.min?.y
                    ) &&
                    Number.isFinite(
                        opening.bounds?.max?.y
                    ) &&
                    y >=
                        opening.bounds.min.y &&
                    y <=
                        opening.bounds.max.y
            )
            .map(
                resolveOpeningInterval
            )
            .filter(Boolean)
            .map(
                cut => ({
                    min:
                        Math.max(
                            start,
                            cut.min
                        ),

                    max:
                        Math.min(
                            end,
                            cut.max
                        )
                })
            )
            .filter(
                cut =>
                    cut.max >
                    cut.min
            )
            .sort(
                (a, b) =>
                    a.min -
                    b.min
            );

    if (
        cuts.length === 0
    ) {
        return [
            Object.freeze({
                start,
                end
            })
        ];
    }

    const merged = [];

    for (
        const cut
        of cuts
    ) {
        const previous =
            merged[
                merged.length - 1
            ];

        if (
            !previous ||
            cut.min >
                previous.max
        ) {
            merged.push({
                min:
                    cut.min,

                max:
                    cut.max
            });
        } else {
            previous.max =
                Math.max(
                    previous.max,
                    cut.max
                );
        }
    }

    const result = [];

    let current =
        start;

    for (
        const cut
        of merged
    ) {
        if (
            cut.min >
            current
        ) {
            result.push(
                Object.freeze({
                    start:
                        current,

                    end:
                        cut.min
                })
            );
        }

        current =
            Math.max(
                current,
                cut.max
            );

        if (
            current >= end
        ) {
            break;
        }
    }

    if (
        current < end
    ) {
        result.push(
            Object.freeze({
                start:
                    current,

                end
            })
        );
    }

    return result;
}

function createSideSegments(
    side,
    y,
    envelope,
    roof,
    openings,
    wallThickness
) {
    const halfWidth =
        envelope.width / 2;

    const length =
        envelope.length;

    const wallOffset =
        wallThickness / 2 +
        GIRT_BEAM / 2 +
        CLEARANCE;

    const halfSpan =
        halfWidth -
        wallOffset;

    const zFront =
        wallThickness / 2 +
        GIRT_BEAM / 2 +
        CLEARANCE;

    const zBack =
        length -
        wallThickness / 2 -
        GIRT_BEAM / 2 -
        CLEARANCE;

    const xLeft =
        -halfWidth +
        wallThickness / 2 +
        GIRT_BEAM / 2 +
        CLEARANCE;

    const xRight =
        halfWidth -
        wallThickness / 2 -
        GIRT_BEAM / 2 -
        CLEARANCE;

    const currentHalfW =
        getGableHalfWidthAtHeight(
            y,
            envelope,
            roof
        );

    if (
        side === 'F'
    ) {
        const span =
            Math.min(
                currentHalfW,
                halfSpan
            );

        return splitSpan(
            -span,
            span,
            y,
            openings,
            'F'
        ).map(
            item =>
                line(
                    point(
                        item.start,
                        y,
                        zFront
                    ),
                    point(
                        item.end,
                        y,
                        zFront
                    )
                )
        );
    }

    if (
        side === 'B'
    ) {
        const span =
            Math.min(
                currentHalfW,
                halfSpan
            );

        return splitSpan(
            -span,
            span,
            y,
            openings,
            'B'
        ).map(
            item =>
                line(
                    point(
                        item.start,
                        y,
                        zBack
                    ),
                    point(
                        item.end,
                        y,
                        zBack
                    )
                )
        );
    }

    if (
        side === 'L'
    ) {
        return splitSpan(
            wallOffset,
            length -
                wallOffset,
            y,
            openings,
            'L'
        ).map(
            item =>
                line(
                    point(
                        xLeft,
                        y,
                        item.start
                    ),
                    point(
                        xLeft,
                        y,
                        item.end
                    )
                )
        );
    }

    return splitSpan(
        wallOffset,
        length -
            wallOffset,
        y,
        openings,
        'R'
    ).map(
        item =>
            line(
                point(
                    xRight,
                    y,
                    item.start
                ),
                point(
                    xRight,
                    y,
                    item.end
                )
            )
    );
}

function getGableHalfWidthAtHeight(
    y,
    envelope,
    roof
) {
    const halfWidth =
        envelope.width / 2;

    if (
        roof.type !==
        'gabled'
    ) {
        return halfWidth;
    }

    const left =
        roof.eaves?.left?.front;

    const right =
        roof.eaves?.right?.front;

    const ridge =
        roof.ridge?.front;

    if (
        !left ||
        !right ||
        !ridge
    ) {
        throw new Error(
            'Gabled roof geometry is required'
        );
    }

    const baseHeight =
        Math.max(
            left.y,
            right.y
        );

    if (
        y <=
        baseHeight
    ) {
        return halfWidth;
    }

    const roofHeight =
        ridge.y -
        baseHeight;

    if (
        roofHeight <=
        GABLE_SLOPE_TOLERANCE
    ) {
        return halfWidth;
    }

    const fraction =
        clamp(
            (
                y -
                baseHeight
            ) /
            roofHeight,
            0,
            1
        );

    return Math.max(
        0,
        halfWidth *
            (
                1 -
                fraction
            )
    );
}

function createGirts(
    spacing,
    openings,
    envelope,
    roof,
    wallThickness
) {
    const baseHeight =
        envelope.height;

    const halfWidth =
        envelope.width / 2;

    const girtHalfHeight =
        GIRT_BEAM / 2;

    function maxGirtCenterHeightAtX(
        x
    ) {
        const roofTop =
            getRoofHeightAtX(
                x,
                roof
            );

        const roofBottom =
            roofTop -
            ROOF_THICKNESS;

        return (
            roofBottom -
            girtHalfHeight -
            GIRT_ROOF_CLEARANCE
        );
    }

    function canPlaceGirtAtY(
        y,
        x
    ) {
        return (
            y <=
            maxGirtCenterHeightAtX(
                x
            )
        );
    }

    const elevations =
        createPositions(
            spacing,
            baseHeight,
            spacing
        );

    return Object.freeze(
        elevations.map(
            (
                y,
                index
            ) => {
                const frontSegments =
                    canPlaceGirtAtY(
                        y,
                        -halfWidth
                    )
                        ? createSideSegments(
                            'F',
                            y,
                            envelope,
                            roof,
                            openings,
                            wallThickness
                        )
                        : [];

                const backSegments =
                    canPlaceGirtAtY(
                        y,
                        -halfWidth
                    )
                        ? createSideSegments(
                            'B',
                            y,
                            envelope,
                            roof,
                            openings,
                            wallThickness
                        )
                        : [];

                const leftSegments =
                    canPlaceGirtAtY(
                        y,
                        -halfWidth
                    )
                        ? createSideSegments(
                            'L',
                            y,
                            envelope,
                            roof,
                            openings,
                            wallThickness
                        )
                        : [];

                const rightSegments =
                    canPlaceGirtAtY(
                        y,
                        halfWidth
                    )
                        ? createSideSegments(
                            'R',
                            y,
                            envelope,
                            roof,
                            openings,
                            wallThickness
                        )
                        : [];

                return Object.freeze({
                    index,

                    elevation:
                        y,

                    frontSegments:
                        Object.freeze(
                            frontSegments
                        ),

                    backSegments:
                        Object.freeze(
                            backSegments
                        ),

                    leftSegments:
                        Object.freeze(
                            leftSegments
                        ),

                    rightSegments:
                        Object.freeze(
                            rightSegments
                        )
                });
            }
        )
    );
}

function createPurlins(
    envelope,
    roof,
    spacing
) {
    const halfWidth =
        envelope.width / 2;

    const length =
        envelope.length;

    const result = [];

    const startZ =
        PURLIN_END_CLEARANCE;

    const endZ =
        length -
        PURLIN_END_CLEARANCE;

    if (
        endZ <=
        startZ
    ) {
        return Object.freeze(
            result
        );
    }

    const underRoof =
        PURLIN_BEAM / 2 +
        PURLIN_ROOF_CLEARANCE;

    if (
        roof.type ===
        'gabled'
    ) {
        const ridge =
            roof.ridge?.front;

        const left =
            roof.eaves?.left?.front;

        const right =
            roof.eaves?.right?.front;

        if (
            !left ||
            !right ||
            !ridge
        ) {
            throw new Error(
                'Gabled roof geometry is required'
            );
        }

        const leftSlopeLength =
            Math.hypot(
                ridge.x -
                    left.x,
                ridge.y -
                    left.y
            );

        const rightSlopeLength =
            Math.hypot(
                right.x -
                    ridge.x,
                right.y -
                    ridge.y
            );

        const count =
            Math.max(
                2,
                Math.round(
                    Math.max(
                        leftSlopeLength,
                        rightSlopeLength
                    ) /
                    spacing
                ) + 1
            );

        for (
            let i = 1;
            i < count;
            i++
        ) {
            const t =
                i /
                count;

            const xLeft =
                left.x +
                (
                    ridge.x -
                    left.x
                ) *
                t;

            const xRight =
                right.x +
                (
                    ridge.x -
                    right.x
                ) *
                t;

            const leftY =
                getRoofHeightAtX(
                    xLeft,
                    roof
                ) -
                underRoof;

            const rightY =
                getRoofHeightAtX(
                    xRight,
                    roof
                ) -
                underRoof;

            result.push(
                Object.freeze({
                    index:
                        result.length,

                    planes:
                        Object.freeze({
                            left:
                                line(
                                    point(
                                        xLeft,
                                        leftY,
                                        startZ
                                    ),
                                    point(
                                        xLeft,
                                        leftY,
                                        endZ
                                    )
                                ),

                            right:
                                line(
                                    point(
                                        xRight,
                                        rightY,
                                        startZ
                                    ),
                                    point(
                                        xRight,
                                        rightY,
                                        endZ
                                    )
                                )
                        })
                })
            );
        }

        return Object.freeze(
            result
        );
    }

    const left =
        roof.eaves?.left?.front;

    const right =
        roof.eaves?.right?.front;

    if (
        !left ||
        !right
    ) {
        throw new Error(
            'Mono-slope roof geometry is required'
        );
    }

    const slopeLength =
        Math.hypot(
            right.x -
                left.x,
            right.y -
                left.y
        );

    const count =
        Math.max(
            2,
            Math.round(
                slopeLength /
                spacing
            ) + 1
        );

    for (
        let i = 1;
        i < count;
        i++
    ) {
        const t =
            i /
            count;

        const x =
            left.x +
            (
                right.x -
                left.x
            ) *
            t;

        const roofY =
            getRoofHeightAtX(
                x,
                roof
            );

        const y =
            roofY -
            underRoof;

        result.push(
            Object.freeze({
                index:
                    result.length,

                plane:
                    line(
                        point(
                            x,
                            y,
                            startZ
                        ),
                        point(
                            x,
                            y,
                            endZ
                        )
                    )
            })
        );
    }

    return Object.freeze(
        result
    );
}

function createEndWallColumns(
    envelope,
    roof,
    wallThickness
) {
    const halfWidth =
        envelope.width / 2;

    const length =
        envelope.length;

    const quarterWidth =
        halfWidth / 2;

    const wallOffset =
        wallThickness / 2 +
        END_COLUMN_BEAM / 2 +
        CLEARANCE;

    const frontZ =
        wallOffset;

    const backZ =
        length -
        wallOffset;

    const leftTopHeight =
        getRoofHeightAtX(
            -quarterWidth,
            roof
        );

    const rightTopHeight =
        getRoofHeightAtX(
            quarterWidth,
            roof
        );

    return Object.freeze([
        Object.freeze({
            side: 'F',

            left:
                line(
                    point(
                        -quarterWidth,
                        0,
                        frontZ
                    ),
                    point(
                        -quarterWidth,
                        leftTopHeight,
                        frontZ
                    )
                ),

            right:
                line(
                    point(
                        quarterWidth,
                        0,
                        frontZ
                    ),
                    point(
                        quarterWidth,
                        rightTopHeight,
                        frontZ
                    )
                )
        }),

        Object.freeze({
            side: 'B',

            left:
                line(
                    point(
                        -quarterWidth,
                        0,
                        backZ
                    ),
                    point(
                        -quarterWidth,
                        leftTopHeight,
                        backZ
                    )
                ),

            right:
                line(
                    point(
                        quarterWidth,
                        0,
                        backZ
                    ),
                    point(
                        quarterWidth,
                        rightTopHeight,
                        backZ
                    )
                )
        })
    ]);
}

export function createStructuralGeometry(
    model,
    buildingGeometry,
    options = {}
) {
    if (
        !model ||
        !buildingGeometry?.walls ||
        !buildingGeometry?.roof ||
        !buildingGeometry?.envelope
    ) {
        throw new TypeError(
            'BuildingModel, envelope, walls, and roof geometry are required'
        );
    }

    const roof =
        buildingGeometry.roof;

    const walls =
        buildingGeometry.walls;

    const openings =
        buildingGeometry.openings ??
        [];

    const envelope =
        buildingGeometry.envelope;

    const wallThickness =
        model.walls?.thickness ??
        walls.front?.thickness ??
        0.1;

    const frameSpacing =
        options.frameSpacing ??
        DEFAULTS.frameSpacing;

    const girtSpacing =
        options.girtSpacing ??
        DEFAULTS.girtSpacing;

    const purlinSpacing =
        options.purlinSpacing ??
        DEFAULTS.purlinSpacing;

    const framePositions =
        createPositions(
            0,
            envelope.length,
            frameSpacing
        );

    const frames =
        framePositions.map(
            (
                z,
                index
            ) =>
                createFrame(
                    envelope,
                    roof,
                    z,
                    index,
                    wallThickness
                )
        );

    const girts =
        createGirts(
            girtSpacing,
            openings,
            envelope,
            roof,
            wallThickness
        );

    const purlins =
        createPurlins(
            envelope,
            roof,
            purlinSpacing
        );

    const endWallColumns =
        createEndWallColumns(
            envelope,
            roof,
            wallThickness
        );

    return Object.freeze({
        frames:
            Object.freeze(
                frames
            ),

        girts,

        purlins,

        endWallColumns
    });
}