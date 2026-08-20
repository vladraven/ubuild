const DEFAULTS = Object.freeze({
    frameSpacing: 6.096,
    girtSpacing: 1.524,
    purlinSpacing: 1.524
});
function point(x, y, z) {
    return Object.freeze({ x, y, z });
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
function createPositions(start, end, spacing) {
    if (!Number.isFinite(spacing) || spacing <= 0) {
        throw new RangeError('Structural spacing must be greater than zero');
    }
    if (end < start) {
        throw new RangeError('Structural interval end must not precede start');
    }
    const positions = [start];
    let current = start;
    while (current + spacing < end) {
        current += spacing;
        positions.push(current);
    }
    if (Math.abs(positions[positions.length - 1] - end) > 1e-9) {
        positions.push(end);
    }
    return positions;
}
function createFrame(roof, z, index) {
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
    if (roof.type === 'gabled' && roof.ridge) {
        const ridge = point(
            roof.ridge.front.x,
            roof.ridge.front.y,
            z
        );
        return Object.freeze({
            index,
            position: z,
            leftColumn: line(leftBase, leftFront),
            leftRafter: line(leftFront, ridge),
            rightRafter: line(ridge, rightFront),
            rightColumn: line(rightFront, rightBase)
        });
    }
    return Object.freeze({
        index,
        position: z,
        leftColumn: line(leftBase, leftFront),
        rafter: line(leftFront, rightFront),
        rightColumn: line(rightFront, rightBase)
    });
}
function resolveOpeningInterval(opening) {
    const center = opening.x ?? opening.position ?? 0;
    const width = opening.dimensions?.width ?? opening.width ?? 0;
    if (!Number.isFinite(center) || !Number.isFinite(width) || width <= 0) {
        return null;
    }
    return Object.freeze({
        min: center - width / 2,
        max: center + width / 2
    });
}
function splitSpan(start, end, y, openings, side) {
    if (end <= start) {
        return [];
    }
    const cuts = openings
        .filter(opening => opening.side === side)
        .filter(opening =>
            Number.isFinite(opening.bounds?.min?.y) &&
            Number.isFinite(opening.bounds?.max?.y) &&
            y >= opening.bounds.min.y &&
            y <= opening.bounds.max.y
        )
        .map(resolveOpeningInterval)
        .filter(Boolean)
        .map(cut => ({
            min: Math.max(start, cut.min),
            max: Math.min(end, cut.max)
        }))
        .filter(cut => cut.max > cut.min)
        .sort((a, b) => a.min - b.min);
    if (cuts.length === 0) {
        return [
            Object.freeze({
                start,
                end
            })
        ];
    }
    const merged = [];
    for (const cut of cuts) {
        const previous = merged[merged.length - 1];
        if (!previous || cut.min > previous.max) {
            merged.push({
                min: cut.min,
                max: cut.max
            });
            continue;
        }
        previous.max = Math.max(previous.max, cut.max);
    }
    const result = [];
    let current = start;
    for (const cut of merged) {
        if (cut.min > current) {
            result.push(
                Object.freeze({
                    start: current,
                    end: cut.min
                })
            );
        }
        current = Math.max(current, cut.max);
        if (current >= end) {
            break;
        }
    }
    if (current < end) {
        result.push(
            Object.freeze({
                start: current,
                end
            })
        );
    }
    return result;
}
function createSideSegments(side, y, envelope, openings) {
    const halfWidth = envelope.width / 2;
    const length = envelope.length;
    if (side === 'F') {
        return splitSpan(
            -halfWidth,
            halfWidth,
            y,
            openings,
            'F'
        ).map(span =>
            line(
                point(span.start, y, 0),
                point(span.end, y, 0)
            )
        );
    }
    if (side === 'B') {
        return splitSpan(
            -halfWidth,
            halfWidth,
            y,
            openings,
            'B'
        ).map(span =>
            line(
                point(span.start, y, length),
                point(span.end, y, length)
            )
        );
    }
    if (side === 'L') {
        return splitSpan(
            0,
            length,
            y,
            openings,
            'L'
        ).map(span =>
            line(
                point(-halfWidth, y, span.start),
                point(-halfWidth, y, span.end)
            )
        );
    }
    return splitSpan(
        0,
        length,
        y,
        openings,
        'R'
    ).map(span =>
        line(
            point(halfWidth, y, span.start),
            point(halfWidth, y, span.end)
        )
    );
}
function createGirts(walls, spacing, openings, envelope) {
    const frontHeight = Math.max(
        walls.front.height?.left ?? 0,
        walls.front.height?.right ?? 0,
        walls.front.height?.ridge ?? 0
    );
    const backHeight = Math.max(
        walls.back.height?.left ?? 0,
        walls.back.height?.right ?? 0,
        walls.back.height?.ridge ?? 0
    );
    const leftHeight = Math.max(
        walls.left.height?.front ?? 0,
        walls.left.height?.back ?? 0
    );
    const rightHeight = Math.max(
        walls.right.height?.front ?? 0,
        walls.right.height?.back ?? 0
    );
    const maxHeight = Math.max(
        frontHeight,
        backHeight,
        leftHeight,
        rightHeight
    );
    return Object.freeze(
        createPositions(0, maxHeight, spacing).map(
            (y, index) =>
                Object.freeze({
                    index,
                    elevation: y,
                    frontSegments: Object.freeze(
                        y <= frontHeight + 1e-9
                            ? createSideSegments(
                                'F',
                                y,
                                envelope,
                                openings
                            )
                            : []
                    ),
                    backSegments: Object.freeze(
                        y <= backHeight + 1e-9
                            ? createSideSegments(
                                'B',
                                y,
                                envelope,
                                openings
                            )
                            : []
                    ),
                    leftSegments: Object.freeze(
                        y <= leftHeight + 1e-9
                            ? createSideSegments(
                                'L',
                                y,
                                envelope,
                                openings
                            )
                            : []
                    ),
                    rightSegments: Object.freeze(
                        y <= rightHeight + 1e-9
                            ? createSideSegments(
                                'R',
                                y,
                                envelope,
                                openings
                            )
                            : []
                    )
                })
        )
    );
}
function interpolate(a, b, t) {
    return point(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t
    );
}
function createPurlinPlane(corners, t) {
    const start = interpolate(
        corners[0],
        corners[1],
        t
    );
    const end = interpolate(
        corners[3],
        corners[2],
        t
    );
    return line(start, end);
}
function createPurlins(roof, spacing) {
    const length = roof.bounds.length;
    const minZ = roof.bounds.min.z;
    const positions = createPositions(
        minZ,
        roof.bounds.max.z,
        spacing
    );
    return Object.freeze(
        positions.map((z, index) => {
            const t = length <= 1e-9
                ? 0
                : (z - minZ) / length;
            if (
                roof.type === 'gabled' &&
                roof.planes.length === 2
            ) {
                return Object.freeze({
                    index,
                    position: z,
                    planes: Object.freeze({
                        left: createPurlinPlane(
                            roof.planes[0].corners,
                            t
                        ),
                        right: createPurlinPlane(
                            roof.planes[1].corners,
                            t
                        )
                    })
                });
            }
            return Object.freeze({
                index,
                position: z,
                plane: createPurlinPlane(
                    roof.planes[0].corners,
                    t
                )
            });
        })
    );
}
function createEndWallColumns(walls) {
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
    const roof = buildingGeometry.roof;
    const walls = buildingGeometry.walls;
    const openings = buildingGeometry.openings ?? [];
    const envelope = buildingGeometry.envelope;
    const frameSpacing =
        options.frameSpacing ??
        DEFAULTS.frameSpacing;
    const girtSpacing =
        options.girtSpacing ??
        DEFAULTS.girtSpacing;
    const purlinSpacing =
        options.purlinSpacing ??
        DEFAULTS.purlinSpacing;
    const framePositions = createPositions(
        roof.bounds.min.z,
        roof.bounds.max.z,
        frameSpacing
    );
    const frames = framePositions.map(
        (z, index) =>
            createFrame(
                roof,
                z,
                index
            )
    );
    const girts = createGirts(
        walls,
        girtSpacing,
        openings,
        envelope
    );
    const purlins = createPurlins(
        roof,
        purlinSpacing
    );
    const endWallColumns =
        createEndWallColumns(
            walls
        );
    return Object.freeze({
        frames: Object.freeze(frames),
        girts,
        purlins,
        endWallColumns
    });
}