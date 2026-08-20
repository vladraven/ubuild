function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function createBounds(min, max) {
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

export function createFoundationGeometry(
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

    const {
        enabled,
        height
    } = model.foundation;

    if (
        !Number.isFinite(height) ||
        height < 0
    ) {
        throw new RangeError(
            'foundation.height must be non-negative'
        );
    }

    const {
        min,
        max
    } = envelope.bounds;

    const foundationMin = point(
        min.x,
        -height,
        min.z
    );

    const foundationMax = point(
        max.x,
        0,
        max.z
    );

    return Object.freeze({
        enabled,
        height,

        bounds: createBounds(
            foundationMin,
            foundationMax
        ),

        footprint: Object.freeze({
            min: point(
                min.x,
                0,
                min.z
            ),
            max: point(
                max.x,
                0,
                max.z
            )
        }),

        top: Object.freeze({
            y: 0,
            bounds: createBounds(
                point(
                    min.x,
                    0,
                    min.z
                ),
                point(
                    max.x,
                    0,
                    max.z
                )
            )
        }),

        bottom: Object.freeze({
            y: -height,
            bounds: createBounds(
                foundationMin,
                point(
                    max.x,
                    -height,
                    max.z
                )
            )
        })
    });
}