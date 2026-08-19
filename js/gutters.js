// js/gutters.js
import * as THREE from 'three';
import { trimMat, eaveTrimMat } from './colorise.js';
import { openingsData, openingDefs } from './state.js';

export const GUTTER_CONFIG = {
    gutter: {
        lengthOffset: 0.0,
        widthOffset: 0.0,
        offsetX: 0.0,
        offsetY: -0.135
    },
    topElbow: {
        angleDeg: 25,
        length: 0.35,
        offsetX: 0.0,
        offsetY: -0.025,
        offsetZ: 0.0
    },
    bottomElbow: {
        angleDeg: 45,
        length: 0.12,
        offsetX: 0.0,
        offsetY: 0.025,
        offsetZ: 0.0
    },
    pipe: {
        wallOffset: 0.05,
        heightOffset: 0.0,
        groundOffset: 0.15,
        width: 0.08,
        depth: 0.06
    }
};

const DOWNSPOUT_DOOR_TOLERANCE = 0.3;

function createGutter(length) {
    const shape = new THREE.Shape();
    const w = 0.14 + GUTTER_CONFIG.gutter.widthOffset;
    const h = 0.12;
    const t = 0.01;

    shape.moveTo(0, h);
    shape.lineTo(0, 0);
    shape.absarc(w / 2, 0, w / 2, Math.PI, 0, true);
    shape.lineTo(w, h);
    shape.lineTo(w - t, h);
    shape.absarc(w / 2, 0, w / 2 - t, 0, Math.PI, false);
    shape.lineTo(t, h);
    shape.closePath();

    const safeLength = Math.max(0.01, length + GUTTER_CONFIG.gutter.lengthOffset);
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: safeLength,
        bevelEnabled: false
    });

    geometry.translate(0, 0, -safeLength / 2);

    const mesh = new THREE.Mesh(geometry, eaveTrimMat);
    mesh.castShadow = true;
    mesh.renderOrder = 4;

    const capShape = new THREE.Shape();
    capShape.moveTo(0, h);
    capShape.lineTo(0, 0);
    capShape.absarc(w / 2, 0, w / 2, Math.PI, 0, true);
    capShape.lineTo(w, h);
    capShape.closePath();

    const capGeometry = new THREE.ShapeGeometry(capShape);

    const capFront = new THREE.Mesh(capGeometry, eaveTrimMat);
    capFront.position.z = safeLength / 2;
    capFront.renderOrder = 4;
    mesh.add(capFront);

    const capBack = new THREE.Mesh(capGeometry, eaveTrimMat);
    capBack.position.z = -safeLength / 2;
    capBack.renderOrder = 4;
    mesh.add(capBack);

    return mesh;
}

function createRectPipeGeo(length) {
    const safeLength = Math.max(0.01, length);
    const shape = new THREE.Shape();
    const w = GUTTER_CONFIG.pipe.width;
    const d = GUTTER_CONFIG.pipe.depth;
    const r = 0.012;

    shape.moveTo(-w / 2 + r, d / 2);
    shape.lineTo(w / 2 - r, d / 2);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2, d / 2 - r);
    shape.lineTo(w / 2, -d / 2 + r);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2 - r, -d / 2);
    shape.lineTo(-w / 2 + r, -d / 2);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2, -d / 2 + r);
    shape.lineTo(-w / 2, d / 2 - r);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2 + r, d / 2);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: safeLength,
        bevelEnabled: false,
        curveSegments: 4
    });

    geometry.translate(0, 0, -safeLength / 2);
    geometry.rotateX(Math.PI / 2);

    return geometry;
}

function addPipeSegment(group, xA, yA, xB, yB, zPos, pipeMat) {
    const dx = xB - xA;
    const dy = yB - yA;
    const len = Math.hypot(dx, dy);
    if (len < 0.005) return;

    const angle = Math.atan2(dx, -dy);
    const geo = createRectPipeGeo(len);
    const mesh = new THREE.Mesh(geo, pipeMat);
    mesh.position.set((xA + xB) / 2, (yA + yB) / 2, zPos);
    mesh.rotation.z = angle;
    mesh.castShadow = true;
    group.add(mesh);
}

