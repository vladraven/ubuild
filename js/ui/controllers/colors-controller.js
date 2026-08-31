import {
    setElementVal
}
from '../dom-helpers.js';

const COLOR_KEY_ALIASES = {
    wallmetal: 'wall',
    roofmetal: 'roof',
    trimmetal: 'trim',
    eavetrim: 'eaveTrim',
    doorttrim: 'doorTrim',
    doortrim: 'doorTrim',
    doorframe: 'doorFrame',
    doorpanel: 'doorPanel',
    structuralsteel: 'structuralSteel',
    wainscotmetal: 'wainscot',
    interiorwall: 'interiorWall'
};

const COLOR_CONTROL_SELECTOR = [
    'input[type="color"]',
    'select[id^="color"]',
    'input[id^="color"]',
    '[data-color-target]',
    '[data-color-input]'
].join(
    ','
);

const COLOR_BUTTON_SELECTOR = [
    '.color-swatch',
    '.color-btn',
    '[data-color]',
    '[data-hex]'
].join(
    ','
);

function normalizeColorValue(
    value
) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const color =
        String(value).trim();

    if (!color) {
        return null;
    }

    return color;
}

function normalizeColorKey(
    value
) {
    if (!value) {
        return null;
    }

    const raw =
        String(value).trim();

    if (!raw) {
        return null;
    }

    const normalized =
        raw
            .replace(
                /^color[-_]?/i,
                ''
            )
            .replace(
                /[-_]+(.)/g,
                (
                    _,
                    character
                ) =>
                    character.toUpperCase()
            );

    if (!normalized) {
        return null;
    }

    const lower =
        normalized.toLowerCase();

    if (
        COLOR_KEY_ALIASES[
            lower
        ]
    ) {
        return COLOR_KEY_ALIASES[
            lower
        ];
    }

    return (
        normalized.charAt(0).toLowerCase() +
        normalized.slice(1)
    );
}

function isKnownColorTarget(
    colors,
    target
) {
    if (
        !target ||
        !colors
    ) {
        return false;
    }

    return Object.prototype
        .hasOwnProperty
        .call(
            colors,
            target
        );
}

function getExplicitColorTarget(
    element
) {
    if (!element) {
        return null;
    }

    return (
        normalizeColorKey(
            element.getAttribute(
                'data-color-target'
            )
        ) ||
        normalizeColorKey(
            element.getAttribute(
                'data-color-input'
            )
        )
    );
}

function getIdColorTarget(
    element,
    colors
) {
    if (!element) {
        return null;
    }

    const id =
        element.id;

    if (
        !id ||
        !/^color[-_]?/i.test(
            id
        )
    ) {
        return null;
    }

    const target =
        normalizeColorKey(
            id
        );

    if (
        !isKnownColorTarget(
            colors,
            target
        )
    ) {
        return null;
    }

    return target;
}

function getNameColorTarget(
    element,
    colors
) {
    if (!element) {
        return null;
    }

    const name =
        element.getAttribute(
            'name'
        );

    if (!name) {
        return null;
    }

    const target =
        normalizeColorKey(
            name
        );

    if (
        !isKnownColorTarget(
            colors,
            target
        )
    ) {
        return null;
    }

    return target;
}

function getColorTarget(
    element,
    colors
) {
    const explicitTarget =
        getExplicitColorTarget(
            element
        );

    if (
        explicitTarget &&
        isKnownColorTarget(
            colors,
            explicitTarget
        )
    ) {
        return explicitTarget;
    }

    const idTarget =
        getIdColorTarget(
            element,
            colors
        );

    if (idTarget) {
        return idTarget;
    }

    return getNameColorTarget(
        element,
        colors
    );
}

function getColorValue(
    element
) {
    return normalizeColorValue(
        element?.value
    );
}

function getColorControls() {
    return document.querySelectorAll(
        COLOR_CONTROL_SELECTOR
    );
}

function getColorButtons() {
    return document.querySelectorAll(
        COLOR_BUTTON_SELECTOR
    );
}

function resolveButtonTarget(
    button,
    colors
) {
    const explicitTarget =
        normalizeColorKey(
            button.getAttribute(
                'data-color-target'
            )
        );

    if (
        explicitTarget &&
        isKnownColorTarget(
            colors,
            explicitTarget
        )
    ) {
        return explicitTarget;
    }

    const target =
        normalizeColorKey(
            button.getAttribute(
                'data-target'
            )
        );

    if (
        target &&
        isKnownColorTarget(
            colors,
            target
        )
    ) {
        return target;
    }

    const parent =
        button.closest(
            '[data-color-target], [data-color-input], [id^="color"]'
        );

    if (!parent) {
        return null;
    }

    return getColorTarget(
        parent,
        colors
    );
}

function resolveButtonValue(
    button
) {
    return (
        normalizeColorValue(
            button.getAttribute(
                'data-color'
            )
        ) ||
        normalizeColorValue(
            button.getAttribute(
                'data-hex'
            )
        )
    );
}

