import {
    createBuildingModel,
    createBuildingGeometry
} from './runtime/runtimeImports.js';

import {
    createScene
} from './runtime/runtimeScene.js';

import {
    createCamera
} from './runtime/runtimeCamera.js';

import {
    createRenderer
} from './runtime/runtimeRenderer.js';

import {
    createMaterialSystem
} from './runtime/runtimeMaterials.js';

import {
    createColors
} from './runtime/runtimeColors.js';

import {
    createRegistry
} from './runtime/runtimeRegistry.js';

import {
    createContext
} from './runtime/runtimeContext.js';

import {
    createRoot
} from './runtime/runtimeObjects.js';

import {
    createLifecycle
} from './runtime/runtimeLifecycle.js';

import {
    createUpdateSystem
} from './runtime/runtimeUpdate.js';

function assertContainer(container) {
    if (
        !container ||
        typeof container.appendChild !== 'function'
    ) {
        throw new TypeError(
            'A valid DOM container element is required'
        );
    }
}

function createReferenceModelsAPI({
    lifecycle,
    buildingGeometry,
    renderer
}) {
    const orchestrator =
        lifecycle.referenceModels;

    if (!orchestrator) {
        return null;
    }

    const interaction =
        lifecycle.referenceModelInteraction;

    const loader =
        lifecycle.referenceModelLoader;

    const themeUri =
        window.UBuildData?.themeUri ??
        window.ConfiguratorData?.themeUri ??
        '';

    const models =
        Object.freeze({
            vehicle:
                'ergoninane-fast-74.glb',

            forklift:
                'forza1903-low-poly-2490.glb',

            airplane:
                'plane.glb',

            truck:
                'scania.glb'
        });

    function resolveModel(
        value
    ) {
        if (
            typeof value !==
            'string'
        ) {
            return null;
        }

        if (
            models[value]
        ) {
            return models[value];
        }

        if (
            Object.values(
                models
            ).includes(
                value
            )
        ) {
            return value;
        }

        return null;
    }

    function toggle(
        value,
        enabled
    ) {
        const fileName =
            resolveModel(
                value
            );

        if (
            !fileName ||
            !loader
        ) {
            return;
        }

        orchestrator.toggleModel(
            fileName,
            Boolean(enabled),
            loader,
            themeUri,
            buildingGeometry.bounds,
            () => {
                renderer.render(
                    lifecycle.scene,
                    lifecycle.camera
                );
            }
        );
    }

    return Object.freeze({
        models,

        group:
            orchestrator.group,

        toggle,

        interaction,

        dispose:
            () => {
                orchestrator.dispose();
            }
    });
}

export function createUBuildRuntime({
    container,
    model = {},
    environment = {},
    lighting = {}
} = {}) {
    assertContainer(
        container
    );

    let buildingModel =
        createBuildingModel(
            model
        );

    const buildingGeometry =
        createBuildingGeometry(
            buildingModel
        );

    const scene =
        createScene();

    const camera =
        createCamera(
            container,
            buildingGeometry
        );

    const renderer =
        createRenderer(
            container
        );

    const colors =
        createColors(
            buildingModel
        );

    const materials =
        createMaterialSystem(
            buildingModel
        );

    const registry =
        createRegistry();

    const buildingRoot =
        createRoot(
            'building'
        );

    scene.add(
        buildingRoot
    );

    const context =
        createContext({
            model:
                buildingModel,

            geometry:
                buildingGeometry,

            materials,

            colors,

            scene,

            camera,

            renderer,

            buildingRoot
        });

    const lifecycle =
        createLifecycle({
            scene,
            camera,
            renderer,
            container,
            buildingRoot,
            geometry:
                buildingGeometry,
            environment,
            lighting
        });

    const referenceModels =
        createReferenceModelsAPI({
            lifecycle,
            buildingGeometry,
            renderer
        });

    const updateSystem =
        createUpdateSystem({
            model:
                buildingModel,

            geometry:
                buildingGeometry,

            registry,

            materials,

            colors,

            scene,

            camera,

            renderer,

            buildingRoot,

            lifecycle,

            environment,
            lighting
        });

    updateSystem.createElements();

    updateSystem.updateLightingAndEnvironment();

    function start() {
        updateSystem.updateLightingAndEnvironment();

        updateSystem.resize();

        updateSystem.autoFrame();

        updateSystem.render();

        return api;
    }

    function update(nextModel) {
        buildingModel =
            updateSystem.update(
                nextModel
            );

        return buildingModel;
    }

    function rebuild(nextModel) {
        buildingModel =
            updateSystem.rebuild(
                nextModel
            );

        return buildingModel;
    }

    function render() {
        return updateSystem.render();
    }

    function resize() {
        return updateSystem.resize();
    }

    function autoFrame() {
        return updateSystem.autoFrame();
    }

    function setDateTimeLocation(
        config = {}
    ) {
        return updateSystem.setDateTimeLocation(
            config
        );
    }

    function dispose() {
        window.removeEventListener(
            'resize',
            resize
        );

        updateSystem.dispose();

        lifecycle.dispose();

        materials.dispose();

        renderer.dispose();

        if (
            renderer.domElement &&
            renderer.domElement.parentNode ===
            container
        ) {
            container.removeChild(
                renderer.domElement
            );
        }
    }

    const api =
        Object.freeze({
            get model() {
                return buildingModel;
            },

            geometry:
                buildingGeometry,

            scene,

            camera,

            renderer,

            colors,

            materials,

            registry,

            context,

            root:
                buildingRoot,

            lifecycle,

            updateSystem,

            environment:
                lifecycle.environmentSystem,

            lighting:
                lifecycle.lightingSystem,

            controls:
                lifecycle.cameraControls,

            interaction:
                lifecycle.openingInteraction,

            referenceModels,

            start,

            update,

            rebuild,

            render,

            resize,

            autoFrame,

            setDateTimeLocation,

            dispose
        });

    window.addEventListener(
        'resize',
        resize
    );

    return api;
}