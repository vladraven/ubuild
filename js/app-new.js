// ================================================
// FILE: js/app-new.js
// ================================================
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

    // 1. Инициализация UI и лимитов ввода
    initUI(updateBuilding, renderer, scene, camera, controls || sceneObj.controls);

    // 2. Восстановление конфигурации из URL-параметров при наличии
    applyUrlConfig(updateBuilding);

    // 3. Первичная процедурная сборка сцены с валидированными параметрами
    updateBuilding();

    animate();
});