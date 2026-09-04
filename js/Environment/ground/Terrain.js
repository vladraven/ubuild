import * as THREE from 'three';

export function createTerrain(config = {}) {
    const size = config.size || 3000;
    const segments = config.segments || 128;

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const colorObj = new THREE.Color();

    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const z = position.getZ(i); 

        // Легаси-рельеф холмов
        const distFromCenter = Math.hypot(x, z);
        if (distFromCenter > 90) {
            const factor = Math.min(1.0, (distFromCenter - 90) / 350);
            const height = (Math.sin(x * 0.012) * Math.cos(z * 0.012) * 3.0 + Math.sin(x * 0.003) * 5.0) * factor;
            position.setY(i, height);
        } else {
            position.setY(i, 0);
        }

        const noise = (Math.sin(x * 0.005) + Math.cos(z * 0.006) + Math.sin((x + z) * 0.002)) / 3;
        const hue = 0.3 + (noise * 0.12);
        const saturation = 0.25 + (noise * 0.08);
        
        // ВАЖНО: Подняли lightness до 0.6, чтобы трава не была черной в новом sRGB пространстве
        const lightness = 0.6 + (noise * 0.08); 
        
        colorObj.setHSL(hue, saturation, lightness);
        colors[i * 3] = colorObj.r;
        colors[i * 3 + 1] = colorObj.g;
        colors[i * 3 + 2] = colorObj.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    function updateBounds() {}
    function rebuild() {}
    
    function dispose() {
        geometry.dispose();
    }

    return Object.freeze({
        geometry,
        updateBounds,
        rebuild,
        dispose
    });
}