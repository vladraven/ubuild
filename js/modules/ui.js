//ui.js
import * as THREE from 'three';
import { isMetric, openingsData, setMetric, openingDefs, incrementOpeningId, ltState } from './state.js';
import { updateMaterialColors } from './materials.js';

import { saveDesign, loadGallery } from './gallery.js';
import { collectCurrentState } from './export.js';

function updateWainscotLimit() {
    const sliderH = document.getElementById('inputH');
    const sliderWS = document.getElementById('inputWSHeight');
    const inputWS = document.getElementById('valWS');
    if (!sliderH || !sliderWS) return;

    const currentH_M = parseFloat(sliderH.getAttribute('data-current-m')) || 10.0;
    sliderWS.setAttribute('data-m-max', currentH_M);

    const maxWsDisplay = isMetric ? currentH_M : (currentH_M * 3.28084);
    sliderWS.max = maxWsDisplay.toFixed(2);

    let currentWSVal = parseFloat(sliderWS.value);
    if (currentWSVal > maxWsDisplay) {
        sliderWS.value = maxWsDisplay.toFixed(2);
        if (inputWS) inputWS.value = maxWsDisplay.toFixed(2);
        sliderWS.setAttribute('data-current-m', currentH_M);
    }
}

function bindSliderAndInput(sliderId, inputId, renderCallback) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);

    if (!slider || !input) return;

    slider.addEventListener('input', (e) => {
        const rawVal = parseFloat(e.target.value);
        if (isNaN(rawVal)) return;
        
        input.value = rawVal.toFixed(2);
        const mVal = isMetric ? rawVal : rawVal * 0.3048;
        slider.setAttribute('data-current-m', mVal);
        
        if (sliderId === 'inputH') {
            updateWainscotLimit();
        }
        renderCallback();
    });

    input.addEventListener('change', (e) => {
        let rawVal = parseFloat(e.target.value);
        if (isNaN(rawVal)) return;

        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        if (rawVal < min) rawVal = min;
        if (rawVal > max) rawVal = max;
        
        input.value = rawVal.toFixed(2);
        slider.value = rawVal;

        const mVal = isMetric ? rawVal : rawVal * 0.3048;
        slider.setAttribute('data-current-m', mVal);
        
        if (sliderId === 'inputH') {
            updateWainscotLimit();
        }
        renderCallback();
    });
}

