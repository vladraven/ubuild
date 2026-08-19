// ================================================
// FILE: js/builder.js
// ================================================
import { mainGroup } from './scene.js';
import { isMetric, getU, openingsData, openingDefs } from './state.js';
import { createBuildingGeometry } from './buildingGeometry.js';
import { createFoundationGroup } from './foundation.js';
import { createBuildingGroup } from './building.js';
import { createWainscotGroup } from './wainscot.js';
import { createOverhangsGroup } from './overhangs.js';
import { createInteriorLinerGroup } from './interior-liner.js';
import { createMezzanineGroup } from './mezzanine.js';
import { createCraneGroup } from './crane.js';
import { createMainFramesGroup } from './main-frames.js';
import { createTrimsGroup } from './trims.js';
import { updateDownspoutVisibility } from './gutters.js';
import { createGirtsGroup } from './girts.js';
import { createPurlinsGroup } from './purlins.js';
import { createEndWallColumnsGroup } from './end-wall-columns.js';
import { createDrivewayGroup } from './driveway.js';
import { createLogoGroup } from './logo.js';
import { createAwningsGroup } from './awnings.js';
import { updateMaterialColors } from './colorise.js';
import { updateBuildingTextures } from './texturiser.js';
import { validateAndClampOpenings } from './ui.js';

function readMetricValue(id, fallback = 0) {
    const element = document.getElementById(id);
    if (!element) return fallback;
    const value = parseFloat(element.getAttribute('data-current-m'));
    return Number.isFinite(value) ? value : fallback;
}

function readVisibility() {
    return {
        wF: document.getElementById('wF')?.checked ?? true,
        wB: document.getElementById('wB')?.checked ?? true,
        wL: document.getElementById('wL')?.checked ?? true,
        wR: document.getElementById('wR')?.checked ?? true,
        checkRoof: document.getElementById('checkRoof')?.checked ?? true,
        checkLabels: document.getElementById('checkLabels')?.checked ?? true
    };
}

function readBuildingParameters() {
    const bc = window.ConfiguratorBackendConstraints || {};

    const width = readMetricValue('inputW', bc.max_width || 18.288);
    const length = readMetricValue('inputL', bc.max_length || 30.48);
    const height = readMetricValue('inputH', bc.max_height || 4.8768);

    const pitchInput = document.getElementById('inputPitch');
    const pitchRatio = pitchInput ? (parseFloat(pitchInput.value) || 0.05) : 0.05;

    const roofTypeSelect = document.getElementById('roofType');
    const roofType = roofTypeSelect ? roofTypeSelect.value : 'gabled';

    const overhangs = {
        overL: readMetricValue('overL', 0),
        overR: readMetricValue('overR', 0),
        overF: readMetricValue('overF', 0),
        overB: readMetricValue('overB', 0)
    };

    return { width, length, height, pitchRatio, roofType, overhangs };
}

