import * as THREE from 'three';

import {
    createGroundSystem
} from './ground/GroundSystem.js';

const FOG_COLOR =
    0xdce7f3;

const FOG_DENSITY =
    0.0006;

const SKY_PATH =
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/cube/skyboxsun25deg/';

export function createEnvironmentSystem(
    config = {}
) {
    let onNeedRender =
        typeof config.onNeedRender ===
        'function'
            ? config.onNeedRender
            : null;

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
        scene
    ) {
        if (
            !scene
        ) {
            return;
        }

        appliedScene =
            scene;

        scene.environment =
            null;

        scene.fog =
            new THREE.FogExp2(
                FOG_COLOR,
                FOG_DENSITY
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
            appliedScene
        ) {
            if (
                appliedScene.background ===
                skyTexture
            ) {
                appliedScene.background =
                    null;
            }

            if (
                appliedScene.fog?.isFogExp2 &&
                appliedScene.fog.color.getHex() ===
                FOG_COLOR
            ) {
                appliedScene.fog =
                    null;
            }
        }

        groundSystem.dispose();

        if (
            skyTexture
        ) {
            skyTexture.dispose();
            skyTexture =
                null;
        }

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