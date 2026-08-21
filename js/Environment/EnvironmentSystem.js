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

/** Map season name -> ground texture filename (next to this module) */
const SEASON_GROUND_FILES = Object.freeze({
    winter: 'winter.jpg',
    spring: 'spring.jpg',
    summer: 'summer.jpg',
    autumn: 'fall.jpg'
});

const SEASON_PROFILES = Object.freeze({
    winter: Object.freeze({
        groundColor: 0xe8eef4,
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
        groundColor: 0x6a9a4a,
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
        groundColor: 0x4a7a32,
        groundRoughness: 0.82,
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
        groundColor: 0x8a6e3c,
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

const WEATHER_MOD = Object.freeze({
    clear: Object.freeze({
        fogDensity: 0.00045,
        skyDesaturate: 0.0,
        skyDarken: 0.0,
        cloudCover: 0.75,
        cloudOpacity: 0.95,
        turbidityBoost: 0.0,
        lightMul: 1.0
    }),
    cloudy: Object.freeze({
        fogDensity: 0.0014,
        skyDesaturate: 0.28,
        skyDarken: 0.1,
        cloudCover: 0.88,
        cloudOpacity: 0.96,
        turbidityBoost: 4.0,
        lightMul: 0.75
    }),
    rain: Object.freeze({
        fogDensity: 0.0038,
        skyDesaturate: 0.5,
        skyDarken: 0.3,
        cloudCover: 0.95,
        cloudOpacity: 0.98,
        turbidityBoost: 8.0,
        lightMul: 0.5
    }),
    snow: Object.freeze({
        fogDensity: 0.003,
        skyDesaturate: 0.32,
        skyDarken: 0.16,
        cloudCover: 0.85,
        cloudOpacity: 0.94,
        turbidityBoost: 5.0,
        lightMul: 0.65
    }),
    fog: Object.freeze({
        fogDensity: 0.01,
        skyDesaturate: 0.5,
        skyDarken: 0.2,
        cloudCover: 0.98,
        cloudOpacity: 0.75,
        turbidityBoost: 12.0,
        lightMul: 0.4
    })
});

/** Resolve URL for seasonal JPG next to this module */
function resolveSeasonTextureUrl(filename) {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.url) {
            return new URL('./' + filename, import.meta.url).href;
        }
    } catch (_) { /* ignore */ }

    const themeBase =
        (typeof window !== 'undefined' && window.UBUILD_CONFIG && window.UBUILD_CONFIG.themeUrl) ||
        '';
    if (themeBase) {
        return `${String(themeBase).replace(/\/$/, '')}/js/Environment/${filename}`;
    }
    return `js/Environment/${filename}`;
}

function createProceduralGroundTexture(baseHex = 0x486b32) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const c = new THREE.Color(baseHex);
    const r = Math.floor(c.r * 255);
    const g = Math.floor(c.g * 255);
    const b = Math.floor(c.b * 255);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const shade = Math.floor(Math.random() * 40) - 20;
        ctx.fillStyle = `rgba(${Math.max(0, r + shade)},${Math.max(0, g + shade)},${Math.max(0, b + shade)},0.45)`;
        ctx.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(120, 120);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    texture.userData = { isSharedProcedural: true };
    return texture;
}

/**
 * Sky shader with FBM clouds, sun disc, haze, weather-driven cover.
 */
const SkyShader = {
    uniforms: {
        uZenithColor: { value: new THREE.Color(0x3a8fd0) },
        uHorizonColor: { value: new THREE.Color(0x87ceeb) },
        uSunPosition: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xfffaf0) },
        uSunIntensity: { value: 1.0 },
        uSunAngularSize: { value: 0.022 },
        uExposure: { value: 1.0 },
        uCloudCover: { value: 0.75 },
        uCloudOpacity: { value: 0.95 },
        uHaze: { value: 0.0 },
        uTime: { value: 0.0 },
        uCloudSpeed: { value: 0.025 }
    },
    vertexShader: /* glsl */`
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position.z = gl_Position.w;
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
        uniform float uCloudOpacity;
        uniform float uHaze;
        uniform float uTime;
        uniform float uCloudSpeed;

        varying vec3 vWorldPosition;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
            for (int i = 0; i < 5; i++) {
                v += a * noise(p);
                p = m * p;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec3 dir = normalize(vWorldPosition);
            float elev = dir.y;

            float t = smoothstep(-0.12, 0.7, elev);
            vec3 sky = mix(uHorizonColor, uZenithColor, t);

            float horizonGlow = exp(-pow(elev * 3.5, 2.0)) * 0.18;
            sky += uHorizonColor * horizonGlow;

            float hazeFactor = uHaze * (1.0 - elev * 0.45);
            float lum = dot(sky, vec3(0.299, 0.587, 0.114));
            sky = mix(sky, vec3(lum), hazeFactor * 0.55);
            sky = mix(sky, sky * 0.88 + vec3(0.08), hazeFactor * 0.35);

            if (elev > -0.02 && uCloudCover > 0.02) {
                vec2 cloudUV = dir.xz / max(0.12, elev + 0.4);
                cloudUV *= 2.2;
                vec2 drift = vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.55);
                float n1 = fbm(cloudUV + drift);
                float n2 = fbm(cloudUV * 1.7 + drift * 1.3 + vec2(13.1, 7.7));
                float n = n1 * 0.65 + n2 * 0.35;

                float cover = clamp(uCloudCover, 0.0, 1.0);
                float threshold = mix(0.55, 0.08, cover);
                float softness = mix(0.28, 0.5, cover);
                float cloudMask = smoothstep(threshold, threshold + softness, n);
                cloudMask *= smoothstep(-0.02, 0.22, elev);
                cloudMask *= mix(0.85, 1.0, elev);

                vec3 cloudColor = mix(vec3(0.78, 0.81, 0.86), vec3(0.97, 0.98, 1.0), clamp(n * 1.1, 0.0, 1.0));
                cloudColor = mix(cloudColor, uSunColor * 0.95, 0.12 * uSunIntensity * (1.0 - elev));

                sky = mix(sky, cloudColor, min(1.0, cloudMask * uCloudOpacity * 1.25));
            }

            vec3 sunDir = normalize(uSunPosition);
            float cosAngle = clamp(dot(dir, sunDir), -1.0, 1.0);
            float sunDisk = smoothstep(
                cos(uSunAngularSize * 1.9),
                cos(uSunAngularSize * 0.55),
                cosAngle
            );
            float sunGlow = pow(max(0.0, cosAngle), 28.0) * 0.4 * uSunIntensity;
            sky += uSunColor * (sunDisk * 2.8 + sunGlow) * uSunIntensity;

            sky *= uExposure;
            sky = sky / (sky + vec3(1.0));
            sky = pow(max(sky, vec3(0.0)), vec3(1.0 / 1.85));

            gl_FragColor = vec4(sky, 1.0);
        }
    `
};

