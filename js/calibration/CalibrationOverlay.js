const DEFAULT_CONFIG =
    Object.freeze({
        enabled:
            true,

        preset:
            'custom',

        lighting:
            {
                ambient:
                    {
                        enabled:
                            true,

                        color:
                            '#ffffff',

                        intensity:
                            0.5
                    },

                hemisphere:
                    {
                        enabled:
                            true,

                        skyColor:
                            '#ffffff',

                        groundColor:
                            '#999999',

                        intensity:
                            0.5
                    },

                sun:
                    {
                        enabled:
                            true,

                        color:
                            '#ffffff',

                        intensity:
                            0.5,

                        position:
                            {
                                x:
                                    150,

                                y:
                                    250,

                                z:
                                    120
                            },

                        shadow:
                            {
                                bias:
                                    -0.001,

                                normalBias:
                                    0.05,

                                radius:
                                    2.5,

                                mapSize:
                                    4096
                            }
                    }
            },

        renderer:
            {
                toneMapping:
                    'ACESFilmicToneMapping',

                toneMappingExposure:
                    0.5,

                outputEncoding:
                    'sRGBEncoding'
            },

        environment:
            {
                fog:
                    {
                        enabled:
                            true,

                        color:
                            '#dce7f3',

                        density:
                            0.0006
                    },

                blur:
                    0.14,

                intensity:
                    0.27
            },

        ground:
            {
                color:
                    '#ffffff',

                vertexColors:
                    true,

                roughness:
                    0.9,

                metalness:
                    0.1,

                bumpScale:
                    0.5
            },

        materials:
            {
                steel:
                    {
                        roughness:
                            1,

                        metalness:
                            1
                    },

                structuralSteel:
                    {
                        roughness:
                            1,

                        metalness:
                            1
                    },

                wallMetal:
                    {
                        roughness:
                            0.75,

                        metalness:
                            0
                    },

                wainscotMetal:
                    {
                        roughness:
                            0.75,

                        metalness:
                            0
                    },

                roofMetal:
                    {
                        roughness:
                            0.75,

                        metalness:
                            0
                    },

                trimMetal:
                    {
                        roughness:
                            0.75,

                        metalness:
                            0
                    },

                concrete:
                    {
                        roughness:
                            1,

                        metalness:
                            0
                    },

                glass:
                    {
                        roughness:
                            0.08,

                        metalness:
                            0,

                        opacity:
                            0.45
                    },

                ceiling:
                    {
                        roughness:
                            1,

                        metalness:
                            0
                    },

                interiorWall:
                    {
                        roughness:
                            1,

                        metalness:
                            0
                    },

                mezzanine:
                    {
                        roughness:
                            1,

                        metalness:
                            1
                    }
            },

        panels:
            {
                awrRibHeight:
                    1,

                ssr24RibHeight:
                    1.5,

                smoothHeight:
                    0,

                normalStrength:
                    1.5,

                normalSamplePixels:
                    2,

                textureSize:
                    1024,

                textureRepeatsPerPanel:
                    1,

                bumpScale:
                    0.5
            }
    });

const PRESETS =
    Object.freeze({
        custom:
            {},

        current:
            DEFAULT_CONFIG,

        neutral:
            {
                lighting:
                    {
                        ambient:
                            {
                                color:
                                    '#ffffff',

                                intensity:
                                    0.35
                            },

                        hemisphere:
                            {
                                skyColor:
                                    '#ffffff',

                                groundColor:
                                    '#ffffff',

                                intensity:
                                    0.25
                            },

                        sun:
                            {
                                color:
                                    '#ffffff',

                                intensity:
                                    0.75
                            }
                    },

                renderer:
                    {
                        toneMappingExposure:
                            0.75
                    },

                environment:
                    {
                        intensity:
                            0,

                        blur:
                            0
                    },

                materials:
                    {
                        wallMetal:
                            {
                                roughness:
                                    0.75,

                                metalness:
                                    0
                            },

                        wainscotMetal:
                            {
                                roughness:
                                    0.75,

                                metalness:
                                    0
                            },

                        roofMetal:
                            {
                                roughness:
                                    0.75,

                                metalness:
                                    0
                            },

                        trimMetal:
                            {
                                roughness:
                                    0.75,

                                metalness:
                                    0
                            }
                    }
            },

        noEnvironment:
            {
                environment:
                    {
                        intensity:
                            0,

                        blur:
                            0
                    }
            },

        noHemisphere:
            {
                lighting:
                    {
                        hemisphere:
                            {
                                enabled:
                                    false,

                                intensity:
                                    0
                            }
                    }
            },

        noAmbient:
            {
                lighting:
                    {
                        ambient:
                            {
                                enabled:
                                    false,

                                intensity:
                                    0
                            }
                    }
            }
    });

const MATERIAL_NAMES =
    Object.freeze([
        'steel',
        'structuralSteel',
        'wallMetal',
        'wainscotMetal',
        'roofMetal',
        'trimMetal',
        'concrete',
        'glass',
        'ceiling',
        'interiorWall',
        'mezzanine'
    ]);

const PANEL_CONSTANT_NAMES =
    Object.freeze({
        awrRibHeight:
            'AWR_RIB_HEIGHT',

        ssr24RibHeight:
            'SSR24_RIB_HEIGHT',

        smoothHeight:
            'SMOOTH_HEIGHT',

        normalStrength:
            'NORMAL_STRENGTH',

        normalSamplePixels:
            'NORMAL_SAMPLE_PIXELS',

        textureSize:
            'PANEL_TEXTURE_SIZE',

        textureRepeatsPerPanel:
            'TEXTURE_REPEATS_PER_PANEL',

        bumpScale:
            'DEFAULT_BUMP_SCALE'
    });

function clone(
    value
) {
    return JSON.parse(
        JSON.stringify(
            value
        )
    );
}

function mergeDeep(
    target,
    source
) {
    if (
        !source ||
        typeof source !==
        'object'
    ) {
        return target;
    }

    for (
        const [
            key,
            value
        ]
        of Object.entries(
            source
        )
    ) {
        if (
            value &&
            typeof value ===
            'object' &&
            !Array.isArray(
                value
            )
        ) {
            if (
                !target[key] ||
                typeof target[key] !==
                'object'
            ) {
                target[key] =
                    {};
            }

            mergeDeep(
                target[key],
                value
            );

            continue;
        }

        target[key] =
            value;
    }

    return target;
}

