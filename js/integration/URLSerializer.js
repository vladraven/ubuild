export function serializeModelToURL(model) {
    if (!model || typeof model !== 'object') {
        throw new TypeError('Valid BuildingModel object is required to serialize');
    }
    const cleanPayload = {
        dim: {
            w: model.dimensions.width,
            l: model.dimensions.length,
            h: model.dimensions.height
        },
        roof: {
            t: model.roof.type,
            p: model.roof.pitchRatio,
            ov: model.roof.overhangs
        },
        openings: model.openings.map(op => ({
            id: op.id,
            t: op.type,
            s: op.side,
            x: op.x,
            w: op.width,
            h: op.height,
            y: op.yOff
        }))
    };

    const jsonStr = JSON.stringify(cleanPayload);
    return encodeURIComponent(btoa(jsonStr));
}

export function deserializeModelFromURL(urlString = window.location.search) {
    const params = new URLSearchParams(urlString);
    const configData = params.get('config');
    if (!configData) return null;

    try {
        const jsonStr = atob(decodeURIComponent(configData));
        const data = JSON.parse(jsonStr);

        return {
            dimensions: {
                width: data.dim.w,
                length: data.dim.l,
                height: data.dim.h
            },
            roof: {
                type: data.roof.t,
                pitchRatio: data.roof.p,
                overhangs: data.roof.ov
            },
            openings: (data.openings || []).map(op => ({
                id: op.id,
                type: op.t,
                side: op.s,
                x: op.x,
                width: op.w,
                height: op.h,
                yOff: op.y
            }))
        };
    } catch {
        return null;
    }
}