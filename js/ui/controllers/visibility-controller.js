import { setElementChecked } from '../dom-helpers.js';

export function createVisibilityController({ runtime }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for VisibilityController');
    }

    function bind() {
        document.querySelectorAll('[id^="check"],[id^="vis-"],[data-vis]').forEach((el) => {
            const key =
                el.getAttribute('data-vis') ||
                el.id.replace(/^check/, '').replace(/^vis-/, '').toLowerCase();

            if (el.type !== 'checkbox') return;

            el.addEventListener('change', (e) =>
                // Matches the original: calls runtime.update() directly,
                // no full-UI re-sync afterward.
                runtime.update({
                    ...runtime.model,
                    visibility: {
                        ...runtime.model.visibility,
                        [key]: e.target.checked
                    }
                })
            );
        });
    }

    function syncFromModel() {
        if (!runtime.model.visibility) return;

        for (const [key, val] of Object.entries(runtime.model.visibility)) {
            const id = `#check${key.charAt(0).toUpperCase() + key.slice(1)}`;
            setElementChecked([id, `#vis-${key}`, `[data-vis="${key}"]`], val !== false);
        }
    }

    return Object.freeze({ bind, syncFromModel });
}
