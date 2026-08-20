import * as THREE from 'three';

const SEASONS_NORTH = Object.freeze({
    11: 'winter', 0: 'winter', 1: 'winter',
    2: 'spring', 3: 'spring', 4: 'spring',
    5: 'summer', 6: 'summer', 7: 'summer',
    8: 'autumn', 9: 'autumn', 10: 'autumn'
});

const SEASONS_SOUTH = Object.freeze({
    11: 'summer', 0: 'summer', 1: 'summer',
    2: 'autumn', 3: 'autumn', 4: 'autumn',
    5: 'winter', 6: 'winter', 7: 'winter',
    8: 'spring', 9: 'spring', 10: 'spring'
});

const SEASON_PROFILES = Object.freeze({
    winter: Object.freeze({
        groundColor: 0xe5ecf4,
        groundRoughness: 0.95,
        groundMetalness: 0.0,
        skyFogColor: 0xc9d7e8,
        ambientTint: 0xd4e4f7,
        vegetationDensity: 0.1
    }),
    spring: Object.freeze({
        groundColor: 0x5a7a42,
        groundRoughness: 0.85,
        groundMetalness: 0.0,
        skyFogColor: 0x8ec3eb,
        ambientTint: 0xf4f9e8,
        vegetationDensity: 0.6
    }),
    summer: Object.freeze({
        groundColor: 0x486b32,
        groundRoughness: 0.8,
        groundMetalness: 0.0,
        skyFogColor: 0x76b6e4,
        ambientTint: 0xffffff,
        vegetationDensity: 1.0
    }),
    autumn: Object.freeze({
        groundColor: 0x6e5d3b,
        groundRoughness: 0.9,
        groundMetalness: 0.0,
        skyFogColor: 0xa9c2d8,
        ambientTint: 0xfbeed9,
        vegetationDensity: 0.4
    })
});

function createProceduralGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#486b32';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.floor(Math.random() * 30);
        ctx.fillStyle = `rgba(${50 + shade}, ${80 + shade}, ${30 + shade}, 0.5)`;
        ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(80, 80);
    return texture;
}

export function getSeason(dateInput, hemisphere = 'north') {
    let month = 5;
    if (typeof dateInput === 'string') {
        const parts = dateInput.split('-');
        if (parts.length >= 2) {
            month = (parseInt(parts[1], 10) - 1) % 12;
        }
    } else if (dateInput instanceof Date) {
        month = dateInput.getMonth();
    }
    return hemisphere === 'south' ? SEASONS_SOUTH[month] : SEASONS_NORTH[month];
}

export function createEnvironmentSystem(initialConfig = {}) {
    let currentState = {
        date: initialConfig.date || '2026-06-21',
        hemisphere: initialConfig.hemisphere || 'north',
        weather: initialConfig.weather || 'clear',
        location: initialConfig.location || {
            latitude: 49.8951,
            longitude: -97.1384,
            timezone: 'America/Winnipeg'
        },
        season: 'summer'
    };
    currentState.season = getSeason(currentState.date, currentState.hemisphere);

    const group = new THREE.Group();
    group.name = 'environment-system';

    const groundGeometry = new THREE.PlaneGeometry(800, 800, 32, 32);
    groundGeometry.rotateX(-Math.PI / 2);

    const groundTexture = createProceduralGroundTexture();
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: SEASON_PROFILES.summer.groundColor,
        map: groundTexture,
        roughness: SEASON_PROFILES.summer.groundRoughness,
        metalness: SEASON_PROFILES.summer.groundMetalness
    });

    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.name = 'environment-ground';
    groundMesh.position.set(0, -0.01, 0);
    groundMesh.receiveShadow = true;
    group.add(groundMesh);

    function applyProfile(season, weather) {
        const profile = SEASON_PROFILES[season] || SEASON_PROFILES.summer;
        let groundColor = profile.groundColor;

        if (weather === 'snow') {
            groundColor = 0xf0f4f8;
        } else if (weather === 'rain') {
            groundColor = new THREE.Color(groundColor).multiplyScalar(0.7).getHex();
        }

        groundMaterial.color.setHex(groundColor);
        groundMaterial.roughness = weather === 'rain' ? 0.3 : profile.groundRoughness;
        groundMaterial.needsUpdate = true;
    }

    applyProfile(currentState.season, currentState.weather);

    function update(input = {}) {
        if (input.date !== undefined) currentState.date = input.date;
        if (input.hemisphere !== undefined) currentState.hemisphere = input.hemisphere;
        if (input.weather !== undefined) currentState.weather = input.weather;
        if (input.location !== undefined) currentState.location = input.location;

        currentState.season = getSeason(currentState.date, currentState.hemisphere);
        applyProfile(currentState.season, currentState.weather);

        return getState();
    }

    function updateBounds(buildingBounds) {
        if (buildingBounds && buildingBounds.center) {
            groundMesh.position.x = buildingBounds.center.x;
            groundMesh.position.z = buildingBounds.center.z;
        }
    }

    function getState() {
        const profile = SEASON_PROFILES[currentState.season];
        return Object.freeze({
            ...currentState,
            groundProfile: {
                color: groundMaterial.color.getHexString(),
                roughness: groundMaterial.roughness
            },
            atmosphericProfile: {
                fogColor: profile.skyFogColor,
                ambientTint: profile.ambientTint
            }
        });
    }

    function dispose() {
        groundGeometry.dispose();
        groundMaterial.dispose();
        groundTexture.dispose();
        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        group,
        update,
        updateBounds,
        getState,
        dispose
    });
}