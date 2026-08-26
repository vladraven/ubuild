import { setElementVal, setElementChecked } from '../dom-helpers.js';

export function createWainscotController({ runtime, units, update }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for WainscotController');
    }

    function bind() {
        const toggle = document.querySelector(
            '#wainscotToggle,#toggle-wainscot,#wainscot-toggle'
        );

        if (toggle) {
            toggle.addEventListener('change', (e) =>
                update({
                    panels: {
                        ...runtime.model.panels,
                        wainscotHeight: e.target.checked ? 0.9144 : 0
                    },
                    visibility: {
                        ...runtime.model.visibility,
                        wainscot: e.target.checked
                    }
                })
            );
        }

        const height = document.querySelector(
            '#inputWS,#wainscot-height,#slider-wainscot-height,#val-wainscot-height'
        );

        if (height) {
            height.addEventListener('input', (e) =>
                update({
                    panels: {
                        ...runtime.model.panels,
                        wainscotHeight: units.toMeters(e.target.value)
                    }
                })
            );
        }
    }

    function syncFromModel() {
        const wsHeight = runtime.model.panels?.wainscotHeight || 0;

        setElementVal(
            ['#inputWS', '#valWS', '#wainscot-height', '#slider-wainscot-height', '#val-wainscot-height'],
            units.toDisplay(wsHeight)
        );

        setElementChecked(
            ['#wainscotToggle', '#toggle-wainscot', '#wainscot-toggle'],
            wsHeight > 0
        );
    }

    return Object.freeze({ bind, syncFromModel });
}
