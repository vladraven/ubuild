import * as THREE from 'three';
import { createTerrain } from './Terrain.js';

export function createGroundSystem(config = {}) {
    let onNeedRender = typeof config.onNeedRender === 'function' ? config.onNeedRender : null;
    
    const group = new THREE.Group();
    group.name = 'environment-ground';

    const terrain = createTerrain({
        size: 3000,
        segments: 128
    });

    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true, // ВАЖНО! Применяет HSL-затемнение из геометрии
        roughness: 0.9,
        metalness: 0.1
    });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    textureLoader.load(
        'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/terrain/grasslight-big.jpg',
        (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(80, 80);
            texture.anisotropy = 16;
            
            if ('colorSpace' in texture) {
                texture.colorSpace = THREE.SRGBColorSpace;
            } else if ('encoding' in texture) {
                texture.encoding = THREE.sRGBEncoding;
            }

            groundMaterial.map = texture;
            groundMaterial.bumpMap = texture;
            groundMaterial.bumpScale = 0.5;
            
            groundMaterial.needsUpdate = true;
            if (onNeedRender) onNeedRender();
        },
        undefined,
        (err) => console.error("Failed to load grass texture", err)
    );

    const mesh = new THREE.Mesh(terrain.geometry, groundMaterial);
    mesh.name = 'environment-ground-mesh';
    mesh.position.y = -0.02;
    mesh.receiveShadow = true;

    group.add(mesh);

    function requestRender() {
        if (onNeedRender) onNeedRender();
    }

    function update() { return Object.freeze({}); }
    
    function updateBounds(buildingBounds) {
        // Старая логика bounds для динамической генерации нам больше не нужна, так как мы вернули жесткий террейн
    }
    
    function setOnNeedRender(fn) { 
        onNeedRender = typeof fn === 'function' ? fn : null; 
    }
    
    function getState() { return Object.freeze({}); }

    function dispose() {
        terrain.dispose();
        if (groundMaterial.map) groundMaterial.map.dispose();
        groundMaterial.dispose();
        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        group, mesh, update, updateBounds, setOnNeedRender, getState, dispose
    });
}