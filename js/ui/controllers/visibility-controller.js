import {
    setElementChecked
} from '../dom-helpers.js';

const VISIBILITY_CONTROLS =
    Object.freeze({
        roof:
            Object.freeze([
                '#checkRoof',
                '#vis-roof',
                '[data-vis="roof"]'
            ]),

        labels:
            Object.freeze([
                '#checkLabels',
                '#vis-labels',
                '[data-vis="labels"]'
            ]),

        trims:
            Object.freeze([
                '#checkTrims',
                '#vis-trims',
                '[data-vis="trims"]'
            ]),

        girts:
            Object.freeze([
                '#checkGirts',
                '#vis-girts',
                '[data-vis="girts"]'
            ]),

        purlins:
            Object.freeze([
                '#checkPurlins',
                '#vis-purlins',
                '[data-vis="purlins"]'
            ]),

        endWallColumns:
            Object.freeze([
                '#checkEWColumns',
                '#vis-end-wall-columns',
                '[data-vis="endWallColumns"]'
            ]),

        gutters:
            Object.freeze([
                '#checkGutters',
                '#vis-gutters',
                '[data-vis="gutters"]'
            ]),

        walls:
            Object.freeze([
                '#vis-walls',
                '[data-vis="walls"]'
            ]),

        foundation:
            Object.freeze([
                '#vis-foundation',
                '[data-vis="foundation"]'
            ]),

        panels:
            Object.freeze([
                '#vis-panels',
                '[data-vis="panels"]'
            ]),

        wainscot:
            Object.freeze([
                '#vis-wainscot',
                '[data-vis="wainscot"]'
            ]),

        openings:
            Object.freeze([
                '#vis-openings',
                '[data-vis="openings"]'
            ]),

        frames:
            Object.freeze([
                '#vis-frames',
                '[data-vis="frames"]'
            ]),

        ridge:
            Object.freeze([
                '#vis-ridge',
                '[data-vis="ridge"]'
            ]),

        awnings:
            Object.freeze([
                '#vis-awnings',
                '[data-vis="awnings"]'
            ]),

        liner:
            Object.freeze([
                '#vis-liner',
                '[data-vis="liner"]'
            ]),

        mezzanine:
            Object.freeze([
                '#vis-mezzanine',
                '[data-vis="mezzanine"]'
            ]),

        crane:
            Object.freeze([
                '#vis-crane',
                '[data-vis="crane"]'
            ]),

        driveway:
            Object.freeze([
                '#vis-driveway',
                '[data-vis="driveway"]'
            ]),

        logo:
            Object.freeze([
                '#vis-logo',
                '[data-vis="logo"]'
            ])
    });

const WALL_CONTROLS =
    Object.freeze([
        '#wF',
        '#wB',
        '#wL',
        '#wR'
    ]);

function getElement(
    selectors
) {
    for (
        const selector of selectors
    ) {
        const element =
            document.querySelector(
                selector
            );

        if (
            element
        ) {
            return element;
        }
    }

    return null;
}

function getWallControls() {
    return WALL_CONTROLS
        .map(
            (
                selector
            ) =>
                document.querySelector(
                    selector
                )
        )
        .filter(
            Boolean
        );
}

export function createVisibilityController({
    runtime,
    update
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for VisibilityController'
        );
    }

    if (
        typeof update !==
        'function'
    ) {
        throw new TypeError(
            'update function is required for VisibilityController'
        );
    }

    let initialized =
        false;

    function updateVisibility(
        key,
        visible
    ) {
        update({
            visibility: {
                ...runtime.model.visibility,

                [key]:
                    visible
            }
        });
    }

    function bindControl(
        key,
        selectors
    ) {
        const element =
            getElement(
                selectors
            );

        if (
            !element ||
            element.type !==
            'checkbox'
        ) {
            return;
        }

        element.addEventListener(
            'change',
            (
                event
            ) => {
                updateVisibility(
                    key,
                    event.target.checked
                );
            }
        );
    }

    function bindWalls() {
        for (
            const control of
            getWallControls()
        ) {
            control.addEventListener(
                'change',
                () => {
                    const walls =
                        getWallControls();

                    if (
                        walls.length ===
                        0
                    ) {
                        return;
                    }

                    // The model currently exposes one global walls flag.
                    updateVisibility(
                        'walls',
                        walls.some(
                            (
                                element
                            ) =>
                                element.checked
                        )
                    );
                }
            );
        }
    }

    function bind() {
        if (
            initialized
        ) {
            return;
        }

        initialized =
            true;

        for (
            const [
                key,
                selectors
            ]
            of Object.entries(
                VISIBILITY_CONTROLS
            )
        ) {
            bindControl(
                key,
                selectors
            );
        }

        bindWalls();
    }

    function syncWalls(
        visible
    ) {
        for (
            const control of
            getWallControls()
        ) {
            control.checked =
                visible;
        }
    }

    function syncFromModel() {
        const visibility =
            runtime.model.visibility;

        if (
            !visibility
        ) {
            return;
        }

        for (
            const [
                key,
                selectors
            ]
            of Object.entries(
                VISIBILITY_CONTROLS
            )
        ) {
            setElementChecked(
                selectors,
                visibility[
                    key
                ] !==
                    false
            );
        }

        syncWalls(
            visibility.walls !==
                false
        );
    }

    return Object.freeze({
        bind,

        syncFromModel
    });
}