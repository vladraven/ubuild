import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { mainGroup } from './scene.js';
import { buildMainStructure } from './structure-builder.js';
import { 
    isMetric, openingDefs, openingsData, ltState, 
    hitboxes, dragPlanesMap, appData, referenceModels, placedModels 
} from './state.js';
import { 
    concreteMat, roofMat, wallMat, wainscotMat, trimMat, eaveTrimMat, steelMat, 
    craneMat, ceilingMat, mezzMat, getWallMaterials, updateMaterialColors
} from './materials.js';
import { 
    createBox, createIBeam, createRibbedGeo, createRoofGeo, 
    createTextLabel, buildOpeningMesh, profileGeoConfigs
} from './geometry.js';

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const modelCache = {};
let logoTexture = null;
const logoUrl = 'https://ubuildsb.com/wp-content/themes/U-Build/js/U-build-logo.png'; 
let isFirstLoadComplete = false;

const hardcodedScales = {
    'ergoninane-fast-74.glb': 1.3, 'forza1903-low-poly-2490.glb': 3,
    'scania.glb': 1, 'plane.glb': .07
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

    let H = roofType === 'gabled' ? H_base + (W / 2) * Slope : H_base + W * Slope;
    const extL = L + 0.16, extW = W + 0.16;
    const sides = targetSide ? [targetSide] : ['F', 'B', 'L', 'R'];
    
    sides.forEach(s => {
        const wallLength = (s === 'F' || s === 'B') ? extW : extL;
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 512;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#000000';
        
        if (openingsData[s]) {
            openingsData[s].forEach(op => {
                const def = openingDefs[op.type];
                if (!def) return;
                const opW = op.w || def.w, opH = op.h || def.h;
                let xPos = s === 'B' ? -op.x : op.x;
                const xPercent = (xPos + wallLength / 2) / wallLength,
                      yPercent = op.yOff !== undefined ? op.yOff : def.yOff,
                      wPercent = opW / wallLength, hPercent = opH / H;
                ctx.fillRect((xPercent - wPercent / 2) * c.width, c.height - ((yPercent + hPercent) * c.height), wPercent * c.width, hPercent * c.height);
            });
        }
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; 
        const mats = getWallMaterials(s);
        if (mats) {
            [mats.mMat, mats.wMat, mats.intMat].forEach(m => {
                if (!m) return; m.alphaMap = tex; m.alphaTest = 0.5; m.transparent = true; m.depthWrite = true; m.needsUpdate = true;
            });
        }
    });
}

function buildInteriorLiner(W, L, H, offsetIn, wallCfg, mats) {
    const intWallsEn = document.getElementById('intWallsEn');
    const bc = window.ConfiguratorBackendConstraints;
    if (!intWallsEn || !intWallsEn.checked || (bc && bc.allow_interior_liner === 0)) return;

    const intWallsH = document.getElementById('intWallsH');
    const intH = H * (intWallsH ? (parseFloat(intWallsH.value) / 100) : 1);
    const linerProfileCfg = profileGeoConfigs['936'] || wallCfg;

    const addIntW = (side, w, pos, rot) => {
        if (!document.getElementById('w' + side)?.checked) return;
        const g = new THREE.Group();
        const clonedMat = mats[side].intMat.clone(); 
        clonedMat.alphaTest = 0.5;
        if (clonedMat.map) { clonedMat.map.rotation = 0; clonedMat.map.needsUpdate = true; }
        const mM = new THREE.Mesh(createRibbedGeo(w, intH, H, 0, linerProfileCfg), clonedMat);
        mM.geometry.translate(-w / 2, 0, 0);
        mM.material.polygonOffset = true; mM.material.polygonOffsetFactor = 1; mM.material.polygonOffsetUnits = 1;
        g.add(mM);
        g.position.copy(pos); g.rotation.set(rot.x, rot.y, rot.z); mainGroup.add(g);
    };
    addIntW('L', L - offsetIn * 2, new THREE.Vector3(-W / 2 + offsetIn, 0, 0), { x: 0, y: Math.PI / 2, z: 0 });
    addIntW('R', L - offsetIn * 2, new THREE.Vector3(W / 2 - offsetIn, 0, 0), { x: 0, y: -Math.PI / 2, z: 0 });
    addIntW('F', W - offsetIn * 2, new THREE.Vector3(0, 0, L / 2 - offsetIn), { x: 0, y: 0, z: 0 });
    addIntW('B', W - offsetIn * 2, new THREE.Vector3(0, 0, -L / 2 + offsetIn), { x: 0, y: Math.PI, z: 0 });
}

