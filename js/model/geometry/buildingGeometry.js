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
    createAwningGeometry
} from './AwningGeometry.js';

import {
    createMezzanineGeometry
} from './MezzanineGeometry.js';

import {
    createCraneGeometry
} from './CraneGeometry.js';

import {
    createDrivewayGeometry
} from './DrivewayGeometry.js';

import {
    createLinerGeometry
} from './LinerGeometry.js';

import {
    createPanelSystem
} from '../panels/PanelSystem.js';

import {
    createPanelGeometry
} from '../panels/PanelGeometry.js';

import {
    validateGeometryInvariants
} from './GeometryInvariants.js';

function createEmptyTrimGeometry() {
    return Object.freeze({
        eaves: Object.freeze([]),
        rake: Object.freeze([]),
        ridge: Object.freeze([]),
        roofEdges: Object.freeze([])
    });
}

function createEmptyGutterGeometry() {
    return Object.freeze({
        eaves: Object.freeze([]),
        downspouts: Object.freeze([]),
        outlets: Object.freeze([]),
        anchors: Object.freeze([])
    });
}

function createLogoGeometry(
    model,
    envelope
) {
    const config =
        model.logo;

    if (
        !config ||
        config.enabled === false
    ) {
        return Object.freeze({
            enabled: false,
            position: null,
            rotation: null,
            bounds: null
        });
    }

    return Object.freeze({
        enabled: true,

        position:
            config.position ??
            null,

        rotation:
            config.rotation ??
            null,

        bounds: null
    });
}

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
            walls
        );

    const structural =
        createStructuralGeometry(
            model,
            {
                envelope,
                walls,
                roof,
                foundation,
                openings
            },
            options.structural
        );

    const awnings =
        createAwningGeometry(
            model,
            envelope
        );

    const mezzanine =
        createMezzanineGeometry(
            model,
            envelope,
            walls,
            roof
        );

    const crane =
        createCraneGeometry(
            model,
            envelope,
            walls,
            roof
        );

    const driveway =
        createDrivewayGeometry(
            model,
            envelope
        );

    const liner =
        createLinerGeometry(
            model,
            envelope,
            openings
        );

    const geometrySource = {
        model,

        bounds:
            envelope.bounds,

        envelope,

        walls,

        roof,

        foundation,

        openings,

        frames:
            structural.frames,

        girts:
            structural.girts,

        purlins:
            structural.purlins,

        endWallColumns:
            structural.endWallColumns,

        structuralBounds:
            structural.bounds,

        awnings,

        mezzanine,

        crane,

        driveway,

        liner
    };

    const panelSystem =
        createPanelSystem(
            model,
            geometrySource
        );

    const panels =
        createPanelGeometry(
            model,
            geometrySource,
            panelSystem
        );

    const trims =
        createEmptyTrimGeometry();

    const gutters =
        createEmptyGutterGeometry();

    const logo =
        createLogoGeometry(
            model,
            envelope
        );

    const geometry =
        createBuildingGeometryContract({
            ...geometrySource,

            panels,

            wainscot:
                panels.wainscot,

            trims,

            ridge:
                roof.ridge,

            gutters,

            logo
        });

    validateGeometryInvariants(
        model,
        geometry
    );

    return geometry;
}