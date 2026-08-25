import * as THREE from 'three';
import { state, getGlobalHeight, getFloorBaseY } from './state.js';
import { CONFIG, STD_WINDOWS, STD_DOORS } from './config.js';

export function getWallLength(wallId, p) {
    let wallLen = (wallId === 'front' || wallId === 'back') ? p.width : p.depth;
    if (p.modelType === 'hip_and_valley') {
        const A = p.width; const B = p.depth; 
        const L = p.hvLeftExt || 0; const R = p.hvRightExt || 0; 
        const OL = p.hvLeftOffset || 0; const OR = p.hvRightOffset || 0;
        const Zw_L_front = OL + A/2; const Zw_L_back = OL - A/2;
        const Zw_R_front = OR + A/2; const Zw_R_back = OR - A/2;
        if (wallId === 'front' || wallId === 'back' || wallId === 'wing_l_end' || wallId === 'wing_r_end') wallLen = A;
        if (wallId === 'wing_l_front' || wallId === 'wing_l_back') wallLen = L;
        if (wallId === 'wing_r_front' || wallId === 'wing_r_back') wallLen = R;
        if (wallId === 'left_front') wallLen = B/2 - Zw_L_front;
        if (wallId === 'left_back') wallLen = Zw_L_back - (-B/2);
        if (wallId === 'right_front') wallLen = B/2 - Zw_R_front;
        if (wallId === 'right_back') wallLen = Zw_R_back - (-B/2);
        if (wallId === 'left' || wallId === 'right') wallLen = B;
    } else if (p.modelType === 'hexagonal') {
        wallLen = p.width / 2;
    } else if (p.modelType === 'cross_hipped') {
        const A = p.width; const B = p.depth; const D = p.width; const X = p.crossOffset || 0;
        if (wallId === 'front_left') wallLen = (X - D/2) - (-A/2);
        if (wallId === 'front_right') wallLen = A/2 - (X + D/2);
        if (wallId === 'wing_front') wallLen = D;
        if (wallId === 'wing_left' || wallId === 'wing_right') wallLen = p.crossDepth;
        if (wallId === 'left') wallLen = ((X - D/2) - (-A/2)) < 0.1 ? B + p.crossDepth : B;
        if (wallId === 'right') wallLen = (A/2 - (X + D/2)) < 0.1 ? B + p.crossDepth : B;
    }
    return wallLen;
}

export function getClosestStandard(w, h, isDoor) {
    const list = isDoor ? STD_DOORS : STD_WINDOWS;
    let closest = list[0];
    let minD = Infinity;
    list.forEach(std => {
        const d = Math.sqrt(Math.pow(std.w - w, 2) + Math.pow(std.h - h, 2));
        if (d < minD) { minD = d; closest = std; }
    });
    return { ...closest, dist: minD };
}

export function checkOverlap(floorId, wallId, currentOp) {
    const floor = state.params.floors.find(f => f.id === floorId);
    if (!floor) return false;
    const wallOps = floor.openings[wallId] || [];
    for (let other of wallOps) {
        if (other.id === currentOp.id) continue;
        const combinedW = (currentOp.w + other.w) / 2 + 1.0; 
        const combinedH = (currentOp.h + other.h) / 2 + 1.0; 
        const dx = Math.abs(currentOp.cx - other.cx);
        const dy = Math.abs(currentOp.cy - other.cy);
        if (dx < combinedW && dy < combinedH) return true;
    }
    return false;
}

export function clampOpenings() {
    state.params.floors.forEach(floor => {
        Object.keys(floor.openings).forEach(w => {
            let len = getWallLength(w, state.params);
            if (len <= 0.1) { floor.openings[w] = []; return; }
            
            floor.openings[w].forEach(o => {
                const limit = len/2 - o.w/2 - 0.5;
                if (limit < 0) o.cx = 0; else o.cx = THREE.MathUtils.clamp(o.cx, -limit, limit);
            });
        });
    });
}