function buildCeilingLiner(W, L, RY, Slope, ang, isG, roofType) {
    if (!document.getElementById('ceilEn')?.checked) return;
    const verticalOffset = 1.15; ceilingMat.side = THREE.DoubleSide;
    const cRS = (iR) => {
        if (isG) {
            const cW_half = W / 2, cLen = Math.sqrt(Math.pow(cW_half, 2) + Math.pow(cW_half * Slope, 2));
            const slopeMesh = new THREE.Mesh(new THREE.PlaneGeometry(cLen, L), ceilingMat);
            slopeMesh.castShadow = true; slopeMesh.receiveShadow = true; slopeMesh.rotation.x = -Math.PI / 2;
            slopeMesh.position.set(iR ? cW_half / 2 : -cW_half / 2, RY - verticalOffset - (cW_half / 2 * Slope), 0);
            slopeMesh.rotation.y = iR ? -ang : ang; mainGroup.add(slopeMesh);
        } else if (!iR) {
            const cLenS = Math.sqrt(Math.pow(W, 2) + Math.pow(W * Slope, 2));
            const slopeS = new THREE.Mesh(new THREE.PlaneGeometry(cLenS, L), ceilingMat);
            slopeS.castShadow = true; slopeS.receiveShadow = true; slopeS.rotation.x = -Math.PI / 2;
            slopeS.position.set(0, H + (W * Slope / 2) - verticalOffset, 0);
            slopeS.rotation.y = roofType === 'right-sloped' ? -ang : ang; mainGroup.add(slopeS);
        }
    };
    cRS(false); if (isG) cRS(true);
}