function clamp(
    value,
    min,
    max
) {
    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}

function toNumber(
    value,
    fallback
) {
    const number =
        Number(
            value
        );

    if (
        Number.isFinite(
            number
        )
    ) {
        return number;
    }

    return fallback;
}

function normalizeColor(
    value,
    fallback
) {
    if (
        typeof value !==
        'string'
    ) {
        return fallback;
    }

    const color =
        value.trim();

    if (
        /^#[0-9a-f]{6}$/i.test(
            color
        )
    ) {
        return color;
    }

    return fallback;
}

function normalizeConfig(
    config
) {
    const normalized =
        mergeDeep(
            clone(
                DEFAULT_CONFIG
            ),
            config
        );

    normalized.enabled =
        Boolean(
            normalized.enabled
        );

    normalized.preset =
        typeof normalized.preset ===
        'string'
            ? normalized.preset
            : 'custom';

    normalized.lighting.ambient.enabled =
        Boolean(
            normalized
                .lighting
                .ambient
                .enabled
        );

    normalized.lighting.ambient.color =
        normalizeColor(
            normalized
                .lighting
                .ambient
                .color,
            DEFAULT_CONFIG
                .lighting
                .ambient
                .color
        );

    normalized.lighting.ambient.intensity =
        Math.max(
            0,
            toNumber(
                normalized
                    .lighting
                    .ambient
                    .intensity,
                DEFAULT_CONFIG
                    .lighting
                    .ambient
                    .intensity
            )
        );

    normalized.lighting.hemisphere.enabled =
        Boolean(
            normalized
                .lighting
                .hemisphere
                .enabled
        );

    normalized.lighting.hemisphere.skyColor =
        normalizeColor(
            normalized
                .lighting
                .hemisphere
                .skyColor,
            DEFAULT_CONFIG
                .lighting
                .hemisphere
                .skyColor
        );

    normalized.lighting.hemisphere.groundColor =
        normalizeColor(
            normalized
                .lighting
                .hemisphere
                .groundColor,
            DEFAULT_CONFIG
                .lighting
                .hemisphere
                .groundColor
        );

    normalized.lighting.hemisphere.intensity =
        Math.max(
            0,
            toNumber(
                normalized
                    .lighting
                    .hemisphere
                    .intensity,
                DEFAULT_CONFIG
                    .lighting
                    .hemisphere
                    .intensity
            )
        );

    normalized.lighting.sun.enabled =
        Boolean(
            normalized
                .lighting
                .sun
                .enabled
        );

    normalized.lighting.sun.color =
        normalizeColor(
            normalized
                .lighting
                .sun
                .color,
            DEFAULT_CONFIG
                .lighting
                .sun
                .color
        );

    normalized.lighting.sun.intensity =
        Math.max(
            0,
            toNumber(
                normalized
                    .lighting
                    .sun
                    .intensity,
                DEFAULT_CONFIG
                    .lighting
                    .sun
                    .intensity
            )
        );

    for (
        const axis of [
            'x',
            'y',
            'z'
        ]
    ) {
        normalized
            .lighting
            .sun
            .position[axis] =
            toNumber(
                normalized
                    .lighting
                    .sun
                    .position[axis],
                DEFAULT_CONFIG
                    .lighting
                    .sun
                    .position[axis]
            );
    }

    normalized
        .lighting
        .sun
        .shadow
        .bias =
        toNumber(
            normalized
                .lighting
                .sun
                .shadow
                .bias,
            DEFAULT_CONFIG
                .lighting
                .sun
                .shadow
                .bias
        );

    normalized
        .lighting
        .sun
        .shadow
        .normalBias =
        Math.max(
            0,
            toNumber(
                normalized
                    .lighting
                    .sun
                    .shadow
                    .normalBias,
                DEFAULT_CONFIG
                    .lighting
                    .sun
                    .shadow
                    .normalBias
            )
        );

    normalized
        .lighting
        .sun
        .shadow
        .radius =
        Math.max(
            0,
            toNumber(
                normalized
                    .lighting
                    .sun
                    .shadow
                    .radius,
                DEFAULT_CONFIG
                    .lighting
                    .sun
                    .shadow
                    .radius
            )
        );

    normalized
        .lighting
        .sun
        .shadow
        .mapSize =
        Math.max(
            256,
            Math.round(
                toNumber(
                    normalized
                        .lighting
                        .sun
                        .shadow
                        .mapSize,
                    DEFAULT_CONFIG
                        .lighting
                        .sun
                        .shadow
                        .mapSize
                )
            )
        );

    normalized.renderer.toneMappingExposure =
        Math.max(
            0,
            toNumber(
                normalized
                    .renderer
                    .toneMappingExposure,
                DEFAULT_CONFIG
                    .renderer
                    .toneMappingExposure
            )
        );

    normalized.environment.fog.enabled =
        Boolean(
            normalized
                .environment
                .fog
                .enabled
        );

    normalized.environment.fog.color =
        normalizeColor(
            normalized
                .environment
                .fog
                .color,
            DEFAULT_CONFIG
                .environment
                .fog
                .color
        );

    normalized.environment.fog.density =
        Math.max(
            0,
            toNumber(
                normalized
                    .environment
                    .fog
                    .density,
                DEFAULT_CONFIG
                    .environment
                    .fog
                    .density
            )
        );

    normalized.environment.blur =
        clamp(
            toNumber(
                normalized
                    .environment
                    .blur,
                DEFAULT_CONFIG
                    .environment
                    .blur
            ),
            0,
            1
        );

    normalized.environment.intensity =
        Math.max(
            0,
            toNumber(
                normalized
                    .environment
                    .intensity,
                DEFAULT_CONFIG
                    .environment
                    .intensity
            )
        );

    normalized.ground.color =
        normalizeColor(
            normalized.ground.color,
            DEFAULT_CONFIG.ground.color
        );

    normalized.ground.vertexColors =
        Boolean(
            normalized
                .ground
                .vertexColors
        );

    normalized.ground.roughness =
        clamp(
            toNumber(
                normalized
                    .ground
                    .roughness,
                DEFAULT_CONFIG
                    .ground
                    .roughness
            ),
            0,
            1
        );

    normalized.ground.metalness =
        clamp(
            toNumber(
                normalized
                    .ground
                    .metalness,
                DEFAULT_CONFIG
                    .ground
                    .metalness
            ),
            0,
            1
        );

    normalized.ground.bumpScale =
        Math.max(
            0,
            toNumber(
                normalized
                    .ground
                    .bumpScale,
                DEFAULT_CONFIG
                    .ground
                    .bumpScale
            )
        );

    for (
        const name of
        MATERIAL_NAMES
    ) {
        normalized
            .materials[name]
            .roughness =
            clamp(
                toNumber(
                    normalized
                        .materials[name]
                        .roughness,
                    DEFAULT_CONFIG
                        .materials[name]
                        .roughness
                ),
                0,
                1
            );

        normalized
            .materials[name]
            .metalness =
            clamp(
                toNumber(
                    normalized
                        .materials[name]
                        .metalness,
                    DEFAULT_CONFIG
                        .materials[name]
                        .metalness
                ),
                0,
                1
            );
    }

    normalized
        .materials
        .glass
        .opacity =
        clamp(
            toNumber(
                normalized
                    .materials
                    .glass
                    .opacity,
                DEFAULT_CONFIG
                    .materials
                    .glass
                    .opacity
            ),
            0,
            1
        );

    normalized
        .panels
        .awrRibHeight =
        Math.max(
            0,
            toNumber(
                normalized
                    .panels
                    .awrRibHeight,
                DEFAULT_CONFIG
                    .panels
                    .awrRibHeight
            )
        );

    normalized
        .panels
        .ssr24RibHeight =
        Math.max(
            0,
            toNumber(
                normalized
                    .panels
                    .ssr24RibHeight,
                DEFAULT_CONFIG
                    .panels
                    .ssr24RibHeight
            )
        );

    normalized
        .panels
        .smoothHeight =
        Math.max(
            0,
            toNumber(
                normalized
                    .panels
                    .smoothHeight,
                DEFAULT_CONFIG
                    .panels
                    .smoothHeight
            )
        );

    normalized
        .panels
        .normalStrength =
        Math.max(
            0,
            toNumber(
                normalized
                    .panels
                    .normalStrength,
                DEFAULT_CONFIG
                    .panels
                    .normalStrength
            )
        );

    normalized
        .panels
        .normalSamplePixels =
        Math.max(
            1,
            Math.round(
                toNumber(
                    normalized
                        .panels
                        .normalSamplePixels,
                    DEFAULT_CONFIG
                        .panels
                        .normalSamplePixels
                )
            )
        );

    normalized
        .panels
        .textureSize =
        Math.max(
            64,
            Math.round(
                toNumber(
                    normalized
                        .panels
                        .textureSize,
                    DEFAULT_CONFIG
                        .panels
                        .textureSize
                )
            )
        );

    normalized
        .panels
        .textureRepeatsPerPanel =
        Math.max(
            1,
            toNumber(
                normalized
                    .panels
                    .textureRepeatsPerPanel,
                DEFAULT_CONFIG
                    .panels
                    .textureRepeatsPerPanel
            )
        );

    normalized
        .panels
        .bumpScale =
        Math.max(
            0,
            toNumber(
                normalized
                    .panels
                    .bumpScale,
                DEFAULT_CONFIG
                    .panels
                    .bumpScale
            )
        );

    return normalized;
}

