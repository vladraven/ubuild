import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { mainGroup } from './scene.js';

import { 
    isMetric, openingDefs, openingsData, ltState, 
    hitboxes, dragPlanesMap, appData, referenceModels, placedModels 
} from './state.js';
import { 
    concreteMat, roofMat, wallMat, wainscotMat, trimMat, steelMat, 
    craneMat, ceilingMat, mezzMat, getWallMaterials,
    updateMaterialColors
} from './materials.js';
import { 
    createBox, createIBeam, createRibbedGeo, createRoofGeo, 
    createTextLabel, buildOpeningMesh, profileGeoConfigs
} from './geometry.js';

const fbxLoader = new FBXLoader();
const objLoader = new OBJLoader();
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const modelCache = {};

let logoTexture = null;
const logoUrl = 'https://ubuildsb.com/wp-content/themes/U-Build/js/U-build-logo.png'; 

let isFirstLoadComplete = false;

const hardcodedScales = {
    'ergoninane-fast-74.glb': 1.3,
    'forza1903-low-poly-2490.glb': 3,
    'scania.glb': 1,
    'plane.glb': .07
};

const cleanModel = (object) => {
    const toRemove = [];
    object.traverse((child) => {
        if (child.isLight || child.isCamera) {
            toRemove.push(child);
        }
        if (child.isMesh && (!child.material || (Array.isArray(child.material) && child.material.length === 0))) {
            child.material = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.5
            });
        }
    });
    toRemove.forEach(child => {
        if (child.parent) child.parent.remove(child);
    });
    return object;
};

export function updateBuildingAlphaMaps(targetSide = null) {
    const inputW = document.getElementById('inputW');
    const inputL = document.getElementById('inputL');
    const inputH = document.getElementById('inputH');
    const inputPitch = document.getElementById('inputPitch');
    const roofTypeSelect = document.getElementById('roofType');

    if (!inputW || !inputL || !inputH || !inputPitch || !roofTypeSelect) return;

    const W = parseFloat(inputW.getAttribute('data-current-m')),
          L = parseFloat(inputL.getAttribute('data-current-m')),
          H_base = Math.min(parseFloat(inputH.getAttribute('data-current-m')), 12.192),
          Slope = parseFloat(inputPitch.value),
          roofType = roofTypeSelect.value;

    let H = H_base;
    if (roofType === 'gabled') {
        H = H_base + (W / 2) * Slope;
    } else if (roofType === 'single' || roofType === 'left-sloped' || roofType === 'right-sloped') {
        H = H_base + W * Slope;
    }

    const wallOffset = 0.03;
    const wallThick = 0.05;
    const extL = L + wallOffset * 2 + wallThick * 2;
    const extW = W + wallOffset * 2 + wallThick * 2;

    const sides = targetSide ? [targetSide] : ['F', 'B', 'L', 'R'];
    
    sides.forEach(s => {
        const wallLength = (s === 'F' || s === 'B') ? extW : extL;
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 512;
        const ctx = c.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#000000';
        
        if (openingsData[s]) {
            openingsData[s].forEach(op => {
                const def = openingDefs[op.type];
                if (!def) return;
                const opW = op.w || def.w;
                const opH = op.h || def.h;
                
                let xPos = op.x;
                if (s === 'B') xPos = -op.x; 
                
                const xPercent = (xPos + wallLength / 2) / wallLength,
                      yPercent = op.yOff !== undefined ? op.yOff : def.yOff,
                      wPercent = opW / wallLength,
                      hPercent = opH / H;
                      
                ctx.fillRect(
                    (xPercent - wPercent / 2) * c.width, 
                    c.height - ((yPercent + hPercent) * c.height), 
                    wPercent * c.width, 
                    hPercent * c.height
                );
            });
        }
        
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true; 
        
        const mats = getWallMaterials(s);
        if (mats) {
            [mats.mMat, mats.wMat, mats.intMat].forEach(m => {
                if (!m) return;
                m.alphaMap = tex;
                m.alphaTest = 0.05; 
                m.transparent = true;
                m.depthWrite = true; 
                m.needsUpdate = true;
            });
        }
    });
}

