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

    const wsEnabled = document.getElementById('wainscotEn')?.checked || false;
    const wsHeight = readMetricValue('inputWSHeight', 0.9144);

    const intLinerEn = document.getElementById('intWallsEn')?.checked || false;
    const intLinerH = parseFloat(document.getElementById('intWallsH')?.value || 100);

    const mezzEn = document.getElementById('mezzEn')?.checked || false;
    const mezzCov = document.getElementById('mezzCov')?.value || '1';
    const mezzZ = parseFloat(document.getElementById('mezzZ')?.value || 0);
    const mezzH = parseFloat(document.getElementById('mezzH')?.value || 50);
    const mezzColor = document.getElementById('colorMezzanine')?.value;

    const craneEn = document.getElementById('craneEn')?.checked || false;
    const craneZ = parseFloat(document.getElementById('craneZ')?.value || 50);

    const drivewayEn = document.getElementById('drivewayEn')?.checked ?? false;

    return {
        width,
        length,
        height,
        pitchRatio,
        roofType,
        overhangs,
        wsEnabled,
        wsHeight,
        intLinerEn,
        intLinerH,
        mezzEn,
        mezzCov,
        mezzZ,
        mezzH,
        mezzColor,
        craneEn,
        craneZ,
        drivewayEn
    };
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
        wsEnabled: params.wsEnabled,
        wsHeight: params.wsHeight,
        intLinerEn: params.intLinerEn,
        intLinerH: params.intLinerH,
        mezzEn: params.mezzEn,
        mezzCov: params.mezzCov,
        mezzZ: params.mezzZ,
        mezzH: params.mezzH,
        craneEn: params.craneEn,
        craneZ: params.craneZ,
        drivewayEn: params.drivewayEn,
        ltState,
        openingsData,
        openingDefs,
        visibility: vis
    });

    updateBuildingTextures(params.width, params.length, params.height);

    // 1. Фундамент
    mainGroup.add(createFoundationGroup(geometry, vis.checkLabels));

    // 2. Несущий каркас (Main Frames)
    mainGroup.add(createMainFramesGroup(geometry));

    // 3. Стены и проёмы
    const hasOverhangs = geometry.overhangs.enabled;
    mainGroup.add(createBuildingGroup(geometry, hasOverhangs, vis));

    // 4. Кровельные свесы (Overhangs)
    if (hasOverhangs) {
        mainGroup.add(createOverhangsGroup(geometry, vis));
    }

    // 5. Навесы / Пристройки (Awnings / Lean-Tos)
    mainGroup.add(createAwningsGroup(geometry));

    // 6. Цоколь (Wainscot)
    mainGroup.add(createWainscotGroup(geometry));

    // 7. Внутренняя обшивка (Interior Liner)
    mainGroup.add(createInteriorLinerGroup(geometry, params.intLinerEn, params.intLinerH));

    // 8. Мезонин (Mezzanine)
    mainGroup.add(createMezzanineGroup(geometry, params.mezzEn, params.mezzCov, params.mezzZ, params.mezzH, params.mezzColor));

    // 9. Кран (Crane)
    mainGroup.add(createCraneGroup(geometry, params.craneEn, params.craneZ));

    // 10. Фасонные элементы (Trims)
    const checkTrims = document.getElementById('checkTrims')?.checked ?? true;
    const checkGutters = document.getElementById('checkGutters')?.checked ?? false;

    const trimsGroup = createTrimsGroup(geometry, checkTrims);
    mainGroup.add(trimsGroup);

    // 11. Конёк (Ridge Cap)
    if (checkTrims && geometry.roof.type === 'gabled') {
        mainGroup.add(createRidgeGroup(geometry));
    }

    // 12. Водостоки (Gutters)
    if (checkGutters) {
        const guttersGroup = createGuttersGroup(geometry, true);
        mainGroup.add(guttersGroup);
        updateDownspoutVisibility(guttersGroup);
    }

    // 13. Стеновые ригели (Girts)
    const checkGirts = document.getElementById('checkGirts')?.checked ?? true;
    mainGroup.add(createGirtsGroup(geometry, checkGirts));

    // 14. Кровельные прогоны (Purlins)
    const checkPurlins = document.getElementById('checkPurlins')?.checked ?? true;
    mainGroup.add(createPurlinsGroup(geometry, checkPurlins));

    // 15. Торцевые фахверковые колонны (End Wall Columns)
    const checkEWColumns = document.getElementById('checkEWColumns')?.checked ?? true;
    mainGroup.add(createEndWallColumnsGroup(geometry, checkEWColumns));

    // 16. Подъездная площадка (Driveway)
    mainGroup.add(createDrivewayGroup(geometry, params.drivewayEn));

    // 17. Логотип (Logo)
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