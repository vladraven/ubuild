import * as THREE from 'three';
import { openingsData, collectCurrentState, isMetric, setOpeningIdCounter, ltState, getU } from './state.js';
import { clearAllReferenceModels } from './external-references-models.js';
import { populateOpeningsUI } from './ui.js';
import { renderer, scene, camera } from './scene.js';

console.log('[tools-actions.js] Module loaded successfully');

const savedOutsidePos = new THREE.Vector3();
const savedOutsideTarget = new THREE.Vector3();
let isSavedPositionStored = false;

/**
 * Настройка вызова модального окна Quote (Снимок сцены + заполнение Gravity Forms)
 */
export function setupQuoteModal() {
    const quoteModalEl = document.getElementById('quoteModal');
    if (!quoteModalEl) return;

    quoteModalEl.addEventListener('show.bs.modal', function () {
        // 1. Генерация снимка JPEG для превью в модалке
        const thumbImg = document.getElementById('summary-building-thumb');
        const fallbackIcon = document.getElementById('summary-building-fallback');

        if (renderer && scene && camera && thumbImg) {
            renderer.render(scene, camera);
            const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.85);
            thumbImg.src = dataURL;
            thumbImg.style.display = 'block';
            if (fallbackIcon) fallbackIcon.style.display = 'none';
        }

        // 2. Заполнение форм Gravity Forms
        const u = getU();
        const wDisplay = parseFloat(document.getElementById('inputW')?.value || '0').toFixed(2);
        const lDisplay = parseFloat(document.getElementById('inputL')?.value || '0').toFixed(2);
        const hDisplay = parseFloat(document.getElementById('inputH')?.value || '0').toFixed(2);
        const pitch = document.getElementById('inputPitch')?.value || '';

        const wM = parseFloat(document.getElementById('inputW')?.getAttribute('data-current-m') || '0');
        const lM = parseFloat(document.getElementById('inputL')?.getAttribute('data-current-m') || '0');
        const hM = parseFloat(document.getElementById('inputH')?.getAttribute('data-current-m') || '0');

        const wVal = isMetric ? wM.toFixed(2) : (wM * 3.28084).toFixed(2);
        const lVal = isMetric ? lM.toFixed(2) : (lM * 3.28084).toFixed(2);
        const hVal = isMetric ? hM.toFixed(2) : (hM * 3.28084).toFixed(2);

        const fieldW = document.getElementById('input_4_13');
        const fieldL = document.getElementById('input_4_14');
        const fieldH = document.getElementById('input_4_12');

        if (fieldW) fieldW.value = wVal + ' ' + u;
        if (fieldL) fieldL.value = lVal + ' ' + u;
        if (fieldH) fieldH.value = hVal + ' ' + u;

        const currentState = collectCurrentState();
        const encodedState = safeBase64Encode(currentState);
        const generatedUrl = `${window.location.origin}${window.location.pathname}?config=${encodedState}`;

        const fieldUrl = document.getElementById('input_4_10');
        if (fieldUrl) {
            fieldUrl.value = generatedUrl;
        }

        const roofSel = document.getElementById('roofType');
        const roofTypeText = roofSel && roofSel.selectedIndex >= 0 ? roofSel.options[roofSel.selectedIndex].text : 'Gable';

        const wsEnabled = document.getElementById('wainscotEn')?.checked || false;
        const wsHeightStr = wsEnabled ? parseFloat(document.getElementById('inputWSHeight')?.value || '0').toFixed(2) : "0";

        const getColorName = (id) => {
            const el = document.getElementById(id);
            return el && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : 'N/A';
        };

        let infoString = `--- MAIN PARAMETERS ---\n`;
        infoString += `Width (W): ${wDisplay}${u}\n`;
        infoString += `Length (L): ${lDisplay}${u}\n`;
        infoString += `Height (H): ${hDisplay}${u}\n`;
        infoString += `Roof Type: ${roofTypeText} (Pitch: ${pitch})\n`;
        infoString += `Wainscot Height: ${wsHeightStr}${u}\n\n`;

        infoString += `--- COLORS ---\n`;
        infoString += `Roof: ${getColorName('colorRoof')}\n`;
        infoString += `Walls: ${getColorName('colorWall')}\n`;
        infoString += `Trim: ${getColorName('colorTrim')}\n`;
        infoString += `Wainscot: ${wsEnabled ? getColorName('colorWainscot') : 'None'}\n\n`;

        infoString += `--- ADDITIONAL ELEMENTS ---\n`;
        infoString += `Interior Walls: ${document.getElementById('intWallsEn')?.checked ? 'Yes' : 'No'}\n`;
        infoString += `Ceiling Liner: ${document.getElementById('ceilEn')?.checked ? 'Yes' : 'No'}\n`;
        infoString += `Mezzanine: ${document.getElementById('mezzEn')?.checked ? 'Yes' : 'No'}\n`;
        infoString += `Crane: ${document.getElementById('craneEn')?.checked ? 'Yes' : 'No'}\n\n`;

        let ltText = `--- AWNINGS (LEAN-TOS) ---\n`;
        let hasLt = false;
        const sideNames = { F: 'Front', B: 'Back', L: 'Left', R: 'Right' };

        ['F', 'B', 'L', 'R'].forEach(side => {
            const s = ltState[side];
            if (s && s.active) {
                hasLt = true;
                ltText += `${sideNames[side]} Awning: Drop=${isMetric ? s.drop : (s.drop * 3.28084).toFixed(2)}${u}, Depth=${isMetric ? s.depth : (s.depth * 3.28084).toFixed(2)}${u}, Pitch=${s.pitch}, Cut L=${isMetric ? s.cutL : (s.cutL * 3.28084).toFixed(2)}${u}, Cut R=${isMetric ? s.cutR : (s.cutR * 3.28084).toFixed(2)}${u}\n`;
                ltText += `   Walls: Front=${s.wallF ? 'Yes' : 'No'}, Left=${s.wallL ? 'Yes' : 'No'}, Right=${s.wallR ? 'Yes' : 'No'}\n`;
            }
        });
        if (hasLt) infoString += ltText + '\n';

        if (typeof openingsData !== 'undefined') {
            let hasOpenings = false;
            let openingsText = `--- OPENINGS (Windows/Doors) ---\n`;
            ['F', 'B', 'L', 'R'].forEach(side => {
                if (openingsData[side] && openingsData[side].length > 0) {
                    hasOpenings = true;
                    openingsText += `${sideNames[side]} wall:\n`;
                    openingsData[side].forEach(op => {
                        openingsText += `  - ${op.type} (Offset: ${isMetric ? op.x.toFixed(2) : (op.x * 3.28084).toFixed(2)}${u})\n`;
                    });
                }
            });
            if (hasOpenings) infoString += openingsText + '\n';
        }

        const infoField = document.getElementById('input_4_9');
        if (infoField) {
            infoField.value = infoString;
        }
    });
}

