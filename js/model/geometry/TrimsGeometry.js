const SIDES = Object.freeze([
    'front',
    'back',
    'left',
    'right'
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

function assertFinite(
    value,
    name
) {
    if (
        !Number.isFinite(value)
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

function resolveConfig(
    model
) {
    return (
        model.trims ??
        {}
    );
}

function resolveProfile(
    config
) {
    const profile =
        config.profile ??
        {};

    return Object.freeze({
        width:
            positive(
                profile.width ??
                    0.12,
                'trims.profile.width'
            ),

        depth:
            positive(
                profile.depth ??
                    0.06,
                'trims.profile.depth'
            ),

        thickness:
            positive(
                profile.thickness ??
                    0.01,
                'trims.profile.thickness'
            )
    });
}

function createEmpty() {
    return Object.freeze({
        enabled: false,

        profile:
            Object.freeze({
                width: 0,
                depth: 0,
                thickness: 0
            }),

        eaves:
            Object.freeze([]),

        rake:
            Object.freeze([]),

        ridge:
            Object.freeze([]),

        roofEdges:
            Object.freeze([]),

        corners:
            Object.freeze([]),

        bounds: null
    });
}

function createEaveTrim(
    side,
    roof,
    profile
) {
    const eave =
        side === 'left'
            ? roof.eaves.left
            : roof.eaves.right;

    const start =
        point(
            eave.front.x,
            eave.front.y,
            eave.front.z
        );

    const end =
        point(
            eave.back.x,
            eave.back.y,
            eave.back.z
        );

    return Object.freeze({
        id:
            `eave-${side}`,

        type:
            'eave',

        side,

        profile,

        start,

        end,

        segment:
            segment(
                start,
                end
            ),

        anchors:
            Object.freeze([
                start,
                end
            ])
    });
}

function createRakeTrim(
    side,
    roof,
    profile
) {
    const rake =
        side === 'front'
            ? roof.rake.front
            : roof.rake.back;

    if (!rake) {
        return null;
    }

    const start =
        point(
            rake.start.x,
            rake.start.y,
            rake.start.z
        );

    const end =
        point(
            rake.end.x,
            rake.end.y,
            rake.end.z
        );

    return Object.freeze({
        id:
            `rake-${side}`,

        type:
            'rake',

        side,

        profile,

        start,

        end,

        segment:
            segment(
                start,
                end
            ),

        anchors:
            Object.freeze([
                start,
                end
            ])
    });
}

function createRidgeTrim(
    roof,
    profile
) {
    if (
        !roof.ridge
    ) {
        return null;
    }

    const start =
        point(
            roof.ridge.start.x,
            roof.ridge.start.y,
            roof.ridge.start.z
        );

    const end =
        point(
            roof.ridge.end.x,
            roof.ridge.end.y,
            roof.ridge.end.z
        );

    return Object.freeze({
        id:
            'ridge',

        type:
            'ridge',

        side:
            null,

        profile,

        start,

        end,

        segment:
            segment(
                start,
                end
            ),

        anchors:
            Object.freeze([
                start,
                end
            ])
    });
}

function createRoofEdge(
    id,
    edge,
    profile
) {
    if (!edge) {
        return null;
    }

    const start =
        point(
            edge.start.x,
            edge.start.y,
            edge.start.z
        );

    const end =
        point(
            edge.end.x,
            edge.end.y,
            edge.end.z
        );

    return Object.freeze({
        id,

        type:
            'roof-edge',

        side:
            null,

        profile,

        start,

        end,

        segment:
            segment(
                start,
                end
            ),

        anchors:
            Object.freeze([
                start,
                end
            ])
    });
}

function collectPoints(
    trims
) {
    const points = [];

    for (
        const trim
        of trims
    ) {
        if (!trim) {
            continue;
        }

        points.push(
            trim.start,
            trim.end
        );
    }

    return points;
}

function calculateBounds(
    trims
) {
    const points =
        collectPoints(
            trims
        );

    if (
        points.length === 0
    ) {
        return null;
    }

    const min =
        point(
            Math.min(
                ...points.map(
                    value =>
                        value.x
                )
            ),
            Math.min(
                ...points.map(
                    value =>
                        value.y
                )
            ),
            Math.min(
                ...points.map(
                    value =>
                        value.z
                )
            )
        );

    const max =
        point(
            Math.max(
                ...points.map(
                    value =>
                        value.x
                )
            ),
            Math.max(
                ...points.map(
                    value =>
                        value.y
                )
            ),
            Math.max(
                ...points.map(
                    value =>
                        value.z
                )
            )
        );

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

export function createTrimsGeometry(
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

    const eaves = [
        createEaveTrim(
            'left',
            roof,
            profile
        ),

        createEaveTrim(
            'right',
            roof,
            profile
        )
    ];

    const rake = [
        createRakeTrim(
            'front',
            roof,
            profile
        ),

        createRakeTrim(
            'back',
            roof,
            profile
        )
    ].filter(
        Boolean
    );

    const ridge = [
        createRidgeTrim(
            roof,
            profile
        )
    ].filter(
        Boolean
    );

    const roofEdges = [
        createRoofEdge(
            'left-rake',
            roof.rake?.left,
            profile
        ),

        createRoofEdge(
            'right-rake',
            roof.rake?.right,
            profile
        ),

        createRoofEdge(
            'front-edge',
            roof.edges?.front,
            profile
        ),

        createRoofEdge(
            'back-edge',
            roof.edges?.back,
            profile
        )
    ].filter(
        Boolean
    );

    const corners = [
        ...eaves,
        ...rake,
        ...ridge,
        ...roofEdges
    ]
        .flatMap(
            trim => [
                ...trim.anchors
            ]
        );

    const allTrims = [
        ...eaves,
        ...rake,
        ...ridge,
        ...roofEdges
    ];

    return Object.freeze({
        enabled: true,

        profile,

        eaves:
            Object.freeze(
                eaves
            ),

        rake:
            Object.freeze(
                rake
            ),

        ridge:
            Object.freeze(
                ridge
            ),

        roofEdges:
            Object.freeze(
                roofEdges
            ),

        corners:
            Object.freeze(
                corners
            ),

        bounds:
            calculateBounds(
                allTrims
            )
    });
}