// js/logo.js
import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
let logoTexture = null;
const logoUrl = 'https://ubuildsb.com/wp-content/themes/U-Build/js/U-build-logo.png';
const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.6 });
const whitePlateMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0 });

export function createLogoGroup(geometry) {
    const group = new THREE.Group();
    if (!geometry || !geometry.logo) return group;

    if (!logoTexture) logoTexture = textureLoader.load(logoUrl);

    const logoWidth = 1.0;
    const logoHeight = 0.33;
    const plateThick = 0.08;

    const plateMesh = new THREE.Mesh(new THREE.BoxGeometry(logoWidth + 0.1, logoHeight + 0.1, plateThick), whitePlateMat);
    plateMesh.castShadow = true;
    group.add(plateMesh);

    const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(logoWidth + 0.12, logoHeight + 0.12, plateThick / 2), trimMat);
    frameMesh.position.z = -plateThick / 2;
    group.add(frameMesh);

    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, logoHeight), new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide }));
    logoMesh.position.z = plateThick / 2 + 0.005;
    group.add(logoMesh);

    group.position.set(geometry.logo.position.x, geometry.logo.position.y, geometry.logo.position.z);
    return group;
}