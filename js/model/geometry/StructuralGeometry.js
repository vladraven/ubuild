// js/model/geometry/StructuralGeometry.js

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

function splitSpanWithOpenings(startCoord, endCoord, yLevel, openings, sideCode, isAxisX) {
    const intersecting = openings.filter(op => {
        if (op.side !== sideCode) return false;
        const minY = op.bounds.min.y;
        const maxY = op.bounds.max.y;
        return yLevel >= minY && yLevel <= maxY;
    });

    if (intersecting.length === 0) {
        return [{ start: startCoord, end: endCoord }];
    }

    // Интервалы вырезов
    const cutouts = intersecting.map(op => {
        const center = op.x;
        const halfW = op.dimensions.width / 2;
        return { min: center - halfW, max: center + halfW };
    }).sort((a, b) => a.min - b.min);

    const resultSegments = [];
    let current = startCoord;

    for (const cut of cutouts) {
        if (cut.min > current) {
            resultSegments.push({ start: current, end: Math.min(endCoord, cut.min) });
        }
        current = Math.max(current, cut.max);
        if (current >= endCoord) break;
    }

    if (current < endCoord) {
        resultSegments.push({ start: current, end: endCoord });
    }

    return resultSegments;
}

function createGirts(walls, height, spacing, openings, envelope) {
    const levels = createPositions(0, height, spacing);
    const girts = [];

    const halfW = envelope.width / 2;
    const length = envelope.length;

    levels.forEach((y, index) => {
        const frontSegs = splitSpanWithOpenings(-halfW, halfW, y, openings, 'F', true);
        const backSegs = splitSpanWithOpenings(-halfW, halfW, y, openings, 'B', true);
        const leftSegs = splitSpanWithOpenings(0, length, y, openings, 'L', false);
        const rightSegs = splitSpanWithOpenings(0, length, y, openings, 'R', false);

        girts.push(Object.freeze({
            index,
            elevation: y,
            frontSegments: Object.freeze(frontSegs.map(s => line(point(s.start, y, 0), point(s.end, y, 0)))),
            backSegments: Object.freeze(backSegs.map(s => line(point(s.start, y, length), point(s.end, y, length)))),
            leftSegments: Object.freeze(leftSegs.map(s => line(point(-halfW, y, s.start), point(-halfW, y, s.end)))),
            rightSegments: Object.freeze(rightSegs.map(s => line(point(halfW, y, s.start), point(halfW, y, s.end))))
        }));
    });

    return girts;
}

function createPurlins(roof, length, spacing) {
    const positions = createPositions(0, length, spacing);
    return positions.map((z, index) => {
        if (roof.type === 'gabled' && roof.ridge) {
            return Object.freeze({
                index,
                position: z,
                planes: {
                    left: line(
                        point(roof.eaves.left.front.x, roof.eaves.left.front.y, z),
                        point(roof.ridge.front.x, roof.ridge.front.y, z)
                    ),
                    right: line(
                        point(roof.ridge.front.x, roof.ridge.front.y, z),
                        point(roof.eaves.right.front.x, roof.eaves.right.front.y, z)
                    )
                }
            });
        }

        return Object.freeze({
            index,
            position: z,
            plane: line(
                point(roof.eaves.left.front.x, roof.eaves.left.front.y, z),
                point(roof.eaves.right.front.x, roof.eaves.right.front.y, z)
            )
        });
    });
}

function createEndWallColumns(walls) {
    return Object.freeze([
        Object.freeze({
            side: 'F',
            left: line(walls.front.corners.bottomLeft, walls.front.corners.topLeft),
            right: line(walls.front.corners.bottomRight, walls.front.corners.topRight)
        }),
        Object.freeze({
            side: 'B',
            left: line(walls.back.corners.bottomLeft, walls.back.corners.topLeft),
            right: line(walls.back.corners.bottomRight, walls.back.corners.topRight)
        })
    ]);
}

export function createStructuralGeometry(model, buildingGeometry, options = {}) {
    if (!model || !buildingGeometry?.walls || !buildingGeometry?.roof) {
        throw new TypeError('BuildingModel, walls, and roof geometry are required');
    }

    const frameSpacing = options.frameSpacing ?? DEFAULTS.frameSpacing;
    const girtSpacing = options.girtSpacing ?? DEFAULTS.girtSpacing;
    const purlinSpacing = options.purlinSpacing ?? DEFAULTS.purlinSpacing;

    const roof = buildingGeometry.roof;
    const walls = buildingGeometry.walls;
    const openings = buildingGeometry.openings || [];
    const envelope = buildingGeometry.envelope;

    const framePositions = createPositions(
        roof.eaves.left.front.z,
        roof.eaves.left.back.z,
        frameSpacing
    );

    const frames = framePositions.map((z, index) => createFrame(roof, z, index));
    const girts = createGirts(walls, model.dimensions.height, girtSpacing, openings, envelope);
    const purlins = createPurlins(roof, model.dimensions.length, purlinSpacing);
    const endWallColumns = createEndWallColumns(walls);

    return Object.freeze({
        frames: Object.freeze(frames),
        girts: Object.freeze(girts),
        purlins: Object.freeze(purlins),
        endWallColumns
    });
}