export function createContext({
    model,
    geometry,
    materials,
    colors,
    scene,
    camera,
    renderer,
    buildingRoot
}) {
    if (!model) {
        throw new TypeError(
            'Building model is required'
        );
    }

    if (!geometry) {
        throw new TypeError(
            'Building geometry is required'
        );
    }

    if (!materials) {
        throw new TypeError(
            'Material system is required'
        );
    }

    if (!scene) {
        throw new TypeError(
            'Scene is required'
        );
    }

    if (!camera) {
        throw new TypeError(
            'Camera is required'
        );
    }

    if (!renderer) {
        throw new TypeError(
            'Renderer is required'
        );
    }

    if (!buildingRoot) {
        throw new TypeError(
            'Building root is required'
        );
    }

    return {
        model,

        geometry,

        panelGeometry:
            geometry.panels,

        structuralGeometry: {
            frames:
                geometry.frames,

            girts:
                geometry.girts,

            purlins:
                geometry.purlins,

            endWallColumns:
                geometry.endWallColumns
        },

        materials,

        colors,

        scene,

        camera,

        renderer,

        buildingRoot
    };
}