import * as THREE from 'three';

import { createSkyMaterial } from './SkyShader.js';

export function createSkySystem(config = {}) {
    const material = createSkyMaterial(
        config
    );

    const geometry =
        new THREE.SphereGeometry(
            500,
            48,
            32
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        'environment-sky';

    mesh.frustumCulled =
        false;

    mesh.renderOrder =
        -1;

    let currentPhase =
        config.phase ||
        'day';

    let currentSolar =
        config.solar ||
        null;

    let exposure =
        Math.max(
            0,
            Number(
                config.exposure
            ) || 1
        );

    material.uniforms
        .uExposure
        .value =
        exposure;

    function update(input = {}) {
        if (
            input.zenithColor !==
            undefined
        ) {
            material.uniforms
                .uZenithColor
                .value
                .set(
                    input.zenithColor
                );
        }

        if (
            input.horizonColor !==
            undefined
        ) {
            material.uniforms
                .uHorizonColor
                .value
                .set(
                    input.horizonColor
                );
        }

        if (
            input.cloudCover !==
            undefined
        ) {
            material.uniforms
                .uCloudCover
                .value =
                THREE.MathUtils.clamp(
                    Number(
                        input.cloudCover
                    ),
                    0,
                    1
                );
        }

        if (
            input.cloudOpacity !==
            undefined
        ) {
            material.uniforms
                .uCloudOpacity
                .value =
                THREE.MathUtils.clamp(
                    Number(
                        input.cloudOpacity
                    ),
                    0,
                    1
                );
        }

        if (
            input.haze !==
            undefined
        ) {
            material.uniforms
                .uHaze
                .value =
                THREE.MathUtils.clamp(
                    Number(
                        input.haze
                    ),
                    0,
                    1
                );
        }

        if (
            input.sunIntensity !==
            undefined
        ) {
            material.uniforms
                .uSunIntensity
                .value =
                THREE.MathUtils.clamp(
                    Number(
                        input.sunIntensity
                    ),
                    0,
                    1
                );
        }

        if (
            input.exposure !==
            undefined
        ) {
            exposure =
                Math.max(
                    0,
                    Number(
                        input.exposure
                    ) || 0
                );

            material.uniforms
                .uExposure
                .value =
                exposure;
        }

        if (
            input.phase !==
            undefined
        ) {
            currentPhase =
                input.phase;
        }

        if (
            input.solar !==
            undefined
        ) {
            currentSolar =
                input.solar;
        }

        return getState();
    }

    function tick(
        timeSeconds
    ) {
        material.uniforms
            .uTime
            .value =
            Number(
                timeSeconds
            ) || 0;
    }

    function getState() {
        return Object.freeze({
            phase:
                currentPhase,

            solar:
                currentSolar,

            zenith:
                material.uniforms
                    .uZenithColor
                    .value
                    .getHexString(),

            horizon:
                material.uniforms
                    .uHorizonColor
                    .value
                    .getHexString(),

            cloudCover:
                material.uniforms
                    .uCloudCover
                    .value,

            cloudOpacity:
                material.uniforms
                    .uCloudOpacity
                    .value,

            haze:
                material.uniforms
                    .uHaze
                    .value,

            sunIntensity:
                material.uniforms
                    .uSunIntensity
                    .value,

            exposure
        });
    }

    function dispose() {
        geometry.dispose();
        material.dispose();

        mesh.removeFromParent();
    }

    return Object.freeze({
        mesh,
        update,
        tick,
        getState,
        dispose
    });
}