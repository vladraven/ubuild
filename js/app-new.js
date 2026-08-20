import {
    createUBuildRuntime
} from './runtime/UBuildRuntime.js';

function getContainer() {
    const container =
        document.getElementById(
            'canvas-container'
        );

    if (!container) {
        throw new Error(
            'U-Build canvas container not found'
        );
    }

    return container;
}

function getInitialModel() {
    if (
        window.ConfiguratorData &&
        typeof window.ConfiguratorData ===
            'object'
    ) {
        return window.ConfiguratorData;
    }

    return {};
}

function exposeRuntime(
    runtime
) {
    window.UBuildRuntime =
        runtime;

    window.UBuild =
        Object.freeze({
            runtime,

            get model() {
                return runtime.model;
            },

            get geometry() {
                return runtime.geometry;
            },

            update(model) {
                return runtime.update(
                    model
                );
            },

            render() {
                return runtime.render();
            },

            resize() {
                return runtime.resize();
            },

            dispose() {
                return runtime.dispose();
            }
        });
}

function showError(
    error
) {
    console.error(
        'U-Build initialization failed:',
        error
    );

    const container =
        document.getElementById(
            'canvas-container'
        );

    if (!container) {
        return;
    }

    container.dataset.ubuildError =
        'true';

    const existing =
        document.getElementById(
            'ubuild-runtime-error'
        );

    if (existing) {
        existing.remove();
    }

    const errorElement =
        document.createElement(
            'div'
        );

    errorElement.id =
        'ubuild-runtime-error';

    errorElement.style.position =
        'absolute';

    errorElement.style.left =
        '20px';

    errorElement.style.right =
        '20px';

    errorElement.style.top =
        '20px';

    errorElement.style.zIndex =
        '10000';

    errorElement.style.padding =
        '16px';

    errorElement.style.background =
        '#7f1d1d';

    errorElement.style.color =
        '#ffffff';

    errorElement.style.borderRadius =
        '6px';

    errorElement.style.fontFamily =
        'monospace';

    errorElement.style.whiteSpace =
        'pre-wrap';

    errorElement.textContent =
        error instanceof Error
            ? error.message
            : String(error);

    container.appendChild(
        errorElement
    );
}

function start() {
    const container =
        getContainer();

    const model =
        getInitialModel();

    const runtime =
        createUBuildRuntime({
            container,
            model
        });

    exposeRuntime(
        runtime
    );

    runtime.start();

    return runtime;
}

function bootstrap() {
    try {
        return start();
    } catch (error) {
        showError(
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
        {
            once: true
        }
    );
} else {
    bootstrap();
}