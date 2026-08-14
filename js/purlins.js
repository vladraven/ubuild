import * as THREE from 'three';

const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.5 });

export function createPurlinsGroup(width, length, height, pitchRatio, roofType, enabled) {
    const group = new THREE.Group();
    if (!enabled) return group;

    const wallThick = 0.1;
    const innerW = width - wallThick * 2;
    const innerL = length - wallThick * 2;

    const halfW = innerW / 2;
    const isG = roofType === 'gabled';
    const isLSloped = roofType === 'left-sloped';
    const isRSloped = roofType === 'right-sloped';

    const ang = Math.atan(pitchRatio);
    const pSize = 0.1; // Толщина прогона
    const stepDist = 1.2; 

    // Смещение: центр прогона должен быть ниже ската на половину его толщины
    const offset = pSize / 2; 

    function placePurlin(distFromEave, angle, sideDirection) {
        const purlin = new THREE.Mesh(new THREE.BoxGeometry(pSize, pSize, innerL), steelMat);
        
        // 1. Позиция на скате (центр сечения)
        const xOnSlope = sideDirection * (halfW - distFromEave * Math.cos(ang));
        const yOnSlope = height + distFromEave * Math.sin(ang);

        // 2. Смещение вектора позиции внутрь здания по нормали к скату
        // Нормаль к скату = (sin(angle), -cos(angle))
        const offsetX = offset * Math.sin(angle);
        const offsetY = -offset * Math.cos(Math.abs(angle));

        purlin.position.set(xOnSlope + offsetX, yOnSlope + offsetY, 0);
        purlin.rotation.z = angle;
        purlin.castShadow = true;
        group.add(purlin);
    }

    if (isG) {
        const numPurlins = Math.floor(halfW / (stepDist * Math.cos(ang)));
        for (let i = 1; i <= numPurlins; i++) {
            const dist = i * stepDist;
            placePurlin(dist, ang, 1);  // Левый скат
            placePurlin(dist, -ang, -1); // Правый скат
        }
    } else {
        const totalSpan = innerW / Math.cos(ang);
        const numPurlins = Math.floor(totalSpan / stepDist);
        const dir = isRSloped ? -1 : 1;
        const startX = isRSloped ? halfW : -halfW;

        for (let i = 1; i <= numPurlins; i++) {
            const dist = i * stepDist;
            
            const p = new THREE.Mesh(new THREE.BoxGeometry(pSize, pSize, innerL), steelMat);
            
            const posX = startX + dir * (dist * Math.cos(ang));
            const posY = height + dist * Math.sin(ang);
            
            // Применяем офсет к односкатной крыше
            const offsetX = offset * Math.sin(dir * ang);
            const offsetY = -offset * Math.cos(ang);
            
            p.position.set(posX + offsetX, posY + offsetY, 0);
            p.rotation.z = dir * ang;
            p.castShadow = true;
            group.add(p);
        }
    }

    return group;
}