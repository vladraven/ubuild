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

    let key = String(value).trim();

    if (!key) {
        return null;
    }

    key = key
        .replace(/^color[-_]?/i, '')
        .replace(/[-_]+(.)/g, (_, char) =>
            char.toUpperCase());

    const lower = key.toLowerCase();

    return (
        COLOR_ALIASES[lower] ||
        key.charAt(0).toLowerCase() +
        key.slice(1));
}

function normalizeColorValue(value) {
    if (
        value === undefined ||
        value === null) {
        return null;
    }

    const color =
        String(value).trim();

    return color || null;
}

export function createColorsController({
    runtime
}) {
    if (!runtime) {
        throw new TypeError(
            'UBuildRuntime instance is required for ColorsController');
    }

    function getColorTarget(element) {
        if (!element) {
            return null;
        }

        const explicit =
            element.getAttribute(
                'data-color-target') ||
            element.getAttribute(
                'data-color-input') ||
            element.getAttribute(
                'data-target');

        if (explicit) {
            return normalizeColorKey(
                explicit);
        }

        const name =
            element.getAttribute('name');

        if (name) {
            const normalizedName =
                normalizeColorKey(name);

            if (
                normalizedName &&
                runtime.model.colors?.[
                    normalizedName
                ] !== undefined) {
                return normalizedName;
            }
        }

        const id =
            element.getAttribute('id');

        if (id) {
            const normalizedId =
                normalizeColorKey(id);

            if (normalizedId) {
                return normalizedId;
            }
        }

        return null;
    }

    function getColorValue(element) {
        if (!element) {
            return null;
        }

        return normalizeColorValue(
            element.value);
    }

    function setColor(
        target,
        value) {
        const normalizedTarget =
            normalizeColorKey(target);

        const normalizedValue =
            normalizeColorValue(value);

        if (
            !normalizedTarget ||
            !normalizedValue) {
            return;
        }

        runtime.update({
            ...runtime.model,

            colors: {
                ...(runtime.model.colors || {}),
                [normalizedTarget]:
                normalizedValue
            }
        });
    }

    // FIX: on load, model.colors starts from DEFAULT_COLORS in
    // buildingModel.js - all plain white (#FFFFFF). The <select> elements
    // in 3d-design-tool-new.php are rendered server-side from a colors
    // DB table and already have PHP's own defaults `selected` (e.g. "Stone
    // Grey" for roof, "Royal Blue" for trim) - those hex codes are unknown
    // to the JS model. Because syncFromModel() runs on init and writes the
    // JS-side white defaults back into every <select>.value, and no option
    // in most of these palettes is literally "#FFFFFF", the assignment
    // matches no <option> and the browser shows the select as blank - this
    // is the "no color is selected by default, even though PHP has
    // selected ones" symptom. It also meant the 3D model started out
    // rendering white/mismatched materials until the user manually
    // reselected every dropdown.
    //
    // Fix: read the actual currently-selected value out of each rendered
    // control (which reflects PHP's `selected` option) and seed the model
    // with that, once, before wiring up change listeners - instead of
    // letting the JS defaults silently overwrite what the server already
    // picked.
    function seedModelFromDom(colorControls) {
        const patch = {};

        colorControls.forEach((control) => {
            const target = getColorTarget(control);
            if (!target) return;

            const value = getColorValue(control);
            if (!value) return;

            patch[target] = value;
        });

        if (Object.keys(patch).length === 0) return;

        runtime.update({
            ...runtime.model,
            colors: {
                ...(runtime.model.colors || {}),
                ...patch
            }
        });
    }

    function bind() {
        const colorControls =
            document.querySelectorAll(
                [
                    'input[type="color"]',
                    'select[id^="color"]',
                    'select[name*="color" i]',
                    '[data-color-target]',
                    '[data-color-input]'
                ].join(','));

        seedModelFromDom(colorControls);

        colorControls.forEach(
            control => {
            const target =
                getColorTarget(
                    control);

            if (!target) {
                return;
            }

            if (
                control.__uBuildColorHandler) {
                return;
            }

            const handler =
                event => {
                setColor(
                    target,
                    getColorValue(
                        event.currentTarget));
            };

            control.addEventListener(
                'input',
                handler);

            control.addEventListener(
                'change',
                handler);

            control.__uBuildColorHandler =
                handler;
        });

        document
        .querySelectorAll(
            '.color-swatch,.color-btn')
        .forEach(button => {
            if (
                button.__uBuildColorHandler) {
                return;
            }

            const handler =
                () => {
                const hex =
                    normalizeColorValue(
                        button.getAttribute(
                            'data-color') ||
                        button.getAttribute(
                            'data-hex'));

                const target =
                    normalizeColorKey(
                        button.getAttribute(
                            'data-target') ||
                        button.getAttribute(
                            'data-color-target') ||
                        'wall');

                if (
                    hex &&
                    target) {
                    setColor(
                        target,
                        hex);
                }
            };

            button.addEventListener(
                'click',
                handler);

            button.__uBuildColorHandler =
                handler;
        });
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
            of Object.entries(colors)) {
            const normalizedKey =
                normalizeColorKey(key);

            const normalizedValue =
                normalizeColorValue(value);

            if (
                !normalizedKey ||
                !normalizedValue) {
                continue;
            }

            setElementVal(
                [
                    `#color${normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1)}`, 
                    `#color-${normalizedKey}`, 
                    `[data-color-input="${normalizedKey}"]`, 
`[data-color-target="${normalizedKey}"]`
                ],
                normalizedValue);
        }
    }

    function dispose() {
        document
        .querySelectorAll(
            [
                'input[type="color"]',
                'select[id^="color"]',
                'select[name*="color" i]',
                '[data-color-target]',
                '[data-color-input]'
            ].join(','))
        .forEach(control => {
            const handler =
                control.__uBuildColorHandler;

            if (!handler) {
                return;
            }

            control.removeEventListener(
                'input',
                handler);

            control.removeEventListener(
                'change',
                handler);

            delete control.__uBuildColorHandler;
        });

        document
        .querySelectorAll(
            '.color-swatch,.color-btn')
        .forEach(button => {
            const handler =
                button.__uBuildColorHandler;

            if (!handler) {
                return;
            }

            button.removeEventListener(
                'click',
                handler);

            delete button.__uBuildColorHandler;
        });
    }

    return Object.freeze({
        bind,
        syncFromModel,
        dispose
    });
}