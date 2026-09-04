const EPSILON =
    1e-9;

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

function shapePoint(
    x,
    y
) {
    return Object.freeze({
        x,
        y
    });
}

function distance(
    a,
    b
) {
    return Math.hypot(
        b.x - a.x,
        b.y - a.y,
        b.z - a.z
    );
}

function interpolate(
    a,
    b,
    distanceFromStart,
    totalDistance
) {
    if (
        totalDistance <=
        EPSILON
    ) {
        return point(
            a.x,
            a.y,
            a.z
        );
    }

    const ratio =
        distanceFromStart /
        totalDistance;

    return point(
        a.x +
        (
            b.x -
            a.x
        ) *
        ratio,

        a.y +
        (
            b.y -
            a.y
        ) *
        ratio,

        a.z +
        (
            b.z -
            a.z
        ) *
        ratio
    );
}

function getShapeBounds(
    points
) {
    let minX =
        Infinity;

    let maxX =
        -Infinity;

    let minY =
        Infinity;

    let maxY =
        -Infinity;

    for (
        const vertex
        of points
    ) {
        minX =
            Math.min(
                minX,
                vertex.x
            );

        maxX =
            Math.max(
                maxX,
                vertex.x
            );

        minY =
            Math.min(
                minY,
                vertex.y
            );

        maxY =
            Math.max(
                maxY,
                vertex.y
            );
    }

    return Object.freeze({
        minX,
        maxX,
        minY,
        maxY
    });
}

function intersectVertical(
    a,
    b,
    x
) {
    const deltaX =
        b.x -
        a.x;

    if (
        Math.abs(
            deltaX
        ) <= EPSILON
    ) {
        return shapePoint(
            x,
            a.y
        );
    }

    const ratio =
        (
            x -
            a.x
        ) /
        deltaX;

    return shapePoint(
        x,

        a.y +
        (
            b.y -
            a.y
        ) *
        ratio
    );
}

function clipPolygon(
    polygon,
    isInside,
    intersect
) {
    if (
        polygon.length ===
        0
    ) {
        return [];
    }

    const result =
        [];

    let previous =
        polygon[
            polygon.length -
            1
        ];

    let previousInside =
        isInside(
            previous
        );

    for (
        const current
        of polygon
    ) {
        const currentInside =
            isInside(
                current
            );

        if (
            currentInside
        ) {
            if (
                !previousInside
            ) {
                result.push(
                    intersect(
                        previous,
                        current
                    )
                );
            }

            result.push(
                shapePoint(
                    current.x,
                    current.y
                )
            );
        } else if (
            previousInside
        ) {
            result.push(
                intersect(
                    previous,
                    current
                )
            );
        }

        previous =
            current;

        previousInside =
            currentInside;
    }

    return result;
}

function clipMinX(
    polygon,
    minX
) {
    return clipPolygon(
        polygon,

        vertex =>
            vertex.x >=
            minX -
            EPSILON,

        (
            previous,
            current
        ) =>
            intersectVertical(
                previous,
                current,
                minX
            )
    );
}

function clipMaxX(
    polygon,
    maxX
) {
    return clipPolygon(
        polygon,

        vertex =>
            vertex.x <=
            maxX +
            EPSILON,

        (
            previous,
            current
        ) =>
            intersectVertical(
                previous,
                current,
                maxX
            )
    );
}

function getPanelShapePoints(
    wall,
    panel
) {
    const bounds =
        getShapeBounds(
            wall.shapePoints
        );

    const minX =
        bounds.minX +
        panel.interval.start;

    const maxX =
        bounds.minX +
        panel.interval.end;

    let polygon =
        wall.shapePoints.map(
            vertex =>
                shapePoint(
                    vertex.x,
                    vertex.y
                )
        );

    polygon =
        clipMinX(
            polygon,
            minX
        );

    polygon =
        clipMaxX(
            polygon,
            maxX
        );

    return Object.freeze(
        polygon.map(
            vertex =>
                shapePoint(
                    vertex.x,
                    vertex.y
                )
        )
    );
}

function getPanelBounds(
    wall,
    shapePoints
) {
    const shapeBounds =
        getShapeBounds(
            shapePoints
        );

    if (
        wall.side === 'F' ||
        wall.side === 'B'
    ) {
        return Object.freeze({
            min:
                point(
                    shapeBounds.minX,
                    shapeBounds.minY,
                    wall.bounds.min.z
                ),

            max:
                point(
                    shapeBounds.maxX,
                    shapeBounds.maxY,
                    wall.bounds.max.z
                )
        });
    }

    return Object.freeze({
        min:
            point(
                wall.bounds.min.x,
                shapeBounds.minY,
                shapeBounds.minX
            ),

        max:
            point(
                wall.bounds.max.x,
                shapeBounds.maxY,
                shapeBounds.maxX
            )
    });
}

