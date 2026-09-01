import {
    OPENING_TYPES,
    OPENING_SIDES,
    OPENING_DEFAULTS,
    generateOpeningId,
    findValidOpeningPosition,
    clampOpeningToWall
}
from '../../model/openings/OpeningSchema.js';

const METERS_TO_FEET =
    3.28084;

const FEET_TO_METERS =
    0.3048;

const DEFAULT_SIDE =
    'F';

const MIN_OPENING_SIZE =
    0.5;

const MAX_OPENING_SIZE =
    40;

const SIDE_LABELS =
    Object.freeze({
        F:
            'Front Wall',

        B:
            'Back Wall',

        L:
            'Left Wall',

        R:
            'Right Wall'
    });

const SIDE_SHORT_LABELS =
    Object.freeze({
        F:
            'Front',

        B:
            'Back',

        L:
            'Left',

        R:
            'Right'
    });

const OPENING_TYPE_VALUES =
    Object.freeze(
        Object.values(
            OPENING_TYPES
        )
    );

function getElement(
    id
) {
    return document.getElementById(
        id
    );
}

function stopCameraAutoRotation(
    runtime
) {
    const controls =
        runtime?.cameraControls?.controls ||
        runtime?.controls;

    if (
        controls &&
        controls.autoRotate
    ) {
        controls.autoRotate =
            false;
    }
}

function getDisplayUnit(
    units
) {
    return units.isImperial()
        ? 'ft'
        : 'm';
}

function toDisplay(
    value,
    units
) {
    const number =
        Number(
            value
        );

    if (
        !Number.isFinite(
            number
        )
    ) {
        return 0;
    }

    if (
        !units.isImperial()
    ) {
        return number;
    }

    return (
        number *
        METERS_TO_FEET
    );
}

function toMeters(
    value,
    units
) {
    const number =
        Number(
            value
        );

    if (
        !Number.isFinite(
            number
        )
    ) {
        return 0;
    }

    if (
        !units.isImperial()
    ) {
        return number;
    }

    return (
        number *
        FEET_TO_METERS
    );
}

function getWallLength(
    side,
    dimensions
) {
    if (
        side === 'F' ||
        side === 'B'
    ) {
        return dimensions.width;
    }

    return dimensions.length;
}

function getWallCenterX(
    side,
    dimensions
) {
    if (
        side === 'F' ||
        side === 'B'
    ) {
        return 0;
    }

    return (
        dimensions.length /
        2
    );
}

function getSpawnX(
    side,
    dimensions
) {
    if (
        side === 'F' ||
        side === 'B'
    ) {
        return 0;
    }

    return (
        dimensions.length /
        2
    );
}

function normalizeOpening(
    opening,
    dimensions
) {
    return clampOpeningToWall(
        {
            ...opening
        },
        dimensions
    );
}

function createOpening(
    side,
    type,
    model
) {
    const defaults =
        OPENING_DEFAULTS[
            type
        ];

    if (
        !defaults
    ) {
        throw new RangeError(
            `Unsupported opening type: ${type}`
        );
    }

    const opening =
        {
            id:
                generateOpeningId(),

            type,

            side,

            x:
                getSpawnX(
                    side,
                    model.dimensions
                ),

            width:
                defaults.width,

            height:
                defaults.height,

            yOff:
                defaults.yOff
        };

    return findValidOpeningPosition(
        opening,
        model.openings ||
            [],
        model.dimensions
    );
}

function createOption(
    value,
    label
) {
    const option =
        document.createElement(
            'option'
        );

    option.value =
        value;

    option.textContent =
        label;

    return option;
}

function createOpeningRow(
    opening,
    units
) {
    const sideLabel =
        SIDE_SHORT_LABELS[
            opening.side
        ] ||
        opening.side;

    const unit =
        getDisplayUnit(
            units
        );

    const width =
        toDisplay(
            opening.width,
            units
        );

    const height =
        toDisplay(
            opening.height,
            units
        );

    const row =
        document.createElement(
            'div'
        );

    row.className =
        'row mb-2';

    row.innerHTML =
        `
            <div class="col-12 d-flex justify-content-between align-items-center mb-1">
                <span class="small">
                    <b>${sideLabel}</b>: ${opening.type}
                </span>

                <span
                    class="btn-delete py-1 px-2 rounded-1 d-inline-block border-dark"
                    role="button"
                    style="border:1px solid; font-size:12px;"
                    data-opening-action="delete"
                    data-id="${opening.id}"
                >
                    Delete
                </span>
            </div>

            <div class="col-6">
                <div class="input-group mb-2">
                    <span class="input-group-text px-1">
                        W
                    </span>

                    <input
                        type="number"
                        class="form-control op-dim-input op-width-input text-end"
                        data-opening-action="width"
                        data-id="${opening.id}"
                        value="${width.toFixed(1)}"
                        step="0.5"
                        min="0.5"
                        max="40"
                    >

                    <span class="input-group-text px-1">
                        ${unit}
                    </span>
                </div>
            </div>

            <div class="col-6">
                <div class="input-group mb-2">
                    <span class="input-group-text px-1">
                        H
                    </span>

                    <input
                        type="number"
                        class="form-control op-dim-input op-height-input text-end"
                        data-opening-action="height"
                        data-id="${opening.id}"
                        value="${height.toFixed(1)}"
                        step="0.5"
                        min="0.5"
                        max="40"
                    >

                    <span class="input-group-text px-1">
                        ${unit}
                    </span>
                </div>
            </div>
        `;

    return row;
}

