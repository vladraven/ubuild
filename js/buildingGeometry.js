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
    foundationLedge: 0.30,
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
    downspoutStrapSpacing: 2.2
});

function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeRoofType(value) {
    if (value === 'left-sloped' || value === 'right-sloped' || value === 'gabled') {
        return value;
    }
    return 'gabled';
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
    const width = finite(op.w, finite(def.w, 1.0));
    const height = finite(op.h, finite(def.h, 1.0));
    const y = op.type === 'Window' ? finite(op.yOff, finite(def.yOff, 1.0)) : 0;
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
            return createOpeningHole(
                {
                    ...op,
                    w: op.w ?? def.w,
                    h: op.h ?? def.h,
                    yOff: op.yOff ?? def.yOff
                },
                openingDefs
            );
        })
        .filter(Boolean);
}

function createWallDefinition({ side, width, length, wallHeight, wallThickness, openings, openingDefs, roofType, height, totalRise }) {
    const halfW = width / 2;
    const isLongWall = (side === 'L' || side === 'R');
    const localWidth = isLongWall ? length : width;
    const localHalfWidth = localWidth / 2;

    let points;
    let maxY;

    if (isLongWall) {
        maxY = wallHeight;
        points = [
            { x: -localHalfWidth, y: 0 },
            { x: localHalfWidth, y: 0 },
            { x: localHalfWidth, y: wallHeight },
            { x: -localHalfWidth, y: wallHeight }
        ];
    } else {
        if (roofType === 'gabled') {
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
    }

    return {
        side,
        width: localWidth,
        height: maxY,
        thickness: wallThickness,
        uvOriginX: isLongWall ? -length / 2 : -width / 2,
        points,
        holes: normalizeOpenings(openings, openingDefs),
        local: {
            minX: -localHalfWidth,
            maxX: localHalfWidth,
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
            position: { x: -halfW + wallThickness / 2, y: 0, z: 0 },
            rotationY: Math.PI / 2
        };
    }
    if (side === 'R') {
        return {
            position: { x: halfW - wallThickness / 2, y: 0, z: 0 },
            rotationY: -Math.PI / 2
        };
    }
    if (side === 'F') {
        return {
            position: { x: 0, y: 0, z: halfL - wallThickness / 2 },
            rotationY: 0
        };
    }
    return {
        position: { x: 0, y: 0, z: -halfL + wallThickness / 2 },
        rotationY: Math.PI
    };
}

function createRoofGeometry({ width, length, height, pitchRatio, roofType, overhangs, roofThickness, wallThickness }) {
    const halfW = width / 2;
    const isLeftSloped = (roofType === 'left-sloped');
    const isRightSloped = (roofType === 'right-sloped');
    const isSingleSlope = (isLeftSloped || isRightSloped);

    const hasOverhangs = overhangs.overL > 0 || overhangs.overR > 0 || overhangs.overF > 0 || overhangs.overB > 0;
    const totalRise = isSingleSlope ? width * pitchRatio : halfW * pitchRatio;
    const pitchAngle = isSingleSlope ? Math.atan2(totalRise, width) : Math.atan2(totalRise, halfW);

    const totalLength = length + overhangs.overF + overhangs.overB;
    const zOffset = (overhangs.overF - overhangs.overB) / 2;

    const eaveDropL = overhangs.overL * Math.tan(pitchAngle);
    const eaveDropR = overhangs.overR * Math.tan(pitchAngle);

    const outerLeftX = -halfW - wallThickness / 2 - overhangs.overL;
    const outerRightX = halfW + wallThickness / 2 + overhangs.overR;

    let leftEaveY = height - eaveDropL;
    let rightEaveY = height - eaveDropR;

    if (isLeftSloped) rightEaveY = height + totalRise + eaveDropR;
    if (isRightSloped) leftEaveY = height + totalRise + eaveDropL;

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
            left: { x: outerLeftX, y: leftEaveY, drop: eaveDropL, length: totalLength, z: zOffset },
            right: { x: outerRightX, y: rightEaveY, drop: eaveDropR, length: totalLength, z: zOffset }
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
        const projectionWidth = width + overhangs.overL + overhangs.overR;
        const slopeLength = projectionWidth / Math.cos(pitchAngle);
        const xOffset = (overhangs.overR - overhangs.overL) / 2;
        const yBase = height + totalRise / 2;
        const yOffset = xOffset * Math.tan(pitchAngle) * (isLeftSloped ? 1 : -1);

        result.singleSlope = {
            slopeLength,
            projectionWidth,
            rotationZ: isLeftSloped ? pitchAngle : -pitchAngle,
            position: {
                x: xOffset,
                y: yBase + yOffset,
                z: zOffset
            }
        };
        return result;
    }

    const leftProjection = halfW + overhangs.overL;
    const rightProjection = halfW + overhangs.overR;
    const leftSlopeLength = leftProjection / Math.cos(pitchAngle);
    const rightSlopeLength = rightProjection / Math.cos(pitchAngle);

    result.gabled = {
        ridge: {
            x: 0,
            y: height + totalRise,
            z: zOffset,
            length: totalLength
        },
        left: {
            projectionWidth: leftProjection,
            slopeLength: leftSlopeLength,
            rotationZ: pitchAngle,
            position: {
                x: -halfW / 2 - overhangs.overL / 2,
                y: height + (totalRise - overhangs.overL * pitchRatio) / 2,
                z: zOffset
            }
        },
        right: {
            projectionWidth: rightProjection,
            slopeLength: rightSlopeLength,
            rotationZ: -pitchAngle,
            position: {
                x: halfW / 2 + overhangs.overR / 2,
                y: height + (totalRise - overhangs.overR * pitchRatio) / 2,
                z: zOffset
            }
        }
    };

    return result;
}

