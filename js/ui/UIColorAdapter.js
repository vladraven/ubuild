// js/ui/UIColorAdapter.js

const COLOR_KEYS = Object.freeze([
    'wall',
    'wainscot',
    'roof',
    'trim',
    'eaveTrim',
    'rakeTrim',
    'structuralSteel',
    'interiorWall'
]);

const COLOR_ALIASES = Object.freeze({
    wall: 'wall',
    wallpanel: 'wall',
    panel: 'wall',

    wainscot: 'wainscot',
    wainscotpanel: 'wainscot',
    wainscotmetal: 'wainscot',

    roof: 'roof',
    roofpanel: 'roof',

    trim: 'trim',

    eavetrim: 'eaveTrim',

    raketrim: 'rakeTrim',

    structuralsteel: 'structuralSteel',
    steel: 'structuralSteel',

    interiorwall: 'interiorWall'
});

const COLOR_SELECTORS = Object.freeze({
    wall: [
        '#colorWall',
        '[data-color-input="wall"]',
        '[data-color-target="wall"]'
    ],

    wainscot: [
        '#colorWainscot',
        '[data-color-input="wainscot"]',
        '[data-color-target="wainscot"]'
    ],

    roof: [
        '#colorRoof',
        '[data-color-input="roof"]',
        '[data-color-target="roof"]'
    ],

    trim: [
        '#colorTrim',
        '[data-color-input="trim"]',
        '[data-color-target="trim"]'
    ],

    eaveTrim: [
        '#colorEaveTrim',
        '[data-color-input="eaveTrim"]',
        '[data-color-target="eaveTrim"]'
    ],

    rakeTrim: [
        '#colorRakeTrim',
        '[data-color-input="rakeTrim"]',
        '[data-color-target="rakeTrim"]'
    ],

    structuralSteel: [
        '#colorStructuralSteel',
        '[data-color-input="structuralSteel"]',
        '[data-color-target="structuralSteel"]'
    ],

    interiorWall: [
        '#colorInteriorWall',
        '[data-color-input="interiorWall"]',
        '[data-color-target="interiorWall"]'
    ]
});

function normalizeColorKey(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    let key = String(value).trim();

    if (!key) {
        return null;
    }

    key = key
        .replace(/^color[-_]?/i, '')
        .replace(/[-_]+(.)/g, (_, char) =>
            char.toUpperCase()
        );

    const alias =
        COLOR_ALIASES[
            key.toLowerCase()
        ];

    if (alias) {
        return alias;
    }

    return COLOR_KEYS.includes(key)
        ? key
        : null;
}

function normalizeHex(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const valueString =
        String(value).trim();

    if (
        /^#[0-9a-f]{6}$/i.test(
            valueString
        )
    ) {
        return valueString.toUpperCase();
    }

    if (
        /^#[0-9a-f]{3}$/i.test(
            valueString
        )
    ) {
        const short =
            valueString.slice(1);

        return (
            '#' +
            short
                .split('')
                .map(char => char + char)
                .join('')
        ).toUpperCase();
    }

    return null;
}

function getColorTarget(element) {
    if (!element) {
        return null;
    }

    const explicitTarget =
        element.getAttribute(
            'data-color-target'
        ) ||
        element.getAttribute(
            'data-color-input'
        );

    if (explicitTarget) {
        return normalizeColorKey(
            explicitTarget
        );
    }

    const id =
        element.getAttribute('id');

    if (id) {
        const target =
            normalizeColorKey(id);

        if (target) {
            return target;
        }
    }

    const name =
        element.getAttribute('name');

    if (name) {
        const target =
            normalizeColorKey(name);

        if (target) {
            return target;
        }
    }

    return null;
}

