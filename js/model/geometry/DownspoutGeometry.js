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

function createEmpty() {
    return Object.freeze({
        enabled: false,

        radius: 0,

        items:
            Object.freeze([]),

        bounds: null
    });
}

function calculateBounds(
    items,
    radius
) {
    if (
        items.length === 0
    ) {
        return null;
    }

    const minX =
        Math.min(
            ...items.map(
                item =>
                    Math.min(
                        item.top.x,
                        item.bottom.x
                    ) - radius
            )
        );

    const maxX =
        Math.max(
            ...items.map(
                item =>
                    Math.max(
                        item.top.x,
                        item.bottom.x
                    ) + radius
            )
        );

    const minY =
        Math.min(
            ...items.map(
                item =>
                    item.bottom.y
            )
        );

    const maxY =
        Math.max(
            ...items.map(
                item =>
                    item.top.y
            )
        );

    const minZ =
        Math.min(
            ...items.map(
                item =>
                    Math.min(
                        item.top.z,
                        item.bottom.z
                    ) - radius
            )
        );

    const maxZ =
        Math.max(
            ...items.map(
                item =>
                    Math.max(
                        item.top.z,
                        item.bottom.z
                    ) + radius
            )
        );

    return Object.freeze({
        min:
            point(
                minX,
                minY,
                minZ
            ),

        max:
            point(
                maxX,
                maxY,
                maxZ
            )
    });
}

function createDownspout(
    source,
    radius
) {
    if (
        !source?.top ||
        !source?.bottom
    ) {
        return null;
    }

    const dx =
        source.bottom.x -
        source.top.x;

    const dy =
        source.bottom.y -
        source.top.y;

    const dz =
        source.bottom.z -
        source.top.z;

    const height =
        Math.sqrt(
            dx * dx +
            dy * dy +
            dz * dz
        );

    if (
        height <= 0
    ) {
        return null;
    }

    return Object.freeze({
        id:
            source.id,

        side:
            source.side,

        top:
            source.top,

        bottom:
            source.bottom,

        position:
            point(
                (
                    source.top.x +
                    source.bottom.x
                ) / 2,

                (
                    source.top.y +
                    source.bottom.y
                ) / 2,

                (
                    source.top.z +
                    source.bottom.z
                ) / 2
            ),

        height,

        radius,

        shoe:
            source.shoe ??
            null
    });
}

export function createDownspoutGeometry(
    model,
    envelope,
    gutters
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
        !gutters
    ) {
        throw new TypeError(
            'GuttersGeometry is required'
        );
    }

    if (
        !gutters.enabled ||
        !Array.isArray(
            gutters.downspouts
        )
    ) {
        return createEmpty();
    }

    const radius =
        gutters.config?.pipe?.radius ??
        gutters.config?.pipe?.width ??
        0.05;

    const items =
        gutters.downspouts
            .map(
                source =>
                    createDownspout(
                        source,
                        radius
                    )
            )
            .filter(
                Boolean
            );

    return Object.freeze({
        enabled:
            items.length > 0,

        radius,

        items:
            Object.freeze(
                items
            ),

        bounds:
            calculateBounds(
                items,
                radius
            )
    });
}