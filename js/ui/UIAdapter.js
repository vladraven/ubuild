import {
    createUIActions
}
from './UIActions.js';

import {
    createUnitsController
}
from './controllers/units-controller.js';
import {
    createDimensionsController
}
from './controllers/dimensions-controller.js';
import {
    createRoofController
}
from './controllers/roof-controller.js';
import {
    createOverhangsController
}
from './controllers/overhangs-controller.js';
import {
    createWainscotController
}
from './controllers/wainscot-controller.js';
import {
    createColorsController
}
from './controllers/colors-controller.js';
import {
    createVisibilityController
}
from './controllers/visibility-controller.js';
import {
    createReferenceModelsController
}
from './controllers/reference-models-controller.js';
import {
    createInformationNoticeController
}
from './controllers/information-notice-controller.js';

export function createUIAdapter(runtime) {
    if (!runtime) {
        throw new TypeError(
            'UBuildRuntime instance is required for UIAdapter');
    }

    function update(patch) {
        runtime.update({
            ...runtime.model,
            ...patch
        });

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

    const units =
        createUnitsController({
            runtime
        });

    const dimensions =
        createDimensionsController({
            runtime,
            units,
            update
        });

    const roof =
        createRoofController({
            runtime,
            update,
            syncAll
        });

    const overhangs =
        createOverhangsController({
            runtime,
            units,
            update
        });

    const wainscot =
        createWainscotController({
            runtime,
            units,
            update
        });

    const colors =
        createColorsController({
            runtime
        });

    const visibility =
        createVisibilityController({
            runtime
        });

    const referenceModels =
        createReferenceModelsController({
            runtime
        });

    const informationNotice =
        createInformationNoticeController();

    const actions =
        createUIActions({
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

        units.bind(
            syncAll);

        referenceModels.bind();

        informationNotice.bind();

        actions.init();

        units.syncDistSlidersToUnit();

        syncAll();
    }

    return Object.freeze({
        init,

        updateInputsFromModel:
        syncAll,

        toDisplay:
        units.toDisplay,

        toMeters:
        units.toMeters,

        saveDesign:
        actions.saveDesign,

        renderGallery:
        actions.renderGallery,

        renderCompare:
        actions.renderCompare
    });
}