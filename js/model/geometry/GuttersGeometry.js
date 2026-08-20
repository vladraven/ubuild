const SIDES = Object.freeze([
    'L',
    'R'
]);

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

function edge(
    start,
    end
) {
    return Object.freeze({
        start,
        end,

        length:
            Math.hypot(
                end.x - start.x,
                end.y - start.y,
                end.z - start.z
            )
    });
}

function bounds(
    min,
    max
) {
    return Object.freeze({
        min,
        max,

        width:
            max.x - min.x,

        height:
            max.y - min.y,

        length:
            max.z - min.z,

        center:
            point(
                (
                    min.x +
                    max.x
                ) / 2,

                (
                    min.y +
                    max.y
                ) / 2,

                (
                    min.z +
                    max.z
                ) / 2
            )
    });
}

function assertFinite(
    value,
    name
) {
    if (
        !Number.isFinite(
            value
        )
    ) {
        throw new TypeError(
            `${name} must be finite`
        );
    }
}

function assertPositive(
    value,
    name
) {
    assertFinite(
        value,
        name
    );

    if (
        value <= 0
    ) {
        throw new RangeError(
            `${name} must be greater than zero`
        );
    }
}

function resolveConfig(
    model
) {
    return (
        model.gutters ??
        model.gutter ??
        {}
    );
}

function resolveEnabled(
    config
) {
    if (
        config.enabled ===
        undefined
    ) {
        return false;
    }

    return Boolean(
        config.enabled
    );
}

function resolveDiameter(
    config
) {
    const diameter =
        config.diameter ??
        config.width ??
        0.12;

    assertPositive(
        diameter,
        'gutters.diameter'
    );

    return diameter;
}

function resolveDepth(
    config
) {
    const depth =
        config.depth ??
        0.12;

    assertPositive(
        depth,
        'gutters.depth'
    );

    return depth;
}

function resolveDownspoutDiameter(
    config,
    diameter
) {
    const value =
        config.downspoutDiameter ??
        diameter;

    assertPositive(
        value,
        'gutters.downspoutDiameter'
    );

    return value;
}

function createSideGutter(
    side,
    roof,
    envelope,
    diameter,
    depth
) {
    const eave =
        side === 'L'
            ? roof.eaves.left
            : roof.eaves.right;

    const start =
        eave.front;

    const end =
        eave.back;

    const offset =
        side === 'L'
            ? -depth
            : depth;

    const gutterStart =
        point(
            start.x,
            start.y -
                diameter / 2,
            start.z
        );

    const gutterEnd =
        point(
            end.x,
            end.y -
                diameter / 2,
            end.z
        );

    const min =
        point(
            Math.min(
                gutterStart.x,
                gutterEnd.x
            ) -
                diameter / 2 +
                offset,

            Math.min(
                gutterStart.y,
                gutterEnd.y
            ) -
                diameter / 2,

            Math.min(
                gutterStart.z,
                gutterEnd.z
            )
        );

    const max =
        point(
            Math.max(
                gutterStart.x,
                gutterEnd.x
            ) +
                diameter / 2 +
                offset,

            Math.max(
                gutterStart.y,
                gutterEnd.y
            ) +
                diameter / 2,

            Math.max(
                gutterStart.z,
                gutterEnd.z
            )
        );

    return Object.freeze({
        side,

        diameter,

        depth,

        start:
            gutterStart,

        end:
            gutterEnd,

        edge:
            edge(
                gutterStart,
                gutterEnd
            ),

        anchor:
            point(
                gutterStart.x,
                gutterStart.y,
                gutterStart.z
            ),

        bounds:
            bounds(
                min,
                max
            )
    });
}

function createDownspout(
    side,
    position,
    diameter,
    height,
    index
) {
    const bottom =
        point(
            position.x,
            0,
            position.z
        );

    const top =
        point(
            position.x,
            position.y,
            position.z
        );

    return Object.freeze({
        id:
            `${side}-${index}`,

        side,

        diameter,

        height,

        start:
            top,

        end:
            bottom,

        edge:
            edge(
                top,
                bottom
            ),

        anchor:
            point(
                top.x,
                top.y,
                top.z
            ),

        bounds:
            bounds(
                point(
                    top.x -
                        diameter / 2,
                    0,
                    top.z -
                        diameter / 2
                ),

                point(
                    top.x +
                        diameter / 2,
                    top.y,
                    top.z +
                        diameter / 2
                )
            )
    });
}

