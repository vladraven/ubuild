// js/buildingGeometry.js

const DEFAULTS = Object.freeze({
    wallThickness: 0.05,
    roofThickness: 0.12,
    overhangRoofThickness: 0.15,
    wainscotThickness: 0.02,
    wainscotOffset: 0.002,
    trimSize: 0.10,
    frameInsetX: 0.18,
    frameInsetZ: 0.15,
    colDStart: 0.20,
    colDEnd: 0.40,
    rafterDStart: 0.40,
    rafterDEnd: 0.20,
    girtThickness: 0.08,
    girtStepY: 1.2,
    purlinSize: 0.10,
    purlinStepDist: 1.2,
    endWallColThickness: 0.15,
    endWallColStep: 3.5,
    endWallColumnZOffset: 0.25,
    foundationLedge: 0.30,
    foundationMaxHeight: 0.6096,
    foundationDefaultHeight: 0.45,
    foundationSlabHeight: 0.10,
    foundationLabelOffset: 8,
    foundationLabelY: 0.05,
    gutterOffsetY: -0.135,
    gutterOutletOffset: 0.07,
    pipeWallOffset: 0.05,
    pipeGroundOffset: 0.15,
    downspoutMaxSpacing: 7.62,
    downspoutStartOffsetZ: 0.30,
    downspoutEndClearanceZ: 0.60,
    downspoutTopDropMin: 0.30,
    downspoutTopDropFactor: 1.4,
    downspoutElbowOffsetY: 0.08,
    downspoutShoeOffsetY: 0.20,
    downspoutShoeLength: 0.20,
    downspoutShoeAngle: Math.PI / 4,
    downspoutGroundMin: 0.02,
    downspoutDoorTolerance: 0.30,
    downspoutStrapStartOffset: 0.15,
    downspoutStrapEndOffset: 0.30,
    downspoutStrapMinSpan: 0.60,
    downspoutStrapSpacing: 2.2,
    interiorLinerOffset: 0.75,
    interiorLinerThickness: 0.01,
    mezzanineColumnInset: 0.30,
    craneHeightRatio: 0.75,
    craneRailInset: 0.10,
    craneBridgeHeightOffset: 0.20,
    drivewayWidthRatio: 0.25,
    drivewayLength: 8.0,
    drivewayHeight: 0.08,
    logoWidth: 1.0,
    logoHeight: 0.33,
    logoPlateThickness: 0.08,
    logoPlateMargin: 0.15,
    logoPlateWidthExtra: 0.12,
    logoPlateHeightExtra: 0.12,
    awningWallOffset: 0.03,
    awningWallRoofClearance: 0.20,
    awningColumnSize: 0.15,
    awningWindowTolerance: 0.05,
    awningDoorTolerance: 0.05,
    awningMinPostHeight: 0.20,
    awningRoofThickness: 0.15,
    wainscotCornerInset: 0.005
});

function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeRoofType(value) {
    return value === 'left-sloped' ||
        value === 'right-sloped' ||
        value === 'gabled'
        ? value
        : 'gabled';
}

function normalizeVisibility(vis = {}) {
    return {
        wF: vis.wF ?? true,
        wB: vis.wB ?? true,
        wL: vis.wL ?? true,
        wR: vis.wR ?? true,
        checkRoof: vis.checkRoof ?? true,
        checkLabels: vis.checkLabels ?? true
    };
}

function createOpeningHole(op, openingDefs = {}) {
    if (!op) return null;

    const def = openingDefs[op.type] || {};
    const width = finite(op.w, finite(def.w, 1));
    const height = finite(op.h, finite(def.h, 1));
    const y = op.type === 'Window'
        ? finite(op.yOff, finite(def.yOff, 1))
        : 0;
    const x = finite(op.x, 0);

    return {
        id: op.id,
        type: op.type,
        minX: x - width / 2,
        maxX: x + width / 2,
        minY: y,
        maxY: y + height,
        width,
        height,
        yOff: y,
        x
    };
}

function normalizeOpenings(openings = [], openingDefs = {}) {
    return openings
        .map(op => {
            const def = openingDefs[op.type] || {};
            return createOpeningHole({
                ...op,
                w: op.w ?? def.w,
                h: op.h ?? def.h,
                yOff: op.yOff ?? def.yOff
            }, openingDefs);
        })
        .filter(Boolean);
}

function createWallDefinition({
    side,
    width,
    length,
    wallHeight,
    wallThickness,
    openings,
    openingDefs,
    roofType,
    height,
    totalRise
}) {
    const halfW = width / 2;
    const longWall = side === 'L' || side === 'R';
    const localWidth = longWall ? length : width;
    const halfLocalWidth = localWidth / 2;

    let points;
    let maxY;

    if (longWall) {
        maxY = wallHeight;
        points = [
            { x: -halfLocalWidth, y: 0 },
            { x: halfLocalWidth, y: 0 },
            { x: halfLocalWidth, y: wallHeight },
            { x: -halfLocalWidth, y: wallHeight }
        ];
    } else if (roofType === 'gabled') {
        maxY = height + totalRise;
        points = [
            { x: -halfW, y: 0 },
            { x: halfW, y: 0 },
            { x: halfW, y: wallHeight.right },
            { x: 0, y: height + totalRise },
            { x: -halfW, y: wallHeight.left }
        ];
    } else {
        maxY = Math.max(wallHeight.left, wallHeight.right);
        points = [
            { x: -halfW, y: 0 },
            { x: halfW, y: 0 },
            { x: halfW, y: wallHeight.right },
            { x: -halfW, y: wallHeight.left }
        ];
    }

    return {
        side,
        width: localWidth,
        height: maxY,
        thickness: wallThickness,
        uvOriginX: longWall ? -length / 2 : -width / 2,
        points,
        holes: normalizeOpenings(openings, openingDefs),
        local: {
            minX: -halfLocalWidth,
            maxX: halfLocalWidth,
            minY: 0,
            maxY
        },
        transform: null
    };
}

function createWallTransform(side, width, length, wallThickness) {
    const halfW = width / 2;
    const halfL = length / 2;

    if (side === 'L') {
        return {
            position: {
                x: -halfW + wallThickness / 2,
                y: 0,
                z: 0
            },
            rotationY: Math.PI / 2
        };
    }

    if (side === 'R') {
        return {
            position: {
                x: halfW - wallThickness / 2,
                y: 0,
                z: 0
            },
            rotationY: -Math.PI / 2
        };
    }

    if (side === 'F') {
        return {
            position: {
                x: 0,
                y: 0,
                z: halfL - wallThickness / 2
            },
            rotationY: 0
        };
    }

    return {
        position: {
            x: 0,
            y: 0,
            z: -halfL + wallThickness / 2
        },
        rotationY: Math.PI
    };
}