export function updateBuilding() {
    validateAndClampOpenings();
    updateMaterialColors();

    mainGroup.clear();

    const vis = readVisibility();
    const params = readBuildingParameters();

    const geometry = createBuildingGeometry({
        width: params.width,
        length: params.length,
        height: params.height,
        pitchRatio: params.pitchRatio,
        roofType: params.roofType,
        overL: params.overhangs.overL,
        overR: params.overhangs.overR,
        overF: params.overhangs.overF,
        overB: params.overhangs.overB,
        openingsData,
        openingDefs,
        visibility: vis
    });

    updateBuildingTextures(params.width, params.length, params.height);

    // 1. Foundation
    mainGroup.add(createFoundationGroup(params.width, params.length, vis.checkLabels));

    // 2. Structural Main Frames
    mainGroup.add(createMainFramesGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType));

    // 3. Walls & Openings (and non-overhang roof if applicable)
    const hasOverhangs = geometry.overhangs.enabled;
    mainGroup.add(createBuildingGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType, hasOverhangs, vis, geometry));

    // 4. Overhangs
    if (hasOverhangs) {
        mainGroup.add(createOverhangsGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType, params.overhangs.overL, params.overhangs.overR, params.overhangs.overF, params.overhangs.overB, vis, geometry));
    }

    // 5. Awnings / Lean-Tos
    mainGroup.add(createAwningsGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType));

    // 6. Wainscot
    const wsEnabled = document.getElementById('wainscotEn')?.checked || false;
    const wsHeight = readMetricValue('inputWSHeight', 0.9144);
    const wsColor = document.getElementById('colorWainscot')?.value || '#707170';
    mainGroup.add(createWainscotGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType, wsHeight, wsColor, wsEnabled, vis, geometry));

    // 7. Interior Liner
    const intLinerEn = document.getElementById('intWallsEn')?.checked || false;
    const intLinerH = parseFloat(document.getElementById('intWallsH')?.value || 100);
    mainGroup.add(createInteriorLinerGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType, intLinerEn, intLinerH));

    // 8. Mezzanine
    const mezzEn = document.getElementById('mezzEn')?.checked || false;
    const mezzCov = document.getElementById('mezzCov')?.value || '1';
    const mezzZ = parseFloat(document.getElementById('mezzZ')?.value || 0);
    const mezzH = parseFloat(document.getElementById('mezzH')?.value || 50);
    const mezzColor = document.getElementById('colorMezzanine')?.value;
    mainGroup.add(createMezzanineGroup(params.width, params.length, params.height, mezzEn, mezzCov, mezzZ, mezzH, mezzColor));

    // 9. Crane
    const craneEn = document.getElementById('craneEn')?.checked || false;
    const craneZ = parseFloat(document.getElementById('craneZ')?.value || 50);
    mainGroup.add(createCraneGroup(params.width, params.length, params.height, craneEn, craneZ));

    // 10. Trims & Gutters
    const checkTrims = document.getElementById('checkTrims')?.checked ?? true;
    const checkGutters = document.getElementById('checkGutters')?.checked ?? false;
    const trimsGroup = createTrimsGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType, checkTrims, params.overhangs.overL, params.overhangs.overR, params.overhangs.overF, params.overhangs.overB, checkGutters, geometry);
    mainGroup.add(trimsGroup);
    updateDownspoutVisibility(trimsGroup);

    // 11. Girts & Purlins
    const checkGirts = document.getElementById('checkGirts')?.checked ?? true;
    mainGroup.add(createGirtsGroup(params.width, params.length, params.height, checkGirts));

    const checkPurlins = document.getElementById('checkPurlins')?.checked ?? true;
    mainGroup.add(createPurlinsGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType, checkPurlins));

    // 12. End Wall Columns
    const checkEWColumns = document.getElementById('checkEWColumns')?.checked ?? true;
    mainGroup.add(createEndWallColumnsGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType, checkEWColumns));

    // 13. Driveway
    const drivewayEn = document.getElementById('drivewayEn')?.checked ?? false;
    mainGroup.add(createDrivewayGroup(params.width, params.length, drivewayEn));

    // 14. Logo
    if (vis.wF) {
        mainGroup.add(createLogoGroup(params.width, params.length, params.height, params.pitchRatio, params.roofType));
    }

    updateSidebarSummary(params.width, params.length, params.height, params.pitchRatio, params.roofType);
}

function updateSidebarSummary(widthM, lengthM, heightM, pitchRatio, roofType) {
    const dimsEl = document.getElementById('sidebar-summary-dimensions');
    const roofEl = document.getElementById('sidebar-summary-roof');
    const colorsEl = document.getElementById('sidebar-summary-colors');

    const roofProfileSelect = document.getElementById('roofProfile');
    const wallProfileSelect = document.getElementById('wallProfile');
    const roofColorSelect = document.getElementById('colorRoof');
    const wallColorSelect = document.getElementById('colorWall');

    if (dimsEl) {
        const unit = getU();
        const mult = isMetric ? 1 : 3.28084;
        const w = (widthM * mult).toFixed(0);
        const l = (lengthM * mult).toFixed(0);
        const h = (heightM * mult).toFixed(0);
        const pitchValue = (pitchRatio * 12).toFixed(1).replace('.0', '');
        dimsEl.textContent = `${w}${unit} x ${l}${unit} x ${h}${unit} · ${pitchValue}:12`;
    }

    const roofLabels = {
        gabled: 'Gable Roof',
        'left-sloped': 'Left Sloped Roof',
        'right-sloped': 'Right Sloped Roof'
    };
    const roofTypeLabel = roofLabels[roofType] || 'Gable Roof';
    const roofProfile = roofProfileSelect?.selectedOptions?.[0]?.text || '';
    const wallProfile = wallProfileSelect?.selectedOptions?.[0]?.text || '';
    const roofColor = roofColorSelect?.selectedOptions?.[0]?.text || '';
    const wallColor = wallColorSelect?.selectedOptions?.[0]?.text || '';

    if (roofEl) {
        roofEl.textContent = `Roof: ${roofTypeLabel} · ${roofProfile} · ${roofColor}`;
    }
    if (colorsEl) {
        colorsEl.textContent = `Walls: ${wallProfile} · ${wallColor}`;
    }
}