import {
    THREE,
    createEnvironmentSystem,
    createLightingSystem,
    createCameraControls,
    createOpeningInteraction
} from './runtimeImports.js';

import { RoomEnvironment } from 'https://unpkg.com/three@0.136.0/examples/jsm/environments/RoomEnvironment.js';

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

    // ------------------------------------------------------------
    // Image-based lighting (IBL)
    // MeshStandardMaterial with any metalness needs scene.environment
    // otherwise albedo is darkened and pure white reads as grey.
    // ------------------------------------------------------------
    const pmremGenerator =
        new THREE.PMREMGenerator(
            renderer
        );

    pmremGenerator.compileEquirectangularShader();

    const roomEnvironment =
        new RoomEnvironment();

    const envRT =
        pmremGenerator.fromScene(
            roomEnvironment,
            0.04
        );

    scene.environment =
        envRT.texture;

    // r163+ only — safe no-op on three@0.136
    if (
        'environmentIntensity' in scene
    ) {
        scene.environmentIntensity =
            0.75;
    }

    if (
        typeof roomEnvironment.dispose ===
        'function'
    ) {
        roomEnvironment.dispose();
    }

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

        if (
            scene.environment
        ) {
            if (
                typeof scene.environment.dispose ===
                'function'
            ) {
                scene.environment.dispose();
            }

            scene.environment =
                null;
        }

        if (
            envRT &&
            typeof envRT.dispose ===
            'function'
        ) {
            envRT.dispose();
        }

        pmremGenerator.dispose();
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