function getToneMapping(
    THREE,
    name
) {
    const toneMappings =
        {
            NoToneMapping:
                THREE.NoToneMapping,

            LinearToneMapping:
                THREE.LinearToneMapping,

            ReinhardToneMapping:
                THREE.ReinhardToneMapping,

            CineonToneMapping:
                THREE.CineonToneMapping,

            ACESFilmicToneMapping:
                THREE.ACESFilmicToneMapping
        };

    return toneMappings[name] ??
        THREE.ACESFilmicToneMapping;
}

function getOutputEncoding(
    THREE,
    name
) {
    const encodings =
        {
            LinearEncoding:
                THREE.LinearEncoding,

            sRGBEncoding:
                THREE.sRGBEncoding
        };

    return encodings[name] ??
        THREE.sRGBEncoding;
}

function getByPath(
    object,
    path
) {
    return path
        .split(
            '.'
        )
        .reduce(
            (
                current,
                key
            ) =>
                current?.[key],
            object
        );
}

function setByPath(
    object,
    path,
    value
) {
    const parts =
        path.split(
            '.'
        );

    const last =
        parts.pop();

    let current =
        object;

    for (
        const part of
        parts
    ) {
        if (
            !current[part] ||
            typeof current[part] !==
            'object'
        ) {
            current[part] =
                {};
        }

        current =
            current[part];
    }

    current[last] =
        value;
}

function createButton(
    label,
    onClick
) {
    const button =
        document.createElement(
            'button'
        );

    button.type =
        'button';

    button.textContent =
        label;

    button.style.cursor =
        'pointer';

    button.style.padding =
        '6px 10px';

    button.style.border =
        '1px solid #555';

    button.style.borderRadius =
        '4px';

    button.style.background =
        '#1b1b1b';

    button.style.color =
        '#ffffff';

    button.addEventListener(
        'click',
        onClick
    );

    return button;
}

function createSection(
    title
) {
    const details =
        document.createElement(
            'details'
        );

    details.open =
        false;

    const summary =
        document.createElement(
            'summary'
        );

    summary.textContent =
        title;

    summary.style.cursor =
        'pointer';

    summary.style.fontWeight =
        '700';

    summary.style.padding =
        '8px 0';

    details.append(
        summary
    );

    return details;
}

function createRow(
    label
) {
    const row =
        document.createElement(
            'div'
        );

    row.style.display =
        'grid';

    row.style.gridTemplateColumns =
        'minmax(130px, 1fr) minmax(100px, 1fr)';

    row.style.gap =
        '8px';

    row.style.alignItems =
        'center';

    row.style.margin =
        '6px 0';

    const labelElement =
        document.createElement(
            'label'
        );

    labelElement.textContent =
        label;

    row.append(
        labelElement
    );

    return row;
}

