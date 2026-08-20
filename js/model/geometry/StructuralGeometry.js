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
    model,
    roof,
    z,
    index
) {
    const halfWidth =
        model.dimensions.width / 2;

    const baseY = 0;
    const eaveY =
        model.dimensions.height;

    if (roof.type === 'gabled') {
        const leftBottom = point(
            -halfWidth,
            baseY,
            z
        );

        const leftTop = point(
            -halfWidth,
            eaveY,
            z
        );

        const ridge = point(
            0,
            eaveY + roof.rise,
            z
        );

        const rightTop = point(
            halfWidth,
            eaveY,
            z
        );

        const rightBottom = point(
            halfWidth,
            baseY,
            z
        );

        return Object.freeze({
            index,
            position: z,

            leftColumn: line(
                leftBottom,
                leftTop
            ),

            leftRafter: line(
                leftTop,
                ridge
            ),

            rightRafter: line(
                ridge,
                rightTop
            ),

            rightColumn: line(
                rightTop,
                rightBottom
            )
        });
    }

    const leftY =
        roof.type === 'right-sloped'
            ? eaveY + roof.rise
            : eaveY;

    const rightY =
        roof.type === 'left-sloped'
            ? eaveY + roof.rise
            : eaveY;

    const leftBottom = point(
        -halfWidth,
        baseY,
        z
    );

    const leftTop = point(
        -halfWidth,
        leftY,
        z
    );

    const rightTop = point(
        halfWidth,
        rightY,
        z
    );

    const rightBottom = point(
        halfWidth,
        baseY,
        z
    );

    return Object.freeze({
        index,
        position: z,

        leftColumn: line(
            leftBottom,
            leftTop
        ),

        rafter: line(
            leftTop,
            rightTop
        ),

        rightColumn: line(
            rightTop,
            rightBottom
        )
    });
}

function createGirts(
    model,
    walls,
    spacing
) {
    const levels = createPositions(
        0,
        model.dimensions.height,
        spacing
    );

    return levels.map(
        (y, index) => ({
            index,
            elevation: y,

            front: line(
                point(
                    walls.front.bounds.min.x,
                    y,
                    walls.front.bounds.min.z
                ),
                point(
                    walls.front.bounds.max.x,
                    y,
                    walls.front.bounds.max.z
                )
            ),

            back: line(
                point(
                    walls.back.bounds.min.x,
                    y,
                    walls.back.bounds.min.z
                ),
                point(
                    walls.back.bounds.max.x,
                    y,
                    walls.back.bounds.max.z
                )
            ),

            left: line(
                point(
                    walls.left.bounds.min.x,
                    y,
                    walls.left.bounds.min.z
                ),
                point(
                    walls.left.bounds.max.x,
                    y,
                    walls.left.bounds.max.z
                )
            ),

            right: line(
                point(
                    walls.right.bounds.min.x,
                    y,
                    walls.right.bounds.min.z
                ),
                point(
                    walls.right.bounds.max.x,
                    y,
                    walls.right.bounds.max.z
                )
            )
        })
    );
}

function createPurlins(
    model,
    roof,
    spacing
) {
    const positions = createPositions(
        0,
        model.dimensions.length,
        spacing
    );

    return positions.map(
        (z, index) => {
            if (roof.type === 'gabled') {
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
            model.dimensions.length,
            frameSpacing
        );

    const frames =
        framePositions.map(
            (z, index) =>
                createFrame(
                    model,
                    buildingGeometry.roof,
                    z,
                    index
                )
        );

    const girts =
        createGirts(
            model,
            buildingGeometry.walls,
            girtSpacing
        );

    const purlins =
        createPurlins(
            model,
            buildingGeometry.roof,
            purlinSpacing
        );

    const endWallColumns =
        createEndWallColumns(
            buildingGeometry.walls
        );

    return Object.freeze({
        frames: Object.freeze(frames),
        girts: Object.freeze(girts),
        purlins: Object.freeze(purlins),
        endWallColumns
    });
}