import { isMetric, setMetric, openingsData, openingDefs, incrementOpeningId, ltState, collectCurrentState } from './state.js';
import { controls } from './scene.js';
import { initExternalModelsUI } from './external-references-models.js';
import { initInsideView, initCompareFeature, initResetFeature, initShareFeature, setupQuoteModal, applyUrlConfig } from './tools-actions.js';
import { initColoriseUI } from './colorise.js';
import { initTexturiserUI } from './texturiser.js';

function stopCameraAutoRotation() {
    if (controls && controls.autoRotate) {
        controls.autoRotate = false;
    }
}

let singleToastInstance = null;

function showAspectRatioToast(message) {
    let toastEl = document.getElementById('aspect-ratio-single-toast');

    if (!toastEl) {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '999999';
            document.body.appendChild(toastContainer);
        }

        const toastHtml = `
            <div id="aspect-ratio-single-toast" class="toast align-items-center text-white bg-dark border-warning shadow" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div id="aspect-ratio-toast-body" class="toast-body small">
                        <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                        <span id="aspect-ratio-toast-text"></span>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        toastEl = document.getElementById('aspect-ratio-single-toast');
    }

    const toastText = document.getElementById('aspect-ratio-toast-text');
    if (toastText) {
        toastText.innerHTML = message;
    }

    if (window.bootstrap && window.bootstrap.Toast) {
        if (!singleToastInstance) {
            singleToastInstance = new window.bootstrap.Toast(toastEl, { delay: 4000 });
        }
        singleToastInstance.show();
    } else {
        toastEl.classList.add('show');
        clearTimeout(toastEl._hideTimeout);
        toastEl._hideTimeout = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 4000);
    }
}

export function checkAspectRatioViolations() {
    const inputW = document.getElementById('inputW');
    const inputH = document.getElementById('inputH');
    const valW = document.getElementById('valW');
    const valH = document.getElementById('valH');

    if (!inputW || !inputH) return { hasViolation: false, messages: [] };

    const constraints = window.ConfiguratorBackendConstraints || {};
    const systemMaxH_M = constraints.max_height || parseFloat(inputH.getAttribute('data-m-max')) || 12.192;
    const systemMaxW_M = constraints.max_width || parseFloat(inputW.getAttribute('data-m-max')) || 91.44;

    let wM = parseFloat(inputW.getAttribute('data-current-m')) || 18.288;
    let hM = parseFloat(inputH.getAttribute('data-current-m')) || 4.8768;

    const unitStr = isMetric ? 'm' : 'ft';
    const mult = isMetric ? 1 : 3.28084;

    let hasViolation = false;
    const messages = [];

    if (hM > systemMaxH_M) {
        hM = systemMaxH_M;
        const dispH = hM * mult;
        inputH.value = dispH.toFixed(2);
        if (valH) valH.value = dispH.toFixed(2);
        inputH.setAttribute('data-current-m', hM);
        hasViolation = true;
        messages.push(`Maximum height reached (${dispH.toFixed(1)} ${unitStr}).`);
    }

    if (wM > systemMaxW_M) {
        wM = systemMaxW_M;
        const dispW = wM * mult;
        inputW.value = dispW.toFixed(2);
        if (valW) valW.value = dispW.toFixed(2);
        inputW.setAttribute('data-current-m', wM);
        hasViolation = true;
        messages.push(`Maximum width reached (${dispW.toFixed(1)} ${unitStr}).`);
    }

    let noticeW = document.getElementById('aspect-notice-w');
    let noticeH = document.getElementById('aspect-notice-h');
    if (noticeW) noticeW.style.display = 'none';
    if (noticeH) noticeH.style.display = 'none';

    return { hasViolation, messages };
}

export function validateAndClampOpenings() {
    const inputW = document.getElementById('inputW');
    const inputL = document.getElementById('inputL');

    const currentW = inputW ? (parseFloat(inputW.getAttribute('data-current-m')) || 18.288) : 18.288;
    const currentL = inputL ? (parseFloat(inputL.getAttribute('data-current-m')) || 30.48) : 30.48;

    const wallLengths = {
        F: currentW,
        B: currentW,
        L: currentL,
        R: currentL
    };

    ['F', 'B', 'L', 'R'].forEach(side => {
        const wallLen = wallLengths[side];
        const ops = openingsData[side] || [];

        ops.forEach(op => {
            const def = openingDefs[op.type] || { w: 1.0 };
            const opW = op.w || def.w;
            const halfOpW = opW / 2;

            if (opW > wallLen) {
                alert(`Warning: The opening "${op.type}" on ${side} wall (${isMetric ? opW.toFixed(1) + 'm' : (opW * 3.28084).toFixed(1) + 'ft'}) is wider than the wall length!`);
            }

            const maxBound = Math.max(0, wallLen / 2 - halfOpW);
            const minBound = -maxBound;

            if (op.x > maxBound) op.x = maxBound;
            if (op.x < minBound) op.x = minBound;
        });
    });
}

export function updateAwningDepthMaxLimits() {
    const inputW = document.getElementById('inputW');
    const widthM = inputW ? (parseFloat(inputW.getAttribute('data-current-m')) || 18.288) : 18.288;
    const maxDepthM = widthM / 2;

    ['L', 'R', 'F', 'B'].forEach(side => {
        const slider = document.getElementById(`ltDepth${side}`);
        if (slider) {
            slider.setAttribute('data-m-max', maxDepthM);
            const calculatedMax = isMetric ? maxDepthM : (maxDepthM * 3.28084);
            slider.max = calculatedMax.toFixed(1);

            if (parseFloat(slider.value) > parseFloat(slider.max)) {
                slider.value = slider.max;
                const inputVal = document.getElementById(`ltDepth${side}_val`);
                if (inputVal) inputVal.value = slider.value;
                ltState[side].depth = maxDepthM;
            }
        }
    });
}

function bindSliderAndInput(sliderId, inputId, renderCallback) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    if (!slider || !input) return;

    const handleDimensionChange = () => {
        if (sliderId === 'inputW' || sliderId === 'inputH') {
            checkAspectRatioViolations();
        }

        if (sliderId === 'inputW' || sliderId === 'inputL' || sliderId === 'inputH') {
            validateAndClampOpenings();
            updateAwningDepthMaxLimits();
        }

        if (typeof renderCallback === 'function') renderCallback();
    };

    slider.addEventListener('input', (e) => {
        stopCameraAutoRotation();
        const rawVal = parseFloat(e.target.value);
        if (isNaN(rawVal)) return;

        input.value = rawVal.toFixed(2);
        const mVal = isMetric ? rawVal : rawVal * 0.3048;
        slider.setAttribute('data-current-m', mVal);

        handleDimensionChange();
    });

    input.addEventListener('change', (e) => {
        stopCameraAutoRotation();
        let rawVal = parseFloat(e.target.value);
        if (isNaN(rawVal)) return;

        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 1000;
        rawVal = Math.max(min, Math.min(max, rawVal));

        input.value = rawVal.toFixed(2);
        slider.value = rawVal;

        const mVal = isMetric ? rawVal : rawVal * 0.3048;
        slider.setAttribute('data-current-m', mVal);

        handleDimensionChange();
    });
}

function bindSimpleSliderAndInput(sliderId, inputId, renderCallback) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    if (!slider || !input) return;

    slider.addEventListener('input', (e) => {
        stopCameraAutoRotation();
        input.value = e.target.value;
        if (typeof renderCallback === 'function') renderCallback();
    });

    input.addEventListener('change', (e) => {
        stopCameraAutoRotation();
        slider.value = e.target.value;
        if (typeof renderCallback === 'function') renderCallback();
    });
}

function updateSidebarSummary() {
    const dimensionsEl =
        document.getElementById('sidebar-summary-dimensions');

    const roofEl =
        document.getElementById('sidebar-summary-roof');

    const colorsEl =
        document.getElementById('sidebar-summary-colors');

    if (!dimensionsEl || !roofEl || !colorsEl) {
        return;
    }

    const width =
        document.getElementById('valW')?.value
        || '';

    const length =
        document.getElementById('valL')?.value
        || '';

    const height =
        document.getElementById('valH')?.value
        || '';

    const unit =
        isMetric
            ? 'm'
            : 'ft';

    const roofTypeSelect =
        document.getElementById('roofType');

    const roofType =
        roofTypeSelect?.selectedOptions?.[0]?.text
        || '';

    const pitchInput =
        document.getElementById('valPitch');

    const pitch =
        pitchInput?.value
        || '';

    const roofProfileSelect =
        document.getElementById('roofProfile');

    const roofProfile =
        roofProfileSelect?.selectedOptions?.[0]?.text
        || '';

    const getSelectedColorName = (id) => {
        const select =
            document.getElementById(id);

        if (!select) {
            return '';
        }

        return (
            select.selectedOptions?.[0]?.text
            || ''
        ).trim();
    };

    const roofColor =
        getSelectedColorName(
            'colorRoof'
        );

    const wallColor =
        getSelectedColorName(
            'colorWall'
        );

    const trimColor =
        getSelectedColorName(
            'colorTrim'
        );

    const eaveTrimColor =
        getSelectedColorName(
            'colorEaveTrim'
        );

    const wainscotColor =
        getSelectedColorName(
            'colorWainscot'
        );

    dimensionsEl.textContent =
        `${width}${unit} x ${length}${unit} x ${height}${unit}`;

    roofEl.innerHTML =
        `${escapeHtml(roofType)}`
        + (
            pitch
                ? ` · ${escapeHtml(pitch)}`
                : ''
        )
        + (
            roofProfile
                ? ` · ${escapeHtml(roofProfile)}`
                : ''
        );

    colorsEl.innerHTML = `
        <div>Roof: <strong>${escapeHtml(roofColor || '—')}</strong></div>
        <div>Walls: <strong>${escapeHtml(wallColor || '—')}</strong></div>
        <div>Trim: <strong>${escapeHtml(trimColor || '—')}</strong></div>
        <div>Eave Trim: <strong>${escapeHtml(eaveTrimColor || '—')}</strong></div>
        <div>Wainscot: <strong>${escapeHtml(wainscotColor || '—')}</strong></div>
    `;
}

export function initUI(renderCallback, renderer, scene, cameraObj, controlsObj) {
    const activeControls = controlsObj || controls;
    const constraints = window.ConfiguratorBackendConstraints || {};

    initColoriseUI(renderCallback);
    initTexturiserUI(renderCallback);

    setupQuoteModal();

    const unitToggle = document.getElementById('unitToggle');
    if (unitToggle) {
        unitToggle.addEventListener('change', (e) => {
            stopCameraAutoRotation();
            setMetric(e.target.checked);

            const label = document.getElementById('unitToggleLabel');
            if (label) {
                label.innerText = isMetric ? "System: Metric (m)" : "System: Imperial (ft)";
            }

            document.querySelectorAll('.unit-label').forEach(el => {
                el.innerText = isMetric ? 'm' : 'ft';
            });

            document.querySelectorAll('.dist-slider').forEach(slider => {
                const mMin = parseFloat(slider.getAttribute('data-m-min'));
                const mMax = parseFloat(slider.getAttribute('data-m-max'));
                const mStep = parseFloat(slider.getAttribute('data-m-step'));
                const currentM = parseFloat(slider.getAttribute('data-current-m'));

                if (!isNaN(currentM)) {
                    slider.min = isMetric ? mMin : (mMin * 3.28084).toFixed(2);
                    slider.max = isMetric ? mMax : (mMax * 3.28084).toFixed(2);
                    slider.step = isMetric ? mStep : (mStep * 3.28084).toFixed(2);

                    const calculatedVal = isMetric ? currentM : (currentM * 3.28084);
                    slider.value = calculatedVal.toFixed(2);

                    const targetInput = document.getElementById(slider.getAttribute('data-target'));
                    if (targetInput) {
                        targetInput.value = calculatedVal.toFixed(2);
                    }
                }
            });

            updateAwningDepthMaxLimits();
            checkAspectRatioViolations();
            populateOpeningsUI(renderCallback);
            if (typeof renderCallback === 'function') renderCallback();
        });
    }

    // ДИНАМИЧЕСКАЯ НАСТРОЙКА ЛИМИТОВ ИЗ БЭКЕНДА ИЛИ ШАБЛОНА PHP
    const inputH = document.getElementById('inputH');
    if (inputH) {
        const backendMaxH = constraints.max_height || parseFloat(inputH.getAttribute('data-m-max')) || 12.192;
        inputH.setAttribute('data-m-max', backendMaxH);
        const maxHDisplay = isMetric ? backendMaxH.toFixed(2) : (backendMaxH * 3.28084).toFixed(1);
        inputH.max = maxHDisplay;
        const lblMaxH = document.getElementById('lblMaxH');
        if (lblMaxH) lblMaxH.innerText = maxHDisplay;
    }

    const inputW = document.getElementById('inputW');
    if (inputW) {
        const backendMaxW = constraints.max_width || parseFloat(inputW.getAttribute('data-m-max')) || 91.44;
        inputW.setAttribute('data-m-max', backendMaxW);
        const maxWDisplay = isMetric ? backendMaxW.toFixed(2) : (backendMaxW * 3.28084).toFixed(1);
        inputW.max = maxWDisplay;
        const lblMaxW = document.getElementById('lblMaxW');
        if (lblMaxW) lblMaxW.innerText = maxWDisplay;
    }

    const inputL = document.getElementById('inputL');
    if (inputL) {
        const backendMaxL = constraints.max_length || parseFloat(inputL.getAttribute('data-m-max')) || 45.72;
        inputL.setAttribute('data-m-max', backendMaxL);
        const maxLDisplay = isMetric ? backendMaxL.toFixed(2) : (backendMaxL * 3.28084).toFixed(1);
        inputL.max = maxLDisplay;
        const lblMaxL = document.getElementById('lblMaxL');
        if (lblMaxL) lblMaxL.innerText = maxLDisplay;
    }

    const inputWS = document.getElementById('inputWSHeight');
    if (inputWS) {
        inputWS.setAttribute('data-m-max', '1.2192');
        inputWS.setAttribute('data-current-m', '0.9144');
        inputWS.value = isMetric ? '0.91' : '3.00';
        inputWS.max = isMetric ? '1.22' : '4.00';
        const valWS = document.getElementById('valWS');
        if (valWS) valWS.value = inputWS.value;
    }

    bindSliderAndInput('inputW', 'valW', renderCallback);
    bindSliderAndInput('inputL', 'valL', renderCallback);
    bindSliderAndInput('inputH', 'valH', renderCallback);
    bindSliderAndInput('inputWSHeight', 'valWS', renderCallback);

    bindSliderAndInput('overL', 'overL_val', renderCallback);
    bindSliderAndInput('overR', 'overR_val', renderCallback);
    bindSliderAndInput('overF', 'overF_val', renderCallback);
    bindSliderAndInput('overB', 'overB_val', renderCallback);

    const pitchSlider = document.getElementById('inputPitch');
    const valPitchInput = document.getElementById('valPitch');
    const lblMaxPitch = document.getElementById('lblMaxPitch');
    const roofTypeSelect = document.getElementById('roofType');
    const roofProfileSelect = document.getElementById('roofProfile');

    const formatPitchToRatio = (val) => {
        const numVal = parseFloat(val) || 0.05;
        const pitchInTwelve = numVal * 12;
        const formatted = parseFloat(pitchInTwelve.toFixed(1)).toString();
        return `${formatted}:12`;
    };

    const updatePitchLimits = () => {
        if (!pitchSlider) return;

        const roofType = roofTypeSelect ? roofTypeSelect.value : 'gabled';
        const roofProfile = roofProfileSelect ? roofProfileSelect.value.toLowerCase() : 'awr';

        let maxPitch = constraints.pitch_awr || 0.25;

        if (roofProfile.includes('ssr') || roofProfile.includes('snap')) {
            maxPitch = constraints.pitch_ssr24 || 0.1667;
        }

        if (roofType === 'left-sloped' || roofType === 'right-sloped') {
            maxPitch = Math.min(maxPitch, 0.1667);
        }

        pitchSlider.max = maxPitch.toString();

        if (lblMaxPitch) {
            lblMaxPitch.innerText = formatPitchToRatio(maxPitch);
        }

        if (parseFloat(pitchSlider.value) > maxPitch) {
            pitchSlider.value = maxPitch.toString();
        }

        if (valPitchInput) {
            valPitchInput.value = formatPitchToRatio(pitchSlider.value);
        }

        if (typeof renderCallback === 'function') renderCallback();
    };

    if (pitchSlider) {
        pitchSlider.addEventListener('input', (e) => {
            stopCameraAutoRotation();
            if (valPitchInput) {
                valPitchInput.value = formatPitchToRatio(e.target.value);
            }
            if (typeof renderCallback === 'function') renderCallback();
        });
    }

    if (valPitchInput) {
        valPitchInput.addEventListener('change', (e) => {
            stopCameraAutoRotation();
            let rawStr = e.target.value.replace(':12', '').trim();
            let parsedVal = parseFloat(rawStr);
            if (!isNaN(parsedVal)) {
                let decimalPitch = parsedVal / 12;
                const maxAllowed = parseFloat(pitchSlider.max) || 0.25;
                decimalPitch = Math.max(0.01, Math.min(maxAllowed, decimalPitch));

                pitchSlider.value = decimalPitch.toString();
                valPitchInput.value = formatPitchToRatio(decimalPitch);

                if (typeof renderCallback === 'function') renderCallback();
            }
        });
    }

    if (roofTypeSelect) {
        roofTypeSelect.addEventListener('change', () => {
            stopCameraAutoRotation();
            updatePitchLimits();
        });
    }

    if (roofProfileSelect) {
        roofProfileSelect.addEventListener('change', () => {
            stopCameraAutoRotation();
            updatePitchLimits();
        });
    }

    updatePitchLimits();

    const wainscotEn = document.getElementById('wainscotEn');
    if (wainscotEn) {
        wainscotEn.addEventListener('change', () => {
            stopCameraAutoRotation();
            const wsSettingsBlock = document.getElementById('wsSettingsBlock');
            if (wsSettingsBlock) wsSettingsBlock.style.display = wainscotEn.checked ? 'block' : 'none';
            if (typeof renderCallback === 'function') renderCallback();
        });
    }

    const intWallsEn = document.getElementById('intWallsEn');
    if (intWallsEn) {
        intWallsEn.addEventListener('change', (e) => {
            stopCameraAutoRotation();
            const settings = document.getElementById('intWallsSettings');
            if (settings) settings.style.display = e.target.checked ? 'block' : 'none';
            if (typeof renderCallback === 'function') renderCallback();
        });
    }
    bindSimpleSliderAndInput('intWallsH', 'valIntWallsH', renderCallback);

    const mezzEn = document.getElementById('mezzEn');
    if (mezzEn) {
        mezzEn.addEventListener('change', (e) => {
            stopCameraAutoRotation();
            const settings = document.getElementById('mezzSettings');
            if (settings) settings.style.display = e.target.checked ? 'block' : 'none';
            if (typeof renderCallback === 'function') renderCallback();
        });
    }
    document.getElementById('mezzCov')?.addEventListener('change', () => { if (typeof renderCallback === 'function') renderCallback(); });
    bindSimpleSliderAndInput('mezzZ', 'valMezzZ', renderCallback);
    bindSimpleSliderAndInput('mezzH', 'valMezzH', renderCallback);

    const craneEn = document.getElementById('craneEn');
    if (craneEn) {
        craneEn.addEventListener('change', (e) => {
            stopCameraAutoRotation();
            const settings = document.getElementById('craneSettings');
            if (settings) settings.style.display = e.target.checked ? 'block' : 'none';
            if (typeof renderCallback === 'function') renderCallback();
        });
    }
    bindSimpleSliderAndInput('craneZ', 'valCraneZ', renderCallback);

    ['L', 'R', 'F', 'B'].forEach(side => {
        const toggle = document.getElementById(`ltEn${side}`);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                stopCameraAutoRotation();
                ltState[side].active = e.target.checked;
                const setBlk = document.getElementById(`ltSettings${side}`);
                if (setBlk) setBlk.style.display = e.target.checked ? 'block' : 'none';
                if (typeof renderCallback === 'function') renderCallback();
            });
        }

        bindSliderAndInput(`ltDrop${side}`, `ltDrop${side}_val`, () => {
            ltState[side].drop = parseFloat(document.getElementById(`ltDrop${side}`)?.getAttribute('data-current-m')) || 0;
            if (typeof renderCallback === 'function') renderCallback();
        });

        bindSliderAndInput(`ltDepth${side}`, `ltDepth${side}_val`, () => {
            ltState[side].depth = parseFloat(document.getElementById(`ltDepth${side}`)?.getAttribute('data-current-m')) || 3;
            if (typeof renderCallback === 'function') renderCallback();
        });

        bindSimpleSliderAndInput(`ltPitch${side}`, `ltPitch${side}_val`, () => {
            ltState[side].pitch = parseFloat(document.getElementById(`ltPitch${side}`)?.value) || 1;
            if (typeof renderCallback === 'function') renderCallback();
        });

        const cutLId = (side === 'L') ? 'ltCutLL' : (side === 'R') ? 'ltCutLR' : (side === 'F') ? 'ltCutLF' : 'ltCutLB';
        bindSliderAndInput(cutLId, `${cutLId}_val`, () => {
            ltState[side].cutL = parseFloat(document.getElementById(cutLId)?.getAttribute('data-current-m')) || 0;
            if (typeof renderCallback === 'function') renderCallback();
        });

        const cutRId = (side === 'L') ? 'ltCutRL' : (side === 'R') ? 'ltCutRR' : (side === 'F') ? 'ltCutRF' : 'ltCutRB';
        bindSliderAndInput(cutRId, `${cutRId}_val`, () => {
            ltState[side].cutR = parseFloat(document.getElementById(cutRId)?.getAttribute('data-current-m')) || 0;
            if (typeof renderCallback === 'function') renderCallback();
        });

        const wallL = document.getElementById(`ltWallL${side}`);
        if (wallL) wallL.addEventListener('change', e => { ltState[side].wallL = e.target.checked; if (typeof renderCallback === 'function') renderCallback(); });

        const wallR = document.getElementById(`ltWallR${side}`);
        if (wallR) wallR.addEventListener('change', e => { ltState[side].wallR = e.target.checked; if (typeof renderCallback === 'function') renderCallback(); });

        const wallF = document.getElementById(`ltWallF${side}`);
        if (wallF) wallF.addEventListener('change', e => { ltState[side].wallF = e.target.checked; if (typeof renderCallback === 'function') renderCallback(); });
    });

    updateAwningDepthMaxLimits();
    checkAspectRatioViolations();

    ['wF', 'wB', 'wL', 'wR', 'checkRoof', 'checkLabels'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            stopCameraAutoRotation();
            if (typeof renderCallback === 'function') renderCallback();
        });
    });

    ['checkTrims', 'checkGirts', 'checkPurlins', 'checkEWColumns', 'checkGutters', 'drivewayEn'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            stopCameraAutoRotation();
            if (typeof renderCallback === 'function') renderCallback();
        });
    });

    initExternalModelsUI(renderCallback, scene, renderer, cameraObj, activeControls);

    initInsideView(cameraObj, activeControls);
    initCompareFeature();
    initResetFeature(renderCallback, cameraObj, activeControls);
    initShareFeature();

    document.getElementById('btnAddOpening')?.addEventListener('click', () => {
        stopCameraAutoRotation();
        const wallSel = document.getElementById('addOpeningWall');
        const typeSel = document.getElementById('addOpeningType');

        if (!wallSel || !typeSel) return;

        const s = wallSel.value;
        const t = typeSel.value;
        if (!s || !t) return;

        const def = openingDefs[t] || { w: 1.0, h: 1.0, yOff: 0 };
        const opW = def.w;
        const opH = def.h;
        const yOff = (t === 'Window') ? (def.yOff !== undefined ? def.yOff : 1.0) : 0;

        const isFB = (s === 'F' || s === 'B');
        const dimEl = document.getElementById(isFB ? 'inputW' : 'inputL');
        const wallLength = dimEl ? parseFloat(dimEl.getAttribute('data-current-m')) || 20 : 20;

        let spawnX = 0;
        const existingOps = openingsData[s] || [];

        let collision = true;
        let attempts = 0;

        while (collision && attempts < 20) {
            collision = false;
            for (let other of existingOps) {
                const otherDef = openingDefs[other.type] || { w: 1, h: 1 };
                const otherW = other.w || otherDef.w;
                const otherH = other.h || otherDef.h;
                const otherY = (other.type === 'Window') ? (other.yOff !== undefined ? other.yOff : 1.0) : 0;

                const hasOverlapX = Math.abs(spawnX - other.x) < (opW / 2 + otherW / 2 + 0.2);
                const hasOverlapY = Math.abs(yOff - otherY) < (opH / 2 + otherH / 2 + 0.2);

                if (hasOverlapX && hasOverlapY) {
                    spawnX = other.x + otherW / 2 + opW / 2 + 0.3;
                    collision = true;
                    break;
                }
            }
            attempts++;
        }

        const maxBound = wallLength / 2 - opW / 2;
        if (spawnX > maxBound) spawnX = -maxBound;

        openingsData[s].push({
            id: incrementOpeningId(),
            type: t,
            x: spawnX,
            w: opW,
            h: opH,
            yOff: yOff
        });

        populateOpeningsUI(renderCallback);
        if (typeof renderCallback === 'function') renderCallback();
    });

    initHelpPopover();

    document.getElementById('btnSaveDesign')?.addEventListener('click', () => { saveDesign(renderer, scene, cameraObj); });
    document.getElementById('btnGallery')?.addEventListener('click', () => { loadGallery(renderCallback); });

    populateOpeningsUI(renderCallback);
}

export function populateOpeningsUI(renderCallback) {
    const wallSel = document.getElementById('addOpeningWall');
    if (wallSel) {
        wallSel.innerHTML = '';
        const sideNames = { F: 'Front Wall', B: 'Back Wall', L: 'Left Wall', R: 'Right Wall' };
        ['F', 'B', 'L', 'R'].forEach(s => {
            const o = document.createElement('option');
            o.value = s;
            o.text = sideNames[s];
            wallSel.appendChild(o);
        });
    }

    const typeSel = document.getElementById('addOpeningType');
    if (typeSel && typeSel.options.length === 0) {
        for (const k in openingDefs) {
            const o = document.createElement('option');
            o.value = k;
            o.text = k;
            typeSel.appendChild(o);
        }
    }

    const list = document.getElementById('openingsList');
    if (list) {
        list.innerHTML = '';
        const sideFullNames = { F: 'Front', B: 'Back', L: 'Left', R: 'Right' };

        ['F', 'B', 'L', 'R'].forEach(s => {
            if (!openingsData[s]) return;
            openingsData[s].forEach(op => {
                const div = document.createElement('div');
                div.className = 'row mb-2';

                const currentWDisp = isMetric ? op.w : op.w * 3.28084;
                const currentHDisp = isMetric ? op.h : op.h * 3.28084;
                const labelUnit = isMetric ? 'm' : 'ft';

                div.innerHTML = `
                    <div class="col-12 d-flex justify-content-between align-items-center mb-1">
                        <span class="small"><b>${sideFullNames[s]}</b>: ${op.type}</span>
                        <span class="btn-delete py-1 px-2 rounded-1 d-inline-block border-dark" role="button" style="border:1px solid; font-size: 12px;" data-id="${op.id}" data-side="${s}">Delete</span>
                    </div>
                    <div class="col-6">
                        <div class="input-group mb-2">
                            <span class="input-group-text px-1">W</span>
                            <input type="number" class="form-control op-dim-input op-width-input text-end" data-id="${op.id}" data-side="${s}" value="${currentWDisp.toFixed(1)}" step="0.5" min="0.5" max="40">
                            <span class="input-group-text px-1">${labelUnit}</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="input-group mb-2">
                            <span class="input-group-text px-1">H</span>
                            <input type="number" class="form-control op-dim-input op-height-input text-end" data-id="${op.id}" data-side="${s}" value="${currentHDisp.toFixed(1)}" step="0.5" min="0.5" max="40">
                            <span class="input-group-text px-1">${labelUnit}</span>
                        </div>
                    </div>
                `;
                list.appendChild(div);
            });
        });

        document.querySelectorAll('.op-width-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.currentTarget.dataset.id;
                const s = e.currentTarget.dataset.side;
                const rawVal = parseFloat(e.currentTarget.value);
                if (isNaN(rawVal)) return;

                const targetOp = openingsData[s]?.find(o => String(o.id) === String(id));
                if (targetOp) {
                    targetOp.w = isMetric ? rawVal : rawVal * 0.3048;
                    if (typeof renderCallback === 'function') renderCallback();
                }
            });
        });

        document.querySelectorAll('.op-height-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.currentTarget.dataset.id;
                const s = e.currentTarget.dataset.side;
                const rawVal = parseFloat(e.currentTarget.value);
                if (isNaN(rawVal)) return;

                const targetOp = openingsData[s]?.find(o => String(o.id) === String(id));
                if (targetOp) {
                    targetOp.h = isMetric ? rawVal : rawVal * 0.3048;
                    if (typeof renderCallback === 'function') renderCallback();
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                stopCameraAutoRotation();
                const id = e.currentTarget.dataset.id;
                const s = e.currentTarget.dataset.side;
                openingsData[s] = openingsData[s].filter(o => String(o.id) !== String(id));
                populateOpeningsUI(renderCallback);
                if (typeof renderCallback === 'function') renderCallback();
            });
        });
    }
}

export function saveDesign(renderer, scene, camera) {
    const name = prompt("Enter design name:", "My Design");
    if (!name) return;

    if (renderer && scene && camera) renderer.render(scene, camera);
    const thumbnail = renderer ? renderer.domElement.toDataURL('image/jpeg', 0.85) : '';

    const u = isMetric ? 'm' : 'ft';
    const mult = isMetric ? 1 : 3.28084;

    const wM = parseFloat(document.getElementById('inputW')?.getAttribute('data-current-m') || '0');
    const lM = parseFloat(document.getElementById('inputL')?.getAttribute('data-current-m') || '0');
    const hM = parseFloat(document.getElementById('inputH')?.getAttribute('data-current-m') || '0');

    const pitchVal = document.getElementById('inputPitch')?.value || '0.05';
    const pitchRatio = (parseFloat(pitchVal) * 12).toFixed(1).replace('.0', '') + ':12';

    const roofTypeSel = document.getElementById('roofType');
    const roofProfSel = document.getElementById('roofProfile');
    const wallProfSel = document.getElementById('wallProfile');

    const getColorVal = (id) => document.getElementById(id)?.value || 'N/A';

    const sideFullNames = { F: 'Front Wall', B: 'Back Wall', L: 'Left Wall', R: 'Right Wall' };
    const openingsSummary = {};

    ['F', 'B', 'L', 'R'].forEach(s => {
        const ops = openingsData[s] || [];
        if (ops.length > 0) {
            openingsSummary[sideFullNames[s]] = ops.map(op => {
                const wDisp = (op.w * mult).toFixed(1);
                const hDisp = (op.h * mult).toFixed(1);
                return `${op.type} (${wDisp}x${hDisp} ${u})`;
            });
        }
    });

    const wsEnabled = document.getElementById('wainscotEn')?.checked || false;
    const wsHeight = wsEnabled ? parseFloat(document.getElementById('inputWSHeight')?.value || '0').toFixed(1) : 0;

    const rawState = collectCurrentState();
    const aspectCheck = checkAspectRatioViolations();

    const design = {
        id: Date.now(),
        name: name,
        thumbnail: thumbnail,
        created: new Date().toLocaleDateString(),
        stateData: rawState,
        details: {
            dimensions: {
                w: (wM * mult).toFixed(1) + ' ' + u,
                l: (lM * mult).toFixed(1) + ' ' + u,
                h: (hM * mult).toFixed(1) + ' ' + u,
                pitch: pitchRatio,
                roofType: roofTypeSel ? roofTypeSel.options[roofTypeSel.selectedIndex]?.text : 'Gabled'
            },
            profiles: {
                roof: roofProfSel ? roofProfSel.value.toUpperCase() : 'AWR',
                wall: wallProfSel ? wallProfSel.value.toUpperCase() : 'AWR'
            },
            colors: {
                roof: getColorVal('colorRoof'),
                wall: getColorVal('colorWall'),
                trim: getColorVal('colorTrim'),
                wainscot: wsEnabled ? getColorVal('colorWainscot') : 'None'
            },
            wainscot: wsEnabled ? `${wsHeight} ${u}` : 'None',
            openings: openingsSummary,
            aspectRatioNotice: aspectCheck.hasViolation ? aspectCheck.messages.join(' | ') : 'Normal',
            features: {
                intWalls: document.getElementById('intWallsEn')?.checked ? 'Yes' : 'No',
                mezzanine: document.getElementById('mezzEn')?.checked ? 'Yes' : 'No',
                crane: document.getElementById('craneEn')?.checked ? 'Yes' : 'No'
            }
        }
    };

    const designs = JSON.parse(localStorage.getItem('configurator_designs') || '[]');
    designs.push(design);
    localStorage.setItem('configurator_designs', JSON.stringify(designs));
    alert("Design saved successfully!");
}

export function loadGallery(onLoadState) {
    let overlay = document.getElementById('gallery-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gallery-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.95); z-index:999998; display:none; overflow-y:auto; padding:30px; box-sizing:border-box;';
        overlay.innerHTML = `
            <div class="d-flex justify-content-between align-items-center pb-3 mb-4 border-bottom border-secondary text-white">
                <h3 class="m-0"><i class="bi bi-images me-2"></i> Saved Designs Gallery</h3>
                <button id="btnCloseGallery" class="btn btn-outline-light btn-sm"><i class="bi bi-x-lg"></i> Close</button>
            </div>
            <div id="galleryGrid" class="row g-4"></div>
        `;
        document.body.appendChild(overlay);
    }

    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const designs = JSON.parse(localStorage.getItem('configurator_designs') || '[]');

    if (designs.length === 0) {
        grid.innerHTML = '<p class="text-white text-center w-100 py-5">No saved designs found.</p>';
    }

    designs.forEach(d => {
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 col-lg-4';

        let detailsHtml = '';
        if (d.details) {
            const dt = d.details;

            let openingsHtml = '';
            if (dt.openings && Object.keys(dt.openings).length > 0) {
                openingsHtml = '<div class="mt-2"><b>Openings & Doors:</b><ul class="ps-3 m-0 small text-white-50">';
                for (const [wall, list] of Object.entries(dt.openings)) {
                    openingsHtml += `<li><b>${wall}:</b> ${list.join(', ')}</li>`;
                }
                openingsHtml += '</ul></div>';
            } else {
                openingsHtml = '<div class="mt-1 small text-white-50"><b>Openings:</b> None</div>';
            }

            const colorBadge = (hex) => hex && hex !== 'None' ? `<span class="d-inline-block rounded-circle ms-1" style="width:12px; height:12px; background-color:${hex}; vertical-align:middle; border:1px solid #fff;"></span>` : ' None';

            detailsHtml = `
                <div class="card-body p-3 text-start small border-top border-secondary text-white-50" style="line-height:1.5; font-size:12px;">
                    <div class="row mb-1">
                        <div class="col-6"><b>Dimensions:</b> ${dt.dimensions.w} x ${dt.dimensions.l} x ${dt.dimensions.h}</div>
                        <div class="col-6"><b>Pitch:</b> ${dt.dimensions.pitch} (${dt.dimensions.roofType})</div>
                    </div>
                    ${dt.aspectRatioNotice && dt.aspectRatioNotice !== 'Normal' ? `<div class="text-warning mb-1"><b>Ratio Note:</b> ${dt.aspectRatioNotice}</div>` : ''}
                    <div class="row mb-1">
                        <div class="col-6"><b>Roof Panel:</b> ${dt.profiles.roof}</div>
                        <div class="col-6"><b>Wall Panel:</b> ${dt.profiles.wall}</div>
                    </div>
                    <div class="row mb-1">
                        <div class="col-12">
                            <b>Colors:</b> 
                            Roof${colorBadge(dt.colors.roof)}, 
                            Wall${colorBadge(dt.colors.wall)}, 
                            Trim${colorBadge(dt.colors.trim)}
                            ${dt.colors.wainscot !== 'None' ? ', Wainscot' + colorBadge(dt.colors.wainscot) : ''}
                        </div>
                    </div>
                    <div class="row mb-1">
                        <div class="col-6"><b>Wainscot:</b> ${dt.wainscot}</div>
                        <div class="col-6"><b>Mezzanine:</b> ${dt.features.mezzanine}</div>
                    </div>
                    ${openingsHtml}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card bg-dark text-white border-secondary h-100">
                <img src="${d.thumbnail}" class="card-img-top rounded-top" style="max-height:220px; object-fit:cover;">
                <div class="card-header bg-transparent border-bottom border-secondary d-flex justify-content-between align-items-center">
                    <h6 class="card-title m-0 text-truncate" title="${d.name}">${d.name}</h6>
                    <small class="text-white-50 ms-2" style="font-size:10px;">${d.created}</small>
                </div>
                ${detailsHtml}
                <div class="card-footer bg-transparent border-top border-secondary p-2 d-flex gap-2">
                    <button class="btn btn-sm btn-primary load-btn" data-id="${d.id}"><i class="bi bi-download me-1"></i> Load Design</button>
                    <button class="btn btn-sm btn-danger del-btn" data-id="${d.id}"><i class="bi bi-trash"></i> Delete</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    overlay.style.display = 'block';

    grid.querySelectorAll('.load-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const selectedDesign = designs.find(d => d.id === id);

            if (selectedDesign && selectedDesign.stateData) {
                const jsonStr = JSON.stringify(selectedDesign.stateData);
                const encodedState = btoa(unescape(encodeURIComponent(jsonStr)));

                const url = new URL(window.location.href);
                url.searchParams.set('config', encodedState);
                window.history.pushState({}, '', url);

                applyUrlConfig(onLoadState);

                overlay.style.display = 'none';
            } else {
                alert("This saved design does not contain structural parameters.");
            }
        });
    });

    grid.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            if (confirm("Delete this design permanently?")) {
                const updated = designs.filter(d => d.id !== id);
                localStorage.setItem('configurator_designs', JSON.stringify(updated));
                loadGallery(onLoadState);
            }
        });
    });

    const btnCloseGallery = document.getElementById('btnCloseGallery');
    if (btnCloseGallery) {
        btnCloseGallery.onclick = () => { overlay.style.display = 'none'; };
    }
}

export function initHelpPopover() {
    const btnHelp = document.getElementById('btnHelp');
    const popover = document.getElementById('custom-help-popover');
    const btnCloseHelp = document.getElementById('btnCloseHelp');

    if (!btnHelp || !popover) return;

    btnHelp.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = popover.classList.contains('custom-popover-hidden');
        if (isHidden) {
            const topOffset = btnHelp.offsetTop;
            const leftOffset = btnHelp.offsetLeft;
            const btnWidth = btnHelp.offsetWidth;
            const popoverWidth = 320;

            popover.style.position = 'absolute';
            popover.style.top = `${topOffset + btnHelp.offsetHeight + 10}px`;
            popover.style.left = `${leftOffset + (btnWidth / 2) - (popoverWidth / 2)}px`;

            popover.classList.remove('custom-popover-hidden');
        } else {
            popover.classList.add('custom-popover-hidden');
        }
    });

    btnCloseHelp?.addEventListener('click', () => { popover.classList.add('custom-popover-hidden'); });

    document.addEventListener('click', (e) => {
        if (!popover.contains(e.target) && e.target !== btnHelp) {
            popover.classList.add('custom-popover-hidden');
        }
    });
}