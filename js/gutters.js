import * as THREE from 'three';
import { createTrimsGroup } from './trims.js';

export function createGuttersGroup(width, length, height, pitchRatio, roofType, enabled) {
    if (!enabled) return new THREE.Group();
    // Очищен от устаревшего кода: делегирует генерацию единому модулю trims.js
    return createTrimsGroup(width, length, height, pitchRatio, roofType, true, 0, 0, true);
}