function createRoofGeometry({
    width,
    length,
    height,
    pitchRatio,
    roofType,
    overhangs,
    roofThickness,
    wallThickness
}) {
    const halfW = width / 2;
    const isLeftSloped = roofType === 'left-sloped';
    const isRightSloped = roofType === 'right-sloped';
    const isSingleSlope = isLeftSloped || isRightSloped;
    const hasOverhangs =
        overhangs.overL > 0 ||
        overhangs.overR > 0 ||
        overhangs.overF > 0 ||
        overhangs.overB > 0;

    const totalRise = isSingleSlope
        ? width * pitchRatio
        : halfW * pitchRatio;

    const pitchAngle = isSingleSlope
        ? Math.atan2(totalRise, width)
        : Math.atan2(totalRise, halfW);

    const totalLength =
        length +
        overhangs.overF +
        overhangs.overB;

    const zOffset =
        (overhangs.overF - overhangs.overB) / 2;

    const eaveDropL =
        overhangs.overL * Math.tan(pitchAngle);

    const eaveDropR =
        overhangs.overR * Math.tan(pitchAngle);

    const outerLeftX =
        -halfW -
        wallThickness / 2 -
        overhangs.overL;

    const outerRightX =
        halfW +
        wallThickness / 2 +
        overhangs.overR;

    let leftEaveY = height - eaveDropL;
    let rightEaveY = height - eaveDropR;

    if (isLeftSloped) {
        rightEaveY =
            height +
            totalRise +
            eaveDropR;
    }

    if (isRightSloped) {
        leftEaveY =
            height +
            totalRise +
            eaveDropL;
    }

    const result = {
        type: roofType,
        visible: true,
        isSingleSlope,
        totalRise,
        pitchRatio,
        pitchAngle,
        length,
        totalLength,
        zOffset,
        thickness: roofThickness,

        eaves: {
            left: {
                x: outerLeftX,
                y: leftEaveY,
                drop: eaveDropL,
                length: totalLength,
                z: zOffset
            },
            right: {
                x: outerRightX,
                y: rightEaveY,
                drop: eaveDropR,
                length: totalLength,
                z: zOffset
            }
        },

        gabled: null,
        singleSlope: null,

        overhang: {
            enabled: hasOverhangs,
            totalLength,
            zOffset,
            overL: overhangs.overL,
            overR: overhangs.overR,
            overF: overhangs.overF,
            overB: overhangs.overB
        }
    };

    if (isSingleSlope) {
        const projectionWidth =
            width +
            overhangs.overL +
            overhangs.overR;

        const slopeLength =
            projectionWidth /
            Math.cos(pitchAngle);

        const xOffset =
            (overhangs.overR -
                overhangs.overL) / 2;

        const yBase =
            height +
            totalRise / 2;

        const yOffset =
            xOffset *
            Math.tan(pitchAngle) *
            (isLeftSloped ? 1 : -1);

        result.singleSlope = {
            slopeLength,
            projectionWidth,
            rotationZ:
                isLeftSloped
                    ? pitchAngle
                    : -pitchAngle,
            position: {
                x: xOffset,
                y: yBase + yOffset,
                z: zOffset
            }
        };

        return result;
    }

    const leftProjection =
        halfW +
        overhangs.overL;

    const rightProjection =
        halfW +
        overhangs.overR;

    result.gabled = {
        ridge: {
            x: 0,
            y: height + totalRise,
            z: zOffset,
            length: totalLength
        },

        left: {
            projectionWidth: leftProjection,
            slopeLength:
                leftProjection /
                Math.cos(pitchAngle),
            rotationZ: pitchAngle,
            position: {
                x:
                    -halfW / 2 -
                    overhangs.overL / 2,
                y:
                    height +
                    (
                        totalRise -
                        overhangs.overL *
                        pitchRatio
                    ) / 2,
                z: zOffset
            }
        },

        right: {
            projectionWidth: rightProjection,
            slopeLength:
                rightProjection /
                Math.cos(pitchAngle),
            rotationZ: -pitchAngle,
            position: {
                x:
                    halfW / 2 +
                    overhangs.overR / 2,
                y:
                    height +
                    (
                        totalRise -
                        overhangs.overR *
                        pitchRatio
                    ) / 2,
                z: zOffset
            }
        }
    };

    return result;
}

function createWainscotShapeData(
    halfLength,
    height,
    openings
) {
    const holes =
        (openings || [])
            .map(op => {
                const yOff =
                    op.type === 'Window'
                        ? (
                            op.yOff !== undefined
                                ? op.yOff
                                : 1
                        )
                        : 0;

                if (yOff >= height) {
                    return null;
                }

                const minY =
                    Math.max(0, yOff);

                const maxY =
                    Math.min(
                        height,
                        yOff +
                        (op.height ||
                            op.h ||
                            1)
                    );

                if (maxY <= minY) {
                    return null;
                }

                const minX =
                    op.x -
                    (
                        op.width ||
                        op.w ||
                        1
                    ) / 2;

                const maxX =
                    op.x +
                    (
                        op.width ||
                        op.w ||
                        1
                    ) / 2;

                return {
                    minX,
                    maxX,
                    minY,
                    maxY
                };
            })
            .filter(Boolean);

    return {
        points: [
            { x: -halfLength, y: 0 },
            { x: halfLength, y: 0 },
            { x: halfLength, y: height },
            { x: -halfLength, y: height },
            { x: -halfLength, y: 0 }
        ],
        holes
    };
}

function createWainscotGeometry({
    width,
    length,
    leftWallHeight,
    rightWallHeight,
    wsHeight,
    wsEnabled,
    walls,
    wallThickness,
    wainscotThickness,
    wainscotOffset
}) {
    if (!wsEnabled || wsHeight <= 0) {
        return {
            enabled: false,
            sides: {}
        };
    }

    const halfW = width / 2;
    const halfL = length / 2;
    const leftH =
        Math.min(wsHeight, leftWallHeight);
    const rightH =
        Math.min(wsHeight, rightWallHeight);
    const frontH =
        Math.min(wsHeight, leftWallHeight);
    const backH =
        Math.min(wsHeight, rightWallHeight);

    const cornerInset =
        DEFAULTS.wainscotCornerInset;

    const sideHalfL =
        halfL - cornerInset;

    const sideHalfW =
        halfW - cornerInset;

    const sides = {};

    if (walls.L) {
        sides.L = {
            shapeData:
                createWainscotShapeData(
                    sideHalfL,
                    leftH,
                    walls.L.holes
                ),
            uvOriginX: -length / 2,
            position: {
                x:
                    -halfW -
                    wallThickness / 2 -
                    wainscotOffset,
                y: 0,
                z: 0
            },
            rotationY: Math.PI / 2
        };
    }

    if (walls.R) {
        sides.R = {
            shapeData:
                createWainscotShapeData(
                    sideHalfL,
                    rightH,
                    walls.R.holes
                ),
            uvOriginX: -length / 2,
            position: {
                x:
                    halfW +
                    wallThickness / 2 +
                    wainscotOffset,
                y: 0,
                z: 0
            },
            rotationY: -Math.PI / 2
        };
    }

    if (walls.F) {
        sides.F = {
            shapeData:
                createWainscotShapeData(
                    sideHalfW,
                    frontH,
                    walls.F.holes
                ),
            uvOriginX: -width / 2,
            position: {
                x: 0,
                y: 0,
                z:
                    halfL +
                    wallThickness / 2 +
                    wainscotOffset
            },
            rotationY: 0
        };
    }

    if (walls.B) {
        sides.B = {
            shapeData:
                createWainscotShapeData(
                    sideHalfW,
                    backH,
                    walls.B.holes
                ),
            uvOriginX: -width / 2,
            position: {
                x: 0,
                y: 0,
                z:
                    -halfL -
                    wallThickness / 2 -
                    wainscotOffset
            },
            rotationY: Math.PI
        };
    }

    return {
        enabled: true,
        height: wsHeight,
        thickness: wainscotThickness,
        offset: wainscotOffset,
        sides
    };
}

