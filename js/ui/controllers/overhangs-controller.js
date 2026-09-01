import { setElementVal } from '../dom-helpers.js';

const SIDES = Object.freeze([
    'front',
    'back',
    'left',
    'right'
]);

const CONTROLS = Object.freeze({
    front: Object.freeze({
        slider: '#overF',
        input: '#overF_val',
        aliases: Object.freeze([
            '#inputOHF',
            '#overhang-front',
            '#slider-overhang-front',
            '#val-overhang-front'
        ])
    }),

    back: Object.freeze({
        slider: '#overB',
        input: '#overB_val',
        aliases: Object.freeze([
            '#inputOHB',
            '#overhang-back',
            '#slider-overhang-back',
            '#val-overhang-back'
        ])
    }),

    left: Object.freeze({
        slider: '#overL',
        input: '#overL_val',
        aliases: Object.freeze([
            '#inputOHL',
            '#overhang-left',
            '#slider-overhang-left',
            '#val-overhang-left'
        ])
    }),

    right: Object.freeze({
        slider: '#overR',
        input: '#overR_val',
        aliases: Object.freeze([
            '#inputOHR',
            '#overhang-right',
            '#slider-overhang-right',
            '#val-overhang-right'
        ])
    })
});

function getElement(
    selector
) {
    return document.querySelector(
        selector
    );
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

function clamp(
    value,
    min,
    max
) {
    return Math.min(
        Math.max(
            value,
            min
        ),
        max
    );
}

function getSlider(
    side
) {
    const control =
        CONTROLS[
            side
        ];

    const primary =
        getElement(
            control.slider
        );

    if (
        primary
    ) {
        return primary;
    }

    for (
        const selector of control.aliases
    ) {
        const element =
            getElement(
                selector
            );

        if (
            element?.type ===
            'range'
        ) {
            return element;
        }
    }

    return null;
}

function getInput(
    side
) {
    const control =
        CONTROLS[
            side
        ];

    const primary =
        getElement(
            control.input
        );

    if (
        primary
    ) {
        return primary;
    }

    for (
        const selector of control.aliases
    ) {
        const element =
            getElement(
                selector
            );

        if (
            element?.type !==
            'range'
        ) {
            return element;
        }
    }

    return null;
}

export function createOverhangsController({
    runtime,
    units,
    update
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for OverhangsController'
        );
    }

    if (
        !units
    ) {
        throw new TypeError(
            'UnitsController is required for OverhangsController'
        );
    }

    if (
        typeof update !==
        'function'
    ) {
        throw new TypeError(
            'update function is required for OverhangsController'
        );
    }

    let initialized =
        false;

    function updateSide(
        side,
        value
    ) {
        update({
            roof: {
                ...runtime.model.roof,

                overhangs: {
                    ...runtime.model
                        .roof
                        .overhangs,

                    [side]:
                        value
                }
            }
        });
    }

    function getDisplayLimits(
        slider
    ) {
        return {
            min:
                getNumber(
                    slider.min,
                    0
                ),

            max:
                getNumber(
                    slider.max,
                    Number.MAX_VALUE
                )
        };
    }

    function bindSide(
        side
    ) {
        const slider =
            getSlider(
                side
            );

        const input =
            getInput(
                side
            );

        if (
            slider
        ) {
            slider.addEventListener(
                'input',
                (
                    event
                ) => {
                    const value =
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
                            value
                        )
                    );

                    updateSide(
                        side,
                        value
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
                    if (
                        !slider
                    ) {
                        updateSide(
                            side,
                            units.toMeters(
                                event.target.value
                            )
                        );

                        return;
                    }

                    const limits =
                        getDisplayLimits(
                            slider
                        );

                    const value =
                        clamp(
                            getNumber(
                                event.target.value,
                                limits.min
                            ),
                            limits.min,
                            limits.max
                        );

                    event.target.value =
                        value;

                    slider.value =
                        value;

                    const meters =
                        units.toMeters(
                            value
                        );

                    slider.setAttribute(
                        'data-current-m',
                        String(
                            meters
                        )
                    );

                    updateSide(
                        side,
                        meters
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

        for (
            const side of SIDES
        ) {
            bindSide(
                side
            );
        }
    }

    function syncSide(
        side,
        value
    ) {
        const display =
            units.toDisplay(
                value
            );

        const slider =
            getSlider(
                side
            );

        if (
            slider
        ) {
            slider.value =
                display;

            slider.setAttribute(
                'data-current-m',
                String(
                    value
                )
            );
        }

        const input =
            getInput(
                side
            );

        if (
            input
        ) {
            input.value =
                display;
        }
    }

    function syncFromModel() {
        const overhangs =
            runtime.model
                .roof
                ?.overhangs ||
            {};

        for (
            const side of SIDES
        ) {
            syncSide(
                side,
                overhangs[
                    side
                ] ||
                    0
            );
        }

        setElementVal(
            [
                '#inputOHF',
                '#valOHF',
                '#overhang-front',
                '#val-overhang-front'
            ],
            units.toDisplay(
                overhangs.front ||
                0
            )
        );

        setElementVal(
            [
                '#inputOHB',
                '#valOHB',
                '#overhang-back',
                '#val-overhang-back'
            ],
            units.toDisplay(
                overhangs.back ||
                0
            )
        );

        setElementVal(
            [
                '#inputOHL',
                '#valOHL',
                '#overhang-left',
                '#val-overhang-left'
            ],
            units.toDisplay(
                overhangs.left ||
                0
            )
        );

        setElementVal(
            [
                '#inputOHR',
                '#valOHR',
                '#overhang-right',
                '#val-overhang-right'
            ],
            units.toDisplay(
                overhangs.right ||
                0
            )
        );
    }

    return Object.freeze({
        bind,

        syncFromModel
    });
}