function buildExteriorWalls(W, L, H, RY, ang, isG, roofType, extW, extL, wOX, wOZ, wsHeightInput, wallCfg, wallThick) {
    const isLSloped = roofType === 'left-sloped', isRSloped = roofType === 'right-sloped';
    const Slope = parseFloat(document.getElementById('inputPitch')?.value || 0.05);
    const rLift = 0.55;

    const addW = (side, w, h, pos, rot, iE, sWs) => {
        if (!document.getElementById('w' + side)?.checked) return;
        const g = new THREE.Group(); let wsH = sWs ? Math.min(wsHeightInput, h) : 0;
        const mats = getWallMaterials(side); if (!mats) return;
        const currentWallMat = mats.mMat.clone(), currentWainscotMat = mats.wMat.clone();
        
        currentWallMat.alphaTest = 0.5;
        currentWainscotMat.alphaTest = 0.5;

        if (wsH > 0) {
            const mWS = new THREE.Mesh(createRibbedGeo(w, wsH, H, 0, wallCfg), currentWainscotMat);
            mWS.geometry.translate(-w / 2, 0, 0);
            g.add(mWS);
        }
        
        if (h - wsH > 0) {
            const mM = new THREE.Mesh(createRibbedGeo(w, h - wsH + (iE ? 2 : 0), H, wsH, wallCfg), currentWallMat);
            mM.geometry.translate(-w / 2, 0, 0);
            mM.position.y = wsH; 
            g.add(mM);
        }
        
        g.position.copy(pos); g.rotation.set(rot.x, rot.y, rot.z);

        g.updateMatrixWorld();

        let clip = [];
        if (isG) {
            clip = [
                new THREE.Plane(new THREE.Vector3(Math.sin(ang), -Math.cos(ang), 0).normalize(), RY + rLift),
                new THREE.Plane(new THREE.Vector3(-Math.sin(ang), -Math.cos(ang), 0).normalize(), RY + rLift)
            ];
        } else if (isRSloped) {
            const clipNormal = new THREE.Vector3(-Math.sin(ang), -Math.cos(ang), 0).normalize();
            const pointOnRoof = new THREE.Vector3(W / 2, H + rLift, 0);
            clip = [new THREE.Plane(clipNormal, -pointOnRoof.dot(clipNormal))];
        } else {
            const clipNormal = new THREE.Vector3(Math.sin(ang), -Math.cos(ang), 0).normalize();
            const pointOnRoof = new THREE.Vector3(-W / 2, H + rLift, 0);
            clip = [new THREE.Plane(clipNormal, -pointOnRoof.dot(clipNormal))];
        }
        
        let localClip = clip.map(p => p.clone().applyMatrix4(g.matrixWorld.clone().invert()));
        
        if (side === 'B' && !isG) {
            localClip = localClip.map(p => new THREE.Plane(p.normal.clone().negate(), -p.constant));
        }
        
        currentWallMat.clippingPlanes = iE ? localClip : [];
        
        if (openingsData[side]) {
            openingsData[side].forEach(op => {
                const def = openingDefs[op.type]; if (!def) return;
                const opObj = buildOpeningMesh(op); opObj.mesh.position.set(0, (op.yOff !== undefined ? op.yOff : def.yOff) + (op.h || def.h) / 2, op.x);
                opObj.hit.userData = { isOpening: true, side, opData: op, meshGroup: opObj.mesh, wallLength: w };
                hitboxes.push(opObj.hit); g.add(opObj.mesh);
            });
        }
        g.updateMatrixWorld(); mainGroup.add(g);
        dragPlanesMap[side] = { mathPlane: new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyEuler(g.rotation).normalize(), g.position), inverseMatrix: g.matrixWorld.clone().invert() };
        
        updateBuildingAlphaMaps(side);
    };

    const leftWallHeight = isRSloped ? RY : H;
    const rightWallHeight = (isLSloped || roofType === 'single') ? RY : H;

    addW('L', extL, leftWallHeight + 0.55, new THREE.Vector3(-wOX, 0, 0), { x: 0, y: Math.PI / 2, z: 0 }, false, true);
    addW('R', extL, rightWallHeight + 0.55, new THREE.Vector3(wOX, 0, 0), { x: 0, y: -Math.PI / 2, z: 0 }, false, true);
    addW('F', extW, RY + 0.55, new THREE.Vector3(0, 0, wOZ), { x: 0, y: 0, z: 0 }, true, true);
    addW('B', extW, RY + 0.55, new THREE.Vector3(0, 0, -wOZ), { x: 0, y: Math.PI, z: 0 }, true, true);
}

