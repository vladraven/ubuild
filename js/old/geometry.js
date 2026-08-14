import * as THREE from 'three';
import { openingDefs } from './state.js';
import { frameMat, glassMat, panelMat, trimMat } from './materials.js';

const EPSILON = 0.0005;

export function parsePitchStringToRatio(pitchStr) {
    if (!pitchStr || typeof pitchStr !== 'string' || !pitchStr.includes(':')) {
        const num = parseFloat(pitchStr);
        return isNaN(num) ? 0.05 : num;
    }
    const parts = pitchStr.split(':');
    const rise = parseFloat(parts[0]);
    const run = parseFloat(parts[1]) || 12;
    if (isNaN(rise)) return 0.05;
    return rise / run;
}

export function formatRatioToPitchString(ratio) {
    const rise = Math.round(ratio * 12 * 100) / 100;
    return `${rise}:12`;
}

export const profileGeoConfigs = {
    'ws200': { tileW: 0.80, ribs: [{ pos: 0.00, d: 0.06, w: 0.04 }, { pos: 0.38, d: 0.06, w: 0.04 }] },
    'ws279': { tileW: 0.90, ribs: [{ pos: 0.00, d: 0.06, w: 0.04 }, { pos: 0.43, d: 0.06, w: 0.04 }] },
    'snap16': { tileW: 0.40, ribs: [{ pos: 0.00, d: 0.04, w: 0.02 }] },
    'snap12': { tileW: 0.30, ribs: [{ pos: 0.00, d: 0.04, w: 0.02 }] },
    'ssr24': { tileW: 0.30, ribs: [{ pos: 0.00, d: 0.04, w: 0.02 }] },
    'tough': { tileW: 0.50, ribs: [{ pos: 0.05, d: 0.06, w: 0.08 }, { pos: 0.25, d: 0.06, w: 0.08 }] },
    'awr': { tileW: 0.50, ribs: [{ pos: 0.05, d: 0.06, w: 0.08 }, { pos: 0.25, d: 0.06, w: 0.08 }] },
    'rainbow': { tileW: 0.76, ribs: [{ pos: 0.00, d: 0.05, w: 0.10 }, { pos: 0.25, d: 0.05, w: 0.10 }, { pos: 0.50, d: 0.05, w: 0.10 }] },
    '936': { tileW: 0.914, ribs: [{ pos: 0.00, d: 0.08, w: 0.06 }, { pos: 0.30, d: 0.08, w: 0.06 }, { pos: 0.61, d: 0.08, w: 0.06 }] },
    'diamond36': { tileW: 0.914, ribs: [{ pos: 0.00, d: 0.07, w: 0.05 }, { pos: 0.20, d: 0.04, w: 0.03 }, { pos: 0.46, d: 0.07, w: 0.05 }, { pos: 0.66, d: 0.04, w: 0.03 }] },
    'diamond30': { tileW: 0.762, ribs: [{ pos: 0.00, d: 0.07, w: 0.05 }, { pos: 0.18, d: 0.04, w: 0.03 }, { pos: 0.38, d: 0.07, w: 0.05 }, { pos: 0.56, d: 0.04, w: 0.03 }] },
    'corr78': { tileW: 0.686, ribs: [{ pos: 0.00, d: 0.022, w: 0.048 }, { pos: 0.096, d: 0.022, w: 0.048 }, { pos: 0.192, d: 0.022, w: 0.048 }, { pos: 0.288, d: 0.022, w: 0.048 }, { pos: 0.384, d: 0.022, w: 0.048 }, { pos: 0.480, d: 0.022, w: 0.048 }, { pos: 0.576, d: 0.022, w: 0.048 }] },
    'corr12': { tileW: 0.30, ribs: [{ pos: 0.00, d: 0.012, w: 0.030 }, { pos: 0.06, d: 0.012, w: 0.030 }, { pos: 0.12, d: 0.012, w: 0.030 }, { pos: 0.18, d: 0.012, w: 0.030 }, { pos: 0.24, d: 0.012, w: 0.030 }] },
    'diamondLap': { tileW: 0.914, ribs: [{ pos: 0.00, d: 0.07, w: 0.05 }, { pos: 0.30, d: 0.04, w: 0.03 }, { pos: 0.46, d: 0.07, w: 0.05 }, { pos: 0.76, d: 0.04, w: 0.03 }] },
    'widespan': { tileW: 1.00, ribs: [{ pos: 0.00, d: 0.08, w: 0.06 }, { pos: 0.50, d: 0.08, w: 0.06 }] },
    'elite': { tileW: 0.40, ribs: [{ pos: 0.00, d: 0.04, w: 0.02 }, { pos: 0.20, d: 0.02, w: 0.015 }] },
    'ultra': { tileW: 0.60, ribs: [{ pos: 0.00, d: 0.05, w: 0.04 }, { pos: 0.15, d: 0.03, w: 0.025 }, { pos: 0.30, d: 0.05, w: 0.04 }, { pos: 0.45, d: 0.03, w: 0.025 }] },
    'delta': { tileW: 0.50, ribs: [{ pos: 0.00, d: 0.06, w: 0.05 }, { pos: 0.25, d: 0.06, w: 0.05 }] },
    'wd36': { tileW: 0.914, ribs: [{ pos: 0.00, d: 0.07, w: 0.05 }, { pos: 0.30, d: 0.07, w: 0.05 }, { pos: 0.61, d: 0.07, w: 0.05 }] },
    'imp': { tileW: 1.00, ribs: [] },
};

