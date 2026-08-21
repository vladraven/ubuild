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

    // Side labels (Front / Back / Left / Right) — restored from legacy.
    // Envelope: X ∈ [-halfW, halfW], Z ∈ [0, length]. Labels sit outside
    // the footprint so they remain readable from the default exterior view.
    const labelOffset = 8;
    const labelY = 0.05;
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;

    const labels = Object.freeze({
        F: Object.freeze({
            text: 'Front',
            x: centerX,
            y: labelY,
            z: min.z - labelOffset,
            rotation: Object.freeze([-Math.PI / 2, 0, 0])
        }),
        B: Object.freeze({
            text: 'Back',
            x: centerX,
            y: labelY,
            z: max.z + labelOffset,
            rotation: Object.freeze([-Math.PI / 2, 0, Math.PI])
        }),
        R: Object.freeze({
            text: 'Right',
            x: max.x + labelOffset,
            y: labelY,
            z: centerZ,
            rotation: Object.freeze([-Math.PI / 2, 0, Math.PI / 2])
        }),
        L: Object.freeze({
            text: 'Left',
            x: min.x - labelOffset,
            y: labelY,
            z: centerZ,
            rotation: Object.freeze([-Math.PI / 2, 0, -Math.PI / 2])
        })
    });

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
        }),

        labels
    });
}