function buildAwnings(W, L, H, RY, ang, extL, extW, wOX, wOZ, roofCfg, wallCfg, wsEnabled, wsHeightInput) {
    const bA = (s, c) => {
        if (!c || !c.active) return;
        const isFB = (s === 'F' || s === 'B'), bL = isFB ? W : L;
        let aW = bL - c.cutL - c.cutR; if (aW <= 0) return;
        
        let maxDoorH = 0;
        if (openingsData[s]) {
            openingsData[s].forEach(op => {
                if (op.type.includes('Door')) maxDoorH = Math.max(maxDoorH, (op.h || openingDefs[op.type].h));
            });
        }
        let safeDrop = Math.min(c.drop, H - maxDoorH - 0.3);
        const sY = H - safeDrop, pA = Math.atan(c.pitch / 12), cx = (c.cutL - c.cutR) / 2, hPost = sY - (c.depth * Math.tan(pA));
        
        const g = new THREE.Group();
        if (s === 'F') { g.position.set(cx, sY, wOZ); g.rotation.y = 0; } 
        else if (s === 'B') { g.position.set(cx, sY, -wOZ); g.rotation.y = Math.PI; } 
        else if (s === 'R') { g.position.set(wOX, sY, cx); g.rotation.y = -Math.PI / 2; } 
        else if (s === 'L') { g.position.set(-wOX, sY, cx); g.rotation.y = Math.PI / 2; }
        g.updateMatrixWorld();

        const clipPlane = new THREE.Plane(new THREE.Vector3(0, -Math.cos(pA), -Math.sin(pA)).normalize(), 0).applyMatrix4(g.matrixWorld);

        const rG = createRoofGeo(c.depth / Math.cos(pA), aW, 0.1, roofCfg); rG.translate(0, 0, -aW / 2);
        const mesh = new THREE.Mesh(rG, roofMat); mesh.rotation.x = pA; mesh.castShadow = true; g.add(mesh);

        if (c.wallF) {
            const wallGrp = new THREE.Group(); let curWsH = wsEnabled ? Math.min(wsHeightInput, hPost) : 0;
            if (hPost > curWsH && curWsH > 0) {
                const mWS = new THREE.Mesh(createRibbedGeo(aW, curWsH, hPost, 0, wallCfg), wainscotMat.clone());
                mWS.geometry.translate(-aW / 2, 0, 0); wallGrp.add(mWS);
                const mW = new THREE.Mesh(createRibbedGeo(aW, hPost - curWsH - 0.02, hPost, curWsH, wallCfg), wallMat.clone());
                mW.geometry.translate(-aW / 2, 0, 0); mW.position.y = curWsH; wallGrp.add(mW);
            } else {
                const mW = new THREE.Mesh(createRibbedGeo(aW, hPost - 0.02, hPost, 0, wallCfg), wallMat.clone());
                mW.geometry.translate(-aW / 2, 0, 0); wallGrp.add(mW);
            }
            wallGrp.position.set(0, -sY, c.depth); g.add(wallGrp);
        }

        const createSideWall = (isLeft) => {
            const sideGrp = new THREE.Group(); let curWsH = wsEnabled ? Math.min(wsHeightInput, sY) : 0;
            const wMatC = wallMat.clone(); wMatC.clippingPlanes = [clipPlane];
            const wscMatC = wainscotMat.clone(); wscMatC.clippingPlanes = [clipPlane];

            if (sY > curWsH && curWsH > 0) {
                const mWS = new THREE.Mesh(createRibbedGeo(c.depth, curWsH, sY, 0, wallCfg), wscMatC);
                mWS.geometry.translate(-c.depth / 2, 0, 0);
                const mW = new THREE.Mesh(createRibbedGeo(c.depth, sY - curWsH + 0.1, sY, curWsH, wallCfg), wMatC);
                mW.geometry.translate(-c.depth / 2, 0, 0); mW.position.y = curWsH; 
                sideGrp.add(mWS); sideGrp.add(mW);
            } else {
                const mW = new THREE.Mesh(createRibbedGeo(c.depth, sY + 0.1, sY, 0, wallCfg), wMatC);
                mW.geometry.translate(-c.depth / 2, 0, 0); sideGrp.add(mW);
            }
            if (isLeft) { sideGrp.rotation.y = -Math.PI / 2; sideGrp.position.set(-aW / 2, -sY, c.depth / 2); }
            else { sideGrp.rotation.y = Math.PI / 2; sideGrp.position.set(aW / 2, -sY, c.depth / 2); }
            g.add(sideGrp);
        };
        if (c.wallL) createSideWall(true);
        if (c.wallR) createSideWall(false);

        const colSize = 0.2, colHeight = hPost - 0.01;
        if (colHeight > 0) {
            const colGeo = new THREE.BoxGeometry(colSize, colHeight, colSize);
            const col1 = new THREE.Mesh(colGeo, trimMat), col2 = new THREE.Mesh(colGeo, trimMat);
            col1.position.set(-aW / 2 + colSize / 2, -sY + colHeight / 2, c.depth - colSize / 2);
            col2.position.set(aW / 2 - colSize / 2, -sY + colHeight / 2, c.depth - colSize / 2);
            g.add(col1); g.add(col2);
        }
        mainGroup.add(g);
    };
    bA('L', ltState.L); bA('R', ltState.R); bA('F', ltState.F); bA('B', ltState.B);
}