export function createBox(w, h, d, mat, dx = 0, dy = 0, dz = 0) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(dx, dy, dz);
    return b;
}

export function createIBeam(len, depth, width, thick, mat) {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, -depth / 2);
    s.lineTo(width / 2, -depth / 2);
    s.lineTo(width / 2, -depth / 2 + thick);
    s.lineTo(thick / 2, -depth / 2 + thick);
    s.lineTo(thick / 2, depth / 2 - thick);
    s.lineTo(width / 2, depth / 2 - thick);
    s.lineTo(width / 2, depth / 2);
    s.lineTo(-width / 2, depth / 2);
    s.lineTo(-width / 2, depth / 2 - thick);
    s.lineTo(-thick / 2, depth / 2 - thick);
    s.lineTo(-thick / 2, -depth / 2 + thick);
    s.lineTo(-width / 2, -depth / 2 + thick);
    s.lineTo(-width / 2, -depth / 2);
    
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    return new THREE.Mesh(geo, mat);
}

export function createRibbedGeo(w, h, totalH, yOff = 0, profileCfg = null) {
    const cfg = profileCfg || { tileW: 0.50, ribs: [{ pos: 0.05, d: 0.05, w: 0.15 }] };
    const { tileW, ribs } = cfg;
    
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    
    let x = 0;
    while (x < w) {
        ribs.forEach(rib => {
            const ribX = x + rib.pos;
            if (ribX >= w) return;
            s.lineTo(ribX, 0);
            const ribEnd = Math.min(ribX + rib.w, w);
            s.lineTo(ribX + rib.w * 0.25, rib.d);
            s.lineTo(ribX + rib.w * 0.75, rib.d);
            s.lineTo(ribEnd, 0);
        });
        x += tileW;
    }
    s.lineTo(w, 0);
    s.lineTo(w, -0.05); // Толщина листа наружу
    s.lineTo(0, -0.05);
    s.lineTo(0, 0);
    
    // Выдавливаем строго по вертикали (h - это высота стены)
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
    
    // Поворачиваем геометрию, чтобы ребра шли вертикально по Y, а ширина была по X
    geo.rotateX(-Math.PI / 2);
    
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        uvs[i * 2] = pos.getX(i) / w; 
        uvs[i * 2 + 1] = (pos.getY(i) + yOff) / totalH;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    // Переводим в NonIndexed для обеспечения flatShading (четкие грани)
    const nonIndexedGeo = geo.toNonIndexed();
    nonIndexedGeo.computeVertexNormals();
    return nonIndexedGeo;
}

