const SIDES = Object.freeze([
    'L',
    'R'
]);

const DEFAULT_GUTTER_WIDTH = 0.16;
const DEFAULT_GUTTER_THICKNESS = 0.01;

const INNER_WALL_RATIO = 1.75;
const OUTER_WALL_RATIO = 0.75;

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

function segment(
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
            max.x -
            min.x,

        height:
            max.y -
            min.y,

        length:
            max.z -
            min.z,

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

function positive(
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

    return value;
}

function nonNegative(
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

    return value;
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

function resolveProfile(
    config
) {
    const source =
        config.profile ??
        {};

    const width =
        positive(
            source.width ??
                DEFAULT_GUTTER_WIDTH,
            'gutters.profile.width'
        );

    const thickness =
        positive(
            source.thickness ??
                DEFAULT_GUTTER_THICKNESS,
            'gutters.profile.thickness'
        );

    return Object.freeze({
        width,

        thickness,

        innerHeight:
            width *
            INNER_WALL_RATIO,

        outerHeight:
            width *
            OUTER_WALL_RATIO,

        innerHeightRatio:
            INNER_WALL_RATIO,

        outerHeightRatio:
            OUTER_WALL_RATIO
    });
}

function resolveGutterOffset(
    config
) {
    const source =
        config.gutter ??
        {};

    return Object.freeze({
        lengthOffset:
            source.lengthOffset ??
            0,

        offsetX:
            source.offsetX ??
            0,

        offsetY:
            source.offsetY ??
            0
    });
}

function createEave(
    side,
    roof,
    envelope,
    offset,
    profile
) {
    const source =
        side === 'L'
            ? roof.eaves.left
            : roof.eaves.right;

    /*
     * The gutter is parallel to the wall.
     *
     * The roof eave gives us the roof-edge
     * line. The gutter is shifted vertically
     * below that edge and horizontally so
     * half of its width projects outside the
     * roof edge.
     */

    const outward =
        side === 'L'
            ? -1
            : 1;

    const x =
        source.front.x +
        outward *
        (
            profile.width / 2
        ) +
        outward *
        offset.offsetX;

    const front =
        point(
            x,
            source.front.y +
                offset.offsetY,
            source.front.z
        );

    const back =
        point(
            x,
            source.back.y +
                offset.offsetY,
            source.back.z
        );

    return Object.freeze({
        side,

        front,

        back,

        edge:
            segment(
                front,
                back
            ),

        length:
            source.edge.length +
            offset.lengthOffset
    });
}

function createEmpty() {
    return Object.freeze({
        enabled: false,

        length: 0,

        eaves:
            Object.freeze({
                left: null,
                right: null
            }),

        profile:
            Object.freeze({
                width: 0,
                thickness: 0,
                innerHeight: 0,
                outerHeight: 0,
                innerHeightRatio:
                    INNER_WALL_RATIO,
                outerHeightRatio:
                    OUTER_WALL_RATIO
            }),

        config:
            Object.freeze({
                gutter:
                    Object.freeze({
                        lengthOffset: 0,
                        offsetX: 0,
                        offsetY: 0
                    })
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

function createBounds(
    eaves,
    envelope,
    profile
) {
    const points = [];

    for (
        const eave
        of eaves
    ) {
        if (!eave) {
            continue;
        }

        points.push(
            eave.front,
            eave.back
        );
    }

    if (
        points.length === 0
    ) {
        return null;
    }

    const xs =
        points.map(
            value => value.x
        );

    const ys =
        points.map(
            value => value.y
        );

    const zs =
        points.map(
            value => value.z
        );

    const minX =
        Math.min(
            ...xs
        );

    const maxX =
        Math.max(
            ...xs
        );

    const minY =
        Math.min(
            ...ys
        ) -
        profile.innerHeight;

    const maxY =
        Math.max(
            ...ys
        );

    const minZ =
        Math.min(
            ...zs
        );

    const maxZ =
        Math.max(
            ...zs
        );

    return bounds(
        point(
            Math.min(
                minX,
                -envelope.width / 2
            ),
            minY,
            Math.min(
                minZ,
                0
            )
        ),

        point(
            Math.max(
                maxX,
                envelope.width / 2
            ),
            maxY,
            Math.max(
                maxZ,
                envelope.length
            )
        )
    );
}

export function createGuttersGeometry(
    model,
    envelope,
    roof
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

    if (!roof) {
        throw new TypeError(
            'RoofGeometry is required'
        );
    }

    const config =
        resolveConfig(
            model
        );

    if (
        config.enabled === false
    ) {
        return createEmpty();
    }

    const profile =
        resolveProfile(
            config
        );

    const offset =
        resolveGutterOffset(
            config
        );

    nonNegative(
        Math.abs(
            offset.offsetX
        ),
        'gutters.gutter.offsetX'
    );

    nonNegative(
        Math.abs(
            offset.offsetY
        ),
        'gutters.gutter.offsetY'
    );

    const left =
        createEave(
            'L',
            roof,
            envelope,
            offset,
            profile
        );

    const right =
        createEave(
            'R',
            roof,
            envelope,
            offset,
            profile
        );

    const eaves =
        Object.freeze({
            left,
            right
        });

    const length =
        Math.max(
            left.length,
            right.length
        );

    /*
     * Deliberately empty.
     *
     * There are no vertical downspouts.
     * There are no shoes.
     * There are no straps.
     * There are no outlets.
     */

    const downspouts =
        Object.freeze([]);

    const outlets =
        Object.freeze([]);

    const anchors =
        Object.freeze([
            left.front,
            right.front
        ]);

    return Object.freeze({
        enabled: true,

        length,

        eaves,

        profile,

        config:
            Object.freeze({
                gutter:
                    offset
            }),

        downspouts,

        outlets,

        anchors,

        bounds:
            createBounds(
                [
                    left,
                    right
                ],
                envelope,
                profile
            )
    });
}