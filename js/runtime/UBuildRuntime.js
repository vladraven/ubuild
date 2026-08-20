import * as THREE from 'three';

import {
    createBuildingModel
} from '../model/buildingModel.js';

import {
    createBuildingGeometry
} from '../model/geometry/buildingGeometry.js';

import {
    createElementRegistry
} from '../elements/ElementRegistry.js';

import {
    WallOrchestrator
} from '../elements/wall/WallOrchestrator.js';

import {
    RoofOrchestrator
} from '../elements/roof/RoofOrchestrator.js';

import {
    FoundationOrchestrator
} from '../elements/Foundation/FoundationOrchestrator.js';

import {
    StructuralOrchestrator
} from '../elements/structural/StructuralOrchestrator.js';

import {
    OpeningOrchestrator
} from '../elements/opening/OpeningOrchestrator.js';

function assertContainer(
    container
) {
    if (
        !container ||
        typeof container.appendChild !==
            'function'
    ) {
        throw new TypeError(
            'A DOM container is required'
        );
    }
}

function createScene() {
    const scene =
        new THREE.Scene();

    scene.background =
        new THREE.Color(
            0x87ceeb
        );

    return scene;
}

function createCamera(
    container,
    geometry
) {
    const width =
        Math.max(
            container.clientWidth,
            1
        );

    const height =
        Math.max(
            container.clientHeight,
            1
        );

    const camera =
        new THREE.PerspectiveCamera(
            45,
            width / height,
            0.1,
            5000
        );

    const bounds =
        geometry.bounds;

    const center =
        bounds.center;

    const size =
        Math.max(
            bounds.width,
            bounds.height,
            bounds.length,
            1
        );

    camera.position.set(
        center.x +
            size * 1.4,
        center.y +
            size * 0.9,
        center.z +
            size * 1.4
    );

    camera.lookAt(
        center.x,
        center.y,
        center.z
    );

    return camera;
}

function createRenderer(
    container
) {
    const renderer =
        new THREE.WebGLRenderer({
            antialias: true
        });

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio ||
                1,
            2
        )
    );

    renderer.setSize(
        Math.max(
            container.clientWidth,
            1
        ),
        Math.max(
            container.clientHeight,
            1
        )
    );

    container.appendChild(
        renderer.domElement
    );

    return renderer;
}

function createLights(
    scene
) {
    const ambient =
        new THREE.AmbientLight(
            0xffffff,
            1.5
        );

    const directional =
        new THREE.DirectionalLight(
            0xffffff,
            2
        );

    directional.position.set(
        30,
        50,
        20
    );

    scene.add(
        ambient,
        directional
    );

    return Object.freeze({
        ambient,
        directional
    });
}

function createMaterialSystem() {
    const wallMetal =
        new THREE.MeshStandardMaterial({
            color: 0x777777,
            metalness: 0.35,
            roughness: 0.7
        });

    const roofMetal =
        new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.4,
            roughness: 0.65
        });

    const structuralSteel =
        new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.65,
            roughness: 0.45
        });

    const concrete =
        new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.9
        });

    const trimMetal =
        new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.55,
            roughness: 0.5
        });

    const doorPanel =
        new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.2,
            roughness: 0.8
        });

    const glass =
        new THREE.MeshStandardMaterial({
            color: 0x9ccfff,
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            metalness: 0
        });

    const materials =
        new Map([
            [
                'wallMetal',
                wallMetal
            ],
            [
                'roofMetal',
                roofMetal
            ],
            [
                'structuralSteel',
                structuralSteel
            ],
            [
                'steel',
                structuralSteel
            ],
            [
                'concrete',
                concrete
            ],
            [
                'trimMetal',
                trimMetal
            ],
            [
                'doorTrim',
                trimMetal
            ],
            [
                'doorFrame',
                trimMetal
            ],
            [
                'frame',
                trimMetal
            ],
            [
                'doorPanel',
                doorPanel
            ],
            [
                'glass',
                glass
            ],
            [
                'wall',
                wallMetal
            ]
        ]);

    const api = {
        concrete,

        steel:
            structuralSteel,

        wallMetal,

        roofMetal,

        structuralSteel,

        trimMetal,

        doorTrim:
            trimMetal,

        doorFrame:
            trimMetal,

        frame:
            trimMetal,

        doorPanel,

        glass,

        wall:
            wallMetal,

        get(
            name
        ) {
            return (
                materials.get(
                    name
                ) ??
                materials.get(
                    'steel'
                )
            );
        }
    };

    return Object.freeze(
        api
    );
}

