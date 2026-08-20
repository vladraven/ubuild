// js/model/geometry/BuildingEnvelope.js

const EPSILON = 1e-9;

function assertFinite(value, name) {
    if (!Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number`);
    }
}

function assertPositive(value, name) {
    assertFinite(value, name);
    if (value <= 0) {
        throw new RangeError(`${name} must be greater than zero`);
    }
}

function createPoint(x, y, z) {
    return Object.freeze({ x, y, z });
}

function createBounds(min, max) {
    return Object.freeze({
        min: createPoint(min.x, min.y, min.z),
        max: createPoint(max.x, max.y, max.z),
        width: max.x - min.x,
        height: max.y - min.y,
        length: max.z - min.z,
        center: createPoint(
            (min.x + max.x) / 2,
            (min.y + max.y) / 2,
            (min.z + max.z) / 2
        )
    });
}

function validateDimensions(dimensions) {
    assertPositive(dimensions.width, 'dimensions.width');
    assertPositive(dimensions.length, 'dimensions.length');
    assertPositive(dimensions.height, 'dimensions.height');
}

export function createBuildingEnvelope(model) {
    if (!model || typeof model !== 'object') {
        throw new TypeError('BuildingModel is required');
    }

    if (!model.dimensions) {
        throw new TypeError('BuildingModel.dimensions is required');
    }

    validateDimensions(model.dimensions);

    const { width, length, height } = model.dimensions;
    const halfWidth = width / 2;

    const min = createPoint(-halfWidth, 0, 0);
    const max = createPoint(halfWidth, height, length);
    const bounds = createBounds(min, max);

    if (
        bounds.width <= EPSILON ||
        bounds.height <= EPSILON ||
        bounds.length <= EPSILON
    ) {
        throw new RangeError(
            'Building envelope dimensions must be greater than zero'
        );
    }

    return Object.freeze({
        bounds,
        width,
        length,
        height,
        center: bounds.center,
        corners: Object.freeze({
            frontLeft: createPoint(-halfWidth, 0, 0),
            frontRight: createPoint(halfWidth, 0, 0),
            backLeft: createPoint(-halfWidth, 0, length),
            backRight: createPoint(halfWidth, 0, length),
            frontLeftTop: createPoint(-halfWidth, height, 0),
            frontRightTop: createPoint(halfWidth, height, 0),
            backLeftTop: createPoint(-halfWidth, height, length),
            backRightTop: createPoint(halfWidth, height, length)
        })
    });
}