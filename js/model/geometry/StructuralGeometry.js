const DEFAULTS = Object.freeze({
    frameSpacing: 6.096,
    girtSpacing: 1.524,
    purlinSpacing: 1.524,
    // visual beam half-sizes used for clearance (must match StructuralOrchestrator)
    frameHalf: 0.09,
    girtHalf: 0.04,
    purlinHalf: 0.04,
    // extra clearance under roof plane / inside wall face
    clearance: 0.02
});

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

/**
 * Inset from outer envelope so a beam of given half-size stays inside the wall shell.
 * wallThickness: physical wall panel thickness (default 0.15).
 */
function wallInset(wallThickness, beamHalf, clearance) {
    const t = Number.isFinite(wallThickness) && wallThickness > 0 ? wallThickness : 0.15;
    // Place centerline roughly in the middle of the wall thickness, but at least beamHalf+clearance inside outer face
    return Math.max(t * 0.5, beamHalf + clearance);
}

function createFrame(envelope, roof, z, index, inset, roofDrop) {
    const halfWidth = envelope.width / 2 - inset;
    // Column tops sit below eave / under roof skin
    const baseHeight = envelope.height - roofDrop;

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

function getGableHalfWidthAtHeight(y, envelope, roof, inset) {
    const halfW = envelope.width / 2 - inset;
    const baseH = envelope.height;
    if (y <= baseH) {
        return halfW;
    }
    if (roof.type === 'gabled') {
        const fraction = (y - baseH) / Math.max(1e-6, roof.rise);
        return Math.max(0.1, halfW * (1.0 - fraction));
    }
    return halfW;
}

function createSideSegments(side, y, envelope, roof, openings, inset) {
    const length = envelope.length;
    const currentHalfW = getGableHalfWidthAtHeight(y, envelope, roof, inset);

    if (side === 'F') {
        return splitSpan(-currentHalfW, currentHalfW, y, openings, 'F').map(span =>
            line(point(span.start, y, inset), point(span.end, y, inset))
        );
    }
    if (side === 'B') {
        return splitSpan(-currentHalfW, currentHalfW, y, openings, 'B').map(span =>
            line(point(span.start, y, length - inset), point(span.end, y, length - inset))
        );
    }
    if (side === 'L') {
        const leftX = -envelope.width / 2 + inset;
        return splitSpan(inset, length - inset, y, openings, 'L').map(span =>
            line(point(leftX, y, span.start), point(leftX, y, span.end))
        );
    }
    const rightX = envelope.width / 2 - inset;
    return splitSpan(inset, length - inset, y, openings, 'R').map(span =>
        line(point(rightX, y, span.start), point(rightX, y, span.end))
    );
}

function createGirts(walls, spacing, openings, envelope, roof, inset) {
    const baseHeight = envelope.height;
    const maxHeight = roof.type === 'gabled' ? baseHeight + roof.rise : baseHeight;
    // stop below eave / ridge so girts do not poke through cladding
    const elevations = createPositions(spacing, Math.max(spacing, maxHeight - inset - 0.05), spacing);

    return Object.freeze(
        elevations.map((y, index) => Object.freeze({
            index,
            elevation: y,
            frontSegments: Object.freeze(createSideSegments('F', y, envelope, roof, openings, inset)),
            backSegments: Object.freeze(createSideSegments('B', y, envelope, roof, openings, inset)),
            leftSegments: Object.freeze(y <= baseHeight ? createSideSegments('L', y, envelope, roof, openings, inset) : []),
            rightSegments: Object.freeze(y <= baseHeight ? createSideSegments('R', y, envelope, roof, openings, inset) : [])
        }))
    );
}

function createPurlins(envelope, roof, spacing, underRoofOffset) {
    const halfW = envelope.width / 2;
    const length = envelope.length;
    const baseH = envelope.height;
    const rise = roof.rise;
    const purlinLines = [];

    // Horizontal run is slightly inset from eaves so purlin ends stay under roof sheet
    const z0 = underRoofOffset;
    const z1 = length - underRoofOffset;

    if (roof.type === 'gabled') {
        const slopeLength = Math.hypot(halfW, rise);
        const count = Math.max(2, Math.round(slopeLength / spacing) + 1);

        for (let i = 1; i < count; i++) {
            const t = i / count;
            // Along slope from eave (t=0) toward ridge (t=1): drop perpendicular-ish by underRoofOffset
            const xLeft = -halfW + t * halfW;
            const xRight = halfW - t * halfW;
            const y = baseH + t * rise - underRoofOffset;

            purlinLines.push(Object.freeze({
                index: purlinLines.length,
                planes: Object.freeze({
                    left: line(point(xLeft, y, z0), point(xLeft, y, z1)),
                    right: line(point(xRight, y, z0), point(xRight, y, z1))
                })
            }));
        }
    } else if (roof.type === 'left-sloped') {
        const slopeLength = Math.hypot(envelope.width, rise);
        const count = Math.max(2, Math.round(slopeLength / spacing) + 1);

        for (let i = 1; i < count; i++) {
            const t = i / count;
            const x = -halfW + t * envelope.width;
            const y = baseH + rise - t * rise - underRoofOffset;

            purlinLines.push(Object.freeze({
                index: purlinLines.length,
                plane: line(point(x, y, z0), point(x, y, z1))
            }));
        }
    } else {
        const slopeLength = Math.hypot(envelope.width, rise);
        const count = Math.max(2, Math.round(slopeLength / spacing) + 1);

        for (let i = 1; i < count; i++) {
            const t = i / count;
            const x = -halfW + t * envelope.width;
            const y = baseH + t * rise - underRoofOffset;

            purlinLines.push(Object.freeze({
                index: purlinLines.length,
                plane: line(point(x, y, z0), point(x, y, z1))
            }));
        }
    }

    return Object.freeze(purlinLines);
}

function createEndWallColumns(envelope, walls, roof, inset, roofDrop) {
    const halfW = envelope.width / 2;
    const length = envelope.length;
    const quarterW = halfW / 2;
    const baseH = envelope.height;
    const heightAtQuarter =
        roof.type === 'gabled'
            ? baseH + roof.rise / 2 - roofDrop
            : baseH - roofDrop;

    return Object.freeze([
        Object.freeze({
            side: 'F',
            left: line(point(-quarterW, 0, inset), point(-quarterW, heightAtQuarter, inset)),
            right: line(point(quarterW, 0, inset), point(quarterW, heightAtQuarter, inset))
        }),
        Object.freeze({
            side: 'B',
            left: line(point(-quarterW, 0, length - inset), point(-quarterW, heightAtQuarter, length - inset)),
            right: line(point(quarterW, 0, length - inset), point(quarterW, heightAtQuarter, length - inset))
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

    const wallThickness = model.walls?.thickness ?? walls?.front?.thickness ?? 0.15;
    const clearance = options.clearance ?? DEFAULTS.clearance;

    // Horizontal inset: keep columns / girts inside wall skins
    const inset = wallInset(
        wallThickness,
        options.frameHalf ?? DEFAULTS.frameHalf,
        clearance
    );

    // Vertical drop under roof plane so rafters / purlins stay below cladding
    const roofDrop = (options.purlinHalf ?? DEFAULTS.purlinHalf) + clearance + 0.04;
    const underRoofOffset = roofDrop;

    const framePositions = createPositions(0, envelope.length, frameSpacing);
    // Also inset frames from front/back ends so end columns don't poke through end walls
    const endInset = inset;
    const frames = framePositions.map((z, index) => {
        let zPos = z;
        if (index === 0) zPos = Math.max(z, endInset);
        if (index === framePositions.length - 1) zPos = Math.min(z, envelope.length - endInset);
        return createFrame(envelope, roof, zPos, index, inset, roofDrop);
    });

    const girts = createGirts(walls, girtSpacing, openings, envelope, roof, inset);
    const purlins = createPurlins(envelope, roof, purlinSpacing, underRoofOffset);
    const endWallColumns = createEndWallColumns(envelope, walls, roof, inset, roofDrop);

    return Object.freeze({
        frames: Object.freeze(frames),
        girts,
        purlins,
        endWallColumns,
        meta: Object.freeze({ inset, roofDrop, underRoofOffset, wallThickness })
    });
}
