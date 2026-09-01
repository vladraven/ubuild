import {
    setElementChecked,
    setElementVal
} from '../dom-helpers.js';

const TOGGLE_SELECTORS =
    Object.freeze([
        '#wainscotEn',
        '#wainscotToggle',
        '#toggle-wainscot',
        '#wainscot-toggle'
    ]);

const HEIGHT_SELECTORS =
    Object.freeze([
        '#inputWSHeight',
        '#inputWS',
        '#wainscot-height',
        '#slider-wainscot-height'
    ]);

const HEIGHT_VALUE_SELECTORS =
    Object.freeze([
        '#valWS',
        '#val-wainscot-height'
    ]);

const SETTINGS_ID =
    'wsSettingsBlock';

const DEFAULT_HEIGHT =
    0.9144;

function getElement(
    selectors
) {
    for (
        const selector of selectors
    ) {
        const element =
            document.querySelector(
                selector
            );

        if (
            element
        ) {
            return element;
        }
    }

    return null;
}

function getNumber(
    value,
    fallback
) {
    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}

function setVisible(
    element,
    visible
) {
    if (
        !element
    ) {
        return;
    }

    element.style.display =
        visible
            ? 'block'
            : 'none';
}

export function createWainscotController({
    runtime,
    units,
    update
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for WainscotController'
        );
    }

    let initialized =
        false;

    let lastHeight =
        DEFAULT_HEIGHT;

    function getHeight() {
        const height =
            runtime.model
                .panels
                ?.wainscotHeight ||
            0;

        return height;
    }

    function updateHeight(
        height
    ) {
        lastHeight =
            height;

        update({
            panels: {
                ...runtime.model.panels,

                wainscotHeight:
                    height
            },

            visibility: {
                ...runtime.model.visibility,

                wainscot:
                    true
            }
        });
    }

    function bindToggle() {
        const toggle =
            getElement(
                TOGGLE_SELECTORS
            );

        if (
            !toggle
        ) {
            return;
        }

        toggle.addEventListener(
            'change',
            (
                event
            ) => {
                const currentHeight =
                    getHeight();

                if (
                    currentHeight >
                    0
                ) {
                    lastHeight =
                        currentHeight;
                }

                update({
                    panels: {
                        ...runtime.model.panels,

                        wainscotHeight:
                            event.target.checked
                                ? lastHeight
                                : 0
                    },

                    visibility: {
                        ...runtime.model.visibility,

                        wainscot:
                            event.target.checked
                    }
                });
            }
        );
    }

    function bindHeight() {
        const slider =
            getElement(
                HEIGHT_SELECTORS
            );

        const input =
            getElement(
                HEIGHT_VALUE_SELECTORS
            );

        if (
            slider
        ) {
            slider.addEventListener(
                'input',
                (
                    event
                ) => {
                    const height =
                        units.toMeters(
                            event.target.value
                        );

                    if (
                        input
                    ) {
                        input.value =
                            event.target.value;
                    }

                    slider.setAttribute(
                        'data-current-m',
                        String(
                            height
                        )
                    );

                    updateHeight(
                        height
                    );
                }
            );
        }

        if (
            input
        ) {
            input.addEventListener(
                'change',
                (
                    event
                ) => {
                    let value =
                        getNumber(
                            event.target.value,
                            units.toDisplay(
                                lastHeight
                            )
                        );

                    if (
                        slider
                    ) {
                        const min =
                            getNumber(
                                slider.min,
                                value
                            );

                        const max =
                            getNumber(
                                slider.max,
                                value
                            );

                        value =
                            Math.min(
                                Math.max(
                                    value,
                                    min
                                ),
                                max
                            );

                        slider.value =
                            value;

                        slider.setAttribute(
                            'data-current-m',
                            String(
                                units.toMeters(
                                    value
                                )
                            )
                        );
                    }

                    event.target.value =
                        value;

                    updateHeight(
                        units.toMeters(
                            value
                        )
                    );
                }
            );
        }
    }

    function bind() {
        if (
            initialized
        ) {
            return;
        }

        initialized =
            true;

        bindToggle();

        bindHeight();
    }

    function syncFromModel() {
        const wsHeight =
            getHeight();

        if (
            wsHeight >
            0
        ) {
            lastHeight =
                wsHeight;
        }

        const enabled =
            wsHeight >
            0;

        const displayHeight =
            units.toDisplay(
                enabled
                    ? wsHeight
                    : lastHeight
            );

        setElementVal(
            [
                ...HEIGHT_SELECTORS,
                ...HEIGHT_VALUE_SELECTORS
            ],
            displayHeight
        );

        setElementChecked(
            TOGGLE_SELECTORS,
            enabled
        );

        const slider =
            getElement(
                HEIGHT_SELECTORS
            );

        if (
            slider
        ) {
            slider.setAttribute(
                'data-current-m',
                String(
                    enabled
                        ? wsHeight
                        : lastHeight
                )
            );
        }

        setVisible(
            document.getElementById(
                SETTINGS_ID
            ),
            enabled
        );
    }

    return Object.freeze({
        bind,

        syncFromModel
    });
}