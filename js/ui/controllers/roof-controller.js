import { setElementVal } from '../dom-helpers.js';

const ROOF_TYPE_GABLED =
    'gabled';

const ROOF_TYPE_LEFT_SLOPED =
    'left-sloped';

const ROOF_TYPE_RIGHT_SLOPED =
    'right-sloped';

const SSR_PROFILE_PATTERN =
    /ssr|snap/i;

export function createRoofController(
    {
        runtime,
        update,
        syncAll
    }
) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for RoofController'
        );
    }

    function formatPitchRatio(
        ratio
    ) {
        const pitch12 =
            Number(
                ratio
            ) * 12;

        const formatted =
            parseFloat(
                pitch12
                    .toFixed(1)
            )
                .toString();

        return `${formatted}:12`;
    }

    function parsePitchInput(
        raw
    ) {
        if (
            raw === undefined ||
            raw === null
        ) {
            return NaN;
        }

        const value =
            String(
                raw
            )
                .trim();

        const ratioMatch =
            value.match(
                /^([+-]?(?:\d+\.?\d*|\.\d+))\s*:\s*12$/i
            );

        if (
            ratioMatch
        ) {
            const rise =
                Number(
                    ratioMatch[1]
                );

            return Number.isFinite(
                rise
            )
                ? rise / 12
                : NaN;
        }

        const numeric =
            parseFloat(
                value
            );

        return Number.isFinite(
            numeric
        )
            ? numeric
            : NaN;
    }

    function getConstraints() {
        return window
            .ConfiguratorBackendConstraints ||
            {};
    }

    function getProfilePitchMax(
        profile,
        constraints
    ) {
        if (
            SSR_PROFILE_PATTERN.test(
                profile
            )
        ) {
            const ssrMax =
                Number(
                    constraints.pitch_ssr24 ??
                    0.1667
                );

            return Number.isFinite(
                ssrMax
            ) &&
            ssrMax > 0
                ? ssrMax
                : 0.1667;
        }

        const awrMax =
            Number(
                constraints.pitch_awr ??
                constraints.pitch_awr_max ??
                1
            );

        return Number.isFinite(
            awrMax
        ) &&
        awrMax > 0
            ? awrMax
            : 1;
    }

    function getPitchLimits() {
        const constraints =
            getConstraints();

        const profile =
            String(
                runtime
                    .model
                    .roof
                    ?.profile ||
                'awr'
            )
                .trim()
                .toLowerCase();

        const roofType =
            String(
                runtime
                    .model
                    .roof
                    ?.type ||
                ROOF_TYPE_GABLED
            )
                .trim()
                .toLowerCase();

        const pitchEl =
            document.getElementById(
                'inputPitch'
            ) ||
            document.querySelector(
                '#roof-pitch'
            ) ||
            document.querySelector(
                '#slider-pitch'
            );

        let min =
            Number(
                constraints.pitch_min ??
                0
            );

        let max =
            getProfilePitchMax(
                profile,
                constraints
            );

        let step =
            Number(
                constraints.pitch_step ??
                0.001
            );

        if (
            SSR_PROFILE_PATTERN.test(
                profile
            )
        ) {
            const ssrMin =
                Number(
                    constraints.pitch_ssr24_min
                );

            const ssrStep =
                Number(
                    constraints.pitch_ssr24_step
                );

            if (
                Number.isFinite(
                    ssrMin
                ) &&
                ssrMin >= 0
            ) {
                min =
                    ssrMin;
            }

            if (
                Number.isFinite(
                    ssrStep
                ) &&
                ssrStep > 0
            ) {
                step =
                    ssrStep;
            }
        }

        if (
            roofType ===
            ROOF_TYPE_LEFT_SLOPED ||
            roofType ===
            ROOF_TYPE_RIGHT_SLOPED
        ) {
            const slopedMax =
                Number(
                    constraints.pitch_sloped_max ??
                    0.1667
                );

            max =
                Math.min(
                    max,
                    Number.isFinite(
                        slopedMax
                    ) &&
                    slopedMax > 0
                        ? slopedMax
                        : 0.1667
                );
        }

        if (
            Number.isFinite(
                Number(
                    pitchEl?.min
                )
            ) &&
            Number(
                pitchEl.min
            ) >= 0
        ) {
            min =
                Math.max(
                    min,
                    Number(
                        pitchEl.min
                    )
                );
        }

        if (
            !Number.isFinite(
                min
            ) ||
            min < 0
        ) {
            min = 0;
        }

        if (
            !Number.isFinite(
                max
            ) ||
            max <= min
        ) {
            max =
                Math.max(
                    1,
                    min + 0.001
                );
        }

        if (
            !Number.isFinite(
                step
            ) ||
            step <= 0
        ) {
            step = 0.001;
        }

        return Object.freeze(
            {
                min,
                max,
                step
            }
        );
    }

    function clampPitch(
        ratio,
        limits
    ) {
        return Math.max(
            limits.min,
            Math.min(
                limits.max,
                ratio
            )
        );
    }

    function updatePitchControls() {
        const ratio =
            Number(
                runtime
                    .model
                    .roof
                    ?.pitchRatio ??
                0.05
            );

        const limits =
            getPitchLimits();

        const value =
            clampPitch(
                Number.isFinite(
                    ratio
                )
                    ? ratio
                    : limits.min,
                limits
            );

        for (
            const selector of [
                '#inputPitch',
                '#roof-pitch',
                '#slider-pitch'
            ]
        ) {
            const element =
                document.querySelector(
                    selector
                );

            if (
                !element
            ) {
                continue;
            }

            element.min =
                String(
                    limits.min
                );

            element.max =
                String(
                    limits.max
                );

            element.step =
                String(
                    limits.step
                );

            element.value =
                String(
                    value
                );
        }

        const formatted =
            formatPitchRatio(
                value
            );

        setElementVal(
            [
                '#valPitch',
                '#val-pitch'
            ],
            formatted
        );

        const minLabel =
            document.querySelector(
                '#lblMinPitch'
            );

        const maxLabel =
            document.querySelector(
                '#lblMaxPitch'
            );

        if (
            minLabel
        ) {
            minLabel.textContent =
                formatPitchRatio(
                    limits.min
                );
        }

        if (
            maxLabel
        ) {
            maxLabel.textContent =
                formatPitchRatio(
                    limits.max
                );
        }
    }

    function applyPitch(
        ratio
    ) {
        const limits =
            getPitchLimits();

        const clamped =
            clampPitch(
                ratio,
                limits
            );

        update(
            {
                roof:
                    {
                        ...runtime
                            .model
                            .roof,

                        pitchRatio:
                            clamped
                    }
            }
        );
    }

    function handlePitchChange(
        rawValue,
        fromSlider
    ) {
        let ratio;

        if (
            fromSlider
        ) {
            ratio =
                Number(
                    rawValue
                );
        } else {
            const rise =
                parsePitchInput(
                    rawValue
                );

            if (
                !Number.isFinite(
                    rise
                )
            ) {
                return;
            }

            ratio =
                rise;
        }

        if (
            !Number.isFinite(
                ratio
            )
        ) {
            return;
        }

        applyPitch(
            ratio
        );
    }

    function bindPitch() {
        document
            .querySelectorAll(
                '#inputPitch,#roof-pitch,#slider-pitch'
            )
            .forEach(
                element => {
                    element.addEventListener(
                        'input',
                        event => {
                            handlePitchChange(
                                event.target.value,
                                true
                            );
                        }
                    );

                    element.addEventListener(
                        'change',
                        event => {
                            handlePitchChange(
                                event.target.value,
                                true
                            );
                        }
                    );
                }
            );

        document
            .querySelectorAll(
                '#valPitch,#val-pitch,select[name="roof-pitch"]'
            )
            .forEach(
                element => {
                    element.addEventListener(
                        'input',
                        event => {
                            handlePitchChange(
                                event.target.value,
                                false
                            );
                        }
                    );

                    element.addEventListener(
                        'change',
                        event => {
                            handlePitchChange(
                                event.target.value,
                                false
                            );
                        }
                    );
                }
            );
    }

    function normalizeRoofType(
        type
    ) {
        const normalized =
            String(
                type ||
                ''
            )
                .trim()
                .toLowerCase();

        if (
            normalized ===
            ROOF_TYPE_GABLED
        ) {
            return normalized;
        }

        if (
            normalized ===
            ROOF_TYPE_LEFT_SLOPED
        ) {
            return normalized;
        }

        if (
            normalized ===
            ROOF_TYPE_RIGHT_SLOPED
        ) {
            return normalized;
        }

        return null;
    }

    function applyRoofType(
        type
    ) {
        const normalized =
            normalizeRoofType(
                type
            );

        if (
            !normalized
        ) {
            return;
        }

        const currentRoof =
            runtime.model.roof ||
            {};

        const nextModel =
            {
                ...runtime.model,

                roof:
                    {
                        ...currentRoof,

                        type:
                            normalized
                    }
            };

        const limits =
            getPitchLimitsFor(
                nextModel.roof
            );

        nextModel.roof.pitchRatio =
            clampPitch(
                Number(
                    nextModel
                        .roof
                        .pitchRatio ??
                    limits.min
                ),
                limits
            );

        runtime.update(
            nextModel
        );

        syncAll();

        updatePitchControls();

        if (
            typeof runtime.render ===
            'function'
        ) {
            runtime.render();
        }
    }

