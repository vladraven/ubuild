import * as THREE from 'three';

import {
    RoomEnvironment
} from 'https://unpkg.com/three@0.136.0/examples/jsm/environments/RoomEnvironment.js';

import {
    createGroundSystem
} from './ground/GroundSystem.js';

const FOG_COLOR =
    0xdce7f3;

const FOG_DENSITY =
    0.0006;

const ENVIRONMENT_BLUR =
    0.14;

const ENVIRONMENT_INTENSITY =
    0.27;

const SKY_PATH =
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/cube/skyboxsun25deg/';

function disposeResource(
    resource
) {
    if (
        resource &&
        typeof resource.dispose ===
        'function'
    ) {
        resource.dispose();
    }
}

export function createEnvironmentSystem(
    config = {}
) {
    let onNeedRender =
        typeof config.onNeedRender ===
        'function'
            ? config.onNeedRender
            : null;

    let pmremGenerator =
        null;

    let environmentRenderTarget =
        null;

    let environmentTexture =
        null;

    let skyTexture =
        null;

    let appliedScene =
        null;

    let disposed =
        false;

    const group =
        new THREE.Group();

    group.name =
        'environment-system';

    const groundSystem =
        createGroundSystem({
            onNeedRender:
                () => {
                    if (
                        onNeedRender
                    ) {
                        onNeedRender();
                    }
                }
        });

    group.add(
        groundSystem.group
    );

    function createEnvironment(
        scene,
        renderer
    ) {
        if (
            environmentTexture
        ) {
            scene.environment =
                environmentTexture;

            return;
        }

        pmremGenerator =
            new THREE.PMREMGenerator(
                renderer
            );

        pmremGenerator.compileEquirectangularShader();

        const roomEnvironment =
            new RoomEnvironment();

        environmentRenderTarget =
            pmremGenerator.fromScene(
                roomEnvironment,
                ENVIRONMENT_BLUR
            );

        environmentTexture =
            environmentRenderTarget.texture;

        scene.environment =
            environmentTexture;

        if (
            'environmentIntensity' in scene
        ) {
            scene.environmentIntensity =
                ENVIRONMENT_INTENSITY;
        }

        disposeResource(
            roomEnvironment
        );
    }

    function createSky(
        scene
    ) {
        if (
            skyTexture ||
            disposed
        ) {
            return;
        }

        const cubeTextureLoader =
            new THREE.CubeTextureLoader();

        cubeTextureLoader.setCrossOrigin(
            'anonymous'
        );

        cubeTextureLoader.load(
            [
                SKY_PATH + 'px.jpg',
                SKY_PATH + 'nx.jpg',
                SKY_PATH + 'py.jpg',
                SKY_PATH + 'ny.jpg',
                SKY_PATH + 'pz.jpg',
                SKY_PATH + 'nz.jpg'
            ],

            texture => {
                if (
                    disposed
                ) {
                    texture.dispose();

                    return;
                }

                if (
                    'colorSpace' in texture
                ) {
                    texture.colorSpace =
                        THREE.SRGBColorSpace;
                } else if (
                    'encoding' in texture
                ) {
                    texture.encoding =
                        THREE.sRGBEncoding;
                }

                skyTexture =
                    texture;

                scene.background =
                    skyTexture;

                if (
                    onNeedRender
                ) {
                    onNeedRender();
                }
            }
        );
    }

    function update() {
        return Object.freeze({});
    }

    function updateBounds(
        bounds
    ) {
        groundSystem.updateBounds(
            bounds
        );
    }

    function applyToScene(
        scene,
        renderer
    ) {
        if (
            !scene ||
            !renderer
        ) {
            return;
        }

        appliedScene =
            scene;

        scene.fog =
            new THREE.FogExp2(
                FOG_COLOR,
                FOG_DENSITY
            );

        createEnvironment(
            scene,
            renderer
        );

        createSky(
            scene
        );
    }

    function tick() {}

    function setOnNeedRender(
        fn
    ) {
        onNeedRender =
            typeof fn ===
            'function'
                ? fn
                : null;

        groundSystem.setOnNeedRender(
            onNeedRender
        );
    }

    function getState() {
        return Object.freeze({
            fogColor:
                FOG_COLOR,

            fogDensity:
                FOG_DENSITY,

            environmentIntensity:
                ENVIRONMENT_INTENSITY,

            hasEnvironment:
                Boolean(
                    environmentTexture
                ),

            hasSky:
                Boolean(
                    skyTexture
                )
        });
    }

    function dispose() {
        if (
            disposed
        ) {
            return;
        }

        disposed =
            true;

        if (
            appliedScene?.environment ===
            environmentTexture
        ) {
            appliedScene.environment =
                null;
        }

        if (
            appliedScene?.background ===
            skyTexture
        ) {
            appliedScene.background =
                null;
        }

        if (
            appliedScene?.fog?.isFogExp2 &&
            appliedScene.fog.color.getHex() ===
            FOG_COLOR &&
            appliedScene.fog.density ===
            FOG_DENSITY
        ) {
            appliedScene.fog =
                null;
        }

        groundSystem.dispose();

        disposeResource(
            skyTexture
        );

        disposeResource(
            environmentRenderTarget
        );

        disposeResource(
            pmremGenerator
        );

        skyTexture =
            null;

        environmentTexture =
            null;

        environmentRenderTarget =
            null;

        pmremGenerator =
            null;

        appliedScene =
            null;

        group.clear();

        group.removeFromParent();
    }

    return Object.freeze({
        group,

        update,

        tick,

        updateBounds,

        applyToScene,

        setOnNeedRender,

        getState,

        dispose
    });
}