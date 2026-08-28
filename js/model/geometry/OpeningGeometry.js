// js/model/geometry/OpeningGeometry.js

import {
    OPENING_TYPES,
    OPENING_DEFAULTS,
    validateOpening,
    clampOpeningToWall
} from '../openings/OpeningSchema.js';

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function bounds(min, max) {
    return Object.freeze({
        min,
        max,
        width: max.x - min.x,
        height: max.y - min.y,
        length: max.z - min.z,
        center: point(
            (min.x + max.x) / 2,
            (min.y + max.y) / 2,
            (min.z + max.z) / 2
        )
    });
}

function calculateSpatialData(opening, envelope) {
    const halfW = opening.width / 2;
    const bottomY = opening.yOff;
    const topY = opening.yOff + opening.height;
    const centerY = bottomY + opening.height / 2;

    let anchor;
    let normal;
    let openingBounds;
    let cutout;

    switch (opening.side) {
        case 'F': {
            const z = envelope.bounds.min.z;
            anchor = point(opening.x, centerY, z);
            normal = point(0, 0, -1);
            openingBounds = bounds(
                point(opening.x - halfW, bottomY, z - 0.1),
                point(opening.x + halfW, topY, z + 0.1)
            );
            cutout = Object.freeze({
                minX: opening.x - halfW,
                maxX: opening.x + halfW,
                minY: bottomY,
                maxY: topY
            });
            break;
        }
        case 'B': {
            const z = envelope.bounds.max.z;
            anchor = point(opening.x, centerY, z);
            normal = point(0, 0, 1);
            openingBounds = bounds(
                point(opening.x - halfW, bottomY, z - 0.1),
                point(opening.x + halfW, topY, z + 0.1)
            );
            cutout = Object.freeze({
                minX: opening.x - halfW,
                maxX: opening.x + halfW,
                minY: bottomY,
                maxY: topY
            });
            break;
        }
        case 'L': {
            const x = envelope.bounds.min.x;
            anchor = point(x, centerY, opening.x);
            normal = point(-1, 0, 0);
            openingBounds = bounds(
                point(x - 0.1, bottomY, opening.x - halfW),
                point(x + 0.1, topY, opening.x + halfW)
            );
            cutout = Object.freeze({
                minX: opening.x - halfW,
                maxX: opening.x + halfW,
                minY: bottomY,
                maxY: topY
            });
            break;
        }
        case 'R': {
            const x = envelope.bounds.max.x;
            anchor = point(x, centerY, opening.x);
            normal = point(1, 0, 0);
            openingBounds = bounds(
                point(x - 0.1, bottomY, opening.x - halfW),
                point(x + 0.1, topY, opening.x + halfW)
            );
            cutout = Object.freeze({
                minX: envelope.length - opening.x - halfW,
                maxX: envelope.length - opening.x + halfW,
                minY: bottomY,
                maxY: topY
            });
            break;
        }
        default:
            throw new RangeError(`Unknown opening side: ${opening.side}`);
    }

    return { anchor, normal, openingBounds, cutout };
}

export function createOpeningGeometry(model, envelope) {
    if (!model || typeof model !== 'object') {
        throw new TypeError('BuildingModel is required');
    }
    if (!envelope || typeof envelope !== 'object') {
        throw new TypeError('BuildingEnvelope is required');
    }

    const rawOpenings = Array.isArray(model.openings) ? model.openings : [];
    const processedOpenings = [];

    for (const rawOp of rawOpenings) {
        const defaults = OPENING_DEFAULTS[rawOp.type] || OPENING_DEFAULTS[OPENING_TYPES.WINDOW];
        const normalized = {
            id: String(rawOp.id || `op_${Date.now()}`),
            type: rawOp.type || OPENING_TYPES.WINDOW,
            side: rawOp.side || 'F',
            width: Number(rawOp.width) > 0 ? Number(rawOp.width) : defaults.width,
            height: Number(rawOp.height) > 0 ? Number(rawOp.height) : defaults.height,
            x: Number.isFinite(rawOp.x) ? Number(rawOp.x) : 0,
            yOff: Number.isFinite(rawOp.yOff) ? Number(rawOp.yOff) : defaults.yOff
        };

        const clamped = clampOpeningToWall(normalized, model.dimensions);
        validateOpening(clamped);

        const { anchor, normal, openingBounds, cutout } = calculateSpatialData(clamped, envelope);

        processedOpenings.push(Object.freeze({
            id: clamped.id,
            type: clamped.type,
            side: clamped.side,
            x: clamped.x,
            yOff: clamped.yOff,
            width: clamped.width,
            height: clamped.height,
            dimensions: Object.freeze({
                width: clamped.width,
                height: clamped.height
            }),
            anchor,
            normal,
            bounds: openingBounds,
            cutout
        }));
    }

    return Object.freeze(processedOpenings);
}