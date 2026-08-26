// UIAdapter.js - orchestrator only.
//
// This used to be a single ~2000-line file doing dimensions, roof, overhangs,
// wainscot, colors, visibility, units, reference models, the information
// banner, and a giant updateInputsFromModel() DOM-sync function all in one
// place. It's now split into one controller per responsibility under
// js/ui/controllers/, each owning both the DOM *binding* (listen for user
// input) and the DOM *sync* (write the model back out to the inputs) for
// its own slice of the UI. This file just wires them together and exposes
// the same public API as before, so callers (app-new.js) don't need to
// change.
import { createUIActions } from './UIActions.js';

import { createUnitsController } from './controllers/units-controller.js';
import { createDimensionsController } from './controllers/dimensions-controller.js';
import { createRoofController } from './controllers/roof-controller.js';
import { createOverhangsController } from './controllers/overhangs-controller.js';
import { createWainscotController } from './controllers/wainscot-controller.js';
import { createColorsController } from './controllers/colors-controller.js';
import { createVisibilityController } from './controllers/visibility-controller.js';
import { createReferenceModelsController } from './controllers/reference-models-controller.js';
import { createInformationNoticeController } from './controllers/information-notice-controller.js';

export function createUIAdapter(runtime) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for UIAdapter');
    }

    // Applies a model patch and then re-syncs every controller's DOM state
    // from the resulting model. This is the same shape as the old local
    // update(patch) helper - most controllers (dimensions, roof, overhangs,
    // wainscot) use it. Colors and visibility deliberately call
    // runtime.update() directly instead (see those controllers) to match
    // the original's behaviour of not re-syncing the whole UI on every
    // colour pick / checkbox toggle.
    function update(patch) {
        runtime.update({ ...runtime.model, ...patch });
        syncAll();
    }

    function syncAll() {
        units.syncFromModel();
        dimensions.syncFromModel();
        roof.syncFromModel();
        overhangs.syncFromModel();
        wainscot.syncFromModel();
        colors.syncFromModel();
        visibility.syncFromModel();
    }

    const units = createUnitsController({ runtime });
    const dimensions = createDimensionsController({ runtime, units, update });
    const roof = createRoofController({ runtime, update, syncAll });
    const overhangs = createOverhangsController({ runtime, units, update });
    const wainscot = createWainscotController({ runtime, units, update });
    const colors = createColorsController({ runtime });
    const visibility = createVisibilityController({ runtime });
    const referenceModels = createReferenceModelsController({ runtime });
    const informationNotice = createInformationNoticeController();

    const actions = createUIActions({
        runtime,
        updateInputsFromModel: syncAll,
        toDisplay: units.toDisplay
    });

    function init() {
        dimensions.bind();
        roof.bind();
        overhangs.bind();
        wainscot.bind();
        colors.bind();
        visibility.bind();
        units.bind(syncAll);
        referenceModels.bind();
        informationNotice.bind();

        actions.init();

        units.syncDistSlidersToUnit();
        syncAll();
    }

    return Object.freeze({
        init,
        updateInputsFromModel: syncAll,
        toDisplay: units.toDisplay,
        toMeters: units.toMeters,

        saveDesign: actions.saveDesign,
        renderGallery: actions.renderGallery,
        renderCompare: actions.renderCompare
    });
}