function createTrimsSpatialData({
    width,
    length,
    height,
    roof,
    wallThickness
}) {
    const halfW = width / 2;
    const halfL = length / 2;
    const isLeftSloped =
        roof.type === 'left-sloped';
    const isRightSloped =
        roof.type === 'right-sloped';
    const isG =
        roof.type === 'gabled';

    const totalRise = roof.totalRise;
    const roofAngle = roof.pitchAngle;
    const roofLength = roof.totalLength;
    const roofZOffset = roof.zOffset;

    const leftEave =
        roof.eaves.left;

    const rightEave =
        roof.eaves.right;

    const cornerBaseOffset =
        wallThickness / 2;

    const cornerX =
        halfW + cornerBaseOffset;

    const cornerZ =
        halfL + cornerBaseOffset;

    const corners = [
        {
            sx: -1,
            sz: 1,
            x: -cornerX,
            z: cornerZ,
            colH:
                isRightSloped
                    ? height + totalRise
                    : height
        },
        {
            sx: 1,
            sz: 1,
            x: cornerX,
            z: cornerZ,
            colH:
                isLeftSloped
                    ? height + totalRise
                    : height
        },
        {
            sx: 1,
            sz: -1,
            x: cornerX,
            z: -cornerZ,
            colH:
                isLeftSloped
                    ? height + totalRise
                    : height
        },
        {
            sx: -1,
            sz: -1,
            x: -cornerX,
            z: -cornerZ,
            colH:
                isRightSloped
                    ? height + totalRise
                    : height
        }
    ];

    const rakes = [];
    const frontZ =
        halfL + wallThickness / 2;
    const backZ =
        -halfL - wallThickness / 2;

    for (const sideZ of [-1, 1]) {
        const zPos =
            sideZ > 0
                ? frontZ
                : backZ;

        if (isG) {
            const slopeLenL =
                Math.hypot(
                    halfW +
                        roof.overhang.overL,
                    totalRise +
                        leftEave.drop
                );

            const slopeLenR =
                Math.hypot(
                    halfW +
                        roof.overhang.overR,
                    totalRise +
                        rightEave.drop
                );

            rakes.push({
                type: 'gable-left',
                sideZ,
                zPos,
                slopeLength: slopeLenL,
                position: {
                    x:
                        -halfW / 2 -
                        roof.overhang.overL / 2,
                    y:
                        height +
                        totalRise / 2 -
                        leftEave.drop / 2,
                    z: zPos
                },
                rotationZ: roofAngle
            });

            rakes.push({
                type: 'gable-right',
                sideZ,
                zPos,
                slopeLength: slopeLenR,
                position: {
                    x:
                        halfW / 2 +
                        roof.overhang.overR / 2,
                    y:
                        height +
                        totalRise / 2 -
                        rightEave.drop / 2,
                    z: zPos
                },
                rotationZ: -roofAngle
            });
        } else {
            const activeOver =
                isLeftSloped
                    ? roof.overhang.overL
                    : roof.overhang.overR;

            const activeDrop =
                isLeftSloped
                    ? leftEave.drop
                    : rightEave.drop;

            rakes.push({
                type: 'single-slope',
                sideZ,
                zPos,
                slopeLength:
                    Math.hypot(
                        width +
                            activeOver * 2,
                        totalRise +
                            activeDrop * 2
                    ),
                position: {
                    x: 0,
                    y:
                        height +
                        totalRise / 2,
                    z: zPos
                },
                rotationZ:
                    isLeftSloped
                        ? roofAngle
                        : -roofAngle
            });
        }
    }

    return {
        corners,

        eaves: {
            left: {
                x: leftEave.x,
                y: leftEave.y,
                z: leftEave.z,
                length: leftEave.length
            },
            right: {
                x: rightEave.x,
                y: rightEave.y,
                z: rightEave.z,
                length: rightEave.length
            }
        },

        rakes,

        ridge: isG
            ? {
                x: 0,
                y: height + totalRise,
                z: roofZOffset,
                length: roofLength,
                roofAngle,
                totalRise
            }
            : null
    };
}

function createGuttersSpatialData({
    width,
    height,
    roof,
    openingsData,
    openingDefs
}) {
    const halfW = width / 2;
    const roofLength = roof.totalLength;
    const roofZOffset = roof.zOffset;

    const gutterOffsetY =
        DEFAULTS.gutterOffsetY;

    const pipeWallOffset =
        DEFAULTS.pipeWallOffset;

    const pipeGroundOffset =
        DEFAULTS.pipeGroundOffset;

    const numDownspouts =
        Math.max(
            2,
            Math.ceil(
                roofLength /
                DEFAULTS.downspoutMaxSpacing
            ) + 1
        );

    const usableLength =
        Math.max(
            0,
            roofLength -
            DEFAULTS.downspoutEndClearanceZ
        );

    const spacing =
        usableLength /
        Math.max(
            1,
            numDownspouts - 1
        );

    const gutterStartZ =
        -roofLength / 2 +
        DEFAULTS.downspoutStartOffsetZ;

    const downspouts = [];

    for (
        let i = 0;
        i < numDownspouts;
        i++
    ) {
        const zPos =
            roofZOffset +
            gutterStartZ +
            i * spacing;

        const wallPos =
            zPos - roofZOffset;

        ['L', 'R'].forEach(side => {
            const doorsOnWall =
                (openingsData[side] || [])
                    .filter(
                        op => op.type !== 'Window'
                    );

            const isColliding =
                doorsOnWall.some(door => {
                    const def =
                        openingDefs[door.type] || {
                            w: 2
                        };

                    const doorW =
                        door.w || def.w;

                    const minX =
                        door.x -
                        doorW / 2 -
                        DEFAULTS.downspoutDoorTolerance;

                    const maxX =
                        door.x +
                        doorW / 2 +
                        DEFAULTS.downspoutDoorTolerance;

                    return (
                        wallPos >= minX &&
                        wallPos <= maxX
                    );
                });

            const sideX =
                side === 'L'
                    ? -1
                    : 1;

            const eave =
                side === 'L'
                    ? roof.eaves.left
                    : roof.eaves.right;

            const xGutterOutlet =
                eave.x +
                sideX *
                DEFAULTS.gutterOutletOffset;

            const yGutterOutlet =
                eave.y +
                gutterOffsetY;

            const xWall =
                sideX *
                (
                    halfW +
                    pipeWallOffset
                );

            const groundOffset =
                Math.max(
                    DEFAULTS.downspoutGroundMin,
                    pipeGroundOffset
                );

            const topDrop =
                Math.max(
                    DEFAULTS.downspoutTopDropMin,
                    Math.abs(
                        xGutterOutlet -
                        xWall
                    ) *
                    DEFAULTS.downspoutTopDropFactor
                );

            const yElbowEnd =
                yGutterOutlet -
                topDrop;

            const yElbowMid =
                yGutterOutlet -
                DEFAULTS.downspoutElbowOffsetY;

            const yShoeStart =
                groundOffset +
                DEFAULTS.downspoutShoeOffsetY;

            const shoeLen =
                DEFAULTS.downspoutShoeLength;

            const shoeAngle =
                DEFAULTS.downspoutShoeAngle;

            const xShoeEnd =
                xWall +
                sideX *
                shoeLen *
                Math.sin(shoeAngle);

            const yShoeEnd =
                yShoeStart -
                shoeLen *
                Math.cos(shoeAngle);

            const segments = [
                {
                    start: {
                        x: xGutterOutlet,
                        y: yGutterOutlet
                    },
                    end: {
                        x: xGutterOutlet,
                        y: yElbowMid
                    }
                },
                {
                    start: {
                        x: xGutterOutlet,
                        y: yElbowMid
                    },
                    end: {
                        x: xWall,
                        y: yElbowEnd
                    }
                }
            ];

            if (yElbowEnd > yShoeStart) {
                segments.push({
                    start: {
                        x: xWall,
                        y: yElbowEnd
                    },
                    end: {
                        x: xWall,
                        y: yShoeStart
                    }
                });
            }

            segments.push({
                start: {
                    x: xWall,
                    y: yShoeStart
                },
                end: {
                    x: xShoeEnd,
                    y: yShoeEnd
                }
            });

            const span =
                yElbowEnd -
                yShoeStart;

            const straps = [];

            if (
                span >
                DEFAULTS.downspoutStrapMinSpan
            ) {
                const strapCount =
                    Math.max(
                        2,
                        Math.floor(
                            span /
                            DEFAULTS.downspoutStrapSpacing
                        )
                    );

                for (
                    let strapIndex = 0;
                    strapIndex <= strapCount;
                    strapIndex++
                ) {
                    straps.push({
                        x: xWall,
                        y:
                            yShoeStart +
                            DEFAULTS.downspoutStrapStartOffset +
                            (
                                span -
                                DEFAULTS.downspoutStrapEndOffset
                            ) *
                            (
                                strapIndex /
                                strapCount
                            )
                    });
                }
            }

            downspouts.push({
                side,
                sideX,
                zPos,
                wallPos,
                visible: !isColliding,

                outlet: {
                    x: xGutterOutlet,
                    y: yGutterOutlet
                },

                wall: {
                    x: xWall
                },

                groundOffset,
                segments,

                shoe: {
                    start: {
                        x: xWall,
                        y: yShoeStart
                    },
                    end: {
                        x: xShoeEnd,
                        y: yShoeEnd
                    }
                },

                straps
            });
        });
    }

    return {
        length: roofLength,
        zOffset: roofZOffset,

        eaves: {
            left: {
                x: roof.eaves.left.x,
                y: roof.eaves.left.y,
                z: roof.eaves.left.z,
                length: roof.eaves.left.length
            },
            right: {
                x: roof.eaves.right.x,
                y: roof.eaves.right.y,
                z: roof.eaves.right.z,
                length: roof.eaves.right.length
            }
        },

        config: {
            gutterOffsetY,
            pipeWallOffset,
            pipeGroundOffset
        },

        downspouts
    };
}

