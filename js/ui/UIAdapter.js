import { serializeModelToURL } from '../integration/URLSerializer.js';
import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';

const M_TO_FT = 3.28084;
const FT_TO_M = 0.3048;

export function createUIAdapter(runtime) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for UIAdapter');
    }

    let isImperial = true;

    function toDisplay(meters) {
        if (meters === undefined || meters === null) return 0;
        return isImperial ? (meters * M_TO_FT).toFixed(1) : Number(meters).toFixed(2);
    }

    function toMeters(val) {
        const num = parseFloat(val) || 0;
        return isImperial ? num * FT_TO_M : num;
    }

    function updateInputsFromModel() {
        const model = runtime.model;
        const d = model.dimensions;

        setElementVal(['#input-width', '#slider-width', '#val-width', '#building-width', '#width-ft'], toDisplay(d.width));
        setElementVal(['#input-length', '#slider-length', '#val-length', '#building-length', '#length-ft'], toDisplay(d.length));
        setElementVal(['#input-height', '#slider-height', '#val-height', '#building-height', '#height-ft'], toDisplay(d.height));

        const unitLabels = document.querySelectorAll('.value-unit, .unit-label');
        unitLabels.forEach(el => {
            el.textContent = isImperial ? 'ft' : 'm';
        });

        const pitchRatio = model.roof?.pitchRatio || 0.1666666667;
        const pitchIn12 = Math.round(pitchRatio * 12);
        setElementVal(['#roof-pitch', '#slider-pitch', '#val-pitch'], pitchIn12);

        const roofType = model.roof?.type || 'gabled';
        document.querySelectorAll('[data-roof-type], .roof-type-btn').forEach(btn => {
            const btnType = btn.getAttribute('data-roof-type') || btn.value;
            if (btnType === roofType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const ov = model.roof?.overhangs || {};
        setElementVal(['#overhang-front', '#val-overhang-front'], toDisplay(ov.front || 0));
        setElementVal(['#overhang-back', '#val-overhang-back'], toDisplay(ov.back || 0));
        setElementVal(['#overhang-left', '#val-overhang-left'], toDisplay(ov.left || 0));
        setElementVal(['#overhang-right', '#val-overhang-right'], toDisplay(ov.right || 0));

        const wsHeight = model.panels?.wainscotHeight || 0;
        setElementVal(['#wainscot-height', '#slider-wainscot-height', '#val-wainscot-height'], toDisplay(wsHeight));
        setElementChecked(['#toggle-wainscot', '#wainscot-toggle'], wsHeight > 0);

        if (model.colors) {
            for (const [key, hex] of Object.entries(model.colors)) {
                setElementVal([`#color-${key}`, `[data-color-input="${key}"]`], hex);
            }
        }

        if (model.visibility) {
            for (const [key, val] of Object.entries(model.visibility)) {
                setElementChecked([`#vis-${key}`, `[data-vis="${key}"]`], val !== false);
            }
        }
    }

    function setElementVal(selectors, val) {
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el) {
                el.value = val;
                if (el.tagName === 'SPAN' || el.tagName === 'B') el.textContent = val;
            }
        }
    }

    function setElementChecked(selectors, checked) {
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el && el.type === 'checkbox') {
                el.checked = checked;
            }
        }
    }

    function handleDimensionChange(prop, val) {
        const meters = toMeters(val);
        if (meters <= 0) return;
        const current = runtime.model;
        runtime.update({
            ...current,
            dimensions: {
                ...current.dimensions,
                [prop]: meters
            }
        });
        updateInputsFromModel();
    }

    function bindEvents() {
        const widthInputs = document.querySelectorAll('#input-width, #slider-width, #val-width, #building-width, #width-ft');
        widthInputs.forEach(el => el.addEventListener('input', (e) => handleDimensionChange('width', e.target.value)));

        const lengthInputs = document.querySelectorAll('#input-length, #slider-length, #val-length, #building-length, #length-ft');
        lengthInputs.forEach(el => el.addEventListener('input', (e) => handleDimensionChange('length', e.target.value)));

        const heightInputs = document.querySelectorAll('#input-height, #slider-height, #val-height, #building-height, #height-ft');
        heightInputs.forEach(el => el.addEventListener('input', (e) => handleDimensionChange('height', e.target.value)));

        const unitBtns = document.querySelectorAll('#unit-toggle, #unit-switch, [data-unit], .btn-unit-toggle');
        unitBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requested = btn.getAttribute('data-unit');
                if (requested) {
                    isImperial = requested === 'imperial';
                } else {
                    isImperial = !isImperial;
                }
                updateInputsFromModel();
            });
        });

        document.querySelectorAll('[data-roof-type], .roof-type-btn, select[name="roof-type"]').forEach(el => {
            el.addEventListener('click', (e) => {
                const targetType = el.getAttribute('data-roof-type') || el.value;
                if (targetType) {
                    const current = runtime.model;
                    runtime.update({
                        ...current,
                        roof: {
                            ...current.roof,
                            type: targetType
                        }
                    });
                    updateInputsFromModel();
                }
            });
            el.addEventListener('change', (e) => {
                const current = runtime.model;
                runtime.update({
                    ...current,
                    roof: {
                        ...current.roof,
                        type: e.target.value
                    }
                });
                updateInputsFromModel();
            });
        });

        const pitchInputs = document.querySelectorAll('#roof-pitch, #slider-pitch, #val-pitch, select[name="roof-pitch"]');
        pitchInputs.forEach(el => {
            el.addEventListener('input', (e) => {
                const pitchNum = parseFloat(e.target.value) || 2;
                const ratio = pitchNum / 12.0;
                const current = runtime.model;
                runtime.update({
                    ...current,
                    roof: {
                        ...current.roof,
                        pitchRatio: ratio
                    }
                });
                updateInputsFromModel();
            });
        });

        ['front', 'back', 'left', 'right'].forEach(side => {
            const ovInputs = document.querySelectorAll(`#overhang-${side}, #slider-overhang-${side}, #val-overhang-${side}`);
            ovInputs.forEach(el => {
                el.addEventListener('input', (e) => {
                    const meters = toMeters(e.target.value);
                    const current = runtime.model;
                    runtime.update({
                        ...current,
                        roof: {
                            ...current.roof,
                            overhangs: {
                                ...current.roof.overhangs,
                                [side]: meters
                            }
                        }
                    });
                    updateInputsFromModel();
                });
            });
        });

        const wsToggle = document.querySelector('#toggle-wainscot, #wainscot-toggle');
        if (wsToggle) {
            wsToggle.addEventListener('change', (e) => {
                const current = runtime.model;
                const newHeight = e.target.checked ? 0.9144 : 0;
                runtime.update({
                    ...current,
                    panels: {
                        ...current.panels,
                        wainscotHeight: newHeight
                    },
                    visibility: {
                        ...current.visibility,
                        wainscot: e.target.checked
                    }
                });
                updateInputsFromModel();
            });
        }

        const wsHeightInputs = document.querySelectorAll('#wainscot-height, #slider-wainscot-height, #val-wainscot-height');
        wsHeightInputs.forEach(el => {
            el.addEventListener('input', (e) => {
                const meters = toMeters(e.target.value);
                const current = runtime.model;
                runtime.update({
                    ...current,
                    panels: {
                        ...current.panels,
                        wainscotHeight: meters
                    }
                });
                updateInputsFromModel();
            });
        });

        const colorInputs = document.querySelectorAll('input[type="color"], [data-color-target]');
        colorInputs.forEach(input => {
            const targetColor = input.getAttribute('data-color-target') || input.id.replace('color-', '');
            input.addEventListener('input', (e) => {
                const hex = e.target.value;
                const current = runtime.model;
                runtime.update({
                    ...current,
                    colors: {
                        ...current.colors,
                        [targetColor]: hex
                    }
                });
            });
        });

        document.querySelectorAll('.color-swatch, .color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const hex = btn.getAttribute('data-color') || btn.getAttribute('data-hex');
                const target = btn.getAttribute('data-target') || 'wall';
                if (hex) {
                    const current = runtime.model;
                    runtime.update({
                        ...current,
                        colors: {
                            ...current.colors,
                            [target]: hex
                        }
                    });
                    updateInputsFromModel();
                }
            });
        });

        const visChecks = document.querySelectorAll('[id^="vis-"], [data-vis]');
        visChecks.forEach(check => {
            const group = check.getAttribute('data-vis') || check.id.replace('vis-', '');
            check.addEventListener('change', (e) => {
                const current = runtime.model;
                runtime.update({
                    ...current,
                    visibility: {
                        ...current.visibility,
                        [group]: e.target.checked
                    }
                });
            });
        });

        const btnReset = document.querySelector('#btn-reset-camera, #reset-view');
        if (btnReset) {
            btnReset.addEventListener('click', () => runtime.autoFrame());
        }

        const btnShare = document.querySelector('#btn-share, #share-config');
        if (btnShare) {
            btnShare.addEventListener('click', () => {
                const hash = serializeModelToURL(runtime.model);
                const url = `${window.location.origin}${window.location.pathname}?config=${hash}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url);
                    alert('Configuration link copied to clipboard!');
                } else {
                    prompt('Copy configuration link:', url);
                }
            });
        }

        const btnQuote = document.querySelector('#custom-gform-submit, #btn-quote-submit');
        if (btnQuote) {
            btnQuote.addEventListener('click', (e) => {
                submitToGravityForms({
                    formId: 4,
                    snapshotFieldId: 15,
                    specFieldId: 16,
                    model: runtime.model,
                    geometry: runtime.geometry,
                    renderer: runtime.renderer
                });
            });
        }
    }

    function init() {
        bindEvents();
        updateInputsFromModel();
    }

    return Object.freeze({
        init,
        updateInputsFromModel,
        toDisplay,
        toMeters
    });
}