function getColorValue(element) {
    if (!element) {
        return null;
    }

    const directValue =
        normalizeHex(
            element.value
        );

    if (directValue) {
        return directValue;
    }

    const dataColor =
        normalizeHex(
            element.getAttribute(
                'data-color'
            )
        );

    if (dataColor) {
        return dataColor;
    }

    const dataHex =
        normalizeHex(
            element.getAttribute(
                'data-hex'
            )
        );

    if (dataHex) {
        return dataHex;
    }

    const option =
        element.selectedOptions?.[0];

    if (option) {
        const optionValue =
            normalizeHex(
                option.value
            );

        if (optionValue) {
            return optionValue;
        }

        const optionColor =
            normalizeHex(
                option.getAttribute(
                    'data-color'
                )
            );

        if (optionColor) {
            return optionColor;
        }

        const optionHex =
            normalizeHex(
                option.getAttribute(
                    'data-hex'
                )
            );

        if (optionHex) {
            return optionHex;
        }
    }

    return null;
}

function getControls() {
    const controls = [];

    const seen =
        new Set();

    for (
        const selectors
        of Object.values(
            COLOR_SELECTORS
        )
    ) {
        for (
            const selector
            of selectors
        ) {
            document
                .querySelectorAll(
                    selector
                )
                .forEach(element => {
                    if (
                        seen.has(element)
                    ) {
                        return;
                    }

                    seen.add(element);
                    controls.push(
                        element
                    );
                });
        }
    }

    document
        .querySelectorAll(
            '[data-color-target],' +
            '[data-color-input]'
        )
        .forEach(element => {
            if (
                seen.has(element)
            ) {
                return;
            }

            seen.add(element);
            controls.push(element);
        });

    return controls;
}

function findControl(target) {
    const selectors =
        COLOR_SELECTORS[target];

    if (!selectors) {
        return null;
    }

    for (
        const selector
        of selectors
    ) {
        const element =
            document.querySelector(
                selector
            );

        if (element) {
            return element;
        }
    }

    return null;
}

function read() {
    const colors = {};

    for (
        const element
        of getControls()
    ) {
        const target =
            getColorTarget(element);

        if (!target) {
            continue;
        }

        const value =
            getColorValue(element);

        if (!value) {
            continue;
        }

        colors[target] =
            value;
    }

    return colors;
}

function setControlValue(
    element,
    value
) {
    const normalized =
        normalizeHex(value);

    if (
        !element ||
        !normalized
    ) {
        return false;
    }

    if (
        element.tagName ===
        'SELECT'
    ) {
        const options =
            Array.from(
                element.options
            );

        const option =
            options.find(item =>
                normalizeHex(
                    item.value
                ) === normalized
            ) ||
            options.find(item =>
                normalizeHex(
                    item.getAttribute(
                        'data-color'
                    )
                ) === normalized
            ) ||
            options.find(item =>
                normalizeHex(
                    item.getAttribute(
                        'data-hex'
                    )
                ) === normalized
            );

        if (!option) {
            return false;
        }

        element.value =
            option.value;

        return true;
    }

    if (
        'value' in element
    ) {
        element.value =
            normalized;

        return true;
    }

    return false;
}

function set(
    target,
    value
) {
    const normalizedTarget =
        normalizeColorKey(target);

    const normalizedValue =
        normalizeHex(value);

    if (
        !normalizedTarget ||
        !normalizedValue
    ) {
        return false;
    }

    let changed = false;

    const controls =
        getControls();

    for (
        const element
        of controls
    ) {
        if (
            getColorTarget(element) !==
            normalizedTarget
        ) {
            continue;
        }

        if (
            setControlValue(
                element,
                normalizedValue
            )
        ) {
            changed = true;
        }
    }

    const fallback =
        findControl(
            normalizedTarget
        );

    if (
        fallback &&
        setControlValue(
            fallback,
            normalizedValue
        )
    ) {
        changed = true;
    }

    return changed;
}

