import * as THREE from 'three';

import { SEASON_PROFILES } from '../config/SeasonProfiles.js';
import { createTerrain } from './Terrain.js';
import { createGroundTextureManager } from './GroundTextures.js';

export function createGroundSystem(config = {}) {
    let onNeedRender =
        typeof config.onNeedRender === 'function'
            ? config.onNeedRender
            : null;

    let currentSeason =
        config.season || 'summer';

    const group = new THREE.Group();

    group.name = 'environment-ground';

    const terrain = createTerrain({
        size: config.size,
        segments: config.segments,
        maxHeight: config.maxHeight,
        seed: config.seed
    });

    const textureManager =
        createGroundTextureManager({
            onNeedRender: () => {
                const texture =
                    textureManager.getCurrentTexture();

                if (
                    texture &&
                    groundMaterial.map !== texture
                ) {
                    groundMaterial.map =
                        texture;

                    groundMaterial.needsUpdate =
                        true;
                }

                requestRender();
            }
        });

    const initialProfile =
        SEASON_PROFILES[currentSeason] ||
        SEASON_PROFILES.summer;

    const initialTexture =
        textureManager.getTexture(
            currentSeason
        );

    const groundMaterial =
        new THREE.MeshStandardMaterial({
            color:
                initialProfile.groundColor,

            map:
                initialTexture,

            roughness:
                initialProfile.groundRoughness,

            metalness:
                initialProfile.groundMetalness
        });

    const mesh = new THREE.Mesh(
        terrain.geometry,
        groundMaterial
    );

    mesh.name = 'environment-ground-mesh';

    mesh.position.y =
        Number(config.y) || -0.01;

    mesh.receiveShadow = true;

    group.add(mesh);

    textureManager.preload();

    function requestRender() {
        if (
            typeof onNeedRender === 'function'
        ) {
            onNeedRender();
        }
    }

    function update(input = {}) {
        const nextSeason =
            input.season || currentSeason;

        currentSeason =
            nextSeason;

        const profile =
            SEASON_PROFILES[currentSeason] ||
            SEASON_PROFILES.summer;

        const texture =
            textureManager.getTexture(
                currentSeason
            );

        groundMaterial.color.setHex(
            profile.groundColor
        );

        groundMaterial.roughness =
            profile.groundRoughness;

        groundMaterial.metalness =
            profile.groundMetalness;

        if (texture) {
            groundMaterial.map =
                texture;
        }

        groundMaterial.needsUpdate =
            true;

        requestRender();

        return getState();
    }

    function updateBounds(buildingBounds) {
        terrain.updateBounds(
            buildingBounds
        );

        if (
            buildingBounds &&
            buildingBounds.center
        ) {
            mesh.position.x =
                buildingBounds.center.x || 0;

            mesh.position.z =
                buildingBounds.center.z || 0;
        }

        requestRender();
    }

    function setOnNeedRender(fn) {
        onNeedRender =
            typeof fn === 'function'
                ? fn
                : null;
    }

    function getState() {
        return Object.freeze({
            season:
                currentSeason,

            color:
                groundMaterial.color.getHexString(),

            roughness:
                groundMaterial.roughness,

            metalness:
                groundMaterial.metalness,

            hasMap:
                Boolean(
                    groundMaterial.map
                ),

            position: Object.freeze({
                x: mesh.position.x,
                y: mesh.position.y,
                z: mesh.position.z
            })
        });
    }

    function dispose() {
        textureManager.dispose();
        terrain.dispose();
        groundMaterial.dispose();

        group.clear();
        group.removeFromParent();
    }

    return Object.freeze({
        group,
        mesh,
        update,
        updateBounds,
        setOnNeedRender,
        getState,
        dispose
    });
}