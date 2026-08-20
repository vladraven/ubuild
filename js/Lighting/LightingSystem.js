// js/lighting/LightingSystem.js
import * as THREE from 'three';

const PHASE_COLORS = Object.freeze({
    night: Object.freeze({
        sunColor: 0x111c33,
        sunIntensity: 0.0,
        ambientColor: 0x1a2638,
        ambientIntensity: 0.35,
        skyColor: 0x0a1424,
        groundColor: 0x050a12
    }),
    sunrise: Object.freeze({
        sunColor: 0xffa05c,
        sunIntensity: 1.6,
        ambientColor: 0x8a7060,
        ambientIntensity: 0.7,
        skyColor: 0xf5a267,
        groundColor: 0x4a3b32
    }),
    day: Object.freeze({
        sunColor: 0xfffaf0,
        sunIntensity: 2.2,
        ambientColor: 0xffffff,
        ambientIntensity: 0.85,
        skyColor: 0xebf4fa,
        groundColor: 0x6e7865
    }),
    sunset: Object.freeze({
        sunColor: 0xfc6d3f,
        sunIntensity: 1.5,
        ambientColor: 0x825b52,
        ambientIntensity: 0.65,
        skyColor: 0xdb6e48,
        groundColor: 0x3d2b26
    })
});

export function createLightingSystem(scene) {
    if (!scene || typeof scene.add !== 'function') {
        throw new TypeError('Three.js Scene is required to initialize LightingSystem');
    }

    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'lighting-system';

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    ambientLight.name = 'light-ambient';
    lightsGroup.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xebf4fa, 0x6e7865, 0.4);
    hemisphereLight.name = 'light-hemisphere';
    lightsGroup.add(hemisphereLight);

    const sunLight = new THREE.DirectionalLight(0xfffaf0, 2.2);
    sunLight.name = 'light-sun';
    sunLight.castShadow = true;

    // Настройки карты теней высокой четкости
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.02;

    lightsGroup.add(sunLight);
    lightsGroup.add(sunLight.target);
    scene.add(lightsGroup);

    let currentSolarState = null;

    function update(solarState, buildingBounds = null) {
        if (!solarState) return;
        currentSolarState = solarState;

        const phaseConfig = PHASE_COLORS[solarState.phase] || PHASE_COLORS.day;

        // Позиционирование источника света по азимуту и элевации (сферическая проекция)
        const elevationClamped = Math.max(0.1, solarState.elevation);
        const phi = (90.0 - elevationClamped) * (Math.PI / 180.0);
        // Азимут: 0=Север (+Z), 90=Восток (+X), 180=Юг (-Z), 270=Запад (-X)
        const theta = (solarState.azimuth - 90.0) * (Math.PI / 180.0);

        const radius = 250.0;
        const sunX = radius * Math.sin(phi) * Math.cos(theta);
        const sunY = radius * Math.cos(phi);
        const sunZ = radius * Math.sin(phi) * Math.sin(theta);

        sunLight.position.set(sunX, sunY, sunZ);

        if (buildingBounds && buildingBounds.center) {
            sunLight.target.position.set(
                buildingBounds.center.x,
                buildingBounds.center.y,
                buildingBounds.center.z
            );
        } else {
            sunLight.target.position.set(0, 0, 0);
        }
        sunLight.target.updateMatrixWorld();

        // Динамическая адаптация тени под габариты здания
        if (buildingBounds) {
            const maxDim = Math.max(
                buildingBounds.width || 30,
                buildingBounds.height || 10,
                buildingBounds.length || 40
            );
            const d = maxDim * 1.2;
            sunLight.shadow.camera.left = -d;
            sunLight.shadow.camera.right = d;
            sunLight.shadow.camera.top = d;
            sunLight.shadow.camera.bottom = -d;
            sunLight.shadow.camera.near = 1.0;
            sunLight.shadow.camera.far = radius * 2.0;
            sunLight.shadow.camera.updateProjectionMatrix();
        }

        // Обновление цвета и интенсивности
        sunLight.color.setHex(phaseConfig.sunColor);
        sunLight.intensity = solarState.phase === 'night' ? 0.0 : phaseConfig.sunIntensity;

        ambientLight.color.setHex(phaseConfig.ambientColor);
        ambientLight.intensity = phaseConfig.ambientIntensity;

        hemisphereLight.color.setHex(phaseConfig.skyColor);
        hemisphereLight.groundColor.setHex(phaseConfig.groundColor);
        hemisphereLight.intensity = solarState.phase === 'night' ? 0.15 : 0.45;
    }

    function getState() {
        return Object.freeze({
            solar: currentSolarState,
            sun: {
                position: { x: sunLight.position.x, y: sunLight.position.y, z: sunLight.position.z },
                intensity: sunLight.intensity,
                color: sunLight.color.getHexString()
            },
            ambient: {
                intensity: ambientLight.intensity,
                color: ambientLight.color.getHexString()
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