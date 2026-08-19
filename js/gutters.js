// js/gutters.js
import * as THREE from 'three';
import { trimMat, eaveTrimMat, steelMat } from './colorise.js';

export const GUTTER_CONFIG = {
    gutter: {
        lengthOffset: 0.0,
        widthOffset: 0.0,
        offsetX: 0.0
    },
    pipe: {
        width: 0.08,
        depth: 0.06
    }
};

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

    if (len < 0.002) return;

    const angle = Math.atan2(dx, -dy);
    const geo = createRectPipeGeo(len);
    const mesh = new THREE.Mesh(geo, pipeMat);

    mesh.position.set(
        (xA + xB) / 2,
        (yA + yB) / 2,
        zPos
    );

    mesh.rotation.z = angle;
    mesh.castShadow = true;
    mesh.renderOrder = 5;

    group.add(mesh);
}

function createDownspout(dsData) {
    const group = new THREE.Group();
    const pipeMat = trimMat;

    const xGutterOutlet = dsData.xGutterOutlet;
    const yGutterOutlet = dsData.yGutterOutlet;
    const xWall = dsData.xWall;
    const yBottom = Math.max(0.02, dsData.groundOffset);

    const topDrop = Math.max(
        0.30,
        Math.abs(xGutterOutlet - xWall) * 1.4
    );

    const yElbowEnd = yGutterOutlet - topDrop;
    const yElbowMid = yGutterOutlet - 0.08;

    addPipeSegment(
        group,
        xGutterOutlet,
        yGutterOutlet,
        xGutterOutlet,
        yElbowMid,
        0,
        pipeMat
    );

    addPipeSegment(
        group,
        xGutterOutlet,
        yElbowMid,
        xWall,
        yElbowEnd,
        0,
        pipeMat
    );

    const yShoeStart = yBottom + 0.20;

    if (yElbowEnd > yShoeStart) {
        addPipeSegment(
            group,
            xWall,
            yElbowEnd,
            xWall,
            yShoeStart,
            0,
            pipeMat
        );
    }

    const shoeLen = 0.20;
    const shoeAngle = Math.PI / 4;

    const xShoeEnd =
        xWall +
        dsData.sideX * (shoeLen * Math.sin(shoeAngle));

    const yShoeEnd =
        yShoeStart -
        (shoeLen * Math.cos(shoeAngle));

    addPipeSegment(
        group,
        xWall,
        yShoeStart,
        xShoeEnd,
        yShoeEnd,
        0,
        pipeMat
    );

    const strapGeo = new THREE.BoxGeometry(
        GUTTER_CONFIG.pipe.width * 1.3,
        0.02,
        GUTTER_CONFIG.pipe.depth * 1.3
    );

    const strapMat = steelMat;

    const span = yElbowEnd - yShoeStart;

    if (span > 0.6) {
        const strapCount = Math.max(
            2,
            Math.floor(span / 2.2)
        );

        for (let i = 0; i <= strapCount; i++) {
            const yPos =
                yShoeStart +
                0.15 +
                (span - 0.3) * (i / strapCount);

            const bracket = new THREE.Mesh(
                strapGeo,
                strapMat
            );

            bracket.position.set(
                xWall,
                yPos,
                0
            );

            bracket.castShadow = true;
            bracket.renderOrder = 6;

            group.add(bracket);
        }
    }

    return group;
}

export function createGuttersGroup(geometry, enabled = true) {
    const group = new THREE.Group();

    if (!enabled || !geometry || !geometry.gutters) {
        return group;
    }

    const gData = geometry.gutters;
    const gutterOffsetY = gData.config.gutterOffsetY;

    const gutterL = createGutter(gData.length);

    gutterL.scale.x = -1;

    gutterL.position.set(
        gData.eaves.left.x + GUTTER_CONFIG.gutter.offsetX,
        gData.eaves.left.y + gutterOffsetY,
        gData.zOffset
    );

    group.add(gutterL);

    const gutterR = createGutter(gData.length);

    gutterR.position.set(
        gData.eaves.right.x - GUTTER_CONFIG.gutter.offsetX,
        gData.eaves.right.y + gutterOffsetY,
        gData.zOffset
    );

    group.add(gutterR);

    gData.downspouts.forEach(dsData => {
        const ds = createDownspout(dsData);

        ds.position.set(
            0,
            0,
            dsData.zPos
        );

        ds.visible = dsData.visible;

        group.add(ds);
    });

    return group;
}