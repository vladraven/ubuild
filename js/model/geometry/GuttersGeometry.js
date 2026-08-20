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

function positive(
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

    return value;
}

function nonNegative(
    value,
    name
) {
    assertFinite(
        value,
        name
    );

    if (
        value < 0
    ) {
        throw new RangeError(
            `${name} must not be negative`
        );
    }

    return value;
}

function resolveConfig(
    model
) {
    const config =
        model.gutters ??
        model.gutter ??
        {};

    return config;
}

function createEmpty() {
    return Object.freeze({
        enabled: false,

        length: 0,

        zOffset: 0,

        eaves:
            Object.freeze({
                left: null,
                right: null
            }),

        config:
            Object.freeze({
                gutter:
                    Object.freeze({
                        lengthOffset: 0,
                        widthOffset: 0,
                        offsetX: 0,
                        offsetY: 0
                    }),

                pipe:
                    Object.freeze({
                        width: 0,
                        depth: 0
                    })
            }),

        profile:
            Object.freeze({
                width: 0,
                height: 0,
                wallThickness: 0
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

function resolveGutterConfig(
    config
) {
    const source =
        config.gutter ??
        {};

    return Object.freeze({
        lengthOffset:
            source.lengthOffset ??
            0,

        widthOffset:
            source.widthOffset ??
            0,

        offsetX:
            source.offsetX ??
            0,

        offsetY:
            source.offsetY ??
            0
    });
}

function resolvePipeConfig(
    config
) {
    const source =
        config.pipe ??
        {};

    const width =
        source.width ??
        config.downspoutWidth ??
        0.08;

    const depth =
        source.depth ??
        config.downspoutDepth ??
        0.06;

    return Object.freeze({
        width:
            positive(
                width,
                'gutters.pipe.width'
            ),

        depth:
            positive(
                depth,
                'gutters.pipe.depth'
            )
    });
}

function resolveProfile(
    config
) {
    const source =
        config.profile ??
        {};

    const width =
        source.width ??
        (
            0.14 +
            (
                config.gutter?.widthOffset ??
                0
            )
        );

    const height =
        source.height ??
        0.12;

    const wallThickness =
        source.thickness ??
        0.01;

    return Object.freeze({
        width:
            positive(
                width,
                'gutters.profile.width'
            ),

        height:
            positive(
                height,
                'gutters.profile.height'
            ),

        wallThickness:
            positive(
                wallThickness,
                'gutters.profile.thickness'
            )
    });
}

function createEave(
    side,
    roof,
    gutterConfig,
    profile
) {
    const source =
        side === 'L'
            ? roof.eaves.left
            : roof.eaves.right;

    const front =
        point(
            source.front.x,
            source.front.y +
                gutterConfig.offsetY -
                profile.height / 2,
            source.front.z
        );

    const back =
        point(
            source.back.x,
            source.back.y +
                gutterConfig.offsetY -
                profile.height / 2,
            source.back.z
        );

    const start =
        point(
            front.x +
                (
                    side === 'L'
                        ? gutterConfig.offsetX
                        : -gutterConfig.offsetX
                ),
            front.y,
            front.z
        );

    const end =
        point(
            back.x +
                (
                    side === 'L'
                        ? gutterConfig.offsetX
                        : -gutterConfig.offsetX
                ),
            back.y,
            back.z
        );

    return Object.freeze({
        side,

        front,

        back,

        start,

        end,

        edge:
            segment(
                start,
                end
            ),

        length:
            source.edge.length +
            gutterConfig.lengthOffset,

        anchor:
            point(
                start.x,
                start.y,
                start.z
            )
    });
}

function resolveDownspoutDefinition(
    config,
    side,
    index,
    eave,
    envelope
) {
    const configured =
        Array.isArray(
            config.downspouts
        )
            ? config.downspouts
                .filter(
                    item =>
                        !item.side ||
                        item.side === side
                )
            : [];

    const item =
        configured[index] ??
        {};

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
                envelope.length / 2
            );

    const clampedZ =
        Math.max(
            0,
            Math.min(
                envelope.length,
                z
            )
        );

    const top =
        point(
            eave.start.x,
            eave.start.y,
            clampedZ
        );

    const bottom =
        point(
            top.x,
            0,
            top.z
        );

    const shoeLength =
        item.shoeLength ??
        0;

    const shoe =
        shoeLength > 0
            ? segment(
                bottom,
                point(
                    bottom.x,
                    bottom.y,
                    bottom.z +
                        (
                            side === 'L'
                                ? shoeLength
                                : -shoeLength
                        )
                )
            )
            : null;

    const segments =
        [
            segment(
                top,
                bottom
            )
        ];

    const strapSpacing =
        item.strapSpacing ??
        3;

    const straps = [];

    const height =
        top.y -
        bottom.y;

    const strapCount =
        height > 0
            ? Math.max(
                1,
                Math.floor(
                    height /
                    strapSpacing
                )
            )
            : 0;

    for (
        let i = 1;
        i <= strapCount;
        i++
    ) {
        const ratio =
            i /
            (
                strapCount +
                1
            );

        straps.push(
            Object.freeze({
                x:
                    top.x,

                y:
                    top.y *
                    (
                        1 -
                        ratio
                    ),

                z:
                    top.z
            })
        );
    }

    return Object.freeze({
        id:
            item.id ??
            `${side}-${index}`,

        side,

        visible:
            item.visible !== false,

        top,

        bottom,

        height,

        diameter:
            item.diameter ??
            null,

        segments:
            Object.freeze(
                segments
            ),

        shoe,

        shoeLength,

        straps:
            Object.freeze(
                straps
            )
    });
}

function createSideDownspouts(
    config,
    side,
    eave,
    envelope
) {
    const configured =
        Array.isArray(
            config.downspouts
        )
            ? config.downspouts
                .filter(
                    item =>
                        !item.side ||
                        item.side === side
                )
            : [];

    if (
        configured.length === 0
    ) {
        return [
            resolveDownspoutDefinition(
                config,
                side,
                0,
                eave,
                envelope
            )
        ];
    }

    return configured.map(
        (
            item,
            index
        ) =>
            resolveDownspoutDefinition(
                {
                    ...config,

                    downspouts:
                        [
                            item
                        ]
                },
                side,
                0,
                eave,
                envelope
            )
    );
}

function calculateBounds(
    eaves,
    downspouts,
    envelope
) {
    const points = [];

    for (
        const eave
        of eaves
    ) {
        points.push(
            eave.start,
            eave.end
        );
    }

    for (
        const downspout
        of downspouts
    ) {
        points.push(
            downspout.top,
            downspout.bottom
        );

        if (
            downspout.shoe
        ) {
            points.push(
                downspout.shoe.start,
                downspout.shoe.end
            );
        }
    }

    if (
        points.length === 0
    ) {
        return null;
    }

    const minX =
        Math.min(
            ...points.map(
                value =>
                    value.x
            )
        );

    const minY =
        Math.min(
            ...points.map(
                value =>
                    value.y
            )
        );

    const minZ =
        Math.min(
            ...points.map(
                value =>
                    value.z
            )
        );

    const maxX =
        Math.max(
            ...points.map(
                value =>
                    value.x
            )
        );

    const maxY =
        Math.max(
            ...points.map(
                value =>
                    value.y
            )
        );

    const maxZ =
        Math.max(
            ...points.map(
                value =>
                    value.z
            )
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
        config.enabled === false
    ) {
        return createEmpty();
    }

    const gutterConfig =
        resolveGutterConfig(
            config
        );

    const pipeConfig =
        resolvePipeConfig(
            config
        );

    const profile =
        resolveProfile(
            config
        );

    const eaves = {
        left:
            createEave(
                'L',
                roof,
                gutterConfig,
                profile
            ),

        right:
            createEave(
                'R',
                roof,
                gutterConfig,
                profile
            )
    };

    const downspouts = [
        ...createSideDownspouts(
            config,
            'L',
            eaves.left,
            envelope
        ),

        ...createSideDownspouts(
            config,
            'R',
            eaves.right,
            envelope
        )
    ];

    const outlets =
        downspouts.map(
            downspout =>
                Object.freeze({
                    id:
                        downspout.id,

                    side:
                        downspout.side,

                    position:
                        downspout.top
                })
        );

    const anchors = [
        eaves.left.anchor,
        eaves.right.anchor
    ];

    const length =
        Math.max(
            eaves.left.length,
            eaves.right.length
        );

    const zOffset =
        config.zOffset ??
        0;

    nonNegative(
        Math.abs(zOffset),
        'gutters.zOffset'
    );

    return Object.freeze({
        enabled: true,

        length,

        zOffset,

        eaves:
            Object.freeze(
                eaves
            ),

        config:
            Object.freeze({
                gutter:
                    gutterConfig,

                pipe:
                    pipeConfig
            }),

        profile,

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
            calculateBounds(
                [
                    eaves.left,
                    eaves.right
                ],

                downspouts,

                envelope
            )
    });
}