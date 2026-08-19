// js/builder.js
import * as THREE from 'three';
import { mainGroup } from './scene.js';
import { collectCurrentState, hitboxes } from './state.js';
import { createFoundationGroup } from './foundation.js';
import { createMainFramesGroup } from './main-frames.js';
import { createGirtsGroup } from './girts.js';
import { createPurlinsGroup } from './purlins.js';
import { createEndWallColumnsGroup } from './end-wall-columns.js';
import { createDoorsGroupForWall } from './doors.js';
import { createWindowsGroupForWall } from './windows.js';
import { createMezzanineGroup } from './mezzanine.js';
import { createCraneGroup } from './crane.js';
import { createDrivewayGroup } from './driveway.js';
import { createGuttersGroup } from './gutters.js';
import { createRidgeGroup } from './ridge.js';
import { createOverhangsGroup } from './overhangs.js';
import { createInteriorLinerGroup } from './interior-liner.js';
import { createLogoGroup } from './logo.js';
import { configurePanelSystem, setPanelColors } from './panelSystem.js';

export function updateBuilding() {
    while (mainGroup.children.length > 0) {
        const obj = mainGroup.children[0];
        mainGroup.remove(obj);
    }
    hitboxes.length = 0;

    const state = collectCurrentState();

    configurePanelSystem(state.panelProfile || 'awr');
    setPanelColors(state.wallColor, state.wainscotColor);

    const mockGeometry = generateMockGeometry(state);

    const foundationGroup = createFoundationGroup(mockGeometry, true);
    mainGroup.add(foundationGroup);

    const mainFramesGroup = createMainFramesGroup(mockGeometry);
    mainGroup.add(mainFramesGroup);

    const girtsGroup = createGirtsGroup(mockGeometry, true);
    mainGroup.add(girtsGroup);

    const purlinsGroup = createPurlinsGroup(mockGeometry, true);
    mainGroup.add(purlinsGroup);

    const endWallColumnsGroup = createEndWallColumnsGroup(mockGeometry, true);
    mainGroup.add(endWallColumnsGroup);

    ['F', 'B', 'L', 'R'].forEach(side => {
        const wallLength = side === 'F' || side === 'B' ? state.w : state.l;
        const doorsGroup = createDoorsGroupForWall(side, wallLength);
        mainGroup.add(doorsGroup);

        const windowsGroup = createWindowsGroupForWall(side, wallLength);
        mainGroup.add(windowsGroup);
    });

    const mezzanineGroup = createMezzanineGroup(mockGeometry, state.mezzEn, state.mezzCov, state.mezzZ, state.mezzH, state.mezzanineColor);
    mainGroup.add(mezzanineGroup);

    const craneGroup = createCraneGroup(mockGeometry, state.craneEn, state.craneZ);
    mainGroup.add(craneGroup);

    const drivewayGroup = createDrivewayGroup(mockGeometry, state.drivewayEn);
    mainGroup.add(drivewayGroup);

    const guttersGroup = createGuttersGroup(mockGeometry, state.checkGutters);
    mainGroup.add(guttersGroup);

    const ridgeGroup = createRidgeGroup(mockGeometry);
    mainGroup.add(ridgeGroup);

    const overhangsGroup = createOverhangsGroup(mockGeometry, { checkRoof: true });
    mainGroup.add(overhangsGroup);

    const interiorLinerGroup = createInteriorLinerGroup(mockGeometry, state.intWallsEn, state.intWallsH);
    mainGroup.add(interiorLinerGroup);

    const logoGroup = createLogoGroup(mockGeometry);
    mainGroup.add(logoGroup);
}