export class CalibrationOverlay {
    constructor(
        options = {}
    ) {
        this.runtime =
            options.runtime ??
            null;

        this.THREE =
            options.THREE ??
            window.THREE ??
            null;

        this.config =
            normalizeConfig(
                options.config ??
                DEFAULT_CONFIG
            );

        this.originalConfig =
            null;

        this.originalState =
            {
                lights:
                    new Map(),

                materials:
                    new Map(),

                renderer:
                    null,

                scene:
                    null,

                ground:
                    null,

                panelConstants:
                    new Map()
            };

        this.root =
            null;

        this.inputs =
            new Map();

        this.panelOverrides =
            new Map();

        this.started =
            false;

        this.visible =
            true;
    }

    start() {
        if (
            this.started
        ) {
            return this;
        }

        if (
            !this.config.enabled
        ) {
            return this;
        }

        this.captureOriginalState();

        this.originalConfig =
            clone(
                this.config
            );

        this.createUI();

        this.apply();

        this.started =
            true;

        return this;
    }

    setRuntime(
        runtime
    ) {
        this.runtime =
            runtime;

        if (
            this.started
        ) {
            this.captureOriginalState();
            this.apply();
        }

        return this;
    }

    getScene() {
        return (
            this.runtime?.scene ??
            this.runtime?.renderer?.scene ??
            null
        );
    }

    getRenderer() {
        return (
            this.runtime?.renderer ??
            this.runtime?.rendererSystem?.renderer ??
            null
        );
    }

    getTHREE() {
        return (
            this.THREE ??
            this.runtime?.THREE ??
            window.THREE ??
            null
        );
    }

    getLightCandidates() {
        const lights =
            {
                ambient:
                    null,

                hemisphere:
                    null,

                sun:
                    null
            };

        const scene =
            this.getScene();

        if (
            !scene ||
            typeof scene.traverse !==
            'function'
        ) {
            return lights;
        }

        scene.traverse(
            object => {
                if (
                    object.isAmbientLight
                ) {
                    lights.ambient ??=
                        object;

                    return;
                }

                if (
                    object.isHemisphereLight
                ) {
                    lights.hemisphere ??=
                        object;

                    return;
                }

                if (
                    object.isDirectionalLight
                ) {
                    lights.sun ??=
                        object;
                }
            }
        );

        return lights;
    }

    captureOriginalState() {
        const renderer =
            this.getRenderer();

        if (
            renderer &&
            !this.originalState.renderer
        ) {
            this.originalState.renderer =
                {
                    toneMapping:
                        renderer.toneMapping,

                    toneMappingExposure:
                        renderer.toneMappingExposure,

                    outputEncoding:
                        renderer.outputEncoding
                };
        }

        const scene =
            this.getScene();

        if (
            scene &&
            !this.originalState.scene
        ) {
            this.originalState.scene =
                {
                    fog:
                        scene.fog
                            ? {
                                color:
                                    `#${scene.fog.color.getHexString()}`,

                                density:
                                    scene.fog.density
                            }
                            : null,

                    environmentIntensity:
                        scene.environmentIntensity
                };
        }

        const lights =
            this.getLightCandidates();

        for (
            const [
                name,
                light
            ]
            of Object.entries(
                lights
            )
        ) {
            if (
                !light ||
                this.originalState.lights.has(
                    name
                )
            ) {
                continue;
            }

            this.originalState.lights.set(
                name,
                {
                    visible:
                        light.visible,

                    color:
                        light.color
                            ? `#${light.color.getHexString()}`
                            : null,

                    intensity:
                        light.intensity,

                    position:
                        light.position
                            ? light.position.clone()
                            : null,

                    skyColor:
                        light.skyColor
                            ? `#${light.skyColor.getHexString()}`
                            : null,

                    groundColor:
                        light.groundColor
                            ? `#${light.groundColor.getHexString()}`
                            : null,

                    shadow:
                        light.shadow
                            ? {
                                bias:
                                    light.shadow.bias,

                                normalBias:
                                    light.shadow.normalBias,

                                radius:
                                    light.shadow.radius,

                                mapSize:
                                    light.shadow.mapSize.clone()
                            }
                            : null
                }
            );
        }

        this.captureMaterials(
            scene
        );

        this.captureGround(
            scene
        );
    }

    captureMaterials(
        scene
    ) {
        if (
            !scene ||
            typeof scene.traverse !==
            'function'
        ) {
            return;
        }

        scene.traverse(
            object => {
                if (
                    !object.isMesh ||
                    !object.material
                ) {
                    return;
                }

                const materials =
                    Array.isArray(
                        object.material
                    )
                        ? object.material
                        : [
                            object.material
                        ];

                for (
                    const material of
                    materials
                ) {
                    if (
                        !material ||
                        this.originalState.materials.has(
                            material.uuid
                        )
                    ) {
                        continue;
                    }

                    this.originalState.materials.set(
                        material.uuid,
                        {
                            material,

                            roughness:
                                material.roughness,

                            metalness:
                                material.metalness,

                            opacity:
                                material.opacity,

                            transparent:
                                material.transparent
                        }
                    );
                }
            }
        );
    }

    captureGround(
        scene
    ) {
        if (
            this.originalState.ground ||
            !scene ||
            typeof scene.traverse !==
            'function'
        ) {
            return;
        }

        let ground =
            null;

        scene.traverse(
            object => {
                if (
                    ground ||
                    !object.isMesh
                ) {
                    return;
                }

                const name =
                    object.name
                        ?.toLowerCase() ??
                    '';

                if (
                    name.includes(
                        'ground'
                    )
                ) {
                    ground =
                        object;
                }
            }
        );

        if (
            !ground
        ) {
            return;
        }

        this.originalState.ground =
            {
                object:
                    ground,

                material:
                    ground.material
            };
    }

    apply() {
        if (
            !this.config.enabled
        ) {
            return this;
        }

        this.applyRenderer();
        this.applyLighting();
        this.applyEnvironment();
        this.applyMaterials();
        this.applyGround();
        this.applyPanels();

        return this;
    }

    applyRenderer() {
        const renderer =
            this.getRenderer();

        const THREE =
            this.getTHREE();

        if (
            !renderer ||
            !THREE
        ) {
            return;
        }

        renderer.toneMapping =
            getToneMapping(
                THREE,
                this.config
                    .renderer
                    .toneMapping
            );

        renderer.toneMappingExposure =
            this.config
                .renderer
                .toneMappingExposure;

        renderer.outputEncoding =
            getOutputEncoding(
                THREE,
                this.config
                    .renderer
                    .outputEncoding
            );

        renderer.needsUpdate =
            true;
    }

