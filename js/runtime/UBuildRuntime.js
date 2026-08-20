// js/runtime/UBuildRuntime.js
import * as THREE from 'three';

import { createBuildingModel } from '../model/buildingModel.js';
import { createBuildingGeometry } from '../model/geometry/buildingGeometry.js';
import { createElementRegistry } from '../elements/ElementRegistry.js';

import { WallOrchestrator } from '../elements/wall/WallOrchestrator.js';
import { RoofOrchestrator } from '../elements/roof/RoofOrchestrator.js';
import { FoundationOrchestrator } from '../elements/Foundation/FoundationOrchestrator.js';
import { StructuralOrchestrator } from '../elements/structural/StructuralOrchestrator.js';
import { OpeningOrchestrator } from '../elements/opening/OpeningOrchestrator.js';
import { WainscotOrchestrator } from '../elements/wainscot/WainscotOrchestrator.js';
import { TrimOrchestrator } from '../elements/trim/TrimOrchestrator.js';
import { AwningElement } from '../elements/awning/AwningElement.js';

import { createEnvironmentSystem } from '../environment/EnvironmentSystem.js';
import { createLightingSystem } from '../lighting/LightingSystem.js';
import { getSolarState } from '../lighting/SolarPosition.js';

function assertContainer(container) {
    if (!container || typeof container.appendChild !== 'function') {
        throw new TypeError('A valid DOM container element is required');
    }
}

function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ec3eb);
    return scene;
}

function createCamera(container, geometry) {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    const bounds = geometry.bounds;
    const center = bounds.center;
    const size = Math.max(bounds.width, bounds.height, bounds.length, 1);

    camera.position.set(
        center.x + size * 1.4,
        center.y + size * 0.9,
        center.z + size * 1.4
    );
    camera.lookAt(center.x, center.y, center.z);
    return camera;
}

function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);
    return renderer;
}

function createMaterialSystem() {
    const materials = new Map([
        ['wallMetal', new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.35, roughness: 0.7 })],
        ['roofMetal', new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.65 })],
        ['structuralSteel', new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.65, roughness: 0.45 })],
        ['steel', new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.65, roughness: 0.45 })],
        ['concrete', new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 })],
        ['trimMetal', new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.55, roughness: 0.5 })],
        ['doorTrim', new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.55, roughness: 0.5 })],
        ['doorFrame', new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.55, roughness: 0.5 })],
        ['frame', new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.55, roughness: 0.5 })],
        ['doorPanel', new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.2, roughness: 0.8 })],
        ['glass', new THREE.MeshStandardMaterial({ color: 0x9ccfff, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0 })],
        ['wall', new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.35, roughness: 0.7 })]
    ]);

    return Object.freeze({
        concrete: materials.get('concrete'),
        steel: materials.get('steel'),
        wallMetal: materials.get('wallMetal'),
        roofMetal: materials.get('roofMetal'),
        structuralSteel: materials.get('structuralSteel'),
        trimMetal: materials.get('trimMetal'),
        doorTrim: materials.get('doorTrim'),
        doorFrame: materials.get('doorFrame'),
        frame: materials.get('frame'),
        doorPanel: materials.get('doorPanel'),
        glass: materials.get('glass'),
        wall: materials.get('wall'),
        get(name) {
            return materials.get(name) ?? materials.get('steel');
        },
        dispose() {
            for (const mat of materials.values()) {
                mat.dispose();
            }
            materials.clear();
        }
    });
}

function createColors() {
    return Object.freeze({
        wall: 0x777777,
        roof: 0x555555,
        frame: 0x444444,
        trim: 0x444444,
        wainscot: 0x444444,
        glass: 0x9ccfff
    });
}

function createRegistry() {
    const registry = createElementRegistry();
    registry.register('walls', WallOrchestrator);
    registry.register('roof', RoofOrchestrator);
    registry.register('foundation', FoundationOrchestrator);
    registry.register('structural', StructuralOrchestrator);
    registry.register('openings', OpeningOrchestrator);
    registry.register('wainscot', WainscotOrchestrator);
    registry.register('trims', TrimOrchestrator);
    registry.register('awnings', AwningElement);
    return registry;
}

function createContext({ model, geometry, materials, colors, scene, camera, renderer }) {
    return {
        model,
        geometry,
        panelGeometry: geometry.panels,
        structuralGeometry: {
            frames: geometry.frames,
            girts: geometry.girts,
            purlins: geometry.purlins,
            endWallColumns: geometry.endWallColumns
        },
        materials,
        colors,
        scene,
        camera,
        renderer
    };
}