function getPitchLimitsFor(
    roof = {}
) {
    const constraints =
        getConstraints();

    const roofState =
        {
            ...runtime.model.roof,
            ...roof
        };

    const profile =
        String(
            roofState.profile ||
            'awr'
        )
            .trim()
            .toLowerCase();

    const roofType =
        String(
            roofState.type ||
            ROOF_TYPE_GABLED
        )
            .trim()
            .toLowerCase();

    const pitchEl =
        document.getElementById(
            'inputPitch'
        ) ||
        document.querySelector(
            '#roof-pitch'
        ) ||
        document.querySelector(
            '#slider-pitch'
        );

    let min =
        Number(
            constraints.pitch_min ??
            0
        );

    let max =
        getProfilePitchMax(
            profile,
            constraints
        );

    let step =
        Number(
            constraints.pitch_step ??
            0.001
        );

    if (
        SSR_PROFILE_PATTERN.test(
            profile
        )
    ) {
        const ssrMin =
            Number(
                constraints.pitch_ssr24_min
            );

        const ssrStep =
            Number(
                constraints.pitch_ssr24_step
            );

        if (
            Number.isFinite(
                ssrMin
            ) &&
            ssrMin >= 0
        ) {
            min =
                ssrMin;
        }

        if (
            Number.isFinite(
                ssrStep
            ) &&
            ssrStep > 0
        ) {
            step =
                ssrStep;
        }
    }

    if (
        roofType ===
        ROOF_TYPE_LEFT_SLOPED ||
        roofType ===
        ROOF_TYPE_RIGHT_SLOPED
    ) {
        const slopedMax =
            Number(
                constraints.pitch_sloped_max ??
            0.1667
            );

        max =
            Math.min(
                max,
                Number.isFinite(
                    slopedMax
                ) &&
                slopedMax > 0
                    ? slopedMax
                    : 0.1667
            );
    }

    if (
        Number.isFinite(
            Number(
                pitchEl?.min
            )
        ) &&
        Number(
            pitchEl.min
        ) >= 0
    ) {
        min =
            Math.max(
                min,
                Number(
                    pitchEl.min
                )
            );
    }

    if (
        !Number.isFinite(
            min
        ) ||
        min < 0
    ) {
        min = 0;
    }

    if (
        !Number.isFinite(
            max
        ) ||
        max <= min
    ) {
        max =
            Math.max(
                1,
                min + 0.001
            );
    }

    if (
        !Number.isFinite(
            step
        ) ||
        step <= 0
    ) {
        step = 0.001;
    }

    return Object.freeze(
        {
            min,
            max,
            step
        }
    );
}

    function applyRoofProfile(
        profile
    ) {
        const nextModel =
            {
                ...runtime.model,

                roof:
                    {
                        ...runtime
                            .model
                            .roof,

                        profile
                    }
            };

        const limits =
            getPitchLimitsFor(
                nextModel.roof
            );

        const currentPitch =
            Number(
                nextModel
                    .roof
                    .pitchRatio ??
                limits.min
            );

        nextModel.roof.pitchRatio =
            clampPitch(
                currentPitch,
                limits
            );

        runtime.update(
            nextModel
        );

        syncAll();

        updatePitchControls();

        if (
            typeof runtime.render ===
            'function'
        ) {
            runtime.render();
        }
    }

    function applyWallProfile(
        profile
    ) {
        runtime.update(
            {
                ...runtime.model,

                panels:
                    {
                        ...runtime
                            .model
                            .panels,

                        profile
                    }
            }
        );

        syncAll();

        if (
            typeof runtime.render ===
            'function'
        ) {
            runtime.render();
        }
    }

    function bindRoofControls() {
        const roofType =
            document.querySelector(
                '#roofType'
            );

        if (
            roofType
        ) {
            roofType.addEventListener(
                'change',
                event => {
                    applyRoofType(
                        event.target.value
                    );
                }
            );
        }

        document.addEventListener(
            'click',
            event => {
                const button =
                    event.target.closest(
                        '[data-roof-type], .roof-type-btn'
                    );

                if (
                    !button
                ) {
                    return;
                }

                event.preventDefault();

                const type =
                    button.getAttribute(
                        'data-roof-type'
                    ) ||
                    button.value ||
                    button.getAttribute(
                        'value'
                    );

                applyRoofType(
                    type
                );
            }
        );

        const roofProfile =
            document.querySelector(
                '#roofProfile'
            );

        if (
            roofProfile
        ) {
            roofProfile.addEventListener(
                'change',
                event => {
                    applyRoofProfile(
                        event.target.value
                    );
                }
            );
        }

        const wallProfile =
            document.querySelector(
                '#wallProfile'
            );

        if (
            wallProfile
        ) {
            wallProfile.addEventListener(
                'change',
                event => {
                    applyWallProfile(
                        event.target.value
                    );
                }
            );
        }
    }

    function bind() {
        bindPitch();
        bindRoofControls();
    }

    function syncFromModel() {
        updatePitchControls();

        const model =
            runtime.model;

        const roofType =
            model
                .roof
                ?.type ||
            ROOF_TYPE_GABLED;

        const roofProfile =
            model
                .roof
                ?.profile ||
            'awr';

        const wallProfile =
            model
                .panels
                ?.profile ||
            'awr';

        document
            .querySelectorAll(
                '[data-roof-type],.roof-type-btn'
            )
            .forEach(
                button => {
                    const type =
                        button.getAttribute(
                            'data-roof-type'
                        ) ||
                        button.value;

                    button.classList.toggle(
                        'active',
                        type === roofType
                    );
                }
            );

        setElementVal(
            [
                '#roofType',
                'select[name="roof-type"]'
            ],
            roofType
        );

        setElementVal(
            [
                '#roofProfile',
                'select[name="roof-profile"]'
            ],
            roofProfile
        );

        setElementVal(
            [
                '#wallProfile',
                'select[name="wall-profile"]'
            ],
            wallProfile
        );
    }

    return Object.freeze(
        {
            bind,
            syncFromModel,
            getPitchLimits
        }
    );
}