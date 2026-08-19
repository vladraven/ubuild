// ================================================
// FILE: js/foundation.js
// ================================================
import * as THREE from 'three';

const concreteMat = new THREE.MeshStandardMaterial({ 
    color: 0xbdc3c7, 
    roughness: 0.8
});

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

export function createFoundationGroup(width, length, showLabels = true) {
    const group = new THREE.Group();
    const bc = window.ConfiguratorBackendConstraints || {};

    const foundationHeight = bc.max_foundation_height !== undefined 
        ? Math.min(bc.max_foundation_height, 0.6096) 
        : 0.45;

    const foundationLedge = 0.30; 
    const totalW = width + foundationLedge * 2;
    const totalL = length + foundationLedge * 2;

    // 1. Foundation Base Box
    const geo = new THREE.BoxGeometry(totalW, foundationHeight, totalL);
    const foundationMesh = new THREE.Mesh(geo, concreteMat);
    foundationMesh.position.set(0, -foundationHeight / 2 - 0.001, 0);
    foundationMesh.receiveShadow = true;
    foundationMesh.castShadow = true;
    group.add(foundationMesh);

    // 2. Interior Floor Slab
    const slabGeo = new THREE.BoxGeometry(width, 0.10, length);
    const slabMesh = new THREE.Mesh(slabGeo, concreteMat);
    slabMesh.position.set(0, -0.05, 0);
    slabMesh.receiveShadow = true;
    slabMesh.castShadow = true;
    group.add(slabMesh);

    // 3. Side Orientation Labels
    if (showLabels) {
        const off = width / 2 + 8;
        const labelY = 0.05;

        const lF = createTextLabel("Front");
        lF.position.set(0, labelY, length / 2 + foundationLedge + off);
        lF.rotation.set(-Math.PI / 2, 0, 0);
        group.add(lF);

        const lB = createTextLabel("Back");
        lB.position.set(0, labelY, -length / 2 - foundationLedge - off);
        lB.rotation.set(-Math.PI / 2, 0, Math.PI);
        group.add(lB);

        const lR = createTextLabel("Right");
        lR.position.set(width / 2 + foundationLedge + off, labelY, 0);
        lR.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        group.add(lR);

        const lL = createTextLabel("Left");
        lL.position.set(-width / 2 - foundationLedge - off, labelY, 0);
        lL.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
        group.add(lL);
    }

    return group;
}