function createWallPanel(
    wall,
    panel
) {
    const shapePoints =
        getPanelShapePoints(
            wall,
            panel
        );

    if (
        shapePoints.length <
        3
    ) {
        throw new Error(
            `Invalid wall panel shape: ` +
            `${wall.side}:${panel.index}`
        );
    }

    return Object.freeze({
        index:
            panel.index,

        width:
            panel.width,

        isLast:
            panel.isLast,

        shapePoints,

        bounds:
            getPanelBounds(
                wall,
                shapePoints
            )
    });
}

function getWainscotShapePoints(
    wall,
    panel,
    height
) {
    const wallPanel =
        createWallPanel(
            wall,
            panel
        );

    const polygon =
        [];

    for (
        let index = 0;
        index <
        wallPanel.shapePoints.length;
        index++
    ) {
        const current =
            wallPanel.shapePoints[
                index
            ];

        const next =
            wallPanel.shapePoints[
                (
                    index +
                    1
                ) %
                wallPanel.shapePoints.length
            ];

        const currentInside =
            current.y <=
            height +
            EPSILON;

        const nextInside =
            next.y <=
            height +
            EPSILON;

        if (
            currentInside
        ) {
            polygon.push(
                shapePoint(
                    current.x,
                    current.y
                )
            );
        }

        if (
            currentInside !==
            nextInside
        ) {
            const deltaY =
                next.y -
                current.y;

            if (
                Math.abs(
                    deltaY
                ) >
                EPSILON
            ) {
                const ratio =
                    (
                        height -
                        current.y
                    ) /
                    deltaY;

                polygon.push(
                    shapePoint(
                        current.x +
                        (
                            next.x -
                            current.x
                        ) *
                        ratio,

                        height
                    )
                );
            }
        }
    }

    return Object.freeze(
        polygon
    );
}

function createWainscotPanel(
    wall,
    panel,
    height
) {
    const shapePoints =
        getWainscotShapePoints(
            wall,
            panel,
            height
        );

    if (
        shapePoints.length <
        3
    ) {
        throw new Error(
            `Invalid wainscot panel shape: ` +
            `${wall.side}:${panel.index}`
        );
    }

    return Object.freeze({
        index:
            panel.index,

        width:
            panel.width,

        height,

        isLast:
            panel.isLast,

        shapePoints,

        bounds:
            getPanelBounds(
                wall,
                shapePoints
            )
    });
}

function createRoofPanel(
    plane,
    panel
) {
    const corners =
        plane.corners;

    const start =
        corners[0];

    const end =
        corners[3];

    const span =
        distance(
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
        index:
            panel.index,

        width:
            panel.width,

        isLast:
            panel.isLast,

        corners:
            Object.freeze([
                panelStart,
                oppositeStart,
                oppositeEnd,
                panelEnd
            ]),

        center:
            point(
                (
                    panelStart.x +
                    oppositeStart.x +
                    oppositeEnd.x +
                    panelEnd.x
                ) /
                4,

                (
                    panelStart.y +
                    oppositeStart.y +
                    oppositeEnd.y +
                    panelEnd.y
                ) /
                4,

                (
                    panelStart.z +
                    oppositeStart.z +
                    oppositeEnd.z +
                    panelEnd.z
                ) /
                4
            )
    });
}

export function createPanelGeometry(
    model,
    buildingGeometry,
    panelSystem
) {
    if (
        !model
    ) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    if (
        !buildingGeometry
    ) {
        throw new TypeError(
            'BuildingGeometry is required'
        );
    }

    if (
        !panelSystem
    ) {
        throw new TypeError(
            'PanelSystem is required'
        );
    }

    const walls =
        {};

    const wainscot =
        {};

    for (
        const side
        of [
            'front',
            'back',
            'left',
            'right'
        ]
    ) {
        const wall =
            buildingGeometry.walls[
                side
            ];

        const wallLayout =
            panelSystem.walls[
                side
            ];

        walls[
            side
        ] =
            Object.freeze(
                wallLayout.panels.map(
                    panel =>
                        createWallPanel(
                            wall,
                            panel
                        )
                )
            );

        const wainscotLayout =
            panelSystem.wainscot[
                side
            ];

        wainscot[
            side
        ] =
            Object.freeze(
                wainscotLayout.panels.map(
                    panel =>
                        createWainscotPanel(
                            wall,
                            panel,
                            model.panels
                                .wainscotHeight
                        )
                )
            );
    }

    const roof =
        {};

    for (
        const layout
        of panelSystem.roof
    ) {
        const plane =
            buildingGeometry.roof
                .planes
                .find(
                    item =>
                        item.id ===
                        layout.plane
                );

        if (
            !plane
        ) {
            throw new Error(
                `Roof plane not found: ` +
                layout.plane
            );
        }

        roof[
            layout.plane
        ] =
            Object.freeze(
                layout.panels.map(
                    panel =>
                        createRoofPanel(
                            plane,
                            panel
                        )
                )
            );
    }

    return Object.freeze({
        walls:
            Object.freeze(
                walls
            ),

        wainscot:
            Object.freeze(
                wainscot
            ),

        roof:
            Object.freeze(
                roof
            )
    });
}