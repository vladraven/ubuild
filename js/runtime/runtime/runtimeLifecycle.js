import {
    THREE,
    GLTFLoader,
    createEnvironmentSystem,
    createLightingSystem,
    createCameraControls,
    createOpeningInteraction,
    createReferenceModelsOrchestrator,
    createReferenceModelInteraction
} from './runtimeImports.js';

export function createLifecycle({
    scene,
    camera,
    renderer,
    container,
    buildingRoot,
    geometry,
    environment = {},
    lighting = {},
    onOpeningChange = null,
    onOpeningSelect = null
}) {
    const render = () => {
        renderer.render(
            scene,
            camera
        );
    };

    const environmentSystem =
        createEnvironmentSystem({
            ...environment,

            onNeedRender:
                render
        });

    if (
        environmentSystem &&
        environmentSystem.group
    ) {
        scene.add(
            environmentSystem.group
        );
    }

    environmentSystem.applyToScene(
        scene,
        renderer
    );

    const lightingSystem =
        createLightingSystem(
            scene,
            lighting
        );

    const referenceModelsOrchestrator =
        createReferenceModelsOrchestrator();

    scene.add(
        referenceModelsOrchestrator.group
    );

    const referenceModelLoader =
        new GLTFLoader();

    const referenceModelInteraction =
        createReferenceModelInteraction({
            camera,

            domElement:
                renderer.domElement,

            group:
                referenceModelsOrchestrator.group,

            onDragEnd:
                render
        });

    const cameraControls =
        createCameraControls({
            camera,

            domElement:
                renderer.domElement,

            onUpdate:
                render
        });

    if (
        geometry &&
        geometry.bounds &&
        typeof cameraControls.frameBounds ===
        'function'
    ) {
        cameraControls.frameBounds(
            geometry.bounds
        );
    }

    const openingInteraction =
        createOpeningInteraction({
            camera,

            domElement:
                renderer.domElement,

            buildingRoot,

            onOpeningChange:
                change => {
                    if (
                        typeof onOpeningChange ===
                        'function'
                    ) {
                        onOpeningChange(
                            change
                        );
                    }

                    render();
                },

            onSelect:
                openingId => {
                    if (
                        typeof onOpeningSelect ===
                        'function'
                    ) {
                        onOpeningSelect(
                            openingId
                        );
                    }

                    render();
                }
        });

    function updateEnvironment(
        state = {}
    ) {
        const result =
            environmentSystem.update(
                state
            );

        environmentSystem.applyToScene(
            scene,
            renderer
        );

        render();

        return result;
    }

    function updateLighting(
        solarState,
        bounds
    ) {
        lightingSystem.update(
            solarState,
            bounds
        );

        render();
    }

    function setEnvironmentBounds(
        bounds
    ) {
        if (
            environmentSystem &&
            typeof environmentSystem.updateBounds ===
            'function'
        ) {
            environmentSystem.updateBounds(
                bounds
            );
        }
    }

    function frameBounds(
        bounds
    ) {
        if (
            !bounds ||
            !cameraControls ||
            typeof cameraControls.frameBounds !==
            'function'
        ) {
            return;
        }

        cameraControls.frameBounds(
            bounds
        );

        render();
    }

    function setAutoRotate(
        value
    ) {
        if (
            !cameraControls ||
            typeof cameraControls.setAutoRotate !==
            'function'
        ) {
            return;
        }

        cameraControls.setAutoRotate(
            value
        );
    }

    function resize() {
        const width =
            Math.max(
                container.clientWidth,
                1
            );

        const height =
            Math.max(
                container.clientHeight,
                1
            );

        camera.aspect =
            width /
            height;

        camera.updateProjectionMatrix();

        renderer.setSize(
            width,
            height,
            false
        );

        render();
    }

    function dispose() {
        if (
            referenceModelInteraction &&
            typeof referenceModelInteraction.dispose ===
            'function'
        ) {
            referenceModelInteraction.dispose();
        }

        if (
            referenceModelsOrchestrator &&
            typeof referenceModelsOrchestrator.dispose ===
            'function'
        ) {
            referenceModelsOrchestrator.dispose();
        }

        if (
            openingInteraction &&
            typeof openingInteraction.dispose ===
            'function'
        ) {
            openingInteraction.dispose();
        }

        if (
            cameraControls &&
            typeof cameraControls.dispose ===
            'function'
        ) {
            cameraControls.dispose();
        }

        if (
            lightingSystem &&
            typeof lightingSystem.dispose ===
            'function'
        ) {
            lightingSystem.dispose();
        }

        if (
            environmentSystem &&
            typeof environmentSystem.dispose ===
            'function'
        ) {
            environmentSystem.dispose();
        }
    }

    return Object.freeze({
        scene,

        camera,

        environmentSystem,

        lightingSystem,

        cameraControls,

        openingInteraction,

        referenceModels:
            referenceModelsOrchestrator,

        referenceModelLoader,

        referenceModelInteraction,

        updateEnvironment,

        updateLighting,

        setEnvironmentBounds,

        frameBounds,

        setAutoRotate,

        resize,

        render,

        dispose
    });
}