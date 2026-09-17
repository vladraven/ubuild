import * as THREE from 'three';

export function createLightingSystem(scene) {
    if (!scene || typeof scene.add !== 'function') {
        throw new TypeError('Three.js Scene is required to initialize LightingSystem');
    }

    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'lighting-system';

    const hemiLight = new THREE.HemisphereLight(0xdedede, 0x5a5a6a, 0.75);
    hemiLight.position.set(0, 200, 0);
    lightsGroup.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xdedede, 0.75);
    lightsGroup.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xdedede, 1.5);
    sunLight.position.set(150, 250, 120);
    sunLight.castShadow = true;

    sunLight.shadow.bias = -0.001;
    sunLight.shadow.normalBias = 0.05;
    sunLight.shadow.radius = 2.5;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;

    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.top = 80;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.camera.left = -180;
    sunLight.shadow.camera.right = 180;

    lightsGroup.add(sunLight);
    lightsGroup.add(sunLight.target);
    scene.add(lightsGroup);

    function update() {
        // Статический legacy-свет: параметры зафиксированы, пересчет солнца отключен
    }

    function getState() {
        return Object.freeze({
            sun: {
                position: { x: 150, y: 250, z: 120 },
                intensity: 1.5,
                color: 'dedede'
            },
            ambient: {
                intensity: 0.75,
                color: 'dedede'
            },
            hemisphere: {
                intensity: 0.75,
                skyColor: 'dedede',
                groundColor: '5a5a6a'
            }
        });
    }

    function dispose() {
        sunLight.dispose();
        ambientLight.dispose();
        hemiLight.dispose();
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