import { isMetric, getU, openingsData, ltState, setOpeningIdCounter } from './state.js';
import { updateMaterialColors } from './materials.js';
import { populateOpeningsUI } from './ui.js';

export function applyUrlConfig(renderCallback) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('config')) {
        try {
            const config = JSON.parse(atob(urlParams.get('config')));

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
                            targetEl.innerText = parseFloat(el.value).toFixed(1) + (isM ? getU() : (id.includes('Z') || id.includes('H') ? '%' : ''));
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

            if (config.pitch !== undefined) document.getElementById('inputPitch').value = config.pitch;
            if (config.roofType !== undefined) document.getElementById('roofType').value = config.roofType;
            if (config.roofColor !== undefined) document.getElementById('colorRoof').value = config.roofColor;
            if (config.wallColor !== undefined) document.getElementById('colorWall').value = config.wallColor;
            if (config.trimColor !== undefined) document.getElementById('colorTrim').value = config.trimColor;
            
            // ВОССТАНОВЛЕНИЕ: Загрузка цвета карниза (Eave Trim) из URL-конфига
            if (config.eaveTrimColor !== undefined && document.getElementById('colorEaveTrim')) {
                document.getElementById('colorEaveTrim').value = config.eaveTrimColor;
            }
            if (config.wainscotColor !== undefined && document.getElementById('colorWainscot')) document.getElementById('colorWainscot').value = config.wainscotColor;
            if (config.ceilingColor !== undefined && document.getElementById('colorCeiling')) document.getElementById('colorCeiling').value = config.ceilingColor;
            if (config.mezzanineColor !== undefined && document.getElementById('colorMezzanine')) document.getElementById('colorMezzanine').value = config.mezzanineColor;

            applyCheckbox('wainscotEn', config.wainscotEn, 'wsSettingsBlock');
            applyInputVal('inputWSHeight', config.wsHeight, true);

            applyCheckbox('intWallsEn', config.intWallsEn, 'intWallsSettings');
            if (config.intWallsH !== undefined) applyInputVal('intWallsH', config.intWallsH, false);

            applyCheckbox('ceilEn', config.ceilEn, 'ceilSettings');

            applyCheckbox('mezzEn', config.mezzEn, 'mezzSettings');
            if (config.mezzCov !== undefined) document.getElementById('mezzCov').value = config.mezzCov;
            if (config.mezzZ !== undefined) {
                document.getElementById('mezzZ').value = config.mezzZ;
                let label = config.mezzZ + '%';
                if (config.mezzZ == 0) label = 'Front';
                if (config.mezzZ == 100) label = 'Back';
                if (config.mezzZ == 50) label = 'Center';
                const mzEl = document.getElementById('valMezzZ');
                if (mzEl) mzEl.innerText = label;
            }
            if (config.mezzH !== undefined) {
                document.getElementById('mezzH').value = config.mezzH;
                const mhEl = document.getElementById('valMezzH');
                if (mhEl) mhEl.innerText = (60 + config.mezzH * 0.4).toFixed(0) + '%';
            }

            applyCheckbox('craneEn', config.craneEn, 'craneSettings');
            if (config.craneZ !== undefined) {
                document.getElementById('craneZ').value = config.craneZ;
                const czEl = document.getElementById('valCraneZ');
                if (czEl) czEl.innerText = config.craneZ + '%';
            }

            applyInputVal('overL', config.overL, true);
            applyInputVal('overR', config.overR, true);
            applyInputVal('overF', config.overF, true);
            applyInputVal('overB', config.overB, true);

            applyCheckbox('wF', config.wF, null);
            applyCheckbox('wB', config.wB, null);
            applyCheckbox('wL', config.wL, null);
            applyCheckbox('wR', config.wR, null);

            applyCheckbox('checkGutters', config.checkGutters, null);
            applyCheckbox('drivewayEn', config.drivewayEn, null);
            
            const bc = window.ConfiguratorBackendConstraints;
            const allowedMap = {
                'ergoninane-fast-74.glb': bc ? bc.allow_vehicle : 1,
                'forza1903-low-poly-2490.glb': bc ? bc.allow_forklift : 1,
                'plane.glb': bc ? bc.allow_airplane : 1,
                'scania.glb': bc ? bc.allow_truck : 1
            };

            if (config.selectedReferenceModels) {
                document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
                    const isAllowed = allowedMap[cb.value] !== 0;
                    cb.checked = isAllowed && config.selectedReferenceModels.includes(cb.value);
                });
            } else if (config.externalModelSelect) {
                document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
                    const isAllowed = allowedMap[cb.value] !== 0;
                    cb.checked = isAllowed && (cb.value === config.externalModelSelect);
                });
            }

            if (config.ltState) {
                Object.assign(ltState, config.ltState);
                ['L', 'R', 'F', 'B'].forEach(s => {
                    const state = ltState[s];
                    applyCheckbox(`ltEn${s}`, state.active, `ltSettings${s}`);
                    applyInputVal(`ltDrop${s}`, state.drop, true);
                    applyInputVal(`ltDepth${s}`, state.depth, true);
                    applyInputVal(`ltCutL${s}`, state.cutL, true);
                    applyInputVal(`ltCutR${s}`, state.cutR, true);
                    if (document.getElementById(`ltPitch${s}`)) document.getElementById(`ltPitch${s}`).value = state.pitch;
                    applyCheckbox(`ltWallL${s}`, state.wallL, null);
                    applyCheckbox(`ltWallR${s}`, state.wallR, null);
                    applyCheckbox(`ltWallF${s}`, state.wallF, null);
                });
            }

            if (config.openingsData) {
                Object.assign(openingsData, config.openingsData);
                let maxId = -1;
                ['F', 'B', 'L', 'R'].forEach(s => {
                    openingsData[s].forEach(op => {
                        if (op.id > maxId) maxId = op.id;
                    });
                });
                setOpeningIdCounter(maxId + 1);
            }

            updateMaterialColors();

        } catch (e) {
            console.error("Failed to parse config from URL:", e);
        }
    }
}

