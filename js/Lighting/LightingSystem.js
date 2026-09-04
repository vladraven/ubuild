import * as THREE from 'three';

export function createLightingSystem(scene) {
    if (!scene || typeof scene.add !== 'function') {
        throw new TypeError('Three.js Scene is required to initialize LightingSystem');
    }

    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'lighting-system';

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    lightsGroup.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x999999, 0.5);
    hemisphereLight.position.set(0, 200, 0);
    lightsGroup.add(hemisphereLight);

    // Снижаем интенсивность солнца до 0.8, чтобы убрать пересвет на белых панелях
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
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

    function getState() { return Object.freeze({}); }
    function dispose() {
        sunLight.dispose();
        ambientLight.dispose();
        hemisphereLight.dispose();
        lightsGroup.clear();
        lightsGroup.removeFromParent();
    }

    return Object.freeze({
        lightsGroup, update, getState, dispose
    });
}