/**
 * Переключатель Inside View (Вид изнутри / Снаружи)
 */
export function initInsideView(cameraObj, controlsObj) {
    const viewInsideToggle = document.getElementById('viewInsideToggle');
    if (!viewInsideToggle) return;

    viewInsideToggle.addEventListener('change', (e) => {
        if (!cameraObj || !controlsObj) return;

        if (controlsObj.autoRotate) {
            controlsObj.autoRotate = false;
        }

        if (e.target.checked) {
            savedOutsidePos.copy(cameraObj.position);
            savedOutsideTarget.copy(controlsObj.target);
            isSavedPositionStored = true;

            const inputH = document.getElementById('inputH');
            const hM = inputH ? (parseFloat(inputH.getAttribute('data-current-m')) || 4.88) : 4.88;

            controlsObj.target.set(0, hM * 0.4, 0);
            cameraObj.position.set(0, 1.7, 0.1);
        } else {
            if (isSavedPositionStored) {
                cameraObj.position.copy(savedOutsidePos);
                controlsObj.target.copy(savedOutsideTarget);
            } else {
                controlsObj.target.set(0, 0, 0);
                cameraObj.position.set(30, 20, 30);
            }
        }
        controlsObj.update();
    });
}

function safeBase64Encode(obj) {
    const jsonStr = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(jsonStr)));
}

