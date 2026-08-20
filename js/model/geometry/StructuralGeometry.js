const DEFAULTS = Object.freeze({
    frameSpacing: 6.096,
    girtSpacing: 1.524,
    purlinSpacing: 1.524
});

const INSET = 0.08;

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function line(start, end) {
    return Object.freeze({
        start,
        end,
        length: Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z)
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

function createFrame(envelope, roof, z, index) {
    const halfWidth = envelope.width / 2 - INSET;
    const baseHeight = envelope.height - INSET;

    const leftBase = point(-halfWidth, 0, z);
    const rightBase = point(halfWidth, 0, z);
    const leftTop = point(-halfWidth, baseHeight, z);
    const rightTop = point(halfWidth, baseHeight, z);

    if (roof.type === 'gabled') {
        const ridge = point(0, baseHeight + roof.rise, z);
        return Object.freeze({
            index,
            position: z,
            leftColumn: line(leftBase, leftTop),
            leftRafter: line(leftTop, ridge),
            rightRafter: line(ridge, rightTop),
            rightColumn: line(rightTop, rightBase)
        });
    } else if (roof.type === 'left-sloped') {
        const leftHighTop = point(-halfWidth, baseHeight + roof.rise, z);
        return Object.freeze({
            index,
            position: z,
            leftColumn: line(leftBase, leftHighTop),
            rafter: line(leftHighTop, rightTop),
            rightColumn: line(rightTop, rightBase)
        });
    } else {
        const rightHighTop = point(halfWidth, baseHeight + roof.rise, z);
        return Object.freeze({
            index,
            position: z,
            leftColumn: line(leftBase, leftTop),
            rafter: line(leftTop, rightHighTop),
            rightColumn: line(rightHighTop, rightBase)
        });
    }
}

function resolveOpeningInterval(opening) {
    const center = opening.x ?? 0;
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
    if (end <= start) return [];
    const cuts = openings
        .filter(op => op.side === side)
        .filter(op => Number.isFinite(op.bounds?.min?.y) && Number.isFinite(op.bounds?.max?.y) && y >= op.bounds.min.y && y <= op.bounds.max.y)
        .map(resolveOpeningInterval)
        .filter(Boolean)
        .map(cut => ({ min: Math.max(start, cut.min), max: Math.min(end, cut.max) }))
        .filter(cut => cut.max > cut.min)
        .sort((a, b) => a.min - b.min);

    if (cuts.length === 0) {
        return [Object.freeze({ start, end })];
    }
    const merged = [];
    for (const cut of cuts) {
        const previous = merged[merged.length - 1];
        if (!previous || cut.min > previous.max) {
            merged.push({ min: cut.min, max: cut.max });
            continue;
        }
        previous.max = Math.max(previous.max, cut.max);
    }
    const result = [];
    let current = start;
    for (const cut of merged) {
        if (cut.min > current) {
            result.push(Object.freeze({ start: current, end: cut.min }));
        }
        current = Math.max(current, cut.max);
        if (current >= end) break;
    }
    if (current < end) {
        result.push(Object.freeze({ start: current, end }));
    }
    return result;
}

function getGableHalfWidthAtHeight(y, envelope, roof) {
    const halfW = envelope.width / 2 - INSET;
    const baseH = envelope.height;
    if (y <= baseH) {
        return halfW;
    }
    if (roof.type === 'gabled') {
        const fraction = (y - baseH) / roof.rise;
        return Math.max(0.1, halfW * (1.0 - fraction));
    }
    return halfW;
}

function createSideSegments(side, y, envelope, roof, openings) {
    const length = envelope.length;
    const currentHalfW = getGableHalfWidthAtHeight(y, envelope, roof);

    if (side === 'F') {
        return splitSpan(-currentHalfW, currentHalfW, y, openings, 'F').map(span =>
            line(point(span.start, y, INSET), point(span.end, y, INSET))
        );
    }
    if (side === 'B') {
        return splitSpan(-currentHalfW, currentHalfW, y, openings, 'B').map(span =>
            line(point(span.start, y, length - INSET), point(span.end, y, length - INSET))
        );
    }
    if (side === 'L') {
        const leftX = -envelope.width / 2 + INSET;
        return splitSpan(INSET, length - INSET, y, openings, 'L').map(span =>
            line(point(leftX, y, span.start), point(leftX, y, span.end))
        );
    }
    const rightX = envelope.width / 2 - INSET;
    return splitSpan(INSET, length - INSET, y, openings, 'R').map(span =>
        line(point(rightX, y, span.start), point(rightX, y, span.end))
    );
}

function createGirts(walls, spacing, openings, envelope, roof) {
    const baseHeight = envelope.height;
    const maxHeight = roof.type === 'gabled' ? baseHeight + roof.rise : baseHeight;
    const elevations = createPositions(spacing, maxHeight - 0.1, spacing);

    return Object.freeze(
        elevations.map((y, index) => Object.freeze({
            index,
            elevation: y,
            frontSegments: Object.freeze(createSideSegments('F', y, envelope, roof, openings)),
            backSegments: Object.freeze(createSideSegments('B', y, envelope, roof, openings)),
            leftSegments: Object.freeze(y <= baseHeight ? createSideSegments('L', y, envelope, roof, openings) : []),
            rightSegments: Object.freeze(y <= baseHeight ? createSideSegments('R', y, envelope, roof, openings) : [])
        }))
    );
}

function createPurlins(envelope, roof, spacing) {
    const halfW = envelope.width / 2;
    const length = envelope.length;
    const baseH = envelope.height;
    const rise = roof.rise;
    const purlinLines = [];

    const purlinUnderRoofOffset = 0.1;

    if (roof.type === 'gabled') {
        const slopeLength = Math.hypot(halfW, rise);
        const count = Math.max(2, Math.round(slopeLength / spacing) + 1);

        for (let i = 1; i < count; i++) {
            const t = i / count;
            const xLeft = -halfW + t * halfW;
            const xRight = halfW - t * halfW;
            const y = baseH + t * rise - purlinUnderRoofOffset;

            purlinLines.push(Object.freeze({
                index: purlinLines.length,
                planes: Object.freeze({
                    left: line(point(xLeft, y, 0), point(xLeft, y, length)),
                    right: line(point(xRight, y, 0), point(xRight, y, length))
                })
            }));
        }
    } else if (roof.type === 'left-sloped') {
        const slopeLength = Math.hypot(envelope.width, rise);
        const count = Math.max(2, Math.round(slopeLength / spacing) + 1);

        for (let i = 1; i < count; i++) {
            const t = i / count;
            const x = -halfW + t * envelope.width;
            const y = baseH + rise - t * rise - purlinUnderRoofOffset;

            purlinLines.push(Object.freeze({
                index: purlinLines.length,
                plane: line(point(x, y, 0), point(x, y, length))
            }));
        }
    } else {
        const slopeLength = Math.hypot(envelope.width, rise);
        const count = Math.max(2, Math.round(slopeLength / spacing) + 1);

        for (let i = 1; i < count; i++) {
            const t = i / count;
            const x = -halfW + t * envelope.width;
            const y = baseH + t * rise - purlinUnderRoofOffset;

            purlinLines.push(Object.freeze({
                index: purlinLines.length,
                plane: line(point(x, y, 0), point(x, y, length))
            }));
        }
    }

    return Object.freeze(purlinLines);
}

function createEndWallColumns(envelope, walls, roof) {
    const halfW = envelope.width / 2;
    const length = envelope.length;
    const quarterW = halfW / 2;
    const baseH = envelope.height;
    const heightAtQuarter = roof.type === 'gabled' ? baseH + roof.rise / 2 - INSET : baseH - INSET;

    return Object.freeze([
        Object.freeze({
            side: 'F',
            left: line(point(-quarterW, 0, INSET), point(-quarterW, heightAtQuarter, INSET)),
            right: line(point(quarterW, 0, INSET), point(quarterW, heightAtQuarter, INSET))
        }),
        Object.freeze({
            side: 'B',
            left: line(point(-quarterW, 0, length - INSET), point(-quarterW, heightAtQuarter, length - INSET)),
            right: line(point(quarterW, 0, length - INSET), point(quarterW, heightAtQuarter, length - INSET))
        })
    ]);
}

export function createStructuralGeometry(model, buildingGeometry, options = {}) {
    if (!model || !buildingGeometry?.walls || !buildingGeometry?.roof || !buildingGeometry?.envelope) {
        throw new TypeError('BuildingModel, envelope, walls, and roof geometry are required');
    }
    const roof = buildingGeometry.roof;
    const walls = buildingGeometry.walls;
    const openings = buildingGeometry.openings ?? [];
    const envelope = buildingGeometry.envelope;

    const frameSpacing = options.frameSpacing ?? DEFAULTS.frameSpacing;
    const girtSpacing = options.girtSpacing ?? DEFAULTS.girtSpacing;
    const purlinSpacing = options.purlinSpacing ?? DEFAULTS.purlinSpacing;

    const framePositions = createPositions(0, envelope.length, frameSpacing);
    const frames = framePositions.map((z, index) => createFrame(envelope, roof, z, index));
    const girts = createGirts(walls, girtSpacing, openings, envelope, roof);
    const purlins = createPurlins(envelope, roof, purlinSpacing);
    const endWallColumns = createEndWallColumns(envelope, walls, roof);

    return Object.freeze({
        frames: Object.freeze(frames),
        girts,
        purlins,
        endWallColumns
    });
}