// js/model/geometry/buildingGeometry.js

import { createBuildingGeometryContract } from './BuildingGeometryContract.js';
import { createBuildingEnvelope } from './BuildingEnvelope.js';
import { createWallGeometry } from './WallGeometry.js';
import { createRoofGeometry } from './RoofGeometry.js';
import { createFoundationGeometry } from './FoundationGeometry.js';
import { createOpeningGeometry } from './OpeningGeometry.js';
import { createStructuralGeometry } from './StructuralGeometry.js';
import { createAwningGeometry } from './AwningGeometry.js';
import { createMezzanineGeometry } from './MezzanineGeometry.js';
import { createCraneGeometry } from './CraneGeometry.js';
import { createDrivewayGeometry } from './DrivewayGeometry.js';
import { createLinerGeometry } from './LinerGeometry.js';
import { createGuttersGeometry } from './GuttersGeometry.js';
import { createDownspoutGeometry } from './DownspoutGeometry.js';
import { createTrimsGeometry } from './TrimsGeometry.js';
import { createPanelSystem } from '../panels/PanelSystem.js';
import { createPanelGeometry } from '../panels/PanelGeometry.js';
import { validateGeometryInvariants } from './GeometryInvariants.js';

function createLogoGeometry(
    model,
    envelope
) {
    const config =
        model.logo;

    const visible =
        config &&
        config.enabled !== false &&
        model.visibility?.logo !== false;

    if (!visible) {
        return Object.freeze({
            enabled: false,
            position: null,
            rotation: null,
            bounds: null
        });
    }

    const logoWidth =
        config.width ||
        1.0;

    const logoHeight =
        config.height ||
        0.33;

    const plateThick =
        config.thickness ||
        0.08;

    const margin =
        config.margin ||
        0.15;

    const wallThickness =
        model.walls?.thickness ||
        0.15;

    const halfPlateH =
        (
            logoHeight +
            0.12
        ) / 2;

    const halfPlateW =
        (
            logoWidth +
            0.12
        ) / 2;

    const height =
        envelope.height;

    const halfW =
        envelope.width /
        2;

    const roof =
        model.roof ||
        {};

    const roofType =
        roof.type ||
        'gabled';

    const pitchRatio =
        Number(
            roof.pitchRatio
        ) ||
        0;

    let roofHAtLeftCorner =
        height;

    let roofHAtRightCorner =
        height;

    if (
        roofType ===
        'gabled'
    ) {
        roofHAtLeftCorner =
            height +
            (
                halfW -
                halfPlateW
            ) *
            pitchRatio;

        roofHAtRightCorner =
            roofHAtLeftCorner;
    } else if (
        roofType ===
        'left-sloped'
    ) {
        roofHAtLeftCorner =
            height +
            (
                halfW -
                halfPlateW
            ) *
            pitchRatio;

        roofHAtRightCorner =
            height +
            (
                halfW +
                halfPlateW
            ) *
            pitchRatio;
    } else if (
        roofType ===
        'right-sloped'
    ) {
        roofHAtLeftCorner =
            height +
            (
                halfW +
                halfPlateW
            ) *
            pitchRatio;

        roofHAtRightCorner =
            height +
            (
                halfW -
                halfPlateW
            ) *
            pitchRatio;
    }

    const minAvailableRoofH =
        Math.min(
            roofHAtLeftCorner,
            roofHAtRightCorner
        );

    const maxTopY =
        minAvailableRoofH -
        margin;

    const targetY =
        Math.max(
            maxTopY -
            halfPlateH,
            logoHeight / 2 +
            0.5
        );

    return Object.freeze({
        enabled: true,

        width:
            logoWidth,

        height:
            logoHeight,

        thickness:
            plateThick,

        position: {
            x: 0,

            y:
                targetY,

            z:
                envelope.bounds.min.z -
                wallThickness -
                plateThick / 2
        },

        rotation: {
            x: 0,
            y: Math.PI,
            z: 0
        },

        bounds:
            null
    });
}

export function createBuildingGeometry(
    model,
    options = {}
) {
    if (
        !model ||
        typeof model !==
            'object'
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

    const gutters =
        createGuttersGeometry(
            model,
            envelope,
            roof
        );

    const downspouts =
        createDownspoutGeometry(
            model,
            envelope,
            gutters
        );

    const trims =
        createTrimsGeometry(
            model,
            envelope,
            roof
        );

    const logo =
        createLogoGeometry(
            model,
            envelope
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

        liner,

        gutters,

        downspouts
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

    const geometry =
        createBuildingGeometryContract({
            ...geometrySource,

            panels,

            wainscot:
                panels.wainscot,

            trims,

            ridge:
                roof.ridge,

            logo
        });

    validateGeometryInvariants(
        model,
        geometry
    );

    return geometry;
}