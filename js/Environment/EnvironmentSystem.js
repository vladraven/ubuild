import * as THREE from 'three';

import { getSeason } from './config/Seasons.js';
import { SEASON_PROFILES } from './config/SeasonProfiles.js';
import { PHASE_SKY } from './config/SkyProfiles.js';
import { WEATHER_MOD } from './config/WeatherProfiles.js';

import { createGroundSystem } from './ground/GroundSystem.js';
import { createSkySystem } from './sky/SkySystem.js';

import {
    desaturateColor,
    multiplyColor
} from './utils/ColorUtils.js';

export function createEnvironmentSystem(initialConfig = {}) {
    let onNeedRender =
        typeof initialConfig.onNeedRender === 'function'
            ? initialConfig.onNeedRender
            : null;

    const currentState = {
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

    currentState.season = getSeason(
        currentState.date,
        currentState.hemisphere
    );

    const group = new THREE.Group();

    group.name = 'environment-system';

    function requestRender() {
        if (typeof onNeedRender === 'function') {
            onNeedRender();
        }
    }

    const groundSystem = createGroundSystem({
        season: currentState.season,
        onNeedRender: requestRender
    });

    const skySystem = createSkySystem();

    group.add(groundSystem.group);
    group.add(skySystem.mesh);

    let fogColor = new THREE.Color(
        SEASON_PROFILES.summer.skyFogColor
    );

    let fogDensity =
        WEATHER_MOD.clear.fogDensity;

    function applyProfile(
        season,
        weather,
        phase = 'day',
        solar = null
    ) {
        const profile =
            SEASON_PROFILES[season] ||
            SEASON_PROFILES.summer;

        const weatherMod =
            WEATHER_MOD[weather] ||
            WEATHER_MOD.clear;

        const phaseCfg =
            PHASE_SKY[phase] ||
            PHASE_SKY.day;

        groundSystem.update({
            season,
            weather
        });

        let zenith = multiplyColor(
            profile.zenithColor,
            phaseCfg.zenithMul
        );

        let horizon = multiplyColor(
            profile.horizonColor,
            phaseCfg.horizonMul
        );

        zenith = desaturateColor(
            zenith,
            weatherMod.skyDesaturate
        );

        horizon = desaturateColor(
            horizon,
            weatherMod.skyDesaturate
        );

        zenith.multiplyScalar(
            1.0 - weatherMod.skyDarken
        );

        horizon.multiplyScalar(
            1.0 - weatherMod.skyDarken * 0.7
        );

        skySystem.update({
            zenithColor: zenith,
            horizonColor: horizon,
            exposure:
                phaseCfg.exposure *
                (1.0 - weatherMod.skyDarken * 0.3),
            cloudCover: weatherMod.cloudCover,
            cloudOpacity: weatherMod.cloudOpacity,
            haze: Math.min(
                1.0,
                weatherMod.turbidityBoost / 15.0
            ),
            sunIntensity:
                phaseCfg.sunVisibility *
                (
                    weather === 'fog'
                        ? 0.25
                        : weatherMod.lightMul
                ),
            phase,
            solar
        });

        fogColor = new THREE.Color(
            profile.skyFogColor
        );

        fogColor = desaturateColor(
            fogColor,
            weatherMod.skyDesaturate * 0.5
        );

        fogColor.multiplyScalar(
            1.0 -
            weatherMod.skyDarken * 0.4
        );

        fogDensity =
            weatherMod.fogDensity;

        if (phase === 'night') {
            fogColor.multiplyScalar(0.25);
            fogDensity *= 1.35;
        }
    }

    applyProfile(
        currentState.season,
        currentState.weather,
        currentState.phase,
        currentState.solar
    );

    function update(input = {}) {
        if (input.date !== undefined) {
            currentState.date = input.date;
        }

        if (input.hemisphere !== undefined) {
            currentState.hemisphere =
                input.hemisphere;
        }

        if (input.weather !== undefined) {
            currentState.weather =
                input.weather;
        }

        if (input.location !== undefined) {
            currentState.location =
                input.location;
        }

        if (input.solar !== undefined) {
            currentState.solar =
                input.solar;
        }

        if (input.phase !== undefined) {
            currentState.phase =
                input.phase;
        } else if (
            currentState.solar &&
            currentState.solar.phase
        ) {
            currentState.phase =
                currentState.solar.phase;
        }

        currentState.season = getSeason(
            currentState.date,
            currentState.hemisphere
        );

        applyProfile(
            currentState.season,
            currentState.weather,
            currentState.phase,
            currentState.solar
        );

        return getState();
    }

    function tick(timeSeconds) {
        skySystem.tick(timeSeconds);
    }

    function updateBounds(buildingBounds) {
        groundSystem.updateBounds(
            buildingBounds
        );
    }

    function applyToScene(scene) {
        if (!scene) {
            return;
        }

        scene.background =
            fogColor.clone();

        if (
            !scene.fog ||
            !(scene.fog instanceof THREE.FogExp2)
        ) {
            scene.fog = new THREE.FogExp2(
                fogColor.getHex(),
                fogDensity
            );
        } else {
            scene.fog.color.copy(
                fogColor
            );

            scene.fog.density =
                fogDensity;
        }
    }

    function setOnNeedRender(fn) {
        onNeedRender =
            typeof fn === 'function'
                ? fn
                : null;

        groundSystem.setOnNeedRender(
            requestRender
        );
    }

    function getState() {
        const profile =
            SEASON_PROFILES[currentState.season] ||
            SEASON_PROFILES.summer;

        const weatherMod =
            WEATHER_MOD[currentState.weather] ||
            WEATHER_MOD.clear;

        const groundState =
            groundSystem.getState();

        const skyState =
            skySystem.getState();

        return Object.freeze({
            ...currentState,

            groundProfile: {
                color:
                    groundState.color,
                roughness:
                    groundState.roughness,
                hasMap:
                    groundState.hasMap
            },

            skyProfile: {
                zenith:
                    skyState.zenith,
                horizon:
                    skyState.horizon,
                cloudCover:
                    skyState.cloudCover,
                cloudOpacity:
                    skyState.cloudOpacity,
                exposure:
                    skyState.exposure
            },

            atmosphericProfile: {
                fogColor:
                    fogColor.getHexString(),

                fogDensity,

                ambientTint:
                    profile.ambientTint,

                turbidity:
                    profile.turbidity,

                rayleigh:
                    profile.rayleigh,

                lightMul:
                    weatherMod.lightMul
            }
        });
    }

    function dispose() {
        groundSystem.dispose();
        skySystem.dispose();

        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        group,
        skyMesh: skySystem.mesh,
        update,
        tick,
        updateBounds,
        applyToScene,
        setOnNeedRender,
        getState,
        dispose
    });
}