function createColors() {
    return Object.freeze({
        wall: 0x777777,

        roof: 0x555555,

        frame: 0x444444,

        trim: 0x444444,

        glass: 0x9ccfff
    });
}

function createRegistry() {
    const registry =
        createElementRegistry();

    registry.register(
        'walls',
        WallOrchestrator
    );

    registry.register(
        'roof',
        RoofOrchestrator
    );

    registry.register(
        'foundation',
        FoundationOrchestrator
    );

    registry.register(
        'structural',
        StructuralOrchestrator
    );

    registry.register(
        'openings',
        OpeningOrchestrator
    );

    return registry;
}

function createContext({
    model,
    geometry,
    materials,
    colors,
    scene,
    camera,
    renderer
}) {
    return {
        model,

        geometry,

        panelGeometry:
            geometry.panels,

        structuralGeometry: {
            frames:
                geometry.frames,

            girts:
                geometry.girts,

            purlins:
                geometry.purlins,

            endWallColumns:
                geometry.endWallColumns
        },

        materials,

        colors,

        scene,

        camera,

        renderer
    };
}

function addInstances(
    root,
    instances
) {
    for (
        const [
            id,
            instance
        ]
        of instances
    ) {
        if (
            !instance ||
            !instance.object
        ) {
            continue;
        }

        instance.object.name =
            id;

        root.add(
            instance.object
        );
    }
}

function clearRoot(
    root
) {
    for (
        const child
        of [...root.children]
    ) {
        root.remove(
            child
        );
    }
}

export function createUBuildRuntime({
    container,
    model = {}
} = {}) {
    assertContainer(
        container
    );

    const buildingModel =
        createBuildingModel(
            model
        );

    const buildingGeometry =
        createBuildingGeometry(
            buildingModel
        );

    const scene =
        createScene();

    const camera =
        createCamera(
            container,
            buildingGeometry
        );

    const renderer =
        createRenderer(
            container
        );

    const lights =
        createLights(
            scene
        );

    const materials =
        createMaterialSystem();

    const colors =
        createColors();

    const registry =
        createRegistry();

    const root =
        new THREE.Group();

    root.name =
        'u-build';

    scene.add(
        root
    );

    const context =
        createContext({
            model:
                buildingModel,

            geometry:
                buildingGeometry,

            materials,

            colors,

            scene,

            camera,

            renderer
        });

    const instances =
        registry.createAll(
            context
        );

    addInstances(
        root,
        instances
    );

    let currentInstances =
        instances;

    let disposed =
        false;

    function resize() {
        if (disposed) {
            return;
        }

        const width =
            Math.max(
                container.clientWidth,
                1
            );

        const height =
            Math.max(
                container.clientHeight,
                1
            );

        camera.aspect =
            width / height;

        camera.updateProjectionMatrix();

        renderer.setSize(
            width,
            height
        );
    }

    function render() {
        if (disposed) {
            return;
        }

        renderer.render(
            scene,
            camera
        );
    }

    function update(
        nextModel
    ) {
        if (disposed) {
            throw new Error(
                'UBuild runtime is disposed'
            );
        }

        const nextBuildingModel =
            createBuildingModel(
                nextModel
            );

        const nextGeometry =
            createBuildingGeometry(
                nextBuildingModel
            );

        const nextContext =
            createContext({
                model:
                    nextBuildingModel,

                geometry:
                    nextGeometry,

                materials,

                colors,

                scene,

                camera,

                renderer
            });

        const nextInstances =
            registry.updateAll(
                currentInstances,
                nextContext
            );

        clearRoot(
            root
        );

        addInstances(
            root,
            nextInstances
        );

        currentInstances =
            nextInstances;

        context.model =
            nextBuildingModel;

        context.geometry =
            nextGeometry;

        render();

        return nextBuildingModel;
    }

    function start() {
        if (disposed) {
            throw new Error(
                'UBuild runtime is disposed'
            );
        }

        resize();

        render();

        return api;
    }

    function dispose() {
        if (disposed) {
            return;
        }

        disposed = true;

        registry.disposeAll(
            currentInstances
        );

        renderer.dispose();

        renderer.domElement.remove();

        window.removeEventListener(
            'resize',
            resize
        );
    }

    const api = Object.freeze({
        model:
            buildingModel,

        geometry:
            buildingGeometry,

        scene,

        camera,

        renderer,

        lights,

        materials,

        registry,

        root,

        start,

        render,

        resize,

        update,

        dispose
    });

    window.addEventListener(
        'resize',
        resize
    );

    return api;
}