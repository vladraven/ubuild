import { getBuildingModelLimits } from '../model/buildingModel.js';
import { createUIActions } from './UIActions.js';

const M_TO_FT = 3.28084;
const FT_TO_M = 0.3048;

export function createUIAdapter(runtime) {
    if (!runtime) {
        throw new TypeError(
            'UBuildRuntime instance is required for UIAdapter'
        );
    }

    let isImperial = true;

    function toDisplay(meters) {
        if (
            meters === undefined ||
            meters === null
        ) {
            return 0;
        }

        return isImperial
            ? (
                meters *
                M_TO_FT
            ).toFixed(1)
            : Number(
                meters
            ).toFixed(2);
    }

    function toMeters(val) {
        const num =
            parseFloat(val);

        if (
            !Number.isFinite(num)
        ) {
            return 0;
        }

        return isImperial
            ? num * FT_TO_M
            : num;
    }

    function setElementVal(
        selectors,
        val
    ) {
        for (
            const s of selectors
        ) {
            const el =
                document.querySelector(
                    s
                );

            if (!el) {
                continue;
            }

            el.value =
                val;

            if (
                el.tagName === 'SPAN' ||
                el.tagName === 'B'
            ) {
                el.textContent =
                    val;
            }
        }
    }

    function setElementChecked(
        selectors,
        checked
    ) {
        for (
            const s of selectors
        ) {
            const el =
                document.querySelector(
                    s
                );

            if (
                el &&
                el.type === 'checkbox'
            ) {
                el.checked =
                    checked;
            }
        }
    }

    function formatPitchRatio(
        ratio
    ) {
        const pitch12 =
            Number(ratio) * 12;

        const formatted =
            parseFloat(
                pitch12.toFixed(1)
            ).toString();

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

        const str =
            String(raw)
                .trim()
                .replace(
                    /:12$/i,
                    ''
                )
                .trim();

        const num =
            parseFloat(str);

        if (
            !Number.isFinite(num)
        ) {
            return NaN;
        }

        return num;
    }

    function getPitchLimits() {
        const constraints =
            window.ConfiguratorBackendConstraints ||
            {};

        const profile =
            String(
                runtime.model.roof?.profile ||
                'awr'
            ).toLowerCase();

        const roofType =
            String(
                runtime.model.roof?.type ||
                'gabled'
            ).toLowerCase();

        const pitchEl =
            document.getElementById(
                'inputPitch'
            );

        let min =
            Number(
                pitchEl?.min
            );

        let max =
            Number(
                pitchEl?.max
            );

        let step =
            Number(
                pitchEl?.step
            );

        if (
            !Number.isFinite(min) ||
            min < 0
        ) {
            min =
                Number(
                    constraints.pitch_min ??
                    0
                );
        }

        if (
            !Number.isFinite(max) ||
            max <= 0
        ) {
            max =
                Number(
                    constraints.pitch_awr_max ??
                    constraints.pitch_awr ??
                    1
                );
        }

        if (
            !Number.isFinite(step) ||
            step <= 0
        ) {
            step =
                Number(
                    constraints.pitch_step ??
                    0.001
                );
        }

        if (
            profile.includes('ssr') ||
            profile.includes('snap')
        ) {
            min =
                Number(
                    constraints.pitch_ssr24_min ??
                    min
                );

            max =
                Number(
                    constraints.pitch_ssr24_max ??
                    constraints.pitch_ssr24 ??
                    max
                );

            step =
                Number(
                    constraints.pitch_ssr24_step ??
                    step
                );
        }

        if (
            roofType ===
                'left-sloped' ||
            roofType ===
                'right-sloped'
        ) {
            max =
                Math.min(
                    max,
                    Number(
                        constraints.pitch_sloped_max ??
                        0.1667
                    )
                );
        }

        if (
            !Number.isFinite(min) ||
            min < 0
        ) {
            min = 0;
        }

        if (
            !Number.isFinite(max) ||
            max <= min
        ) {
            max = 1;
        }

        if (
            !Number.isFinite(step) ||
            step <= 0
        ) {
            step = 0.001;
        }

        return {
            min,
            max,
            step
        };
    }

    function updatePitchControls() {
        const ratio =
            Number(
                runtime.model.roof?.pitchRatio ??
                0.05
            );

        const limits =
            getPitchLimits();

        const value =
            Math.max(
                limits.min,
                Math.min(
                    limits.max,
                    ratio
                )
            );

        for (
            const selector of [
                '#inputPitch',
                '#roof-pitch',
                '#slider-pitch'
            ]
        ) {
            const el =
                document.querySelector(
                    selector
                );

            if (!el) {
                continue;
            }

            if (
                el.type === 'range'
            ) {
                el.min =
                    limits.min;

                el.max =
                    limits.max;

                el.step =
                    limits.step;

                el.value =
                    value;
            }
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

        if (minLabel) {
            minLabel.textContent =
                formatPitchRatio(
                    limits.min
                );
        }

        if (maxLabel) {
            maxLabel.textContent =
                formatPitchRatio(
                    limits.max
                );
        }
    }

    function updateInputsFromModel() {
        const model =
            runtime.model;

        const d =
            model.dimensions;

        const setDim = (
            sliderId,
            valId,
            meters
        ) => {
            const display =
                toDisplay(
                    meters
                );

            setElementVal(
                [
                    `#${sliderId}`,
                    `#${valId}`
                ],
                display
            );

            const slider =
                document.getElementById(
                    sliderId
                );

            if (slider) {
                slider.setAttribute(
                    'data-current-m',
                    meters
                );
            }
        };

        setDim(
            'inputW',
            'valW',
            d.width
        );

        setDim(
            'inputL',
            'valL',
            d.length
        );

        setDim(
            'inputH',
            'valH',
            d.height
        );

        setElementVal(
            [
                '#input-width',
                '#slider-width',
                '#val-width',
                '#building-width',
                '#width-ft'
            ],
            toDisplay(
                d.width
            )
        );

        setElementVal(
            [
                '#input-length',
                '#slider-length',
                '#val-length',
                '#building-length',
                '#length-ft'
            ],
            toDisplay(
                d.length
            )
        );

        setElementVal(
            [
                '#input-height',
                '#slider-height',
                '#val-height',
                '#building-height',
                '#height-ft'
            ],
            toDisplay(
                d.height
            )
        );

        document
            .querySelectorAll(
                '.value-unit,.unit-label'
            )
            .forEach(
                el => {
                    el.textContent =
                        isImperial
                            ? 'ft'
                            : 'm';
                }
            );

        updatePitchControls();

        const roofType =
            model.roof?.type ||
            'gabled';

        const roofProfile =
            model.roof?.profile ||
            'awr';

        const wallProfile =
            model.panels?.profile ||
            'awr';

        document
            .querySelectorAll(
                '[data-roof-type],.roof-type-btn'
            )
            .forEach(
                btn => {
                    const type =
                        btn.getAttribute(
                            'data-roof-type'
                        ) ||
                        btn.value;

                    btn.classList.toggle(
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

        const ov =
            model.roof?.overhangs ||
            {};

        setElementVal(
            [
                '#inputOHF',
                '#valOHF',
                '#overhang-front',
                '#val-overhang-front'
            ],
            toDisplay(
                ov.front || 0
            )
        );

        setElementVal(
            [
                '#inputOHB',
                '#valOHB',
                '#overhang-back',
                '#val-overhang-back'
            ],
            toDisplay(
                ov.back || 0
            )
        );

        setElementVal(
            [
                '#inputOHL',
                '#valOHL',
                '#overhang-left',
                '#val-overhang-left'
            ],
            toDisplay(
                ov.left || 0
            )
        );

        setElementVal(
            [
                '#inputOHR',
                '#valOHR',
                '#overhang-right',
                '#val-overhang-right'
            ],
            toDisplay(
                ov.right || 0
            )
        );

        const wsHeight =
            model.panels?.wainscotHeight ||
            0;

        setElementVal(
            [
                '#inputWS',
                '#valWS',
                '#wainscot-height',
                '#slider-wainscot-height',
                '#val-wainscot-height'
            ],
            toDisplay(
                wsHeight
            )
        );

        setElementChecked(
            [
                '#wainscotToggle',
                '#toggle-wainscot',
                '#wainscot-toggle'
            ],
            wsHeight > 0
        );

        if (model.colors) {
            for (
                const [
                    key,
                    hex
                ]
                of Object.entries(
                    model.colors
                )
            ) {
                setElementVal(
                    [
                        `#color${key.charAt(0).toUpperCase() + key.slice(1)}`,
                        `#color-${key}`,
                        `[data-color-input="${key}"]`
                    ],
                    hex
                );
            }
        }

        if (model.visibility) {
            for (
                const [
                    key,
                    val
                ]
                of Object.entries(
                    model.visibility
                )
            ) {
                const id =
                    `#check${key.charAt(0).toUpperCase() + key.slice(1)}`;

                setElementChecked(
                    [
                        id,
                        `#vis-${key}`,
                        `[data-vis="${key}"]`
                    ],
                    val !== false
                );
            }
        }
    }

    let dimensionToastEl =
        null;

    let dimensionToastTimer =
        null;

    function showDimensionToast(
        message
    ) {
        if (!dimensionToastEl) {
            let container =
                document.getElementById(
                    'toast-container'
                );

            if (!container) {
                container =
                    document.createElement(
                        'div'
                    );

                container.id =
                    'toast-container';

                container.className =
                    'toast-container position-fixed bottom-0 end-0 p-3';

                container.style.zIndex =
                    '999999';

                document.body.appendChild(
                    container
                );
            }

            container.insertAdjacentHTML(
                'beforeend',
                `
                <div id="dimension-limit-toast" class="toast align-items-center text-white bg-dark border-warning shadow" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="d-flex">
                        <div class="toast-body small"><span id="dimension-limit-toast-text"></span></div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                </div>`
            );

            dimensionToastEl =
                document.getElementById(
                    'dimension-limit-toast'
                );
        }

        const textEl =
            document.getElementById(
                'dimension-limit-toast-text'
            );

        if (textEl) {
            textEl.textContent =
                message;
        }

        if (
            window.bootstrap &&
            window.bootstrap.Toast
        ) {
            window.bootstrap.Toast
                .getOrCreateInstance(
                    dimensionToastEl,
                    {
                        delay: 4000
                    }
                )
                .show();
        } else {
            dimensionToastEl.classList.add(
                'show'
            );

            clearTimeout(
                dimensionToastTimer
            );

            dimensionToastTimer =
                setTimeout(
                    () =>
                        dimensionToastEl.classList.remove(
                            'show'
                        ),
                    4000
                );
        }
    }

    function update(
        patch
    ) {
        runtime.update({
            ...runtime.model,
            ...patch
        });

        updateInputsFromModel();
    }

    function handleDimensionChange(
        prop,
        value
    ) {
        const meters =
            toMeters(value);

        if (meters <= 0) {
            return;
        }

        const constraints =
            window.ConfiguratorBackendConstraints ||
            {};

        const limitMap = {
            width: 'max_width',
            length: 'max_length',
            height: 'max_height'
        };

        const limits =
            getBuildingModelLimits()[
                prop
            ] || {};

        let maxM =
            typeof limits.max ===
            'number'
                ? limits.max
                : Infinity;

        let minM =
            typeof limits.min ===
            'number'
                ? limits.min
                : 0;

        if (
            limitMap[prop] &&
            Number.isFinite(
                Number(
                    constraints[
                        limitMap[prop]
                    ]
                )
            )
        ) {
            maxM =
                Number(
                    constraints[
                        limitMap[prop]
                    ]
                );
        }

        const sliderId =
            prop === 'width'
                ? 'inputW'
                : prop === 'length'
                    ? 'inputL'
                    : prop === 'height'
                        ? 'inputH'
                        : null;

        if (sliderId) {
            const slider =
                document.getElementById(
                    sliderId
                );

            if (slider) {
                const dm =
                    parseFloat(
                        slider.getAttribute(
                            'data-m-max'
                        )
                    );

                if (
                    Number.isFinite(dm) &&
                    dm < maxM
                ) {
                    maxM =
                        dm;
                }

                const dmin =
                    parseFloat(
                        slider.getAttribute(
                            'data-m-min'
                        )
                    );

                if (
                    Number.isFinite(dmin) &&
                    dmin > minM
                ) {
                    minM =
                        dmin;
                }
            }
        }

        let clamped =
            meters;

        let violated =
            false;

        if (
            clamped < minM
        ) {
            clamped =
                minM;

            violated =
                true;
        }

        if (
            clamped > maxM
        ) {
            clamped =
                maxM;

            violated =
                true;
        }

        if (sliderId) {
            const slider =
                document.getElementById(
                    sliderId
                );

            if (slider) {
                slider.setAttribute(
                    'data-current-m',
                    clamped
                );
            }
        }

        update({
            dimensions: {
                ...runtime.model.dimensions,
                [prop]:
                    clamped
            }
        });

        if (violated) {
            const unit =
                isImperial
                    ? 'ft'
                    : 'm';

            const display =
                toDisplay(
                    clamped
                );

            showDimensionToast(
                `Maximum ${prop} reached (${display} ${unit}).`
            );
        }
    }

    function handlePitchChange(
        rawValue,
        fromSlider
    ) {
        const limits =
            getPitchLimits();

        let ratio;

        if (fromSlider) {
            ratio =
                parseFloat(
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
                rise / 12;
        }

        if (
            !Number.isFinite(
                ratio
            )
        ) {
            return;
        }

        const clamped =
            Math.max(
                limits.min,
                Math.min(
                    limits.max,
                    ratio
                )
            );

        update({
            roof: {
                ...runtime.model.roof,
                pitchRatio:
                    clamped
            }
        });
    }

    function bindDimension(
        ids,
        prop
    ) {
        const elements =
            document.querySelectorAll(
                ids
            );

        elements.forEach(
            el => {
                el.addEventListener(
                    'input',
                    e =>
                        handleDimensionChange(
                            prop,
                            e.target.value
                        )
                );

                if (
                    el.tagName ===
                        'INPUT' &&
                    el.type !== 'range'
                ) {
                    el.addEventListener(
                        'change',
                        e =>
                            handleDimensionChange(
                                prop,
                                e.target.value
                            )
                    );
                }
            }
        );
    }

    function bindPitch() {
        document
            .querySelectorAll(
                '#inputPitch,#roof-pitch,#slider-pitch'
            )
            .forEach(
                el => {
                    el.addEventListener(
                        'input',
                        e =>
                            handlePitchChange(
                                e.target.value,
                                true
                            )
                    );

                    el.addEventListener(
                        'change',
                        e =>
                            handlePitchChange(
                                e.target.value,
                                true
                            )
                    );
                }
            );

        document
            .querySelectorAll(
                '#valPitch,#val-pitch,select[name="roof-pitch"]'
            )
            .forEach(
                el => {
                    el.addEventListener(
                        'input',
                        e =>
                            handlePitchChange(
                                e.target.value,
                                false
                            )
                    );

                    el.addEventListener(
                        'change',
                        e =>
                            handlePitchChange(
                                e.target.value,
                                false
                            )
                    );
                }
            );

        const roofProfile =
            document.querySelector(
                '#roofProfile'
            );

        if (roofProfile) {
            roofProfile.addEventListener(
                'change',
                () => {
                    updatePitchControls();
                }
            );
        }
    }

    function bindRoofControls() {
        const applyRoofType =
            type => {
                const normalized =
                    String(
                        type || ''
                    )
                        .trim()
                        .toLowerCase();

                if (
                    normalized !==
                        'gabled' &&
                    normalized !==
                        'left-sloped' &&
                    normalized !==
                        'right-sloped'
                ) {
                    return;
                }

                const currentRoof =
                    runtime.model.roof ||
                    {};

                const nextModel = {
                    ...runtime.model,

                    roof: {
                        ...currentRoof,
                        type:
                            normalized
                    }
                };

                runtime.update(
                    nextModel
                );

                updateInputsFromModel();

                if (
                    typeof runtime.render ===
                    'function'
                ) {
                    runtime.render();
                }
            };

        const roofType =
            document.querySelector(
                '#roofType'
            );

        if (roofType) {
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

                if (!button) {
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

        if (roofProfile) {
            roofProfile.addEventListener(
                'change',
                event => {
                    runtime.update({
                        ...runtime.model,

                        roof: {
                            ...runtime.model.roof,

                            profile:
                                event.target.value
                        }
                    });

                    updatePitchControls();
                }
            );
        }

        const wallProfile =
            document.querySelector(
                '#wallProfile'
            );

        if (wallProfile) {
            wallProfile.addEventListener(
                'change',
                event => {
                    runtime.update({
                        ...runtime.model,

                        panels: {
                            ...runtime.model.panels,

                            profile:
                                event.target.value
                        }
                    });
                }
            );
        }
    }

    function bindOverhangs() {
        for (
            const side of [
                'front',
                'back',
                'left',
                'right'
            ]
        ) {
            const suffix =
                side === 'front'
                    ? 'F'
                    : side === 'back'
                        ? 'B'
                        : side === 'left'
                            ? 'L'
                            : 'R';

            const elements =
                document.querySelectorAll(
                    `#inputOH${suffix},#overhang-${side},#slider-overhang-${side},#val-overhang-${side}`
                );

            elements.forEach(
                el =>
                    el.addEventListener(
                        'input',
                        e =>
                            update({
                                roof: {
                                    ...runtime.model.roof,

                                    overhangs: {
                                        ...runtime.model.roof.overhangs,

                                        [side]:
                                            toMeters(
                                                e.target.value
                                            )
                                    }
                                }
                            })
                    )
            );
        }
    }

    function bindWainscot() {
        const toggle =
            document.querySelector(
                '#wainscotToggle,#toggle-wainscot,#wainscot-toggle'
            );

        if (toggle) {
            toggle.addEventListener(
                'change',
                e =>
                    update({
                        panels: {
                            ...runtime.model.panels,

                            wainscotHeight:
                                e.target.checked
                                    ? 0.9144
                                    : 0
                        },

                        visibility: {
                            ...runtime.model.visibility,

                            wainscot:
                                e.target.checked
                        }
                    })
            );
        }

        const height =
            document.querySelector(
                '#inputWS,#wainscot-height,#slider-wainscot-height,#val-wainscot-height'
            );

        if (height) {
            height.addEventListener(
                'input',
                e =>
                    update({
                        panels: {
                            ...runtime.model.panels,

                            wainscotHeight:
                                toMeters(
                                    e.target.value
                                )
                        }
                    })
            );
        }
    }

    function normalizeColorKey(
        value
    ) {
        if (!value) {
            return null;
        }

        let key =
            String(value)
                .trim();

        if (!key) {
            return null;
        }

        key =
            key
                .replace(
                    /^color[-_]?/i,
                    ''
                )
                .replace(
                    /[-_]+(.)/g,
                    (
                        _,
                        char
                    ) =>
                        char.toUpperCase()
                );

        const aliases = {
            eavetrim:
                'eaveTrim',

            raketrim:
                'rakeTrim',

            structuralsteel:
                'structuralSteel',

            interiorwall:
                'interiorWall',

            wainscotmetal:
                'wainscot'
        };

        const lower =
            key.toLowerCase();

        return (
            aliases[lower] ||
            key.charAt(0).toLowerCase() +
                key.slice(1)
        );
    }

    function getColorTarget(
        element
    ) {
        const explicit =
            element.getAttribute(
                'data-color-target'
            ) ||
            element.getAttribute(
                'data-color-input'
            ) ||
            element.getAttribute(
                'data-target'
            );

        if (explicit) {
            return normalizeColorKey(
                explicit
            );
        }

        const name =
            element.getAttribute(
                'name'
            );

        if (name) {
            const normalizedName =
                normalizeColorKey(
                    name
                );

            if (
                normalizedName &&
                runtime.model.colors?.[
                    normalizedName
                ] !== undefined
            ) {
                return normalizedName;
            }
        }

        const id =
            element.id || '';

        if (id) {
            const normalizedId =
                normalizeColorKey(
                    id
                );

            if (normalizedId) {
                return normalizedId;
            }
        }

        return null;
    }

    function setColor(
        target,
        value
    ) {
        if (
            !target ||
            value === undefined ||
            value === null ||
            value === ''
        ) {
            return;
        }

        runtime.update({
            ...runtime.model,

            colors: {
                ...(runtime.model.colors ||
                    {}),

                [target]:
                    value
            }
        });
    }

    function bindColors() {
        const colorControls =
            document.querySelectorAll(
                'input[type="color"], select[id^="color"], select[name*="color" i], [data-color-target], [data-color-input]'
            );

        colorControls.forEach(
            control => {
                const target =
                    getColorTarget(
                        control
                    );

                if (!target) {
                    return;
                }

                const handler =
                    event => {
                        setColor(
                            target,
                            event.target.value
                        );
                    };

                control.addEventListener(
                    'input',
                    handler
                );

                control.addEventListener(
                    'change',
                    handler
                );
            }
        );

        document
            .querySelectorAll(
                '.color-swatch,.color-btn'
            )
            .forEach(
                button => {
                    button.addEventListener(
                        'click',
                        () => {
                            const hex =
                                button.getAttribute(
                                    'data-color'
                                ) ||
                                button.getAttribute(
                                    'data-hex'
                                );

                            const target =
                                normalizeColorKey(
                                    button.getAttribute(
                                        'data-target'
                                    ) ||
                                    button.getAttribute(
                                        'data-color-target'
                                    ) ||
                                    'wall'
                                );

                            if (hex) {
                                setColor(
                                    target,
                                    hex
                                );
                            }
                        }
                    );
                }
            );
    }

    function bindVisibility() {
        document
            .querySelectorAll(
                '[id^="check"],[id^="vis-"],[data-vis]'
            )
            .forEach(
                el => {
                    const key =
                        el.getAttribute(
                            'data-vis'
                        ) ||
                        el.id
                            .replace(
                                /^check/,
                                ''
                            )
                            .replace(
                                /^vis-/,
                                ''
                            )
                            .toLowerCase();

                    if (
                        el.type !==
                        'checkbox'
                    ) {
                        return;
                    }

                    el.addEventListener(
                        'change',
                        e =>
                            runtime.update({
                                ...runtime.model,

                                visibility: {
                                    ...runtime.model.visibility,

                                    [key]:
                                        e.target.checked
                                }
                            })
                    );
                }
            );
    }

    function syncDistSlidersToUnit() {
        document
            .querySelectorAll(
                '.dist-slider'
            )
            .forEach(
                slider => {
                    const mMin =
                        parseFloat(
                            slider.getAttribute(
                                'data-m-min'
                            )
                        );

                    const mMax =
                        parseFloat(
                            slider.getAttribute(
                                'data-m-max'
                            )
                        );

                    const mStep =
                        parseFloat(
                            slider.getAttribute(
                                'data-m-step'
                            )
                        );

                    let currentM =
                        parseFloat(
                            slider.getAttribute(
                                'data-current-m'
                            )
                        );

                    if (
                        !Number.isFinite(
                            currentM
                        )
                    ) {
                        const id =
                            slider.id ||
                            '';

                        if (
                            id.includes(
                                'W'
                            ) ||
                            id.includes(
                                'width'
                            )
                        ) {
                            currentM =
                                runtime.model
                                    .dimensions
                                    .width;
                        } else if (
                            id.includes(
                                'L'
                            ) ||
                            id.includes(
                                'length'
                            )
                        ) {
                            currentM =
                                runtime.model
                                    .dimensions
                                    .length;
                        } else if (
                            id.includes(
                                'H'
                            ) ||
                            id.includes(
                                'height'
                            )
                        ) {
                            currentM =
                                runtime.model
                                    .dimensions
                                    .height;
                        } else {
                            currentM =
                                toMeters(
                                    slider.value
                                );
                        }
                    }

                    if (
                        Number.isFinite(
                            mMin
                        )
                    ) {
                        slider.min =
                            isImperial
                                ? (
                                    mMin *
                                    M_TO_FT
                                ).toFixed(2)
                                : mMin.toFixed(2);
                    }

                    if (
                        Number.isFinite(
                            mMax
                        )
                    ) {
                        slider.max =
                            isImperial
                                ? (
                                    mMax *
                                    M_TO_FT
                                ).toFixed(2)
                                : mMax.toFixed(2);
                    }

                    if (
                        Number.isFinite(
                            mStep
                        )
                    ) {
                        slider.step =
                            isImperial
                                ? (
                                    mStep *
                                    M_TO_FT
                                ).toFixed(2)
                                : mStep.toFixed(2);
                    }

                    if (
                        Number.isFinite(
                            currentM
                        )
                    ) {
                        const display =
                            isImperial
                                ? currentM *
                                    M_TO_FT
                                : currentM;

                        slider.value =
                            display.toFixed(
                                2
                            );

                        slider.setAttribute(
                            'data-current-m',
                            currentM
                        );

                        const targetId =
                            slider.getAttribute(
                                'data-target'
                            );

                        if (targetId) {
                            const target =
                                document.getElementById(
                                    targetId
                                );

                            if (target) {
                                target.value =
                                    display.toFixed(
                                        isImperial
                                            ? 1
                                            : 2
                                    );
                            }
                        }
                    }
                }
            );

        const constraints =
            window.ConfiguratorBackendConstraints ||
            {};

        const pairs = [
            {
                lbl: '#lblMaxW',
                mKey: 'max_width',
                fallback: 91.44
            },
            {
                lbl: '#lblMaxL',
                mKey: 'max_length',
                fallback: 36.576
            },
            {
                lbl: '#lblMaxH',
                mKey: 'max_height',
                fallback: 9.144
            }
        ];

        for (
            const {
                lbl,
                mKey,
                fallback
            } of pairs
        ) {
            const el =
                document.querySelector(
                    lbl
                );

            if (!el) {
                continue;
            }

            const mVal =
                Number(
                    constraints[
                        mKey
                    ] ??
                    fallback
                );

            el.textContent =
                isImperial
                    ? (
                        mVal *
                        M_TO_FT
                    ).toFixed(1)
                    : mVal.toFixed(2);
        }
    }

    function bindUnits() {
        const toggle =
            document.querySelector(
                '#unitToggle,#unit-toggle,#unit-switch,[data-unit],.btn-unit-toggle'
            );

        if (!toggle) {
            return;
        }

        const apply =
            () => {
                syncDistSlidersToUnit();
                updateInputsFromModel();
            };

        toggle.addEventListener(
            'change',
            e => {
                isImperial =
                    e.target.getAttribute(
                        'data-unit'
                    )
                        ? e.target.getAttribute(
                            'data-unit'
                        ) ===
                            'imperial'
                        : !e.target.checked;

                apply();
            }
        );

        toggle.addEventListener(
            'click',
            () => {
                if (
                    toggle.type ===
                    'checkbox'
                ) {
                    return;
                }

                const requested =
                    toggle.getAttribute(
                        'data-unit'
                    );

                isImperial =
                    requested
                        ? requested ===
                            'imperial'
                        : !isImperial;

                apply();
            }
        );
    }

    function bindReferenceModels() {
        const bc =
            window.ConfiguratorBackendConstraints ||
            {};

        const modelMapping = [
            {
                id: 'refVehicle',
                key: 'allow_vehicle'
            },
            {
                id: 'refForklift',
                key: 'allow_forklift'
            },
            {
                id: 'refAirplane',
                key: 'allow_airplane'
            },
            {
                id: 'refTruck',
                key: 'allow_truck'
            }
        ];

        modelMapping.forEach(
            item => {
                const checkbox =
                    document.getElementById(
                        item.id
                    );

                if (!checkbox) {
                    return;
                }

                const isAllowed =
                    bc[
                        item.key
                    ] !== undefined
                        ? Boolean(
                            bc[
                                item.key
                            ]
                        )
                        : true;

                const container =
                    checkbox.closest(
                        '.form-check'
                    );

                if (container) {
                    container.style.display =
                        isAllowed
                            ? 'block'
                            : 'none';
                }

                if (!isAllowed) {
                    checkbox.checked =
                        false;
                }
            }
        );

        document
            .querySelectorAll(
                '.ref-model-checkbox'
            )
            .forEach(
                cb => {
                    cb.addEventListener(
                        'change',
                        e => {
                            runtime
                                .referenceModels
                                .toggle(
                                    e.target.value,
                                    e.target.checked
                                );
                        }
                    );
                }
            );
    }

    function bindInformationNotice() {
        const information =
            document.getElementById(
                'information'
            );

        if (!information) {
            return;
        }

        const alert =
            information.querySelector(
                '.alert'
            );

        if (!alert) {
            return;
        }

        setTimeout(
            () => {
                alert.style.transition =
                    'opacity .5s ease';

                alert.style.opacity =
                    '0';

                setTimeout(
                    () =>
                        information.remove(),
                    500
                );
            },
            3000
        );
    }

    const actions =
        createUIActions({
            runtime,
            updateInputsFromModel,
            toDisplay
        });

    function init() {
        bindDimension(
            '#inputW,#sliderW,#valW,#input-width,#slider-width,#val-width,#building-width,#width-ft',
            'width'
        );

        bindDimension(
            '#inputL,#sliderL,#valL,#input-length,#slider-length,#val-length,#building-length,#length-ft',
            'length'
        );

        bindDimension(
            '#inputH,#sliderH,#valH,#input-height,#slider-height,#val-height,#building-height,#height-ft',
            'height'
        );

        bindPitch();
        bindRoofControls();
        bindOverhangs();
        bindWainscot();
        bindColors();
        bindVisibility();
        bindUnits();
        bindReferenceModels();
        bindInformationNotice();

        actions.init();

        syncDistSlidersToUnit();
        updateInputsFromModel();
    }

    return Object.freeze({
        init,
        updateInputsFromModel,
        toDisplay,
        toMeters,

        saveDesign:
            actions.saveDesign,

        renderGallery:
            actions.renderGallery,

        renderCompare:
            actions.renderCompare
    });
}