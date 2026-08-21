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

/**
 * Season visual profiles.
 * zenith / horizon — base sky gradient colors (daytime clear).
 * fogColor / ambientTint used by lighting & fog.
 */
const SEASON_PROFILES = Object.freeze({
    winter: Object.freeze({
        groundColor: 0xe5ecf4,
        groundRoughness: 0.95,
        groundMetalness: 0.0,
        zenithColor: 0xb8cce0,
        horizonColor: 0xd8e4f0,
        skyFogColor: 0xc9d7e8,
        ambientTint: 0xd4e4f7,
        vegetationDensity: 0.1,
        turbidity: 1.8,
        rayleigh: 1.2
    }),
    spring: Object.freeze({
        groundColor: 0x5a7a42,
        groundRoughness: 0.85,
        groundMetalness: 0.0,
        zenithColor: 0x5ba3d9,
        horizonColor: 0xa8d4f0,
        skyFogColor: 0x8ec3eb,
        ambientTint: 0xf4f9e8,
        vegetationDensity: 0.6,
        turbidity: 2.5,
        rayleigh: 2.0
    }),
    summer: Object.freeze({
        groundColor: 0x486b32,
        groundRoughness: 0.8,
        groundMetalness: 0.0,
        zenithColor: 0x3a8fd0,
        horizonColor: 0x87ceeb,
        skyFogColor: 0x76b6e4,
        ambientTint: 0xffffff,
        vegetationDensity: 1.0,
        turbidity: 3.0,
        rayleigh: 2.5
    }),
    autumn: Object.freeze({
        groundColor: 0x6e5d3b,
        groundRoughness: 0.9,
        groundMetalness: 0.0,
        zenithColor: 0x6a9fc0,
        horizonColor: 0xc4b89a,
        skyFogColor: 0xa9c2d8,
        ambientTint: 0xfbeed9,
        vegetationDensity: 0.4,
        turbidity: 4.0,
        rayleigh: 1.8
    })
});

/** Phase multipliers for sky colors & atmosphere */
const PHASE_SKY = Object.freeze({
    night: Object.freeze({
        zenithMul: [0.04, 0.06, 0.12],
        horizonMul: [0.08, 0.10, 0.18],
        sunVisibility: 0.0,
        exposure: 0.35
    }),
    sunrise: Object.freeze({
        zenithMul: [0.55, 0.45, 0.55],
        horizonMul: [1.4, 0.75, 0.45],
        sunVisibility: 0.9,
        exposure: 0.85
    }),
    day: Object.freeze({
        zenithMul: [1.0, 1.0, 1.0],
        horizonMul: [1.0, 1.0, 1.0],
        sunVisibility: 1.0,
        exposure: 1.0
    }),
    sunset: Object.freeze({
        zenithMul: [0.50, 0.35, 0.45],
        horizonMul: [1.5, 0.55, 0.30],
        sunVisibility: 0.85,
        exposure: 0.8
    })
});