function createMainFramesSpatialData({
    width,
    length,
    height,
    roof
}) {
    const isGabled =
        roof.type === 'gabled';

    const isLeftSloped =
        roof.type === 'left-sloped';

    const halfW = width / 2;
    const halfL = length / 2;
    const ang = roof.pitchAngle;
    const totalRise = roof.totalRise;

    const numFrames =
        Math.max(
            2,
            Math.round(length / 6) + 1
        );

    const innerHalfW =
        halfW -
        DEFAULTS.frameInsetX;

    const usableLength =
        length -
        DEFAULTS.frameInsetZ * 2;

    const spacing =
        usableLength /
        (numFrames - 1);

    const frames = [];

    for (
        let i = 0;
        i < numFrames;
        i++
    ) {
        const zPos =
            -halfL +
            DEFAULTS.frameInsetZ +
            i * spacing;

        if (isGabled) {
            const rafterSpan =
                innerHalfW -
                DEFAULTS.colDEnd / 2;

            const rafterLen =
                rafterSpan /
                Math.cos(ang);

            frames.push({
                index: i,
                zPos,
                isGabled: true,

                columns: {
                    left: {
                        x: -innerHalfW,
                        y: 0,
                        height,
                        scaleX: 1,
                        dStart:
                            DEFAULTS.colDStart,
                        dEnd:
                            DEFAULTS.colDEnd
                    },

                    right: {
                        x: innerHalfW,
                        y: 0,
                        height,
                        scaleX: -1,
                        dStart:
                            DEFAULTS.colDStart,
                        dEnd:
                            DEFAULTS.colDEnd
                    }
                },

                rafters: [
                    {
                        type: 'left',
                        length: rafterLen,
                        dStart:
                            DEFAULTS.rafterDStart,
                        dEnd:
                            DEFAULTS.rafterDEnd,
                        rotationZ: ang,
                        position: {
                            x:
                                -innerHalfW +
                                DEFAULTS.colDEnd / 2,
                            y: height,
                            z: 0
                        }
                    },

                    {
                        type: 'right',
                        length: rafterLen,
                        dStart:
                            DEFAULTS.rafterDEnd,
                        dEnd:
                            DEFAULTS.rafterDStart,
                        rotationZ: -ang,
                        position: {
                            x: 0,
                            y:
                                height +
                                rafterSpan *
                                Math.tan(ang),
                            z: 0
                        }
                    }
                ]
            });
        } else {
            const hL =
                isLeftSloped
                    ? height
                    : height + totalRise;

            const hR =
                isLeftSloped
                    ? height + totalRise
                    : height;

            const rafterSpan =
                innerHalfW * 2 -
                DEFAULTS.colDEnd;

            const rafterLen =
                rafterSpan /
                Math.cos(ang);

            frames.push({
                index: i,
                zPos,
                isGabled: false,

                columns: {
                    left: {
                        x: -innerHalfW,
                        y: 0,
                        height: hL,
                        scaleX: 1,
                        dStart:
                            DEFAULTS.colDStart,
                        dEnd:
                            DEFAULTS.colDEnd
                    },

                    right: {
                        x: innerHalfW,
                        y: 0,
                        height: hR,
                        scaleX: -1,
                        dStart:
                            DEFAULTS.colDStart,
                        dEnd:
                            DEFAULTS.colDEnd
                    }
                },

                rafters: [
                    {
                        type:
                            isLeftSloped
                                ? 'left-slope'
                                : 'right-slope',
                        length: rafterLen,
                        dStart:
                            isLeftSloped
                                ? DEFAULTS.rafterDEnd
                                : DEFAULTS.rafterDStart,
                        dEnd:
                            isLeftSloped
                                ? DEFAULTS.rafterDStart
                                : DEFAULTS.rafterDEnd,
                        rotationZ:
                            isLeftSloped
                                ? ang
                                : -ang,
                        position: {
                            x:
                                -innerHalfW +
                                DEFAULTS.colDEnd / 2,
                            y: hL,
                            z: 0
                        }
                    }
                ]
            });
        }
    }

    return {
        count: numFrames,
        spacing,
        usableLength,
        innerHalfW,
        frames
    };
}

function createGirtsSpatialData({
    interior,
    height
}) {
    const innerW = interior.width;
    const innerL = interior.length;
    const girtThick =
        DEFAULTS.girtThickness;

    const stepY =
        DEFAULTS.girtStepY;

    const numGirts =
        Math.floor(height / stepY);

    const levels = [];

    for (
        let i = 1;
        i <= numGirts;
        i++
    ) {
        const y = i * stepY;

        levels.push({
            index: i,
            y,

            left: {
                x:
                    -innerW / 2 +
                    girtThick / 2,
                z: 0,
                length: innerL
            },

            right: {
                x:
                    innerW / 2 -
                    girtThick / 2,
                z: 0,
                length: innerL
            },

            front: {
                x: 0,
                z:
                    innerL / 2 -
                    girtThick / 2,
                width:
                    innerW -
                    girtThick * 2
            },

            back: {
                x: 0,
                z:
                    -innerL / 2 +
                    girtThick / 2,
                width:
                    innerW -
                    girtThick * 2
            }
        });
    }

    return {
        countPerSide: numGirts,
        thickness: girtThick,
        stepY,
        levels
    };
}