export function safeBase64Decode(str) {
    const jsonStr = decodeURIComponent(escape(atob(str)));
    return JSON.parse(jsonStr);
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log('[CopyLink Success via execCommand]:', text);
            console.log("Link copied to clipboard!");
        } else {
            prompt("Copy your configuration link:", text);
        }
    } catch (err) {
        prompt("Copy your configuration link:", text);
    }

    document.body.removeChild(textArea);
}

export function initShareFeature() {
    window.addEventListener('click', (e) => {
        const btn = e.target.closest('#btnShare');
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();

        try {
            const state = collectCurrentState();
            const encodedState = safeBase64Encode(state);
            const shareUrl = `${window.location.origin}${window.location.pathname}?config=${encodedState}`;

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert("Link copied to clipboard!");
                }).catch(() => {
                    fallbackCopyTextToClipboard(shareUrl);
                });
            } else {
                fallbackCopyTextToClipboard(shareUrl);
            }
        } catch (err) {
            alert("Error generating share link.");
        }
    }, true);
}

initShareFeature();

export function applyUrlConfig(renderCallback) {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('config')) return;

    try {
        const rawConfig = urlParams.get('config');
        const config = safeBase64Decode(rawConfig);

        const applyInputVal = (id, val, isM) => {
            const el = document.getElementById(id);
            if (el && val !== undefined) {
                if (isM) {
                    el.setAttribute('data-current-m', val);
                    el.value = isMetric ? val : (val * 3.28084);
                } else {
                    el.value = val;
                }
                const targetId = el.getAttribute('data-target');
                if (targetId) {
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        targetEl.value = parseFloat(el.value).toFixed(2);
                    }
                }
            }
        };

        const applyCheckbox = (id, val, blockId) => {
            const el = document.getElementById(id);
            if (el && val !== undefined) {
                el.checked = val;
                if (blockId) {
                    const blk = document.getElementById(blockId);
                    if (blk) blk.style.display = val ? 'block' : 'none';
                }
            }
        };

        applyInputVal('inputW', config.w, true);
        applyInputVal('inputL', config.l, true);
        applyInputVal('inputH', config.h, true);

        if (config.pitch !== undefined && document.getElementById('inputPitch')) document.getElementById('inputPitch').value = config.pitch;
        if (config.roofType !== undefined && document.getElementById('roofType')) document.getElementById('roofType').value = config.roofType;
        if (config.roofColor !== undefined && document.getElementById('colorRoof')) document.getElementById('colorRoof').value = config.roofColor;
        if (config.wallColor !== undefined && document.getElementById('colorWall')) document.getElementById('colorWall').value = config.wallColor;
        if (config.trimColor !== undefined && document.getElementById('colorTrim')) document.getElementById('colorTrim').value = config.trimColor;
        if (config.wainscotColor !== undefined && document.getElementById('colorWainscot')) document.getElementById('colorWainscot').value = config.wainscotColor;

        applyCheckbox('wainscotEn', config.wainscotEn, 'wsSettingsBlock');
        applyInputVal('inputWSHeight', config.wsHeight, true);

        applyCheckbox('intWallsEn', config.intWallsEn, 'intWallsSettings');
        if (config.intWallsH !== undefined) applyInputVal('intWallsH', config.intWallsH, false);

        applyCheckbox('ceilEn', config.ceilEn, 'ceilSettings');
        applyCheckbox('mezzEn', config.mezzEn, 'mezzSettings');
        applyCheckbox('craneEn', config.craneEn, 'craneSettings');

        applyInputVal('overL', config.overL, true);
        applyInputVal('overR', config.overR, true);
        applyInputVal('overF', config.overF, true);
        applyInputVal('overB', config.overB, true);

        applyCheckbox('wF', config.wF, null);
        applyCheckbox('wB', config.wB, null);
        applyCheckbox('wL', config.wL, null);
        applyCheckbox('wR', config.wR, null);
        applyCheckbox('drivewayEn', config.drivewayEn, null);

        if (config.openingsData) {
            Object.assign(openingsData, config.openingsData);
            let maxId = -1;
            ['F', 'B', 'L', 'R'].forEach(s => {
                (openingsData[s] || []).forEach(op => {
                    const numericId = parseInt(String(op.id).replace(/\D/g, ''));
                    if (!isNaN(numericId) && numericId > maxId) maxId = numericId;
                });
            });
            setOpeningIdCounter(maxId + 1);
        }

        if (typeof renderCallback === 'function') {
            populateOpeningsUI(renderCallback);
            renderCallback();
        }
    } catch (e) {
        console.error("Failed to parse config from URL:", e);
    }
}