function createDownspout(eaveY, sideX, overhang, width) {
    const group = new THREE.Group();
    const pipeMat = trimMat;
    const halfW = width / 2;

    const xGutter = sideX * (halfW + overhang + 0.07);
    const yGutter = eaveY + GUTTER_CONFIG.gutter.offsetY;
    const xWall = sideX * (halfW + GUTTER_CONFIG.pipe.wallOffset);
    const yBottom = Math.max(0.02, GUTTER_CONFIG.pipe.groundOffset);

    const topDrop = 0.35;
    const yElbowEnd = yGutter - topDrop;

    // 1. Верхнее S-колено (от желоба под угол к стене)
    const yElbowMid = yGutter - topDrop * 0.2;
    addPipeSegment(group, xGutter, yGutter, xGutter, yElbowMid, 0, pipeMat);
    addPipeSegment(group, xGutter, yElbowMid, xWall, yElbowEnd, 0, pipeMat);

    // 2. Длинная вертикальная труба вдоль стены до земли
    const yShoeStart = yBottom + 0.20;
    addPipeSegment(group, xWall, yElbowEnd, xWall, yShoeStart, 0, pipeMat);

    // 3. Нижний сливной башмак
    const shoeLen = 0.18;
    const shoeAngle = Math.PI / 4;
    const xShoeEnd = xWall + sideX * (shoeLen * Math.sin(shoeAngle));
    const yShoeEnd = yShoeStart - (shoeLen * Math.cos(shoeAngle));
    addPipeSegment(group, xWall, yShoeStart, xShoeEnd, yShoeEnd, 0, pipeMat);

    // Хомуты крепления
    const strapGeo = new THREE.BoxGeometry(GUTTER_CONFIG.pipe.width * 1.3, 0.02, GUTTER_CONFIG.pipe.depth * 1.3);
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });

    const totalHeight = yElbowEnd - yShoeStart;
    const numStraps = Math.max(2, Math.floor(totalHeight / 2.5));
    for (let i = 0; i <= numStraps; i++) {
        const yPos = yShoeStart + (totalHeight * i) / numStraps;
        const bracket = new THREE.Mesh(strapGeo, strapMat);
        bracket.position.set(xWall, yPos, 0);
        bracket.castShadow = true;
        group.add(bracket);
    }

    return group;
}

export function createGuttersGroup(
    width,
    length,
    height,
    pitchRatio,
    roofType,
    enabled,
    overL = 0,
    overR = 0,
    overF = 0,
    overB = 0,
    geometry = null
) {
    const group = new THREE.Group();
    if (!enabled || !geometry || !geometry.gutters) {
        return group;
    }

    const gData = geometry.gutters;

    const gutterL = createGutter(gData.length);
    gutterL.scale.x = -1;
    gutterL.position.set(gData.eaves.left.x + GUTTER_CONFIG.gutter.offsetX, gData.eaves.left.y + GUTTER_CONFIG.gutter.offsetY, gData.zOffset);
    group.add(gutterL);

    const gutterR = createGutter(gData.length);
    gutterR.position.set(gData.eaves.right.x - GUTTER_CONFIG.gutter.offsetX, gData.eaves.right.y + GUTTER_CONFIG.gutter.offsetY, gData.zOffset);
    group.add(gutterR);

    gData.downspouts.forEach(dsData => {
        const ds = createDownspout(dsData.eaveY, dsData.sideX, dsData.overhang, geometry.building.width);
        ds.position.set(0, 0, dsData.zPos);
        ds.userData = { isDownspout: true, side: dsData.side, wallPos: dsData.wallPos };
        group.add(ds);
    });

    return group;
}

export function updateDownspoutVisibility(root) {
    if (!root) return;
    const downspouts = [];

    root.traverse(obj => {
        if (obj.userData && obj.userData.isDownspout) {
            downspouts.push(obj);
        }
    });

    downspouts.forEach(ds => {
        const side = ds.userData.side;
        const dsPos = ds.userData.wallPos;
        const doorsOnWall = (openingsData[side] || []).filter(op => op.type !== 'Window');

        const collides = doorsOnWall.some(door => {
            const def = openingDefs[door.type] || { w: 2.0 };
            const doorW = door.w || def.w;
            const minX = door.x - doorW / 2 - DOWNSPOUT_DOOR_TOLERANCE;
            const maxX = door.x + doorW / 2 + DOWNSPOUT_DOOR_TOLERANCE;
            return (dsPos >= minX && dsPos <= maxX);
        });

        ds.visible = !collides;
    });
}