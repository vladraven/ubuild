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
    zOffset
) {
    return Object.freeze({
        min:
            point(
                -width / 2,
                0,
                zOffset -
                    length / 2
            ),

        max:
            point(
                width / 2,
                height,
                zOffset +
                    length / 2
            ),

        center:
            point(
                0,
                height / 2,
                zOffset
            ),

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

    if (
        !Number.isFinite(height) ||
        height < 0
    ) {
        throw new RangeError(
            'driveway.height must be non-negative'
        );
    }

    if (
        width >
        envelope.width
    ) {
        throw new RangeError(
            'driveway.width cannot exceed building width'
        );
    }

    const zOffset =
        config.z ??
        config.zOffset ??
        envelope.bounds.min.z -
            length / 2;

    const y =
        config.y ??
        config.height ??
        0;

    const position =
        point(
            config.x ?? 0,
            y,
            zOffset
        );

    return Object.freeze({
        enabled: true,

        width,
        length,
        height,

        position,

        anchor:
            point(
                position.x,
                position.y,
                position.z
            ),

        bounds:
            createBounds(
                width,
                length,
                height,
                position.z
            )
    });
}