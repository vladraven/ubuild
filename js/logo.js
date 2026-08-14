import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
let logoTexture = null;
const logoUrl = 'https://ubuildsb.com/wp-content/themes/U-Build/js/U-build-logo.png';

const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.6 });
const whitePlateMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4, metalness: 0 });

export function createLogoGroup(width, length, height, pitchRatio, roofType) {
    const logoGroup = new THREE.Group();

    if (!logoTexture) {
        logoTexture = textureLoader.load(logoUrl);
    }

    const logoWidth = 1.0;
    const logoHeight = 0.33;
    const plateThick = 0.08;
    const margin = 0.15; // Зазор от карниза/крыши

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

    // 2. Лицевая панель с логотипом
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide });
    const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(logoWidth, logoHeight), logoMat);
    logoMesh.position.z = plateThick / 2 + 0.005;
    logoGroup.add(logoMesh);

    // 3. Динамический расчет высоты размещения
    const halfW = width / 2;
    const halfL = length / 2;
    const wallThick = 0.05;
    const halfPlateW = (logoWidth + 0.12) / 2;
    const halfPlateH = (logoHeight + 0.12) / 2;

    const isG = roofType === 'gabled';
    const isLSloped = roofType === 'left-sloped';
    const isRSloped = roofType === 'right-sloped';
    const isSingle = isLSloped || isRSloped;

    const totalRise = isSingle ? width * pitchRatio : halfW * pitchRatio;

    // Вычисляем высоту крыши над левым и правым углом рамки
    let roofHAtLeftCorner = height;
    let roofHAtRightCorner = height;

    if (isG) {
        roofHAtLeftCorner = height + (halfW - halfPlateW) * pitchRatio;
        roofHAtRightCorner = height + (halfW - halfPlateW) * pitchRatio;
    } else if (isLSloped) {
        // Подъём слева направо (левая сторона ниже)
        roofHAtLeftCorner = height + (halfW - halfPlateW) * pitchRatio;
        roofHAtRightCorner = height + (halfW + halfPlateW) * pitchRatio;
    } else if (isRSloped) {
        // Подъём справа налево (правая сторона ниже)
        roofHAtLeftCorner = height + (halfW + halfPlateW) * pitchRatio;
        roofHAtRightCorner = height + (halfW - halfPlateW) * pitchRatio;
    }

    // Наименьшая точка кровли над плашкой
    const minAvailableRoofH = Math.min(roofHAtLeftCorner, roofHAtRightCorner);

    // Центрирование с учётом безопасности
    const maxTopY = minAvailableRoofH - margin;
    const targetY = maxTopY - halfPlateH;

    const plateZPos = halfL + wallThick + plateThick / 2;

    logoGroup.position.set(0, targetY, plateZPos);

    return logoGroup;
}