// ================================================
// FILE: js/buildingGeometry.js
// ================================================
const DEFAULTS = Object.freeze({
    wallThickness: 0.05,
    roofThickness: 0.12,
    overhangRoofThickness: 0.15,
    wainscotThickness: 0.02,
    wainscotOffset: 0.005,
    trimSize: 0.12,
    structuralInset: 0.10
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
        x: x
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
            // 5-точечный контур фронтона: левый низ -> правый низ -> правый карниз -> конёк -> левый карниз
            points = [
                { x: -halfW, y: 0 },
                { x: halfW, y: 0 },
                { x: halfW, y: wallHeight.right },
                { x: 0, y: height + totalRise },
                { x: -halfW, y: wallHeight.left }
            ];
        } else {
            maxY = Math.max(wallHeight.left, wallHeight.right);
            // Односкатная крыша: наклонная верхняя грань
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
        points,
        holes: normalizeOpenings(openings, openingDefs),
        local: {
            minX: -localHalfWidth,
            maxX: localHalfWidth,
            minY: 0,
            maxY: maxY
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

export function createBuildingGeometry(options = {}) {
    const width = finite(options.width, 18.288);
    const length = finite(options.length, 30.48);
    const height = finite(options.height, 4.8768);
    const pitchRatio = finite(options.pitchRatio, 0.05);
    const roofType = normalizeRoofType(options.roofType);
    const wallThickness = finite(options.wallThickness, DEFAULTS.wallThickness);
    const roofThickness = finite(options.roofThickness, DEFAULTS.roofThickness);
    const visibility = normalizeVisibility(options.visibility);
    const openingsData = options.openingsData || {};
    const openingDefs = options.openingDefs || {};

    const halfW = width / 2;
    const halfL = length / 2;

    const isLeftSloped = roofType === 'left-sloped';
    const isRightSloped = roofType === 'right-sloped';
    const isSingleSlope = isLeftSloped || isRightSloped;

    const totalRise = isSingleSlope ? width * pitchRatio : halfW * pitchRatio;

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

    return {
        version: 1,
        building: {
            width,
            length,
            height,
            halfWidth: halfW,
            halfLength: halfL,
            pitchRatio,
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