export function createRoofGeo(pW, eL, t = 0.1, profileCfg = null) {
    const cfg = profileCfg || { tileW: 0.50, ribs: [{ pos: 0.05, d: 0.05, w: 0.15 }] };
    const { tileW, ribs } = cfg;
    const s = new THREE.Shape();
    s.moveTo(0, -t); s.lineTo(0, 0);
    let x = 0; let lastX = 0;
    while (x < pW) {
        ribs.forEach(rib => {
            const ribX = x + rib.pos;
            if (ribX >= pW) return;
            s.lineTo(ribX, 0);
            const ribEnd = Math.min(ribX + rib.w, pW);
            s.lineTo(ribX + rib.w * 0.25, rib.d);
            s.lineTo(ribX + rib.w * 0.75, rib.d);
            s.lineTo(ribEnd, 0);
            lastX = ribEnd;
        });
        x += tileW; lastX = x;
    }
    s.lineTo(lastX, 0); s.lineTo(lastX, -t); s.lineTo(0, -t);
    return new THREE.ExtrudeGeometry(s, { depth: eL, bevelEnabled: false });
}

export function createTextLabel(txt) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(30,40,50,0.85)'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 508, 124);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, 256, 64);
    const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), m);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
}

export function buildOpeningMesh(op) {
    const grp = new THREE.Group();
    const def = openingDefs[op.type];
    const w = op.w || def.w, h = op.h || def.h, d = 0.2, f = 0.05;
    grp.add(createBox(w, f, d, frameMat, 0, -h / 2 + f / 2, 0));
    grp.add(createBox(w, f, d, frameMat, 0, h / 2 - f / 2, 0));
    grp.add(createBox(f, h - f * 2, d, frameMat, -w / 2 + f / 2, 0, 0));
    grp.add(createBox(f, h - f * 2, d, frameMat, w / 2 - f / 2, 0, 0));

    if (op.type === "Window") {
        grp.add(createBox(w - f * 2, h - f * 2, 0.02, glassMat, 0, 0, 0));
    } else if (op.type === "Walk Door Solid") {
        grp.add(createBox(w - f * 2, h - f, d - 0.05, panelMat, 0, f / 2, 0));
        grp.add(createBox(0.05, 0.2, 0.3, trimMat, w / 2 - 0.15, 0, 0));
    } else if (op.type === "Walk Door Solid Double") {
        grp.add(createBox(0.02, h - f, d, frameMat, 0, f / 2, 0));
        grp.add(createBox(w / 2 - f, h - f, d - 0.05, panelMat, -w / 4, f / 2, 0));
        grp.add(createBox(w / 2 - f, h - f, d - 0.05, panelMat, w / 4, f / 2, 0));
        grp.add(createBox(0.05, 0.2, 0.3, trimMat, -0.1, 0, 0));
        grp.add(createBox(0.05, 0.2, 0.3, trimMat, 0.1, 0, 0));
    } else if (op.type === "Overhead Panel Door") {
        const pw = w - f * 2, ph = (h - f) / 4;
        for (let i = 0; i < 4; i++) {
            grp.add(createBox(pw, ph - 0.02, d - 0.05, panelMat, 0, -h / 2 + f + ph * i + ph / 2, 0));
        }
    } else if (op.type === "Bi-Fold Door") {
        const pw = w - f * 2, ph = (h - f) / 2, zOffsetOutside = 0.22;
        const bottomPanel = createBox(pw, ph - 0.01, d - 0.05, panelMat, 0, -h / 4 + f / 2, zOffsetOutside);
        bottomPanel.rotation.x = 0.1; grp.add(bottomPanel);
        const topPanel = createBox(pw, ph - 0.01, d - 0.05, panelMat, 0, h / 4 + f / 2, zOffsetOutside);
        topPanel.rotation.x = -0.1; grp.add(topPanel);
    } else if (op.type === "Hydraulic Door") {
        const p = createBox(w, h, d - 0.05, panelMat, 0, h / 4, h / 4);
        p.rotation.x = -0.3; grp.add(p);
    }
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.z = 0.3; grp.add(hit);
    return { mesh: grp, hit };
}