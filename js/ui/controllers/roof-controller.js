import { setElementVal } from '../dom-helpers.js';

export function createRoofController({ runtime, update, syncAll }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for RoofController');
    }

    function formatPitchRatio(ratio) {
        const pitch12 = Number(ratio) * 12;
        const formatted = parseFloat(pitch12.toFixed(1)).toString();
        return `${formatted}:12`;
    }

    function parsePitchInput(raw) {
        if (raw === undefined || raw === null) return NaN;
        const str = String(raw).trim().replace(/:12$/i, '').trim();
        const num = parseFloat(str);
        return Number.isFinite(num) ? num : NaN;
    }

    function getPitchLimits() {
        const constraints = window.ConfiguratorBackendConstraints || {};
        const profile = String(runtime.model.roof?.profile || 'awr').toLowerCase();
        const roofType = String(runtime.model.roof?.type || 'gabled').toLowerCase();
        const pitchEl = document.getElementById('inputPitch');

        let min = Number(pitchEl?.min);
        let max = Number(pitchEl?.max);
        let step = Number(pitchEl?.step);

        if (!Number.isFinite(min) || min < 0) {
            min = Number(constraints.pitch_min ?? 0);
        }

        if (!Number.isFinite(max) || max <= 0) {
            max = Number(constraints.pitch_awr_max ?? constraints.pitch_awr ?? 1);
        }

        if (!Number.isFinite(step) || step <= 0) {
            step = Number(constraints.pitch_step ?? 0.001);
        }

        if (profile.includes('ssr') || profile.includes('snap')) {
            min = Number(constraints.pitch_ssr24_min ?? min);
            max = Number(constraints.pitch_ssr24_max ?? constraints.pitch_ssr24 ?? max);
            step = Number(constraints.pitch_ssr24_step ?? step);
        }

        if (roofType === 'left-sloped' || roofType === 'right-sloped') {
            max = Math.min(max, Number(constraints.pitch_sloped_max ?? 0.1667));
        }

        if (!Number.isFinite(min) || min < 0) min = 0;
        if (!Number.isFinite(max) || max <= min) max = 1;
        if (!Number.isFinite(step) || step <= 0) step = 0.001;

        return { min, max, step };
    }

    function updatePitchControls() {
        const ratio = Number(runtime.model.roof?.pitchRatio ?? 0.05);
        const limits = getPitchLimits();
        const value = Math.max(limits.min, Math.min(limits.max, ratio));

        for (const selector of ['#inputPitch', '#roof-pitch', '#slider-pitch']) {
            const el = document.querySelector(selector);
            if (!el) continue;

            if (el.type === 'range') {
                el.min = limits.min;
                el.max = limits.max;
                el.step = limits.step;
                el.value = value;
            }
        }

        const formatted = formatPitchRatio(value);
        setElementVal(['#valPitch', '#val-pitch'], formatted);

        const minLabel = document.querySelector('#lblMinPitch');
        const maxLabel = document.querySelector('#lblMaxPitch');

        if (minLabel) minLabel.textContent = formatPitchRatio(limits.min);
        if (maxLabel) maxLabel.textContent = formatPitchRatio(limits.max);
    }

    function handlePitchChange(rawValue, fromSlider) {
        const limits = getPitchLimits();
        let ratio;

        if (fromSlider) {
            ratio = parseFloat(rawValue);
        } else {
            const rise = parsePitchInput(rawValue);
            if (!Number.isFinite(rise)) return;
            ratio = rise / 12;
        }

        if (!Number.isFinite(ratio)) return;

        const clamped = Math.max(limits.min, Math.min(limits.max, ratio));

        update({
            roof: {
                ...runtime.model.roof,
                pitchRatio: clamped
            }
        });
    }

    function bindPitch() {
        document.querySelectorAll('#inputPitch,#roof-pitch,#slider-pitch').forEach((el) => {
            el.addEventListener('input', (e) => handlePitchChange(e.target.value, true));
            el.addEventListener('change', (e) => handlePitchChange(e.target.value, true));
        });

        document
            .querySelectorAll('#valPitch,#val-pitch,select[name="roof-pitch"]')
            .forEach((el) => {
                el.addEventListener('input', (e) => handlePitchChange(e.target.value, false));
                el.addEventListener('change', (e) => handlePitchChange(e.target.value, false));
            });

        const roofProfile = document.querySelector('#roofProfile');
        if (roofProfile) {
            roofProfile.addEventListener('change', () => {
                updatePitchControls();
            });
        }
    }

    function applyRoofType(type) {
        const normalized = String(type || '').trim().toLowerCase();

        if (
            normalized !== 'gabled' &&
            normalized !== 'left-sloped' &&
            normalized !== 'right-sloped'
        ) {
            return;
        }

        const currentRoof = runtime.model.roof || {};
        const nextModel = {
            ...runtime.model,
            roof: {
                ...currentRoof,
                type: normalized
            }
        };

        runtime.update(nextModel);
        syncAll();

        if (typeof runtime.render === 'function') {
            runtime.render();
        }
    }

    function bindRoofControls() {
        const roofType = document.querySelector('#roofType');
        if (roofType) {
            roofType.addEventListener('change', (event) => {
                applyRoofType(event.target.value);
            });
        }

        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-roof-type], .roof-type-btn');
            if (!button) return;

            event.preventDefault();

            const type =
                button.getAttribute('data-roof-type') ||
                button.value ||
                button.getAttribute('value');

            applyRoofType(type);
        });

        const roofProfile = document.querySelector('#roofProfile');
        if (roofProfile) {
            roofProfile.addEventListener('change', (event) => {
                runtime.update({
                    ...runtime.model,
                    roof: {
                        ...runtime.model.roof,
                        profile: event.target.value
                    }
                });

                updatePitchControls();
            });
        }

        const wallProfile = document.querySelector('#wallProfile');
        if (wallProfile) {
            wallProfile.addEventListener('change', (event) => {
                runtime.update({
                    ...runtime.model,
                    panels: {
                        ...runtime.model.panels,
                        profile: event.target.value
                    }
                });
            });
        }
    }

    function bind() {
        bindPitch();
        bindRoofControls();
    }

    function syncFromModel() {
        updatePitchControls();

        const model = runtime.model;
        const roofType = model.roof?.type || 'gabled';
        const roofProfile = model.roof?.profile || 'awr';
        const wallProfile = model.panels?.profile || 'awr';

        document.querySelectorAll('[data-roof-type],.roof-type-btn').forEach((btn) => {
            const type = btn.getAttribute('data-roof-type') || btn.value;
            btn.classList.toggle('active', type === roofType);
        });

        setElementVal(['#roofType', 'select[name="roof-type"]'], roofType);
        setElementVal(['#roofProfile', 'select[name="roof-profile"]'], roofProfile);
        setElementVal(['#wallProfile', 'select[name="wall-profile"]'], wallProfile);
    }

    return Object.freeze({
        bind,
        syncFromModel,
        getPitchLimits
    });
}