function buildRoofsAndTrims(W, L, H, RY, ang, Slope, roofType, isG, roofL, roofZ, oL, oR, oF, oB, wallOut, wOX, wOZ, wallThick) {
    if (document.getElementById('checkRoof')?.checked) {
        const cRS = (iR) => {
            const span = isG ? (W / 2 + (iR ? oR + wallOut : oL + wallOut)) : (W + oL + oR + wallOut * 2);
            const rLen = Math.sqrt(Math.pow(span, 2) + Math.pow(span * Slope, 2));
            const slope = new THREE.Mesh(createRoofGeo(rLen, roofL, 0.1, profileGeoConfigs[document.getElementById('roofProfile')?.value || '936']), roofMat);
            slope.castShadow = true; slope.receiveShadow = true;
            if (isG) {
                slope.position.set(0, RY + 0.55, iR ? roofZ - roofL / 2 : roofZ + roofL / 2);
                slope.rotation.set(0, iR ? 0 : Math.PI, -ang);
            } else if (roofType === 'right-sloped') {
                if (!iR) { 
                    slope.position.set(-W / 2 - oL - wallOut, H + 0.55 + W * Slope + oL * Slope, roofZ - roofL / 2); 
                    slope.rotation.set(0, 0, -ang); 
                }
            } else {
                if (!iR) { 
                    slope.position.set(-W / 2 - oL - wallOut, H + 0.55 - oL * Slope, roofZ - roofL / 2); 
                    slope.rotation.set(0, 0, ang); 
                }
            }
            mainGroup.add(slope);
        };
        cRS(false); if (isG) cRS(true);

        if (isG) {
            const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, roofL), roofMat);
            ridge.position.set(0, RY + 0.55 + 0.025, roofZ); mainGroup.add(ridge);
        }

        const eaveTrimGeo = new THREE.BoxGeometry(0.1, 0.2, roofL);
        const addEaveTrim = (iR) => {
            if (!isG) {
                if (roofType === 'right-sloped' && !iR) return;
                if ((roofType === 'left-sloped' || roofType === 'single') && iR) return;
            }
            const trim = new THREE.Mesh(eaveTrimGeo, eaveTrimMat);
            const sX = iR ? 1 : -1; let tY = H + 0.55 - 0.1;
            if (isG) tY = (H + 0.55 - (iR ? oR : oL) * Slope) - 0.1;
            else if (roofType === 'right-sloped') tY = H + 0.55 - oR * Slope - 0.1;
            else tY = H + 0.55 - oL * Slope - 0.1;
            trim.position.set(sX * (W / 2 + (iR ? oR : oL) + wallOut), tY, roofZ);
            mainGroup.add(trim);
        };
        addEaveTrim(false); if (isG || roofType === 'single' || roofType === 'left-sloped' || roofType === 'right-sloped') addEaveTrim(true);
    }
}

function buildAccessories(W, L, H, offsetIn, roofL, roofZ, W_half, RY, eff_oL, eff_oR, Slope, roofType, isG, wOX, wOZ, wallThick) {
    const bc = window.ConfiguratorBackendConstraints;

    if (document.getElementById('mezzEn')?.checked && (!bc || bc.allow_mezzanine !== 0)) {
        const cov = (parseInt(document.getElementById('mezzCov')?.value) / 3) || 0.33, mLen = (L - offsetIn * 2) * cov;
        const mH = H * 0.6 + (H * 0.39) * (parseFloat(document.getElementById('mezzH')?.value || 50) / 100);
        const minZ = (L / 2 - offsetIn) - mLen / 2, maxZ = - (L / 2 - offsetIn) + mLen / 2;
        const zPos = minZ + (maxZ - minZ) * (parseFloat(document.getElementById('mezzZ')?.value || 0) / 100);
        const mSlab = new THREE.Mesh(new THREE.BoxGeometry(W - offsetIn * 2, 0.2, mLen), mezzMat);
        mSlab.position.set(0, mH, zPos); mSlab.castShadow = true; mainGroup.add(mSlab);
    }

    if (document.getElementById('craneEn')?.checked && (!bc || bc.allow_crane !== 0)) {
        const lRun = createIBeam(L - offsetIn * 2, 0.4, 0.2, 0.02, craneMat);
        lRun.position.set(-W / 2 + offsetIn + 0.2, H - 1.2, 0); mainGroup.add(lRun);
    }

    const checkGutters = document.getElementById('checkGutters');
    if (checkGutters && checkGutters.checked && (!bc || bc.allow_downspouts !== 0)) {
        const aGS = (iR) => {
            if (!isG) {
                if (roofType === 'right-sloped' && !iR) return;
                if ((roofType === 'left-sloped' || roofType === 'single') && iR) return;
            }
            const eff_oH = iR ? eff_oR : eff_oL, sX = iR ? 1 : -1;
            let gY = H + 0.55;
            if (isG) gY = H + 0.55 - eff_oH * Slope;
            else if (roofType === 'right-sloped') gY = H + 0.55 - eff_oR * Slope;
            else gY = H + 0.55 - eff_oL * Slope;
            
            const gut = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, roofL), eaveTrimMat);
            gut.position.set(sX * (W / 2 + eff_oH + 0.15), gY - 0.05, roofZ); mainGroup.add(gut);
            
            const dsH = gY - 0.3;
            const spacing = 7.3152; 
            const spoutsCount = Math.max(2, Math.ceil(L / spacing) + 1);
            const stepZ = L / (spoutsCount - 1);
            
            for (let j = 0; j < spoutsCount; j++) {
                const currentZ = -L / 2 + j * stepZ;
                const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, dsH, 8), trimMat);
                p.position.set(sX * (wOX + wallThick + 0.05), dsH / 2, currentZ); 
                p.castShadow = true; mainGroup.add(p);
            }
        };
        aGS(false); if (isG || roofType === 'single' || roofType === 'left-sloped' || roofType === 'right-sloped') aGS(true);
    }
}

