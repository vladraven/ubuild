import * as THREE from 'three';
import { createTrimsGroup } from './trims.js';
import { openingsData, openingDefs } from './state.js';

export function createGuttersGroup(width, length, height, pitchRatio, roofType, enabled) {
    if (!enabled) return new THREE.Group();
    // Очищен от устаревшего кода: делегирует генерацию единому модулю trims.js
    // Trims are intentionally passed as `false` here so gutters have their own
    // independent visibility (see createTrimsGroup: gutters no longer depend on
    // the "Show Trim" flag).
    const group = createTrimsGroup(width, length, height, pitchRatio, roofType, false, 0, 0, true);
    updateDownspoutVisibility(group);
    return group;
}

// How far past a door's edge (in meters) a downspout still counts as "in the way".
const DOWNSPOUT_DOOR_TOLERANCE = 0.3;

/**
 * FIX 6: Door / downspout collision auto-hide.
 * Walks every downspout tagged by trims.js (userData.isDownspout) and hides it
 * if it falls within [doorX - tolerance, doorX + doorWidth + tolerance] of any
 * door placed on the same wall. Downspouts clear of all doors are shown again.
 * Call this whenever doors are added, moved, or deleted (and right after the
 * trims/gutters group is (re)built, since a rebuild recreates all downspouts).
 */
export function updateDownspoutVisibility(root) {
    if (!root) return;

    const downspouts = [];
    root.traverse((obj) => {
        if (obj.userData && obj.userData.isDownspout) downspouts.push(obj);
    });

    downspouts.forEach((ds) => {
        const side = ds.userData.side;
        const dsPos = ds.userData.wallPos;
        const doorsOnWall = (openingsData[side] || []).filter((op) => op.type !== 'Window');

        const collides = doorsOnWall.some((door) => {
            const def = openingDefs[door.type] || { w: 2.0 };
            const doorW = door.w || def.w;
            const minX = door.x - doorW / 2 - DOWNSPOUT_DOOR_TOLERANCE;
            const maxX = door.x + doorW / 2 + DOWNSPOUT_DOOR_TOLERANCE;
            return dsPos >= minX && dsPos <= maxX;
        });

        ds.visible = !collides;
    });
}