function resolveDownspoutPositions(
    config,
    side,
    gutter,
    envelope
) {
    const configured =
        config.downspouts;

    if (
        Array.isArray(
            configured
        ) &&
        configured.length
    ) {
        return configured
            .filter(
                item =>
                    !item.side ||
                    item.side === side
            )
            .map(
                item => {
                    const ratio =
                        Number.isFinite(
                            item.ratio
                        )
                            ? item.ratio
                            : null;

                    const z =
                        ratio !== null
                            ? envelope.length *
                                ratio
                            : (
                                item.z ??
                                envelope.length /
                                    2
                            );

                    return point(
                        gutter.start.x,
                        gutter.start.y,
                        z
                    );
                }
            );
    }

    return [
        point(
            gutter.start.x,
            gutter.start.y,
            envelope.length / 2
        )
    ];
}

function createEmptyGeometry() {
    return Object.freeze({
        enabled: false,

        diameter: 0,

        depth: 0,

        downspoutDiameter: 0,

        eaves:
            Object.freeze({
                L: null,
                R: null
            }),

        downspouts:
            Object.freeze([]),

        outlets:
            Object.freeze([]),

        anchors:
            Object.freeze([]),

        bounds: null
    });
}

export function createGuttersGeometry(
    model,
    envelope,
    roof
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

    if (
        !roof
    ) {
        throw new TypeError(
            'RoofGeometry is required'
        );
    }

    const config =
        resolveConfig(
            model
        );

    if (
        !resolveEnabled(
            config
        )
    ) {
        return createEmptyGeometry();
    }

    const diameter =
        resolveDiameter(
            config
        );

    const depth =
        resolveDepth(
            config
        );

    const downspoutDiameter =
        resolveDownspoutDiameter(
            config,
            diameter
        );

    const eaves = {};

    const downspouts = [];

    const outlets = [];

    const anchors = [];

    for (
        const side
        of SIDES
    ) {
        const gutter =
            createSideGutter(
                side,
                roof,
                envelope,
                diameter,
                depth
            );

        eaves[side] =
            gutter;

        anchors.push(
            gutter.anchor
        );

        const positions =
            resolveDownspoutPositions(
                config,
                side,
                gutter,
                envelope
            );

        positions.forEach(
            (
                position,
                index
            ) => {
                const height =
                    position.y;

                const downspout =
                    createDownspout(
                        side,
                        position,
                        downspoutDiameter,
                        height,
                        index
                    );

                downspouts.push(
                    downspout
                );

                outlets.push(
                    Object.freeze({
                        side,

                        position:
                            point(
                                position.x,
                                position.y,
                                position.z
                            ),

                        diameter:
                            downspoutDiameter
                    })
                );
            }
        );
    }

    const allBounds = [
        ...SIDES.map(
            side =>
                eaves[side].bounds
        ),

        ...downspouts.map(
            item =>
                item.bounds
        )
    ];

    const min =
        point(
            Math.min(
                ...allBounds.map(
                    item =>
                        item.min.x
                )
            ),

            Math.min(
                ...allBounds.map(
                    item =>
                        item.min.y
                )
            ),

            Math.min(
                ...allBounds.map(
                    item =>
                        item.min.z
                )
            )
        );

    const max =
        point(
            Math.max(
                ...allBounds.map(
                    item =>
                        item.max.x
                )
            ),

            Math.max(
                ...allBounds.map(
                    item =>
                        item.max.y
                )
            ),

            Math.max(
                ...allBounds.map(
                    item =>
                        item.max.z
                )
            )
        );

    return Object.freeze({
        enabled: true,

        diameter,

        depth,

        downspoutDiameter,

        eaves:
            Object.freeze(
                eaves
            ),

        downspouts:
            Object.freeze(
                downspouts
            ),

        outlets:
            Object.freeze(
                outlets
            ),

        anchors:
            Object.freeze(
                anchors
            ),

        bounds:
            bounds(
                min,
                max
            )
    });
}