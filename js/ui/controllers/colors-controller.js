import { setElementVal } from '../dom-helpers.js';

const COLOR_ALIASES = {
    eavetrim: 'eaveTrim',
    raketrim: 'rakeTrim',
    structuralsteel: 'structuralSteel',
    interiorwall: 'interiorWall',
    wainscotmetal: 'wainscot'
};

export function createColorsController({ runtime }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for ColorsController');
    }

    function normalizeColorKey(value) {
        if (!value) return null;

        let key = String(value).trim();
        if (!key) return null;

        key = key
            .replace(/^color[-_]?/i, '')
            .replace(/[-_]+(.)/g, (_, char) => char.toUpperCase());

        const lower = key.toLowerCase();
        return COLOR_ALIASES[lower] || key.charAt(0).toLowerCase() + key.slice(1);
    }

    function getColorTarget(element) {
        const explicit =
            element.getAttribute('data-color-target') ||
            element.getAttribute('data-color-input') ||
            element.getAttribute('data-target');

        if (explicit) return normalizeColorKey(explicit);

        const name = element.getAttribute('name');
        if (name) {
            const normalizedName = normalizeColorKey(name);
            if (normalizedName && runtime.model.colors?.[normalizedName] !== undefined) {
                return normalizedName;
            }
        }

        const id = element.id || '';
        if (id) {
            const normalizedId = normalizeColorKey(id);
            if (normalizedId) return normalizedId;
        }

        return null;
    }

    function setColor(target, value) {
        if (!target || value === undefined || value === null || value === '') return;

        // Deliberately calls runtime.update() directly rather than the
        // shared update(patch) helper - the original did not re-sync every
        // other control after a colour pick, and this preserves that.
        runtime.update({
            ...runtime.model,
            colors: {
                ...(runtime.model.colors || {}),
                [target]: value
            }
        });
    }

    function bind() {
        const colorControls = document.querySelectorAll(
            'input[type="color"], select[id^="color"], select[name*="color" i], [data-color-target], [data-color-input]'
        );

        colorControls.forEach((control) => {
            const target = getColorTarget(control);
            if (!target) return;

            const handler = (event) => setColor(target, event.target.value);

            control.addEventListener('input', handler);
            control.addEventListener('change', handler);
        });

        document.querySelectorAll('.color-swatch,.color-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const hex =
                    button.getAttribute('data-color') || button.getAttribute('data-hex');

                const target = normalizeColorKey(
                    button.getAttribute('data-target') ||
                        button.getAttribute('data-color-target') ||
                        'wall'
                );

                if (hex) setColor(target, hex);
            });
        });
    }

    function syncFromModel() {
        if (!runtime.model.colors) return;

        for (const [key, hex] of Object.entries(runtime.model.colors)) {
            setElementVal(
                [
                    `#color${key.charAt(0).toUpperCase() + key.slice(1)}`,
                    `#color-${key}`,
                    `[data-color-input="${key}"]`
                ],
                hex
            );
        }
    }

    return Object.freeze({ bind, syncFromModel });
}