export function buildMainStructure(W, L, H, Slope, roofType) {
    const structGroup = new THREE.Group();
    const thickness = 0.25;
    const dMin = 0.3;
    const dMax = 0.8;
    
    const dynamicBayStep = L > 60 ? 15 : (L > 30 ? 8 : 5);
    const numBays = Math.ceil(L / dynamicBayStep);
    const actStep = (L - thickness) / numBays;
    const ang = Math.atan(Slope);

    const isG = roofType === 'gabled';
    const isLSloped = roofType === 'left-sloped';
    const isRSloped = roofType === 'right-sloped';
    const isSingle = roofType === 'single';

    let leftH = H;
    let rightH = H;

    if (isSingle || isLSloped) {
        leftH = H;
        rightH = H + W * Slope;
    } else if (isRSloped) {
        leftH = H + W * Slope;
        rightH = H;
    }

    const createTaperedColumn = (h, dBot, dTop) => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.lineTo(dBot, 0);
        s.lineTo(dTop, h);
        s.lineTo(0, h);
        s.lineTo(0, 0);
        const geo = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
        geo.translate(0, 0, -thickness / 2);
        return geo;
    };
    
    const createTaperedRafter = (len, dStart, dEnd) => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.lineTo(len, 0);
        s.lineTo(len, -dEnd);
        s.lineTo(0, -dStart);
        s.lineTo(0, 0);
        const geo = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false });
        geo.translate(0, 0, -thickness / 2);
        return geo;
    };

    const lColGeo = createTaperedColumn(leftH, dMin, (isG || isSingle || isLSloped) ? dMax : dMin);
    const rColGeo = createTaperedColumn(rightH, dMin, (isG || isRSloped) ? dMax : dMin);
    
    const rLenGabled = Math.sqrt(Math.pow(W / 2, 2) + Math.pow((W / 2) * Slope, 2));
    const rLenSingle = Math.sqrt(Math.pow(W, 2) + Math.pow(W * Slope, 2));

    const isLinerEnabled = document.getElementById('intWallsEn')?.checked || false;
    const linerOffset = isLinerEnabled ? 0.32 : 0.0;

    for (let i = 0; i <= numBays; i++) {
        const z = -L / 2 + thickness / 2 + i * actStep;
        
        const lCol = new THREE.Mesh(lColGeo, steelMat);
        lCol.position.set(-W / 2 + linerOffset, 0, z);
        lCol.castShadow = true;
        lCol.receiveShadow = true;
        structGroup.add(lCol);
        
        const rCol = new THREE.Mesh(rColGeo, steelMat);
        rCol.position.set(W / 2 - linerOffset, 0, z);
        rCol.scale.set(-1, 1, 1);
        rCol.castShadow = true;
        rCol.receiveShadow = true;
        structGroup.add(rCol);
        
        if (isG) {
            const rafterGeo = createTaperedRafter(rLenGabled, dMax, dMin);
            const lRafter = new THREE.Mesh(rafterGeo, steelMat);
            lRafter.position.set(-W / 2, H, z);
            lRafter.rotation.z = ang;
            lRafter.castShadow = true;
            lRafter.receiveShadow = true;
            structGroup.add(lRafter);
            
            const rRafter = new THREE.Mesh(rafterGeo, steelMat);
            rRafter.position.set(W / 2, H, z);
            rRafter.scale.set(-1, 1, 1);
            rRafter.rotation.z = -ang;
            rRafter.castShadow = true;
            rRafter.receiveShadow = true;
            structGroup.add(rRafter);
        } else if (isRSloped) {
            const rafterGeo = createTaperedRafter(rLenSingle, dMax, dMin);
            const rafter = new THREE.Mesh(rafterGeo, steelMat);
            rafter.position.set(-W / 2, H + W * Slope, z);
            rafter.rotation.z = -ang;
            rafter.castShadow = true;
            rafter.receiveShadow = true;
            structGroup.add(rafter);
        } else {
            const rafterGeo = createTaperedRafter(rLenSingle, dMax, dMin);
            const rafter = new THREE.Mesh(rafterGeo, steelMat);
            rafter.position.set(-W / 2, H, z);
            rafter.rotation.z = ang;
            rafter.castShadow = true;
            rafter.receiveShadow = true;
            structGroup.add(rafter);
        }
    }

    const ewThickness = 0.2;
    const dynamicEwStep = W > 60 ? 15 : (W > 30 ? 8 : 5);
    const numEwBays = Math.ceil(W / dynamicEwStep);
    const actEwStep = W / numEwBays;

    const checkEWColumns = document.getElementById('checkEWColumns');
    if (!checkEWColumns || checkEWColumns.checked) {
        for (let z of [-L / 2 + thickness / 2, L / 2 - thickness / 2]) {
            const side = z > 0 ? 'F' : 'B';
            for (let i = 1; i < numEwBays; i++) {
                const x = -W / 2 + i * actEwStep;
                let intersects = false;
                const localX = side === 'F' ? -x : x;
                
                if (openingsData[side]) {
                    openingsData[side].forEach(op => {
                        const def = openingDefs[op.type];
                        if (!def) return;
                        const opW = op.w || def.w;
                        if (localX + ewThickness / 2 > op.x - opW / 2 - 0.1 && localX - ewThickness / 2 < op.x + opW / 2 + 0.1) {
                            intersects = true;
                        }
                    });
                }

                if (!intersects) {
                    let cY = H;
                    if (isG) {
                        cY = x < 0 ? H + (x + W / 2) * Slope : H + (W / 2 - x) * Slope;
                    } else if (isRSloped) {
                        cY = H + (W / 2 - x) * Slope;
                    } else {
                        cY = H + (x + W / 2) * Slope;
                    }
                    const distFromEave = isG ? (x < 0 ? x + W / 2 : W / 2 - x) : (isRSloped ? W / 2 - x : x + W / 2);
                    const ratio = distFromEave / (isG ? W / 2 : W);
                    const localDepth = dMax - ratio * (dMax - dMin);
                    const verticalDepth = localDepth / Math.cos(ang);
                    const ewCol = createBox(ewThickness, cY - verticalDepth, ewThickness, steelMat, x, (cY - verticalDepth) / 2, z);
                    ewCol.castShadow = true;
                    ewCol.receiveShadow = true;
                    structGroup.add(ewCol);
                }
            }
        }
    }

    const girtThickness = 0.15;
    const dynamicGirtStep = H > 8 ? 3.0 : 1.5;
    const numGirts = Math.floor(H / dynamicGirtStep);

    function getWallCutouts(side, y, thickness) {
        const cutouts = [];
        if (!openingsData[side]) return cutouts;
        openingsData[side].forEach(op => {
            const def = openingDefs[op.type];
            if (!def) return;
            const opW = op.w || def.w;
            const opH = op.h || def.h;
            const opMinY = op.yOff !== undefined ? op.yOff : def.yOff;
            const opMaxY = opMinY + opH;
            if (y + thickness / 2 > opMinY && y - thickness / 2 < opMaxY) {
                cutouts.push({
                    min: op.x - opW / 2 - 0.1,
                    max: op.x + opW / 2 + 0.1
                });
            }
        });
        cutouts.sort((a, b) => a.min - b.min);
        const merged = [];
        for (const c of cutouts) {
            if (merged.length === 0) merged.push(c);
            else {
                const last = merged[merged.length - 1];
                if (c.min <= last.max) last.max = Math.max(last.max, c.max);
                else merged.push(c);
            }
        }
        return merged;
    }

    function createSegmentedGirt(side, wallLen, y, thick) {
        const grp = new THREE.Group();
        const cutouts = getWallCutouts(side, y, thick);
        let current = -wallLen / 2;
        const isFB = side === 'F' || side === 'B';

        const addSegment = (min, max) => {
            if (max - min < 0.01) return;
            const len = max - min;
            const center = min + len / 2;
            let gx = 0, gz = 0;
            if (side === 'R') { gx = W / 2 - thick / 2; gz = center; }
            if (side === 'L') { gx = -W / 2 + thick / 2; gz = -center; }
            if (side === 'F') { gx = -center; gz = L / 2 - thick / 2; }
            if (side === 'B') { gx = center; gz = -L / 2 + thick / 2; }
            const box = createBox(isFB ? len : thick, thick, isFB ? thick : len, steelMat, gx, y, gz);
            box.castShadow = true;
            box.receiveShadow = true;
            grp.add(box);
        };

        cutouts.forEach(cut => {
            addSegment(current, cut.min);
            current = Math.max(current, cut.max);
        });
        addSegment(current, wallLen / 2);
        return grp;
    }

    const checkGirts = document.getElementById('checkGirts');
    if (!checkGirts || checkGirts.checked) {
        for (let i = 1; i <= numGirts; i++) {
            const y = i * dynamicGirtStep;
            structGroup.add(createSegmentedGirt('L', L - thickness, y, girtThickness));
            structGroup.add(createSegmentedGirt('R', L - thickness, y, girtThickness));
            structGroup.add(createSegmentedGirt('F', W - thickness * 2, y, girtThickness));
            structGroup.add(createSegmentedGirt('B', W - thickness * 2, y, girtThickness));
        }
    }

    const roofSpan = isG ? rLenGabled : rLenSingle;
    const dynamicPurlinStep = roofSpan > 15 ? 4.5 : 1.5;
    const numPurlins = Math.floor(roofSpan / dynamicPurlinStep);

    const checkPurlins = document.getElementById('checkPurlins');
    if (!checkPurlins || checkPurlins.checked) {
        for (let i = 1; i <= numPurlins; i++) {
            const dist = i * dynamicPurlinStep;
            const normalY = Math.cos(ang) * (girtThickness / 2);
            const normalX = -Math.sin(ang) * (girtThickness / 2);
            if (isG) {
                const lPurlin = createBox(girtThickness, girtThickness, L - thickness, steelMat, -W / 2 + dist * Math.cos(ang) + normalX, H + dist * Math.sin(ang) + normalY, 0);
                lPurlin.rotation.z = ang;
                lPurlin.castShadow = true;
                lPurlin.receiveShadow = true;
                structGroup.add(lPurlin);
                
                const rPurlin = createBox(girtThickness, girtThickness, L - thickness, steelMat, W / 2 - dist * Math.cos(ang) - normalX, H + dist * Math.sin(ang) + normalY, 0);
                rPurlin.rotation.z = -ang;
                rPurlin.castShadow = true;
                rPurlin.receiveShadow = true;
                structGroup.add(rPurlin);
            } else if (isRSloped) {
                const purlin = createBox(girtThickness, girtThickness, L - thickness, steelMat, W / 2 - dist * Math.cos(ang) - normalX, H + dist * Math.sin(ang) + normalY, 0);
                purlin.rotation.z = -ang;
                purlin.castShadow = true;
                purlin.receiveShadow = true;
                structGroup.add(purlin);
            } else {
                const purlin = createBox(girtThickness, girtThickness, L - thickness, steelMat, -W / 2 + dist * Math.cos(ang) + normalX, H + dist * Math.sin(ang) + normalY, 0);
                purlin.rotation.z = ang;
                purlin.castShadow = true;
                purlin.receiveShadow = true;
                structGroup.add(purlin);
            }
        }
        
        if (isG) {
            const apexY = H + (W / 2) * Slope;
            const apexBox = createBox(girtThickness, girtThickness, L - thickness, steelMat, 0, apexY + girtThickness / 2, 0);
            apexBox.castShadow = true;
            apexBox.receiveShadow = true;
            structGroup.add(apexBox);
        }
    }

    const addFraming = (side) => {
        const isFB = side === 'F' || side === 'B';
        const thick = girtThickness;
        if (!openingsData[side]) return;
        
        openingsData[side].forEach(op => {
            const def = openingDefs[op.type];
            if (!def) return;
            const w = op.w || def.w;
            const h = op.h || def.h;
            const yOff = op.yOff !== undefined ? op.yOff : def.yOff;

            let gx = 0, gz = 0;
            if (side === 'R') { gx = W / 2 - thick / 2; gz = op.x; }
            if (side === 'L') { gx = -W / 2 + thick / 2; gz = -op.x; }
            if (side === 'F') { gx = -op.x; gz = L / 2 - thick / 2; }
            if (side === 'B') { gx = op.x; gz = -L / 2 + thick / 2; }

            const hY = yOff + h + thick / 2;
            const topFrame = createBox(isFB ? w + thick * 2 : thick, thick, isFB ? thick : w + thick * 2, steelMat, gx, hY, gz);
            topFrame.castShadow = true;
            topFrame.receiveShadow = true;
            structGroup.add(topFrame);

            if (yOff > 0) {
                const sY = yOff - thick / 2;
                const botFrame = createBox(isFB ? w + thick * 2 : thick, thick, isFB ? thick : w + thick * 2, steelMat, gx, sY, gz);
                botFrame.castShadow = true;
                botFrame.receiveShadow = true;
                structGroup.add(botFrame);
            }

            let jambH = H;
            if (side === 'F' || side === 'B') {
                const x = gx;
                if (isG) jambH = x < 0 ? H + (x + W / 2) * Slope : H + (W / 2 - x) * Slope;
                else if (isRSloped) jambH = H + (W / 2 - x) * Slope;
                else jambH = H + (x + W / 2) * Slope;
            } else if (side === 'R' && (isSingle || isLSloped)) {
                jambH = H + W * Slope;
            } else if (side === 'L' && isRSloped) {
                jambH = H + W * Slope;
            }

            const jLeftGz = side === 'R' ? gz - w / 2 - thick / 2 : side === 'L' ? gz + w / 2 + thick / 2 : gz;
            const jRightGz = side === 'R' ? gz + w / 2 + thick / 2 : side === 'L' ? gz - w / 2 - thick / 2 : gz;
            const jLeftGx = side === 'F' ? gx + w / 2 + thick / 2 : side === 'B' ? gx - w / 2 - thick / 2 : gx;
            const jRightGx = side === 'F' ? gx - w / 2 - thick / 2 : side === 'B' ? gx + w / 2 + thick / 2 : gx;

            const leftJamb = createBox(thick, jambH, thick, steelMat, jLeftGx, jambH / 2, jLeftGz);
            const rightJamb = createBox(thick, jambH, thick, steelMat, jRightGx, jambH / 2, jRightGz);
            
            leftJamb.castShadow = true; leftJamb.receiveShadow = true;
            rightJamb.castShadow = true; rightJamb.receiveShadow = true;
            
            structGroup.add(leftJamb);
            structGroup.add(rightJamb);
        });
    };

    addFraming('L');
    addFraming('R');
    addFraming('F');
    addFraming('B');

    return structGroup;
}