export function createOpeningsController({
    runtime,
    units,
    onChange
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime is required for OpeningsController'
        );
    }

    if (
        !units
    ) {
        throw new TypeError(
            'UnitsController is required for OpeningsController'
        );
    }

    if (
        onChange !== undefined &&
        typeof onChange !== 'function'
    ) {
        throw new TypeError(
            'OpeningsController onChange must be a function'
        );
    }

    let initialized =
        false;

    function getCurrentModel() {
        return runtime.model;
    }

    function updateModel(
        openings
    ) {
        runtime.update({
            ...getCurrentModel(),
            openings
        });

        if (
            onChange
        ) {
            onChange();
        }
    }

    function populateWallSelect() {
        const select =
            getElement(
                'addOpeningWall'
            );

        if (
            !select
        ) {
            return;
        }

        const currentValue =
            select.value;

        select.innerHTML =
            '';

        for (
            const side
            of OPENING_SIDES
        ) {
            select.appendChild(
                createOption(
                    side,
                    SIDE_LABELS[
                        side
                    ]
                )
            );
        }

        select.value =
            OPENING_SIDES.includes(
                currentValue
            )
                ? currentValue
                : DEFAULT_SIDE;
    }

    function populateTypeSelect() {
        const select =
            getElement(
                'addOpeningType'
            );

        if (
            !select
        ) {
            return;
        }

        const currentValue =
            select.value;

        select.innerHTML =
            '';

        for (
            const type
            of OPENING_TYPE_VALUES
        ) {
            select.appendChild(
                createOption(
                    type,
                    type
                )
            );
        }

        select.value =
            OPENING_TYPE_VALUES.includes(
                currentValue
            )
                ? currentValue
                : OPENING_TYPE_VALUES[
                    0
                ];
    }

    function syncFromModel() {
        const list =
            getElement(
                'openingsList'
            );

        if (
            !list
        ) {
            return;
        }

        list.innerHTML =
            '';

        const openings =
            getCurrentModel()
                .openings ||
            [];

        for (
            const opening
            of openings
        ) {
            list.appendChild(
                createOpeningRow(
                    opening,
                    units
                )
            );
        }
    }

    function addOpening() {
        const wallSelect =
            getElement(
                'addOpeningWall'
            );

        const typeSelect =
            getElement(
                'addOpeningType'
            );

        if (
            !wallSelect ||
            !typeSelect
        ) {
            return;
        }

        const side =
            wallSelect.value;

        const type =
            typeSelect.value;

        if (
            !OPENING_SIDES.includes(
                side
            )
        ) {
            return;
        }

        if (
            !OPENING_TYPE_VALUES.includes(
                type
            )
        ) {
            return;
        }

        stopCameraAutoRotation(
            runtime
        );

        const model =
            getCurrentModel();

        const opening =
            createOpening(
                side,
                type,
                model
            );

        updateModel(
            [
                ...model.openings,
                opening
            ]
        );

        syncFromModel();
    }

    function updateOpeningDimension(
        id,
        field,
        rawValue
    ) {
        if (
            field !== 'width' &&
            field !== 'height'
        ) {
            return;
        }

        const displayValue =
            Number(
                rawValue
            );

        if (
            !Number.isFinite(
                displayValue
            )
        ) {
            return;
        }

        const meters =
            toMeters(
                displayValue,
                units
            );

        if (
            meters <=
            0
        ) {
            return;
        }

        const model =
            getCurrentModel();

        const openings =
            model.openings.map(
                (
                    opening
                ) => {
                    if (
                        opening.id !==
                        id
                    ) {
                        return opening;
                    }

                    const next =
                        {
                            ...opening,

                            [field]:
                                meters
                        };

                    return normalizeOpening(
                        next,
                        model.dimensions
                    );
                }
            );

        updateModel(
            openings
        );

        syncFromModel();
    }

    function deleteOpening(
        id
    ) {
        stopCameraAutoRotation(
            runtime
        );

        const model =
            getCurrentModel();

        const openings =
            model.openings.filter(
                (
                    opening
                ) =>
                    opening.id !==
                    id
            );

        updateModel(
            openings
        );

        syncFromModel();
    }

    function bindAddButton() {
        const button =
            getElement(
                'btnAddOpening'
            );

        if (
            !button
        ) {
            return;
        }

        button.addEventListener(
            'click',
            addOpening
        );
    }

    function bindList() {
        const list =
            getElement(
                'openingsList'
            );

        if (
            !list
        ) {
            return;
        }

        list.addEventListener(
            'change',
            (
                event
            ) => {
                const target =
                    event.target;

                if (
                    !(
                        target instanceof
                        HTMLInputElement
                    )
                ) {
                    return;
                }

                const action =
                    target.dataset
                        .openingAction;

                if (
                    action !== 'width' &&
                    action !== 'height'
                ) {
                    return;
                }

                const id =
                    target.dataset.id;

                if (
                    !id
                ) {
                    return;
                }

                updateOpeningDimension(
                    id,
                    action,
                    target.value
                );
            }
        );

        list.addEventListener(
            'click',
            (
                event
            ) => {
                const target =
                    event.target.closest(
                        '[data-opening-action="delete"]'
                    );

                if (
                    !target
                ) {
                    return;
                }

                const id =
                    target.dataset.id;

                if (
                    !id
                ) {
                    return;
                }

                deleteOpening(
                    id
                );
            }
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

        populateWallSelect();

        populateTypeSelect();

        bindAddButton();

        bindList();

        syncFromModel();
    }

    return Object.freeze({
        bind,

        syncFromModel,

        addOpening,

        deleteOpening
    });
}