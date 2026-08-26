const M_TO_FT = 3.28084;
const FT_TO_M = 0.3048;

// Owns the imperial/metric toggle state for the whole UI. Every other
// controller that needs to convert a value for display gets toDisplay/
// toMeters from here (passed in via ctx from UIAdapter.js) rather than
// keeping its own copy of isImperial.
export function createUnitsController({ runtime }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for UnitsController');
    }

    let isImperial = true;

    function toDisplay(meters) {
        if (meters === undefined || meters === null) return 0;

        return isImperial
            ? (meters * M_TO_FT).toFixed(1)
            : Number(meters).toFixed(2);
    }

    function toMeters(val) {
        const num = parseFloat(val);
        if (!Number.isFinite(num)) return 0;
        return isImperial ? num * FT_TO_M : num;
    }

    function getIsImperial() {
        return isImperial;
    }

    function syncDistSlidersToUnit() {
        document.querySelectorAll('.dist-slider').forEach((slider) => {
            const mMin = parseFloat(slider.getAttribute('data-m-min'));
            const mMax = parseFloat(slider.getAttribute('data-m-max'));
            const mStep = parseFloat(slider.getAttribute('data-m-step'));

            let currentM = parseFloat(slider.getAttribute('data-current-m'));

            if (!Number.isFinite(currentM)) {
                const id = slider.id || '';
                if (id.includes('W') || id.includes('width')) {
                    currentM = runtime.model.dimensions.width;
                } else if (id.includes('L') || id.includes('length')) {
                    currentM = runtime.model.dimensions.length;
                } else if (id.includes('H') || id.includes('height')) {
                    currentM = runtime.model.dimensions.height;
                } else {
                    currentM = toMeters(slider.value);
                }
            }

            if (Number.isFinite(mMin)) {
                slider.min = isImperial ? (mMin * M_TO_FT).toFixed(2) : mMin.toFixed(2);
            }

            if (Number.isFinite(mMax)) {
                slider.max = isImperial ? (mMax * M_TO_FT).toFixed(2) : mMax.toFixed(2);
            }

            if (Number.isFinite(mStep)) {
                slider.step = isImperial ? (mStep * M_TO_FT).toFixed(2) : mStep.toFixed(2);
            }

            if (Number.isFinite(currentM)) {
                const display = isImperial ? currentM * M_TO_FT : currentM;
                slider.value = display.toFixed(2);
                slider.setAttribute('data-current-m', currentM);

                const targetId = slider.getAttribute('data-target');
                if (targetId) {
                    const target = document.getElementById(targetId);
                    if (target) {
                        target.value = display.toFixed(isImperial ? 1 : 2);
                    }
                }
            }
        });

        const constraints = window.ConfiguratorBackendConstraints || {};
        const pairs = [
            { lbl: '#lblMaxW', mKey: 'max_width', fallback: 91.44 },
            { lbl: '#lblMaxL', mKey: 'max_length', fallback: 36.576 },
            { lbl: '#lblMaxH', mKey: 'max_height', fallback: 9.144 }
        ];

        for (const { lbl, mKey, fallback } of pairs) {
            const el = document.querySelector(lbl);
            if (!el) continue;

            const mVal = Number(constraints[mKey] ?? fallback);
            el.textContent = isImperial
                ? (mVal * M_TO_FT).toFixed(1)
                : mVal.toFixed(2);
        }
    }

    function bind(onChange) {
        const toggle = document.querySelector(
            '#unitToggle,#unit-toggle,#unit-switch,[data-unit],.btn-unit-toggle'
        );
        if (!toggle) return;

        const apply = () => {
            syncDistSlidersToUnit();
            if (typeof onChange === 'function') onChange();
        };

        toggle.addEventListener('change', (e) => {
            isImperial = e.target.getAttribute('data-unit')
                ? e.target.getAttribute('data-unit') === 'imperial'
                : !e.target.checked;
            apply();
        });

        toggle.addEventListener('click', () => {
            if (toggle.type === 'checkbox') return;
            const requested = toggle.getAttribute('data-unit');
            isImperial = requested ? requested === 'imperial' : !isImperial;
            apply();
        });
    }

    return Object.freeze({
        toDisplay,
        toMeters,
        isImperial: getIsImperial,
        syncDistSlidersToUnit,
        bind,
        syncFromModel() {
            document.querySelectorAll('.value-unit,.unit-label').forEach((el) => {
                el.textContent = isImperial ? 'ft' : 'm';
            });
        }
    });
}
