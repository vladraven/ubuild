const DEFAULTS = Object.freeze({
    frameSpacing: 6.096,
    girtSpacing: 1.524,
    purlinSpacing: 1.524
});

function point(x, y, z) {
    return Object.freeze({
        x,
        y,
        z
    });
}

function line(start, end) {
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

function createPositions(
    start,
    end,
    spacing
) {
    if (
        !Number.isFinite(spacing) ||
        spacing <= 0
    ) {
        throw new RangeError(
            'Structural spacing must be greater than zero'
        );
    }

    const positions = [start];
    let current = start;

    while (current + spacing < end) {
        current += spacing;
        positions.push(current);
    }

    if (
        Math.abs(
            positions[positions.length - 1] - end
        ) > 1e-9
    ) {
        positions.push(end);
    }

    return positions;
}

function createFrame(
    roof,
    z,
    index
) {
    const leftFront = point(
        roof.eaves.left.front.x,
        roof.eaves.left.front.y,
        z
    );

    const rightFront = point(
        roof.eaves.right.front.x,
        roof.eaves.right.front.y,
        z
    );

    const leftBase = point(
        roof.eaves.left.front.x,
        0,
        z
    );

    const rightBase = point(
        roof.eaves.right.front.x,
        0,
        z
    );

    if (
        roof.type === 'gabled'
    ) {
        const ridge = point(
            roof.ridge.front.x,
            roof.ridge.front.y,
            z
        );

        return Object.freeze({
            index,
            position: z,

            leftColumn: line(
                leftBase,
                leftFront
            ),

            leftRafter: line(
                leftFront,
                ridge
            ),

            rightRafter: line(
                ridge,
                rightFront
            ),

            rightColumn: line(
                rightFront,
                rightBase
            )
        });
    }

    return Object.freeze({
        index,
        position: z,

        leftColumn: line(
            leftBase,
            leftFront
        ),

        rafter: line(
            leftFront,
            rightFront
        ),

        rightColumn: line(
            rightFront,
            rightBase
        )
    });
}

function createGirts(
    walls,
    height,
    spacing
) {
    const levels = createPositions(
        0,
        height,
        spacing
    );

    return levels.map(
        (y, index) => Object.freeze({
            index,
            elevation: y,

            front: line(
                point(
                    walls.front.corners.bottomLeft.x,
                    y,
                    walls.front.corners.bottomLeft.z
                ),
                point(
                    walls.front.corners.bottomRight.x,
                    y,
                    walls.front.corners.bottomRight.z
                )
            ),

            back: line(
                point(
                    walls.back.corners.bottomLeft.x,
                    y,
                    walls.back.corners.bottomLeft.z
                ),
                point(
                    walls.back.corners.bottomRight.x,
                    y,
                    walls.back.corners.bottomRight.z
                )
            ),

            left: line(
                point(
                    walls.left.corners.bottomLeft.x,
                    y,
                    walls.left.corners.bottomLeft.z
                ),
                point(
                    walls.left.corners.topLeft.x,
                    y,
                    walls.left.corners.topLeft.z
                )
            ),

            right: line(
                point(
                    walls.right.corners.bottomRight.x,
                    y,
                    walls.right.corners.bottomRight.z
                ),
                point(
                    walls.right.corners.topRight.x,
                    y,
                    walls.right.corners.topRight.z
                )
            )
        })
    );
}

function createPurlins(
    roof,
    length,
    spacing
) {
    const positions = createPositions(
        0,
        length,
        spacing
    );

    return positions.map(
        (z, index) => {
            if (
                roof.type === 'gabled'
            ) {
                return Object.freeze({
                    index,
                    position: z,

                    planes: {
                        left: line(
                            point(
                                roof.eaves.left.front.x,
                                roof.eaves.left.front.y,
                                z
                            ),
                            point(
                                roof.ridge.front.x,
                                roof.ridge.front.y,
                                z
                            )
                        ),

                        right: line(
                            point(
                                roof.ridge.front.x,
                                roof.ridge.front.y,
                                z
                            ),
                            point(
                                roof.eaves.right.front.x,
                                roof.eaves.right.front.y,
                                z
                            )
                        )
                    }
                });
            }

            return Object.freeze({
                index,
                position: z,

                plane: line(
                    point(
                        roof.eaves.left.front.x,
                        roof.eaves.left.front.y,
                        z
                    ),
                    point(
                        roof.eaves.right.front.x,
                        roof.eaves.right.front.y,
                        z
                    )
                )
            });
        }
    );
}

function createEndWallColumns(
    walls
) {
    return Object.freeze([
        Object.freeze({
            side: 'F',

            left: line(
                walls.front.corners.bottomLeft,
                walls.front.corners.topLeft
            ),

            right: line(
                walls.front.corners.bottomRight,
                walls.front.corners.topRight
            )
        }),

        Object.freeze({
            side: 'B',

            left: line(
                walls.back.corners.bottomLeft,
                walls.back.corners.topLeft
            ),

            right: line(
                walls.back.corners.bottomRight,
                walls.back.corners.topRight
            )
        })
    ]);
}

function calculateBounds(
    structural
) {
    const points = [];

    const collectLine = value => {
        if (!value?.start || !value?.end) {
            return;
        }

        points.push(
            value.start,
            value.end
        );
    };

    for (
        const frame
        of structural.frames
    ) {
        collectLine(frame.leftColumn);
        collectLine(frame.rightColumn);
        collectLine(frame.leftRafter);
        collectLine(frame.rightRafter);
        collectLine(frame.rafter);
    }

    for (
        const level
        of structural.girts
    ) {
        collectLine(level.front);
        collectLine(level.back);
        collectLine(level.left);
        collectLine(level.right);
    }

    for (
        const purlin
        of structural.purlins
    ) {
        if (purlin.planes) {
            collectLine(purlin.planes.left);
            collectLine(purlin.planes.right);
        } else {
            collectLine(purlin.plane);
        }
    }

    for (
        const wall
        of structural.endWallColumns
    ) {
        collectLine(wall.left);
        collectLine(wall.right);
    }

    if (!points.length) {
        return Object.freeze({
            min: point(0, 0, 0),
            max: point(0, 0, 0),
            center: point(0, 0, 0),
            width: 0,
            height: 0,
            length: 0
        });
    }

    const xs = points.map(
        value => value.x
    );

    const ys = points.map(
        value => value.y
    );

    const zs = points.map(
        value => value.z
    );

    const min = point(
        Math.min(...xs),
        Math.min(...ys),
        Math.min(...zs)
    );

    const max = point(
        Math.max(...xs),
        Math.max(...ys),
        Math.max(...zs)
    );

    return Object.freeze({
        min,
        max,

        center: point(
            (min.x + max.x) / 2,
            (min.y + max.y) / 2,
            (min.z + max.z) / 2
        ),

        width: max.x - min.x,
        height: max.y - min.y,
        length: max.z - min.z
    });
}

export function createStructuralGeometry(
    model,
    buildingGeometry,
    options = {}
) {
    if (!model) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (!buildingGeometry) {
        throw new TypeError(
            'BuildingGeometry is required'
        );
    }

    if (!buildingGeometry.walls) {
        throw new TypeError(
            'BuildingGeometry.walls is required'
        );
    }

    if (!buildingGeometry.roof) {
        throw new TypeError(
            'BuildingGeometry.roof is required'
        );
    }

    const frameSpacing =
        options.frameSpacing ??
        DEFAULTS.frameSpacing;

    const girtSpacing =
        options.girtSpacing ??
        DEFAULTS.girtSpacing;

    const purlinSpacing =
        options.purlinSpacing ??
        DEFAULTS.purlinSpacing;

    const roof =
        buildingGeometry.roof;

    const walls =
        buildingGeometry.walls;

    const framePositions =
        createPositions(
            roof.eaves.left.front.z,
            roof.eaves.left.back.z,
            frameSpacing
        );

    const frames =
        framePositions.map(
            (z, index) =>
                createFrame(
                    roof,
                    z,
                    index
                )
        );

    const girts =
        createGirts(
            walls,
            model.dimensions.height,
            girtSpacing
        );

    const purlins =
        createPurlins(
            roof,
            model.dimensions.length,
            purlinSpacing
        );

    const endWallColumns =
        createEndWallColumns(
            walls
        );

    const structural = {
        frames: Object.freeze(
            frames
        ),

        girts: Object.freeze(
            girts
        ),

        purlins: Object.freeze(
            purlins
        ),

        endWallColumns
    };

    return Object.freeze({
        ...structural,
        bounds:
            calculateBounds(
                structural
            )
    });
}