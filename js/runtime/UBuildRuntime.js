import * as THREE from 'three';

import { createBuildingModel } from '../model/buildingModel.js';
import { createBuildingGeometry } from '../model/geometry/buildingGeometry.js';
import { createElementRegistry } from '../elements/ElementRegistry.js';

import { WallOrchestrator } from '../elements/wall/WallOrchestrator.js';
import { RoofOrchestrator } from '../elements/roof/RoofOrchestrator.js';
import { FoundationOrchestrator } from '../elements/foundation/FoundationOrchestrator.js';
import { StructuralOrchestrator } from '../elements/structural/StructuralOrchestrator.js';
import { OpeningOrchestrator } from '../elements/opening/OpeningOrchestrator.js';
import { WainscotOrchestrator } from '../elements/wainscot/WainscotOrchestrator.js';
import { TrimOrchestrator } from '../elements/trim/TrimOrchestrator.js';
import { GuttersOrchestrator } from '../elements/gutters/GuttersOrchestrator.js';
import { RidgeOrchestrator } from '../elements/ridge/RidgeOrchestrator.js';
import { MezzanineOrchestrator } from '../elements/mezzanine/MezzanineOrchestrator.js';
import { CraneOrchestrator } from '../elements/crane/CraneOrchestrator.js';
import { LinerOrchestrator } from '../elements/liner/LinerOrchestrator.js';
import { DrivewayOrchestrator } from '../elements/driveway/DrivewayOrchestrator.js';
import { LogoOrchestrator } from '../elements/logo/LogoOrchestrator.js';
import { AwningElement } from '../elements/awning/AwningElement.js';

import { createEnvironmentSystem } from '../environment/EnvironmentSystem.js';
import { createLightingSystem } from '../lighting/LightingSystem.js';
import { getSolarState } from '../lighting/SolarPosition.js';
import { createCameraControls } from '../interaction/CameraControls.js';
import { createOpeningInteraction } from '../interaction/OpeningInteraction.js';

import { createMaterialCatalog } from '../resources/materials/MaterialCatalog.js';
import { createMaterial, updateMaterialColor, disposeMaterial } from '../resources/materials/MaterialFactory.js';
import { createColorPalette } from '../resources/colors/ColorPalette.js';
import { createTextureCatalog } from '../resources/textures/TextureCatalog.js';
import { createTextureManager } from '../resources/textures/TextureManager.js';

function assertContainer(container) {
    if (!container || typeof container.appendChild !== 'function') {
        throw new TypeError('A valid DOM container element is required');
    }
}

function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x76b6e4);
    return scene;
}

function createCamera(container, geometry) {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);

    const bounds = geometry.bounds;
    const center = bounds.center;
    const size = Math.max(bounds.width, bounds.height, bounds.length, 1);

    camera.position.set(center.x + size * 1.3, center.y + size * 0.8, center.z + size * 1.3);
    camera.lookAt(center.x, center.y, center.z);
    return camera;
}

function createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);
    return renderer;
}

function createRuntimeMaterialSystem(paletteOverrides, catalogOverrides, textureCatalogOverrides) {
    const catalog = createMaterialCatalog(catalogOverrides);
    const palette = createColorPalette(paletteOverrides);
    const textureCatalog = createTextureCatalog(textureCatalogOverrides);
    const textureManager = createTextureManager({
        loader: new THREE.TextureLoader(),
        catalog: textureCatalog
    });

    const materialsMap = new Map();

    function get(name, colorOverride, textureBundle = null) {
        const key = `${name}_${colorOverride || ''}`;
        if (materialsMap.has(key)) {
            return materialsMap.get(key);
        }

        const definition = catalog[name] || catalog.steel;
        const color = colorOverride || palette[name] || palette.wall;
        const material = createMaterial(definition, color);

        if (textureBundle) {
            if (textureBundle.colorMap) material.map = textureBundle.colorMap;
            if (textureBundle.normalMap) material.normalMap = textureBundle.normalMap;
            if (textureBundle.bumpMap) material.bumpMap = textureBundle.bumpMap;
            if (textureBundle.roughnessMap) material.roughnessMap = textureBundle.roughnessMap;
            material.needsUpdate = true;
        }

        materialsMap.set(key, material);
        return material;
    }

    function updatePalette(newPaletteOverrides) {
        const updatedPalette = createColorPalette(newPaletteOverrides);
        for (const [key, material] of materialsMap.entries()) {
            for (const [colorName, hexColor] of Object.entries(updatedPalette)) {
                if (key.includes(colorName) || key.startsWith(colorName)) {
                    updateMaterialColor(material, hexColor);
                }
            }
        }
    }

    function dispose() {
        for (const material of materialsMap.values()) {
            disposeMaterial(material);
        }
        materialsMap.clear();
        textureManager.clearAll();
    }

    return Object.freeze({
        catalog,
        palette,
        textureManager,
        get,
        updatePalette,
        dispose
    });
}