function createPurlinsSpatialData({
    interior,
    height,
    roof
}) {
    const innerW = interior.width;
    const innerL = interior.length;
    const halfW = innerW / 2;

    const isG =
        roof.type === 'gabled';

    const isRightSloped =
        roof.type === 'right-sloped';

    const ang = roof.pitchAngle;
    const pSize =
        DEFAULTS.purlinSize;

    const stepDist =
        DEFAULTS.purlinStepDist;

    const offset =
        pSize / 2;

    const items = [];

    if (isG) {
        const numPurlins =
            Math.floor(
                halfW /
                (
                    stepDist *
                    Math.cos(ang)
                )
            );

        for (
            let i = 1;
            i <= numPurlins;
            i++
        ) {
            const dist =
                i * stepDist;

            const xR =
                halfW -
                dist * Math.cos(ang) +
                offset * Math.sin(ang);

            const yR =
                height +
                dist * Math.sin(ang) -
                offset * Math.cos(ang);

            items.push({
                slope: 'right',
                distOnSlope: dist,
                position: {
                    x: xR,
                    y: yR,
                    z: 0
                },
                rotationZ: ang,
                length: innerL,
                size: pSize
            });

            const xL =
                -(
                    halfW -
                    dist * Math.cos(ang)
                ) -
                offset * Math.sin(ang);

            const yL =
                height +
                dist * Math.sin(ang) -
                offset * Math.cos(ang);

            items.push({
                slope: 'left',
                distOnSlope: dist,
                position: {
                    x: xL,
                    y: yL,
                    z: 0
                },
                rotationZ: -ang,
                length: innerL,
                size: pSize
            });
        }
    } else {
        const totalSpan =
            innerW /
            Math.cos(ang);

        const numPurlins =
            Math.floor(
                totalSpan / stepDist
            );

        const dir =
            isRightSloped
                ? -1
                : 1;

        const startX =
            isRightSloped
                ? halfW
                : -halfW;

        for (
            let i = 1;
            i <= numPurlins;
            i++
        ) {
            const dist =
                i * stepDist;

            const posX =
                startX +
                dir *
                dist *
                Math.cos(ang) +
                offset *
                Math.sin(dir * ang);

            const posY =
                height +
                dist *
                Math.sin(ang) -
                offset *
                Math.cos(ang);

            items.push({
                slope: 'single',
                distOnSlope: dist,
                position: {
                    x: posX,
                    y: posY,
                    z: 0
                },
                rotationZ:
                    dir * ang,
                length: innerL,
                size: pSize
            });
        }
    }

    return {
        size: pSize,
        stepDist,
        innerLength: innerL,
        items
    };
}

function createEndWallColumnsSpatialData({
    interior,
    height,
    roof
}) {
    const innerW = interior.width;
    const innerL = interior.length;
    const colThick =
        DEFAULTS.endWallColThickness;

    const colStep =
        DEFAULTS.endWallColStep;

    const halfW = innerW / 2;

    const zOffset =
        colThick / 2 +
        DEFAULTS.endWallColumnZOffset;

    const isG =
        roof.type === 'gabled';

    const isLeftSloped =
        roof.type === 'left-sloped';

    const isRightSloped =
        roof.type === 'right-sloped';

    const pitchRatio =
        roof.pitchRatio;

    const columns = [];

    for (
        const z of [
            -innerL / 2 + zOffset,
            innerL / 2 - zOffset
        ]
    ) {
        const wallName =
            z > 0
                ? 'front'
                : 'back';

        for (
            let x =
                -halfW + colStep;
            x <=
                halfW - colStep;
            x += colStep
        ) {
            let colH = height;

            if (isG) {
                colH +=
                    (
                        halfW -
                        Math.abs(x)
                    ) *
                    pitchRatio;
            } else if (isLeftSloped) {
                colH +=
                    (
                        x + halfW
                    ) *
                    pitchRatio;
            } else if (isRightSloped) {
                colH +=
                    (
                        halfW - x
                    ) *
                    pitchRatio;
            }

            columns.push({
                wall: wallName,
                x,
                z,
                height: colH,
                thickness: colThick
            });
        }
    }

    return {
        thickness: colThick,
        stepX: colStep,
        zOffsets: [
            -innerL / 2 + zOffset,
            innerL / 2 - zOffset
        ],
        columns
    };
}

function createFoundationSpatialData(
    { width, length },
    bc
) {
    const ledge =
        DEFAULTS.foundationLedge;

    const foundationHeight =
        bc.max_foundation_height !== undefined
            ? Math.min(
                bc.max_foundation_height,
                DEFAULTS.foundationMaxHeight
            )
            : DEFAULTS.foundationDefaultHeight;

    const totalW =
        width + ledge * 2;

    const totalL =
        length + ledge * 2;

    const off =
        width / 2 +
        DEFAULTS.foundationLabelOffset;

    const labelY =
        DEFAULTS.foundationLabelY;

    const slabHeight =
        DEFAULTS.foundationSlabHeight;

    return {
        width: totalW,
        length: totalL,
        height: foundationHeight,
        halfWidth: totalW / 2,
        halfLength: totalL / 2,
        ledge,

        slab: {
            width,
            length,
            height: slabHeight,
            y: -slabHeight / 2
        },

        labels: {
            F: {
                x: 0,
                y: labelY,
                z:
                    length / 2 +
                    ledge +
                    off,
                rotation: [
                    -Math.PI / 2,
                    0,
                    0
                ]
            },

            B: {
                x: 0,
                y: labelY,
                z:
                    -length / 2 -
                    ledge -
                    off,
                rotation: [
                    -Math.PI / 2,
                    0,
                    Math.PI
                ]
            },

            R: {
                x:
                    width / 2 +
                    ledge +
                    off,
                y: labelY,
                z: 0,
                rotation: [
                    -Math.PI / 2,
                    0,
                    Math.PI / 2
                ]
            },

            L: {
                x:
                    -width / 2 -
                    ledge -
                    off,
                y: labelY,
                z: 0,
                rotation: [
                    -Math.PI / 2,
                    0,
                    -Math.PI / 2
                ]
            }
        }
    };
}

