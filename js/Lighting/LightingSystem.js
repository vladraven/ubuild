import * as THREE from 'three';

export function createLightingSystem(scene) {
    if (!scene || typeof scene.add !== 'function') {
        throw new TypeError('Three.js Scene is required to initialize LightingSystem');
    }

    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'lighting-system';

    // 1. Радикально снижаем "всепроникающий" свет, чтобы он не убивал тени в гофре
    const hemisphereLight = new THREE.HemisphereLight(0xdedede, 0x5a5a6a, 0.25); // было 0.4
    hemisphereLight.position.set(0, 200, 0);
    lightsGroup.add(hemisphereLight);

    const ambientLight = new THREE.AmbientLight(0xdedede, 0.15); // было 0.35
    lightsGroup.add(ambientLight);

    // 2. Оставляем солнце мощным, потому что именно оно прорисовывает рельеф
    const sunLight = new THREE.DirectionalLight(0xdedede, 0.85); // Солнце теперь главный источник
    sunLight.position.set(150, 250, 120);
    sunLight.castShadow = true;

    sunLight.shadow.bias = -0.001;        
    sunLight.shadow.normalBias = 0.05;   
    sunLight.shadow.radius = 2.5;            
    sunLight.shadow.mapSize.width = 4096;  
    sunLight.shadow.mapSize.height = 4096;

    lightsGroup.add(sunLight);
    lightsGroup.add(sunLight.target);
    scene.add(lightsGroup);

    function update(solarState, buildingBounds = null) {
        if (buildingBounds && buildingBounds.center) {
            sunLight.target.position.copy(buildingBounds.center);
            sunLight.target.updateMatrixWorld();

            const maxDim = Math.max(
                buildingBounds.width || 30,
                buildingBounds.height || 10,
                buildingBounds.length || 40
            );

            const shadowSize = Math.max(10, maxDim * 0.85);
            sunLight.shadow.camera.near = 10;
            sunLight.shadow.camera.far = 1000;
            sunLight.shadow.camera.left = -shadowSize;
            sunLight.shadow.camera.right = shadowSize;
            sunLight.shadow.camera.top = shadowSize;
            sunLight.shadow.camera.bottom = -shadowSize;
            sunLight.shadow.camera.updateProjectionMatrix();
        }
    }

    function getState() {
        return Object.freeze({});
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