function createColorsFromModel(model) {
    return Object.freeze({
        wall: model.colors?.wall || '#FFFFFF',
        wainscot: model.colors?.wainscot || '#FFFFFF',
        roof: model.colors?.roof || '#FFFFFF',
        trim: model.colors?.trim || '#FFFFFF',
        eaveTrim: model.colors?.eaveTrim || '#FFFFFF',
        rakeTrim: model.colors?.rakeTrim || '#FFFFFF',
        frame: model.colors?.frame || '#444444',
        steel: model.colors?.steel || '#444444',
        concrete: model.colors?.concrete || '#B8B8B8',
        glass: model.colors?.glass || '#9FC5E8',
        ceiling: model.colors?.ceiling || '#FFFFFF',
        mezzanine: model.colors?.mezzanine || '#FFFFFF',
        interiorWall: model.colors?.interiorWall || '#EEEEEE'
    });
}

function createRegistry() {
    const registry = createElementRegistry();
    registry.register('foundation', FoundationOrchestrator);
    registry.register('structural', StructuralOrchestrator);
    registry.register('walls', WallOrchestrator);
    registry.register('roof', RoofOrchestrator);
    registry.register('wainscot', WainscotOrchestrator);
    registry.register('openings', OpeningOrchestrator);
    registry.register('trims', TrimOrchestrator);
    registry.register('ridge', RidgeOrchestrator);
    registry.register('gutters', GuttersOrchestrator);
    registry.register('mezzanine', MezzanineOrchestrator);
    registry.register('crane', CraneOrchestrator);
    registry.register('liner', LinerOrchestrator);
    registry.register('driveway', DrivewayOrchestrator);
    registry.register('logo', LogoOrchestrator);
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
    const colors = createColorsFromModel(buildingModel);
    const materials = createRuntimeMaterialSystem(colors);
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

    const cameraControls = createCameraControls({
        camera,
        domElement: renderer.domElement,
        onUpdate: render
    });

    const openingInteraction = createOpeningInteraction({
        camera,
        domElement: renderer.domElement,
        buildingRoot,
        onOpeningChange(change) {
            const nextOpenings = buildingModel.openings.map(op => {
                if (op.id === change.id) {
                    return { ...op, x: change.x, yOff: change.yOff };
                }
                return op;
            });
            update({ ...buildingModel, openings: nextOpenings });
        }
    });

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
        render();
    }

    function render() {
        if (disposed) return;
        renderer.render(scene, camera);
    }

    function update(nextModel) {
        if (disposed) throw new Error('UBuild runtime is disposed');

        buildingModel = createBuildingModel(nextModel);
        buildingGeometry = createBuildingGeometry(buildingModel);

        const updatedColors = createColorsFromModel(buildingModel);
        materials.updatePalette(updatedColors);

        const nextContext = createContext({
            model: buildingModel,
            geometry: buildingGeometry,
            materials,
            colors: updatedColors,
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

    function autoFrame() {
        cameraControls.frameBounds(buildingGeometry.bounds);
        render();
    }

    function setDateTimeLocation(config = {}) {
        if (disposed) throw new Error('UBuild runtime is disposed');

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
        if (disposed) throw new Error('UBuild runtime is disposed');
        updateLightingAndEnvironment();
        resize();
        autoFrame();
        return api;
    }

    function dispose() {
        if (disposed) return;
        disposed = true;

        cameraControls.dispose();
        openingInteraction.dispose();
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
        controls: cameraControls,
        interaction: openingInteraction,
        materials,
        registry,
        root: buildingRoot,
        start,
        render,
        resize,
        update,
        autoFrame,
        setDateTimeLocation,
        dispose
    });

    window.addEventListener('resize', resize);
    return api;
}