const FLOOR_THICKNESS =
    0.15;

const COLUMN_SPACING =
    6.096;

const COLUMN_RADIUS =
    0.1;

const DEFAULT_WALL_THICKNESS =
    0;

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

function createColumnPositions(
    width,
    length,
    spacing,
    zOffset
) {
    const positions =
        [];

    const halfWidth =
        width / 2;

    const halfLength =
        length / 2;

    const xCount =
        Math.max(
            1,
            Math.ceil(
                width /
                spacing
            )
        );

    const zCount =
        Math.max(
            1,
            Math.ceil(
                length /
                spacing
            )
        );

    const xStep =
        width /
        xCount;

    const zStep =
        length /
        zCount;

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
                zOffset -
                halfLength +
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

function createColumnAnchors(
    positions,
    height,
    radius
) {
    return Object.freeze(
        positions.map(
            (
                position,
                index
            ) =>
                Object.freeze({
                    id:
                        `column-${index + 1}`,

                    anchor:
                        point(
                            position.x,
                            0,
                            position.z
                        ),

                    base:
                        point(
                            position.x,
                            0,
                            position.z
                        ),

                    top:
                        point(
                            position.x,
                            height,
                            position.z
                        ),

                    height,

                    radius
                })
        )
    );
}

function validate(
    value,
    name
) {
    if (
        !Number.isFinite(
            value
        ) ||
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
        !Number.isFinite(
            value
        ) ||
        value < 0
    ) {
        throw new RangeError(
            `${name} must be zero or greater`
        );
    }
}

function resolveWallThickness(
    model
) {
    const thickness =
        model.walls?.thickness;

    if (
        !Number.isFinite(
            thickness
        ) ||
        thickness < 0
    ) {
        return DEFAULT_WALL_THICKNESS;
    }

    return thickness;
}

function createDisabledGeometry(
    config
) {
    return Object.freeze({
        enabled: false,

        width: 0,

        length: 0,

        height: 0,

        zOffset: 0,

        zStart: 0,

        floorThickness: 0,

        bounds: null,

        floor: null,

        columnPositions:
            Object.freeze([]),

        columns:
            Object.freeze([]),

        color:
            config?.color ??
            null
    });
}

export function createMezzanineGeometry(
    model,
    envelope
) {
    if (
        !model
    ) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (
        !envelope
    ) {
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
        return createDisabledGeometry(
            config
        );
    }

    const buildingWidth =
        envelope.width;

    const buildingLength =
        envelope.length;

    const buildingHeight =
        envelope.height;

    validate(
        buildingWidth,
        'envelope.width'
    );

    validate(
        buildingLength,
        'envelope.length'
    );

    validate(
        buildingHeight,
        'envelope.height'
    );

    const coverage =
        config.coverage ?? 1;

    if (
        !Number.isFinite(
            coverage
        ) ||
        coverage <= 0 ||
        coverage > 1
    ) {
        throw new RangeError(
            'mezzanine.coverage must be greater than zero and no greater than one'
        );
    }

    const wallThickness =
        resolveWallThickness(
            model
        );

    const interiorWidth =
        buildingWidth -
        wallThickness * 2;

    const interiorLength =
        buildingLength -
        wallThickness * 2;

    if (
        interiorWidth <= 0
    ) {
        throw new RangeError(
            'Building interior width must be greater than zero'
        );
    }

    if (
        interiorLength <= 0
    ) {
        throw new RangeError(
            'Building interior length must be greater than zero'
        );
    }

    const requestedWidth =
        config.width ??
        interiorWidth *
        coverage;

    const width =
        Math.min(
            requestedWidth,
            interiorWidth
        );

    const requestedLength =
        config.length ??
        interiorLength;

    const length =
        Math.min(
            requestedLength,
            interiorLength
        );

    const height =
        config.height ??
        buildingHeight;

    const zStart =
        wallThickness +
        (
            config.z ?? 0
        );

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

    validateNonNegative(
        config.z ?? 0,
        'mezzanine.z'
    );

    if (
        requestedWidth >
        interiorWidth
    ) {
        throw new RangeError(
            'mezzanine.width exceeds building interior width'
        );
    }

    if (
        requestedLength >
        interiorLength
    ) {
        throw new RangeError(
            'mezzanine.length exceeds building interior length'
        );
    }

    if (
        zStart +
        length >
        buildingLength -
        wallThickness
    ) {
        throw new RangeError(
            'mezzanine extends beyond rear wall'
        );
    }

    if (
        height >=
        buildingHeight
    ) {
        throw new RangeError(
            'mezzanine.height must be below roof/eave height'
        );
    }

    const floorThickness =
        config.floorThickness ??
        FLOOR_THICKNESS;

    const columnSpacing =
        config.columnSpacing ??
        COLUMN_SPACING;

    const columnRadius =
        config.columnRadius ??
        COLUMN_RADIUS;

    validate(
        floorThickness,
        'mezzanine.floorThickness'
    );

    validate(
        columnSpacing,
        'mezzanine.columnSpacing'
    );

    validate(
        columnRadius,
        'mezzanine.columnRadius'
    );

    const zOffset =
        zStart +
        length / 2;

    const bounds =
        createBounds(
            width,
            length,
            height,
            zOffset
        );

    const columnPositions =
        createColumnPositions(
            width,
            length,
            columnSpacing,
            zOffset
        );

    const columnHeight =
        height -
        floorThickness;

    const columns =
        createColumnAnchors(
            columnPositions,
            columnHeight,
            columnRadius
        );

    const floor =
        Object.freeze({
            anchor:
                point(
                    0,
                    height -
                    floorThickness,
                    zOffset
                ),

            top:
                point(
                    0,
                    height,
                    zOffset
                ),

            bottom:
                point(
                    0,
                    height -
                    floorThickness,
                    zOffset
                ),

            width,

            length,

            thickness:
                floorThickness,

            bounds
        });

    return Object.freeze({
        enabled: true,

        width,

        length,

        height,

        zOffset,

        zStart,

        floorThickness,

        bounds,

        floor,

        columnPositions,

        columns,

        column:
            Object.freeze({
                radius:
                    columnRadius,

                spacing:
                    columnSpacing
            }),

        color:
            config.color ??
            null
    });
}