/** Weather overrides applied on top of season + phase */
const WEATHER_MOD = Object.freeze({
    clear: Object.freeze({
        fogDensity: 0.0008,
        skyDesaturate: 0.0,
        skyDarken: 0.0,
        cloudCover: 0.0,
        turbidityBoost: 0.0
    }),
    cloudy: Object.freeze({
        fogDensity: 0.0018,
        skyDesaturate: 0.35,
        skyDarken: 0.15,
        cloudCover: 0.65,
        turbidityBoost: 4.0
    }),
    rain: Object.freeze({
        fogDensity: 0.0045,
        skyDesaturate: 0.55,
        skyDarken: 0.35,
        cloudCover: 0.85,
        turbidityBoost: 8.0
    }),
    snow: Object.freeze({
        fogDensity: 0.0035,
        skyDesaturate: 0.4,
        skyDarken: 0.2,
        cloudCover: 0.7,
        turbidityBoost: 5.0
    }),
    fog: Object.freeze({
        fogDensity: 0.012,
        skyDesaturate: 0.6,
        skyDarken: 0.25,
        cloudCover: 0.9,
        turbidityBoost: 12.0
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
    texture.userData = { isSharedProcedural: true };
    return texture;
}

/**
 * Simple analytic sky shader (gradient + sun disc + optional haze).
 * Driven by uniforms that we update from season / phase / weather.
 */
const SkyShader = {
    uniforms: {
        uZenithColor: { value: new THREE.Color(0x3a8fd0) },
        uHorizonColor: { value: new THREE.Color(0x87ceeb) },
        uSunPosition: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xfffaf0) },
        uSunIntensity: { value: 1.0 },
        uSunAngularSize: { value: 0.025 },
        uExposure: { value: 1.0 },
        uCloudCover: { value: 0.0 },
        uHaze: { value: 0.0 }
    },
    vertexShader: /* glsl */`
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position.z = gl_Position.w; // force to far plane
        }
    `,
    fragmentShader: /* glsl */`
        uniform vec3 uZenithColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunPosition;
        uniform vec3 uSunColor;
        uniform float uSunIntensity;
        uniform float uSunAngularSize;
        uniform float uExposure;
        uniform float uCloudCover;
        uniform float uHaze;

        varying vec3 vWorldPosition;

        void main() {
            vec3 dir = normalize(vWorldPosition);
            float elev = dir.y; // -1..1

            // Base gradient (smoothstep for natural falloff)
            float t = smoothstep(-0.15, 0.65, elev);
            vec3 sky = mix(uHorizonColor, uZenithColor, t);

            // Slight horizon glow
            float horizonGlow = exp(-pow(elev * 4.0, 2.0)) * 0.15;
            sky += uHorizonColor * horizonGlow;

            // Haze / overcast desaturation & brightening near horizon
            float hazeFactor = uHaze * (1.0 - elev * 0.5);
            sky = mix(sky, vec3(dot(sky, vec3(0.299, 0.587, 0.114))), hazeFactor * 0.6);
            sky = mix(sky, sky * 0.85 + vec3(0.1), hazeFactor * 0.4);

            // Soft cloud cover (simple noise-less darkening + gray wash)
            if (uCloudCover > 0.01) {
                float cloud = uCloudCover * (0.55 + 0.45 * (1.0 - elev));
                vec3 cloudColor = mix(sky, vec3(0.55, 0.58, 0.62), 0.7);
                sky = mix(sky, cloudColor, cloud);
            }

            // Sun disc
            vec3 sunDir = normalize(uSunPosition);
            float cosAngle = dot(dir, sunDir);
            float sunDisk = smoothstep(
                cos(uSunAngularSize * 1.8),
                cos(uSunAngularSize * 0.6),
                cosAngle
            );
            float sunGlow = pow(max(0.0, cosAngle), 32.0) * 0.35 * uSunIntensity;

            sky += uSunColor * (sunDisk * 2.5 + sunGlow) * uSunIntensity;

            // Exposure & gamma-ish tone
            sky *= uExposure;
            sky = sky / (sky + vec3(1.0)); // simple Reinhard
            sky = pow(sky, vec3(1.0 / 1.8));

            gl_FragColor = vec4(sky, 1.0);
        }
    `
};

function createSkyMesh() {
    const geometry = new THREE.SphereGeometry(4000, 32, 16);
    const material = new THREE.ShaderMaterial({
        name: 'UBuildSkyShader',
        uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms),
        vertexShader: SkyShader.vertexShader,
        fragmentShader: SkyShader.fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'environment-sky';
    mesh.frustumCulled = false;
    mesh.renderOrder = -1000;
    return mesh;
}

function mulColor(hex, mul) {
    const c = new THREE.Color(hex);
    c.r = Math.min(1, Math.max(0, c.r * mul[0]));
    c.g = Math.min(1, Math.max(0, c.g * mul[1]));
    c.b = Math.min(1, Math.max(0, c.b * mul[2]));
    return c;
}

function desaturateColor(color, amount) {
    const c = color.clone();
    const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
    c.r += (lum - c.r) * amount;
    c.g += (lum - c.g) * amount;
    c.b += (lum - c.b) * amount;
    return c;
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

/**
 * Creates the full environment system (ground + procedural sky + fog state).
 */
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
        season: 'summer',
        phase: 'day',
        solar: null
    };
    currentState.season = getSeason(currentState.date, currentState.hemisphere);

    const group = new THREE.Group();
    group.name = 'environment-system';

    // --- Ground ---
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

    // --- Sky dome ---
    const skyMesh = createSkyMesh();
    group.add(skyMesh);

    // Fog state (applied to scene externally)
    let fogColor = new THREE.Color(SEASON_PROFILES.summer.skyFogColor);
    let fogDensity = WEATHER_MOD.clear.fogDensity;

    function applyProfile(season, weather, phase = 'day', solar = null) {
        const profile = SEASON_PROFILES[season] || SEASON_PROFILES.summer;
        const weatherMod = WEATHER_MOD[weather] || WEATHER_MOD.clear;
        const phaseCfg = PHASE_SKY[phase] || PHASE_SKY.day;

        // Ground
        let groundColor = profile.groundColor;
        if (weather === 'snow') {
            groundColor = 0xf0f4f8;
        } else if (weather === 'rain') {
            groundColor = new THREE.Color(groundColor).multiplyScalar(0.7).getHex();
        }

        groundMaterial.color.setHex(groundColor);
        groundMaterial.roughness = weather === 'rain' ? 0.3 : profile.groundRoughness;
        groundMaterial.needsUpdate = true;

        // Sky colors
        let zenith = mulColor(profile.zenithColor, phaseCfg.zenithMul);
        let horizon = mulColor(profile.horizonColor, phaseCfg.horizonMul);

        zenith = desaturateColor(zenith, weatherMod.skyDesaturate);
        horizon = desaturateColor(horizon, weatherMod.skyDesaturate);

        zenith.multiplyScalar(1.0 - weatherMod.skyDarken);
        horizon.multiplyScalar(1.0 - weatherMod.skyDarken * 0.7);

        const uniforms = skyMesh.material.uniforms;
        uniforms.uZenithColor.value.copy(zenith);
        uniforms.uHorizonColor.value.copy(horizon);
        uniforms.uExposure.value = phaseCfg.exposure * (1.0 - weatherMod.skyDarken * 0.3);
        uniforms.uCloudCover.value = weatherMod.cloudCover;
        uniforms.uHaze.value = Math.min(1.0, weatherMod.turbidityBoost / 15.0);
        uniforms.uSunIntensity.value = phaseCfg.sunVisibility * (weather === 'fog' ? 0.3 : 1.0);

        // Sun position from solar state
        if (solar && typeof solar.elevation === 'number') {
            const elevRad = Math.max(-0.1, solar.elevation) * (Math.PI / 180);
            const azRad = (solar.azimuth - 90) * (Math.PI / 180); // match LightingSystem convention
            const sunDir = new THREE.Vector3(
                Math.cos(elevRad) * Math.cos(azRad),
                Math.sin(elevRad),
                Math.cos(elevRad) * Math.sin(azRad)
            ).normalize();
            uniforms.uSunPosition.value.copy(sunDir);

            // Warm sun color at low elevation
            if (phase === 'sunrise' || phase === 'sunset') {
                uniforms.uSunColor.value.setHex(0xffa05c);
            } else if (phase === 'night') {
                uniforms.uSunColor.value.setHex(0xaaccff);
            } else {
                uniforms.uSunColor.value.setHex(0xfffaf0);
            }
        } else {
            uniforms.uSunPosition.value.set(0, 1, 0);
            uniforms.uSunColor.value.setHex(0xfffaf0);
        }

        // Fog
        fogColor = new THREE.Color(profile.skyFogColor);
        fogColor = desaturateColor(fogColor, weatherMod.skyDesaturate * 0.5);
        fogColor.multiplyScalar(1.0 - weatherMod.skyDarken * 0.4);
        fogDensity = weatherMod.fogDensity;

        // Night fog darker
        if (phase === 'night') {
            fogColor.multiplyScalar(0.25);
            fogDensity *= 1.4;
        }
    }

    applyProfile(currentState.season, currentState.weather, currentState.phase, currentState.solar);

    /**
     * Update environment.
     * Accepts date / hemisphere / weather / location and optional solarState (from getSolarState).
     */
    function update(input = {}) {
        if (input.date !== undefined) currentState.date = input.date;
        if (input.hemisphere !== undefined) currentState.hemisphere = input.hemisphere;
        if (input.weather !== undefined) currentState.weather = input.weather;
        if (input.location !== undefined) currentState.location = input.location;
        if (input.solar !== undefined) currentState.solar = input.solar;
        if (input.phase !== undefined) currentState.phase = input.phase;
        else if (currentState.solar && currentState.solar.phase) {
            currentState.phase = currentState.solar.phase;
        }

        currentState.season = getSeason(currentState.date, currentState.hemisphere);
        applyProfile(
            currentState.season,
            currentState.weather,
            currentState.phase,
            currentState.solar
        );

        return getState();
    }

    function updateBounds(buildingBounds) {
        if (buildingBounds && buildingBounds.center) {
            groundMesh.position.x = buildingBounds.center.x;
            groundMesh.position.z = buildingBounds.center.z;
        }
    }

    /** Apply fog & background color to the given scene */
    function applyToScene(scene) {
        if (!scene) return;
        scene.background = fogColor.clone();
        if (!scene.fog || !(scene.fog instanceof THREE.FogExp2)) {
            scene.fog = new THREE.FogExp2(fogColor.getHex(), fogDensity);
        } else {
            scene.fog.color.copy(fogColor);
            scene.fog.density = fogDensity;
        }
    }

    function getState() {
        const profile = SEASON_PROFILES[currentState.season] || SEASON_PROFILES.summer;
        return Object.freeze({
            ...currentState,
            groundProfile: {
                color: groundMaterial.color.getHexString(),
                roughness: groundMaterial.roughness
            },
            skyProfile: {
                zenith: skyMesh.material.uniforms.uZenithColor.value.getHexString(),
                horizon: skyMesh.material.uniforms.uHorizonColor.value.getHexString(),
                cloudCover: skyMesh.material.uniforms.uCloudCover.value,
                exposure: skyMesh.material.uniforms.uExposure.value
            },
            atmosphericProfile: {
                fogColor: fogColor.getHexString(),
                fogDensity,
                ambientTint: profile.ambientTint,
                turbidity: profile.turbidity,
                rayleigh: profile.rayleigh
            }
        });
    }

    function dispose() {
        groundGeometry.dispose();
        groundMaterial.dispose();
        groundTexture.dispose();
        skyMesh.geometry.dispose();
        skyMesh.material.dispose();
        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        group,
        skyMesh,
        update,
        updateBounds,
        applyToScene,
        getState,
        dispose
    });
}