function getModelColors(
    runtime
) {
    const modelColors =
        runtime.model?.colors;

    if (
        !modelColors ||
        typeof modelColors !==
            'object'
    ) {
        return {};
    }

    const colors = {};

    for (
        const [
            key,
            value
        ]
        of Object.entries(
            modelColors
        )
    ) {
        const target =
            normalizeColorKey(key);

        const color =
            normalizeHex(value);

        if (
            target &&
            color
        ) {
            colors[target] =
                color;
        }
    }

    return colors;
}

function updateModelColors(
    runtime,
    colors
) {
    if (
        !colors ||
        Object.keys(colors).length ===
            0
    ) {
        return false;
    }

    runtime.update({
        ...runtime.model,

        colors: {
            ...getModelColors(
                runtime
            ),
            ...colors
        }
    });

    return true;
}

function syncFromModel(
    runtime
) {
    const colors =
        getModelColors(runtime);

    for (
        const [
            target,
            value
        ]
        of Object.entries(
            colors
        )
    ) {
        set(
            target,
            value
        );
    }
}

function initialize(
    runtime
) {
    const modelColors =
        getModelColors(runtime);

    if (
        Object.keys(
            modelColors
        ).length > 0
    ) {
        syncFromModel(
            runtime
        );

        return;
    }

    const controlColors =
        read();

    if (
        Object.keys(
            controlColors
        ).length === 0
    ) {
        return;
    }

    updateModelColors(
        runtime,
        controlColors
    );
}

function bind(
    runtime
) {
    const controls =
        getControls();

    controls.forEach(
        element => {
            if (
                element.__uBuildColorAdapterBound
            ) {
                return;
            }

            const handler =
                event => {
                    const target =
                        getColorTarget(
                            event.currentTarget
                        );

                    const value =
                        getColorValue(
                            event.currentTarget
                        );

                    if (
                        !target ||
                        !value
                    ) {
                        return;
                    }

                    updateModelColors(
                        runtime,
                        {
                            [target]:
                                value
                        }
                    );
                };

            element.addEventListener(
                'change',
                handler
            );

            element.addEventListener(
                'input',
                handler
            );

            element.__uBuildColorAdapterBound =
                handler;
        }
    );
}

function unbind() {
    const controls =
        getControls();

    controls.forEach(
        element => {
            const handler =
                element.__uBuildColorAdapterBound;

            if (!handler) {
                return;
            }

            element.removeEventListener(
                'change',
                handler
            );

            element.removeEventListener(
                'input',
                handler
            );

            delete element.__uBuildColorAdapterBound;
        }
    );
}

export function createUIColorAdapter(
    runtime
) {
    if (
        !runtime ||
        typeof runtime.update !==
            'function'
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for UIColorAdapter'
        );
    }

    return {
        init() {
            bind(runtime);
            initialize(runtime);
        },

        bind() {
            bind(runtime);
        },

        sync() {
            syncFromModel(runtime);
        },

        read,

        set(target, value) {
            const normalizedTarget =
                normalizeColorKey(target);

            const normalizedValue =
                normalizeHex(value);

            if (
                !normalizedTarget ||
                !normalizedValue
            ) {
                return false;
            }

            const changed =
                set(
                    normalizedTarget,
                    normalizedValue
                );

            if (changed) {
                updateModelColors(
                    runtime,
                    {
                        [normalizedTarget]:
                            normalizedValue
                    }
                );
            }

            return changed;
        },

        get(target) {
            const normalizedTarget =
                normalizeColorKey(target);

            if (
                !normalizedTarget
            ) {
                return null;
            }

            return (
                getModelColors(
                    runtime
                )[
                    normalizedTarget
                ] ||
                null
            );
        },

        getAll() {
            return {
                ...getModelColors(
                    runtime
                )
            };
        },

        refresh() {
            unbind();
            bind(runtime);
            syncFromModel(runtime);
        },

        dispose() {
            unbind();
        }
    };
}

export {
    COLOR_KEYS,
    normalizeColorKey,
    normalizeHex,
    getColorTarget
};