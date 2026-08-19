// js/builder.js
import { mainGroup } from './scene.js';
import { isMetric, getU, openingsData, openingDefs, ltState } from './state.js';
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
import { createRidgeGroup } from './ridge.js';
import { createGuttersGroup, updateDownspoutVisibility } from './gutters.js';
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
    return {
        width: readMetricValue('inputW', bc.max_width || 18.288),
        length: readMetricValue('inputL', bc.max_length || 30.48),
        height: readMetricValue('inputH', bc.max_height || 4.8768),
        pitchRatio: parseFloat(document.getElementById('inputPitch')?.value) || 0.05,
        roofType: document.getElementById('roofType')?.value || 'gabled',
        overhangs: {
            overL: readMetricValue('overL', 0),
            overR: readMetricValue('overR', 0),
            overF: readMetricValue('overF', 0),
            overB: readMetricValue('overB', 0)
        },
        wsEnabled: document.getElementById('wainscotEn')?.checked || false,
        wsHeight: readMetricValue('inputWSHeight', 0.9144),
        intLinerEn: document.getElementById('intWallsEn')?.checked || false,
        intLinerH: parseFloat(document.getElementById('intWallsH')?.value || 100),
        mezzEn: document.getElementById('mezzEn')?.checked || false,
        mezzCov: document.getElementById('mezzCov')?.value || '1',
        mezzZ: parseFloat(document.getElementById('mezzZ')?.value || 0),
        mezzH: parseFloat(document.getElementById('mezzH')?.value || 50),
        mezzColor: document.getElementById('colorMezzanine')?.value,
        craneEn: document.getElementById('craneEn')?.checked || false,
        craneZ: parseFloat(document.getElementById('craneZ')?.value || 50),
        drivewayEn: document.getElementById('drivewayEn')?.checked ?? false
    };
}

export function updateBuilding() {
    validateAndClampOpenings();
    updateMaterialColors();
    mainGroup.clear();

    const vis = readVisibility();
    const params = readBuildingParameters();

    const geometry = createBuildingGeometry({
        ...params,
        openingsData,
        openingDefs,
        ltState,
        visibility: vis
    });

    updateBuildingTextures(params.width, params.length, params.height);

    mainGroup.add(createFoundationGroup(geometry, vis.checkLabels));
    mainGroup.add(createMainFramesGroup(geometry));
    mainGroup.add(createBuildingGroup(geometry, geometry.overhangs.enabled, vis));
    if (geometry.overhangs.enabled) {
        mainGroup.add(createOverhangsGroup(geometry, vis));
    }
    mainGroup.add(createAwningsGroup(geometry));
    mainGroup.add(createWainscotGroup(geometry));
    mainGroup.add(createInteriorLinerGroup(geometry, params.intLinerEn, params.intLinerH));
    mainGroup.add(createMezzanineGroup(geometry, params.mezzEn, params.mezzCov, params.mezzZ, params.mezzH, params.mezzColor));
    mainGroup.add(createCraneGroup(geometry, params.craneEn, params.craneZ));

    const checkTrims = document.getElementById('checkTrims')?.checked ?? true;
    const checkGutters = document.getElementById('checkGutters')?.checked ?? false;
    
    mainGroup.add(createTrimsGroup(geometry, checkTrims));
    if (checkTrims && geometry.roof.type === 'gabled') {
        mainGroup.add(createRidgeGroup(geometry));
    }
    if (checkGutters) {
        const guttersGroup = createGuttersGroup(geometry, true);
        mainGroup.add(guttersGroup);
        updateDownspoutVisibility(guttersGroup);
    }

    mainGroup.add(createGirtsGroup(geometry, document.getElementById('checkGirts')?.checked ?? true));
    mainGroup.add(createPurlinsGroup(geometry, document.getElementById('checkPurlins')?.checked ?? true));
    mainGroup.add(createEndWallColumnsGroup(geometry, document.getElementById('checkEWColumns')?.checked ?? true));
    mainGroup.add(createDrivewayGroup(geometry, params.drivewayEn));

    if (vis.wF) {
        mainGroup.add(createLogoGroup(geometry));
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