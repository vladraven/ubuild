function point(
    x,
    y,
    z
) {
    return Object.freeze({
        x,
        y,
        z
    });
}

function createBounds(
    width,
    length,
    height,
    center
) {
    return Object.freeze({
        min:
            point(
                center.x -
                    width / 2,
                center.y -
                    height / 2,
                center.z -
                    length / 2
            ),

        max:
            point(
                center.x +
                    width / 2,
                center.y +
                    height / 2,
                center.z +
                    length / 2
            ),

        center,

        width,
        length,
        height
    });
}

function validatePositive(
    value,
    name
) {
    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        throw new RangeError(
            `${name} must be greater than zero`
        );
    }
}

function validateNonNegative(
    value,
    name
) {
    if (
        !Number.isFinite(value) ||
        value < 0
    ) {
        throw new RangeError(
            `${name} must be non-negative`
        );
    }
}

export function createDrivewayGeometry(
    model,
    envelope
) {
    if (!model) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (!envelope) {
        throw new TypeError(
            'BuildingEnvelope is required'
        );
    }

    const config =
        model.driveway;

    if (
        !config ||
        !config.enabled
    ) {
        return Object.freeze({
            enabled: false,

            width: 0,
            length: 0,
            height: 0,

            position:
                point(
                    0,
                    0,
                    0
                ),

            anchor: null,

            bounds: null
        });
    }

    const width =
        config.width;

    const length =
        config.length;

    const height =
        config.height;

    validatePositive(
        width,
        'driveway.width'
    );

    validatePositive(
        length,
        'driveway.length'
    );

    validateNonNegative(
        height,
        'driveway.height'
    );

    if (
        width >
        envelope.width
    ) {
        throw new RangeError(
            'driveway.width cannot exceed building width'
        );
    }

    const frontZ =
        envelope.bounds.min.z;

    const x =
        config.x ??
        0;

    const y =
        config.y ??
        height / 2;

    const z =
        config.z ??
        config.zOffset ??
        frontZ -
            length / 2;

    const position =
        point(
            x,
            y,
            z
        );

    const anchor =
        point(
            x,
            0,
            z
        );

    return Object.freeze({
        enabled: true,

        width,
        length,
        height,

        position,

        anchor,

        bounds:
            createBounds(
                width,
                length,
                height,
                position
            )
    });
}