    applyLighting() {
        const lights =
            this.getLightCandidates();

        const ambient =
            lights.ambient;

        if (
            ambient
        ) {
            ambient.visible =
                this.config
                    .lighting
                    .ambient
                    .enabled;

            ambient.color.set(
                this.config
                    .lighting
                    .ambient
                    .color
            );

            ambient.intensity =
                this.config
                    .lighting
                    .ambient
                    .enabled
                    ? this.config
                        .lighting
                        .ambient
                        .intensity
                    : 0;
        }

        const hemisphere =
            lights.hemisphere;

        if (
            hemisphere
        ) {
            hemisphere.visible =
                this.config
                    .lighting
                    .hemisphere
                    .enabled;

            hemisphere.skyColor.set(
                this.config
                    .lighting
                    .hemisphere
                    .skyColor
            );

            hemisphere.groundColor.set(
                this.config
                    .lighting
                    .hemisphere
                    .groundColor
            );

            hemisphere.intensity =
                this.config
                    .lighting
                    .hemisphere
                    .enabled
                    ? this.config
                        .lighting
                        .hemisphere
                        .intensity
                    : 0;
        }

        const sun =
            lights.sun;

        if (
            !sun
        ) {
            return;
        }

        sun.visible =
            this.config
                .lighting
                .sun
                .enabled;

        sun.color.set(
            this.config
                .lighting
                .sun
                .color
        );

        sun.intensity =
            this.config
                .lighting
                .sun
                .enabled
                ? this.config
                    .lighting
                    .sun
                    .intensity
                : 0;

        sun.position.set(
            this.config
                .lighting
                .sun
                .position
                .x,

            this.config
                .lighting
                .sun
                .position
                .y,

            this.config
                .lighting
                .sun
                .position
                .z
        );

        if (
            sun.shadow
        ) {
            sun.shadow.bias =
                this.config
                    .lighting
                    .sun
                    .shadow
                    .bias;

            sun.shadow.normalBias =
                this.config
                    .lighting
                    .sun
                    .shadow
                    .normalBias;

            sun.shadow.radius =
                this.config
                    .lighting
                    .sun
                    .shadow
                    .radius;

            const mapSize =
                this.config
                    .lighting
                    .sun
                    .shadow
                    .mapSize;

            if (
                sun.shadow.mapSize.x !==
                mapSize
            ) {
                sun.shadow.mapSize.set(
                    mapSize,
                    mapSize
                );

                sun.shadow.map?.dispose();

                sun.shadow.map =
                    null;
            }

            sun.shadow.needsUpdate =
                true;
        }
    }

    applyEnvironment() {
        const scene =
            this.getScene();

        const THREE =
            this.getTHREE();

        if (
            !scene ||
            !THREE
        ) {
            return;
        }

        if (
            this.config
                .environment
                .fog
                .enabled
        ) {
            if (
                !scene.fog ||
                !scene.fog.isFogExp2
            ) {
                scene.fog =
                    new THREE.FogExp2(
                        this.config
                            .environment
                            .fog
                            .color,
                        this.config
                            .environment
                            .fog
                            .density
                    );
            } else {
                scene.fog.color.set(
                    this.config
                        .environment
                        .fog
                        .color
                );

                scene.fog.density =
                    this.config
                        .environment
                        .fog
                        .density;
            }
        } else {
            scene.fog =
                null;
        }

        scene.environmentIntensity =
            this.config
                .environment
                .intensity;
    }

    applyMaterials() {
        const scene =
            this.getScene();

        if (
            !scene
        ) {
            return;
        }

        this.captureMaterials(
            scene
        );

        scene.traverse(
            object => {
                if (
                    !object.isMesh ||
                    !object.material
                ) {
                    return;
                }

                const materials =
                    Array.isArray(
                        object.material
                    )
                        ? object.material
                        : [
                            object.material
                        ];

                for (
                    const material of
                    materials
                ) {
                    const materialName =
                        this.resolveMaterialName(
                            material
                        );

                    if (
                        !materialName
                    ) {
                        continue;
                    }

                    const definition =
                        this.config
                            .materials[
                                materialName
                            ];

                    if (
                        !definition
                    ) {
                        continue;
                    }

                    this.applyMaterialDefinition(
                        material,
                        materialName,
                        definition
                    );
                }
            }
        );
    }

    resolveMaterialName(
        material
    ) {
        const candidates =
            [
                material.userData
                    ?.materialName,

                material.userData
                    ?.runtimeMaterial,

                material.userData
                    ?.catalogName,

                material.name
            ];

        for (
            const candidate of
            candidates
        ) {
            if (
                typeof candidate !==
                'string'
            ) {
                continue;
            }

            if (
                MATERIAL_NAMES.includes(
                    candidate
                )
            ) {
                return candidate;
            }

            const normalized =
                candidate
                    .toLowerCase();

            const match =
                MATERIAL_NAMES.find(
                    name =>
                        normalized.includes(
                            name.toLowerCase()
                        )
                );

            if (
                match
            ) {
                return match;
            }
        }

        return null;
    }

    applyMaterialDefinition(
        material,
        name,
        definition
    ) {
        if (
            'roughness' in
            material
        ) {
            material.roughness =
                definition.roughness;
        }

        if (
            'metalness' in
            material
        ) {
            material.metalness =
                definition.metalness;
        }

        if (
            name ===
            'glass'
        ) {
            material.transparent =
                true;

            material.opacity =
                definition.opacity;
        }

        material.needsUpdate =
            true;
    }

    applyGround() {
        const groundState =
            this.originalState.ground;

        if (
            !groundState?.object
        ) {
            return;
        }

        const materials =
            Array.isArray(
                groundState.object.material
            )
                ? groundState.object.material
                : [
                    groundState.object.material
                ];

        for (
            const material of
            materials
        ) {
            if (
                !material
            ) {
                continue;
            }

            if (
                material.color
            ) {
                material.color.set(
                    this.config
                        .ground
                        .color
                );
            }

            if (
                'vertexColors' in
                material
            ) {
                material.vertexColors =
                    this.config
                        .ground
                        .vertexColors;
            }

            if (
                'roughness' in
                material
            ) {
                material.roughness =
                    this.config
                        .ground
                        .roughness;
            }

            if (
                'metalness' in
                material
            ) {
                material.metalness =
                    this.config
                        .ground
                        .metalness;
            }

            if (
                'bumpScale' in
                material
            ) {
                material.bumpScale =
                    this.config
                        .ground
                        .bumpScale;
            }

            material.needsUpdate =
                true;
        }
    }

