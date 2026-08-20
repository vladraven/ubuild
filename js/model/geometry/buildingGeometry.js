import {
    createBuildingGeometryContract
} from './BuildingGeometryContract.js';

import {
    createBuildingEnvelope
} from './BuildingEnvelope.js';

import {
    createWallGeometry
} from './WallGeometry.js';

import {
    createRoofGeometry
} from './RoofGeometry.js';

import {
    createFoundationGeometry
} from './FoundationGeometry.js';

import {
    createOpeningGeometry
} from './OpeningGeometry.js';

import {
    createStructuralGeometry
} from './StructuralGeometry.js';

import {
    createPanelSystem
} from '../panels/PanelSystem.js';

import {
    createPanelGeometry
} from '../panels/PanelGeometry.js';

import {
    validateGeometryInvariants
} from './GeometryInvariants.js';

export function createBuildingGeometry(
    model,
    options = {}
) {
    if (
        !model ||
        typeof model !== 'object'
    ) {
        throw new TypeError(
            'BuildingModel is required'
        );
    }

    const envelope =
        createBuildingEnvelope(
            model
        );

    const walls =
        createWallGeometry(
            model,
            envelope
        );

    const roof =
        createRoofGeometry(
            model,
            envelope,
            walls
        );

    const foundation =
        createFoundationGeometry(
            model,
            envelope
        );

    const openings =
        createOpeningGeometry(
            model,
            envelope,
            walls,
            roof
        );

    const baseGeometry = {
        model,
        envelope,
        walls,
        roof,
        foundation,
        openings
    };

    const structural =
        createStructuralGeometry(
            model,
            baseGeometry,
            options.structural
        );

    const geometryWithStructural = {
        ...baseGeometry,
        ...structural
    };

    const panelSystem =
        createPanelSystem(
            model,
            geometryWithStructural
        );

    const panels =
        createPanelGeometry(
            model,
            geometryWithStructural,
            panelSystem
        );

    const geometry =
        createBuildingGeometryContract({
            ...geometryWithStructural,

            panels,

            wainscot:
                panels.wainscot,

            trims:
                options.trims ?? null,

            ridge:
                roof.ridge,

            gutters:
                options.gutters ?? null,

            awnings:
                options.awnings ?? null,

            liner:
                options.liner ?? null,

            mezzanine:
                options.mezzanine ?? null,

            crane:
                options.crane ?? null,

            driveway:
                options.driveway ?? null,

            logo:
                options.logo ?? null
        });

    validateGeometryInvariants(
        model,
        geometry
    );

    return geometry;
}