export function sanitizeAndAlign() {
    const invalidDormerTypes = ['butterfly', 'flat', 'shed', 'pyramid', 'hexagonal', 'm_shaped', 'skillion_leanto', 'dutch_gable', 'combination', 'cross_hipped', 'hip_and_valley'];
    const dEnable = document.getElementById('d-enable');
    const dormerControls = document.getElementById('dormer-controls');
    const dormerSection = dEnable ? dEnable.closest('.p-3') : null;

    if (invalidDormerTypes.includes(state.params.modelType)) {
        state.params.hasDormer = false; 
        if (dEnable) { dEnable.checked = false; dEnable.disabled = true; }
        if (dormerSection) dormerSection.style.display = 'none';
    } else {
        if (dEnable && !dEnable.disabled) state.params.hasDormer = dEnable.checked;
        if (dEnable) dEnable.disabled = false;
        if (dormerSection) dormerSection.style.display = 'block';
        if (dormerControls) dormerControls.style.display = state.params.hasDormer ? 'block' : 'none';
    }

    const globalHeight = getGlobalHeight();

    state.params.floors.forEach((floor, index) => {
        const floorBaseY = getFloorBaseY(floor.id);
        const isTopFloor = (index === state.params.floors.length - 1);

        Object.keys(floor.openings).forEach(wall => {
            floor.openings[wall].forEach(o => {
                const oldY = o.cy;
                let maxAllowedY = floor.height - o.h / 2 - 0.5;

                if (isTopFloor && (wall === 'front' || wall === 'back') && !['mansard', 'hip', 'pyramid', 'hexagonal', 'dutch_gable', 'combination', 'cross_hipped', 'hip_and_valley'].includes(state.params.modelType)) {
                    if (state.params.modelType === 'butterfly') {
                        maxAllowedY = (floor.height - (state.params.width / 2) * (state.params.pitch / 12)) - o.h / 2 - 0.5;
                    } else if (state.params.modelType === 'm_shaped') {
                        const pX = state.params.width / 6; const m = state.params.pitch / 12;
                        let localRoofY = floor.height;
                        if (Math.abs(o.cx) >= pX) { localRoofY = floor.height + (state.params.width / 2 - Math.abs(o.cx)) * m; } 
                        else { localRoofY = floor.height + Math.abs(o.cx) * (m * 2); }
                        maxAllowedY = localRoofY - 1.0 - o.h / 2;
                    } else if (state.params.modelType === 'jerkinhead') {
                        const m = state.params.pitch / 12; const peak = (state.params.width / 2) * m;
                        const actOff = Math.max(0.1, state.params.hipOffset); const cWallX = actOff - 0.5;
                        let localRoofY;
                        if (cWallX <= 0) { localRoofY = floor.height + (state.params.width / 2 - Math.abs(o.cx)) * m; } 
                        else {
                            if (Math.abs(o.cx) <= cWallX) { localRoofY = floor.height + peak - cWallX * m; } 
                            else { localRoofY = floor.height + (state.params.width / 2 - Math.abs(o.cx)) * m; }
                        }
                        maxAllowedY = localRoofY - o.h / 2 - 0.5;
                    } else if (['standard', 'saltbox', 'gambrel', 'split'].includes(state.params.modelType)) {
                        const run = (state.params.modelType === 'saltbox') ? (state.params.width * 0.66) : (state.params.width / 2);
                        const ridgeX = (state.params.modelType === 'saltbox') ? (state.params.width / 2 - state.params.width * 0.33) : 0;
                        const localPeak = (run - Math.abs(o.cx - ridgeX)) * (state.params.pitch / 12);
                        maxAllowedY = (floor.height + localPeak) - o.h / 2 - 0.5;
                    } else if (state.params.modelType === 'skillion_leanto' || state.params.modelType === 'shed') {
                        maxAllowedY = (floor.height + (o.cx + state.params.width/2) * (state.params.pitch / 12)) - o.h / 2 - 0.5;
                    }
                }

                o.cy = Math.min(o.cy, maxAllowedY);
                if (o.isDoor) {
                    o.cy = o.h / 2;
                } else {
                    const minY = o.h / 2;
                    o.cy = Math.max(o.cy, minY);
                }

                if (checkOverlap(floor.id, wall, o)) { o.cx += (o.cx >= 0) ? 2.0 : -2.0; if (checkOverlap(floor.id, wall, o)) o.cy = oldY; }
            });
        });
    });
}