function createWainscotShapeData(halfLength, height, openings) {
    const rawHoles = (openings || []).map(op => {
        const yOff = op.type === 'Window' ? (op.yOff !== undefined ? op.yOff : 1.0) : 0;
        if (yOff >= height) return null;
        const holeMinY = Math.max(0, yOff);
        const holeMaxY = Math.min(height, yOff + (op.height || op.h || 1.0));
        if (holeMaxY <= holeMinY) return null;
        const minX = op.x - (op.width || op.w || 1.0) / 2;
        const maxX = op.x + (op.width || op.w || 1.0) / 2;
        return { minX, maxX, minY: holeMinY, maxY: holeMaxY };
    }).filter(Boolean);

    return {
        points: [
            { x: -halfLength, y: 0 },
            { x: halfLength, y: 0 },
            { x: halfLength, y: height },
            { x: -halfLength, y: height },
            { x: -halfLength, y: 0 }
        ],
        holes: rawHoles
    };
}

function createWainscotGeometry({ width, length, leftWallHeight, rightWallHeight, wsHeight, wsEnabled, walls, wallThickness, wainscotThickness, wainscotOffset }) {
    if (!wsEnabled || wsHeight <= 0) {
        return { enabled: false, sides: {} };
    }

    const halfW = width / 2;
    const halfL = length / 2;

    const leftH = Math.min(wsHeight, leftWallHeight);
    const rightH = Math.min(wsHeight, rightWallHeight);
    const frontH = Math.min(wsHeight, leftWallHeight);
    const backH = Math.min(wsHeight, rightWallHeight);

    const cornerInset = 0.005;
    const sideHalfL = halfL - cornerInset;
    const sideHalfW = halfW - cornerInset;

    const sides = {};

    if (walls.L) {
        sides.L = {
            shapeData: createWainscotShapeData(sideHalfL, leftH, walls.L.holes),
            uvOriginX: -length / 2,
            position: { x: -halfW - wallThickness / 2 - wainscotOffset, y: 0, z: 0 },
            rotationY: Math.PI / 2
        };
    }
    if (walls.R) {
        sides.R = {
            shapeData: createWainscotShapeData(sideHalfL, rightH, walls.R.holes),
            uvOriginX: -length / 2,
            position: { x: halfW + wallThickness / 2 + wainscotOffset, y: 0, z: 0 },
            rotationY: -Math.PI / 2
        };
    }
    if (walls.F) {
        sides.F = {
            shapeData: createWainscotShapeData(sideHalfW, frontH, walls.F.holes),
            uvOriginX: -width / 2,
            position: { x: 0, y: 0, z: halfL + wallThickness / 2 + wainscotOffset },
            rotationY: 0
        };
    }
    if (walls.B) {
        sides.B = {
            shapeData: createWainscotShapeData(sideHalfW, backH, walls.B.holes),
            uvOriginX: -width / 2,
            position: { x: 0, y: 0, z: -halfL - wallThickness / 2 - wainscotOffset },
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

function createTrimsSpatialData({ width, length, height, roof, wallThickness }) {
    const halfW = width / 2;
    const halfL = length / 2;
    const isLeftSloped = (roof.type === 'left-sloped');
    const isRightSloped = (roof.type === 'right-sloped');
    const isG = (roof.type === 'gabled');

    const totalRise = roof.totalRise;
    const roofAngle = roof.pitchAngle;
    const roofLength = roof.totalLength;
    const roofZOffset = roof.zOffset;

    const leftEaveY = roof.eaves.left.y;
    const rightEaveY = roof.eaves.right.y;
    const eaveDropL = roof.eaves.left.drop;
    const eaveDropR = roof.eaves.right.drop;
    const outerLeftX = roof.eaves.left.x;
    const outerRightX = roof.eaves.right.x;

    const cornerBaseOffset = wallThickness / 2;
    const cornerX = halfW + cornerBaseOffset;
    const cornerZ = halfL + cornerBaseOffset;

    const corners = [
        { sx: -1, sz: 1, x: -cornerX, z: cornerZ, colH: (isRightSloped ? height + totalRise : height) },
        { sx: 1, sz: 1, x: cornerX, z: cornerZ, colH: (isLeftSloped ? height + totalRise : height) },
        { sx: 1, sz: -1, x: cornerX, z: -cornerZ, colH: (isLeftSloped ? height + totalRise : height) },
        { sx: -1, sz: -1, x: -cornerX, z: -cornerZ, colH: (isRightSloped ? height + totalRise : height) }
    ];

    const rakes = [];
    const frontZ = halfL + wallThickness / 2;
    const backZ = -halfL - wallThickness / 2;

    for (const sideZ of [-1, 1]) {
        const zPos = sideZ > 0 ? frontZ : backZ;
        if (isG) {
            const slopeLenL = Math.hypot(halfW + roof.overhang.overL, totalRise + eaveDropL);
            const slopeLenR = Math.hypot(halfW + roof.overhang.overR, totalRise + eaveDropR);

            rakes.push({
                type: 'gable-left',
                sideZ,
                zPos,
                slopeLength: slopeLenL,
                position: { x: -halfW / 2 - roof.overhang.overL / 2, y: height + totalRise / 2 - eaveDropL / 2, z: zPos },
                rotationZ: roofAngle
            });
            rakes.push({
                type: 'gable-right',
                sideZ,
                zPos,
                slopeLength: slopeLenR,
                position: { x: halfW / 2 + roof.overhang.overR / 2, y: height + totalRise / 2 - eaveDropR / 2, z: zPos },
                rotationZ: -roofAngle
            });
        } else {
            const activeOver = isLeftSloped ? roof.overhang.overL : roof.overhang.overR;
            const activeDrop = isLeftSloped ? eaveDropL : eaveDropR;
            const slopeLen = Math.hypot(width + activeOver * 2, totalRise + activeDrop * 2);
            rakes.push({
                type: 'single-slope',
                sideZ,
                zPos,
                slopeLength: slopeLen,
                position: { x: 0, y: height + totalRise / 2, z: zPos },
                rotationZ: isLeftSloped ? roofAngle : -roofAngle
            });
        }
    }

    return {
        corners,
        eaves: {
            left: { x: outerLeftX, y: leftEaveY, z: roofZOffset, length: roofLength },
            right: { x: outerRightX, y: rightEaveY, z: roofZOffset, length: roofLength }
        },
        rakes,
        ridge: isG ? {
            x: 0,
            y: height + totalRise,
            z: roofZOffset,
            length: roofLength,
            roofAngle,
            totalRise
        } : null
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

    const leftEaveY = roof.eaves.left.y;
    const rightEaveY = roof.eaves.right.y;

    const gutterOffsetY = DEFAULTS.gutterOffsetY;
    const pipeWallOffset = DEFAULTS.pipeWallOffset;
    const pipeGroundOffset = DEFAULTS.pipeGroundOffset;

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

    for (let i = 0; i < numDownspouts; i++) {
        const zPos =
            roofZOffset +
            gutterStartZ +
            i * spacing;

        const wallPos =
            zPos - roofZOffset;

        ['L', 'R'].forEach(side => {
            const doorsOnWall =
                (openingsData[side] || [])
                    .filter(op => op.type !== 'Window');

            const isColliding =
                doorsOnWall.some(door => {
                    const def =
                        openingDefs[door.type] || {
                            w: 2.0
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

            const eaveY =
                side === 'L'
                    ? leftEaveY
                    : rightEaveY;

            const overhang =
                side === 'L'
                    ? roof.overhang.overL
                    : roof.overhang.overR;

            const xGutterOutlet =
                sideX *
                (
                    halfW +
                    overhang +
                    DEFAULTS.gutterOutletOffset
                );

            const yGutterOutlet =
                eaveY +
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
                (
                    shoeLen *
                    Math.sin(shoeAngle)
                );

            const yShoeEnd =
                yShoeStart -
                (
                    shoeLen *
                    Math.cos(shoeAngle)
                );

            const verticalSegments = [];

            verticalSegments.push({
                start: {
                    x: xGutterOutlet,
                    y: yGutterOutlet
                },
                end: {
                    x: xGutterOutlet,
                    y: yElbowMid
                }
            });

            verticalSegments.push({
                start: {
                    x: xGutterOutlet,
                    y: yElbowMid
                },
                end: {
                    x: xWall,
                    y: yElbowEnd
                }
            });

            if (yElbowEnd > yShoeStart) {
                verticalSegments.push({
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

            verticalSegments.push({
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
                overhang,
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

                segments: verticalSegments,

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

function createMainFramesSpatialData({ width, length, height, roof }) {
    const isGabled = (roof.type === 'gabled');
    const isLeftSloped = (roof.type === 'left-sloped');
    const halfW = width / 2;
    const halfL = length / 2;
    const ang = roof.pitchAngle;
    const totalRise = roof.totalRise;

    const numFrames = Math.max(2, Math.round(length / 6) + 1);
    const innerHalfW = halfW - DEFAULTS.frameInsetX;
    const usableLength = length - DEFAULTS.frameInsetZ * 2;
    const spacing = usableLength / (numFrames - 1);

    const frames = [];

    for (let i = 0; i < numFrames; i++) {
        const zPos = -halfL + DEFAULTS.frameInsetZ + i * spacing;

        if (isGabled) {
            const rafterSpan = innerHalfW - DEFAULTS.colDEnd / 2;
            const rafterLen = rafterSpan / Math.cos(ang);

            frames.push({
                index: i,
                zPos,
                isGabled: true,
                columns: {
                    left: { x: -innerHalfW, y: 0, height, scaleX: 1, dStart: DEFAULTS.colDStart, dEnd: DEFAULTS.colDEnd },
                    right: { x: innerHalfW, y: 0, height, scaleX: -1, dStart: DEFAULTS.colDStart, dEnd: DEFAULTS.colDEnd }
                },
                rafters: [
                    {
                        type: 'left',
                        length: rafterLen,
                        dStart: DEFAULTS.rafterDStart,
                        dEnd: DEFAULTS.rafterDEnd,
                        rotationZ: ang,
                        position: { x: -innerHalfW + DEFAULTS.colDEnd / 2, y: height, z: 0 }
                    },
                    {
                        type: 'right',
                        length: rafterLen,
                        dStart: DEFAULTS.rafterDEnd,
                        dEnd: DEFAULTS.rafterDStart,
                        rotationZ: -ang,
                        position: { x: 0, y: height + rafterSpan * Math.tan(ang), z: 0 }
                    }
                ]
            });
        } else {
            const hL = isLeftSloped ? height : height + totalRise;
            const hR = isLeftSloped ? height + totalRise : height;
            const rafterSpan = (innerHalfW * 2) - DEFAULTS.colDEnd;
            const rafterLen = rafterSpan / Math.cos(ang);

            frames.push({
                index: i,
                zPos,
                isGabled: false,
                columns: {
                    left: { x: -innerHalfW, y: 0, height: hL, scaleX: 1, dStart: DEFAULTS.colDStart, dEnd: DEFAULTS.colDEnd },
                    right: { x: innerHalfW, y: 0, height: hR, scaleX: -1, dStart: DEFAULTS.colDStart, dEnd: DEFAULTS.colDEnd }
                },
                rafters: [
                    {
                        type: isLeftSloped ? 'left-slope' : 'right-slope',
                        length: rafterLen,
                        dStart: isLeftSloped ? DEFAULTS.rafterDEnd : DEFAULTS.rafterDStart,
                        dEnd: isLeftSloped ? DEFAULTS.rafterDStart : DEFAULTS.rafterDEnd,
                        rotationZ: isLeftSloped ? ang : -ang,
                        position: { x: -innerHalfW + DEFAULTS.colDEnd / 2, y: hL, z: 0 }
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

function createGirtsSpatialData({ interior, height }) {
    const innerW = interior.width;
    const innerL = interior.length;
    const girtThick = DEFAULTS.girtThickness;
    const stepY = DEFAULTS.girtStepY;
    const numGirts = Math.floor(height / stepY);

    const levels = [];
    for (let i = 1; i <= numGirts; i++) {
        const y = i * stepY;
        levels.push({
            index: i,
            y,
            left: { x: -innerW / 2 + girtThick / 2, z: 0, length: innerL },
            right: { x: innerW / 2 - girtThick / 2, z: 0, length: innerL },
            front: { x: 0, z: innerL / 2 - girtThick / 2, width: innerW - girtThick * 2 },
            back: { x: 0, z: -innerL / 2 + girtThick / 2, width: innerW - girtThick * 2 }
        });
    }

    return {
        countPerSide: numGirts,
        thickness: girtThick,
        stepY,
        levels
    };
}

function createPurlinsSpatialData({ interior, height, roof }) {
    const innerW = interior.width;
    const innerL = interior.length;
    const halfW = innerW / 2;

    const isG = (roof.type === 'gabled');
    const isRightSloped = (roof.type === 'right-sloped');
    const ang = roof.pitchAngle;

    const pSize = DEFAULTS.purlinSize;
    const stepDist = DEFAULTS.purlinStepDist;
    const offset = pSize / 2;

    const items = [];

    if (isG) {
        const numPurlins = Math.floor(halfW / (stepDist * Math.cos(ang)));
        for (let i = 1; i <= numPurlins; i++) {
            const dist = i * stepDist;

            const xR = (halfW - dist * Math.cos(ang)) + offset * Math.sin(ang);
            const yR = (height + dist * Math.sin(ang)) - offset * Math.cos(ang);
            items.push({
                slope: 'right',
                distOnSlope: dist,
                position: { x: xR, y: yR, z: 0 },
                rotationZ: ang,
                length: innerL,
                size: pSize
            });

            const xL = -(halfW - dist * Math.cos(ang)) - offset * Math.sin(ang);
            const yL = (height + dist * Math.sin(ang)) - offset * Math.cos(ang);
            items.push({
                slope: 'left',
                distOnSlope: dist,
                position: { x: xL, y: yL, z: 0 },
                rotationZ: -ang,
                length: innerL,
                size: pSize
            });
        }
    } else {
        const totalSpan = innerW / Math.cos(ang);
        const numPurlins = Math.floor(totalSpan / stepDist);
        const dir = isRightSloped ? -1 : 1;
        const startX = isRightSloped ? halfW : -halfW;

        for (let i = 1; i <= numPurlins; i++) {
            const dist = i * stepDist;
            const posX = (startX + dir * (dist * Math.cos(ang))) + offset * Math.sin(dir * ang);
            const posY = (height + dist * Math.sin(ang)) - offset * Math.cos(ang);

            items.push({
                slope: 'single',
                distOnSlope: dist,
                position: { x: posX, y: posY, z: 0 },
                rotationZ: dir * ang,
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

function createEndWallColumnsSpatialData({ interior, height, roof }) {
    const innerW = interior.width;
    const innerL = interior.length;
    const colThick = DEFAULTS.endWallColThickness;
    const colStep = DEFAULTS.endWallColStep;
    const halfW = innerW / 2;
    const zOffset = colThick / 2 + 0.25;

    const isG = (roof.type === 'gabled');
    const isLeftSloped = (roof.type === 'left-sloped');
    const isRightSloped = (roof.type === 'right-sloped');
    const pitchRatio = roof.pitchRatio;

    const columns = [];

    for (const z of [-innerL / 2 + zOffset, innerL / 2 - zOffset]) {
        const wallName = z > 0 ? 'front' : 'back';
        for (let x = -halfW + colStep; x <= halfW - colStep; x += colStep) {
            let colH = height;
            if (isG) {
                colH += (halfW - Math.abs(x)) * pitchRatio;
            } else if (isLeftSloped) {
                colH += (x + halfW) * pitchRatio;
            } else if (isRightSloped) {
                colH += (halfW - x) * pitchRatio;
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
        zOffsets: [-innerL / 2 + zOffset, innerL / 2 - zOffset],
        columns
    };
}

function createFoundationSpatialData({ width, length }, bc) {
    const ledge = DEFAULTS.foundationLedge;
    const foundationHeight = bc.max_foundation_height !== undefined
        ? Math.min(bc.max_foundation_height, 0.6096)
        : 0.45;

    const totalW = width + ledge * 2;
    const totalL = length + ledge * 2;
    const off = width / 2 + 8;
    const labelY = 0.05;

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
            height: 0.10,
            y: -0.05
        },
        labels: {
            F: { x: 0, y: labelY, z: length / 2 + ledge + off, rotation: [-Math.PI / 2, 0, 0] },
            B: { x: 0, y: labelY, z: -length / 2 - ledge - off, rotation: [-Math.PI / 2, 0, Math.PI] },
            R: { x: width / 2 + ledge + off, y: labelY, z: 0, rotation: [-Math.PI / 2, 0, Math.PI / 2] },
            L: { x: -width / 2 - ledge - off, y: labelY, z: 0, rotation: [-Math.PI / 2, 0, -Math.PI / 2] }
        }
    };
}

function createInteriorLinerSpatialData({ interior, height, roof, intLinerEn, intLinerH, walls }) {
    if (!intLinerEn || intLinerH <= 0) {
        return { enabled: false, sides: {} };
    }

    const offsetIn = 0.75;
    const linerThick = 0.01;
    const innerW = interior.width - (offsetIn - DEFAULTS.wallThickness) * 2;
    const innerL = interior.length - (offsetIn - DEFAULTS.wallThickness) * 2;
    const halfW = innerW / 2;
    const halfL = innerL / 2;

    const factor = Math.min(100, Math.max(0, intLinerH)) / 100;
    const totalRise = roof.totalRise;
    const isSingleSlope = roof.isSingleSlope;
    const isLeftSloped = (roof.type === 'left-sloped');
    const isRightSloped = (roof.type === 'right-sloped');

    let leftWallH = height;
    let rightWallH = height;
    if (isLeftSloped) rightWallH = height + totalRise;
    else if (isRightSloped) leftWallH = height + totalRise;

    const actualLeftH = leftWallH * factor;
    const actualRightH = rightWallH * factor;

    const sides = {};

    if (walls.L) {
        sides.L = {
            shapeData: createWainscotShapeData(halfL, actualLeftH, walls.L.holes),
            position: { x: -halfW, y: 0, z: 0 },
            rotationY: Math.PI / 2
        };
    }
    if (walls.R) {
        sides.R = {
            shapeData: createWainscotShapeData(halfL, actualRightH, walls.R.holes),
            position: { x: halfW, y: 0, z: 0 },
            rotationY: -Math.PI / 2
        };
    }

    const getFrontBackShapeData = (isBack = false) => {
        const hL = isBack ? actualRightH : actualLeftH;
        const hR = isBack ? actualLeftH : actualRightH;
        let points;

        if (isSingleSlope) {
            points = [
                { x: -halfW, y: 0 },
                { x: halfW, y: 0 },
                { x: halfW, y: hR },
                { x: -halfW, y: hL }
            ];
        } else {
            const centerH = (height + totalRise) * factor;
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
            holes: (isBack ? walls.B?.holes : walls.F?.holes) || []
        };
    };

    if (walls.F) {
        sides.F = {
            shapeData: getFrontBackShapeData(false),
            position: { x: 0, y: 0, z: halfL - linerThick },
            rotationY: 0
        };
    }
    if (walls.B) {
        sides.B = {
            shapeData: getFrontBackShapeData(true),
            position: { x: 0, y: 0, z: -halfL + linerThick },
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

function createMezzanineSpatialData({ interior, height, mezzEn, mezzCov, mezzZ, mezzH }) {
    if (!mezzEn) return null;

    const innerW = interior.width;
    const innerL = interior.length;
    const covFactor = (parseInt(mezzCov, 10) || 1) / 3;
    const mezzL = innerL * covFactor;
    const actualH = height * (Math.min(100, Math.max(40, mezzH)) / 100);
    const maxZShift = innerL - mezzL;
    const zOffset = -innerL / 2 + mezzL / 2 + maxZShift * (Math.min(100, Math.max(0, mezzZ)) / 100);

    const columnPositions = [
        { x: -innerW / 2 + 0.3, y: 0, z: zOffset - mezzL / 2 + 0.3, height: actualH },
        { x: -innerW / 2 + 0.3, y: 0, z: zOffset + mezzL / 2 - 0.3, height: actualH },
        { x: innerW / 2 - 0.3, y: 0, z: zOffset - mezzL / 2 + 0.3, height: actualH },
        { x: innerW / 2 - 0.3, y: 0, z: zOffset + mezzL / 2 - 0.3, height: actualH }
    ];

    return {
        width: innerW,
        length: mezzL,
        height: actualH,
        zOffset,
        columnPositions
    };
}

function createCraneSpatialData({ interior, height, craneEn, craneZ }) {
    if (!craneEn) return null;

    const innerW = interior.width;
    const innerL = interior.length;
    const craneY = height * 0.75;
    const bridgeZ = -innerL / 2 + innerL * (Math.min(100, Math.max(0, craneZ)) / 100);

    return {
        runwayLength: innerL,
        height: craneY,
        rails: {
            left: { x: -innerW / 2 + 0.1, y: craneY, z: 0 },
            right: { x: innerW / 2 - 0.1, y: craneY, z: 0 }
        },
        bridge: {
            width: innerW - 0.2,
            y: craneY + 0.2,
            z: bridgeZ
        }
    };
}

function createAuxiliarySpatialData({ width, length, height, pitchRatio, roofType, wallThickness, drivewayEn }) {
    const halfW = width / 2;
    const halfL = length / 2;
    const driveW = width * 0.25;
    const driveL = 8.0;
    const driveH = 0.08;

    const driveway = drivewayEn ? {
        width: driveW,
        length: driveL,
        height: driveH,
        position: { x: 0, y: -driveH / 2, z: halfL + driveL / 2 }
    } : null;

    const logoWidth = 1.0;
    const logoHeight = 0.33;
    const plateThick = 0.08;
    const margin = 0.15;
    const halfPlateW = (logoWidth + 0.12) / 2;
    const halfPlateH = (logoHeight + 0.12) / 2;

    const isG = (roofType === 'gabled');
    const isLeftSloped = (roofType === 'left-sloped');
    const isRightSloped = (roofType === 'right-sloped');

    let roofHAtLeftCorner = height;
    let roofHAtRightCorner = height;

    if (isG) {
        roofHAtLeftCorner = height + (halfW - halfPlateW) * pitchRatio;
        roofHAtRightCorner = height + (halfW - halfPlateW) * pitchRatio;
    } else if (isLeftSloped) {
        roofHAtLeftCorner = height + (halfW - halfPlateW) * pitchRatio;
        roofHAtRightCorner = height + (halfW + halfPlateW) * pitchRatio;
    } else if (isRightSloped) {
        roofHAtLeftCorner = height + (halfW + halfPlateW) * pitchRatio;
        roofHAtRightCorner = height + (halfW - halfPlateW) * pitchRatio;
    }

    const minAvailableRoofH = Math.min(roofHAtLeftCorner, roofHAtRightCorner);
    const maxTopY = minAvailableRoofH - margin;
    const targetY = maxTopY - halfPlateH;

    const logo = {
        targetY,
        position: { x: 0, y: targetY, z: halfL + wallThickness + plateThick / 2 }
    };

    return { driveway, logo };
}

function createAwningsSpatialData({ width, length, height, ltState, openingsData, openingDefs }) {
    const maxAllowedDepth = width / 2;
    const wallOffset = 0.03;
    const wOX = width / 2 + wallOffset;
    const wOZ = length / 2 + wallOffset;

    const awnings = {};

    ['L', 'R', 'F', 'B'].forEach(side => {
        const c = ltState[side];
        if (!c || !c.active) return;

        const actualDepth = Math.min(c.depth, maxAllowedDepth);
        const isFB = (side === 'F' || side === 'B');
        const baseLength = isFB ? width : length;
        const actualW = baseLength - c.cutL - c.cutR;
        if (actualW <= 0) return;

        let startY = height - c.drop;
        const pitchAng = Math.atan(c.pitch / 12);
        const shiftOffset = (c.cutL - c.cutR) / 2;

        const wallOps = openingsData[side] || [];
        let minAllowedRoofTopY = 0;
        let windowForbiddenRanges = [];

        wallOps.forEach(op => {
            const def = openingDefs[op.type] || { w: 1.0, h: 1.0, yOff: 0 };
            const h = op.h || def.h;
            const isWindow = op.type === 'Window';

            if (isWindow) {
                const yOff = op.yOff !== undefined ? op.yOff : (def.yOff || 1.0);
                const winBottom = yOff;
                const winTop = yOff + h;

                windowForbiddenRanges.push({
                    bottomBoundary: Math.max(0, winBottom - 0.05),
                    topBoundary: winTop + 0.05
                });
            } else {
                const doorTop = h + 0.05;
                if (doorTop > minAllowedRoofTopY) {
                    minAllowedRoofTopY = doorTop;
                }
            }
        });

        if (minAllowedRoofTopY > 0 && startY < minAllowedRoofTopY) {
            startY = minAllowedRoofTopY;
        }

        windowForbiddenRanges.forEach(range => {
            if (startY > range.bottomBoundary && startY < range.topBoundary) {
                if (minAllowedRoofTopY > 0) {
                    startY = range.topBoundary;
                } else {
                    const distToTop = Math.abs(range.topBoundary - startY);
                    const distToBottom = Math.abs(startY - range.bottomBoundary);
                    if (distToTop <= distToBottom || range.bottomBoundary <= 0.2) {
                        startY = range.topBoundary;
                    } else {
                        startY = range.bottomBoundary;
                    }
                }
            }
        });

        if (startY > height) startY = height;

        const postH = startY - (actualDepth * Math.tan(pitchAng));
        if (postH <= 0.2) return;

        let pos = { x: 0, y: startY, z: 0 };
        let rotY = 0;

        if (side === 'F') { pos = { x: shiftOffset, y: startY, z: wOZ }; rotY = -Math.PI / 2; }
        else if (side === 'B') { pos = { x: shiftOffset, y: startY, z: -wOZ }; rotY = Math.PI / 2; }
        else if (side === 'R') { pos = { x: wOX, y: startY, z: shiftOffset }; rotY = 0; }
        else if (side === 'L') { pos = { x: -wOX, y: startY, z: shiftOffset }; rotY = Math.PI; }

        awnings[side] = {
            width: actualW,
            depth: actualDepth,
            startY,
            postH,
            position: pos,
            rotationY: rotY,
            wallF: c.wallF,
            wallL: c.wallL,
            wallR: c.wallR,
            roof: {
                lengthOnSlope: actualDepth / Math.cos(pitchAng),
                pitchAngle: pitchAng
            }
        };
    });

    return awnings;
}

export function createBuildingGeometry(options = {}) {
    const width = finite(options.width, 18.288);
    const length = finite(options.length, 30.48);
    const height = finite(options.height, 4.8768);
    const pitchRatio = finite(options.pitchRatio, 0.05);
    const roofType = normalizeRoofType(options.roofType);
    const wallThickness = finite(options.wallThickness, DEFAULTS.wallThickness);
    const roofThickness = finite(options.roofThickness, DEFAULTS.roofThickness);
    const wainscotThickness = finite(options.wainscotThickness, DEFAULTS.wainscotThickness);
    const wainscotOffset = finite(options.wainscotOffset, DEFAULTS.wainscotOffset);
    const wsHeight = finite(options.wsHeight, 0.9144);
    const wsEnabled = Boolean(options.wsEnabled);

    const intLinerEn = Boolean(options.intLinerEn);
    const intLinerH = finite(options.intLinerH, 100);

    const mezzEn = Boolean(options.mezzEn);
    const mezzCov = options.mezzCov || '1';
    const mezzZ = finite(options.mezzZ, 0);
    const mezzH = finite(options.mezzH, 50);

    const craneEn = Boolean(options.craneEn);
    const craneZ = finite(options.craneZ, 50);

    const drivewayEn = Boolean(options.drivewayEn);
    const ltState = options.ltState || { L: {}, R: {}, F: {}, B: {} };

    const visibility = normalizeVisibility(options.visibility);
    const openingsData = options.openingsData || {};
    const openingDefs = options.openingDefs || {};

    const halfW = width / 2;
    const halfL = length / 2;

    const isLeftSloped = roofType === 'left-sloped';
    const isRightSloped = roofType === 'right-sloped';
    const isSingleSlope = isLeftSloped || isRightSloped;

    const totalRise = isSingleSlope ? width * pitchRatio : halfW * pitchRatio;
    const pitchAngle = isSingleSlope ? Math.atan2(totalRise, width) : Math.atan2(totalRise, halfW);

    let leftWallHeight = height;
    let rightWallHeight = height;

    if (isLeftSloped) rightWallHeight = height + totalRise;
    if (isRightSloped) leftWallHeight = height + totalRise;

    const frontWallHeights = { left: leftWallHeight, right: rightWallHeight };
    const backWallHeights = { left: rightWallHeight, right: leftWallHeight };

    const walls = {};

    if (visibility.wL) {
        walls.L = createWallDefinition({
            side: 'L',
            width,
            length,
            wallHeight: leftWallHeight,
            wallThickness,
            openings: openingsData.L || [],
            openingDefs,
            roofType,
            height,
            totalRise
        });
        walls.L.transform = createWallTransform('L', width, length, wallThickness);
    }

    if (visibility.wR) {
        walls.R = createWallDefinition({
            side: 'R',
            width,
            length,
            wallHeight: rightWallHeight,
            wallThickness,
            openings: openingsData.R || [],
            openingDefs,
            roofType,
            height,
            totalRise
        });
        walls.R.transform = createWallTransform('R', width, length, wallThickness);
    }

    if (visibility.wF) {
        walls.F = createWallDefinition({
            side: 'F',
            width,
            length,
            wallHeight: frontWallHeights,
            wallThickness,
            openings: openingsData.F || [],
            openingDefs,
            roofType,
            height,
            totalRise
        });
        walls.F.transform = createWallTransform('F', width, length, wallThickness);
    }

    if (visibility.wB) {
        walls.B = createWallDefinition({
            side: 'B',
            width,
            length,
            wallHeight: backWallHeights,
            wallThickness,
            openings: openingsData.B || [],
            openingDefs,
            roofType,
            height,
            totalRise
        });
        walls.B.transform = createWallTransform('B', width, length, wallThickness);
    }

    const overhangs = {
        overL: finite(options.overL, 0),
        overR: finite(options.overR, 0),
        overF: finite(options.overF, 0),
        overB: finite(options.overB, 0)
    };

    const hasOverhangs = overhangs.overL > 0 || overhangs.overR > 0 || overhangs.overF > 0 || overhangs.overB > 0;

    const roof = createRoofGeometry({
        width,
        length,
        height,
        pitchRatio,
        roofType,
        overhangs,
        roofThickness: hasOverhangs ? DEFAULTS.overhangRoofThickness : roofThickness,
        wallThickness
    });

    roof.visible = visibility.checkRoof;

    const innerW = width - wallThickness * 2;
    const innerL = length - wallThickness * 2;

    const interior = {
        width: innerW,
        length: innerL,
        halfWidth: innerW / 2,
        halfLength: innerL / 2
    };

    const wainscot = createWainscotGeometry({
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

    const trims = createTrimsSpatialData({
        width,
        length,
        height,
        roof,
        wallThickness
    });

    const gutters = createGuttersSpatialData({
        width,
        height,
        roof,
        openingsData,
        openingDefs
    });

    const mainFrames = createMainFramesSpatialData({
        width,
        length,
        height,
        roof
    });

    const girts = createGirtsSpatialData({
        interior,
        height
    });

    const purlins = createPurlinsSpatialData({
        interior,
        height,
        roof
    });

    const endWallColumns = createEndWallColumnsSpatialData({
        interior,
        height,
        roof
    });

    const bc = window.ConfiguratorBackendConstraints || {};
    const foundation = createFoundationSpatialData({
        width,
        length
    }, bc);

    const interiorLiner = createInteriorLinerSpatialData({
        interior,
        height,
        roof,
        intLinerEn,
        intLinerH,
        walls
    });

    const mezzanine = createMezzanineSpatialData({
        interior,
        height,
        mezzEn,
        mezzCov,
        mezzZ,
        mezzH
    });

    const crane = createCraneSpatialData({
        interior,
        height,
        craneEn,
        craneZ
    });

    const { driveway, logo } = createAuxiliarySpatialData({
        width,
        length,
        height,
        pitchRatio,
        roofType,
        wallThickness,
        drivewayEn
    });

    const awnings = createAwningsSpatialData({
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
            totalLength: length + overhangs.overF + overhangs.overB,
            zOffset: (overhangs.overF - overhangs.overB) / 2
        },
        foundation,
        referencePlanes: {
            front: { z: halfL },
            back: { z: -halfL },
            left: { x: -halfW },
            right: { x: halfW },
            ground: { y: 0 }
        }
    };
}