export function initCompareFeature() {
    const btnCompare = document.getElementById('btnCompare');
    if (!btnCompare) return;

    btnCompare.addEventListener('click', () => {
        let overlay = document.getElementById('compare-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'compare-overlay';
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.95); z-index:999999; display:none; overflow-y:auto; padding:30px; box-sizing:border-box;';
            
            overlay.innerHTML = `
                <div class="d-flex justify-content-between align-items-center pb-3 mb-4 border-bottom border-secondary text-white">
                    <h3 class="m-0"><i class="bi bi-columns-gap me-2"></i> Compare Saved Designs</h3>
                    <button id="btnCloseCompare" class="btn btn-outline-light btn-sm"><i class="bi bi-x-lg"></i> Close</button>
                </div>
                <div id="compareGrid" class="row g-4"></div>
            `;
            document.body.appendChild(overlay);
        }

        const grid = document.getElementById('compareGrid');
        const btnClose = document.getElementById('btnCloseCompare');

        if (grid) grid.innerHTML = '';

        const designs = JSON.parse(localStorage.getItem('configurator_designs') || '[]');

        if (designs.length === 0) {
            alert("No saved designs to compare. Please save some designs first!");
            return;
        }

        designs.forEach(d => {
            const col = document.createElement('div');
            col.className = 'col-12 col-md-6 col-lg-4';

            let metaHtml = '';
            if (d.state) {
                metaHtml = `
                    <ul class="list-unstyled small text-start mt-2 text-white-50" style="line-height:1.6;">
                        <li><b>Width:</b> ${(d.state.w * 3.28084).toFixed(1)} ft (${d.state.w.toFixed(1)} m)</li>
                        <li><b>Length:</b> ${(d.state.l * 3.28084).toFixed(1)} ft (${d.state.l.toFixed(1)} m)</li>
                        <li><b>Height:</b> ${(d.state.h * 3.28084).toFixed(1)} ft (${d.state.h.toFixed(1)} m)</li>
                        <li><b>Roof Type:</b> ${d.state.roofType || 'gabled'}</li>
                        <li><b>Wainscot:</b> ${d.state.wainscotEn ? 'Enabled' : 'Disabled'}</li>
                        <li><b>Mezzanine:</b> ${d.state.mezzEn ? 'Yes' : 'No'}</li>
                        <li><b>Crane:</b> ${d.state.craneEn ? 'Yes' : 'No'}</li>
                    </ul>
                `;
            }

            col.innerHTML = `
                <div class="card bg-dark text-white border-secondary p-3">
                    <h5 class="card-title text-center pb-2 border-bottom border-secondary">${d.name}</h5>
                    <img src="${d.thumbnail}" class="card-img-top rounded my-2" style="max-height:200px; object-fit:cover;">
                    ${metaHtml}
                </div>
            `;
            grid.appendChild(col);
        });

        overlay.style.display = 'block';

        if (btnClose) {
            btnClose.onclick = () => { overlay.style.display = 'none'; };
        }
    });
}

