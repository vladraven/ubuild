import { createUBuildRuntime } from './runtime/UBuildRuntime.js';
import { createUIAdapter } from './ui/UIAdapter.js';
import { setupUIModals } from './ui/UIModals.js';
import { deserializeModelFromURL } from './integration/URLSerializer.js';

function getContainer() {
    const container = document.getElementById('canvas-container');
    if (!container) {
        throw new Error('U-Build canvas container not found');
    }
    return container;
}

function getDOMColors() {
    const colorIds = Object.freeze({
        wall: 'colorWall',
        wainscot: 'colorWainscot',
        roof: 'colorRoof',
        trim: 'colorTrim',
        eaveTrim: 'colorEaveTrim'
    });

    const colors = {};

    for (const [key, id] of Object.entries(colorIds)) {
        const element = document.getElementById(id);

        if (!element || typeof element.value !== 'string') {
            continue;
        }

        const value = element.value.trim();

        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            colors[key] = value;
        }
    }

    return colors;
}

function getInitialModel() {
    const domColors = getDOMColors();
    const urlConfig = deserializeModelFromURL();

    if (urlConfig) {
        return {
            ...urlConfig,
            colors: {
                ...domColors,
                ...(urlConfig.colors || {})
            }
        };
    }

    if (
        window.ConfiguratorData &&
        typeof window.ConfiguratorData === 'object'
    ) {
        return {
            ...window.ConfiguratorData,
            colors: {
                ...domColors,
                ...(window.ConfiguratorData.colors || {})
            }
        };
    }

    return {
        colors: domColors
    };
}

function bootstrap() {
    try {
        const container = getContainer();
        const initialModel = getInitialModel();

        const runtime = createUBuildRuntime({
            container,
            model: initialModel
        });

        const uiAdapter = createUIAdapter(runtime);
        uiAdapter.init();

        const modals = setupUIModals(runtime);
        modals.refreshOpeningsList();

        window.UBuildRuntime = runtime;

        window.UBuild = Object.freeze({
            runtime,

            get model() {
                return runtime.model;
            },

            get geometry() {
                return runtime.geometry;
            },

            update: (model) =>
                runtime.update(model),

            render: () =>
                runtime.render(),

            resize: () =>
                runtime.resize(),

            dispose: () =>
                runtime.dispose()
        });

        runtime.start();

        return runtime;

    } catch (error) {
        console.error(
            'U-Build initialization failed:',
            error
        );

        return null;
    }
}

if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        bootstrap,
        { once: true }
    );
} else {
    bootstrap();
}