function point(x, y, z) {
    return Object.freeze({
        x,
        y,
        z
    });
}

function validateFinite(
    value,
    name
) {
    if (!Number.isFinite(value)) {
        throw new TypeError(
            `${name} must be a finite number`
        );
    }
}

function validatePositive(
    value,
    name
) {
    validateFinite(
        value,
        name
    );

    if (value <= 0) {
        throw new RangeError(
            `${name} must be greater than zero`
        );
    }
}

function validatePercent(
    value
) {
    validateFinite(
        value,
        'crane.zPercent'
    );

    if (
        value < 0 ||
        value > 1
    ) {
        throw new RangeError(
            'crane.zPercent must be between 0 and 1'
        );
    }
}

function createRail(
    x,
    y,
    z,
    length
) {
    return Object.freeze({
        anchor:
            point(
                x,
                y,
                z
            ),

        position:
            point(
                x,
                y,
                z
            ),

        width: 0.15,

        height: 0.25,

        length
    });
}

function createBounds(
    width,
    length,
    height
) {
    return Object.freeze({
        min:
            point(
                -width / 2,
                0,
                -length / 2
            ),

        max:
            point(
                width / 2,
                height,
                length / 2
            ),

        width,
        length,
        height
    });
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

            cable: null,

            bounds: null
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

    validatePositive(
        runwayLength,
        'crane.runwayLength'
    );

    if (
        runwayLength >
        envelope.length
    ) {
        throw new RangeError(
            'crane.runwayLength cannot exceed building length'
        );
    }

    const bridgeWidth =
        config.bridgeWidth ??
        envelope.width;

    validatePositive(
        bridgeWidth,
        'crane.bridgeWidth'
    );

    if (
        bridgeWidth >
        envelope.width
    ) {
        throw new RangeError(
            'crane.bridgeWidth cannot exceed building width'
        );
    }

    const cableLength =
        config.cableLength ??
        1.2;

    validatePositive(
        cableLength,
        'crane.cableLength'
    );

    const cableRadius =
        config.cableRadius ??
        0.015;

    validatePositive(
        cableRadius,
        'crane.cableRadius'
    );

    const eaveHeight =
        model.dimensions.height;

    const ridgeHeight =
        roof.ridge?.height ??
        eaveHeight;

    const bridgeY =
        eaveHeight +
        (
            ridgeHeight -
            eaveHeight
        ) *
        zPercent;

    const bridgeZ =
        config.bridgeZ ??
        0;

    const trolleyZ =
        config.trolleyZ ??
        bridgeZ;

    const railY =
        bridgeY -
        0.125;

    const railX =
        envelope.width / 2;

    const rails =
        Object.freeze({
            left:
                createRail(
                    -railX,
                    railY,
                    0,
                    runwayLength
                ),

            right:
                createRail(
                    railX,
                    railY,
                    0,
                    runwayLength
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

            height:
                0.35,

            depth:
                0.3
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

            width:
                0.4,

            height:
                0.4,

            depth:
                0.4
        });

    const cableAnchor =
        point(
            0,
            bridgeY -
                0.9,
            trolleyZ
        );

    const cable =
        Object.freeze({
            anchor:
                cableAnchor,

            position:
                point(
                    cableAnchor.x,
                    cableAnchor.y -
                        cableLength / 2,
                    cableAnchor.z
                ),

            length:
                cableLength,

            radius:
                cableRadius
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
            createBounds(
                envelope.width,
                runwayLength,
                bridgeY
            )
    });
}