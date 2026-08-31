const DIMENSIONS_ELEMENT_ID =
    'sidebar-summary-dimensions';

const ROOF_ELEMENT_ID =
    'sidebar-summary-roof';

const COLORS_ELEMENT_ID =
    'sidebar-summary-colors';

const ROOF_TYPE_LABELS =
    Object.freeze({
        gabled:
            'Gable Roof',

        'left-sloped':
            'Left Sloped Roof',

        'right-sloped':
            'Right Sloped Roof'
    });

const COLOR_INPUTS =
    Object.freeze({
        wall:
            'colorWall',

        roof:
            'colorRoof',

        trim:
            'colorTrim',

        wainscot:
            'colorWainscot',

        ceiling:
            'colorCeiling',

        mezzanine:
            'colorMezzanine'
    });

function getElement(
    id
) {
    return document.getElementById(
        id
    );
}

function getModelValue(
    model,
    path,
    fallback = ''
) {
    let value =
        model;

    for (
        const key of path
    ) {
        if (
            value === null ||
            value === undefined
        ) {
            return fallback;
        }

        value =
            value[key];
    }

    return value ??
        fallback;
}

function normalizeColorValue(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }

    return String(
        value
    )
        .trim()
        .toLowerCase()
        .replace(
            /^#/,
            ''
        );
}

function getColorInput(
    colorKey
) {
    const id =
        COLOR_INPUTS[
            colorKey
        ];

    if (
        !id
    ) {
        return null;
    }

    return getElement(
        id
    );
}

function getColorLabel(
    colorKey,
    fallback = ''
) {
    const input =
        getColorInput(
            colorKey
        );

    if (
        !input
    ) {
        return fallback;
    }

    if (
        input.tagName ===
        'SELECT'
    ) {
        const option =
            input.selectedOptions?.[
                0
            ];

        if (
            option
        ) {
            const text =
                option.textContent?.trim();

            if (
                text
            ) {
                return text;
            }

            const dataName =
                option.dataset?.name;

            if (
                dataName
            ) {
                return dataName.trim();
            }
        }
    }

    const value =
        input.value?.trim();

    if (
        value
    ) {
        return value;
    }

    return fallback;
}

function getRoofTypeLabel(
    roofType
) {
    const normalized =
        String(
            roofType ||
            'gabled'
        )
            .trim()
            .toLowerCase();

    return ROOF_TYPE_LABELS[
        normalized
    ] ||
        normalized;
}

function getProfileLabel(
    id,
    fallback = ''
) {
    const element =
        getElement(
            id
        );

    if (
        !element
    ) {
        return fallback;
    }

    if (
        element.tagName ===
        'SELECT'
    ) {
        const option =
            element.selectedOptions?.[
                0
            ];

        const text =
            option?.textContent?.trim();

        if (
            text
        ) {
            return text;
        }
    }

    return (
        element.value ||
        fallback ||
        ''
    )
        .trim();
}

function getColorNameFromModel(
    model,
    colorKey
) {
    const value =
        getModelValue(
            model,
            [
                'colors',
                colorKey
            ],
            ''
        );

    if (
        !value
    ) {
        return '';
    }

    const normalized =
        normalizeColorValue(
            value
        );

    const input =
        getColorInput(
            colorKey
        );

    if (
        input &&
        input.tagName ===
            'SELECT'
    ) {
        for (
            const option of input.options
        ) {
            const optionValue =
                normalizeColorValue(
                    option.value
                );

            if (
                optionValue ===
                normalized
            ) {
                return (
                    option.textContent ||
                    option.dataset?.name ||
                    option.value
                )
                    .trim();
            }
        }
    }

    return getColorLabel(
        colorKey,
        String(
            value
        )
    );
}

function createDimensionsText(
    model,
    units
) {
    const dimensions =
        model?.dimensions ||
        {};

    const width =
        units.toDisplay(
            dimensions.width
        );

    const length =
        units.toDisplay(
            dimensions.length
        );

    const height =
        units.toDisplay(
            dimensions.height
        );

    const unit =
        units.isImperial()
            ? 'ft'
            : 'm';

    return `${width}${unit} x ${length}${unit} x ${height}${unit}`;
}

function createRoofText(
    model
) {
    const roof =
        model?.roof ||
        {};

    return getRoofTypeLabel(
        roof.type
    );
}

function createColorsText(
    model
) {
    const wallColor =
        getColorNameFromModel(
            model,
            'wall'
        );

    const roofColor =
        getColorNameFromModel(
            model,
            'roof'
        );

    const trimColor =
        getColorNameFromModel(
            model,
            'trim'
        );

    const wainscotEnabled =
        Boolean(
            getModelValue(
                model,
                [
                    'wainscot',
                    'enabled'
                ],
                model?.wainscotEn
            )
        );

    const wainscotColor =
        wainscotEnabled
            ? getColorNameFromModel(
                model,
                'wainscot'
            )
            : '';

    const colors =
        [];

    if (
        wallColor
    ) {
        colors.push(
            `Wall: ${wallColor}`
        );
    }

    if (
        roofColor
    ) {
        colors.push(
            `Roof: ${roofColor}`
        );
    }

    if (
        trimColor
    ) {
        colors.push(
            `Trim: ${trimColor}`
        );
    }

    if (
        wainscotColor
    ) {
        colors.push(
            `Wainscot: ${wainscotColor}`
        );
    }

    return colors.join(
        ' · '
    );
}

export function createSidebarSummaryController({
    runtime,
    units
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for SidebarSummaryController'
        );
    }

    if (
        !units
    ) {
        throw new TypeError(
            'UnitsController is required for SidebarSummaryController'
        );
    }

    function sync() {
        const model =
            runtime.model;

        if (
            !model
        ) {
            return;
        }

        const dimensionsElement =
            getElement(
                DIMENSIONS_ELEMENT_ID
            );

        const roofElement =
            getElement(
                ROOF_ELEMENT_ID
            );

        const colorsElement =
            getElement(
                COLORS_ELEMENT_ID
            );

        if (
            dimensionsElement
        ) {
            dimensionsElement.textContent =
                createDimensionsText(
                    model,
                    units
                );
        }

        if (
            roofElement
        ) {
            roofElement.textContent =
                createRoofText(
                    model
                );
        }

        if (
            colorsElement
        ) {
            colorsElement.textContent =
                createColorsText(
                    model
                );
        }
    }

    return Object.freeze({
        sync
    });
}