function createInteriorLinerSpatialData({
    interior,
    height,
    roof,
    intLinerEn,
    intLinerH,
    walls
}) {
    if (!intLinerEn || intLinerH <= 0) {
        return {
            enabled: false,
            sides: {}
        };
    }

    const offsetIn =
        DEFAULTS.interiorLinerOffset;

    const linerThick =
        DEFAULTS.interiorLinerThickness;

    const innerW =
        interior.width -
        (
            offsetIn -
            DEFAULTS.wallThickness
        ) * 2;

    const innerL =
        interior.length -
        (
            offsetIn -
            DEFAULTS.wallThickness
        ) * 2;

    const halfW = innerW / 2;
    const halfL = innerL / 2;

    const factor =
        Math.min(
            100,
            Math.max(0, intLinerH)
        ) / 100;

    const totalRise =
        roof.totalRise;

    const isSingleSlope =
        roof.isSingleSlope;

    const isLeftSloped =
        roof.type === 'left-sloped';

    const isRightSloped =
        roof.type === 'right-sloped';

    let leftWallH = height;
    let rightWallH = height;

    if (isLeftSloped) {
        rightWallH =
            height + totalRise;
    } else if (isRightSloped) {
        leftWallH =
            height + totalRise;
    }

    const actualLeftH =
        leftWallH * factor;

    const actualRightH =
        rightWallH * factor;

    const sides = {};

    if (walls.L) {
        sides.L = {
            shapeData:
                createWainscotShapeData(
                    halfL,
                    actualLeftH,
                    walls.L.holes
                ),
            position: {
                x: -halfW,
                y: 0,
                z: 0
            },
            rotationY:
                Math.PI / 2
        };
    }

    if (walls.R) {
        sides.R = {
            shapeData:
                createWainscotShapeData(
                    halfL,
                    actualRightH,
                    walls.R.holes
                ),
            position: {
                x: halfW,
                y: 0,
                z: 0
            },
            rotationY:
                -Math.PI / 2
        };
    }

    const getFrontBackShapeData =
        (isBack = false) => {
            const hL =
                isBack
                    ? actualRightH
                    : actualLeftH;

            const hR =
                isBack
                    ? actualLeftH
                    : actualRightH;

            let points;

            if (isSingleSlope) {
                points = [
                    { x: -halfW, y: 0 },
                    { x: halfW, y: 0 },
                    { x: halfW, y: hR },
                    { x: -halfW, y: hL }
                ];
            } else {
                const centerH =
                    (
                        height +
                        totalRise
                    ) * factor;

                points = [
                    { x: -halfW, y: 0 },
                    { x: halfW, y: 0 },
                    { x: halfW, y: hR },
                    { x: 0, y: centerH },
                    { x: -halfW, y: hL }
                ];
            }

            return {
                points,
                holes:
                    (
                        isBack
                            ? walls.B?.holes
                            : walls.F?.holes
                    ) || []
            };
        };

    if (walls.F) {
        sides.F = {
            shapeData:
                getFrontBackShapeData(false),
            position: {
                x: 0,
                y: 0,
                z:
                    halfL -
                    linerThick
            },
            rotationY: 0
        };
    }

    if (walls.B) {
        sides.B = {
            shapeData:
                getFrontBackShapeData(true),
            position: {
                x: 0,
                y: 0,
                z:
                    -halfL +
                    linerThick
            },
            rotationY: Math.PI
        };
    }

    return {
        enabled: true,
        thickness: linerThick,
        offsetIn,
        sides
    };
}

function createMezzanineSpatialData({
    interior,
    height,
    mezzEn,
    mezzCov,
    mezzZ,
    mezzH
}) {
    if (!mezzEn) {
        return null;
    }

    const innerW = interior.width;
    const innerL = interior.length;

    const covFactor =
        (parseInt(mezzCov, 10) || 1) / 3;

    const mezzL =
        innerL * covFactor;

    const actualH =
        height *
        (
            Math.min(
                100,
                Math.max(40, mezzH)
            ) / 100
        );

    const maxZShift =
        innerL - mezzL;

    const zOffset =
        -innerL / 2 +
        mezzL / 2 +
        maxZShift *
        (
            Math.min(
                100,
                Math.max(0, mezzZ)
            ) / 100
        );

    const inset =
        DEFAULTS.mezzanineColumnInset;

    const columnPositions = [
        {
            x: -innerW / 2 + inset,
            y: 0,
            z:
                zOffset -
                mezzL / 2 +
                inset,
            height: actualH
        },

        {
            x: -innerW / 2 + inset,
            y: 0,
            z:
                zOffset +
                mezzL / 2 -
                inset,
            height: actualH
        },

        {
            x: innerW / 2 - inset,
            y: 0,
            z:
                zOffset -
                mezzL / 2 +
                inset,
            height: actualH
        },

        {
            x: innerW / 2 - inset,
            y: 0,
            z:
                zOffset +
                mezzL / 2 -
                inset,
            height: actualH
        }
    ];

    return {
        width: innerW,
        length: mezzL,
        height: actualH,
        zOffset,
        columnPositions
    };
}

function createCraneSpatialData({
    interior,
    height,
    craneEn,
    craneZ
}) {
    if (!craneEn) {
        return null;
    }

    const innerW = interior.width;
    const innerL = interior.length;

    const craneY =
        height *
        DEFAULTS.craneHeightRatio;

    const bridgeZ =
        -innerL / 2 +
        innerL *
        (
            Math.min(
                100,
                Math.max(0, craneZ)
            ) / 100
        );

    const railInset =
        DEFAULTS.craneRailInset;

    return {
        runwayLength: innerL,
        height: craneY,

        rails: {
            left: {
                x:
                    -innerW / 2 +
                    railInset,
                y: craneY,
                z: 0
            },

            right: {
                x:
                    innerW / 2 -
                    railInset,
                y: craneY,
                z: 0
            }
        },

        bridge: {
            width:
                innerW -
                railInset * 2,

            y:
                craneY +
                DEFAULTS.craneBridgeHeightOffset,

            z: bridgeZ
        }
    };
}

function createAuxiliarySpatialData({
    width,
    length,
    height,
    pitchRatio,
    roofType,
    wallThickness,
    drivewayEn
}) {
    const halfW = width / 2;
    const halfL = length / 2;

    const driveW =
        width *
        DEFAULTS.drivewayWidthRatio;

    const driveL =
        DEFAULTS.drivewayLength;

    const driveH =
        DEFAULTS.drivewayHeight;

    const driveway =
        drivewayEn
            ? {
                width: driveW,
                length: driveL,
                height: driveH,
                position: {
                    x: 0,
                    y: -driveH / 2,
                    z:
                        halfL +
                        driveL / 2
                }
            }
            : null;

    const logoWidth =
        DEFAULTS.logoWidth;

    const logoHeight =
        DEFAULTS.logoHeight;

    const plateThick =
        DEFAULTS.logoPlateThickness;

    const margin =
        DEFAULTS.logoPlateMargin;

    const halfPlateW =
        (
            logoWidth +
            DEFAULTS.logoPlateWidthExtra
        ) / 2;

    const halfPlateH =
        (
            logoHeight +
            DEFAULTS.logoPlateHeightExtra
        ) / 2;

    const isG =
        roofType === 'gabled';

    const isLeftSloped =
        roofType === 'left-sloped';

    const isRightSloped =
        roofType === 'right-sloped';

    let roofHAtLeftCorner = height;
    let roofHAtRightCorner = height;

    if (isG) {
        roofHAtLeftCorner =
            height +
            (
                halfW -
                halfPlateW
            ) *
            pitchRatio;

        roofHAtRightCorner =
            roofHAtLeftCorner;
    } else if (isLeftSloped) {
        roofHAtLeftCorner =
            height +
            (
                halfW -
                halfPlateW
            ) *
            pitchRatio;

        roofHAtRightCorner =
            height +
            (
                halfW +
                halfPlateW
            ) *
            pitchRatio;
    } else if (isRightSloped) {
        roofHAtLeftCorner =
            height +
            (
                halfW +
                halfPlateW
            ) *
            pitchRatio;

        roofHAtRightCorner =
            height +
            (
                halfW -
                halfPlateW
            ) *
            pitchRatio;
    }

    const minAvailableRoofH =
        Math.min(
            roofHAtLeftCorner,
            roofHAtRightCorner
        );

    const maxTopY =
        minAvailableRoofH -
        margin;

    const targetY =
        maxTopY -
        halfPlateH;

    return {
        driveway,

        logo: {
            targetY,

            position: {
                x: 0,
                y: targetY,
                z:
                    halfL +
                    wallThickness +
                    plateThick / 2
            }
        }
    };
}

