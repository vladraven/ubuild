const DEFAULT_RADIUS =
    0.05;

const UPPER_ELBOW_LENGTH =
    0.15;

const UPPER_ELBOW_ANGLE_DEGREES =
    22.5;

const LOWER_ELBOW_VERTICAL =
    0.25;

const LOWER_ELBOW_HORIZONTAL =
    0.25;

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

function createSegment(
    start,
    end
) {
    return Object.freeze({
        start,
        end
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

function createBounds(
    items,
    radius
) {
    if (
        items.length === 0
    ) {
        return null;
    }

    const points =
        items.flatMap(
            item => [
                item.upperElbow.start,
                item.upperElbow.end,
                item.vertical.start,
                item.vertical.end,
                item.lowerElbow.start,
                item.lowerElbow.end
            ]
        );

    const minX =
        Math.min(
            ...points.map(
                item =>
                    item.x
            )
        ) -
        radius;

    const maxX =
        Math.max(
            ...points.map(
                item =>
                    item.x
            )
        ) +
        radius;

    const minY =
        Math.min(
            ...points.map(
                item =>
                    item.y
            )
        ) -
        radius;

    const maxY =
        Math.max(
            ...points.map(
                item =>
                    item.y
            )
        ) +
        radius;

    const minZ =
        Math.min(
            ...points.map(
                item =>
                    item.z
            )
        ) -
        radius;

    const maxZ =
        Math.max(
            ...points.map(
                item =>
                    item.z
            )
        ) +
        radius;

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

function resolveDirection(
    source
) {
    switch (
        source.side
    ) {
        case 'L':
        case 'left':
            return Object.freeze({
                x: -1,
                z: 0
            });

        case 'R':
        case 'right':
            return Object.freeze({
                x: 1,
                z: 0
            });

        default:
            return Object.freeze({
                x: 0,
                z: 0
            });
    }
}

function resolveSideEave(
    source,
    gutters
) {
    switch (
        source.side
    ) {
        case 'L':
        case 'left':
            return gutters.eaves?.left;

        case 'R':
        case 'right':
            return gutters.eaves?.right;

        default:
            return null;
    }
}

function resolveEavePoint(
    source,
    eave
) {
    const front =
        eave?.front;

    const back =
        eave?.back;

    if (
        !front &&
        !back
    ) {
        return null;
    }

    if (
        !front
    ) {
        return back;
    }

    if (
        !back
    ) {
        return front;
    }

    const frontDistance =
        Math.abs(
            source.position.z -
            front.z
        );

    const backDistance =
        Math.abs(
            source.position.z -
            back.z
        );

    return (
        frontDistance <=
        backDistance
    )
        ? front
        : back;
}

function resolveGutterConnectionY(
    source,
    gutters
) {
    const eave =
        resolveSideEave(
            source,
            gutters
        );

    const eavePoint =
        resolveEavePoint(
            source,
            eave
        );

    const innerHeight =
        gutters.profile?.innerHeight;

    const thickness =
        gutters.profile?.thickness;

    if (
        !Number.isFinite(
            eavePoint?.y
        )
    ) {
        return null;
    }

    if (
        !Number.isFinite(
            innerHeight
        )
    ) {
        return null;
    }

    const bottomY =
        eavePoint.y -
        innerHeight;

    if (
        !Number.isFinite(
            thickness
        )
    ) {
        return bottomY;
    }

    return (
        bottomY +
        thickness / 2
    );
}

function resolveUpperElbowOffsets() {
    const angleRadians =
        UPPER_ELBOW_ANGLE_DEGREES *
        Math.PI /
        180;

    return Object.freeze({
        horizontal:
            UPPER_ELBOW_LENGTH *
            Math.sin(
                angleRadians
            ),

        vertical:
            UPPER_ELBOW_LENGTH *
            Math.cos(
                angleRadians
            )
    });
}

function createDownspout(
    source,
    gutterConnectionY
) {
    if (
        !source?.position
    ) {
        return null;
    }

    if (
        !Number.isFinite(
            gutterConnectionY
        )
    ) {
        return null;
    }

    const direction =
        resolveDirection(
            source
        );

    const upperOffsets =
        resolveUpperElbowOffsets();

    /*
     * The vertical pipe remains at the exact
     * original working wall position.
     */

    const top =
        point(
            source.position.x,
            gutterConnectionY -
                upperOffsets.vertical,
            source.position.z
        );

    const bottom =
        point(
            source.position.x,
            LOWER_ELBOW_VERTICAL,
            source.position.z
        );

    const height =
        top.y -
        bottom.y;

    if (
        height <= 0
    ) {
        return null;
    }

    /*
     * The upper elbow starts at the gutter and
     * reaches the unchanged vertical pipe.
     */

    const upperElbowStart =
        point(
            source.position.x +
                direction.x *
                upperOffsets.horizontal,
            gutterConnectionY,
            source.position.z +
                direction.z *
                upperOffsets.horizontal
        );

    const upperElbowEnd =
        top;

    const lowerElbowStart =
        bottom;

    const lowerElbowEnd =
        point(
            bottom.x +
                direction.x *
                LOWER_ELBOW_HORIZONTAL,
            0,
            bottom.z +
                direction.z *
                LOWER_ELBOW_HORIZONTAL
        );

    return Object.freeze({
        id:
            source.id,

        side:
            source.side,

        top,

        bottom,

        position:
            point(
                source.position.x,
                (
                    top.y +
                    bottom.y
                ) / 2,
                source.position.z
            ),

        height,

        radius:
            DEFAULT_RADIUS,

        upperElbow:
            createSegment(
                upperElbowStart,
                upperElbowEnd
            ),

        vertical:
            createSegment(
                top,
                bottom
            ),

        lowerElbow:
            createSegment(
                lowerElbowStart,
                lowerElbowEnd
            )
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

    const items =
        gutters.downspouts
            .map(
                source => {
                    const gutterConnectionY =
                        resolveGutterConnectionY(
                            source,
                            gutters
                        );

                    return createDownspout(
                        source,
                        gutterConnectionY
                    );
                }
            )
            .filter(
                Boolean
            );

    return Object.freeze({
        enabled:
            items.length > 0,

        radius:
            DEFAULT_RADIUS,

        items:
            Object.freeze(
                items
            ),

        bounds:
            createBounds(
                items,
                DEFAULT_RADIUS
            )
    });
}