export function updateBuilding() {
    const spinnerEl = document.getElementById('configurator-spinner');
    
    if (!isFirstLoadComplete && spinnerEl) {
        spinnerEl.style.display = 'flex';
    }

    updateMaterialColors(); 

    mainGroup.clear();
    hitboxes.length = 0;
    referenceModels.length = 0; 
    
    for (const key in dragPlanesMap) {
        delete dragPlanesMap[key];
    }
    
    const inputW = document.getElementById('inputW');
    const inputL = document.getElementById('inputL');
    const inputH = document.getElementById('inputH');
    const inputPitch = document.getElementById('inputPitch');
    const roofTypeSelect = document.getElementById('roofType');

    if (!inputW || !inputL || !inputH || !inputPitch || !roofTypeSelect) return;

    const W = parseFloat(inputW.getAttribute('data-current-m')),
          L = parseFloat(inputL.getAttribute('data-current-m')),
          H = Math.min(parseFloat(inputH.getAttribute('data-current-m')), 12.192), 
          Slope = parseFloat(inputPitch.value),
          roofType = roofTypeSelect.value,
          isG = roofType === 'gabled',
          isLSloped = roofType === 'left-sloped',
          isRSloped = roofType === 'right-sloped';

    const overL = document.getElementById('overL');
    const overR = document.getElementById('overR');
    const overF = document.getElementById('overF');
    const overB = document.getElementById('overB');

    const oL = overL ? Math.min(parseFloat(overL.getAttribute('data-current-m')), 1.524) : 0;
    const oR = overR ? Math.min(parseFloat(overR.getAttribute('data-current-m')), 1.524) : 0;
    const oF = overF ? Math.min(parseFloat(overF.getAttribute('data-current-m')), 1.524) : 0;
    const oB = overB ? Math.min(parseFloat(overB.getAttribute('data-current-m')), 1.524) : 0;

    const wainscotEn = document.getElementById('wainscotEn');
    const wsEnabled = wainscotEn ? wainscotEn.checked : false;
    const inputWSHeight = document.getElementById('inputWSHeight');
    const wsHeightInput = (wsEnabled && inputWSHeight) ? Math.min(parseFloat(inputWSHeight.getAttribute('data-current-m')), H) : 0;

    const wallOffset = 0.03;
    const wallThick = 0.05;
    const wallOut = wallOffset + wallThick;
    
    let minX = -W / 2 - wallOut,
        maxX = W / 2 + wallOut,
        minZ = -L / 2 - wallOut,
        maxZ = L / 2 + wallOut;
        
    if (ltState.L?.active) minX -= ltState.L.depth;
    if (ltState.R?.active) maxX += ltState.R.depth;
    if (ltState.F?.active) maxZ += ltState.F.depth;
    if (ltState.B?.active) minZ -= ltState.B.depth;
        
    const slab = new THREE.Mesh(new THREE.BoxGeometry((maxX - minX), 0.4, (maxZ - minZ)), concreteMat);
    slab.position.set((maxX + minX) / 2, -0.2, (maxZ + minZ) / 2);
    slab.receiveShadow = true;
    mainGroup.add(slab);

    const RY = (isG) ? H + (W / 2) * Slope : H + W * Slope;
    const ang = Math.atan(Slope);

    const wOX = W / 2 + wallOffset;
    const wOZ = L / 2 + wallOffset;
    const extL = L + wallOffset * 2 + wallThick * 2;
    const extW = W + wallOffset * 2 + wallThick * 2;
    const rLift = 0.55;

    const roofProfileSelect = document.getElementById('roofProfile');
    const wallProfileSelect = document.getElementById('wallProfile');
    const roofProfile = roofProfileSelect ? roofProfileSelect.value : '936';
    const wallProfile = wallProfileSelect ? wallProfileSelect.value : '936';
    const roofCfg = profileGeoConfigs[roofProfile] || null;
    const wallCfg = profileGeoConfigs[wallProfile] || null;

    updateBuildingAlphaMaps();

    const checkStructure = document.getElementById('checkStructure');
    if (!checkStructure || checkStructure.checked) {
        mainGroup.add(buildMainStructure(W, L, H, Slope, roofType));
    }

    const offsetIn = 0.3;

    const intWallsEn = document.getElementById('intWallsEn');
    if (intWallsEn && intWallsEn.checked) {
        const intWallsH = document.getElementById('intWallsH');
        const intH = H * (intWallsH ? (parseFloat(intWallsH.value) / 100) : 1);
        const linerProfileCfg = profileGeoConfigs['936'] || wallCfg;

        const addIntW = (side, w, h, pos, rot) => {
            const checkSide = document.getElementById('w' + side);
            if (!checkSide || !checkSide.checked) return;

            const g = new THREE.Group();
            const mats = getWallMaterials(side);
            if (!mats) return;

            const clonedMat = mats.intMat.clone(); 
            
            // Настройка UV в геометрии избавила нас от необходимости принудительного вращения текстурных карт
            if (clonedMat.map) {
                clonedMat.map.rotation = 0;
                clonedMat.map.needsUpdate = true;
            }
            if (clonedMat.normalMap) {
                clonedMat.normalMap.rotation = 0;
                clonedMat.normalMap.needsUpdate = true;
            }

            const mM = new THREE.Mesh(createRibbedGeo(w, h, H, 0, linerProfileCfg), clonedMat);

            mM.geometry = mM.geometry.toNonIndexed();
            mM.geometry.computeVertexNormals();

            mM.material.polygonOffset = true;
            mM.material.polygonOffsetFactor = 1; 
            mM.material.polygonOffsetUnits = 1;

            mM.castShadow = true;
            mM.receiveShadow = true;
            g.add(mM);
            g.children.forEach(m => m.geometry.translate(0, 0, -w / 2));
            g.position.copy(pos);
            g.rotation.set(rot.x, rot.y, rot.z);
            mainGroup.add(g);
        };
        addIntW('L', L - offsetIn * 2, intH, new THREE.Vector3(-W / 2 + offsetIn, 0, 0), { x: 0, y: Math.PI, z: 0 });
        addIntW('R', L - offsetIn * 2, intH, new THREE.Vector3(W / 2 - offsetIn, 0, 0), { x: 0, y: 0, z: 0 });
        addIntW('F', W - offsetIn * 2, intH, new THREE.Vector3(0, 0, L / 2 - offsetIn), { x: 0, y: -Math.PI / 2, z: 0 });
        addIntW('B', W - offsetIn * 2, intH, new THREE.Vector3(0, 0, -L / 2 + offsetIn), { x: 0, y: Math.PI / 2, z: 0 });
    }

    const checkCeil = document.getElementById('ceilEn');
    if (checkCeil && checkCeil.checked) {
        const verticalOffset = 1.15; 
        ceilingMat.side = THREE.DoubleSide;
        ceilingMat.shadowSide = THREE.DoubleSide;

        const cRS = (iR) => {
            if (isG) {
                const cW_half = W / 2;
                const cLen = Math.sqrt(Math.pow(cW_half, 2) + Math.pow(cW_half * Slope, 2));
                const slopeMesh = new THREE.Mesh(new THREE.PlaneGeometry(cLen, L), ceilingMat);
                slopeMesh.castShadow = true; slopeMesh.receiveShadow = true;
                slopeMesh.rotation.x = -Math.PI / 2;

                if (iR) {
                    slopeMesh.position.set(cW_half / 2, RY - verticalOffset - (cW_half / 2 * Slope), 0);
                    slopeMesh.rotation.y = -ang;
                } else {
                    slopeMesh.position.set(-cW_half / 2, RY - verticalOffset - (cW_half / 2 * Slope), 0);
                    slopeMesh.rotation.y = ang;
                }
                mainGroup.add(slopeMesh);
            } else {
                if (!iR) {
                    const cLenS = Math.sqrt(Math.pow(W, 2) + Math.pow(W * Slope, 2));
                    const slopeS = new THREE.Mesh(new THREE.PlaneGeometry(cLenS, L), ceilingMat);
                    slopeS.castShadow = true; slopeS.receiveShadow = true;
                    slopeS.rotation.x = -Math.PI / 2;
                    
                    if (isRSloped) {
                        slopeS.position.set(0, H + (W * Slope / 2) - verticalOffset, 0);
                        slopeS.rotation.y = -ang;
                    } else {
                        slopeS.position.set(0, H + (W * Slope / 2) - verticalOffset, 0);
                        slopeS.rotation.y = ang;
                    }
                    mainGroup.add(slopeS);
                }
            }
        };
        cRS(false);
        if (isG) cRS(true);
    }

    const addW = (side, w, h, pos, rot, iE, sWs) => {
        const checkWallElement = document.getElementById('w' + side);
        if (checkWallElement && !checkWallElement.checked) return;
        
        const g = new THREE.Group();
        let wsH = sWs ? Math.min(wsHeightInput, h) : 0;
        const mats = getWallMaterials(side);
        if (!mats) return;
        
        const currentWallMat = mats.mMat.clone();
        const currentWainscotMat = mats.wMat.clone();
        
        if (currentWainscotMat.map) {
            currentWainscotMat.map.rotation = 0;
            currentWainscotMat.map.needsUpdate = true;
        }
        if (currentWainscotMat.normalMap) {
            currentWainscotMat.normalMap.rotation = 0;
            currentWainscotMat.normalMap.needsUpdate = true;
        }

        if (wsH > 0) {
            const mWS = new THREE.Mesh(createRibbedGeo(w, wsH, H, 0, wallCfg), currentWainscotMat);
            mWS.geometry = mWS.geometry.toNonIndexed();
            mWS.geometry.computeVertexNormals();
            mWS.castShadow = true; mWS.receiveShadow = false; 
            g.add(mWS);
        }
        
        let clip = [];
        if (isG) {
            clip = [
                new THREE.Plane(new THREE.Vector3(Math.sin(ang), -Math.cos(ang), 0).normalize(), - (new THREE.Vector3(0, RY + rLift, 0)).dot(new THREE.Vector3(Math.sin(ang), -Math.cos(ang), 0).normalize())), 
                new THREE.Plane(new THREE.Vector3(-Math.sin(ang), -Math.cos(ang), 0).normalize(), - (new THREE.Vector3(0, RY + rLift, 0)).dot(new THREE.Vector3(-Math.sin(ang), -Math.cos(ang), 0).normalize()))
            ];
        } else if (isRSloped) {
            const clipNormal = new THREE.Vector3(-Math.sin(ang), -Math.cos(ang), 0).normalize();
            const clipPoint = new THREE.Vector3(-W / 2, H + W * Slope + rLift, 0);
            clip = [
                new THREE.Plane(clipNormal, -clipPoint.dot(clipNormal))
            ];
        } else {
            clip = [
                new THREE.Plane(new THREE.Vector3(Math.sin(ang), -Math.cos(ang), 0).normalize(), - (new THREE.Vector3(-W / 2, H + rLift, 0)).dot(new THREE.Vector3(Math.sin(ang), -Math.cos(ang), 0).normalize()))
            ];
        }

        if (side === 'B') {
            clip.forEach(plane => { plane.normal.z *= -1; });
        }
        
        currentWallMat.clippingPlanes = iE ? clip : [];

		if (currentWallMat.map) {
            currentWallMat.map.center.set(0.5, 0.5);
            //currentWallMat.map.rotation = 0; 
            currentWallMat.map.needsUpdate = true;
        }
        if (currentWallMat.normalMap) {
            currentWallMat.normalMap.center.set(0.5, 0.5);
            currentWallMat.normalMap.rotation = 0; 
            currentWallMat.normalMap.needsUpdate = true;
        }

        if (h - wsH > 0) {
            const mM = new THREE.Mesh(createRibbedGeo(w, h - wsH + (iE ? 2 : 0), H, wsH, wallCfg), currentWallMat);
            mM.geometry = mM.geometry.toNonIndexed();
            mM.geometry.computeVertexNormals();
            mM.position.y = wsH;
            mM.castShadow = false; mM.receiveShadow = false;
            g.add(mM);
        }
        
        g.children.forEach(m => m.geometry.translate(0, 0, -w / 2));
        g.position.copy(pos);
        g.rotation.set(rot.x, rot.y, rot.z);
        
        if (openingsData[side]) {
            openingsData[side].forEach(op => {
                const def = openingDefs[op.type];
                if (!def) return;
                const opH = op.h || def.h;
                const currentYOff = op.yOff !== undefined ? op.yOff : def.yOff;
                
                const opObj = buildOpeningMesh(op);
                opObj.mesh.position.set(0.05, currentYOff + opH / 2, op.x);
                opObj.mesh.rotation.y = Math.PI / 2;
                
                opObj.mesh.traverse(child => {
                    if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; }
                });

                opObj.hit.userData = { isOpening: true, side: side, opData: op, meshGroup: opObj.mesh, wallLength: w };
                hitboxes.push(opObj.hit);
                g.add(opObj.mesh);
            });
        }
        
        g.updateMatrixWorld();
        mainGroup.add(g);
        
        dragPlanesMap[side] = {
            mathPlane: new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0).applyEuler(g.rotation).normalize(), g.position),
            inverseMatrix: g.matrixWorld.clone().invert()
        };
    };
    
    addW('L', extL, H + 0.25, new THREE.Vector3(-wOX, 0, 0), { x: 0, y: Math.PI, z: 0 }, false, true);
    addW('R', extL, (isG || isRSloped) ? H + 0.25 : RY + 0.25, new THREE.Vector3(wOX, 0, 0), { x: 0, y: 0, z: 0 }, false, true);
    addW('F', extW, RY + 0.55, new THREE.Vector3(0, 0, wOZ), { x: 0, y: -Math.PI / 2, z: 0 }, true, true);
    addW('B', extW, RY + 0.55, new THREE.Vector3(0, 0, -wOZ), { x: 0, y: Math.PI / 2, z: 0 }, true, true);

    const bA = (s, c) => {
        if (!c || !c.active) return;
        const isFB = (s === 'F' || s === 'B'), bL = isFB ? W : L;
        let aW = bL - c.cutL - c.cutR;
        if (aW <= 0) return;
        
        const sY = H - c.drop, pA = Math.atan(c.pitch / 12), cx = (c.cutL - c.cutR) / 2, hPost = sY - (c.depth * Math.tan(pA));
        const g = new THREE.Group();
        
        if (s === 'F') { g.position.set(cx, sY, wOZ); g.rotation.y = -Math.PI / 2; } 
        else if (s === 'B') { g.position.set(cx, sY, -wOZ); g.rotation.y = Math.PI / 2; } 
        else if (s === 'R') { g.position.set(wOX, sY, cx); g.rotation.y = 0; } 
        else if (s === 'L') { g.position.set(-wOX, sY, cx); g.rotation.y = Math.PI; }
        
        g.updateMatrixWorld();
        const clipPlane = new THREE.Plane(new THREE.Vector3(-Math.sin(pA), -Math.cos(pA), 0).normalize(), 0);
        clipPlane.applyMatrix4(g.matrixWorld);

        let oDrop = 0, oMinus = 0, oPlus = 0;
        if (s === 'L') { oDrop = oL; oMinus = (c.cutR === 0 ? oF : 0); oPlus = (c.cutL === 0 ? oB : 0); }
        if (s === 'R') { oDrop = oR; oMinus = (c.cutL === 0 ? oB : 0); oPlus = (c.cutR === 0 ? oF : 0); }
        if (s === 'F') { oDrop = oF; oMinus = (c.cutL === 0 ? oL : 0); oPlus = (c.cutR === 0 ? oR : 0); }
        if (s === 'B') { oDrop = oB; oMinus = (c.cutR === 0 ? oR : 0); oPlus = (c.cutL === 0 ? oL : 0); }

        const rL_OH = (c.depth + oDrop) / Math.cos(pA);
        const aW_OH = aW + oMinus + oPlus;
        const rG = createRoofGeo(rL_OH, aW_OH, 0.1, roofCfg);
        rG.translate(0, 0, -aW_OH / 2);
        
        const mesh = new THREE.Mesh(rG, roofMat);
        mesh.rotation.z = -pA;
        mesh.position.z = (oPlus - oMinus) / 2;
        mesh.castShadow = true; mesh.receiveShadow = true;
        g.add(mesh);

        if (c.wallF) {
            const wallGrp = new THREE.Group();
            let curWsH = wsEnabled ? Math.min(wsHeightInput, hPost) : 0;
            
            const leanWallMat = wallMat.clone();
            const leanWainscotMat = wainscotMat.clone();

            if (leanWainscotMat.map) leanWainscotMat.map.rotation = 0;
            if (leanWallMat.map) leanWallMat.map.rotation = 0;

            if (hPost > curWsH && curWsH > 0) {
                const mWS = new THREE.Mesh(createRibbedGeo(aW, curWsH, hPost, 0, wallCfg), leanWainscotMat);
                mWS.geometry = mWS.geometry.toNonIndexed();
                mWS.geometry.computeVertexNormals();
                mWS.geometry.translate(0, 0, -aW / 2);
                mWS.castShadow = true; mWS.receiveShadow = true;
                wallGrp.add(mWS);
                
                const mW = new THREE.Mesh(createRibbedGeo(aW, hPost - curWsH - 0.02, hPost, curWsH, wallCfg), leanWallMat);
                mW.geometry = mW.geometry.toNonIndexed();
                mW.geometry.computeVertexNormals();
                mW.geometry.translate(0, 0, -aW / 2);
                mW.position.y = curWsH;
                mW.castShadow = true; mW.receiveShadow = true;
                wallGrp.add(mW);
            } else {
                const mW = new THREE.Mesh(createRibbedGeo(aW, hPost - 0.02, hPost, 0, wallCfg), leanWallMat);
                mW.geometry = mW.geometry.toNonIndexed();
                mW.geometry.computeVertexNormals();
                mW.geometry.translate(0, 0, -aW / 2);
                mW.castShadow = true; mW.receiveShadow = true;
                wallGrp.add(mW);
            }
            wallGrp.position.set(c.depth, -sY, 0);
            g.add(wallGrp);
        }
        
        const createSideWall = (isLeft) => {
            const sideGrp = new THREE.Group();
            let curWsH = wsEnabled ? Math.min(wsHeightInput, sY) : 0;
            const wallMatClipped = wallMat.clone();
            wallMatClipped.clippingPlanes = [clipPlane];
            const wainscotMatClipped = wainscotMat.clone();
            wainscotMatClipped.clippingPlanes = [clipPlane];
            
            if (wainscotMatClipped.map) wainscotMatClipped.map.rotation = 0;
            if (wallMatClipped.map) wallMatClipped.map.rotation = 0;

            if (sY > curWsH && curWsH > 0) {
                const mWS = new THREE.Mesh(createRibbedGeo(c.depth, curWsH, sY, 0, wallCfg), wainscotMatClipped);
                mWS.geometry = mWS.geometry.toNonIndexed();
                mWS.geometry.computeVertexNormals();
                
                const mW = new THREE.Mesh(createRibbedGeo(c.depth, sY - curWsH + 0.1, sY, curWsH, wallCfg), wallMatClipped);
                mW.geometry = mW.geometry.toNonIndexed();
                mW.geometry.computeVertexNormals();
                
                mW.position.y = curWsH;
                mWS.castShadow = true; mWS.receiveShadow = true;
                mW.castShadow = true; mW.receiveShadow = true;
                sideGrp.add(mWS);
                sideGrp.add(mW);
            } else {
                const mW = new THREE.Mesh(createRibbedGeo(c.depth, sY + 0.1, sY, 0, wallCfg), wallMatClipped);
                mW.geometry = mW.geometry.toNonIndexed();
                mW.geometry.computeVertexNormals();
                
                mW.castShadow = true; mW.receiveShadow = true;
                sideGrp.add(mW);
            }
            if (isLeft) {
                sideGrp.rotation.y = Math.PI / 2;
                sideGrp.position.set(0, -sY, -aW / 2);
            } else {
                sideGrp.rotation.y = -Math.PI / 2;
                sideGrp.position.set(c.depth, -sY, aW / 2);
            }
            g.add(sideGrp);
        };
        
        if (c.wallL) createSideWall(true);
        if (c.wallR) createSideWall(false);
        
        const colSize = 0.2, colHeight = hPost - 0.01;
        if (colHeight > 0) {
            const colGeo = new THREE.BoxGeometry(colSize, colHeight, colSize);
            const col1 = new THREE.Mesh(colGeo, trimMat), col2 = new THREE.Mesh(colGeo, trimMat);
            const localY = -sY + colHeight / 2, localX = c.depth - colSize / 2;
            col1.position.set(localX, localY, -aW / 2 + colSize / 2);
            col2.position.set(localX, localY, aW / 2 - colSize / 2);
            col1.castShadow = true; col1.receiveShadow = true;
            col2.castShadow = true; col2.receiveShadow = true;
            g.add(col1);
            g.add(col2);
        }
        mainGroup.add(g);
    };

    bA('L', ltState.L); bA('R', ltState.R); bA('F', ltState.F); bA('B', ltState.B);

    const eff_oL = oL + wallOut, eff_oR = oR + wallOut, eff_oF = oF + wallOut, eff_oB = oB + wallOut;
    const roofL = L + eff_oF + eff_oB;
    const roofZ = (eff_oF - eff_oB) / 2;
    const halfRoofL = roofL / 2;

    const checkRoof = document.getElementById('checkRoof');
    if (!checkRoof || checkRoof.checked) {
        const cRS = (iR) => {
            const eff_oH = iR ? eff_oR : eff_oL;
            const horizontalSpan = isG ? (W / 2 + eff_oH) : (W + eff_oL + eff_oR);
            const rLen = Math.sqrt(Math.pow(horizontalSpan, 2) + Math.pow(horizontalSpan * Slope, 2));
            const slope = new THREE.Mesh(createRoofGeo(rLen, roofL, 0.1, roofCfg), roofMat);
            slope.castShadow = true; slope.receiveShadow = true;
            if (isG) {
                if (iR) {
                    slope.position.set(0, RY + 0.55, roofZ - roofL / 2);
                    slope.rotation.set(0, 0, -ang);
                } else {
                    slope.position.set(0, RY + 0.55, roofZ + roofL / 2);
                    slope.rotation.set(0, Math.PI, -ang);
                }
            } else if (isRSloped) {
                if (!iR) {
                    slope.position.set(-W / 2 - eff_oL, H + 0.55 + W * Slope + eff_oL * Slope, roofZ - halfRoofL);
                    slope.rotation.set(0, 0, -ang);
                }
            } else {
                if (!iR) {
                    slope.position.set(-W / 2 - eff_oL, H + 0.55 - eff_oL * Slope, roofZ - roofL / 2);
                    slope.rotation.set(0, 0, ang);
                }
            }
            mainGroup.add(slope);
        };
        cRS(false);
        if (isG) cRS(true);
    }

    const checkTrims = document.getElementById('checkTrims');
    if (!checkTrims || checkTrims.checked) {
        const tS = 0.15; 
        const ridgeX = 0;
        const eaveLeftX = -W / 2 - eff_oL;
        const eaveRightX = W / 2 + eff_oR;

        [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
            let ch = H + 0.55 - 0.3;
            if (sx > 0 && (roofType === 'single' || isLSloped)) ch = RY + 0.55 - 0.3;
            if (sx < 0 && isRSloped) ch = RY + 0.55 - 0.3;
            
            const t = new THREE.Mesh(new THREE.BoxGeometry(tS, ch, tS), trimMat);
            t.position.set(sx * (wOX + wallThick), ch / 2, sz * (wOZ + wallThick));
            t.castShadow = true; t.receiveShadow = true;
            mainGroup.add(t);
        });

        let actualEaveX_L = 0;
        let actualEaveX_R = 0;

        for (let sX of [-1, 1]) {
            const isRightSide = sX > 0;
            const roofEdgeX = isRightSide ? eaveRightX : eaveLeftX;
            
            let eaveY = H + 0.55;
            if (isG) {
                eaveY = H + 0.55 - (isRightSide ? eff_oR : eff_oL) * Slope; 
            } else if (isRSloped) {
                eaveY = isRightSide ? (H + 0.55 - eff_oR * Slope) : (H + 0.55 + W * Slope + eff_oL * Slope);
            } else {
                eaveY = isRightSide ? (H + 0.55 + W * Slope + eff_oR * Slope) : (H + 0.55 - eff_oL * Slope);
            }
        
            const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(tS, tS, roofL), trimMat);
            const finalEaveX = isRightSide ? (roofEdgeX - tS / 2) : (roofEdgeX + tS / 2);
            
            if (isRightSide) actualEaveX_R = finalEaveX;
            else actualEaveX_L = finalEaveX;
        
            sideTrim.position.set(finalEaveX + 0.5, eaveY - tS + .1, roofZ);
            sideTrim.castShadow = true; sideTrim.receiveShadow = true;
            mainGroup.add(sideTrim);
        }

        for (let sZ of [-1, 1]) {
            const zPos = roofZ + sZ * (halfRoofL + tS / 2);
            const roofTopY = RY + 0.55;

            if (isG) {
                const run_L = Math.abs(ridgeX - (actualEaveX_L - tS / 2));
                const run_R = Math.abs((actualEaveX_R + tS / 2) - ridgeX);

                const rakeLen_L = (run_L / Math.cos(ang)) + 0.45;
                const rakeLen_R = (run_R / Math.cos(ang)) + 0.45;

                const geoL = new THREE.BoxGeometry(rakeLen_L, tS, tS);
                geoL.translate(-rakeLen_L / 2, 0, 0); 
                const rakeL = new THREE.Mesh(geoL, trimMat);
                
                rakeL.position.set(ridgeX, roofTopY - 0.02, zPos); 
                rakeL.rotation.z = ang;
                rakeL.castShadow = true; rakeL.receiveShadow = true;
                mainGroup.add(rakeL);

                const geoR = new THREE.BoxGeometry(rakeLen_R, tS, tS);
                geoR.translate(rakeLen_R / 2, 0, 0); 
                const rakeR = new THREE.Mesh(geoR, trimMat);
                
                rakeR.position.set(ridgeX, roofTopY - 0.02, zPos);
                rakeR.rotation.z = -ang;
                rakeR.castShadow = true; rakeR.receiveShadow = true;
                mainGroup.add(rakeR);

            } else if (isRSloped) {
                const totalSpan = Math.abs((actualEaveX_R + tS / 2) - (actualEaveX_L - tS / 2));
                const len = (totalSpan / Math.cos(ang)) + 1.45;
                
                const geo = new THREE.BoxGeometry(len, tS, tS);
                geo.translate(len / 2, 0, 0); 
                const rake = new THREE.Mesh(geo, trimMat);
                
                rake.position.set(actualEaveX_L - tS / 2, H + 0.55 + W * Slope + eff_oL * Slope - 0.02, zPos);
                rake.rotation.z = -ang;
                rake.castShadow = true; rake.receiveShadow = true;
                mainGroup.add(rake);
            } else {
                const totalSpan = Math.abs((actualEaveX_R + tS / 2) - (actualEaveX_L - tS / 2));
                const len = (totalSpan / Math.cos(ang)) + 0.45;
                
                const geo = new THREE.BoxGeometry(len, tS, tS);
                geo.translate(len / 2, 0, 0); 
                const rake = new THREE.Mesh(geo, trimMat);
                
                rake.position.set(actualEaveX_L - tS / 2, H + 0.55 - eff_oL * Slope - 0.02, zPos);
                rake.rotation.z = ang;
                rake.castShadow = true; rake.receiveShadow = true;
                mainGroup.add(rake);
            }
        }

        const ridgeCapMat = window.ridgeCapMat || trimMat;

        if (isG) {
            const ridgeTrim = new THREE.Mesh(new THREE.BoxGeometry(tS * 1.5, tS / 2, roofL + tS * 2), ridgeCapMat);
            ridgeTrim.position.set(ridgeX, RY + 0.55 + tS / 3, roofZ);
            ridgeTrim.castShadow = true;
            mainGroup.add(ridgeTrim);
        } else {
            const Glen = roofL + tS * 2;
            const peakX = isRSloped ? actualEaveX_L : actualEaveX_R;
            const peakY = isRSloped ? (H + 0.55 + W * Slope + eff_oL * Slope) : (H + 0.55 + W * Slope + eff_oR * Slope);
            
            const peakTrim = new THREE.Mesh(new THREE.BoxGeometry(tS, tS * 1.2, Glen), ridgeCapMat);
            const shiftX = isRSloped ? tS / 2 : -tS / 2;
            peakTrim.position.set(peakX + shiftX, peakY + tS / 4, roofZ);
            peakTrim.castShadow = true;
            mainGroup.add(peakTrim);
        }
    }

    const checkGutters = document.getElementById('checkGutters');
    if ((!checkGutters || checkGutters.checked) && (!checkTrims || checkTrims.checked)) {
        const aGS = (iR) => {
            const eff_oH = iR ? eff_oR : eff_oL, sX = iR ? 1 : -1;
            let gY = H + 0.55 - 0.35;
            
            if (isG) {
                gY = (H + 0.55 - eff_oH * Slope) - 0.35;
            } else if (isRSloped) {
                gY = (iR ? H + 0.55 - eff_oR * Slope : H + 0.55 + W * Slope + eff_oL * Slope) - 0.35;
            } else {
                gY = (iR ? H + 0.55 + W * Slope + eff_oR * Slope : H + 0.55 - eff_oL * Slope) - 0.35;
            }
            
            const gut = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, roofL), trimMat);
            gut.position.set(sX * (W / 2 + eff_oH + 0.15), gY, roofZ);
            gut.castShadow = true; gut.receiveShadow = true;
            mainGroup.add(gut);
            const dsH = gY - 0.1;
            const pX = sX * (wOX + wallThick + 0.05);
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, dsH, 8), trimMat);
            p.position.set(pX, dsH / 2, wOZ - 0.2);
            p.castShadow = true; p.receiveShadow = true;
            mainGroup.add(p);
            const pB = p.clone();
            pB.position.z = -wOZ + 0.2;
            mainGroup.add(pB);
        };
        aGS(false);
        if (isG || roofType === 'single' || isLSloped || isRSloped) aGS(true);
    }

    const checkLabels = document.getElementById('checkLabels');
    if (checkLabels && checkLabels.checked) {
        const off = W / 2 + 8; 
        const addL = document.getElementById('ltEnL')?.checked ? parseFloat(document.getElementById('ltDepthL')?.getAttribute('data-current-m') || 0) : 0;
        
        const lF = createTextLabel("Front"); lF.position.set(0, 0.1, wOZ + off); lF.rotation.set(-Math.PI / 2, 0, 0); mainGroup.add(lF);
        const lB = createTextLabel("Back"); lB.position.set(0, 0.1, -wOZ - off); lB.rotation.set(-Math.PI / 2, 0, Math.PI); mainGroup.add(lB);
        
        const lR = createTextLabel("Right"); lR.position.set(wOX + off, 0.1, 0); lR.rotation.set(-Math.PI / 2, 0, Math.PI / 2); mainGroup.add(lR);
        const lL = createTextLabel("Left"); lL.position.set(-wOX - addL - off, 0.1, 0); lL.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); mainGroup.add(lL);
    }

    const drivewayEn = document.getElementById('drivewayEn');
    if (drivewayEn && drivewayEn.checked) {
        const roadWidth = 6.0, roadLength = 20.0;
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.95 });
        const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.rotation.x = -Math.PI / 2;
        roadMesh.position.y = -0.19;
        roadMesh.receiveShadow = true;

        let attachX = 0, attachZ = wOZ, attachRotY = 0, doorFound = false;
        const doorTypes = ["Walk Door Solid", "Walk Door Solid Double", "Overhead Panel Door", "Bi-Fold Door", "Hydraulic Door"];

        const checkWallForDoor = (sideKey) => {
            if (doorFound || !openingsData[sideKey]) return;
            for (let i = 0; i < openingsData[sideKey].length; i++) {
                const op = openingsData[sideKey][i];
                if (doorTypes.includes(op.type)) {
                    if (sideKey === 'F') { attachX = -op.x; attachZ = wOZ; attachRotY = 0; } 
                    else if (sideKey === 'B') { attachX = op.x; attachZ = -wOZ; attachRotY = Math.PI; } 
                    else if (sideKey === 'L') { attachX = -wOX; attachZ = -op.x; attachRotY = Math.PI / 2; } 
                    else if (sideKey === 'R') { attachX = wOX; attachZ = op.x; attachRotY = -Math.PI / 2; }
                    doorFound = true;
                    break;
                }
            }
        };

        checkWallForDoor('F'); checkWallForDoor('R'); checkWallForDoor('L'); checkWallForDoor('B');

        roadMesh.rotation.z = attachRotY;
        const zOffsetLocal = roadLength / 2;

        if (doorFound) {
            if (attachRotY === 0) roadMesh.position.set(attachX, -0.19, attachZ + zOffsetLocal);
            else if (attachRotY === Math.PI) roadMesh.position.set(attachX, -0.19, attachZ - zOffsetLocal);
            else if (attachRotY === Math.PI / 2) roadMesh.position.set(attachX - zOffsetLocal, -0.19, attachZ);
            else if (attachRotY === -Math.PI / 2) roadMesh.position.set(attachX + zOffsetLocal, -0.19, attachZ);
        } else {
            roadMesh.position.set(0, -0.19, wOZ + zOffsetLocal);
        }
        mainGroup.add(roadMesh);
    }

    const checkMezz = document.getElementById('mezzEn');
    if (checkMezz && checkMezz.checked) {
        const mezzCovInput = document.getElementById('mezzCov');
        const cov = mezzCovInput ? (parseInt(mezzCovInput.value) / 3) : 0.33;
        const mLen = (L - offsetIn * 2) * cov;
        const baseH = H * 0.6, maxH = H - 0.01;
        
        const mezzHInput = document.getElementById('mezzH');
        const sliderVal = mezzHInput ? (parseFloat(mezzHInput.value) / 100) : 0.5;
        const mH = baseH + (maxH - baseH) * sliderVal;
        
        const mezzZInput = document.getElementById('mezzZ');
        const mZPercent = mezzZInput ? (parseFloat(mezzZInput.value) / 100) : 0.5;
        const minZBound = (L / 2 - offsetIn) - mLen / 2, maxZBound = - (L / 2 - offsetIn) + mLen / 2;
        const zPos = minZBound + (maxZBound - minZBound) * mZPercent;
        
        const mSlab = new THREE.Mesh(new THREE.BoxGeometry(W - offsetIn * 2, 0.2, mLen), mezzMat);
        mSlab.position.set(0, mH, zPos);
        mSlab.castShadow = true; mSlab.receiveShadow = true;
        mainGroup.add(mSlab);

        if (cov < 1) {
            const frontEdgeZ = zPos + mLen / 2, backEdgeZ = zPos - mLen / 2;
            const distToFrontWall = Math.abs(frontEdgeZ - (L / 2 - offsetIn));
            const distToBackWall = Math.abs(backEdgeZ - (-L / 2 + offsetIn));
            const colGeo = new THREE.BoxGeometry(0.2, mH, 0.2);
            
            if (distToFrontWall > 0.05) {
                const colF = new THREE.Mesh(colGeo, steelMat);
                colF.position.set(0, mH / 2, frontEdgeZ);
                colF.castShadow = true; colF.receiveShadow = true;
                mainGroup.add(colF);
            }
            if (distToBackWall > 0.05) {
                const colB = new THREE.Mesh(colGeo, steelMat);
                colB.position.set(0, mH / 2, backEdgeZ);
                colB.castShadow = true; colB.receiveShadow = true;
                mainGroup.add(colB);
            }
        }
    }

    const checkCrane = document.getElementById('craneEn');
    if (checkCrane && checkCrane.checked) {
        const craneZInput = document.getElementById('craneZ');
        const cZSlider = craneZInput ? (parseFloat(craneZInput.value) / 100) : 0.5;
        const runZ = L - offsetIn * 2, craneY = H - 1.2, bridgeSpan = W - offsetIn * 2 - 0.4;
        
        const lRun = createIBeam(runZ, 0.4, 0.2, 0.02, craneMat);
        lRun.position.set(-W / 2 + offsetIn + 0.2, craneY, 0);
        lRun.castShadow = true; lRun.receiveShadow = true;
        mainGroup.add(lRun);
        
        const rRun = createIBeam(runZ, 0.4, 0.2, 0.02, craneMat);
        rRun.position.set(W / 2 - offsetIn - 0.2, craneY, 0);
        rRun.castShadow = true; rRun.receiveShadow = true;
        mainGroup.add(rRun);
        
        const bridgeZ = (runZ / 2 - 0.2) - (runZ - 0.4) * cZSlider;
        const bridgeGrp = new THREE.Group();
        bridgeGrp.position.set(0, craneY + 0.3, bridgeZ);
        
        const gird1 = createIBeam(bridgeSpan, 0.5, 0.2, 0.03, craneMat);
        gird1.rotation.y = Math.PI / 2; gird1.position.z = -0.3;
        gird1.castShadow = true; gird1.receiveShadow = true;
        bridgeGrp.add(gird1);
        
        const gird2 = createIBeam(bridgeSpan, 0.5, 0.2, 0.03, craneMat);
        gird2.rotation.y = Math.PI / 2; gird2.position.z = 0.3;
        gird2.castShadow = true; gird2.receiveShadow = true;
        bridgeGrp.add(gird2);
        
        const footL = createBox(0.3, 0.4, 1.2, craneMat, -bridgeSpan / 2, -0.2, 0);
        const footR = createBox(0.3, 0.4, 1.2, craneMat, bridgeSpan / 2, -0.2, 0);
        footL.castShadow = true; footL.receiveShadow = true;
        footR.castShadow = true; footR.receiveShadow = true;
        bridgeGrp.add(footL); bridgeGrp.add(footR);
        
        const hoist = createBox(0.6, 0.6, 0.8, steelMat, 0, 0.2, 0);
        hoist.castShadow = true; hoist.receiveShadow = true;
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 8, 16, Math.PI * 1.5), craneMat);
        hook.rotation.z = -Math.PI / 2; hook.position.set(0, -0.5, 0);
        hook.castShadow = true;
        hoist.add(hook);
        const cable = createBox(0.02, 0.6, 0.02, steelMat, 0, -0.2, 0);
        cable.castShadow = true;
        hoist.add(cable);
        bridgeGrp.add(hoist);
        mainGroup.add(bridgeGrp);
    }

    document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
        if (!cb.checked) return;

        const extModelVal = cb.value;
        const existing = placedModels.find(m => m.type === extModelVal);

        if (modelCache[extModelVal]) {
            const model = modelCache[extModelVal].clone();
            const finalScale = hardcodedScales[extModelVal] || 1.0;
            model.scale.set(finalScale, finalScale, finalScale);
            model.userData.modelType = extModelVal; 

            if (existing) {
                model.position.set(existing.x, 0, existing.z);
            } else {
                const defaultX = W / 2 + 7; 
                const defaultZ = 0;
                model.position.set(defaultX, 0, defaultZ);
                placedModels.push({ type: extModelVal, x: defaultX, z: defaultZ });
            }
            
            model.traverse(child => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            });

            mainGroup.add(model);
            referenceModels.push(model);
        } else if (!modelCache[extModelVal + '_loading']) {
            modelCache[extModelVal + '_loading'] = true;

            const modelUrl = (appData.themeUri || '') + '/3d-models/' + extModelVal;
            const isGlb = extModelVal.toLowerCase().endsWith('.glb') || extModelVal.toLowerCase().endsWith('.gltf');
            const loader = isGlb ? gltfLoader : (extModelVal.toLowerCase().endsWith('.fbx') ? fbxLoader : objLoader);

            loader.load(modelUrl, (object) => {
                const baseObject = isGlb ? object.scene : object;
                modelCache[extModelVal] = cleanModel(baseObject);
                modelCache[extModelVal + '_loading'] = false;
                updateBuilding();
            }, undefined, (error) => {
                console.error('An error happened while loading 3D model:', error);
                modelCache[extModelVal + '_loading'] = false;
                updateBuilding();
            });
        }
    });

    if (!logoTexture) {
        logoTexture = textureLoader.load(logoUrl);
    }

    const logoWidth = 1;
    const logoHeight = 0.33;
    const plateThick = 0.1; 

    const logoGroup = new THREE.Group();
    const whitePlateMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0 });

    const plateGeo = new THREE.BoxGeometry(logoWidth + 0.1, logoHeight + 0.1, plateThick);
    const plateMesh = new THREE.Mesh(plateGeo, whitePlateMat); 
    plateMesh.castShadow = true; plateMesh.receiveShadow = true;
    logoGroup.add(plateMesh);

    const frameGeo = new THREE.BoxGeometry(logoWidth + 0.1, logoHeight + 0.1, plateThick / 2);
    const frameMesh = new THREE.Mesh(frameGeo, trimMat);
    frameMesh.position.z = -plateThick * 2;
    logoGroup.add(frameMesh);

    const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide });
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, logoHeight), logoMat);
    logoMesh.position.z = plateThick / 2 + 0.005; 
    logoGroup.add(logoMesh);

    const plateZPos = wOZ + wallThick + plateThick / 2; 
    
    let wallTopCenterY = RY; 
    if (isRSloped || isLSloped) {
        wallTopCenterY = H + (W * Slope) / 2; 
    }

    const plateYPos = wallTopCenterY - (logoHeight / 2) - 0.1; 

    logoGroup.position.set(0, plateYPos, plateZPos);
    mainGroup.add(logoGroup);

    const summaryDimensions = document.getElementById('summary-dimensions');
    const summaryRoof = document.getElementById('summary-roof');
    if (summaryDimensions) {
        const wFt = document.getElementById('valW')?.value || '60';
        const lFt = document.getElementById('valL')?.value || '100';
        const hFt = document.getElementById('valH')?.value || '16';
        summaryDimensions.innerText = `${wFt}' x ${lFt}' x ${hFt}'`;
    }
    if (summaryRoof) {
        const rType = document.getElementById('roofType')?.value || 'gabled';
        summaryRoof.innerText = rType === 'gabled' ? 'Gable Roof' : 'Single Slope';
    }

    if (!isFirstLoadComplete && spinnerEl) {
        setTimeout(() => {
            spinnerEl.style.display = 'none';
            isFirstLoadComplete = true; 
        }, 1000);
    }
}