export function setupQuoteModal() {
    const quoteModalEl = document.getElementById('quoteModal');
    if (quoteModalEl) {
        quoteModalEl.addEventListener('show.bs.modal', function () {
            const u = getU();
            const wDisplay = parseFloat(document.getElementById('inputW').value).toFixed(2);
            const lDisplay = parseFloat(document.getElementById('inputL').value).toFixed(2);
            const hDisplay = parseFloat(document.getElementById('inputH').value).toFixed(2);
            const pitch = document.getElementById('inputPitch').value;

            const wM = parseFloat(document.getElementById('inputW').getAttribute('data-current-m'));
            const lM = parseFloat(document.getElementById('inputL').getAttribute('data-current-m'));
            const hM = parseFloat(document.getElementById('inputH').getAttribute('data-current-m'));

            const wVal = isMetric ? wM.toFixed(2) : (wM * 3.28084).toFixed(2);
            const lVal = isMetric ? lM.toFixed(2) : (lM * 3.28084).toFixed(2);
            const hVal = isMetric ? hM.toFixed(2) : (hM * 3.28084).toFixed(2);

            const fieldW = document.getElementById('input_4_13');
            const fieldL = document.getElementById('input_4_14');
            const fieldH = document.getElementById('input_4_12');

            if (fieldW) fieldW.value = wVal + ' ' + getU();
            if (fieldL) fieldL.value = lVal + ' ' + getU();
            if (fieldH) fieldH.value = hVal + ' ' + getU();

            const currentState = collectCurrentState();
            const encodedState = btoa(JSON.stringify(currentState));
            const generatedUrl = window.location.origin + window.location.pathname + '?config=' + encodedState;

            const fieldUrl = document.getElementById('input_4_10');
            if (fieldUrl) {
                fieldUrl.value = generatedUrl;
            }

            const roofSel = document.getElementById('roofType');
            const roofTypeText = roofSel.options[roofSel.selectedIndex].text;

            const wsEnabled = document.getElementById('wainscotEn').checked;
            const wsHeightStr = wsEnabled ? parseFloat(document.getElementById('inputWSHeight').value).toFixed(2) : "0";

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
            // ВОССТАНОВЛЕНИЕ: Логирование цвета Eave Trim для Gravity Forms лога
            infoString += `Eave Trim: ${getColorName('colorEaveTrim')}\n`;
            infoString += `Wainscot: ${wsEnabled ? getColorName('colorWainscot') : 'None'}\n\n`;

            infoString += `--- ADDITIONAL ELEMENTS ---\n`;
            infoString += `Interior Walls: ${document.getElementById('intWallsEn').checked ? 'Yes' : 'No'}\n`;
            infoString += `Ceiling Liner: ${document.getElementById('ceilEn') && document.getElementById('ceilEn').checked ? 'Yes' : 'No'}\n`;
            infoString += `Mezzanine: ${document.getElementById('mezzEn').checked ? 'Yes' : 'No'}\n`;
            infoString += `Crane: ${document.getElementById('craneEn').checked ? 'Yes' : 'No'}\n`;
            // ВОССТАНОВЛЕНИЕ: Экспорт статуса водосточной системы в Gravity Forms
            infoString += `Gutters & Downspouts: ${document.getElementById('checkGutters')?.checked ? 'Yes' : 'No'}\n\n`;

            let ltText = `--- AWNINGS (LEAN-TOS) ---\n`;
            let hasLt = false;
            const sideNames = { F: 'Front', B: 'Back', L: 'Left', R: 'Right' };
            
            ['F', 'B', 'L', 'R'].forEach(side => {
                const s = ltState[side];
                if (s.active) {
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
}

export function collectCurrentState() {
    const selectedModels = [];
    document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
        if (cb.checked) selectedModels.push(cb.value);
    });

    return {
        w: parseFloat(document.getElementById('inputW').getAttribute('data-current-m')),
        l: parseFloat(document.getElementById('inputL').getAttribute('data-current-m')),
        h: parseFloat(document.getElementById('inputH').getAttribute('data-current-m')),
        pitch: document.getElementById('inputPitch').value,
        roofType: document.getElementById('roofType').value,
        roofColor: document.getElementById('colorRoof').value,
        wallColor: document.getElementById('colorWall').value,
        trimColor: document.getElementById('colorTrim').value,
        // ВОССТАНОВЛЕНИЕ: Сбор цвета Eave Trim для генерации валидной хэш-ссылки
        eaveTrimColor: document.getElementById('colorEaveTrim')?.value || '',
        wainscotColor: document.getElementById('colorWainscot')?.value || '',
        ceilingColor: document.getElementById('colorCeiling')?.value || '',
        mezzanineColor: document.getElementById('colorMezzanine')?.value || '',
        wainscotEn: document.getElementById('wainscotEn').checked,
        wsHeight: parseFloat(document.getElementById('inputWSHeight').getAttribute('data-current-m')),
        intWallsEn: document.getElementById('intWallsEn').checked,
        intWallsH: document.getElementById('intWallsH').value,
        ceilEn: document.getElementById('ceilEn')?.checked || false,
        mezzEn: document.getElementById('mezzEn').checked,
        mezzCov: document.getElementById('mezzCov').value,
        mezzZ: document.getElementById('mezzZ').value,
        mezzH: document.getElementById('mezzH').value,
        craneEn: document.getElementById('craneEn').checked,
        craneZ: document.getElementById('craneZ').value,
        overL: parseFloat(document.getElementById('overL').getAttribute('data-current-m')),
        overR: parseFloat(document.getElementById('overR').getAttribute('data-current-m')),
        overF: parseFloat(document.getElementById('overF').getAttribute('data-current-m')),
        overB: parseFloat(document.getElementById('overB').getAttribute('data-current-m')),
        wF: document.getElementById('wF').checked,
        wB: document.getElementById('wB').checked,
        wL: document.getElementById('wL').checked,
        wR: document.getElementById('wR').checked,
        checkGutters: document.getElementById('checkGutters')?.checked || false,
        drivewayEn: document.getElementById('drivewayEn')?.checked || false,
        selectedReferenceModels: selectedModels,
        ltState: ltState,
        openingsData: openingsData
    };
}