export function initResetFeature(renderCallback, cameraObj, controlsObj) {
    const btnReset = document.getElementById('btnReset');
    if (!btnReset) return;

    btnReset.addEventListener('click', () => {
        if (!confirm("Are you sure you want to reset the current design?")) return;

        if (controlsObj && controlsObj.autoRotate) {
            controlsObj.autoRotate = false;
        }

        ['F', 'B', 'L', 'R'].forEach(s => {
            if (openingsData[s]) openingsData[s].length = 0;
        });

        const inputW = document.getElementById('inputW');
        const inputL = document.getElementById('inputL');
        const inputH = document.getElementById('inputH');
        const valW = document.getElementById('valW');
        const valL = document.getElementById('valL');
        const valH = document.getElementById('valH');

        if (inputW) { inputW.value = 60; inputW.setAttribute('data-current-m', '18.288'); }
        if (inputL) { inputL.value = 100; inputL.setAttribute('data-current-m', '30.48'); }
        if (inputH) { inputH.value = 16; inputH.setAttribute('data-current-m', '4.8768'); }

        if (valW) valW.value = 60;
        if (valL) valL.value = 100;
        if (valH) valH.value = 16;

        const roofTypeSelect = document.getElementById('roofType');
        if (roofTypeSelect) roofTypeSelect.value = 'gabled';

        const wainscotEn = document.getElementById('wainscotEn');
        if (wainscotEn) {
            wainscotEn.checked = true;
            const wsSettingsBlock = document.getElementById('wsSettingsBlock');
            if (wsSettingsBlock) wsSettingsBlock.style.display = 'block';
        }

        ['overL', 'overR', 'overF', 'overB'].forEach(id => {
            const slider = document.getElementById(id);
            const valInput = document.getElementById(`${id}_val`);
            if (slider) { slider.value = 0; slider.setAttribute('data-current-m', '0'); }
            if (valInput) valInput.value = 0;
        });

        const intWallsEn = document.getElementById('intWallsEn');
        const mezzEn = document.getElementById('mezzEn');
        const craneEn = document.getElementById('craneEn');

        if (intWallsEn) { intWallsEn.checked = false; const el = document.getElementById('intWallsSettings'); if (el) el.style.display = 'none'; }
        if (mezzEn) { mezzEn.checked = false; const el = document.getElementById('mezzSettings'); if (el) el.style.display = 'none'; }
        if (craneEn) { craneEn.checked = false; const el = document.getElementById('craneSettings'); if (el) el.style.display = 'none'; }

        ['wF', 'wB', 'wL', 'wR', 'checkRoof', 'checkLabels', 'checkTrims', 'checkGirts', 'checkPurlins', 'checkEWColumns'].forEach(id => {
            const cb = document.getElementById(id);
            if (cb) cb.checked = true;
        });

        ['checkGutters', 'drivewayEn'].forEach(id => {
            const cb = document.getElementById(id);
            if (cb) cb.checked = false;
        });

        document.querySelectorAll('.ref-model-checkbox').forEach(cb => cb.checked = false);
        clearAllReferenceModels();

        const viewInsideToggle = document.getElementById('viewInsideToggle');
        if (viewInsideToggle) viewInsideToggle.checked = false;

        if (cameraObj && controlsObj) {
            controlsObj.target.set(0, 0, 0);
            cameraObj.position.set(30, 20, 30);
            controlsObj.update();
        }

        populateOpeningsUI(renderCallback);
        if (typeof renderCallback === 'function') {
            renderCallback();
        }
    });
}