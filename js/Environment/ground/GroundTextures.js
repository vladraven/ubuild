import * as THREE from 'three';

const SEASON_GROUND_FILES = Object.freeze({
    winter: 'winter.jpg',
    spring: 'spring.jpg',
    summer: 'summer.jpg',
    autumn: 'fall.jpg'
});

function resolveSeasonTextureUrl(filename) {
    try {
        if (
            typeof import.meta !== 'undefined' &&
            import.meta.url
        ) {
            return new URL(
                `../${filename}`,
                import.meta.url
            ).href;
        }
    } catch (_) {
    }

    const themeBase =
        (
            typeof window !== 'undefined' &&
            window.UBUILD_CONFIG &&
            window.UBUILD_CONFIG.themeUrl
        ) ||
        '';

    if (themeBase) {
        return `${String(themeBase).replace(/\/$/, '')}/js/Environment/${filename}`;
    }

    return `js/Environment/${filename}`;
}

function createProceduralGroundTexture(
    baseHex = 0x486b32
) {
    const canvas =
        document.createElement('canvas');

    canvas.width = 512;
    canvas.height = 512;

    const context =
        canvas.getContext('2d');

    const color =
        new THREE.Color(baseHex);

    const red =
        Math.floor(color.r * 255);

    const green =
        Math.floor(color.g * 255);

    const blue =
        Math.floor(color.b * 255);

    context.fillStyle =
        `rgb(${red},${green},${blue})`;

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    for (let i = 0; i < 5000; i++) {
        const x =
            Math.random() * canvas.width;

        const y =
            Math.random() * canvas.height;

        const shade =
            Math.floor(
                Math.random() * 40
            ) - 20;

        const textureRed =
            Math.max(
                0,
                red + shade
            );

        const textureGreen =
            Math.max(
                0,
                green + shade
            );

        const textureBlue =
            Math.max(
                0,
                blue + shade
            );

        context.fillStyle =
            `rgba(${textureRed},${textureGreen},${textureBlue},0.45)`;

        context.fillRect(
            x,
            y,
            2 + Math.random() * 2,
            2 + Math.random() * 2
        );
    }

    const texture =
        new THREE.CanvasTexture(canvas);

    configureGroundTexture(texture);

    texture.userData = {
        isSharedProcedural: true
    };

    return texture;
}

function configureGroundTexture(texture) {
    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.repeat.set(120, 120);

    texture.anisotropy = 2;

    texture.colorSpace =
        THREE.SRGBColorSpace;

    texture.needsUpdate = true;

    return texture;
}

export function createGroundTextureManager(
    config = {}
) {
    const onNeedRender =
        typeof config.onNeedRender === 'function'
            ? config.onNeedRender
            : null;

    const textureLoader =
        new THREE.TextureLoader();

    const groundTextures =
        Object.create(null);

    const proceduralFallback = {
        winter:
            createProceduralGroundTexture(
                0xd8e2ec
            ),

        spring:
            createProceduralGroundTexture(
                0x5a7a42
            ),

        summer:
            createProceduralGroundTexture(
                0x486b32
            ),

        autumn:
            createProceduralGroundTexture(
                0x6e5d3b
            )
    };

    let activeSeason = null;

    function requestRender() {
        if (
            typeof onNeedRender === 'function'
        ) {
            onNeedRender();
        }
    }

    function loadSeason(season) {
        if (groundTextures[season]) {
            return groundTextures[season];
        }

        const file =
            SEASON_GROUND_FILES[season] ||
            SEASON_GROUND_FILES.summer;

        const url =
            resolveSeasonTextureUrl(file);

        const fallback =
            proceduralFallback[season] ||
            proceduralFallback.summer;

        groundTextures[season] =
            fallback;

        textureLoader.load(
            url,

            (texture) => {
                configureGroundTexture(texture);

                texture.userData = {
                    isSeasonGround: true,
                    season,
                    source: url
                };

                const previous =
                    groundTextures[season];

                groundTextures[season] =
                    texture;

                if (
                    previous &&
                    previous !== fallback &&
                    previous.userData &&
                    previous.userData.isSeasonGround
                ) {
                    previous.dispose();
                }

                requestRender();
            },

            undefined,

            () => {
                console.warn(
                    '[U-Build Environment] Failed to load ground texture:',
                    url
                );
            }
        );

        return fallback;
    }

    function getTexture(season) {
        activeSeason = season;

        return loadSeason(season);
    }

    function preload() {
        Object.keys(
            SEASON_GROUND_FILES
        ).forEach(loadSeason);
    }

    function getCurrentTexture() {
        if (!activeSeason) {
            return null;
        }

        return (
            groundTextures[activeSeason] ||
            null
        );
    }

    function dispose() {
        for (
            const key of Object.keys(
                proceduralFallback
            )
        ) {
            proceduralFallback[key].dispose();
        }

        for (
            const key of Object.keys(
                groundTextures
            )
        ) {
            const texture =
                groundTextures[key];

            if (
                texture &&
                texture.userData &&
                texture.userData.isSeasonGround
            ) {
                texture.dispose();
            }
        }
    }

    return Object.freeze({
        getTexture,
        getCurrentTexture,
        preload,
        dispose
    });
}