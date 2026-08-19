// js/logo.js
import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
let logoTexture = null;
const logoUrl = 'https://ubuildsb.com/wp-content/themes/U-Build/js/U-build-logo.png';

const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.6 });
const whitePlateMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0 });

export function createLogoGroup(geometry) {
    const logoGroup = new THREE.Group();
    if (!geometry || !geometry.logo) return logoGroup;

    if (!logoTexture) {
        logoTexture = textureLoader.load(logoUrl);
    }

    const logoWidth = 1.0;
    const logoHeight = 0.33;
    const plateThick = 0.08;

    // 1. Подложка и рамка
    const plateGeo = new THREE.BoxGeometry(logoWidth + 0.1, logoHeight + 0.1, plateThick);
    const plateMesh = new THREE.Mesh(plateGeo, whitePlateMat);
    plateMesh.castShadow = true;
    plateMesh.receiveShadow = true;
    logoGroup.add(plateMesh);

    const frameGeo = new THREE.BoxGeometry(logoWidth + 0.12, logoHeight + 0.12, plateThick / 2);
    const frameMesh = new THREE.Mesh(frameGeo, trimMat);
    frameMesh.position.z = -plateThick / 2;
    logoGroup.add(frameMesh);

    // 2. Лицевая панель с текстурой
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide });
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, logoHeight), logoMat);
    logoMesh.position.z = plateThick / 2 + 0.005;
    logoGroup.add(logoMesh);

    // 3. Позиционирование из единой модели
    logoGroup.position.set(
        geometry.logo.position.x,
        geometry.logo.position.y,
        geometry.logo.position.z
    );

    return logoGroup;
}