import { mainGroup } from './scene.js';
import { isMetric, getU } from './state.js';
import { createFoundationGroup } from './foundation.js';
import { createBuildingGroup } from './building.js';
import { createWainscotGroup } from './wainscot.js';
import { createOverhangsGroup } from './overhangs.js';
import { createInteriorLinerGroup } from './interior-liner.js';
import { createMezzanineGroup } from './mezzanine.js';
import { createCraneGroup } from './crane.js';

import { createMainFramesGroup } from './main-frames.js';
import { createTrimsGroup } from './trims.js';
import { createGirtsGroup } from './girts.js';
import { createPurlinsGroup } from './purlins.js';
import { createEndWallColumnsGroup } from './end-wall-columns.js';
import { createDrivewayGroup } from './driveway.js';
import { createLogoGroup } from './logo.js';
import { createAwningsGroup } from './awnings.js';
import { updateMaterialColors } from './colorise.js';
import { updateBuildingTextures } from './texturiser.js';
import { validateAndClampOpenings } from './ui.js';

export function updateBuilding() {
    validateAndClampOpenings();

    updateMaterialColors();

    mainGroup.clear();

    const bc = window.ConfiguratorBackendConstraints || {};

    const inputW = document.getElementById('inputW');
    const inputL = document.getElementById('inputL');
    const inputH = document.getElementById('inputH');
    const inputPitch = document.getElementById('inputPitch');
    const roofTypeSelect = document.getElementById('roofType');

    const vis = {
        wF: document.getElementById('wF')?.checked ?? true,
        wB: document.getElementById('wB')?.checked ?? true,
        wL: document.getElementById('wL')?.checked ?? true,
        wR: document.getElementById('wR')?.checked ?? true,
        checkRoof: document.getElementById('checkRoof')?.checked ?? true,
        checkLabels: document.getElementById('checkLabels')?.checked ?? true
    };

    const width = inputW ? parseFloat(inputW.getAttribute('data-current-m')) || 18.288 : (bc.max_width || 18.288);
    const length = inputL ? parseFloat(inputL.getAttribute('data-current-m')) || 30.48 : (bc.max_length || 30.48);
    const height = inputH ? parseFloat(inputH.getAttribute('data-current-m')) || 4.8768 : (bc.max_height || 4.8768);

    const pitchRatio = inputPitch ? parseFloat(inputPitch.value) || 0.05 : 0.05;
    const roofType = roofTypeSelect ? roofTypeSelect.value : 'gabled';

    updateBuildingTextures(width, length, height);

    mainGroup.add(createFoundationGroup(width, length, vis.checkLabels));

    mainGroup.add(createMainFramesGroup(width, length, height, pitchRatio, roofType));

    const overL = parseFloat(document.getElementById('overL')?.getAttribute('data-current-m') || 0);
    const overR = parseFloat(document.getElementById('overR')?.getAttribute('data-current-m') || 0);
    const overF = parseFloat(document.getElementById('overF')?.getAttribute('data-current-m') || 0);
    const overB = parseFloat(document.getElementById('overB')?.getAttribute('data-current-m') || 0);
    const hasOverhangs = overL > 0 || overR > 0 || overF > 0 || overB > 0;

    mainGroup.add(createBuildingGroup(width, length, height, pitchRatio, roofType, hasOverhangs, vis));

    if (hasOverhangs) {
        mainGroup.add(createOverhangsGroup(width, length, height, pitchRatio, roofType, overL, overR, overF, overB, vis));
    }

    mainGroup.add(createAwningsGroup(width, length, height, pitchRatio, roofType));

    const wsEnabled = document.getElementById('wainscotEn')?.checked || false;
    const wsHeight = parseFloat(document.getElementById('inputWSHeight')?.getAttribute('data-current-m') || 1.1888);
    const wsColor = document.getElementById('colorWainscot')?.value || '#1e293b';
    mainGroup.add(createWainscotGroup(width, length, height, pitchRatio, roofType, wsHeight, wsColor, wsEnabled, vis));

    const intLinerEn = document.getElementById('intWallsEn')?.checked || false;
    const intLinerH = parseFloat(document.getElementById('intWallsH')?.value || 100);
    mainGroup.add(createInteriorLinerGroup(width, length, height, pitchRatio, roofType, intLinerEn, intLinerH));

    const mezzEn = document.getElementById('mezzEn')?.checked || false;
    mainGroup.add(createMezzanineGroup(width, length, height, mezzEn, document.getElementById('mezzCov')?.value || '1', parseFloat(document.getElementById('mezzZ')?.value || 0), parseFloat(document.getElementById('mezzH')?.value || 80), document.getElementById('colorMezzanine')?.value));

    const craneEn = document.getElementById('craneEn')?.checked || false;
    mainGroup.add(createCraneGroup(width, length, height, craneEn, parseFloat(document.getElementById('craneZ')?.value || 50)));

    const checkTrims = document.getElementById('checkTrims')?.checked ?? true;
    const checkGutters = document.getElementById('checkGutters')?.checked ?? false;
    mainGroup.add(createTrimsGroup(width, length, height, pitchRatio, roofType, checkTrims, overL, overR, checkGutters));

    const checkGirts = document.getElementById('checkGirts')?.checked ?? true;
    mainGroup.add(createGirtsGroup(width, length, height, checkGirts));

    const checkPurlins = document.getElementById('checkPurlins')?.checked ?? true;
    mainGroup.add(createPurlinsGroup(width, length, height, pitchRatio, roofType, checkPurlins));

    const checkEWColumns = document.getElementById('checkEWColumns')?.checked ?? true;
    mainGroup.add(createEndWallColumnsGroup(width, length, height, pitchRatio, roofType, checkEWColumns));

    const drivewayEn = document.getElementById('drivewayEn')?.checked ?? false;
    mainGroup.add(createDrivewayGroup(width, length, drivewayEn));

    if (vis.wF) {
        mainGroup.add(createLogoGroup(width, length, height, pitchRatio, roofType));
    }

    updateSidebarSummary(
        width,
        length,
        height,
        pitchRatio,
        roofType
    );
}

