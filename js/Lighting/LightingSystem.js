import * as THREE from 'three';

const PHASE_COLORS = Object.freeze({
    night: Object.freeze({
        sunColor: 0x111c33,
        sunIntensity: 0.5,
        ambientColor: 0x1a2638,
        ambientIntensity: 1,
        skyColor: 0x0a1424,
        groundColor: 0x050a12
    }),

    sunrise: Object.freeze({
        sunColor: 0xffa05c,
        sunIntensity: 1.5,
        ambientColor: 0x8a7060,
        ambientIntensity: 1,
        skyColor: 0xf5a267,
        groundColor: 0x4a3b32
    }),

    day: Object.freeze({
        sunColor: 0xfffaf0,
        sunIntensity: 2.2,
        ambientColor: 0xffffff,
        ambientIntensity: 1,
        skyColor: 0xebf4fa,
        groundColor: 0x6e7865
    }),

    sunset: Object.freeze({
        sunColor: 0xfc6d3f,
        sunIntensity: 1.5,
        ambientColor: 0x825b52,
        ambientIntensity: 1,
        skyColor: 0xdb6e48,
        groundColor: 0x3d2b26
    })
});

export function createLightingSystem(scene) {
    if (
        !scene ||
        typeof scene.add !== 'function') {
        throw new TypeError(
            'Three.js Scene is required to initialize LightingSystem');
    }

    const lightsGroup =
        new THREE.Group();

    lightsGroup.name =
        'lighting-system';

    const ambientLight =
        new THREE.AmbientLight(
            0xffffff,
            0.6);

    ambientLight.name =
        'light-ambient';

    lightsGroup.add(
        ambientLight);

    const hemisphereLight =
        new THREE.HemisphereLight(
            0xebf4fa,
            0x6e7865,
            0.3);

    hemisphereLight.name =
        'light-hemisphere';

    lightsGroup.add(
        hemisphereLight);

    const sunLight =
        new THREE.DirectionalLight(
            0xfffaf0,
            1.4);

    sunLight.name =
        'light-sun';

    sunLight.castShadow =
        true;

    /*
     * Shadow quality
     *
     * The previous 1024px map was covering a very
     * large area relative to the building. Thin
     * roof/frame geometry therefore produced visible
     * shadow-map aliasing and acne.
     */
    sunLight.shadow.mapSize.width =
        4096;

    sunLight.shadow.mapSize.height =
        4096;

    /*
     * Keep the shadow map focused on the building.
     */
    sunLight.shadow.bias =
        0.0015;

    sunLight.shadow.normalBias =
        0.02;

    /*
     * Used by PCF-style shadow filtering.
     * It is harmless for shadow modes that do not
     * use this parameter.
     */
    sunLight.shadow.radius =
        2;

    lightsGroup.add(
        sunLight);

    lightsGroup.add(
        sunLight.target);

    scene.add(
        lightsGroup);

    let currentSolarState =
        null;

    function update(
        solarState,
        buildingBounds = null) {
        if (
            !solarState) {
            return;
        }

        currentSolarState =
            solarState;

        const phaseConfig =
            PHASE_COLORS[
                solarState.phase
            ] ||
            PHASE_COLORS.day;

        /*
         * Positioning of the sun by solar
         * azimuth/elevation.
         *
         * Azimuth:
         * 0   = North (+Z)
         * 90  = East  (+X)
         * 180 = South (-Z)
         * 270 = West  (-X)
         */
        const elevationClamped =
            Math.max(
                0.1,
                solarState.elevation);

        const phi =
            (
            90.0 -
            elevationClamped) *
        (
            Math.PI /
            180.0);

        const theta =
            (
            solarState.azimuth -
            90.0) *
        (
            Math.PI /
            180.0);

        const radius =
            250.0;

        const sunX =
            radius *
            Math.sin(phi) *
            Math.cos(theta);

        const sunY =
            radius *
            Math.cos(phi);

        const sunZ =
            radius *
            Math.sin(phi) *
            Math.sin(theta);

        sunLight.position.set(
            sunX,
            sunY,
            sunZ);

        if (
            buildingBounds &&
            buildingBounds.center) {
            sunLight.target.position.set(
                buildingBounds.center.x,
                buildingBounds.center.y,
                buildingBounds.center.z);
        } else {
            sunLight.target.position.set(
                0,
                0,
                0);
        }

        sunLight.target.updateMatrixWorld();

        /*
         * Shadow camera
         *
         * Keep the orthographic shadow volume
         * proportional to the actual building.
         *
         * Previous:
         *
         *     maxDim * 1.2
         *
         * which unnecessarily spread the 1024px
         * shadow map over a very large area.
         */
        if (
            buildingBounds) {
            const maxDim =
                Math.max(
                    buildingBounds.width ||
                    30,

                    buildingBounds.height ||
                    10,

                    buildingBounds.length ||
                    40);

            const shadowSize =
                Math.max(
                    10,
                    maxDim * 0.75);

            sunLight.shadow.camera.left =
                -shadowSize;

            sunLight.shadow.camera.right =
                shadowSize;

            sunLight.shadow.camera.top =
                shadowSize;

            sunLight.shadow.camera.bottom =
                -shadowSize;

            /*
             * Keep enough depth range for the
             * directional light while avoiding
             * unnecessarily tiny near values.
             */
            sunLight.shadow.camera.near =
                1.0;

            sunLight.shadow.camera.far =
                radius * 2.0;

            sunLight.shadow.camera.updateProjectionMatrix();
        }

        sunLight.color.setHex(
            phaseConfig.sunColor);

        sunLight.intensity =
            solarState.phase === 'night'
             ? 0.0
             : phaseConfig.sunIntensity;

        ambientLight.color.setHex(
            phaseConfig.ambientColor);

        ambientLight.intensity =
            phaseConfig.ambientIntensity;

        hemisphereLight.color.setHex(
            phaseConfig.skyColor);

        hemisphereLight.groundColor.setHex(
            phaseConfig.groundColor);

        hemisphereLight.intensity =
            solarState.phase === 'night'
             ? 0.15
             : 0.3;
    }

    function getState() {
        return Object.freeze({
            solar:
            currentSolarState,

            sun: {
                position: {
                    x:
                    sunLight.position.x,

                    y:
                    sunLight.position.y,

                    z:
                    sunLight.position.z
                },

                intensity:
                sunLight.intensity,

                color:
                sunLight.color.getHexString()
            },

            ambient: {
                intensity:
                ambientLight.intensity,

                color:
                ambientLight.color.getHexString()
            }
        });
    }

    function dispose() {
        sunLight.dispose();

        ambientLight.dispose();

        hemisphereLight.dispose();

        lightsGroup.clear();

        lightsGroup.removeFromParent();
    }

    return Object.freeze({
        lightsGroup,
        update,
        getState,
        dispose
    });
}