function createAwningWallShape(
    points
) {
    return {
        points
    };
}

function createAwningsSpatialData({
    width,
    length,
    height,
    ltState,
    openingsData,
    openingDefs
}) {
    const maxAllowedDepth =
        width / 2;

    const wallOffset =
        DEFAULTS.awningWallOffset;

    const wOX =
        width / 2 +
        wallOffset;

    const wOZ =
        length / 2 +
        wallOffset;

    const awnings = {};

    ['L', 'R', 'F', 'B'].forEach(side => {
        const c = ltState[side];

        if (!c || !c.active) {
            return;
        }

        const actualDepth =
            Math.min(
                finite(c.depth, 0),
                maxAllowedDepth
            );

        const isFB =
            side === 'F' ||
            side === 'B';

        const baseLength =
            isFB
                ? width
                : length;

        const actualW =
            baseLength -
            finite(c.cutL, 0) -
            finite(c.cutR, 0);

        if (actualW <= 0) {
            return;
        }

        let startY =
            height -
            finite(c.drop, 0);

        const pitchAng =
            Math.atan(
                finite(c.pitch, 0) / 12
            );

        const shiftOffset =
            (
                finite(c.cutL, 0) -
                finite(c.cutR, 0)
            ) / 2;

        const wallOps =
            openingsData[side] || [];

        let minAllowedRoofTopY = 0;
        const windowForbiddenRanges = [];

        wallOps.forEach(op => {
            const def =
                openingDefs[op.type] || {
                    w: 1,
                    h: 1,
                    yOff: 0
                };

            const h =
                op.h || def.h;

            if (op.type === 'Window') {
                const yOff =
                    op.yOff !== undefined
                        ? op.yOff
                        : (
                            def.yOff ||
                            1
                        );

                windowForbiddenRanges.push({
                    bottomBoundary:
                        Math.max(
                            0,
                            yOff -
                            DEFAULTS.awningWindowTolerance
                        ),

                    topBoundary:
                        yOff +
                        h +
                        DEFAULTS.awningWindowTolerance
                });
            } else {
                const doorTop =
                    h +
                    DEFAULTS.awningDoorTolerance;

                minAllowedRoofTopY =
                    Math.max(
                        minAllowedRoofTopY,
                        doorTop
                    );
            }
        });

        if (
            minAllowedRoofTopY > 0 &&
            startY < minAllowedRoofTopY
        ) {
            startY =
                minAllowedRoofTopY;
        }

        windowForbiddenRanges.forEach(range => {
            if (
                startY >
                range.bottomBoundary &&
                startY <
                range.topBoundary
            ) {
                if (minAllowedRoofTopY > 0) {
                    startY =
                        range.topBoundary;
                    return;
                }

                const distToTop =
                    Math.abs(
                        range.topBoundary -
                        startY
                    );

                const distToBottom =
                    Math.abs(
                        startY -
                        range.bottomBoundary
                    );

                startY =
                    distToTop <= distToBottom ||
                    range.bottomBoundary <=
                        DEFAULTS.awningMinPostHeight
                        ? range.topBoundary
                        : range.bottomBoundary;
            }
        });

        startY =
            Math.min(
                startY,
                height
            );

        const roofDrop =
            actualDepth *
            Math.tan(pitchAng);

        const postH =
            startY -
            roofDrop;

        if (
            postH <=
            DEFAULTS.awningMinPostHeight
        ) {
            return;
        }

        let position = {
            x: 0,
            y: startY,
            z: 0
        };

        let rotationY = 0;

        if (side === 'F') {
            position = {
                x: shiftOffset,
                y: startY,
                z: wOZ
            };
            rotationY = -Math.PI / 2;
        } else if (side === 'B') {
            position = {
                x: shiftOffset,
                y: startY,
                z: -wOZ
            };
            rotationY = Math.PI / 2;
        } else if (side === 'R') {
            position = {
                x: wOX,
                y: startY,
                z: shiftOffset
            };
        } else {
            position = {
                x: -wOX,
                y: startY,
                z: shiftOffset
            };
            rotationY = Math.PI;
        }

        const wallThickness =
            DEFAULTS.wallThickness;

        const wallRoofClearance =
            DEFAULTS.awningWallRoofClearance;

        const sideWallTopAtStart =
            startY +
            wallRoofClearance;

        const sideWallTopAtEnd =
            startY -
            roofDrop +
            wallRoofClearance;

        const wallF =
            c.wallF
                ? {
                    thickness: wallThickness,

                    shapeData:
                        createAwningWallShape([
                            {
                                x: -actualW / 2,
                                y: 0
                            },
                            {
                                x: actualW / 2,
                                y: 0
                            },
                            {
                                x: actualW / 2,
                                y: postH
                            },
                            {
                                x: -actualW / 2,
                                y: postH
                            },
                            {
                                x: -actualW / 2,
                                y: 0
                            }
                        ]),

                    position: {
                        x:
                            actualDepth -
                            wallThickness / 2,
                        y: -startY,
                        z: 0
                    },

                    rotationY: Math.PI / 2
                }
                : null;

        const sideWallPoints = [
            { x: 0, y: 0 },
            { x: actualDepth, y: 0 },
            {
                x: actualDepth,
                y: sideWallTopAtEnd
            },
            {
                x: 0,
                y: sideWallTopAtStart
            },
            { x: 0, y: 0 }
        ];

        const wallL =
            c.wallL
                ? {
                    thickness: wallThickness,
                    shapeData:
                        createAwningWallShape(
                            sideWallPoints
                        ),
                    position: {
                        x: 0,
                        y: -startY,
                        z: -actualW / 2
                    },
                    rotationY: Math.PI / 2
                }
                : null;

        const wallR =
            c.wallR
                ? {
                    thickness: wallThickness,
                    shapeData:
                        createAwningWallShape(
                            sideWallPoints
                        ),
                    position: {
                        x: actualDepth,
                        y: -startY,
                        z: actualW / 2
                    },
                    rotationY: -Math.PI / 2
                }
                : null;

        const columnSize =
            DEFAULTS.awningColumnSize;

        const columnY =
            -startY +
            postH / 2;

        const columnX =
            actualDepth -
            columnSize / 2;

        const columns = [
            {
                size: columnSize,
                height: postH,
                position: {
                    x: columnX,
                    y: columnY,
                    z:
                        -actualW / 2 +
                        columnSize / 2
                }
            },
            {
                size: columnSize,
                height: postH,
                position: {
                    x: columnX,
                    y: columnY,
                    z:
                        actualW / 2 -
                        columnSize / 2
                }
            }
        ];

        awnings[side] = {
            width: actualW,
            depth: actualDepth,
            startY,
            postH,
            position,
            rotationY,
            wallF,
            wallL,
            wallR,
            columns,

            roof: {
                lengthOnSlope:
                    actualDepth /
                    Math.cos(pitchAng),
                pitchAngle: pitchAng,
                thickness:
                    DEFAULTS.awningRoofThickness
            }
        };
    });

    return awnings;
}