function loadReferenceModels() {
    const bc = window.ConfiguratorBackendConstraints;
    const modelsToLoad = [
        { id: 'refVehicle', file: 'ergoninane-fast-74.glb', allowed: bc ? bc.allow_vehicle : 1 },
        { id: 'refForklift', file: 'forza1903-low-poly-2490.glb', allowed: bc ? bc.allow_forklift : 1 },
        { id: 'refAirplane', file: 'plane.glb', allowed: bc ? bc.allow_airplane : 1 },
        { id: 'refTruck', file: 'scania.glb', allowed: bc ? bc.allow_truck : 1 }
    ];

    modelsToLoad.forEach(m => {
        const checkbox = document.getElementById(m.id);
        if (checkbox && checkbox.checked && m.allowed !== 0) {
            const cached = modelCache[m.file];
            if (cached) {
                positionRefModel(cached, m.file);
            } else {
                const themeUri = window.ConfiguratorData?.themeUri || '';
                gltfLoader.load(themeUri + '/js/models/' + m.file, (gltf) => {
                    modelCache[m.file] = gltf.scene;
                    positionRefModel(gltf.scene, m.file);
                }, undefined, (err) => {
                    console.error("Failed to load model: " + m.file, err);
                });
            }
        }
    });
}

function positionRefModel(model, filename) {
    if (referenceModels.includes(model)) return;
    const scale = hardcodedScales[filename] || 1.0;
    model.scale.set(scale, scale, scale);
    const type = filename.split('.')[0];
    const saved = placedModels.find(m => m.type === type);
    model.position.set(saved ? saved.x : 0, 0, saved ? saved.z : 15);
    model.userData = { modelType: type };
    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    referenceModels.push(model); mainGroup.add(model);
}

