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

    function update() { return Object.freeze({}); }
    function updateBounds(bounds) { groundSystem.updateBounds(bounds); }

    function applyToScene(scene) {
        if (!scene) return;

        // Legacy Fog
        scene.fog = new THREE.FogExp2(0xdce7f3, 0.0006);

        // Легаси-небо
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
            if ('colorSpace' in texture) {
                texture.colorSpace = THREE.SRGBColorSpace;
            } else if ('encoding' in texture) {
                texture.encoding = THREE.sRGBEncoding;
            }
            
            // Назначаем легаси-скабокс фоном...
            scene.background = texture;
            // ... И КАРТОЙ ОТРАЖЕНИЙ! Металл будет реалистичным.
            scene.environment = texture; 
            
            if (onNeedRender) onNeedRender();
        });
    }

    function tick() {}
    function setOnNeedRender(fn) { 
        onNeedRender = typeof fn === 'function' ? fn : null; 
        groundSystem.setOnNeedRender(onNeedRender);
    }
    function getState() { return Object.freeze({}); }
    function dispose() {
        groundSystem.dispose();
        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        group, update, tick, updateBounds, applyToScene, setOnNeedRender, getState, dispose
    });
}