function generateMockGeometry(state) {
    const w = state.w;
    const l = state.l;
    const h = state.h;
    const pitch = parseFloat(state.pitch) || 0.05;

    return {
        building: { width: w, length: l, height: h },
        foundation: {
            width: w + 0.4,
            height: 0.3,
            length: l + 0.4,
            slab: { width: w, height: 0.15, length: l, y: -0.075 },
            labels: {
                F: { x: 0, y: 0.01, z: l / 2 + 0.5, rotation: [-Math.PI / 2, 0, 0] },
                B: { x: 0, y: 0.01, z: -l / 2 - 0.5, rotation: [-Math.PI / 2, 0, Math.PI] },
                R: { x: w / 2 + 0.5, y: 0.01, z: 0, rotation: [-Math.PI / 2, 0, Math.PI / 2] },
                L: { x: -w / 2 - 0.5, y: 0.01, z: 0, rotation: [-Math.PI / 2, 0, -Math.PI / 2] }
            }
        },
        mainFrames: {
            frames: [
                {
                    zPos: -l / 2,
                    columns: {
                        left: { height: h, dStart: 0.3, dEnd: 0.2, x: -w / 2, y: h / 2, scaleX: 1 },
                        right: { height: h, dStart: 0.3, dEnd: 0.2, x: w / 2, y: h / 2, scaleX: 1 }
                    },
                    rafters: [
                        { length: w / 2, dStart: 0.2, dEnd: 0.15, position: { x: -w / 2, y: h, z: 0 }, rotationZ: pitch },
                        { length: w / 2, dStart: 0.2, dEnd: 0.15, position: { x: 0, y: h + (w / 2) * pitch, z: 0 }, rotationZ: -pitch }
                    ]
                },
                {
                    zPos: l / 2,
                    columns: {
                        left: { height: h, dStart: 0.3, dEnd: 0.2, x: -w / 2, y: h / 2, scaleX: 1 },
                        right: { height: h, dStart: 0.3, dEnd: 0.2, x: w / 2, y: h / 2, scaleX: 1 }
                    },
                    rafters: [
                        { length: w / 2, dStart: 0.2, dEnd: 0.15, position: { x: -w / 2, y: h, z: 0 }, rotationZ: pitch },
                        { length: w / 2, dStart: 0.2, dEnd: 0.15, position: { x: 0, y: h + (w / 2) * pitch, z: 0 }, rotationZ: -pitch }
                    ]
                }
            ]
        },
        girts: {
            thickness: 0.1,
            levels: [
                {
                    y: h / 2,
                    left: { x: -w / 2, z: 0, length: l },
                    right: { x: w / 2, z: 0, length: l },
                    front: { x: 0, z: l / 2, width: w },
                    back: { x: 0, z: -l / 2, width: w }
                }
            ]
        },
        purlins: {
            items: [
                { size: 0.1, length: l, position: { x: 0, y: h + 1, z: 0 }, rotationZ: 0 }
            ]
        },
        endWallColumns: {
            columns: [
                { thickness: 0.15, height: h, x: -w / 4, z: l / 2 },
                { thickness: 0.15, height: h, x: w / 4, z: l / 2 }
            ]
        },
        mezzanine: {
            width: w * 0.5,
            length: l * 0.5,
            height: h * 0.6,
            zOffset: 0,
            columnPositions: [
                { x: -w * 0.2, z: -l * 0.2 },
                { x: w * 0.2, z: -l * 0.2 }
            ]
        },
        crane: {
            runwayLength: l,
            rails: {
                left: { x: -w * 0.3, y: h * 0.8, z: 0 },
                right: { x: w * 0.3, y: h * 0.8, z: 0 }
            },
            bridge: { width: w * 0.6, y: h * 0.8, z: 0 }
        },
        driveway: {
            width: 4.0,
            height: 0.1,
            length: 6.0,
            position: { x: 0, y: -0.05, z: l / 2 + 3.0 }
        },
        gutters: {
            length: l,
            eaves: {
                left: { x: -w / 2, y: h + (w / 2) * pitch },
                right: { x: w / 2, y: h + (w / 2) * pitch }
            },
            zOffset: 0,
            downspouts: [
                { eaveY: h + (w / 2) * pitch, sideX: -1, overhang: 0.3, zPos: -l / 2, visible: true },
                { eaveY: h + (w / 2) * pitch, sideX: 1, overhang: 0.3, zPos: -l / 2, visible: true }
            ]
        },
        trims: {
            ridge: {
                length: l,
                roofAngle: pitch,
                x: 0,
                y: h + (w / 2) * pitch + 0.1,
                z: 0
            }
        },
        overhangs: {
            enabled: true,
            roof: {
                thickness: 0.05,
                totalLength: l + 0.6,
                gabled: {
                    left: { slopeLength: w / 2 + 0.3, position: { x: -w / 4 - 0.15, y: h + (w / 2) * pitch / 2, z: 0 }, rotationZ: pitch },
                    right: { slopeLength: w / 2 + 0.3, position: { x: w / 4 + 0.15, y: h + (w / 2) * pitch / 2, z: 0 }, rotationZ: -pitch }
                }
            }
        },
        interiorLiner: {
            enabled: state.intWallsEn,
            thickness: 0.05,
            sides: {
                L: {
                    shapeData: { points: [{ x: 0, y: 0 }, { x: l, y: 0 }, { x: l, y: h }, { x: 0, y: h }], holes: [] },
                    position: { x: -w / 2 + 0.1, y: 0, z: l / 2 },
                    rotationY: Math.PI / 2
                },
                R: {
                    shapeData: { points: [{ x: 0, y: 0 }, { x: l, y: 0 }, { x: l, y: h }, { x: 0, y: h }], holes: [] },
                    position: { x: w / 2 - 0.1, y: 0, z: -l / 2 },
                    rotationY: -Math.PI / 2
                },
                F: {
                    shapeData: { points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], holes: [] },
                    position: { x: -w / 2, y: 0, z: l / 2 - 0.1 },
                    rotationY: 0
                },
                B: {
                    shapeData: { points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], holes: [] },
                    position: { x: w / 2, y: 0, z: -l / 2 + 0.1 },
                    rotationY: Math.PI
                }
            }
        },
        logo: {
            position: { x: 0, y: h * 0.7, z: l / 2 + 0.12 }
        }
    };
}