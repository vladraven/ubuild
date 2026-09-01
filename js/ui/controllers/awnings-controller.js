const SIDES =
    Object.freeze([
        'L',
        'R',
        'F',
        'B'
    ]);

const SETTINGS_PREFIX =
    'ltSettings';

const TOGGLE_PREFIX =
    'ltEn';

const DEFAULT_DEPTH =
    3;

const DEFAULT_PITCH =
    1;

const MIN_DEPTH =
    0;

const MIN_DROP =
    0;

const MIN_CUT =
    0;

const MAX_DEPTH_DIVISOR =
    2;

const SIDE_FIELDS =
    Object.freeze({
        drop: Object.freeze({
            control: 'ltDrop',
            target: 'drop'
        }),

        depth: Object.freeze({
            control: 'ltDepth',
            target: 'depth'
        }),

        pitch: Object.freeze({
            control: 'ltPitch',
            target: 'pitch'
        }),

        cutL: Object.freeze({
            control: 'ltCutL',
            target: 'cutL'
        }),

        cutR: Object.freeze({
            control: 'ltCutR',
            target: 'cutR'
        })
    });

const SIDE_DEFAULTS =
    Object.freeze({
        active: false,

        depth:
            DEFAULT_DEPTH,

        drop: 0,

        pitch:
            DEFAULT_PITCH,

        cutL: 0,

        cutR: 0,

        wallF: false,

        wallL: false,

        wallR: false
    });

function getElement(
    id
) {
    return document.getElementById(
        id
    );
}

function getSettings(
    side
) {
    return getElement(
        `${SETTINGS_PREFIX}${side}`
    );
}

function getControl(
    side,
    id
) {
    const settings =
        getSettings(
            side
        );

    if (
        settings
    ) {
        const control =
            settings.querySelector(
                `[id="${id}"]`
            );

        if (
            control
        ) {
            return control;
        }
    }

    return getElement(
        id
    );
}

function getValueControl(
    side,
    id
) {
    return getControl(
        side,
        `${id}_val`
    );
}

function getNumber(
    value,
    fallback
) {
    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}

function clamp(
    value,
    min,
    max
) {
    return Math.min(
        Math.max(
            value,
            min
        ),
        max
    );
}

function setVisible(
    element,
    visible
) {
    if (
        !element
    ) {
        return;
    }

    element.style.display =
        visible
            ? 'block'
            : 'none';
}

function getDepthLimit(
    model
) {
    return Math.max(
        MIN_DEPTH,
        (
            getNumber(
                model?.dimensions?.width,
                0
            ) /
            MAX_DEPTH_DIVISOR
        )
    );
}

function getSide(
    model,
    side
) {
    return {
        ...SIDE_DEFAULTS,
        ...model.awnings?.[side]
    };
}

function getControlId(
    side,
    field
) {
    if (
        field ===
        'cutL'
    ) {
        return `ltCutL${side}`;
    }

    if (
        field ===
        'cutR'
    ) {
        // Right has a duplicate ltCutRB in the current HTML.
        return side === 'R'
            ? 'ltCutRB'
            : `ltCutR${side}`;
    }

    return `${SIDE_FIELDS[field].control}${side}`;
}

function getWallId(
    side,
    wall
) {
    return `ltWall${wall}${side}`;
}

function getPatch(
    model,
    side,
    patch
) {
    return {
        awnings: {
            ...model.awnings,

            [side]: {
                ...getSide(
                    model,
                    side
                ),

                ...patch
            }
        }
    };
}

function getDistance(
    units,
    control,
    fallback
) {
    if (
        !control
    ) {
        return fallback;
    }

    return units.toMeters(
        control.value
    );
}

function formatDistance(
    units,
    value
) {
    return units.toDisplay(
        value
    );
}

