import * as THREE from 'three';
import { createGroundSystem } from './ground/GroundSystem.js';

export function createEnvironmentSystem(config = {}) {
    let onNeedRender = typeof config.onNeedRender === 'function' ? config.onNeedRender : null;

    const group = new THREE.Group();
    group.name = 'environment-system';

    const groundSystem = createGroundSystem({
        onNeedRender: () => {
            if (onNeedRender) onNeedRender();
        }
    });

    group.add(groundSystem.group);

    function update(input = {}) {
        // Заглушка, чтобы не ломался API
        return getState();
    }

    function updateBounds(buildingBounds) {
        groundSystem.updateBounds(buildingBounds);
    }

    function applyToScene(scene) {
        if (!scene) return;

        // Legacy Fog
        scene.fog = new THREE.FogExp2(0xdce7f3, 0.0006);

        // Legacy Skybox
        const skyPath = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/cube/skyboxsun25deg/';
        const cubeTextureLoader = new THREE.CubeTextureLoader();
        cubeTextureLoader.setCrossOrigin('anonymous');
        
        cubeTextureLoader.load([
            skyPath + 'px.jpg',
            skyPath + 'nx.jpg',
            skyPath + 'py.jpg',
            skyPath + 'ny.jpg',
            skyPath + 'pz.jpg',
            skyPath + 'nz.jpg'
        ], (texture) => {
            // Исправляем цветовое пространство для новых версий Three.js
            if ('colorSpace' in texture) {
                texture.colorSpace = THREE.SRGBColorSpace;
            } else if ('encoding' in texture) {
                texture.encoding = THREE.sRGBEncoding;
            }
            
            scene.background = texture;
            // ВАЖНО: Присваиваем скайбокс в environment, чтобы панели здания отражали небо!
            scene.environment = texture; 
            
            if (onNeedRender) onNeedRender();
        });
    }

    function tick() {
        // Анимации неба больше нет
    }

    function setOnNeedRender(fn) {
        onNeedRender = typeof fn === 'function' ? fn : null;
        groundSystem.setOnNeedRender(onNeedRender);
    }

    function getState() {
        return Object.freeze({});
    }

    function dispose() {
        groundSystem.dispose();
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