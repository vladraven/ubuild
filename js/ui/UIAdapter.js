import { serializeModelToURL, deserializeModelFromURL } from '../integration/URLSerializer.js';
import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';

const M_TO_FT = 3.28084;
const FT_TO_M = 1 / M_TO_FT;

export function createUIAdapter(runtime) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for UIAdapter');
    }

    let isMetric = false;

    function getUnitSuffix() {
        return isMetric ? ' m' : ' ft';
    }

    function parseInputDistance(value) {
        const num = parseFloat(value);
        if (!Number.isFinite(num) || num <= 0) return 0;
        return isMetric ? num : num * FT_TO_M;
    }

    function formatDistanceForDisplay(meters) {
        if (!Number.isFinite(meters)) return '0.00';
        const val = isMetric ? meters : meters * M_TO_FT;
        return val.toFixed(2);
    }

    function syncInputsFromModel(model) {
        const setVal = (id, meters) => {
            const input = document.getElementById(id);
            const display = document.getElementById(id.replace('input', 'val'));
            if (input) {
                input.value = formatDistanceForDisplay(meters);
                input.setAttribute('data-current-m', meters.toString());
            }
            if (display) {
                display.value = formatDistanceForDisplay(meters);
            }
        };

        setVal('inputW', model.dimensions.width);
        setVal('inputL', model.dimensions.length);
        setVal('inputH', model.dimensions.height);

        const pitchInput = document.getElementById('inputPitch');
        const pitchVal = document.getElementById('valPitch');
        if (pitchInput) pitchInput.value = model.roof.pitchRatio.toString();
        if (pitchVal) pitchVal.value = (model.roof.pitchRatio * 12).toFixed(1).replace('.0', '');

        const roofTypeSelect = document.getElementById('roofType');
        if (roofTypeSelect) roofTypeSelect.value = model.roof.type;

        const overL = document.getElementById('overL');
        const overR = document.getElementById('overR');
        const overF = document.getElementById('overF');
        const overB = document.getElementById('overB');
        if (overL) overL.value = formatDistanceForDisplay(model.roof.overhangs.left);
        if (overR) overR.value = formatDistanceForDisplay(model.roof.overhangs.right);
        if (overF) overF.value = formatDistanceForDisplay(model.roof.overhangs.front);
        if (overB) overB.value = formatDistanceForDisplay(model.roof.overhangs.back);

        const wainscotEn = document.getElementById('wainscotEn');
        if (wainscotEn) wainscotEn.checked = model.visibility.wainscot;

        const setChecked = (id, checked) => {
            const el = document.getElementById(id);
            if (el) el.checked = Boolean(checked);
        };

        setChecked('wF', model.visibility.walls);
        setChecked('wB', model.visibility.walls);
        setChecked('wL', model.visibility.walls);
        setChecked('wR', model.visibility.walls);
        setChecked('checkRoof', model.visibility.roof);
        setChecked('checkTrims', model.visibility.trims);
        setChecked('checkGutters', model.visibility.gutters);
        setChecked('checkGirts', model.visibility.girts);
        setChecked('checkPurlins', model.visibility.purlins);
        setChecked('checkEWColumns', model.visibility.endWallColumns);
        setChecked('drivewayEn', model.driveway.enabled);
        setChecked('craneEn', model.crane.enabled);
        setChecked('mezzEn', model.mezzanine.enabled);
        setChecked('intWallsEn', model.liner.enabled);

        updateSummaryDisplay(model);
    }

    function readModelFromUI() {
        const current = runtime.model;

        const widthM = parseInputDistance(document.getElementById('inputW')?.value) || current.dimensions.width;
        const lengthM = parseInputDistance(document.getElementById('inputL')?.value) || current.dimensions.length;
        const heightM = parseInputDistance(document.getElementById('inputH')?.value) || current.dimensions.height;

        const pitchRatio = parseFloat(document.getElementById('inputPitch')?.value) || current.roof.pitchRatio;
        const roofType = document.getElementById('roofType')?.value || current.roof.type;

        const overL = parseInputDistance(document.getElementById('overL')?.value) || 0;
        const overR = parseInputDistance(document.getElementById('overR')?.value) || 0;
        const overF = parseInputDistance(document.getElementById('overF')?.value) || 0;
        const overB = parseInputDistance(document.getElementById('overB')?.value) || 0;

        const isWainscot = document.getElementById('wainscotEn')?.checked ?? false;
        const wsHeightM = parseInputDistance(document.getElementById('inputWSHeight')?.value) || 0.9144;

        const checkTrims = document.getElementById('checkTrims')?.checked ?? true;
        const checkGutters = document.getElementById('checkGutters')?.checked ?? false;
        const checkGirts = document.getElementById('checkGirts')?.checked ?? true;
        const checkPurlins = document.getElementById('checkPurlins')?.checked ?? true;
        const checkEWColumns = document.getElementById('checkEWColumns')?.checked ?? true;
        const checkRoof = document.getElementById('checkRoof')?.checked ?? true;

        const craneEn = document.getElementById('craneEn')?.checked ?? false;
        const craneZ = (parseFloat(document.getElementById('craneZ')?.value) || 50) / 100;

        const mezzEn = document.getElementById('mezzEn')?.checked ?? false;
        const mezzCov = parseFloat(document.getElementById('mezzCov')?.value) || 1;
        const mezzH = (parseFloat(document.getElementById('mezzH')?.value) || 50) / 100 * heightM;

        const drivewayEn = document.getElementById('drivewayEn')?.checked ?? false;
        const intLinerEn = document.getElementById('intWallsEn')?.checked ?? false;

        return {
            ...current,
            dimensions: {
                width: widthM,
                length: lengthM,
                height: heightM
            },
            roof: {
                type: roofType,
                pitchRatio: pitchRatio,
                overhangs: {
                    front: overF,
                    back: overB,
                    left: overL,
                    right: overR
                }
            },
            panels: {
                ...current.panels,
                wallHeight: heightM,
                wainscotHeight: isWainscot ? wsHeightM : 0
            },
            crane: {
                ...current.crane,
                enabled: craneEn,
                zPercent: craneZ,
                z: craneZ
            },
            mezzanine: {
                ...current.mezzanine,
                enabled: mezzEn,
                coverage: mezzCov,
                height: mezzH
            },
            driveway: {
                ...current.driveway,
                enabled: drivewayEn,
                width: widthM * 0.8,
                length: 6.0,
                height: 0.15
            },
            liner: {
                ...current.liner,
                enabled: intLinerEn,
                height: heightM,
                thickness: 0.01
            },
            visibility: {
                ...current.visibility,
                roof: checkRoof,
                wainscot: isWainscot,
                trims: checkTrims,
                ridge: checkTrims && roofType === 'gabled',
                gutters: checkGutters,
                girts: checkGirts,
                purlins: checkPurlins,
                endWallColumns: checkEWColumns,
                crane: craneEn,
                mezzanine: mezzEn,
                driveway: drivewayEn,
                liner: intLinerEn
            }
        };
    }

    function updateSummaryDisplay(model) {
        const dimsEl = document.getElementById('sidebar-summary-dimensions');
        const roofEl = document.getElementById('sidebar-summary-roof');
        const colorsEl = document.getElementById('sidebar-summary-colors');

        if (dimsEl) {
            const unit = getUnitSuffix();
            const w = formatDistanceForDisplay(model.dimensions.width);
            const l = formatDistanceForDisplay(model.dimensions.length);
            const h = formatDistanceForDisplay(model.dimensions.height);
            const pitch = (model.roof.pitchRatio * 12).toFixed(1).replace('.0', '');
            dimsEl.textContent = `${w}${unit} x ${l}${unit} x ${h}${unit} · ${pitch}:12`;
        }

        if (roofEl) {
            const roofTypeLabels = {
                'gabled': 'Gable Roof',
                'left-sloped': 'Left Sloped Roof',
                'right-sloped': 'Right Sloped Roof'
            };
            const label = roofTypeLabels[model.roof.type] || 'Gable Roof';
            roofEl.textContent = `Roof: ${label}`;
        }

        if (colorsEl) {
            const wallColor = document.getElementById('colorWall')?.value || '#777777';
            colorsEl.textContent = `Color: ${wallColor}`;
        }
    }

    function bindEvents() {
        const inputIds = [
            'inputW', 'inputL', 'inputH', 'inputPitch', 'roofType',
            'overL', 'overR', 'overF', 'overB', 'wainscotEn', 'inputWSHeight',
            'checkRoof', 'checkTrims', 'checkGutters', 'checkGirts',
            'checkPurlins', 'checkEWColumns', 'craneEn', 'craneZ',
            'mezzEn', 'mezzCov', 'mezzH', 'drivewayEn', 'intWallsEn'
        ];

        inputIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
            el.addEventListener(eventType, () => {
                const nextModel = readModelFromUI();
                runtime.update(nextModel);
                updateSummaryDisplay(nextModel);
            });
        });

        const colorIds = [
            'colorRoof', 'colorWall', 'colorTrim', 'colorEaveTrim',
            'colorWainscot', 'colorCeiling', 'colorMezzanine'
        ];

        colorIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                const colors = {
                    wall: document.getElementById('colorWall')?.value || '#777777',
                    roof: document.getElementById('colorRoof')?.value || '#555555',
                    trim: document.getElementById('colorTrim')?.value || '#444444',
                    eaveTrim: document.getElementById('colorEaveTrim')?.value || '#444444',
                    wainscot: document.getElementById('colorWainscot')?.value || '#444444',
                    mezzanine: document.getElementById('colorMezzanine')?.value || '#666666',
                    ceiling: document.getElementById('colorCeiling')?.value || '#FFFFFF'
                };
                if (runtime.materials) {
                    for (const [key, colorHex] of Object.entries(colors)) {
                        const mat = runtime.materials.get(key);
                        if (mat && mat.color) mat.color.set(colorHex);
                    }
                    runtime.render();
                }
            });
        });

        // Metric / Imperial Unit Switching
        const unitToggle = document.getElementById('unitToggle');
        if (unitToggle) {
            unitToggle.addEventListener('change', (e) => {
                isMetric = e.target.checked;
                syncInputsFromModel(runtime.model);
            });
        }
    }

    return Object.freeze({
        init() {
            bindEvents();
            syncInputsFromModel(runtime.model);
        },
        syncInputsFromModel,
        readModelFromUI
    });
}