function findControlsForColor(
    target
) {
    const capitalized =
        target.charAt(0).toUpperCase() +
        target.slice(1);

    return document.querySelectorAll(
        [
            `#color${capitalized}`,
            `#color-${target}`,
            `[data-color-target="${target}"]`,
            `[data-color-input="${target}"]`,
            `[name="${target}"]`
        ].join(
            ','
        )
    );
}

function controlSupportsValue(
    control,
    value
) {
    if (
        control.tagName !==
        'SELECT'
    ) {
        return true;
    }

    return Array.from(
        control.options
    ).some(
        option =>
            option.value === value
    );
}

function setControlValue(
    control,
    value
) {
    if (
        !control ||
        !controlSupportsValue(
            control,
            value
        )
    ) {
        return;
    }

    if (
        control.value === value
    ) {
        return;
    }

    setElementVal(
        control,
        value
    );
}

export function createColorsController({
    runtime
}) {
    if (!runtime) {
        throw new TypeError(
            'UBuildRuntime instance is required for ColorsController'
        );
    }

    function setColor(
        target,
        value,
        source
    ) {
        const normalizedTarget =
            normalizeColorKey(
                target
            );

        const normalizedValue =
            normalizeColorValue(
                value
            );

        if (
            !normalizedTarget ||
            !normalizedValue
        ) {
            return;
        }

        const colors =
            runtime.model.colors ||
            {};

        if (
            !isKnownColorTarget(
                colors,
                normalizedTarget
            )
        ) {
            return;
        }

        const previousValue =
            colors[
                normalizedTarget
            ];

        if (
            previousValue ===
            normalizedValue
        ) {
            return;
        }

        console.log(
            'COLOR UPDATE',
            {
                target:
                    normalizedTarget,

                previous:
                    previousValue,

                next:
                    normalizedValue,

                source
            }
        );

        runtime.update({
            ...runtime.model,

            colors: {
                ...colors,

                [normalizedTarget]:
                    normalizedValue
            }
        });
    }

    function bindColorControl(
        control
    ) {
        if (
            control.__uBuildColorHandler
        ) {
            return;
        }

        const target =
            getColorTarget(
                control,
                runtime.model.colors
            );

        if (!target) {
            return;
        }

        const handler =
            event => {
                const element =
                    event.currentTarget;

                const currentTarget =
                    getColorTarget(
                        element,
                        runtime.model.colors
                    );

                if (!currentTarget) {
                    return;
                }

                const value =
                    getColorValue(
                        element
                    );

                if (!value) {
                    return;
                }

                setColor(
                    currentTarget,
                    value,
                    {
                        type:
                            event.type,

                        elementId:
                            element.id ||
                            null,

                        elementName:
                            element.getAttribute(
                                'name'
                            ),

                        target:
                            currentTarget
                    }
                );
            };

        control.addEventListener(
            'input',
            handler
        );

        control.addEventListener(
            'change',
            handler
        );

        control.__uBuildColorHandler =
            handler;
    }

    function bindColorButton(
        button
    ) {
        if (
            button.__uBuildColorHandler
        ) {
            return;
        }

        const handler =
            event => {
                const element =
                    event.currentTarget;

                const target =
                    resolveButtonTarget(
                        element,
                        runtime.model.colors
                    );

                const value =
                    resolveButtonValue(
                        element
                    );

                if (
                    !target ||
                    !value
                ) {
                    return;
                }

                setColor(
                    target,
                    value,
                    {
                        type:
                            event.type,

                        elementId:
                            element.id ||
                            null,

                        target
                    }
                );
            };

        button.addEventListener(
            'click',
            handler
        );

        button.__uBuildColorHandler =
            handler;
    }

    function bind() {
        getColorControls()
            .forEach(
                bindColorControl
            );

        getColorButtons()
            .forEach(
                bindColorButton
            );

        syncFromModel();
    }

    function syncFromModel() {
        const colors =
            runtime.model.colors;

        if (!colors) {
            return;
        }

        for (
            const [
                target,
                value
            ]
            of Object.entries(
                colors
            )
        ) {
            const normalizedTarget =
                normalizeColorKey(
                    target
                );

            const normalizedValue =
                normalizeColorValue(
                    value
                );

            if (
                !normalizedTarget ||
                !normalizedValue
            ) {
                continue;
            }

            findControlsForColor(
                normalizedTarget
            )
                .forEach(
                    control =>
                        setControlValue(
                            control,
                            normalizedValue
                        )
                );
        }
    }

    function disposeColorControl(
        control
    ) {
        const handler =
            control.__uBuildColorHandler;

        if (!handler) {
            return;
        }

        control.removeEventListener(
            'input',
            handler
        );

        control.removeEventListener(
            'change',
            handler
        );

        delete control
            .__uBuildColorHandler;
    }

    function disposeColorButton(
        button
    ) {
        const handler =
            button.__uBuildColorHandler;

        if (!handler) {
            return;
        }

        button.removeEventListener(
            'click',
            handler
        );

        delete button
            .__uBuildColorHandler;
    }

    function dispose() {
        getColorControls()
            .forEach(
                disposeColorControl
            );

        getColorButtons()
            .forEach(
                disposeColorButton
            );
    }

    return Object.freeze({
        bind,
        syncFromModel,
        dispose
    });
}