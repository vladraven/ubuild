// js/model/geometry/TrimsGeometry.js

function point(x, y, z) {
    return Object.freeze({ x, y, z });
}

function segment(start, end) {
    return Object.freeze({
        start,
        end,
        length: Math.hypot(
            end.x - start.x,
            end.y - start.y,
            end.z - start.z
        )
    });
}

export function createTrimsGeometry(model, envelope, roof) {
    if (!model || !envelope || !roof) {
        throw new TypeError('BuildingModel, BuildingEnvelope, and RoofGeometry are required');
    }

    if (model.visibility?.trims === false) {
        return Object.freeze({
            enabled: false,
            eaves: Object.freeze([]),
            rake: Object.freeze([]),
            ridge: Object.freeze([]),
            corners: Object.freeze([]),
            roofEdges: Object.freeze([])
        });
    }

    const ov = model.roof.overhangs;
    const isGabled = model.roof.type === 'gabled';
    const isLeftSloped = model.roof.type === 'left-sloped';
    const isRightSloped = model.roof.type === 'right-sloped';

    const halfW = envelope.width / 2;
    const length = envelope.length;
    const height = envelope.height;
    const rise = roof.rise;

    const leftX = -halfW - ov.left;
    const rightX = halfW + ov.right;
    const frontZ = -ov.front;
    const backZ = length + ov.back;

    const leftY = isRightSloped ? height + rise : height;
    const rightY = isLeftSloped ? height + rise : height;
    const ridgeY = height + rise;

    // 1. Eaves Trims (карнизные нащельники)
    const eaves = [
        Object.freeze({
            id: 'eave-left',
            side: 'L',
            start: point(leftX, leftY, frontZ),
            end: point(leftX, leftY, backZ),
            edge: segment(point(leftX, leftY, frontZ), point(leftX, leftY, backZ))
        }),
        Object.freeze({
            id: 'eave-right',
            side: 'R',
            start: point(rightX, rightY, frontZ),
            end: point(rightX, rightY, backZ),
            edge: segment(point(rightX, rightY, frontZ), point(rightX, rightY, backZ))
        })
    ];

    // 2. Rake Trims (фронтонные нащельники торцов)
    const rake = [];
    if (isGabled) {
        // Передний торец (Front)
        rake.push(
            Object.freeze({ id: 'rake-front-left', side: 'F', start: point(leftX, height, frontZ), end: point(0, ridgeY, frontZ), edge: segment(point(leftX, height, frontZ), point(0, ridgeY, frontZ)) }),
            Object.freeze({ id: 'rake-front-right', side: 'F', start: point(0, ridgeY, frontZ), end: point(rightX, height, frontZ), edge: segment(point(0, ridgeY, frontZ), point(rightX, height, frontZ)) })
        );
        // Задний торец (Back)
        rake.push(
            Object.freeze({ id: 'rake-back-left', side: 'B', start: point(leftX, height, backZ), end: point(0, ridgeY, backZ), edge: segment(point(leftX, height, backZ), point(0, ridgeY, backZ)) }),
            Object.freeze({ id: 'rake-back-right', side: 'B', start: point(0, ridgeY, backZ), end: point(rightX, height, backZ), edge: segment(point(0, ridgeY, backZ), point(rightX, height, backZ)) })
        );
    } else {
        // Односкатные (Left-sloped / Right-sloped)
        rake.push(
            Object.freeze({ id: 'rake-front', side: 'F', start: point(leftX, leftY, frontZ), end: point(rightX, rightY, frontZ), edge: segment(point(leftX, leftY, frontZ), point(rightX, rightY, frontZ)) }),
            Object.freeze({ id: 'rake-back', side: 'B', start: point(leftX, leftY, backZ), end: point(rightX, rightY, backZ), edge: segment(point(leftX, leftY, backZ), point(rightX, rightY, backZ)) })
        );
    }

    // 3. Ridge Trim (конёк)
    const ridge = [];
    if (isGabled && roof.ridge) {
        ridge.push(Object.freeze({
            id: 'ridge-trim',
            side: 'center',
            start: point(0, ridgeY, frontZ),
            end: point(0, ridgeY, backZ),
            edge: segment(point(0, ridgeY, frontZ), point(0, ridgeY, backZ))
        }));
    }

    // 4. Corner Trims (угловые нащельники 4-х углов здания)
    const corners = [
        Object.freeze({ id: 'corner-FL', edge: segment(point(-halfW, 0, 0), point(-halfW, leftY, 0)) }),
        Object.freeze({ id: 'corner-FR', edge: segment(point(halfW, 0, 0), point(halfW, rightY, 0)) }),
        Object.freeze({ id: 'corner-BL', edge: segment(point(-halfW, 0, length), point(-halfW, leftY, length)) }),
        Object.freeze({ id: 'corner-BR', edge: segment(point(halfW, 0, length), point(halfW, rightY, length)) })
    ];

    return Object.freeze({
        enabled: true,
        eaves: Object.freeze(eaves),
        rake: Object.freeze(rake),
        ridge: Object.freeze(ridge),
        corners: Object.freeze(corners),
        roofEdges: Object.freeze([
            segment(point(leftX, leftY, frontZ), point(rightX, rightY, frontZ)),
            segment(point(leftX, leftY, backZ), point(rightX, rightY, backZ))
        ])
    });
}