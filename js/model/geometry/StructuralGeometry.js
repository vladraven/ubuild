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
        length: Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z)
    });
}
function createPositions(start, end, spacing) {
    if (!Number.isFinite(spacing) || spacing <= 0)
        throw new RangeError('Structural spacing must be greater than zero');
    if (end < start)
        throw new RangeError('Structural interval end must not precede start');
    const positions = [start];
    let current = start;
    while (current + spacing < end) {
        current += spacing;
        positions.push(current);
    }
    if (Math.abs(positions[positions.length - 1] - end) > 1e-9)
        positions.push(end);
    return positions;
}
function createFrame(roof, z, index) {
    const leftFront = point(roof.eaves.left.front.x, roof.eaves.left.front.y, z);
    const rightFront = point(roof.eaves.right.front.x, roof.eaves.right.front.y, z);
    const leftBase = point(roof.eaves.left.front.x, 0, z);
    const rightBase = point(roof.eaves.right.front.x, 0, z);
    if (roof.type === 'gabled' && roof.ridge) {
        const ridge = point(roof.ridge.front.x, roof.ridge.front.y, z);
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
    if (!Number.isFinite(center) || !Number.isFinite(width) || width <= 0)
        return null;
    const halfWidth = width / 2;
    return Object.freeze({
        min: center - halfWidth,
        max: center + halfWidth
    });
}
function splitSpanWithOpenings(startCoord, endCoord, yLevel, openings, sideCode) {
    if (endCoord <= startCoord)
        return [];
    const intervals = openings.filter(opening => opening.side === sideCode).filter(opening => Number.isFinite(opening.bounds?.min?.y) && Number.isFinite(opening.bounds?.max?.y) && yLevel >= opening.bounds.min.y && yLevel <= opening.bounds.max.y).map(resolveOpeningInterval).filter(Boolean).map(interval => ({
                min: Math.max(startCoord, interval.min),
                max: Math.min(endCoord, interval.max)
            })).filter(interval => interval.max > interval.min).sort((a, b) => a.min - b.min);
    if (intervals.length === 0)
        return [Object.freeze({
                start: startCoord,
                end: endCoord
            })];
    const merged = [];
    for (const cut of intervals) {
        const previous = merged[merged.length - 1];
        if (!previous || cut.min > previous.max) {
            merged.push({
                min: cut.min,
                max: cut.max
            });
        } else {
            previous.max = Math.max(previous.max, cut.max);
        }
    }
    const result = [];
    let current = startCoord;
    for (const cut of merged) {
        if (cut.min > current)
            result.push(Object.freeze({
                    start: current,
                    end: cut.min
                }));
        current = Math.max(current, cut.max);
        if (current >= endCoord)
            break;
    }
    if (current < endCoord)
        result.push(Object.freeze({
                start: current,
                end: endCoord
            }));
    return result;
}
function createSideSegments(side, y, envelope, openings) {
    const halfWidth = envelope.width / 2;
    const length = envelope.length;
    if (side === 'F')
        return splitSpanWithOpenings(-halfWidth, halfWidth, y, openings, 'F').map(span => line(point(span.start, y, 0), point(span.end, y, 0)));
    if (side === 'B')
        return splitSpanWithOpenings(-halfWidth, halfWidth, y, openings, 'B').map(span => line(point(span.start, y, length), point(span.end, y, length)));
    if (side === 'L')
        return splitSpanWithOpenings(0, length, y, openings, 'L').map(span => line(point(-halfWidth, y, span.start), point(-halfWidth, y, span.end)));
    return splitSpanWithOpenings(0, length, y, openings, 'R').map(span => line(point(halfWidth, y, span.start), point(halfWidth, y, span.end)));
}
function createGirt(walls, y, index, envelope, openings) {
    const frontSegments = Object.freeze(createSideSegments('F', y, envelope, openings));
    const backSegments = Object.freeze(createSideSegments('B', y, envelope, openings));
    const leftSegments = Object.freeze(createSideSegments('L', y, envelope, openings));
    const rightSegments = Object.freeze(createSideSegments('R', y, envelope, openings));
    return Object.freeze({
        index,
        elevation: y,
        frontSegments,
        backSegments,
        leftSegments,
        rightSegments,
        front: Object.freeze({
            side: 'F',
            index,
            elevation: y,
            segments: frontSegments
        }),
        back: Object.freeze({
            side: 'B',
            index,
            elevation: y,
            segments: backSegments
        }),
        left: Object.freeze({
            side: 'L',
            index,
            elevation: y,
            segments: leftSegments
        }),
        right: Object.freeze({
            side: 'R',
            index,
            elevation: y,
            segments: rightSegments
        })
    });
}
function createGirts(walls, spacing, openings, envelope) {
    const frontHeight = Math.max(walls.front.height?.left ?? 0, walls.front.height?.right ?? 0, walls.front.height?.ridge ?? 0);
    const backHeight = Math.max(walls.back.height?.left ?? 0, walls.back.height?.right ?? 0, walls.back.height?.ridge ?? 0);
    const leftHeight = Math.max(walls.left.height?.front ?? 0, walls.left.height?.back ?? 0);
    const rightHeight = Math.max(walls.right.height?.front ?? 0, walls.right.height?.back ?? 0);
    const maxHeight = Math.max(frontHeight, backHeight, leftHeight, rightHeight);
    const levels = createPositions(0, maxHeight, spacing);
    return Object.freeze(levels.map((y, index) => Object.freeze({
                index,
                elevation: y,
                girt: createGirt(walls, y, index, envelope, openings),
                frontSegments: Object.freeze(y <= frontHeight + 1e-9 ? createSideSegments('F', y, envelope, openings) : []),
                backSegments: Object.freeze(y <= backHeight + 1e-9 ? createSideSegments('B', y, envelope, openings) : []),
                leftSegments: Object.freeze(y <= leftHeight + 1e-9 ? createSideSegments('L', y, envelope, openings) : []),
                rightSegments: Object.freeze(y <= rightHeight + 1e-9 ? createSideSegments('R', y, envelope, openings) : [])
            })));
}
function createPurlins(roof, length, spacing) {
    const positions = createPositions(roof.eaves.left.front.z, roof.eaves.left.back.z, spacing);
    return Object.freeze(positions.map((z, index) => {
            if (roof.type === 'gabled' && roof.ridge)
                return Object.freeze({
                    index,
                    position: z,
                    planes: Object.freeze({
                        left: line(point(roof.eaves.left.front.x, roof.eaves.left.front.y, z), point(roof.ridge.front.x, roof.ridge.front.y, z)),
                        right: line(point(roof.ridge.front.x, roof.ridge.front.y, z), point(roof.eaves.right.front.x, roof.eaves.right.front.y, z))
                    })
                });
            return Object.freeze({
                index,
                position: z,
                plane: line(point(roof.eaves.left.front.x, roof.eaves.left.front.y, z), point(roof.eaves.right.front.x, roof.eaves.right.front.y, z))
            });
        }));
}
function createEndWallColumns(walls) {
    return Object.freeze([Object.freeze({
                side: 'F',
                left: line(walls.front.corners.bottomLeft, walls.front.corners.topLeft),
                right: line(walls.front.corners.bottomRight, walls.front.corners.topRight)
            }), Object.freeze({
                side: 'B',
                left: line(walls.back.corners.bottomLeft, walls.back.corners.topLeft),
                right: line(walls.back.corners.bottomRight, walls.back.corners.topRight)
            })]);
}
export function createStructuralGeometry(model, buildingGeometry, options = {}) {
    if (!model || !buildingGeometry?.walls || !buildingGeometry?.roof || !buildingGeometry?.envelope)
        throw new TypeError('BuildingModel, envelope, walls, and roof geometry are required');
    const frameSpacing = options.frameSpacing ?? DEFAULTS.frameSpacing;
    const girtSpacing = options.girtSpacing ?? DEFAULTS.girtSpacing;
    const purlinSpacing = options.purlinSpacing ?? DEFAULTS.purlinSpacing;
    const roof = buildingGeometry.roof;
    const walls = buildingGeometry.walls;
    const openings = buildingGeometry.openings ?? [];
    const envelope = buildingGeometry.envelope;
    const framePositions = createPositions(roof.eaves.left.front.z, roof.eaves.left.back.z, frameSpacing);
    const frames = framePositions.map((z, index) => createFrame(roof, z, index));
    const girts = createGirts(walls, girtSpacing, openings, envelope);
    const purlins = createPurlins(roof, model.dimensions.length, purlinSpacing);
    const endWallColumns = createEndWallColumns(walls);
    return Object.freeze({
        frames: Object.freeze(frames),
        girts,
        purlins,
        endWallColumns
    });
}