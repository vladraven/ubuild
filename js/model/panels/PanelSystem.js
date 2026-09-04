const DEFAULT_PANEL_WIDTH = 1;

const WALL_SIDES = Object.freeze([
            'front',
            'back',
            'left',
            'right'
        ]);

function assertPositive(
    value,
    name) {
    if (
        !Number.isFinite(value) ||
        value <= 0) {
        throw new RangeError(
`${name} must be greater than zero`);
    }
}

function createInterval(
    start,
    end) {
    return Object.freeze({
        start,
        end,
        length: end - start
    });
}

function createPanel(
    index,
    start,
    end) {
    return Object.freeze({
        index,
        interval: createInterval(
            start,
            end),
        width: end - start,
        isLast: false
    });
}

function divideSpan(
    span,
    panelWidth) {
    const panels = [];

    let start = 0;
    let index = 0;

    while (
        start < span) {
        const end =
            Math.min(
                start +
                panelWidth,
                span);

        panels.push(
            createPanel(
                index,
                start,
                end));

        if (
            end === span) {
            break;
        }

        start = end;
        index++;
    }

    if (
        panels.length === 0) {
        return Object.freeze(
            panels);
    }

    const last =
        panels.length - 1;

    panels[last] =
        Object.freeze({
            ...panels[last],
            isLast: true
        });

    return Object.freeze(
        panels);
}

function createWallLayout(
    wall,
    panelWidth) {
    const isFrontBack =
        wall.side === 'F' ||
        wall.side === 'B';

    const span =
        isFrontBack ?
        wall.bounds.width :
        wall.bounds.length;

    return Object.freeze({
        side: wall.side,
        span,
        panelWidth,

        // Divide the wall into physical panels.
        panels: divideSpan(
            span,
            panelWidth)
    });
}

function createWainscotLayout(
    wall,
    height,
    panelWidth) {
    return Object.freeze({
        ...createWallLayout(
            wall,
            panelWidth),

        height
    });
}

function createRoofLayout(
    roof,
    panelWidth) {
    return Object.freeze(
        roof.planes.map(
            plane => {
            const start =
                plane.corners[0];

            const end =
                plane.corners[3];

            const span =
                Math.hypot(
                    end.x -
                    start.x,

                    end.y -
                    start.y,

                    end.z -
                    start.z);

            return Object.freeze({
                plane:
                plane.id,

                span,
                panelWidth,

                // Divide each roof plane identically.
                panels: divideSpan(
                    span,
                    panelWidth)
            });
        }));
}

export function createPanelSystem(
    model,
    buildingGeometry,
    panelWidth =
        DEFAULT_PANEL_WIDTH) {
    if (
        !model) {
        throw new TypeError(
            'BuildingModel is required');
    }

    if (
        !buildingGeometry) {
        throw new TypeError(
            'BuildingGeometry is required');
    }

    assertPositive(
        panelWidth,
        'panelWidth');

    const wallLayouts =
        Object.fromEntries(
            WALL_SIDES.map(
                side => [
                    side,
                    createWallLayout(
                        buildingGeometry
                        .walls[side],
                        panelWidth)
                ]));

    const wainscotLayouts =
        Object.fromEntries(
            WALL_SIDES.map(
                side => [
                    side,
                    createWainscotLayout(
                        buildingGeometry
                        .walls[side],
                        model.panels
                        .wainscotHeight,
                        panelWidth)
                ]));

    const roofLayouts =
        createRoofLayout(
            buildingGeometry.roof,
            panelWidth);

    return Object.freeze({
        panelWidth,

        walls:
        Object.freeze(
            wallLayouts),

        wainscot:
        Object.freeze(
            wainscotLayouts),

        roof:
        roofLayouts
    });
}