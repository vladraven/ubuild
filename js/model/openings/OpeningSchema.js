// js/model/openings/OpeningSchema.js

export const OPENING_TYPES = Object.freeze({
    WINDOW: 'Window',
    WALK_DOOR_SOLID: 'Walk Door Solid',
    WALK_DOOR_SOLID_DOUBLE: 'Walk Door Solid Double',
    OVERHEAD_PANEL_DOOR: 'Overhead Panel Door',
    BI_FOLD_DOOR: 'Bi-Fold Door',
    HYDRAULIC_DOOR: 'Hydraulic Door'
});

export const OPENING_SIDES = Object.freeze(['F', 'B', 'L', 'R']);

export const OPENING_DEFAULTS = Object.freeze({
    [OPENING_TYPES.WINDOW]: Object.freeze({
        width: 1.2,
        height: 1.0,
        yOff: 1.0
    }),
    [OPENING_TYPES.WALK_DOOR_SOLID]: Object.freeze({
        width: 0.95,
        height: 2.1,
        yOff: 0.0
    }),
    [OPENING_TYPES.WALK_DOOR_SOLID_DOUBLE]: Object.freeze({
        width: 1.8,
        height: 2.1,
        yOff: 0.0
    }),
    [OPENING_TYPES.OVERHEAD_PANEL_DOOR]: Object.freeze({
        width: 3.0,
        height: 3.0,
        yOff: 0.0
    }),
    [OPENING_TYPES.BI_FOLD_DOOR]: Object.freeze({
        width: 4.5,
        height: 3.5,
        yOff: 0.0
    }),
    [OPENING_TYPES.HYDRAULIC_DOOR]: Object.freeze({
        width: 6.0,
        height: 4.0,
        yOff: 0.0
    })
});

const MIN_WALL_MARGIN = 0.15;
const MIN_OPENING_GAP = 0.20;

export function generateOpeningId() {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function validateOpening(opening) {
    if (!opening || typeof opening !== 'object') {
        throw new TypeError('Opening must be a valid object');
    }
    if (typeof opening.id !== 'string' || opening.id.trim() === '') {
        throw new TypeError('Opening id is required');
    }
    if (!Object.values(OPENING_TYPES).includes(opening.type)) {
        throw new RangeError(`Unsupported opening type: ${opening.type}`);
    }
    if (!OPENING_SIDES.includes(opening.side)) {
        throw new RangeError(`Unsupported opening side: ${opening.side}`);
    }
    if (!Number.isFinite(opening.width) || opening.width <= 0) {
        throw new RangeError('Opening width must be greater than zero');
    }
    if (!Number.isFinite(opening.height) || opening.height <= 0) {
        throw new RangeError('Opening height must be greater than zero');
    }
    if (!Number.isFinite(opening.x)) {
        throw new TypeError('Opening x must be a finite number');
    }
    if (!Number.isFinite(opening.yOff) || opening.yOff < 0) {
        throw new RangeError('Opening yOff must be non-negative');
    }
    return true;
}

export function getWallSpanLimits(side, dimensions) {
    const isEndWall = side === 'F' || side === 'B';
    const span = isEndWall ? dimensions.width : dimensions.length;
    const minX = isEndWall ? -span / 2 : 0;
    const maxX = isEndWall ? span / 2 : span;
    return { minX, maxX, span, isEndWall };
}

export function clampOpeningToWall(opening, dimensions) {
    const { minX, maxX } = getWallSpanLimits(opening.side, dimensions);
    const halfW = opening.width / 2;

    const allowedMinX = minX + halfW + MIN_WALL_MARGIN;
    const allowedMaxX = maxX - halfW - MIN_WALL_MARGIN;

    let clampedX = opening.x;
    if (allowedMinX > allowedMaxX) {
        clampedX = (minX + maxX) / 2;
    } else {
        clampedX = Math.max(allowedMinX, Math.min(allowedMaxX, clampedX));
    }

    const maxAllowedHeight = Math.max(0.5, dimensions.height - MIN_WALL_MARGIN);
    const clampedHeight = Math.min(opening.height, maxAllowedHeight);
    let clampedYOff = opening.yOff;

    if (opening.type === OPENING_TYPES.WINDOW) {
        const maxYOff = Math.max(0, dimensions.height - clampedHeight - MIN_WALL_MARGIN);
        clampedYOff = Math.max(0.1, Math.min(maxYOff, clampedYOff));
    } else {
        clampedYOff = 0.0;
    }

    return {
        ...opening,
        width: opening.width,
        height: clampedHeight,
        x: clampedX,
        yOff: clampedYOff
    };
}

export function checkOpeningsCollision(opA, opB) {
    if (opA.id === opB.id || opA.side !== opB.side) {
        return false;
    }

    const aMinX = opA.x - opA.width / 2 - MIN_OPENING_GAP;
    const aMaxX = opA.x + opA.width / 2 + MIN_OPENING_GAP;
    const aMinY = opA.yOff;
    const aMaxY = opA.yOff + opA.height;

    const bMinX = opB.x - opB.width / 2;
    const bMaxX = opB.x + opB.width / 2;
    const bMinY = opB.yOff;
    const bMaxY = opB.yOff + opB.height;

    const overlapX = aMinX < bMaxX && aMaxX > bMinX;
    const overlapY = aMinY < bMaxY && aMaxY > bMinY;

    return overlapX && overlapY;
}

export function findValidOpeningPosition(newOp, existingOpenings, dimensions) {
    const clamped = clampOpeningToWall(newOp, dimensions);
    const sameSideOpenings = existingOpenings.filter(op => op.side === clamped.side && op.id !== clamped.id);

    const hasCollision = sameSideOpenings.some(op => checkOpeningsCollision(clamped, op));
    if (!hasCollision) {
        return clamped;
    }

    const { minX, maxX } = getWallSpanLimits(clamped.side, dimensions);
    const halfW = clamped.width / 2;
    const startX = minX + halfW + MIN_WALL_MARGIN;
    const endX = maxX - halfW - MIN_WALL_MARGIN;
    const step = 0.2;

    for (let candidateX = startX; candidateX <= endX; candidateX += step) {
        const testOp = { ...clamped, x: candidateX };
        if (!sameSideOpenings.some(op => checkOpeningsCollision(testOp, op))) {
            return testOp;
        }
    }

    return clamped;
}