export function initUI(renderCallback) {
    const unitToggle = document.getElementById('unitToggle');
    if (unitToggle) {
        unitToggle.addEventListener('change', e => {
            setMetric(e.target.checked);
            document.getElementById('unitToggleLabel').innerText = isMetric ? "System: Metric (m)" : "System: Imperial (ft)";
            
            document.querySelectorAll('.unit-label').forEach(el => {
                el.innerText = isMetric ? 'm' : 'ft';
            });

            document.querySelectorAll('.dist-slider').forEach(slider => {
                const mMin = parseFloat(slider.getAttribute('data-m-min'));
                const mMax = slider.id === 'inputWSHeight' ? parseFloat(slider.getAttribute('data-m-max')) : parseFloat(slider.getAttribute('data-m-max'));
                const mStep = parseFloat(slider.getAttribute('data-m-step'));
                const currentM = parseFloat(slider.getAttribute('data-current-m'));

                if (!isNaN(currentM)) {
                    slider.min = isMetric ? mMin : (mMin * 3.28084).toFixed(2);
                    slider.max = isMetric ? mMax : (mMax * 3.28084).toFixed(2);
                    slider.step = isMetric ? mStep : (mStep * 3.28084).toFixed(2);
                    
                    const calculatedVal = isMetric ? currentM : (currentM * 3.28084);
                    slider.value = calculatedVal.toFixed(2);

                    const targetId = slider.getAttribute('data-target');
                    if (targetId) {
                        const targetInput = document.getElementById(targetId);
                        if (targetInput) {
                            targetInput.value = calculatedVal.toFixed(2);
                        }
                    }
                }
            });
            updateWainscotLimit();
            populateOpeningsUI(renderCallback);
            renderCallback();
        });
    }

    bindSliderAndInput('inputW', 'valW', renderCallback);
    bindSliderAndInput('inputL', 'valL', renderCallback);
    bindSliderAndInput('inputH', 'valH', renderCallback);
    bindSliderAndInput('inputWSHeight', 'valWS', renderCallback);

    bindSliderAndInput('overL', 'overL_val', renderCallback);
    bindSliderAndInput('overR', 'overR_val', renderCallback);
    bindSliderAndInput('overF', 'overF_val', renderCallback);
    bindSliderAndInput('overB', 'overB_val', renderCallback);

    ['L', 'R', 'F', 'B'].forEach(s => {
        const dropSlider = document.getElementById(`ltDrop${s}`);
        const dropInput = document.getElementById(`ltDrop${s}_val`);
        if (dropSlider && dropInput) {
            const syncDrop = () => {
                ltState[s].drop = parseFloat(dropSlider.getAttribute('data-current-m')) || 0;
                renderCallback();
            };
            dropSlider.addEventListener('input', syncDrop);
            dropInput.addEventListener('change', syncDrop);
        }
        bindSliderAndInput(`ltDrop${s}`, `ltDrop${s}_val`, () => {});

        const depthSlider = document.getElementById(`ltDepth${s}`);
        const depthInput = document.getElementById(`ltDepth${s}_val`);
        if (depthSlider && depthInput) {
            const syncDepth = () => {
                ltState[s].depth = parseFloat(depthSlider.getAttribute('data-current-m')) || 0;
                renderCallback();
            };
            depthSlider.addEventListener('input', syncDepth);
            depthInput.addEventListener('change', syncDepth);
        }
        bindSliderAndInput(`ltDepth${s}`, `ltDepth${s}_val`, () => {});

        const cutLSlider = document.getElementById(`ltCutL${s}`);
        const cutLInput = document.getElementById(`ltCutL${s}_val`);
        if (cutLSlider && cutLInput) {
            const syncCutL = () => {
                ltState[s].cutL = parseFloat(cutLSlider.getAttribute('data-current-m')) || 0;
                renderCallback();
            };
            cutLSlider.addEventListener('input', syncCutL);
            cutLInput.addEventListener('change', syncCutL);
        }
        bindSliderAndInput(`ltCutL${s}`, `ltCutL${s}_val`, () => {});

        const cutRSlider = document.getElementById(`ltCutR${s}`);
        const cutRInput = document.getElementById(`ltCutR${s}_val`);
        if (cutRSlider && cutRInput) {
            const syncCutR = () => {
                ltState[s].cutR = parseFloat(cutRSlider.getAttribute('data-current-m')) || 0;
                renderCallback();
            };
            cutRSlider.addEventListener('input', syncCutR);
            cutRInput.addEventListener('change', syncCutR);
        }
        bindSliderAndInput(`ltCutR${s}`, `ltCutR${s}_val`, () => {});

        const pitchSlider = document.getElementById(`ltPitch${s}`);
        const pitchInput = document.getElementById(`ltPitch${s}_val`);
        if (pitchSlider && pitchInput) {
            pitchSlider.addEventListener('input', e => {
                pitchInput.value = e.target.value;
                ltState[s].pitch = parseFloat(e.target.value);
                renderCallback();
            });
            pitchInput.addEventListener('change', e => {
                pitchSlider.value = e.target.value;
                ltState[s].pitch = parseFloat(e.target.value);
                renderCallback();
            });
        }
    });

    document.getElementById('roofType')?.addEventListener('change', renderCallback);
    document.getElementById('roofProfile')?.addEventListener('change', renderCallback);
    document.getElementById('wallProfile')?.addEventListener('change', renderCallback);

    const inputPitch = document.getElementById('inputPitch');
    const valPitch = document.getElementById('valPitch');
    if (inputPitch && valPitch) {
        inputPitch.addEventListener('input', e => {
            valPitch.value = e.target.value;
            renderCallback();
        });
        valPitch.addEventListener('change', e => {
            inputPitch.value = e.target.value;
            renderCallback();
        });
    }

    document.querySelectorAll('.color-select').forEach(select => {
        select.addEventListener('change', () => {
            updateMaterialColors();
            renderCallback();
        });
    });

    document.getElementById('btnAddOpening')?.addEventListener('click', () => {
        const s = document.getElementById('addOpeningWall').value;
        const t = document.getElementById('addOpeningType').value;
        if (!s || !t) return;
        
        const w1 = openingDefs[t].w;
        const h1 = openingDefs[t].h;

        openingsData[s].push({
            id: incrementOpeningId(),
            type: t,
            x: 0,
            w: w1,
            h: h1
        });
        populateOpeningsUI(renderCallback);
        renderCallback();
    });

    ['intWallsH', 'mezzH', 'craneZ', 'mezzZ'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', (e) => {
            const val = e.target.value;
            const target = e.target.getAttribute('data-target');
            if (target) {
                const targetEl = document.getElementById(target);
                if (targetEl) {
                    if (targetEl.tagName === 'INPUT') {
                        targetEl.value = val;
                    } else {
                        targetEl.innerText = val + '%';
                    }
                }
            }
            renderCallback();
        });
    });

    ['wainscotEn', 'intWallsEn', 'ceilEn', 'mezzEn', 'craneEn', 'drivewayEn'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const setBlk = document.getElementById(id === 'wainscotEn' ? 'wsSettingsBlock' : id.replace('En', 'Settings'));
            if (setBlk) setBlk.style.display = e.target.checked ? 'block' : 'none';
            renderCallback();
        });
    });

    ['wF', 'wB', 'wL', 'wR', 'checkRoof', 'checkLabels'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderCallback);
    });

    ['L', 'R', 'F', 'B'].forEach(s => {
        document.getElementById(`ltEn${s}`)?.addEventListener('change', e => {
            ltState[s].active = e.target.checked;
            const setBlk = document.getElementById(`ltSettings${s}`);
            if (setBlk) setBlk.style.display = e.target.checked ? 'block' : 'none';
            populateOpeningsUI(renderCallback);
            renderCallback();
        });
        
        document.getElementById(`ltWallL${s}`)?.addEventListener('change', e => { ltState[s].wallL = e.target.checked; renderCallback(); });
        document.getElementById(`ltWallR${s}`)?.addEventListener('change', e => { ltState[s].wallR = e.target.checked; renderCallback(); });
        document.getElementById(`ltWallF${s}`)?.addEventListener('change', e => { ltState[s].wallF = e.target.checked; renderCallback(); });
    });

    document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
        cb.addEventListener('change', renderCallback);
    });

    document.getElementById('btnSaveDesign')?.addEventListener('click', saveDesign);
    document.getElementById('btnGallery')?.addEventListener('click', () => loadGallery(renderCallback));
    
    document.getElementById('btnShare')?.addEventListener('click', () => {
        const state = collectCurrentState();
        const url = window.location.origin + window.location.pathname + '?config=' + btoa(JSON.stringify(state));
        navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!"));
    });

    document.getElementById('btnReset')?.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset the current design?")) {
            location.reload();
        }
    });

    updateWainscotLimit();
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
            openingsData[s].forEach(op => {
                const div = document.createElement('div');
                div.className = 'row mb-2';
                
                const currentWDisp = isMetric ? op.w : op.w * 3.28084;
                const currentHDisp = isMetric ? op.h : op.h * 3.28084;
                const labelUnit = isMetric ? 'm' : 'ft';

                div.innerHTML = `
                    <div class="col-12 d-flex justify-content-between align-items-center mb-1">
                        <span class="small"><b>${sideFullNames[s]}</b>: ${op.type}</span>
                        <span class="btn-delete btn-sm small py-1 px-2" style="line-height: 1.65;" data-id="${op.id}" data-side="${s}">Delete ${op.type} </span>
                    </div>
                    <div class="col-6">
                        <div class="input-group mb-2">
                            <span class="input-group-text px-1">W</span>
                            <input type="number" class="form-control op-dim-input op-width-input text-end" data-id="${op.id}" data-side="${s}" value="${currentWDisp.toFixed(1)}" step="0.5" min="2" max="40">
                            <span class="input-group-text px-1">${labelUnit}</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="input-group mb-2">
                            <span class="input-group-text px-1">H</span>
                            <input type="number" class="form-control op-dim-input op-height-input text-end" data-id="${op.id}" data-side="${s}" value="${currentHDisp.toFixed(1)}" step="0.5" min="2" max="40">
                            <span class="input-group-text px-1">${labelUnit}</span>
                        </div>
                    </div>
                `;
                list.appendChild(div);
            });
        });

        document.querySelectorAll('.op-dim-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const targetInput = e.currentTarget;
                const id = parseInt(targetInput.dataset.id);
                const s = targetInput.dataset.side;
                let val = parseFloat(targetInput.value);
                
                if (isNaN(val) || val < 2) val = 2;
                if (val > 40) val = 40;
                
                const internalVal = isMetric ? val : val * 0.3048;

                const opObj = openingsData[s].find(o => o.id === id);
                if (opObj) {
                    if (targetInput.classList.contains('op-width-input')) {
                        opObj.w = internalVal;
                    } else if (targetInput.classList.contains('op-height-input')) {
                        opObj.h = internalVal;
                    }
                    renderCallback();
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                const s = e.currentTarget.dataset.side;
                openingsData[s] = openingsData[s].filter(o => o.id !== id);
                populateOpeningsUI(renderCallback);
                renderCallback();
            });
        });
    }
}