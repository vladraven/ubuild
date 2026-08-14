import { initState } from './state.js';
import { initScene, animate, renderer, scene, camera, controls } from './scene.js';
import { initUI } from './ui.js';
import { updateBuilding } from './builder.js';
import { applyUrlConfig } from './tools-actions.js';

document.addEventListener('DOMContentLoaded', () => {
    const appData = window.ConfiguratorData || {};
    initState(appData);

    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error('Canvas container element not found.');
        return;
    }

    const sceneObj = initScene(container);

    // 1. Сначала инициализируем UI (это применит все математические лимиты)
    initUI(updateBuilding, renderer, scene, camera, controls || sceneObj.controls);

    // 2. Подгружаем конфиг из URL, если он есть
    applyUrlConfig(updateBuilding);

    // 3. И только теперь делаем ПЕРВУЮ отрисовку здания с финальными параметрами
    updateBuilding();

    animate();
});