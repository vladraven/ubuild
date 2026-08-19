// js/buildingGeometry.js
const DEFAULTS = Object.freeze({
    wallThickness: 0.05,
    roofThickness: 0.12,
    overhangRoofThickness: 0.15,
    wainscotThickness: 0.02,
    wainscotOffset: 0.002,
    trimSize: 0.12
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

function createRoofGeometry({ width, length, height, pitchRatio, roofType, overhangs, roofThickness }) {
    const halfW = width / 2;
    const isLeftSloped = (roofType === 'left-sloped');
    const isRightSloped = (roofType === 'right-sloped');
    const isSingleSlope = (isLeftSloped || isRightSloped);

    const hasOverhangs = overhangs.overL > 0 || overhangs.overR > 0 || overhangs.overF > 0 || overhangs.overB > 0;
    const totalRise = isSingleSlope ? width * pitchRatio : halfW * pitchRatio;
    const pitchAngle = isSingleSlope ? Math.atan2(totalRise, width) : Math.atan2(totalRise, halfW);

    const totalLength = length + overhangs.overF + overhangs.overB;
    const zOffset = (overhangs.overF - overhangs.overB) / 2;

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

    const cornerInset = wallThickness / 2;
    const sideHalfL = halfL - cornerInset;
    const sideHalfW = halfW - cornerInset;

    const sides = {};

    if (walls.L) {
        sides.L = {
            shapeData: createWainscotShapeData(sideHalfL, leftH, walls.L.holes),
            uvOriginX: -length / 2,
            position: { x: -halfW - wainscotThickness - wainscotOffset, y: 0, z: 0 },
            rotationY: Math.PI / 2
        };
    }
    if (walls.R) {
        sides.R = {
            shapeData: createWainscotShapeData(sideHalfL, rightH, walls.R.holes),
            uvOriginX: -length / 2,
            position: { x: halfW + wainscotThickness + wainscotOffset, y: 0, z: 0 },
            rotationY: -Math.PI / 2
        };
    }
    if (walls.F) {
        sides.F = {
            shapeData: createWainscotShapeData(sideHalfW, frontH, walls.F.holes),
            uvOriginX: -width / 2,
            position: { x: 0, y: 0, z: halfL + wainscotThickness + wainscotOffset },
            rotationY: 0
        };
    }
    if (walls.B) {
        sides.B = {
            shapeData: createWainscotShapeData(sideHalfW, backH, walls.B.holes),
            uvOriginX: -width / 2,
            position: { x: 0, y: 0, z: -halfL - wainscotThickness - wainscotOffset },
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

function createTrimsSpatialData({ width, length, height, totalRise, roofAngle, roofType, overhangs, roofLength, roofZOffset, wallThickness, wainscotThickness, wsEnabled }) {
    const halfW = width / 2;
    const halfL = length / 2;
    const isLSloped = (roofType === 'left-sloped');
    const isRSloped = (roofType === 'right-sloped');
    const isG = (roofType === 'gabled');

    const eaveDropL = overhangs.overL * Math.tan(roofAngle);
    const eaveDropR = overhangs.overR * Math.tan(roofAngle);

    const outerLeftX = -halfW - wallThickness / 2 - overhangs.overL;
    const outerRightX = halfW + wallThickness / 2 + overhangs.overR;

    let leftEaveY = height - eaveDropL;
    let rightEaveY = height - eaveDropR;

    if (isLSloped) rightEaveY = height + totalRise + eaveDropR;
    if (isRSloped) leftEaveY = height + totalRise + eaveDropL;

    // Угловые планки строго по внешнему углу стены без смещения за боковые плоскости
    const cornerBaseOffset = wallThickness / 2;
    const cornerX = halfW + cornerBaseOffset;
    const cornerZ = halfL + cornerBaseOffset;

    const corners = [
        { sx: -1, sz: 1, x: -cornerX, z: cornerZ, colH: (isRSloped ? height + totalRise : height) },
        { sx: 1, sz: 1, x: cornerX, z: cornerZ, colH: (isLSloped ? height + totalRise : height) },
        { sx: 1, sz: -1, x: cornerX, z: -cornerZ, colH: (isLSloped ? height + totalRise : height) },
        { sx: -1, sz: -1, x: -cornerX, z: -cornerZ, colH: (isRSloped ? height + totalRise : height) }
    ];

    const rakes = [];
    const frontZ = halfL + overhangs.overF + wallThickness / 2;
    const backZ = -halfL - overhangs.overB - wallThickness / 2;

    for (const sideZ of [-1, 1]) {
        const zPos = sideZ > 0 ? frontZ : backZ;
        if (isG) {
            const slopeLenL = Math.hypot(halfW + overhangs.overL, totalRise + eaveDropL);
            const slopeLenR = Math.hypot(halfW + overhangs.overR, totalRise + eaveDropR);

            rakes.push({
                type: 'gable-left',
                sideZ,
                zPos,
                slopeLength: slopeLenL,
                position: { x: -halfW / 2 - overhangs.overL / 2, y: height + totalRise / 2 - eaveDropL / 2, z: zPos },
                rotationZ: roofAngle
            });
            rakes.push({
                type: 'gable-right',
                sideZ,
                zPos,
                slopeLength: slopeLenR,
                position: { x: halfW / 2 + overhangs.overR / 2, y: height + totalRise / 2 - eaveDropR / 2, z: zPos },
                rotationZ: -roofAngle
            });
        } else {
            const activeOver = isLSloped ? overhangs.overL : overhangs.overR;
            const activeDrop = isLSloped ? eaveDropL : eaveDropR;
            const slopeLen = Math.hypot(width + activeOver * 2, totalRise + activeDrop * 2);
            rakes.push({
                type: 'single-slope',
                sideZ,
                zPos,
                slopeLength: slopeLen,
                position: { x: 0, y: height + totalRise / 2, z: zPos },
                rotationZ: isLSloped ? roofAngle : -roofAngle
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

function createGuttersSpatialData({ width, length, height, roofAngle, roofType, overhangs, roofLength, roofZOffset, openingsData, openingDefs }) {
    const halfW = width / 2;
    const isLSloped = (roofType === 'left-sloped');
    const isRSloped = (roofType === 'right-sloped');

    const totalRise = (isLSloped || isRSloped) ? width * Math.tan(roofAngle) : halfW * Math.tan(roofAngle);
    const eaveDropL = overhangs.overL * Math.tan(roofAngle);
    const eaveDropR = overhangs.overR * Math.tan(roofAngle);

    let leftEaveY = height - eaveDropL;
    let rightEaveY = height - eaveDropR;

    if (isLSloped) rightEaveY = height + totalRise + eaveDropR;
    if (isRSloped) leftEaveY = height + totalRise + eaveDropL;

    const metersPerSpout = 25 * 0.3048;
    const numDownspouts = Math.max(2, Math.ceil(roofLength / metersPerSpout) + 1);
    const spacing = (roofLength - 0.6) / Math.max(1, numDownspouts - 1);
    const gutterStartZ = -roofLength / 2;

    const downspouts = [];
    for (let i = 0; i < numDownspouts; i++) {
        const zPos = roofZOffset + gutterStartZ + 0.3 + i * spacing;
        const wallPos = zPos - roofZOffset;

        downspouts.push({
            side: 'L',
            eaveY: leftEaveY,
            sideX: -1,
            overhang: overhangs.overL,
            zPos,
            wallPos
        });
        downspouts.push({
            side: 'R',
            eaveY: rightEaveY,
            sideX: 1,
            overhang: overhangs.overR,
            zPos,
            wallPos
        });
    }

    return {
        length: roofLength,
        zOffset: roofZOffset,
        eaves: {
            left: { x: -halfW - overhangs.overL, y: leftEaveY, z: roofZOffset },
            right: { x: halfW + overhangs.overR, y: rightEaveY, z: roofZOffset }
        },
        downspouts
    };
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
        roofThickness: hasOverhangs ? DEFAULTS.overhangRoofThickness : roofThickness
    });

    roof.visible = visibility.checkRoof;

    const innerW = width - wallThickness * 2;
    const innerL = length - wallThickness * 2;

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
        totalRise,
        roofAngle: pitchAngle,
        roofType,
        overhangs,
        roofLength: roof.totalLength,
        roofZOffset: roof.zOffset,
        wallThickness,
        wainscotThickness,
        wsEnabled
    });

    const gutters = createGuttersSpatialData({
        width,
        length,
        height,
        roofAngle: pitchAngle,
        roofType,
        overhangs,
        roofLength: roof.totalLength,
        roofZOffset: roof.zOffset,
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
        interior: {
            width: innerW,
            length: innerL,
            halfWidth: innerW / 2,
            halfLength: innerL / 2
        },
        walls,
        roof,
        wainscot,
        trims,
        gutters,
        overhangs: {
            ...overhangs,
            enabled: hasOverhangs,
            totalLength: length + overhangs.overF + overhangs.overB,
            zOffset: (overhangs.overF - overhangs.overB) / 2
        },
        foundation: {
            width,
            length,
            halfWidth: halfW,
            halfLength: halfL,
            center: { x: 0, y: 0, z: 0 }
        },
        referencePlanes: {
            front: { z: halfL },
            back: { z: -halfL },
            left: { x: -halfW },
            right: { x: halfW },
            ground: { y: 0 }
        }
    };
}