export function createBuildingGeometry(
    options = {}
) {
    const width =
        finite(
            options.width,
            18.288
        );

    const length =
        finite(
            options.length,
            30.48
        );

    const height =
        finite(
            options.height,
            4.8768
        );

    const pitchRatio =
        finite(
            options.pitchRatio,
            0.05
        );

    const roofType =
        normalizeRoofType(
            options.roofType
        );

    const wallThickness =
        finite(
            options.wallThickness,
            DEFAULTS.wallThickness
        );

    const roofThickness =
        finite(
            options.roofThickness,
            DEFAULTS.roofThickness
        );

    const wainscotThickness =
        finite(
            options.wainscotThickness,
            DEFAULTS.wainscotThickness
        );

    const wainscotOffset =
        finite(
            options.wainscotOffset,
            DEFAULTS.wainscotOffset
        );

    const wsHeight =
        finite(
            options.wsHeight,
            0.9144
        );

    const wsEnabled =
        Boolean(options.wsEnabled);

    const intLinerEn =
        Boolean(options.intLinerEn);

    const intLinerH =
        finite(
            options.intLinerH,
            100
        );

    const mezzEn =
        Boolean(options.mezzEn);

    const mezzCov =
        options.mezzCov || '1';

    const mezzZ =
        finite(
            options.mezzZ,
            0
        );

    const mezzH =
        finite(
            options.mezzH,
            50
        );

    const craneEn =
        Boolean(options.craneEn);

    const craneZ =
        finite(
            options.craneZ,
            50
        );

    const drivewayEn =
        Boolean(options.drivewayEn);

    const ltState =
        options.ltState || {
            L: {},
            R: {},
            F: {},
            B: {}
        };

    const visibility =
        normalizeVisibility(
            options.visibility
        );

    const openingsData =
        options.openingsData || {};

    const openingDefs =
        options.openingDefs || {};

    const halfW =
        width / 2;

    const halfL =
        length / 2;

    const isLeftSloped =
        roofType === 'left-sloped';

    const isRightSloped =
        roofType === 'right-sloped';

    const isSingleSlope =
        isLeftSloped ||
        isRightSloped;

    const totalRise =
        isSingleSlope
            ? width * pitchRatio
            : halfW * pitchRatio;

    const pitchAngle =
        isSingleSlope
            ? Math.atan2(
                totalRise,
                width
            )
            : Math.atan2(
                totalRise,
                halfW
            );

    let leftWallHeight = height;
    let rightWallHeight = height;

    if (isLeftSloped) {
        rightWallHeight =
            height + totalRise;
    }

    if (isRightSloped) {
        leftWallHeight =
            height + totalRise;
    }

    const frontWallHeights = {
        left: leftWallHeight,
        right: rightWallHeight
    };

    const backWallHeights = {
        left: rightWallHeight,
        right: leftWallHeight
    };

    const walls = {};

    const wallConfigs = [
        [
            'L',
            visibility.wL,
            leftWallHeight
        ],
        [
            'R',
            visibility.wR,
            rightWallHeight
        ],
        [
            'F',
            visibility.wF,
            frontWallHeights
        ],
        [
            'B',
            visibility.wB,
            backWallHeights
        ]
    ];

    wallConfigs.forEach(
        ([side, enabled, wallHeight]) => {
            if (!enabled) return;

            walls[side] =
                createWallDefinition({
                    side,
                    width,
                    length,
                    wallHeight,
                    wallThickness,
                    openings:
                        openingsData[side] || [],
                    openingDefs,
                    roofType,
                    height,
                    totalRise
                });

            walls[side].transform =
                createWallTransform(
                    side,
                    width,
                    length,
                    wallThickness
                );
        }
    );

    const overhangs = {
        overL:
            finite(options.overL, 0),
        overR:
            finite(options.overR, 0),
        overF:
            finite(options.overF, 0),
        overB:
            finite(options.overB, 0)
    };

    const hasOverhangs =
        overhangs.overL > 0 ||
        overhangs.overR > 0 ||
        overhangs.overF > 0 ||
        overhangs.overB > 0;

    const roof =
        createRoofGeometry({
            width,
            length,
            height,
            pitchRatio,
            roofType,
            overhangs,
            roofThickness:
                hasOverhangs
                    ? DEFAULTS.overhangRoofThickness
                    : roofThickness,
            wallThickness
        });

    roof.visible =
        visibility.checkRoof;

    const innerW =
        width -
        wallThickness * 2;

    const innerL =
        length -
        wallThickness * 2;

    const interior = {
        width: innerW,
        length: innerL,
        halfWidth: innerW / 2,
        halfLength: innerL / 2
    };

    const wainscot =
        createWainscotGeometry({
            width,
            length,
            leftWallHeight,
            rightWallHeight,
            wsHeight,
            wsEnabled,
            walls,
            wallThickness,
            wainscotThickness,
            wainscotOffset
        });

    const trims =
        createTrimsSpatialData({
            width,
            length,
            height,
            roof,
            wallThickness
        });

    const gutters =
        createGuttersSpatialData({
            width,
            height,
            roof,
            openingsData,
            openingDefs
        });

    const mainFrames =
        createMainFramesSpatialData({
            width,
            length,
            height,
            roof
        });

    const girts =
        createGirtsSpatialData({
            interior,
            height
        });

    const purlins =
        createPurlinsSpatialData({
            interior,
            height,
            roof
        });

    const endWallColumns =
        createEndWallColumnsSpatialData({
            interior,
            height,
            roof
        });

    const bc =
        typeof window !== 'undefined'
            ? (
                window.ConfiguratorBackendConstraints ||
                {}
            )
            : {};

    const foundation =
        createFoundationSpatialData(
            {
                width,
                length
            },
            bc
        );

    const interiorLiner =
        createInteriorLinerSpatialData({
            interior,
            height,
            roof,
            intLinerEn,
            intLinerH,
            walls
        });

    const mezzanine =
        createMezzanineSpatialData({
            interior,
            height,
            mezzEn,
            mezzCov,
            mezzZ,
            mezzH
        });

    const crane =
        createCraneSpatialData({
            interior,
            height,
            craneEn,
            craneZ
        });

    const {
        driveway,
        logo
    } =
        createAuxiliarySpatialData({
            width,
            length,
            height,
            pitchRatio,
            roofType,
            wallThickness,
            drivewayEn
        });

    const awnings =
        createAwningsSpatialData({
            width,
            length,
            height,
            ltState,
            openingsData,
            openingDefs
        });

    return {
        version: 1,

        building: {
            width,
            length,
            height,
            halfWidth: halfW,
            halfLength: halfL,
            pitchRatio,
            pitchAngle,
            roofType,
            isSingleSlope,
            totalRise,
            leftWallHeight,
            rightWallHeight,
            wallThickness
        },

        interior,
        walls,
        roof,
        wainscot,
        trims,
        gutters,
        mainFrames,
        girts,
        purlins,
        endWallColumns,
        interiorLiner,
        mezzanine,
        crane,
        driveway,
        logo,
        awnings,

        overhangs: {
            ...overhangs,
            enabled: hasOverhangs,
            totalLength:
                length +
                overhangs.overF +
                overhangs.overB,
            zOffset:
                (
                    overhangs.overF -
                    overhangs.overB
                ) / 2
        },

        foundation,

        referencePlanes: {
            front: {
                z: halfL
            },
            back: {
                z: -halfL
            },
            left: {
                x: -halfW
            },
            right: {
                x: halfW
            },
            ground: {
                y: 0
            }
        }
    };
}