function point(x, y, z) {
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
        min: point(
            -width / 2,
            0,
            zOffset - length / 2
        ),

        max: point(
            width / 2,
            height,
            zOffset + length / 2
        ),

        center: point(
            0,
            height / 2,
            zOffset
        ),

        width,
        length,
        height
    });
}

function createColumnPositions(
    width,
    length,
    spacing
) {
    const positions = [];

    const halfWidth =
        width / 2;

    const halfLength =
        length / 2;

    const xCount =
        Math.max(
            1,
            Math.ceil(
                width / spacing
            )
        );

    const zCount =
        Math.max(
            1,
            Math.ceil(
                length / spacing
            )
        );

    const xStep =
        width / xCount;

    const zStep =
        length / zCount;

    for (
        let ix = 0;
        ix <= xCount;
        ix++
    ) {
        const x =
            -halfWidth +
            ix * xStep;

        for (
            let iz = 0;
            iz <= zCount;
            iz++
        ) {
            const z =
                -halfLength +
                iz * zStep;

            positions.push(
                point(
                    x,
                    0,
                    z
                )
            );
        }
    }

    return Object.freeze(
        positions
    );
}

function validate(
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

export function createMezzanineGeometry(
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
        model.mezzanine;

    if (
        !config ||
        !config.enabled
    ) {
        return Object.freeze({
            enabled: false,

            width: 0,
            length: 0,
            height: 0,
            zOffset: 0,

            floorThickness: 0,

            bounds: null,

            columnPositions:
                Object.freeze([]),

            color:
                config?.color ??
                null
        });
    }

    const coverage =
        config.coverage ?? 1;

    if (
        !Number.isFinite(coverage) ||
        coverage <= 0 ||
        coverage > 1
    ) {
        throw new RangeError(
            'mezzanine.coverage must be greater than zero and no greater than one'
        );
    }

    const width =
        config.width ??
        envelope.width * coverage;

    const length =
        config.length ??
        envelope.length;

    const height =
        config.height ??
        model.dimensions.height;

    const zOffset =
        config.zOffset ??
        config.z ??
        0;

    const floorThickness =
        config.floorThickness ??
        0.15;

    const columnSpacing =
        config.columnSpacing ??
        6.096;

    validate(
        width,
        'mezzanine.width'
    );

    validate(
        length,
        'mezzanine.length'
    );

    validate(
        height,
        'mezzanine.height'
    );

    validate(
        floorThickness,
        'mezzanine.floorThickness'
    );

    validate(
        columnSpacing,
        'mezzanine.columnSpacing'
    );

    if (
        width > envelope.width
    ) {
        throw new RangeError(
            'mezzanine.width exceeds building width'
        );
    }

    if (
        length > envelope.length
    ) {
        throw new RangeError(
            'mezzanine.length exceeds building length'
        );
    }

    if (
        height >=
        model.dimensions.height
    ) {
        throw new RangeError(
            'mezzanine.height must be below roof/eave height'
        );
    }

    const columnPositions =
        createColumnPositions(
            width,
            length,
            columnSpacing
        );

    return Object.freeze({
        enabled: true,

        width,
        length,
        height,

        zOffset,

        floorThickness,

        bounds:
            createBounds(
                width,
                length,
                height,
                zOffset
            ),

        columnPositions,

        column: Object.freeze({
            radius:
                config.columnRadius ??
                0.1,

            spacing:
                columnSpacing
        }),

        color:
            config.color ??
            null
    });
}