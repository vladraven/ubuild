function point(x, y, z) {
    return Object.freeze({
        x,
        y,
        z
    });
}

function createRail(
    x,
    y,
    z
) {
    return Object.freeze({
        anchor: point(
            x,
            y,
            z
        ),

        position: point(
            x,
            y,
            z
        ),

        width: 0.15,
        height: 0.25
    });
}

function validatePercent(
    value
) {
    if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
    ) {
        throw new RangeError(
            'crane.zPercent must be between 0 and 1'
        );
    }
}

export function createCraneGeometry(
    model,
    envelope,
    walls,
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

    if (!walls) {
        throw new TypeError(
            'WallGeometry is required'
        );
    }

    if (!roof) {
        throw new TypeError(
            'RoofGeometry is required'
        );
    }

    const config =
        model.crane;

    if (
        !config ||
        !config.enabled
    ) {
        return Object.freeze({
            enabled: false,

            zPercent:
                config?.zPercent ??
                config?.z ??
                0,

            runwayLength: 0,

            rails:
                Object.freeze({
                    left: null,
                    right: null
                }),

            bridge: null,

            trolley: null,

            cable: null
        });
    }

    const zPercent =
        config.zPercent ??
        config.z ??
        0;

    validatePercent(
        zPercent
    );

    const runwayLength =
        config.runwayLength ??
        envelope.length;

    if (
        !Number.isFinite(
            runwayLength
        ) ||
        runwayLength <= 0
    ) {
        throw new RangeError(
            'crane.runwayLength must be greater than zero'
        );
    }

    if (
        runwayLength >
        envelope.length
    ) {
        throw new RangeError(
            'crane.runwayLength cannot exceed building length'
        );
    }

    const eaveHeight =
        model.dimensions.height;

    const roofHeight =
        roof.ridge?.height ??
        eaveHeight;

    const bridgeY =
        eaveHeight +
        (
            roofHeight -
            eaveHeight
        ) *
        zPercent;

    const railX =
        envelope.width / 2;

    const railY =
        bridgeY -
        0.125;

    const bridgeWidth =
        config.bridgeWidth ??
        envelope.width;

    const bridgeZ =
        config.bridgeZ ??
        0;

    const trolleyZ =
        config.trolleyZ ??
        bridgeZ;

    const cableLength =
        config.cableLength ??
        1.2;

    const rails =
        Object.freeze({
            left:
                createRail(
                    -railX,
                    railY,
                    0
                ),

            right:
                createRail(
                    railX,
                    railY,
                    0
                )
        });

    const bridge =
        Object.freeze({
            anchor:
                point(
                    0,
                    bridgeY,
                    bridgeZ
                ),

            position:
                point(
                    0,
                    bridgeY,
                    bridgeZ
                ),

            width:
                bridgeWidth,

            height: 0.35,

            depth: 0.3
        });

    const trolley =
        Object.freeze({
            anchor:
                point(
                    0,
                    bridgeY -
                        0.2,
                    trolleyZ
                ),

            position:
                point(
                    0,
                    bridgeY -
                        0.2,
                    trolleyZ
                ),

            width: 0.4,
            height: 0.4,
            depth: 0.4
        });

    const cable =
        Object.freeze({
            anchor:
                point(
                    0,
                    bridgeY -
                        0.9,
                    trolleyZ
                ),

            position:
                point(
                    0,
                    bridgeY -
                        0.9 -
                        cableLength / 2,
                    trolleyZ
                ),

            length:
                cableLength,

            radius:
                config.cableRadius ??
                0.015
        });

    return Object.freeze({
        enabled: true,

        zPercent,

        runwayLength,

        rails,

        bridge,

        trolley,

        cable,

        bounds:
            Object.freeze({
                width:
                    envelope.width,

                length:
                    runwayLength,

                height:
                    bridgeY,

                min:
                    point(
                        -envelope.width / 2,
                        0,
                        -runwayLength / 2
                    ),

                max:
                    point(
                        envelope.width / 2,
                        bridgeY,
                        runwayLength / 2
                    )
            })
    });
}