function createSkyMesh() {
    const geometry = new THREE.SphereGeometry(4000, 48, 24);
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
 * Full environment: seasonal ground textures + procedural sky (clouds/weather) + fog.
 */
export function createEnvironmentSystem(initialConfig = {}) {
    let onNeedRender =
        typeof initialConfig.onNeedRender === 'function' ? initialConfig.onNeedRender : null;

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

    const textureLoader = new THREE.TextureLoader();
    const groundTextures = Object.create(null);
    let activeGroundTexture = null;

    const proceduralFallback = {
        winter: createProceduralGroundTexture(0xd8e2ec),
        spring: createProceduralGroundTexture(0x5a7a42),
        summer: createProceduralGroundTexture(0x486b32),
        autumn: createProceduralGroundTexture(0x6e5d3b)
    };

    function configureGroundTexture(tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(120, 120);
        tex.anisotropy = 2;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        return tex;
    }

    function requestRender() {
        if (typeof onNeedRender === 'function') {
            onNeedRender();
        }
    }

    function loadSeasonGroundTexture(season) {
        if (groundTextures[season]) return groundTextures[season];

        const file = SEASON_GROUND_FILES[season] || SEASON_GROUND_FILES.summer;
        const url = resolveSeasonTextureUrl(file);
        const fallback = proceduralFallback[season] || proceduralFallback.summer;

        groundTextures[season] = fallback;

        textureLoader.load(
            url,
            (tex) => {
                configureGroundTexture(tex);
                tex.userData = { isSeasonGround: true, season, source: url };

                const prev = groundTextures[season];
                groundTextures[season] = tex;

                if (currentState.season === season) {
                    groundMaterial.map = tex;
                    groundMaterial.needsUpdate = true;
                    requestRender();
                }

                if (prev && prev !== fallback && prev.userData && prev.userData.isSeasonGround) {
                    prev.dispose();
                }
            },
            undefined,
            () => {
                console.warn('[U-Build Environment] Failed to load ground texture:', url);
            }
        );

        return groundTextures[season];
    }

    activeGroundTexture = loadSeasonGroundTexture(currentState.season);
    ['winter', 'spring', 'summer', 'autumn'].forEach((s) => {
        if (s !== currentState.season) loadSeasonGroundTexture(s);
    });

    const groundMaterial = new THREE.MeshStandardMaterial({
        color: SEASON_PROFILES.summer.groundColor,
        map: activeGroundTexture,
        roughness: SEASON_PROFILES.summer.groundRoughness,
        metalness: 0.0
    });

    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.name = 'environment-ground';
    groundMesh.position.set(0, -0.01, 0);
    groundMesh.receiveShadow = true;
    group.add(groundMesh);

    // --- Sky dome ---
    const skyMesh = createSkyMesh();
    group.add(skyMesh);

    let fogColor = new THREE.Color(SEASON_PROFILES.summer.skyFogColor);
    let fogDensity = WEATHER_MOD.clear.fogDensity;
    let startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;

    function applyProfile(season, weather, phase = 'day', solar = null) {
        const profile = SEASON_PROFILES[season] || SEASON_PROFILES.summer;
        const weatherMod = WEATHER_MOD[weather] || WEATHER_MOD.clear;
        const phaseCfg = PHASE_SKY[phase] || PHASE_SKY.day;

        const tex = loadSeasonGroundTexture(season);
        if (groundMaterial.map !== tex) {
            groundMaterial.map = tex;
        }

        let tint = profile.groundColor;
        if (weather === 'snow') {
            tint = 0xf2f5f8;
        } else if (weather === 'rain') {
            const c = new THREE.Color(tint);
            c.multiplyScalar(0.72);
            tint = c.getHex();
        }
        groundMaterial.color.setHex(tint);
        groundMaterial.roughness = weather === 'rain' ? 0.35 : profile.groundRoughness;
        groundMaterial.needsUpdate = true;

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
        uniforms.uCloudOpacity.value = weatherMod.cloudOpacity;
        uniforms.uHaze.value = Math.min(1.0, weatherMod.turbidityBoost / 15.0);
        uniforms.uSunIntensity.value =
            phaseCfg.sunVisibility * (weather === 'fog' ? 0.25 : weatherMod.lightMul);

        if (solar && typeof solar.elevation === 'number') {
            const elevRad = Math.max(-0.15, solar.elevation) * (Math.PI / 180);
            const azRad = (solar.azimuth - 90) * (Math.PI / 180);
            const sunDir = new THREE.Vector3(
                Math.cos(elevRad) * Math.cos(azRad),
                Math.sin(elevRad),
                Math.cos(elevRad) * Math.sin(azRad)
            ).normalize();
            uniforms.uSunPosition.value.copy(sunDir);

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

        fogColor = new THREE.Color(profile.skyFogColor);
        fogColor = desaturateColor(fogColor, weatherMod.skyDesaturate * 0.5);
        fogColor.multiplyScalar(1.0 - weatherMod.skyDarken * 0.4);
        fogDensity = weatherMod.fogDensity;
        if (phase === 'night') {
            fogColor.multiplyScalar(0.25);
            fogDensity *= 1.35;
        }
    }

    applyProfile(currentState.season, currentState.weather, currentState.phase, currentState.solar);

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

    function tick(timeSeconds) {
        const t =
            typeof timeSeconds === 'number'
                ? timeSeconds
                : ((typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001) -
                  startTime;
        skyMesh.material.uniforms.uTime.value = t;
    }

    function updateBounds(buildingBounds) {
        if (buildingBounds && buildingBounds.center) {
            groundMesh.position.x = buildingBounds.center.x;
            groundMesh.position.z = buildingBounds.center.z;
        }
    }

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

    function setOnNeedRender(fn) {
        onNeedRender = typeof fn === 'function' ? fn : null;
    }

    function getState() {
        const profile = SEASON_PROFILES[currentState.season] || SEASON_PROFILES.summer;
        const weatherMod = WEATHER_MOD[currentState.weather] || WEATHER_MOD.clear;
        return Object.freeze({
            ...currentState,
            groundProfile: {
                color: groundMaterial.color.getHexString(),
                roughness: groundMaterial.roughness,
                hasMap: !!groundMaterial.map
            },
            skyProfile: {
                zenith: skyMesh.material.uniforms.uZenithColor.value.getHexString(),
                horizon: skyMesh.material.uniforms.uHorizonColor.value.getHexString(),
                cloudCover: skyMesh.material.uniforms.uCloudCover.value,
                cloudOpacity: skyMesh.material.uniforms.uCloudOpacity.value,
                exposure: skyMesh.material.uniforms.uExposure.value
            },
            atmosphericProfile: {
                fogColor: fogColor.getHexString(),
                fogDensity,
                ambientTint: profile.ambientTint,
                turbidity: profile.turbidity,
                rayleigh: profile.rayleigh,
                lightMul: weatherMod.lightMul
            }
        });
    }

    function dispose() {
        groundGeometry.dispose();
        groundMaterial.dispose();
        for (const key of Object.keys(proceduralFallback)) {
            proceduralFallback[key].dispose();
        }
        for (const key of Object.keys(groundTextures)) {
            const t = groundTextures[key];
            if (t && t.userData && t.userData.isSeasonGround) t.dispose();
        }
        skyMesh.geometry.dispose();
        skyMesh.material.dispose();
        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        group,
        skyMesh,
        update,
        tick,
        updateBounds,
        applyToScene,
        setOnNeedRender,
        getState,
        dispose
    });
}
