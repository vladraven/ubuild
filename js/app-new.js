import {
    createUBuildRuntime
} from './runtime/UBuildRuntime.js';

import {
    createUIAdapter
} from './ui/UIAdapter.js';

import {
    setupUIModals
} from './ui/UIModals.js';

import {
    deserializeModelFromURL
} from './integration/URLSerializer.js';

const WEATHER_OPTIONS =
    Object.freeze([
        'clear',
        'cloudy',
        'rain',
        'snow',
        'fog'
    ]);

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

function getDOMColors() {
    const colorIds =
        Object.freeze({
            wall:
                'colorWall',

            wainscot:
                'colorWainscot',

            roof:
                'colorRoof',

            trim:
                'colorTrim',

            eaveTrim:
                'colorEaveTrim'
        });

    const colors =
        {};

    for (
        const [
            key,
            id
        ]
        of Object.entries(
            colorIds
        )
    ) {
        const element =
            document.getElementById(
                id
            );

        if (
            !element ||
            typeof element.value !==
            'string'
        ) {
            continue;
        }

        const value =
            element.value.trim();

        if (
            /^#[0-9A-Fa-f]{6}$/.test(
                value
            )
        ) {
            colors[key] =
                value;
        }
    }

    return colors;
}

function formatLocalDate(
    date
) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() +
            1
        ).padStart(
            2,
            '0'
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            '0'
        );

    return [
        year,
        month,
        day
    ].join(
        '-'
    );
}

function formatLocalTime(
    date
) {
    const hours =
        String(
            date.getHours()
        ).padStart(
            2,
            '0'
        );

    const minutes =
        String(
            date.getMinutes()
        ).padStart(
            2,
            '0'
        );

    return [
        hours,
        minutes
    ].join(
        ':'
    );
}

function getRandomWeather() {
    const index =
        Math.floor(
            Math.random() *
            WEATHER_OPTIONS.length
        );

    return WEATHER_OPTIONS[
        index
    ];
}

function getInitialEnvironment() {
    const now =
        new Date();

    return {
        date:
            formatLocalDate(
                now
            ),

        time:
            formatLocalTime(
                now
            ),

        weather:
            getRandomWeather()
    };
}

function getInitialModel() {
    const domColors =
        getDOMColors();

    const urlConfig =
        deserializeModelFromURL();

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
        typeof window.ConfiguratorData ===
        'object'
    ) {
        return {
            ...window.ConfiguratorData,

            colors: {
                ...domColors,
                ...(
                    window.ConfiguratorData.colors ||
                    {}
                )
            }
        };
    }

    return {
        colors:
            domColors
    };
}

function bootstrap() {
    try {
        const container =
            getContainer();

        const initialModel =
            getInitialModel();

        const environment =
            getInitialEnvironment();

        const runtime =
            createUBuildRuntime({
                container,

                model:
                    initialModel,

                environment
            });

        const uiAdapter =
            createUIAdapter(
                runtime
            );

        uiAdapter.init();

        const modals =
            setupUIModals(
                runtime
            );

        modals.refreshOpeningsList();

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

                update:
                    (model) =>
                        runtime.update(
                            model
                        ),

                render:
                    () =>
                        runtime.render(),

                resize:
                    () =>
                        runtime.resize(),

                setDateTimeLocation:
                    (config) =>
                        runtime.setDateTimeLocation(
                            config
                        ),

                dispose:
                    () =>
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
        {
            once:
                true
        }
    );
} else {
    bootstrap();
}