function setDistance(
    units,
    side,
    id,
    value
) {
    const control =
        getControl(
            side,
            id
        );

    const target =
        getValueControl(
            side,
            id
        );

    const display =
        formatDistance(
            units,
            value
        );

    if (
        control
    ) {
        control.value =
            display;

        control.setAttribute(
            'data-current-m',
            String(
                value
            )
        );
    }

    if (
        target
    ) {
        target.value =
            display;
    }
}

export function createAwningsController({
    runtime,
    units,
    update
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for AwningsController'
        );
    }

    if (
        !units
    ) {
        throw new TypeError(
            'UnitsController is required for AwningsController'
        );
    }

    if (
        typeof update !==
        'function'
    ) {
        throw new TypeError(
            'update function is required for AwningsController'
        );
    }

    let initialized =
        false;

    function updateSide(
        side,
        patch
    ) {
        update(
            getPatch(
                runtime.model,
                side,
                patch
            )
        );
    }

    function bindToggle(
        side
    ) {
        const toggle =
            getElement(
                `${TOGGLE_PREFIX}${side}`
            );

        if (
            !toggle
        ) {
            return;
        }

        toggle.addEventListener(
            'change',
            (
                event
            ) => {
                const current =
                    getSide(
                        runtime.model,
                        side
                    );

                const enabled =
                    event.target.checked;

                // Restore legacy defaults when an untouched awning is enabled.
                const depth =
                    current.depth > 0
                        ? current.depth
                        : DEFAULT_DEPTH;

                const pitch =
                    current.pitch > 0
                        ? current.pitch
                        : DEFAULT_PITCH;

                updateSide(
                    side,
                    {
                        active:
                            enabled,

                        depth,

                        pitch
                    }
                );
            }
        );
    }

    function bindDistance(
        side,
        field,
        min,
        max
    ) {
        const id =
            getControlId(
                side,
                field
            );

        const control =
            getControl(
                side,
                id
            );

        const target =
            getValueControl(
                side,
                id
            );

        if (
            !control
        ) {
            return;
        }

        const apply =
            (
                value
            ) => {
                const meters =
                    clamp(
                        getDistance(
                            units,
                            control,
                            value
                        ),
                        min,
                        max()
                    );

                updateSide(
                    side,
                    {
                        [
                            SIDE_FIELDS[field]
                                .target
                        ]:
                            meters
                    }
                );
            };

        control.addEventListener(
            'input',
            (
                event
            ) => {
                if (
                    target
                ) {
                    target.value =
                        event.target.value;
                }

                apply(
                    getNumber(
                        event.target.value,
                        min
                    )
                );
            }
        );

        if (
            !target
        ) {
            return;
        }

        target.addEventListener(
            'change',
            (
                event
            ) => {
                const display =
                    clamp(
                        getNumber(
                            event.target.value,
                            min
                        ),
                        Number(
                            control.min
                        ) ||
                            min,
                        Number(
                            control.max
                        ) ||
                            units.toDisplay(
                                max()
                            )
                    );

                event.target.value =
                    display;

                control.value =
                    display;

                apply(
                    display
                );
            }
        );
    }

    function bindPitch(
        side
    ) {
        const id =
            getControlId(
                side,
                'pitch'
            );

        const control =
            getControl(
                side,
                id
            );

        const target =
            getValueControl(
                side,
                id
            );

        if (
            !control
        ) {
            return;
        }

        const apply =
            (
                value
            ) => {
                updateSide(
                    side,
                    {
                        pitch:
                            getNumber(
                                value,
                                DEFAULT_PITCH
                            )
                    }
                );
            };

        control.addEventListener(
            'input',
            (
                event
            ) => {
                if (
                    target
                ) {
                    target.value =
                        event.target.value;
                }

                apply(
                    event.target.value
                );
            }
        );

        if (
            !target
        ) {
            return;
        }

        target.addEventListener(
            'change',
            (
                event
            ) => {
                const value =
                    getNumber(
                        event.target.value,
                        DEFAULT_PITCH
                    );

                event.target.value =
                    value;

                control.value =
                    value;

                apply(
                    value
                );
            }
        );
    }

    function bindWall(
        side,
        wall
    ) {
        const control =
            getControl(
                side,
                getWallId(
                    side,
                    wall
                )
            );

        if (
            !control
        ) {
            return;
        }

        control.addEventListener(
            'change',
            (
                event
            ) => {
                updateSide(
                    side,
                    {
                        [
                            `wall${wall}`
                        ]:
                            event.target.checked
                    }
                );
            }
        );
    }

    function bindSide(
        side
    ) {
        bindToggle(
            side
        );

        bindDistance(
            side,
            'drop',
            MIN_DROP,
            () =>
                runtime.model
                    .dimensions
                    .height
        );

        bindDistance(
            side,
            'depth',
            MIN_DEPTH,
            () =>
                getDepthLimit(
                    runtime.model
                )
        );

        bindPitch(
            side
        );

        bindDistance(
            side,
            'cutL',
            MIN_CUT,
            () =>
                side === 'L' ||
                side === 'R'
                    ? runtime.model
                        .dimensions
                        .length
                    : runtime.model
                        .dimensions
                        .width
        );

        bindDistance(
            side,
            'cutR',
            MIN_CUT,
            () =>
                side === 'L' ||
                side === 'R'
                    ? runtime.model
                        .dimensions
                        .length
                    : runtime.model
                        .dimensions
                        .width
        );

        bindWall(
            side,
            'L'
        );

        bindWall(
            side,
            'R'
        );

        bindWall(
            side,
            'F'
        );
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
            const side of SIDES
        ) {
            bindSide(
                side
            );
        }
    }

    function syncDepthLimit(
        side,
        model
    ) {
        const control =
            getControl(
                side,
                getControlId(
                    side,
                    'depth'
                )
            );

        if (
            !control
        ) {
            return;
        }

        const max =
            getDepthLimit(
                model
            );

        control.max =
            formatDistance(
                units,
                max
            );

        control.setAttribute(
            'data-m-max',
            String(
                max
            )
        );
    }

    function syncSide(
        side,
        model
    ) {
        const state =
            getSide(
                model,
                side
            );

        const toggle =
            getElement(
                `${TOGGLE_PREFIX}${side}`
            );

        if (
            toggle
        ) {
            toggle.checked =
                state.active;
        }

        setVisible(
            getSettings(
                side
            ),
            state.active
        );

        syncDepthLimit(
            side,
            model
        );

        setDistance(
            units,
            side,
            getControlId(
                side,
                'drop'
            ),
            state.drop
        );

        setDistance(
            units,
            side,
            getControlId(
                side,
                'depth'
            ),
            Math.min(
                state.depth,
                getDepthLimit(
                    model
                )
            )
        );

        const pitch =
            getControl(
                side,
                getControlId(
                    side,
                    'pitch'
                )
            );

        const pitchValue =
            getValueControl(
                side,
                getControlId(
                    side,
                    'pitch'
                )
            );

        if (
            pitch
        ) {
            pitch.value =
                state.pitch;
        }

        if (
            pitchValue
        ) {
            pitchValue.value =
                state.pitch;
        }

        setDistance(
            units,
            side,
            getControlId(
                side,
                'cutL'
            ),
            state.cutL
        );

        setDistance(
            units,
            side,
            getControlId(
                side,
                'cutR'
            ),
            state.cutR
        );

        for (
            const wall of [
                'L',
                'R',
                'F'
            ]
        ) {
            const control =
                getControl(
                    side,
                    getWallId(
                        side,
                        wall
                    )
                );

            if (
                control
            ) {
                control.checked =
                    Boolean(
                        state[
                            `wall${wall}`
                        ]
                    );
            }
        }
    }

    function syncFromModel() {
        for (
            const side of SIDES
        ) {
            syncSide(
                side,
                runtime.model
            );
        }
    }

    return Object.freeze({
        bind,

        syncFromModel
    });
}