import * as THREE from 'three';
import { steelMat, trimMat } from './materials.js';
import { openingDefs, openingsData } from './state.js';
import { createBox, createIBeam } from './geometry.js';

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