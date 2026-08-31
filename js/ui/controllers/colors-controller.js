import {
    setElementVal
}
from '../dom-helpers.js';

const COLOR_ALIASES = {
    eavetrim: 'eaveTrim',
    raketrim: 'rakeTrim',
    structuralsteel: 'structuralSteel',
    interiorwall: 'interiorWall',
    wainscotmetal: 'wainscot'
};

function normalizeColorKey(value) {
    if (!value) {
        return null;
    }

    let key =
        String(value).trim();

    if (!key) {
        return null;
    }

    key =
        key
            .replace(
                /^color[-_]?/i,
                ''
            )
            .replace(
                /[-_]+(.)/g,
                (
                    _,
                    char
                ) =>
                    char.toUpperCase()
            );

    const lower =
        key.toLowerCase();

    return (
        COLOR_ALIASES[lower] ||
        key.charAt(0).toLowerCase() +
        key.slice(1)
    );
}

function normalizeColorValue(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const color =
        String(value).trim();

    return color || null;
}

function getExplicitColorTarget(
    element
) {
    const target =
        element.getAttribute(
            'data-color-target'
        ) ||
        element.getAttribute(
            'data-color-input'
        );

    return normalizeColorKey(
        target
    );
}

function getNamedColorTarget(
    element,
    colors
) {
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
        !target ||
        colors?.[target] === undefined
    ) {
        return null;
    }

    return target;
}

function getIdColorTarget(
    element,
    colors
) {
    const id =
        element.getAttribute(
            'id'
        );

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
        !target ||
        colors?.[target] === undefined
    ) {
        return null;
    }

    return target;
}

function getColorTarget(
    element,
    colors
) {
    if (!element) {
        return null;
    }

    return (
        getExplicitColorTarget(
            element
        ) ||
        getNamedColorTarget(
            element,
            colors
        ) ||
        getIdColorTarget(
            element,
            colors
        )
    );
}

function getColorValue(
    element
) {
    if (!element) {
        return null;
    }

    return normalizeColorValue(
        element.value
    );
}

function getColorControls() {
    return document.querySelectorAll(
        [
            'input[type="color"][data-color-target]',
            'input[type="color"][data-color-input]',
            'select[data-color-target]',
            'select[data-color-input]',
            'select[id^="color"]',
            'input[type="color"]'
        ].join(
            ','
        )
    );
}

function hasOptionValue(
    control,
    value
) {
    if (
        control.tagName !==
        'SELECT'
    ) {
        return true;
    }

    return Array
        .from(
            control.options
        )
        .some(
            option =>
                option.value ===
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
        value
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

        if (
            runtime.model.colors?.[
                normalizedTarget
            ] ===
            normalizedValue
        ) {
            return;
        }

        runtime.update({
            ...runtime.model,

            colors: {
                ...(
                    runtime.model.colors ||
                    {}
                ),

                [normalizedTarget]:
                    normalizedValue
            }
        });
    }

    function seedModelFromDom(
        colorControls
    ) {
        const patch =
            {};

        colorControls.forEach(
            control => {
                const target =
                    getColorTarget(
                        control,
                        runtime.model.colors
                    );

                if (!target) {
                    return;
                }

                const value =
                    getColorValue(
                        control
                    );

                if (!value) {
                    return;
                }

                patch[target] =
                    value;
            }
        );

        if (
            Object.keys(
                patch
            ).length === 0
        ) {
            return;
        }

        runtime.update({
            ...runtime.model,

            colors: {
                ...(
                    runtime.model.colors ||
                    {}
                ),

                ...patch
            }
        });
    }

    function bindColorControl(
        control
    ) {
        const target =
            getColorTarget(
                control,
                runtime.model.colors
            );

        if (!target) {
            return;
        }

        if (
            control
                .__uBuildColorHandler
        ) {
            return;
        }

        const handler =
            event => {
                const element =
                    event.currentTarget;

                const colorTarget =
                    getColorTarget(
                        element,
                        runtime.model.colors
                    );

                if (!colorTarget) {
                    return;
                }

                setColor(
                    colorTarget,
                    getColorValue(
                        element
                    )
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
            button
                .__uBuildColorHandler
        ) {
            return;
        }

        const target =
            normalizeColorKey(
                button.getAttribute(
                    'data-color-target'
                ) ||
                button.getAttribute(
                    'data-target'
                )
            );

        if (!target) {
            return;
        }

        const handler =
            () => {
                const hex =
                    normalizeColorValue(
                        button.getAttribute(
                            'data-color'
                        ) ||
                        button.getAttribute(
                            'data-hex'
                        )
                    );

                if (!hex) {
                    return;
                }

                setColor(
                    target,
                    hex
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
        const colorControls =
            getColorControls();

        seedModelFromDom(
            colorControls
        );

        colorControls.forEach(
            bindColorControl
        );

        document
            .querySelectorAll(
                '.color-swatch[data-color-target],' +
                '.color-swatch[data-target],' +
                '.color-btn[data-color-target],' +
                '.color-btn[data-target]'
            )
            .forEach(
                bindColorButton
            );
    }

    function syncFromModel() {
        const colors =
            runtime.model.colors;

        if (!colors) {
            return;
        }

        for (
            const [
                key,
                value
            ]
            of Object.entries(
                colors
            )
        ) {
            const normalizedKey =
                normalizeColorKey(
                    key
                );

            const normalizedValue =
                normalizeColorValue(
                    value
                );

            if (
                !normalizedKey ||
                !normalizedValue
            ) {
                continue;
            }

            const selectors = [
                `#color${
                    normalizedKey
                        .charAt(0)
                        .toUpperCase() +
                    normalizedKey.slice(1)
                }`,
                `#color-${normalizedKey}`,
                `[data-color-input="${normalizedKey}"]`,
                `[data-color-target="${normalizedKey}"]`
            ];

            const controls =
                document.querySelectorAll(
                    selectors.join(
                        ','
                    )
                );

            controls.forEach(
                control => {
                    if (
                        !hasOptionValue(
                            control,
                            normalizedValue
                        )
                    ) {
                        return;
                    }

                    if (
                        control.value ===
                        normalizedValue
                    ) {
                        return;
                    }

                    setElementVal(
                        control,
                        normalizedValue
                    );
                }
            );
        }
    }

    function dispose() {
        getColorControls()
            .forEach(
                control => {
                    const handler =
                        control
                            .__uBuildColorHandler;

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
            );

        document
            .querySelectorAll(
                '.color-swatch[data-color-target],' +
                '.color-swatch[data-target],' +
                '.color-btn[data-color-target],' +
                '.color-btn[data-target]'
            )
            .forEach(
                button => {
                    const handler =
                        button
                            .__uBuildColorHandler;

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
            );
    }

    return Object.freeze({
        bind,
        syncFromModel,
        dispose
    });
}