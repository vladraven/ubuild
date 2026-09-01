const LINER_TOGGLE_ID =
    'intWallsEn';

const LINER_SETTINGS_ID =
    'intWallsSettings';

const LINER_HEIGHT_ID =
    'intWallsH';

const LINER_HEIGHT_VALUE_ID =
    'valIntWallsH';

const MEZZANINE_TOGGLE_ID =
    'mezzEn';

const MEZZANINE_SETTINGS_ID =
    'mezzSettings';

const CRANE_TOGGLE_ID =
    'craneEn';

const CRANE_SETTINGS_ID =
    'craneSettings';

const MIN_LINER_PERCENT =
    60;

const MAX_LINER_PERCENT =
    100;

const DEFAULT_LINER_PERCENT =
    100;

const DEFAULT_LINER_THICKNESS =
    0.01;

const DEFAULT_MEZZANINE_COVERAGE =
    1;

const DEFAULT_MEZZANINE_HEIGHT_PERCENT =
    0.5;

const DEFAULT_CRANE_Z_PERCENT =
    0.5;

function getElement(
    id
) {
    return document.getElementById(
        id
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
    id,
    visible
) {
    const element =
        getElement(
            id
        );

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

function getLinerPercent(
    model
) {
    const buildingHeight =
        getNumber(
            model?.dimensions?.height,
            0
        );

    const linerHeight =
        getNumber(
            model?.liner?.height,
            0
        );

    if (
        buildingHeight <= 0 ||
        linerHeight <= 0
    ) {
        return DEFAULT_LINER_PERCENT;
    }

    return clamp(
        (
            linerHeight /
            buildingHeight
        ) *
        100,
        MIN_LINER_PERCENT,
        MAX_LINER_PERCENT
    );
}

function getMezzanineConfig(
    model,
    enabled
) {
    const current =
        model.mezzanine ||
        {};

    const buildingHeight =
        getNumber(
            model.dimensions?.height,
            0
        );

    const currentHeight =
        getNumber(
            current.height,
            0
        );

    const currentCoverage =
        getNumber(
            current.coverage,
            0
        );

    const height =
        currentHeight > 0
            ? currentHeight
            : buildingHeight *
                DEFAULT_MEZZANINE_HEIGHT_PERCENT;

    const coverage =
        currentCoverage > 0
            ? currentCoverage
            : DEFAULT_MEZZANINE_COVERAGE;

    return {
        ...current,

        enabled,

        coverage,

        height,

        z:
            getNumber(
                current.z,
                0
            )
    };
}

function getCraneConfig(
    model,
    enabled
) {
    const current =
        model.crane ||
        {};

    const currentZ =
        getNumber(
            current.z,
            0
        );

    const currentZPercent =
        getNumber(
            current.zPercent,
            0
        );

    const useDefaultPosition =
        enabled &&
        currentZ === 0 &&
        currentZPercent === 0;

    const zPercent =
        useDefaultPosition
            ? DEFAULT_CRANE_Z_PERCENT
            : currentZPercent;

    return {
        ...current,

        enabled,

        z:
            zPercent,

        zPercent
    };
}

export function createInteriorOptionsController({
    runtime,
    update
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for InteriorOptionsController'
        );
    }

    if (
        typeof update !==
        'function'
    ) {
        throw new TypeError(
            'update function is required for InteriorOptionsController'
        );
    }

    let initialized =
        false;

    function updateLiner(
        enabled,
        percent
    ) {
        const model =
            runtime.model;

        const normalizedPercent =
            clamp(
                getNumber(
                    percent,
                    DEFAULT_LINER_PERCENT
                ),
                MIN_LINER_PERCENT,
                MAX_LINER_PERCENT
            );

        const height =
            model.dimensions.height *
            (
                normalizedPercent /
                100
            );

        update({
            liner: {
                ...model.liner,

                enabled,

                height,

                thickness:
                    getNumber(
                        model.liner?.thickness,
                        DEFAULT_LINER_THICKNESS
                    ) ||
                    DEFAULT_LINER_THICKNESS
            }
        });
    }

    function updateLinerHeight(
        value
    ) {
        const model =
            runtime.model;

        updateLiner(
            Boolean(
                model.liner?.enabled
            ),
            value
        );
    }

    function updateMezzanine(
        enabled
    ) {
        const model =
            runtime.model;

        update({
            mezzanine:
                getMezzanineConfig(
                    model,
                    enabled
                )
        });
    }

    function updateCrane(
        enabled
    ) {
        const model =
            runtime.model;

        update({
            crane:
                getCraneConfig(
                    model,
                    enabled
                )
        });
    }

    function bindLiner() {
        const toggle =
            getElement(
                LINER_TOGGLE_ID
            );

        if (
            toggle
        ) {
            toggle.addEventListener(
                'change',
                (
                    event
                ) => {
                    stopCameraAutoRotation(
                        runtime
                    );

                    const percent =
                        getNumber(
                            getElement(
                                LINER_HEIGHT_ID
                            )?.value,
                            getLinerPercent(
                                runtime.model
                            )
                        );

                    updateLiner(
                        event.target.checked,
                        percent
                    );
                }
            );
        }

        const slider =
            getElement(
                LINER_HEIGHT_ID
            );

        if (
            slider
        ) {
            slider.addEventListener(
                'input',
                (
                    event
                ) => {
                    stopCameraAutoRotation(
                        runtime
                    );

                    const input =
                        getElement(
                            LINER_HEIGHT_VALUE_ID
                        );

                    if (
                        input
                    ) {
                        input.value =
                            event.target.value;
                    }

                    updateLinerHeight(
                        event.target.value
                    );
                }
            );
        }

        const input =
            getElement(
                LINER_HEIGHT_VALUE_ID
            );

        if (
            !input
        ) {
            return;
        }

        input.addEventListener(
            'change',
            (
                event
            ) => {
                stopCameraAutoRotation(
                    runtime
                );

                const percent =
                    clamp(
                        getNumber(
                            event.target.value,
                            DEFAULT_LINER_PERCENT
                        ),
                        MIN_LINER_PERCENT,
                        MAX_LINER_PERCENT
                    );

                event.target.value =
                    percent;

                if (
                    slider
                ) {
                    slider.value =
                        percent;
                }

                updateLinerHeight(
                    percent
                );
            }
        );
    }

    function bindMezzanine() {
        const toggle =
            getElement(
                MEZZANINE_TOGGLE_ID
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
                stopCameraAutoRotation(
                    runtime
                );

                updateMezzanine(
                    event.target.checked
                );
            }
        );
    }

    function bindCrane() {
        const toggle =
            getElement(
                CRANE_TOGGLE_ID
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
                stopCameraAutoRotation(
                    runtime
                );

                updateCrane(
                    event.target.checked
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

        bindLiner();

        bindMezzanine();

        bindCrane();
    }

    function syncLiner() {
        const model =
            runtime.model;

        const enabled =
            Boolean(
                model.liner?.enabled
            );

        const percent =
            getLinerPercent(
                model
            );

        const toggle =
            getElement(
                LINER_TOGGLE_ID
            );

        if (
            toggle
        ) {
            toggle.checked =
                enabled;
        }

        const slider =
            getElement(
                LINER_HEIGHT_ID
            );

        if (
            slider
        ) {
            slider.value =
                percent;
        }

        const input =
            getElement(
                LINER_HEIGHT_VALUE_ID
            );

        if (
            input
        ) {
            input.value =
                percent;
        }

        setVisible(
            LINER_SETTINGS_ID,
            enabled
        );
    }

    function syncMezzanine() {
        const enabled =
            Boolean(
                runtime.model
                    .mezzanine
                    ?.enabled
            );

        const toggle =
            getElement(
                MEZZANINE_TOGGLE_ID
            );

        if (
            toggle
        ) {
            toggle.checked =
                enabled;
        }

        setVisible(
            MEZZANINE_SETTINGS_ID,
            enabled
        );
    }

    function syncCrane() {
        const enabled =
            Boolean(
                runtime.model
                    .crane
                    ?.enabled
            );

        const toggle =
            getElement(
                CRANE_TOGGLE_ID
            );

        if (
            toggle
        ) {
            toggle.checked =
                enabled;
        }

        setVisible(
            CRANE_SETTINGS_ID,
            enabled
        );
    }

    function syncFromModel() {
        syncLiner();

        syncMezzanine();

        syncCrane();
    }

    return Object.freeze({
        bind,

        syncFromModel
    });
}