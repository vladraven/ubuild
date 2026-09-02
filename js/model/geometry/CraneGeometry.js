const RAIL_WIDTH =
    0.15;

const RAIL_HEIGHT =
    0.25;

const RAIL_SIDE_INSET =
    0.10;

const RAIL_END_INSET =
    0.10;

const BRIDGE_HEIGHT =
    0.35;

const BRIDGE_DEPTH =
    0.30;

const BRIDGE_HEIGHT_OFFSET =
    0.20;

const CRANE_HEIGHT_RATIO =
    0.75;

const TROLLEY_WIDTH =
    0.40;

const TROLLEY_HEIGHT =
    0.40;

const TROLLEY_DEPTH =
    0.40;

const TROLLEY_VERTICAL_OFFSET =
    0.20;

const CABLE_LENGTH =
    1.20;

const CABLE_RADIUS =
    0.015;

const CABLE_VERTICAL_OFFSET =
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

function validateFinite(
    value,
    name
) {
    if (
        !Number.isFinite(
            value
        )
    ) {
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

    if (
        value <= 0
    ) {
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

function createDisabledGeometry(
    zPercent
) {
    return Object.freeze({
        enabled: false,

        zPercent,

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

        width:
            RAIL_WIDTH,

        height:
            RAIL_HEIGHT,

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

function resolveWallThickness(
    walls
) {
    const values =
        [
            walls.left?.thickness,
            walls.right?.thickness,
            walls.L?.thickness,
            walls.R?.thickness
        ].filter(
            Number.isFinite
        );

    if (
        values.length === 0
    ) {
        return 0;
    }

    return values[0];
}

export function createCraneGeometry(
    model,
    envelope,
    walls,
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
        !walls
    ) {
        throw new TypeError(
            'WallGeometry is required'
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
        model.crane;

    const zPercent =
        config?.zPercent ??
        config?.z ??
        0;

    if (
        !config ||
        !config.enabled
    ) {
        return createDisabledGeometry(
            zPercent
        );
    }

    validatePercent(
        zPercent
    );

    const buildingWidth =
        envelope.width;

    const buildingLength =
        envelope.length;

    const buildingHeight =
        envelope.height;

    validatePositive(
        buildingWidth,
        'envelope.width'
    );

    validatePositive(
        buildingLength,
        'envelope.length'
    );

    validatePositive(
        buildingHeight,
        'envelope.height'
    );

    const wallThickness =
        resolveWallThickness(
            walls
        );

    const halfWidth =
        buildingWidth / 2;

    const halfLength =
        buildingLength / 2;

    /*
     * The rail is fully inside the wall plane.
     */

    const railX =
        halfWidth -
        wallThickness -
        RAIL_SIDE_INSET -
        RAIL_WIDTH / 2;

    if (
        railX <= 0
    ) {
        throw new RangeError(
            'Building is too narrow for crane rails'
        );
    }

    /*
     * Rails run from the front wall to the rear wall,
     * with small clearances at both ends.
     */

    const runwayLength =
        buildingLength -
        RAIL_END_INSET * 2;

    if (
        runwayLength <= 0
    ) {
        throw new RangeError(
            'Building is too short for crane rails'
        );
    }

    const runwayFrontZ =
        halfLength -
        RAIL_END_INSET;

    const runwayRearZ =
        -halfLength;

    const runwayCenterZ =
        (
            runwayFrontZ
        ) ;

    /*
     * zPercent is measured from the front:
     *
     * 0   = front
     * 0.5 = center
     * 1   = rear
     */

    const bridgeZ =
        runwayFrontZ -
        runwayLength *
        zPercent/2;

    const bridgeWidth =
        railX * 2 +
        RAIL_WIDTH;

    const bridgeY =
        buildingHeight *
        CRANE_HEIGHT_RATIO;

    const railY =
        bridgeY -
        BRIDGE_HEIGHT_OFFSET;

    const rails =
        Object.freeze({
            left:
                createRail(
                    -railX,
                    railY,
                    runwayCenterZ,
                    runwayLength
                ),

            right:
                createRail(
                    railX,
                    railY,
                    runwayCenterZ,
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
                BRIDGE_HEIGHT,

            depth:
                BRIDGE_DEPTH
        });

    const trolleyY =
        bridgeY -
        TROLLEY_VERTICAL_OFFSET;

    const trolley =
        Object.freeze({
            anchor:
                point(
                    0,
                    trolleyY,
                    bridgeZ
                ),

            position:
                point(
                    0,
                    trolleyY,
                    bridgeZ
                ),

            width:
                TROLLEY_WIDTH,

            height:
                TROLLEY_HEIGHT,

            depth:
                TROLLEY_DEPTH
        });

    const cable =
        Object.freeze({
            anchor:
                point(
                    0,
                    bridgeY -
                    CABLE_VERTICAL_OFFSET,
                    bridgeZ
                ),

            position:
                point(
                    0,
                    bridgeY -
                    CABLE_VERTICAL_OFFSET -
                    CABLE_LENGTH / 2,
                    bridgeZ
                ),

            length:
                CABLE_LENGTH,

            radius:
                CABLE_RADIUS
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
                buildingWidth,
                buildingLength,
                bridgeY
            )
    });
}