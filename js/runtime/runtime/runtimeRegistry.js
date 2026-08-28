import {
    createElementRegistry,

    WallOrchestrator,
    RoofOrchestrator,
    FoundationOrchestrator,
    StructuralOrchestrator,
    OpeningOrchestrator,
    WainscotOrchestrator,
    TrimOrchestrator,
    GuttersOrchestrator,
    RidgeOrchestrator,
    MezzanineOrchestrator,
    CraneOrchestrator,
    LinerOrchestrator,
    DrivewayOrchestrator,
    LogoOrchestrator,
    AwningElement
} from './runtimeImports.js';

export function createRegistry() {
    const registry =
        createElementRegistry();

    registry.register(
        'foundation',
        FoundationOrchestrator
    );

    registry.register(
        'structural',
        StructuralOrchestrator
    );

    registry.register(
        'walls',
        WallOrchestrator
    );

    registry.register(
        'roof',
        RoofOrchestrator
    );

    registry.register(
        'wainscot',
        WainscotOrchestrator
    );

    registry.register(
        'openings',
        OpeningOrchestrator
    );

    registry.register(
        'trims',
        TrimOrchestrator
    );

    registry.register(
        'ridge',
        RidgeOrchestrator
    );

    registry.register(
        'gutters',
        GuttersOrchestrator
    );

    registry.register(
        'mezzanine',
        MezzanineOrchestrator
    );

    registry.register(
        'crane',
        CraneOrchestrator
    );

    registry.register(
        'liner',
        LinerOrchestrator
    );

    registry.register(
        'driveway',
        DrivewayOrchestrator
    );

    registry.register(
        'logo',
        LogoOrchestrator
    );

    registry.register(
        'awnings',
        AwningElement
    );

    return registry;
}