export function updateBuilding() {
    const spinnerEl = document.getElementById('configurator-spinner');
    if (!isFirstLoadComplete && spinnerEl) spinnerEl.style.display = 'flex';
    updateMaterialColors(); mainGroup.clear(); hitboxes.length = 0; referenceModels.length = 0;
    for (const k in dragPlanesMap) delete dragPlanesMap[k];
    
    const inputW = document.getElementById('inputW'), inputL = document.getElementById('inputL'), inputH = document.getElementById('inputH');
    if (!inputW || !inputL || !inputH) return;
    const W = parseFloat(inputW.getAttribute('data-current-m')), L = parseFloat(inputL.getAttribute('data-current-m')), H = Math.min(parseFloat(inputH.getAttribute('data-current-m')), 12.192);
    const Slope = parseFloat(document.getElementById('inputPitch')?.value || 0.05), roofType = document.getElementById('roofType')?.value || 'gabled';
    const isG = roofType === 'gabled', ang = Math.atan(Slope), wallOffset = 0.03, wallThick = 0.05, wallOut = wallOffset + wallThick;
    const oL = Math.min(parseFloat(document.getElementById('overL')?.getAttribute('data-current-m') || 0), 1.524);
    const oR = Math.min(parseFloat(document.getElementById('overR')?.getAttribute('data-current-m') || 0), 1.524);
    const oF = Math.min(parseFloat(document.getElementById('overF')?.getAttribute('data-current-m') || 0), 1.524);
    const oB = Math.min(parseFloat(document.getElementById('overB')?.getAttribute('data-current-m') || 0), 1.524);
    const wsEnabled = document.getElementById('wainscotEn')?.checked || false, wsHeightInput = wsEnabled ? Math.min(parseFloat(document.getElementById('inputWSHeight')?.getAttribute('data-current-m') || 0), H) : 0;
    
    let minX = -W / 2 - wallOut, maxX = W / 2 + wallOut, minZ = -L / 2 - wallOut, maxZ = L / 2 + wallOut;
    if (ltState.L?.active) minX -= ltState.L.depth; if (ltState.R?.active) maxX += ltState.R.depth;
    
    const bc = window.ConfiguratorBackendConstraints;
    const foundationThickness = bc && bc.max_foundation_height !== undefined ? Math.min(bc.max_foundation_height, 0.6096) : 0.4;
    
    const slab = new THREE.Mesh(new THREE.BoxGeometry((maxX - minX), foundationThickness, (maxZ - minZ)), concreteMat);
    slab.position.set((maxX + minX) / 2, -foundationThickness / 2, (maxZ + minZ) / 2); slab.receiveShadow = true; mainGroup.add(slab);

    const RY = isG ? H + (W / 2) * Slope : H + W * Slope, wOX = W / 2 + wallOffset, wOZ = L / 2 + wallOffset;
    const extL = L + wallOffset * 2 + wallThick * 2, extW = W + wallOffset * 2 + wallThick * 2;
    const wallCfg = profileGeoConfigs[document.getElementById('wallProfile')?.value || '936'];
    updateBuildingAlphaMaps();

    if (!document.getElementById('checkStructure') || document.getElementById('checkStructure').checked) mainGroup.add(buildMainStructure(W, L, H, Slope, roofType));
    const offsetIn = 0.3; const mats = {}; ['L','R','F','B'].forEach(s => { mats[s] = getWallMaterials(s); });
    
    buildInteriorLiner(W, L, H, offsetIn, wallCfg, mats);
    buildCeilingLiner(W, L, RY, Slope, ang, isG, roofType);
    buildExteriorWalls(W, L, H, RY, ang, isG, roofType, extW, extL, wOX, wOZ, wsHeightInput, wallCfg, wallThick);
    buildAwnings(W, L, H, RY, ang, extL, extW, wOX, wOZ, profileGeoConfigs[document.getElementById('roofProfile')?.value || '936'], wallCfg, wsEnabled, wsHeightInput);
    buildRoofsAndTrims(W, L, H, RY, ang, Slope, roofType, isG, L + oF + oB + wallOut * 2, (oF - oB) / 2, oL, oR, oF, oB, wallOut, wOX, wOZ, wallThick);
    buildAccessories(W, L, H, offsetIn, L + oF + oB + wallOut * 2, (oF - oB) / 2, W / 2, RY, oL + wallOut, oR + wallOut, Slope, roofType, isG, wOX, wOZ, wallThick);

    if (!logoTexture) logoTexture = textureLoader.load(logoUrl);
    const logoW = 1.0, logoH = 0.33, plateT = 0.1;
    const logoGroup = new THREE.Group();
    const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(logoW + 0.1, logoH + 0.1, plateT), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 }));
    logoGroup.add(plateMesh);
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide }));
    logoMesh.position.z = plateT / 2 + 0.005; logoGroup.add(logoMesh);
    logoGroup.position.set(0, RY - (logoH / 2) - 0.1, wOZ + wallThick + plateT / 2); mainGroup.add(logoGroup);

    loadReferenceModels();
    if (!isFirstLoadComplete && spinnerEl) { setTimeout(() => { spinnerEl.style.display = 'none'; isFirstLoadComplete = true; }, 1000); }
}