const EPSILON = 1e-9;

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function distance(a, b) {
    return Math.hypot(
        b.x - a.x,
        b.y - a.y,
        b.z - a.z
    );
}

function interpolate(a, b, distanceFromStart, totalDistance) {
    if (totalDistance <= EPSILON) {
        return point(
            a.x,
            a.y,
            a.z
        );
    }

    const ratio =
        distanceFromStart / totalDistance;

    return point(
        a.x + (b.x - a.x) * ratio,
        a.y + (b.y - a.y) * ratio,
        a.z + (b.z - a.z) * ratio
    );
}

function createPanelBounds(
    start,
    end,
    minY,
    maxY
) {
    return Object.freeze({
        min: point(
            Math.min(start.x, end.x),
            minY,
            Math.min(start.z, end.z)
        ),

        max: point(
            Math.max(start.x, end.x),
            maxY,
            Math.max(start.z, end.z)
        )
    });
}

function createWallPanel(
    wall,
    panel,
    wallHeight
) {
    const isEndWall =
        wall.side === 'F' ||
        wall.side === 'B';

    const min = wall.bounds.min;
    const max = wall.bounds.max;

    if (isEndWall) {
        const x1 =
            min.x + panel.interval.start;

        const x2 =
            min.x + panel.interval.end;

        return Object.freeze({
            index: panel.index,
            width: panel.width,
            isLast: panel.isLast,

            bounds: createPanelBounds(
                point(x1, 0, min.z),
                point(x2, 0, max.z),
                min.y,
                Math.min(
                    wallHeight,
                    max.y
                )
            )
        });
    }

    const z1 =
        min.z + panel.interval.start;

    const z2 =
        min.z + panel.interval.end;

    return Object.freeze({
        index: panel.index,
        width: panel.width,
        isLast: panel.isLast,

        bounds: createPanelBounds(
            point(min.x, 0, z1),
            point(max.x, 0, z2),
            min.y,
            Math.min(
                wallHeight,
                max.y
            )
        )
    });
}

function createWainscotPanel(
    wall,
    panel,
    height
) {
    const wallPanel =
        createWallPanel(
            wall,
            panel,
            height
        );

    return Object.freeze({
        ...wallPanel,
        height
    });
}

function createRoofPanel(
    plane,
    panel
) {
    const corners = plane.corners;

    const start = corners[0];
    const end = corners[3];

    const span = distance(
        start,
        end
    );

    const panelStart =
        interpolate(
            start,
            end,
            panel.interval.start,
            span
        );

    const panelEnd =
        interpolate(
            start,
            end,
            panel.interval.end,
            span
        );

    const oppositeStart =
        interpolate(
            corners[1],
            corners[2],
            panel.interval.start,
            span
        );

    const oppositeEnd =
        interpolate(
            corners[1],
            corners[2],
            panel.interval.end,
            span
        );

    return Object.freeze({
        index: panel.index,
        width: panel.width,
        isLast: panel.isLast,

        corners: Object.freeze([
            panelStart,
            oppositeStart,
            oppositeEnd,
            panelEnd
        ]),

        center: point(
            (
                panelStart.x +
                oppositeStart.x +
                oppositeEnd.x +
                panelEnd.x
            ) / 4,

            (
                panelStart.y +
                oppositeStart.y +
                oppositeEnd.y +
                panelEnd.y
            ) / 4,

            (
                panelStart.z +
                oppositeStart.z +
                oppositeEnd.z +
                panelEnd.z
            ) / 4
        )
    });
}

export function createPanelGeometry(
    model,
    buildingGeometry,
    panelSystem
) {
    if (!model) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (!buildingGeometry) {
        throw new TypeError(
            'BuildingGeometry is required'
        );
    }

    if (!panelSystem) {
        throw new TypeError(
            'PanelSystem is required'
        );
    }

    const walls = {};

    for (const side of [
        'front',
        'back',
        'left',
        'right'
    ]) {
        const wall =
            buildingGeometry.walls[side];

        const layout =
            panelSystem.walls[side];

        walls[side] = Object.freeze(
            layout.panels.map(panel =>
                createWallPanel(
                    wall,
                    panel,
                    wall.bounds.height
                )
            )
        );
    }

    const wainscot = {};

    for (const side of [
        'front',
        'back',
        'left',
        'right'
    ]) {
        const wall =
            buildingGeometry.walls[side];

        const layout =
            panelSystem.wainscot[side];

        wainscot[side] = Object.freeze(
            layout.panels.map(panel =>
                createWainscotPanel(
                    wall,
                    panel,
                    model.panels.wainscotHeight
                )
            )
        );
    }

    const roof = {};

    for (const layout of panelSystem.roof) {
        const plane =
            buildingGeometry.roof.planes.find(
                item => item.id === layout.plane
            );

        if (!plane) {
            throw new Error(
                `Roof plane not found: ${layout.plane}`
            );
        }

        roof[layout.plane] =
            Object.freeze(
                layout.panels.map(panel =>
                    createRoofPanel(
                        plane,
                        panel
                    )
                )
            );
    }

    return Object.freeze({
        walls: Object.freeze(walls),
        wainscot: Object.freeze(wainscot),
        roof: Object.freeze(roof)
    });
}