/**
 * Keeps the small summary card under the "Request a free Quote" button
 * in sync with the current building. Text-only (no thumbnail render) so
 * it's cheap enough to call on every slider drag; the quote modal's own
 * snapshot logic (tools-actions.js) still handles the actual photo.
 */
function updateSidebarSummary(
    widthM,
    lengthM,
    heightM,
    pitchRatio,
    roofType
) {
    const dimsEl =
        document.getElementById(
            'sidebar-summary-dimensions'
        );

    const roofEl =
        document.getElementById(
            'sidebar-summary-roof'
        );

    const colorsEl =
        document.getElementById(
            'sidebar-summary-colors'
        );

    const roofProfileSelect =
        document.getElementById(
            'roofProfile'
        );

    const wallProfileSelect =
        document.getElementById(
            'wallProfile'
        );

    const roofColorSelect =
        document.getElementById(
            'colorRoof'
        );

    const wallColorSelect =
        document.getElementById(
            'colorWall'
        );

    if (dimsEl) {
        const unit =
            getU();

        const mult =
            isMetric
                ? 1
                : 3.28084;

        const w =
            (
                widthM * mult
            ).toFixed(0);

        const l =
            (
                lengthM * mult
            ).toFixed(0);

        const h =
            (
                heightM * mult
            ).toFixed(0);

        const pitchValue =
            (
                pitchRatio * 12
            ).toFixed(1)
            .replace(
                '.0',
                ''
            );

        dimsEl.textContent =
            `${w}${unit} x ${l}${unit} x ${h}${unit} · ${pitchValue}:12`;
    }

    const roofLabels = {
        'gabled':
            'Gable Roof',

        'left-sloped':
            'Left Sloped Roof',

        'right-sloped':
            'Right Sloped Roof'
    };

    const roofTypeLabel =
        roofLabels[
            roofType
        ]
        || 'Gable Roof';

    const roofProfile =
        roofProfileSelect
            ?.selectedOptions?.[0]
            ?.text
        || '';

    const wallProfile =
        wallProfileSelect
            ?.selectedOptions?.[0]
            ?.text
        || '';

    const roofColor =
        roofColorSelect
            ?.selectedOptions?.[0]
            ?.text
        || '';

    const wallColor =
        wallColorSelect
            ?.selectedOptions?.[0]
            ?.text
        || '';

    if (roofEl) {
        roofEl.textContent =
            `Roof: ${roofTypeLabel} · ${roofProfile} · ${roofColor}`;
    }

    if (colorsEl) {
        colorsEl.textContent =
            `Walls: ${wallProfile} · ${wallColor}`;
    }
}