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
    createElementOrchestrator
} from '../elements/ElementOrchestrator.js';

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

import {
    AwningElement
} from '../elements/awning/AwningElement.js';

import {
    TrimOrchestrator
} from '../elements/trim/TrimOrchestrator.js';

import {
    WainscotOrchestrator
} from '../elements/wainscot/WainscotOrchestrator.js';

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
    container
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
            1000
        );

    camera.position.set(
        35,
        25,
        35
    );

    camera.lookAt(
        0,
        3,
        10
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

    scene.add(
        ambient
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
        directional
    );

    return {
        ambient,
        directional
    };
}

function createFallbackMaterialSystem() {
    const materials =
        new Map();

    materials.set(
        'steel',
        new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 0.5,
            roughness: 0.6
        })
    );

    materials.set(
        'trimMetal',
        new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.6,
            roughness: 0.5
        })
    );

    materials.set(
        'doorTrim',
        materials.get(
            'trimMetal'
        )
    );

    materials.set(
        'doorFrame',
        materials.get(
            'trimMetal'
        )
    );

    materials.set(
        'frame',
        materials.get(
            'trimMetal'
        )
    );

    materials.set(
        'doorPanel',
        new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.2,
            roughness: 0.8
        })
    );

    materials.set(
        'glass',
        new THREE.MeshStandardMaterial({
            color: 0x9ccfff,
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            metalness: 0
        })
    );

    materials.set(
        'wall',
        materials.get(
            'doorPanel'
        )
    );

    return Object.freeze({
        get(
            name
        ) {
            if (
                materials.has(name)
            ) {
                return materials.get(
                    name
                );
            }

            return materials.get(
                'steel'
            );
        }
    });
}

function registerElements() {
    const registry =
        createElementRegistry();

    const elements = [
        [
            'walls',
            WallOrchestrator
        ],

        [
            'roof',
            RoofOrchestrator
        ],

        [
            'foundation',
            FoundationOrchestrator
        ],

        [
            'structural',
            StructuralOrchestrator
        ],

        [
            'openings',
            OpeningOrchestrator
        ],

        [
            'trim',
            TrimOrchestrator
        ],

        [
            'wainscot',
            WainscotOrchestrator
        ]
    ];

    for (
        const [
            id,
            orchestrator
        ]
        of elements
    ) {
        registry.register(
            id,
            orchestrator
        );
    }

    if (
        AwningElement &&
        typeof AwningElement.create ===
            'function'
    ) {
        registry.register(
            'awning',
            AwningElement
        );
    }

    return registry;
}

function createRootObject(
    scene,
    registry,
    context
) {
    const root =
        new THREE.Group();

    root.name =
        'u-build';

    const instances =
        registry.createAll(
            context
        );

    for (
        const [
            id,
            instance
        ]
        of instances
    ) {
        if (
            instance?.object
        ) {
            instance.object.name =
                id;

            root.add(
                instance.object
            );
        }
    }

    scene.add(
        root
    );

    return {
        root,
        instances
    };
}

export function createUBuildRuntime({
    container,
    model = {},
    materials = null
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
            container
        );

    const renderer =
        createRenderer(
            container
        );

    const lights =
        createLights(
            scene
        );

    const materialSystem =
        materials ??
        createFallbackMaterialSystem();

    const registry =
        registerElements();

    const context = {
        model:
            buildingModel,

        geometry:
            buildingGeometry,

        materials:
            materialSystem,

        scene,

        camera,

        renderer,

        colors: {}
    };

    const runtime =
        createRootObject(
            scene,
            registry,
            context
        );

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

        const nextContext = {
            ...context,

            model:
                nextBuildingModel,

            geometry:
                nextGeometry
        };

        const nextInstances =
            registry.updateAll(
                runtime.instances,
                nextContext
            );

        for (
            const [
                id,
                instance
            ]
            of nextInstances
        ) {
            const previous =
                runtime.instances.get(
                    id
                );

            if (
                previous?.object &&
                instance?.object &&
                previous.object !==
                    instance.object
            ) {
                runtime.root.remove(
                    previous.object
                );

                runtime.root.add(
                    instance.object
                );
            }
        }

        runtime.instances =
            nextInstances;

        context.model =
            nextBuildingModel;

        context.geometry =
            nextGeometry;

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
            runtime.instances
        );

        renderer.dispose();

        renderer.domElement.remove();

        window.removeEventListener(
            'resize',
            resize
        );
    }

    const api = {
        model:
            buildingModel,

        geometry:
            buildingGeometry,

        scene,

        camera,

        renderer,

        registry,

        root:
            runtime.root,

        start,

        render,

        resize,

        update,

        dispose
    };

    window.addEventListener(
        'resize',
        resize
    );

    return Object.freeze(
        api
    );
}