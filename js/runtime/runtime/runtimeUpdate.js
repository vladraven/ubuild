import {
    THREE,
    getSolarState
} from './runtimeImports.js';

import {
    clearRoot
} from './runtimeObjects.js';

function cloneValue(value) {
    if (Array.isArray(value)) {
        return value.map(
            cloneValue
        );
    }

    if (
        value &&
        typeof value === 'object'
    ) {
        return Object.fromEntries(
            Object.entries(value).map(
                ([key, item]) => [
                    key,
                    cloneValue(item)
                ]
            )
        );
    }

    return value;
}

function mergeValues(
    base,
    override
) {
    const result =
        cloneValue(base);

    if (
        !override ||
        typeof override !== 'object'
    ) {
        return result;
    }

    for (
        const [
            key,
            value
        ]
        of Object.entries(
            override
        )
    ) {
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            result[key] &&
            typeof result[key] === 'object' &&
            !Array.isArray(result[key])
        ) {
            result[key] =
                mergeValues(
                    result[key],
                    value
                );
        } else {
            result[key] =
                cloneValue(value);
        }
    }

    return result;
}

export function createUpdateSystem({
    model,
    geometry,
    registry,
    materials,
    colors,
    scene,
    camera,
    renderer,
    buildingRoot,
    lifecycle,
    environment = {},
    lighting = {}
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

    if (!registry) {
        throw new TypeError(
            'Element registry is required'
        );
    }

    if (!buildingRoot) {
        throw new TypeError(
            'Building root is required'
        );
    }

    let currentModel =
        cloneValue(model);

    let currentEnvironment =
        cloneValue(environment);

    let instances =
        new Map();

    let lastSolarState =
        null;

    function createElementContext() {
        return {
            model:
                currentModel,

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

    function createElements() {
        clearRoot(
            buildingRoot
        );

        instances =
            new Map();

        const context =
            createElementContext();

        const visibility =
            currentModel.visibility ||
            {};

        for (
            const key
            of Object.keys(
                visibility
            )
        ) {
            if (
                visibility[key] === false
            ) {
                continue;
            }

            let orchestrator =
                null;

            try {
                orchestrator =
                    registry.get(
                        key
                    );
            } catch {
                continue;
            }

            if (
                !orchestrator ||
                typeof orchestrator.create !==
                'function'
            ) {
                continue;
            }

            const instance =
                orchestrator.create(
                    context
                );

            if (!instance) {
                continue;
            }

            const object =
                instance.object ??
                instance;

            if (
                !object ||
                !object.isObject3D
            ) {
                continue;
            }

            object.name =
                key;

            buildingRoot.add(
                object
            );

            instances.set(
                key,
                instance
            );
        }
    }

    function updateElements() {
        const context =
            createElementContext();

        const nextInstances =
            new Map();

        const visibility =
            currentModel.visibility ||
            {};

        for (
            const key
            of Object.keys(
                visibility
            )
        ) {
            let orchestrator =
                null;

            try {
                orchestrator =
                    registry.get(
                        key
                    );
            } catch {
                continue;
            }

            if (!orchestrator) {
                continue;
            }

            const previous =
                instances.get(
                    key
                );

            if (
                visibility[key] === false
            ) {
                if (
                    previous &&
                    typeof orchestrator.dispose ===
                    'function'
                ) {
                    orchestrator.dispose(
                        previous
                    );
                }

                continue;
            }

            let next =
                null;

            if (
                previous &&
                typeof orchestrator.update ===
                'function'
            ) {
                next =
                    orchestrator.update(
                        previous,
                        context
                    );
            } else if (
                typeof orchestrator.create ===
                'function'
            ) {
                next =
                    orchestrator.create(
                        context
                    );
            }

            if (!next) {
                continue;
            }

            const object =
                next.object ??
                next;

            if (
                !object ||
                !object.isObject3D
            ) {
                continue;
            }

            object.name =
                key;

            buildingRoot.add(
                object
            );

            nextInstances.set(
                key,
                next
            );
        }

        instances =
            nextInstances;
    }

    function updateColors(
        nextColors
    ) {
        if (
            !nextColors ||
            !materials ||
            typeof materials.applyColors !==
            'function'
        ) {
            return;
        }

        materials.applyColors(
            nextColors
        );
    }

    function updateLightingAndEnvironment() {
        const solarState =
            getSolarState(
                currentEnvironment
            );

        lastSolarState =
            solarState;

        lifecycle.updateLighting(
            solarState,
            geometry.bounds
        );

        lifecycle.setEnvironmentBounds(
            geometry.bounds
        );

        currentEnvironment =
            mergeValues(
                currentEnvironment,
                {
                    solar:
                        solarState,

                    phase:
                        solarState.phase
                }
            );

        lifecycle.updateEnvironment(
            currentEnvironment
        );

        return solarState;
    }

    function updateEnvironment(
        state = {}
    ) {
        currentEnvironment =
            mergeValues(
                currentEnvironment,
                state
            );

        return lifecycle.updateEnvironment(
            currentEnvironment
        );
    }

    function setDateTimeLocation(
        config = {}
    ) {
        currentEnvironment =
            mergeValues(
                currentEnvironment,
                config
            );

        return updateLightingAndEnvironment();
    }

    function update(
        nextModel = null
    ) {
        if (
            nextModel &&
            nextModel !== currentModel
        ) {
            currentModel =
                mergeValues(
                    currentModel,
                    nextModel
                );
        }

        updateColors(
            currentModel.colors
        );

        updateElements();

        updateLightingAndEnvironment();

        return currentModel;
    }

    function rebuild(
        nextModel = null
    ) {
        if (
            nextModel &&
            nextModel !== currentModel
        ) {
            currentModel =
                mergeValues(
                    currentModel,
                    nextModel
                );
        }

        createElements();

        updateColors(
            currentModel.colors
        );

        updateLightingAndEnvironment();

        return currentModel;
    }

    function resize() {
        return lifecycle.resize();
    }

    function autoFrame() {
        if (
            !geometry.bounds
        ) {
            return;
        }

        const bounds =
            geometry.bounds;

        const center =
            bounds.center;

        const size =
            Math.max(
                bounds.width,
                bounds.height,
                bounds.length,
                1
            );

        camera.position.set(
            center.x + size * 1.4,
            center.y + size * 0.9,
            center.z + size * 1.4
        );

        camera.lookAt(
            center.x,
            center.y,
            center.z
        );
    }

    function render() {
        renderer.render(
            scene,
            camera
        );
    }

    function dispose() {
        for (
            const [
                key,
                instance
            ]
            of instances
        ) {
            let orchestrator =
                null;

            try {
                orchestrator =
                    registry.get(
                        key
                    );
            } catch {
                continue;
            }

            if (
                orchestrator &&
                typeof orchestrator.dispose ===
                'function'
            ) {
                orchestrator.dispose(
                    instance
                );
            }
        }

        instances.clear();

        clearRoot(
            buildingRoot
        );

        buildingRoot.removeFromParent();
    }

    return Object.freeze({
        get model() {
            return currentModel;
        },

        geometry,

        get colors() {
            return colors;
        },

        buildingRoot,

        createElements,

        updateElements,

        updateColors,

        updateEnvironment,

        updateLightingAndEnvironment,

        setDateTimeLocation,

        update,

        rebuild,

        resize,

        autoFrame,

        render,

        dispose,

        get lastSolarState() {
            return lastSolarState;
        }
    });
}