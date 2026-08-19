// js/foundation.js
import * as THREE from 'three';
import { concreteMat } from './colorise.js';

function createTextLabel(txt) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(30,40,50,0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 124);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 256, 64);

    const m = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), m);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
}

export function createFoundationGroup(geometry, showLabels = true) {
    const group = new THREE.Group();
    if (!geometry || !geometry.foundation) return group;

    const fData = geometry.foundation;

    const geo = new THREE.BoxGeometry(fData.width, fData.height, fData.length);
    const foundationMesh = new THREE.Mesh(geo, concreteMat);
    foundationMesh.position.set(0, -fData.height / 2 - 0.001, 0);
    foundationMesh.receiveShadow = true;
    foundationMesh.castShadow = true;
    group.add(foundationMesh);

    const slabGeo = new THREE.BoxGeometry(
        fData.slab.width,
        fData.slab.height,
        fData.slab.length
    );

    const slabMesh = new THREE.Mesh(slabGeo, concreteMat);
    slabMesh.position.set(0, fData.slab.y, 0);
    slabMesh.receiveShadow = true;
    slabMesh.castShadow = true;
    group.add(slabMesh);

    if (showLabels) {
        const labels = fData.labels;

        const lF = createTextLabel("Front");
        lF.position.set(labels.F.x, labels.F.y, labels.F.z);
        lF.rotation.set(...labels.F.rotation);
        group.add(lF);

        const lB = createTextLabel("Back");
        lB.position.set(labels.B.x, labels.B.y, labels.B.z);
        lB.rotation.set(...labels.B.rotation);
        group.add(lB);

        const lR = createTextLabel("Right");
        lR.position.set(labels.R.x, labels.R.y, labels.R.z);
        lR.rotation.set(...labels.R.rotation);
        group.add(lR);

        const lL = createTextLabel("Left");
        lL.position.set(labels.L.x, labels.L.y, labels.L.z);
        lL.rotation.set(...labels.L.rotation);
        group.add(lL);
    }

    return group;
}