    applyPanels() {
        const global =
            window;

        for (
            const [
                key,
                constantName
            ]
            of Object.entries(
                PANEL_CONSTANT_NAMES
            )
        ) {
            const value =
                this.config
                    .panels[key];

            const overrideKey =
                `__UBUILD_CALIBRATION_${constantName}`;

            global[overrideKey] =
                value;

            this.panelOverrides.set(
                constantName,
                value
            );
        }

        global.dispatchEvent(
            new CustomEvent(
                'ubuild:calibration:panels',
                {
                    detail:
                        {
                            values:
                                Object.fromEntries(
                                    this.panelOverrides
                                )
                        }
                }
            )
        );
    }

    set(
        path,
        value
    ) {
        setByPath(
            this.config,
            path,
            value
        );

        this.config =
            normalizeConfig(
                this.config
            );

        this.config.preset =
            'custom';

        this.syncInputs();

        this.apply();

        return this;
    }

    get(
        path
    ) {
        return getByPath(
            this.config,
            path
        );
    }

    applyPreset(
        name
    ) {
        const preset =
            PRESETS[name];

        if (
            !preset
        ) {
            throw new RangeError(
                `Unknown calibration preset: ${name}`
            );
        }

        this.config =
            normalizeConfig(
                mergeDeep(
                    clone(
                        DEFAULT_CONFIG
                    ),
                    clone(
                        preset
                    )
                )
            );

        this.config.preset =
            name;

        this.syncInputs();

        this.apply();

        return this;
    }

    reset() {
        this.config =
            clone(
                this.originalConfig ??
                DEFAULT_CONFIG
            );

        this.config.preset =
            'custom';

        this.syncInputs();

        this.apply();

        return this;
    }

    restoreOriginalState() {
        const renderer =
            this.getRenderer();

        if (
            renderer &&
            this.originalState.renderer
        ) {
            renderer.toneMapping =
                this.originalState
                    .renderer
                    .toneMapping;

            renderer.toneMappingExposure =
                this.originalState
                    .renderer
                    .toneMappingExposure;

            renderer.outputEncoding =
                this.originalState
                    .renderer
                    .outputEncoding;
        }

        const scene =
            this.getScene();

        if (
            scene &&
            this.originalState.scene
        ) {
            const originalFog =
                this.originalState
                    .scene
                    .fog;

            if (
                originalFog
            ) {
                const THREE =
                    this.getTHREE();

                if (
                    THREE
                ) {
                    scene.fog =
                        new THREE.FogExp2(
                            originalFog.color,
                            originalFog.density
                        );
                }
            } else {
                scene.fog =
                    null;
            }

            scene.environmentIntensity =
                this.originalState
                    .scene
                    .environmentIntensity;
        }

        const lights =
            this.getLightCandidates();

        for (
            const [
                name,
                original
            ]
            of this.originalState
                .lights
                .entries()
        ) {
            const light =
                lights[name];

            if (
                !light
            ) {
                continue;
            }

            light.visible =
                original.visible;

            if (
                original.color &&
                light.color
            ) {
                light.color.set(
                    original.color
                );
            }

            light.intensity =
                original.intensity;

            if (
                original.skyColor &&
                light.skyColor
            ) {
                light.skyColor.set(
                    original.skyColor
                );
            }

            if (
                original.groundColor &&
                light.groundColor
            ) {
                light.groundColor.set(
                    original.groundColor
                );
            }

            if (
                original.position &&
                light.position
            ) {
                light.position.copy(
                    original.position
                );
            }

            if (
                original.shadow &&
                light.shadow
            ) {
                light.shadow.bias =
                    original.shadow.bias;

                light.shadow.normalBias =
                    original.shadow.normalBias;

                light.shadow.radius =
                    original.shadow.radius;

                light.shadow.mapSize.copy(
                    original.shadow.mapSize
                );

                light.shadow.needsUpdate =
                    true;
            }
        }

        for (
            const {
                material,
                roughness,
                metalness,
                opacity,
                transparent
            }
            of this.originalState
                .materials
                .values()
        ) {
            if (
                'roughness' in
                material
            ) {
                material.roughness =
                    roughness;
            }

            if (
                'metalness' in
                material
            ) {
                material.metalness =
                    metalness;
            }

            material.opacity =
                opacity;

            material.transparent =
                transparent;

            material.needsUpdate =
                true;
        }

        return this;
    }

    exportJSON() {
        return JSON.stringify(
            this.config,
            null,
            2
        );
    }

    importJSON(
        source
    ) {
        const config =
            typeof source ===
            'string'
                ? JSON.parse(
                    source
                )
                : source;

        this.config =
            normalizeConfig(
                config
            );

        this.syncInputs();

        this.apply();

        return this;
    }

