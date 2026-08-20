// js/lighting/LightingSystem.js
import * as THREE from 'three';

export function createLightingSystem(scene) {
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    
    scene.add(sunLight, ambientLight);

    return Object.freeze({
        update(solarState) {
            // Пересчет вектора направления света на основе азимута и элевации
            const phi = THREE.MathUtils.degToRad(90 - solarState.elevation);
            const theta = THREE.MathUtils.degToRad(solarState.azimuth);
            
            sunLight.position.setFromSpherical(new THREE.Spherical(100, phi, theta));
            
            // Динамическое изменение интенсивности в зависимости от фазы дня
            if (solarState.phase === 'night') sunLight.intensity = 0.1;
            else sunLight.intensity = 1.5;
        },
        dispose() {
            sunLight.dispose();
            ambientLight.dispose();
        }
    });
}