function addInstances(root, instances) {
    for (const [id, instance] of instances) {
        if (!instance) continue;
        const obj = instance.object ?? instance;
        if (obj && obj.isObject3D) {
            obj.name = id;
            root.add(obj);
        }
    }
}

function clearRoot(root) {
    while (root.children.length > 0) {
        root.remove(root.children[0]);
    }
}

export function createUBuildRuntime({
    container,
    model = {},
    environment = {},
    lighting = {}
} = {}) {
    assertContainer(container);

    let buildingModel = createBuildingModel(model);
    let buildingGeometry = createBuildingGeometry(buildingModel);

    const scene = createScene();
    const camera = createCamera(container, buildingGeometry);
    const renderer = createRenderer(container);

    const environmentSystem = createEnvironmentSystem(environment);
    scene.add(environmentSystem.group);

    const lightingSystem = createLightingSystem(scene);
    const materials = createMaterialSystem();
    const colors = createColors();
    const registry = createRegistry();

    const buildingRoot = new THREE.Group();
    buildingRoot.name = 'u-build-building';
    scene.add(buildingRoot);

    const context = createContext({
        model: buildingModel,
        geometry: buildingGeometry,
        materials,
        colors,
        scene,
        camera,
        renderer
    });

    let currentInstances = registry.createAll(context);
    addInstances(buildingRoot, currentInstances);

    let disposed = false;

    let lightingConfig = {
        date: lighting.date ?? '2026-06-21',
        time: lighting.time ?? '12:00',
        timezone: lighting.timezone ?? 'America/Winnipeg',
        latitude: lighting.latitude ?? 49.8951,
        longitude: lighting.longitude ?? -97.1384
    };

    function updateLightingAndEnvironment() {
        const solarState = getSolarState(lightingConfig);
        lightingSystem.update(solarState, buildingGeometry.bounds);
        environmentSystem.updateBounds(buildingGeometry.bounds);

        const envState = environmentSystem.getState();
        if (solarState.phase === 'night') {
            scene.background.setHex(0x0a1424);
        } else {
            scene.background.setHex(envState.atmosphericProfile.fogColor);
        }
    }

    function resize() {
        if (disposed) return;
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function render() {
        if (disposed) return;
        renderer.render(scene, camera);
    }

    function update(nextModel) {
        if (disposed) {
            throw new Error('UBuild runtime is disposed');
        }

        buildingModel = createBuildingModel(nextModel);
        buildingGeometry = createBuildingGeometry(buildingModel);

        const nextContext = createContext({
            model: buildingModel,
            geometry: buildingGeometry,
            materials,
            colors,
            scene,
            camera,
            renderer
        });

        currentInstances = registry.updateAll(currentInstances, nextContext);

        clearRoot(buildingRoot);
        addInstances(buildingRoot, currentInstances);

        updateLightingAndEnvironment();
        render();

        return buildingModel;
    }

    function setDateTimeLocation(config = {}) {
        if (disposed) {
            throw new Error('UBuild runtime is disposed');
        }

        if (config.date !== undefined) lightingConfig.date = config.date;
        if (config.time !== undefined) lightingConfig.time = config.time;
        if (config.timezone !== undefined) lightingConfig.timezone = config.timezone;
        if (config.latitude !== undefined) lightingConfig.latitude = config.latitude;
        if (config.longitude !== undefined) lightingConfig.longitude = config.longitude;

        environmentSystem.update({
            date: lightingConfig.date,
            hemisphere: config.hemisphere || (lightingConfig.latitude >= 0 ? 'north' : 'south'),
            weather: config.weather || 'clear',
            location: {
                latitude: lightingConfig.latitude,
                longitude: lightingConfig.longitude,
                timezone: lightingConfig.timezone
            }
        });

        updateLightingAndEnvironment();
        render();
    }

    function start() {
        if (disposed) {
            throw new Error('UBuild runtime is disposed');
        }
        updateLightingAndEnvironment();
        resize();
        render();
        return api;
    }

    function dispose() {
        if (disposed) return;
        disposed = true;

        registry.disposeAll(currentInstances);
        lightingSystem.dispose();
        environmentSystem.dispose();
        materials.dispose();
        renderer.dispose();
        renderer.domElement.remove();

        window.removeEventListener('resize', resize);
    }

    const api = Object.freeze({
        get model() { return buildingModel; },
        get geometry() { return buildingGeometry; },
        scene,
        camera,
        renderer,
        environment: environmentSystem,
        lighting: lightingSystem,
        materials,
        registry,
        root: buildingRoot,
        start,
        render,
        resize,
        update,
        setDateTimeLocation,
        dispose
    });

    window.addEventListener('resize', resize);
    return api;
}