export function updateBuildingLimits() {
    const reqSpace = (wallId) => {
        let totalMax = 0;
        state.params.floors.forEach(floor => {
            const ops = floor.openings[wallId] || [];
            if (ops.length === 0) return;
            const totalW = ops.reduce((sum, o) => sum + o.w, 0);
            const currentReq = totalW + (ops.length + 1) * CONFIG.minSpacing;
            if (currentReq > totalMax) totalMax = currentReq;
        });
        return totalMax;
    };

    let minW = 10, minD = 10;
    
    state.params.floors.forEach(floor => {
        let maxFloorH = (state.params.hasWainscot && floor.id === 0) ? state.params.wainscotHeight + 1 : 1;
        Object.keys(floor.openings).forEach(w => {
            const ws = reqSpace(w);
            if (w.includes('front') || w.includes('back') || w.includes('end')) minW = Math.max(minW, ws);
            if (w.includes('left') || w.includes('right')) minD = Math.max(minD, ws);
            floor.openings[w].forEach(o => { const topEdge = o.cy + o.h/2; if (topEdge + 1 > maxFloorH) maxFloorH = topEdge + 1; });
        });
        if (floor.height < maxFloorH) {
            floor.height = maxFloorH;
            if (state.activeFloorId === floor.id) {
                const hInput = document.getElementById('h-height');
                if (hInput) hInput.value = maxFloorH;
            }
        }
    });

    const wInput = document.getElementById('h-width'); const dInput = document.getElementById('h-depth');
    const hipInput = document.getElementById('h-hipOffset');

    if (wInput) { wInput.min = minW; if (state.params.width < minW) { state.params.width = minW; wInput.value = minW; } }
    if (dInput) { dInput.min = minD; if (state.params.depth < minD) { state.params.depth = minD; dInput.value = minD; } }

    if (hipInput) {
        let maxAllowedOffset = Math.max(0.1, (state.params.depth / 2) - 2); 
        if (['dutch_gable', 'combination'].includes(state.params.modelType)) maxAllowedOffset = Math.max(0.1, Math.min(state.params.width/2 - 1, state.params.depth/2 - 1));
        else if (['cross_hipped', 'hip_and_valley'].includes(state.params.modelType)) maxAllowedOffset = Math.max(0, state.params.width/2 - 0.1); 
        hipInput.max = maxAllowedOffset;
        if (state.params.hipOffset > maxAllowedOffset) { state.params.hipOffset = maxAllowedOffset; hipInput.value = maxAllowedOffset; }
    }

    if (state.params.modelType === 'cross_hipped') {
        const hco = document.getElementById('h-crossOffset');
        if (hco) {
            const maxRange = Math.max(0, state.params.depth / 2 - state.params.width / 2);
            hco.min = -maxRange; hco.max = maxRange;
            state.params.crossOffset = THREE.MathUtils.clamp(state.params.crossOffset || 0, -maxRange, maxRange); hco.value = state.params.crossOffset;
        }
    }

    if (state.params.modelType === 'hip_and_valley') {
        const hvlo = document.getElementById('h-hvLeftOffset'); const hvro = document.getElementById('h-hvRightOffset');
        const maxRange = Math.max(0, state.params.depth / 2 - state.params.width / 2);
        if (hvlo) { hvlo.min = -maxRange; hvlo.max = maxRange; state.params.hvLeftOffset = THREE.MathUtils.clamp(state.params.hvLeftOffset || 0, -maxRange, maxRange); hvlo.value = state.params.hvLeftOffset; }
        if (hvro) { hvro.min = -maxRange; hvro.max = maxRange; state.params.hvRightOffset = THREE.MathUtils.clamp(state.params.hvRightOffset || 0, -maxRange, maxRange); hvro.value = state.params.hvRightOffset; }
    }

    if (state.params.modelType === 'skillion_leanto') {
        const hLTDepth = document.getElementById('h-leanToDepth');
        const hLTHeight = document.getElementById('h-leanToHeight');
        
        if (hLTDepth) {
            hLTDepth.max = state.params.depth;
            state.params.leanToDepth = Math.min(state.params.leanToDepth, state.params.depth);
            hLTDepth.value = state.params.leanToDepth;
        }
        if (hLTHeight) {
            const peakLean = state.params.leanToWidth * (state.params.leanToPitch / 12);
            const globalH = getGlobalHeight();
            const maxLH = globalH - peakLean;
            hLTHeight.max = Math.max(1, maxLH);
            if (state.params.leanToHeight > maxLH) {
                state.params.leanToHeight = Math.max(1, maxLH);
                hLTHeight.value = state.params.leanToHeight;
            }
        }
    }

    updateDormerLimits();
}

export function updateDormerLimits() {
    const run = (state.params.modelType === 'saltbox') ? (state.params.width * 0.66) : (state.params.width / 2);
    const m = state.params.pitch / 12; const peak = run * m;
    const hDormerWidth = document.getElementById('h-dormerWidth'); const hDormerDepth = document.getElementById('h-dormerDepth');
    const hDormerHeight = document.getElementById('h-dormerHeight'); const hDormerZ = document.getElementById('h-dormerZ');
    const globalH = getGlobalHeight();

    if (hDormerWidth) { hDormerWidth.max = state.params.depth; state.params.dormerWidth = Math.min(state.params.dormerWidth, state.params.depth); hDormerWidth.value = state.params.dormerWidth; }
    
    if (hDormerZ) {
        let maxZ = Math.max(0, (state.params.depth / 2) - (state.params.dormerWidth / 2));
        if (state.params.modelType === 'jerkinhead') { const actOff = Math.max(0.1, state.params.hipOffset); maxZ = Math.max(0, (state.params.depth / 2) - actOff - (state.params.dormerWidth / 2)); }
        hDormerZ.min = -maxZ; hDormerZ.max = maxZ; state.params.dormerZ = THREE.MathUtils.clamp(state.params.dormerZ, -maxZ, maxZ); hDormerZ.value = state.params.dormerZ; 
    }

    if (hDormerDepth) {
        const minDx = Math.max(((state.params.dormerWidth / 2) * m + 0.5) / m, run * 0.2); const maxDx = run; 
        hDormerDepth.min = minDx; hDormerDepth.max = maxDx; state.params.dormerDepth = THREE.MathUtils.clamp(state.params.dormerDepth, minDx, maxDx); hDormerDepth.value = state.params.dormerDepth; 
    }
    
    if (hDormerHeight) {
        const yRidge = globalH + peak; const maxDh = yRidge - ((state.params.dormerWidth / 2) * m) - 0.1; 
        const yRoofAtFront = yRidge - m * state.params.dormerDepth; const minDh = yRoofAtFront + 0.1; 
        const finalMinDh = Math.min(minDh, maxDh); 
        hDormerHeight.min = finalMinDh; hDormerHeight.max = maxDh; state.params.dormerHeight = THREE.MathUtils.clamp(state.params.dormerHeight, finalMinDh, maxDh); hDormerHeight.value = state.params.dormerHeight; 
    }
}