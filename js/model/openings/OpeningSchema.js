export const OPENING_TYPES = Object.freeze([
    'Window',
    'Walk Door Solid',
    'Walk Door Solid Double',
    'Overhead Panel Door',
    'Bi-Fold Door',
    'Hydraulic Door'
]);

export const OPENING_DEFINITIONS = Object.freeze({
    'Window': Object.freeze({
        width: 1.0,
        height: 1.0,
        yOff: 1.0
    }),

    'Walk Door Solid': Object.freeze({
        width: 1.0,
        height: 2.1,
        yOff: 0
    }),

    'Walk Door Solid Double': Object.freeze({
        width: 2.0,
        height: 2.1,
        yOff: 0
    }),

    'Overhead Panel Door': Object.freeze({
        width: 3.0,
        height: 3.0,
        yOff: 0
    }),

    'Bi-Fold Door': Object.freeze({
        width: 4.0,
        height: 3.0,
        yOff: 0
    }),

    'Hydraulic Door': Object.freeze({
        width: 4.0,
        height: 3.0,
        yOff: 0
    })
});

export const OPENING_SIDES = Object.freeze([
    'F',
    'B',
    'L',
    'R'
]);

export function isOpeningType(
    type
) {
    return OPENING_TYPES.includes(
        type
    );
}

export function isOpeningSide(
    side
) {
    return OPENING_SIDES.includes(
        side
    );
}

export function getOpeningDefinition(
    type
) {
    if (!isOpeningType(type)) {
        throw new RangeError(
            `Unsupported opening type: ${type}`
        );
    }

    return OPENING_DEFINITIONS[type];
}

export function createOpening(
    {
        id,
        type,
        side,
        x = 0,
        width,
        height,
        yOff
    }
) {
    if (
        typeof id !== 'string' ||
        id.trim() === ''
    ) {
        throw new TypeError(
            'Opening id is required'
        );
    }

    if (!isOpeningType(type)) {
        throw new RangeError(
            `Unsupported opening type: ${type}`
        );
    }

    if (!isOpeningSide(side)) {
        throw new RangeError(
            `Unsupported opening side: ${side}`
        );
    }

    const definition =
        getOpeningDefinition(type);

    const opening = {
        id,
        type,
        side,
        x,

        width:
            width ??
            definition.width,

        height:
            height ??
            definition.height,

        yOff:
            yOff ??
            definition.yOff
    };

    if (
        !Number.isFinite(opening.x)
    ) {
        throw new TypeError(
            'Opening x must be finite'
        );
    }

    if (
        !Number.isFinite(
            opening.width
        ) ||
        opening.width <= 0
    ) {
        throw new RangeError(
            'Opening width must be greater than zero'
        );
    }

    if (
        !Number.isFinite(
            opening.height
        ) ||
        opening.height <= 0
    ) {
        throw new RangeError(
            'Opening height must be greater than zero'
        );
    }

    if (
        !Number.isFinite(
            opening.yOff
        ) ||
        opening.yOff < 0
    ) {
        throw new RangeError(
            'Opening yOff must be non-negative'
        );
    }

    return Object.freeze(
        opening
    );
}

export function normalizeOpening(
    opening
) {
    return createOpening({
        id: opening.id,
        type: opening.type,
        side: opening.side,
        x:
            opening.x ??
            opening.position ??
            0,
        width:
            opening.width ??
            opening.w,
        height:
            opening.height ??
            opening.h,
        yOff:
            opening.yOff ??
            opening.verticalOffset
    });
}