    downloadJSON(
        filename =
            'ubuild-calibration.json'
    ) {
        const blob =
            new Blob(
                [
                    this.exportJSON()
                ],
                {
                    type:
                        'application/json'
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const anchor =
            document.createElement(
                'a'
            );

        anchor.href =
            url;

        anchor.download =
            filename;

        anchor.click();

        URL.revokeObjectURL(
            url
        );
    }

    createUI() {
        if (
            this.root
        ) {
            return;
        }

        const root =
            document.createElement(
                'div'
            );

        root.id =
            'ubuild-calibration-overlay';

        root.style.position =
            'fixed';

        root.style.top =
            '10px';

        root.style.right =
            '10px';

        root.style.width =
            '420px';

        root.style.maxHeight =
            'calc(100vh - 20px)';

        root.style.overflow =
            'auto';

        root.style.zIndex =
            '999999';

        root.style.padding =
            '12px';

        root.style.background =
            'rgba(15, 15, 18, 0.95)';

        root.style.color =
            '#ffffff';

        root.style.border =
            '1px solid #555';

        root.style.borderRadius =
            '8px';

        root.style.fontFamily =
            'Arial, sans-serif';

        root.style.fontSize =
            '12px';

        root.append(
            this.createHeader()
        );

        root.append(
            this.createLightingSection()
        );

        root.append(
            this.createRendererSection()
        );

        root.append(
            this.createEnvironmentSection()
        );

        root.append(
            this.createGroundSection()
        );

        root.append(
            this.createMaterialsSection()
        );

        root.append(
            this.createPanelsSection()
        );

        document.body.append(
            root
        );

        this.root =
            root;
    }

    createHeader() {
        const section =
            document.createElement(
                'div'
            );

        section.style.display =
            'grid';

        section.style.gap =
            '8px';

        const title =
            document.createElement(
                'strong'
            );

        title.textContent =
            'U-BUILD CALIBRATION';

        title.style.fontSize =
            '16px';

        section.append(
            title
        );

        const presetRow =
            createRow(
                'Preset'
            );

        const preset =
            document.createElement(
                'select'
            );

        for (
            const name of
            Object.keys(
                PRESETS
            )
        ) {
            const option =
                document.createElement(
                    'option'
                );

            option.value =
                name;

            option.textContent =
                name;

            preset.append(
                option
            );
        }

        preset.value =
            this.config.preset;

        preset.addEventListener(
            'change',
            () => {
                this.applyPreset(
                    preset.value
                );
            }
        );

        this.inputs.set(
            'preset',
            preset
        );

        presetRow.append(
            preset
        );

        section.append(
            presetRow
        );

        const actions =
            document.createElement(
                'div'
            );

        actions.style.display =
            'flex';

        actions.style.flexWrap =
            'wrap';

        actions.style.gap =
            '6px';

        actions.append(
            createButton(
                'Apply',
                () =>
                    this.apply()
            )
        );

        actions.append(
            createButton(
                'Reset',
                () =>
                    this.reset()
            )
        );

        actions.append(
            createButton(
                'Restore Runtime',
                () =>
                    this.restoreOriginalState()
            )
        );

        actions.append(
            createButton(
                'Export JSON',
                () =>
                    this.downloadJSON()
            )
        );

        const importButton =
            createButton(
                'Import JSON',
                () => {
                    fileInput.click();
                }
            );

        const fileInput =
            document.createElement(
                'input'
            );

        fileInput.type =
            'file';

        fileInput.accept =
            'application/json';

        fileInput.style.display =
            'none';

        fileInput.addEventListener(
            'change',
            async event => {
                const file =
                    event.target
                        .files?.[0];

                if (
                    !file
                ) {
                    return;
                }

                const text =
                    await file.text();

                this.importJSON(
                    text
                );
            }
        );

        actions.append(
            importButton,
            fileInput
        );

        section.append(
            actions
        );

        return section;
    }

    createLightingSection() {
        const section =
            createSection(
                'Lighting'
            );

        section.append(
            this.createToggle(
                'Ambient enabled',
                'lighting.ambient.enabled'
            )
        );

        section.append(
            this.createColor(
                'Ambient color',
                'lighting.ambient.color'
            )
        );

        section.append(
            this.createRange(
                'Ambient intensity',
                'lighting.ambient.intensity',
                0,
                3,
                0.01
            )
        );

        section.append(
            this.createToggle(
                'Hemisphere enabled',
                'lighting.hemisphere.enabled'
            )
        );

        section.append(
            this.createColor(
                'Hemisphere sky',
                'lighting.hemisphere.skyColor'
            )
        );

        section.append(
            this.createColor(
                'Hemisphere ground',
                'lighting.hemisphere.groundColor'
            )
        );

        section.append(
            this.createRange(
                'Hemisphere intensity',
                'lighting.hemisphere.intensity',
                0,
                3,
                0.01
            )
        );

        section.append(
            this.createToggle(
                'Sun enabled',
                'lighting.sun.enabled'
            )
        );

        section.append(
            this.createColor(
                'Sun color',
                'lighting.sun.color'
            )
        );

        section.append(
            this.createRange(
                'Sun intensity',
                'lighting.sun.intensity',
                0,
                5,
                0.01
            )
        );

        for (
            const axis of [
                'x',
                'y',
                'z'
            ]
        ) {
            section.append(
                this.createRange(
                    `Sun ${axis.toUpperCase()}`,
                    `lighting.sun.position.${axis}`,
                    -500,
                    500,
                    1
                )
            );
        }

        section.append(
            this.createRange(
                'Shadow bias',
                'lighting.sun.shadow.bias',
                -0.02,
                0.02,
                0.0001
            )
        );

        section.append(
            this.createRange(
                'Shadow normal bias',
                'lighting.sun.shadow.normalBias',
                0,
                1,
                0.001
            )
        );

        section.append(
            this.createRange(
                'Shadow radius',
                'lighting.sun.shadow.radius',
                0,
                10,
                0.1
            )
        );

        section.append(
            this.createRange(
                'Shadow map size',
                'lighting.sun.shadow.mapSize',
                256,
                8192,
                256
            )
        );

        return section;
    }

    createRendererSection() {
        const section =
            createSection(
                'Renderer'
            );

        section.append(
            this.createSelect(
                'Tone mapping',
                'renderer.toneMapping',
                [
                    'NoToneMapping',
                    'LinearToneMapping',
                    'ReinhardToneMapping',
                    'CineonToneMapping',
                    'ACESFilmicToneMapping'
                ]
            )
        );

        section.append(
            this.createRange(
                'Tone mapping exposure',
                'renderer.toneMappingExposure',
                0,
                3,
                0.01
            )
        );

        section.append(
            this.createSelect(
                'Output encoding',
                'renderer.outputEncoding',
                [
                    'LinearEncoding',
                    'sRGBEncoding'
                ]
            )
        );

        return section;
    }

    createEnvironmentSection() {
        const section =
            createSection(
                'Environment'
            );

        section.append(
            this.createToggle(
                'Fog enabled',
                'environment.fog.enabled'
            )
        );

        section.append(
            this.createColor(
                'Fog color',
                'environment.fog.color'
            )
        );

        section.append(
            this.createRange(
                'Fog density',
                'environment.fog.density',
                0,
                0.01,
                0.00001
            )
        );

        section.append(
            this.createRange(
                'Environment blur',
                'environment.blur',
                0,
                1,
                0.01
            )
        );

        section.append(
            this.createRange(
                'Environment intensity',
                'environment.intensity',
                0,
                3,
                0.01
            )
        );

        return section;
    }

    createGroundSection() {
        const section =
            createSection(
                'Ground'
            );

        section.append(
            this.createColor(
                'Ground color',
                'ground.color'
            )
        );

        section.append(
            this.createToggle(
                'Vertex colors',
                'ground.vertexColors'
            )
        );

        section.append(
            this.createRange(
                'Ground roughness',
                'ground.roughness',
                0,
                1,
                0.01
            )
        );

        section.append(
            this.createRange(
                'Ground metalness',
                'ground.metalness',
                0,
                1,
                0.01
            )
        );

        section.append(
            this.createRange(
                'Ground bump scale',
                'ground.bumpScale',
                0,
                3,
                0.01
            )
        );

        return section;
    }

    createMaterialsSection() {
        const section =
            createSection(
                'Building materials'
            );

        for (
            const name of
            MATERIAL_NAMES
        ) {
            const material =
                createSection(
                    name
                );

            material.style.marginLeft =
                '10px';

            material.append(
                this.createRange(
                    'Roughness',
                    `materials.${name}.roughness`,
                    0,
                    1,
                    0.01
                )
            );

            material.append(
                this.createRange(
                    'Metalness',
                    `materials.${name}.metalness`,
                    0,
                    1,
                    0.01
                )
            );

            if (
                name ===
                'glass'
            ) {
                material.append(
                    this.createRange(
                        'Opacity',
                        'materials.glass.opacity',
                        0,
                        1,
                        0.01
                    )
                );
            }

            section.append(
                material
            );
        }

        return section;
    }

    createPanelsSection() {
        const section =
            createSection(
                'Panel profiles'
            );

        section.append(
            this.createRange(
                'AWR rib height',
                'panels.awrRibHeight',
                0,
                5,
                0.01
            )
        );

        section.append(
            this.createRange(
                'SSR24 rib height',
                'panels.ssr24RibHeight',
                0,
                5,
                0.01
            )
        );

        section.append(
            this.createRange(
                'Smooth height',
                'panels.smoothHeight',
                0,
                5,
                0.01
            )
        );

        section.append(
            this.createRange(
                'Normal strength',
                'panels.normalStrength',
                0,
                5,
                0.01
            )
        );

        section.append(
            this.createRange(
                'Normal sample pixels',
                'panels.normalSamplePixels',
                1,
                16,
                1
            )
        );

        section.append(
            this.createRange(
                'Texture size',
                'panels.textureSize',
                64,
                4096,
                64
            )
        );

        section.append(
            this.createRange(
                'Repeats per panel',
                'panels.textureRepeatsPerPanel',
                1,
                8,
                1
            )
        );

        section.append(
            this.createRange(
                'Panel bump scale',
                'panels.bumpScale',
                0,
                3,
                0.01
            )
        );

        return section;
    }

    createToggle(
        label,
        path
    ) {
        const row =
            createRow(
                label
            );

        const input =
            document.createElement(
                'input'
            );

        input.type =
            'checkbox';

        input.checked =
            Boolean(
                this.get(
                    path
                )
            );

        input.addEventListener(
            'change',
            () => {
                this.set(
                    path,
                    input.checked
                );
            }
        );

        this.inputs.set(
            path,
            input
        );

        row.append(
            input
        );

        return row;
    }

    createColor(
        label,
        path
    ) {
        const row =
            createRow(
                label
            );

        const input =
            document.createElement(
                'input'
            );

        input.type =
            'color';

        input.value =
            this.get(
                path
            );

        input.style.width =
            '100%';

        input.addEventListener(
            'input',
            () => {
                this.set(
                    path,
                    input.value
                );
            }
        );

        this.inputs.set(
            path,
            input
        );

        row.append(
            input
        );

        return row;
    }

    createRange(
        label,
        path,
        min,
        max,
        step
    ) {
        const row =
            createRow(
                label
            );

        const controls =
            document.createElement(
                'div'
            );

        controls.style.display =
            'grid';

        controls.style.gridTemplateColumns =
            '1fr 72px';

        controls.style.gap =
            '6px';

        const range =
            document.createElement(
                'input'
            );

        range.type =
            'range';

        range.min =
            min;

        range.max =
            max;

        range.step =
            step;

        range.value =
            this.get(
                path
            );

        const number =
            document.createElement(
                'input'
            );

        number.type =
            'number';

        number.min =
            min;

        number.max =
            max;

        number.step =
            step;

        number.value =
            this.get(
                path
            );

        range.addEventListener(
            'input',
            () => {
                number.value =
                    range.value;

                this.set(
                    path,
                    Number(
                        range.value
                    )
                );
            }
        );

        number.addEventListener(
            'change',
            () => {
                const value =
                    clamp(
                        Number(
                            number.value
                        ),
                        Number(
                            min
                        ),
                        Number(
                            max
                        )
                    );

                number.value =
                    value;

                range.value =
                    value;

                this.set(
                    path,
                    value
                );
            }
        );

        controls.append(
            range,
            number
        );

        this.inputs.set(
            path,
            {
                range,
                number
            }
        );

        row.append(
            controls
        );

        return row;
    }

    createSelect(
        label,
        path,
        values
    ) {
        const row =
            createRow(
                label
            );

        const select =
            document.createElement(
                'select'
            );

        for (
            const value of
            values
        ) {
            const option =
                document.createElement(
                    'option'
                );

            option.value =
                value;

            option.textContent =
                value;

            select.append(
                option
            );
        }

        select.value =
            this.get(
                path
            );

        select.addEventListener(
            'change',
            () => {
                this.set(
                    path,
                    select.value
                );
            }
        );

        this.inputs.set(
            path,
            select
        );

        row.append(
            select
        );

        return row;
    }

    syncInputs() {
        for (
            const [
                path,
                input
            ]
            of this.inputs.entries()
        ) {
            const value =
                this.get(
                    path
                );

            if (
                !input
            ) {
                continue;
            }

            if (
                input.range &&
                input.number
            ) {
                input.range.value =
                    value;

                input.number.value =
                    value;

                continue;
            }

            if (
                input.type ===
                'checkbox'
            ) {
                input.checked =
                    Boolean(
                        value
                    );

                continue;
            }

            input.value =
                value;
        }
    }

    destroy() {
        this.restoreOriginalState();

        if (
            this.root
        ) {
            this.root.remove();
        }

        this.root =
            null;

        this.inputs.clear();

        this.started =
            false;

        return this;
    }
}

export function createCalibrationOverlay(
    options = {}
) {
    return new CalibrationOverlay(
        options
    );
}