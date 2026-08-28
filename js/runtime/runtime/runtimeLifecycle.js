import {
    createEnvironmentSystem,
    createLightingSystem,
    createCameraControls,
    createOpeningInteraction
} from './runtimeImports.js';

export function createLifecycle({
    scene,
    camera,
    renderer,
    container,
    buildingRoot,
    geometry,
    environment = {},
    lighting = {}
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
        scene
    );

    const lightingSystem =
        createLightingSystem(
            scene,
            lighting
        );

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
                render,

            onSelect:
                render
        });

    function updateEnvironment(
        state = {}
    ) {
        const result =
            environmentSystem.update(
                state
            );

        environmentSystem.applyToScene(
            scene
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
            width / height;

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
        environmentSystem,

        lightingSystem,

        cameraControls,

        openingInteraction,

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