const DRIVEWAY_TOGGLE_ID =
    'drivewayEn';

const DEFAULT_HEIGHT =
    0.15;

const MAX_WIDTH =
    4;
	
const DEFAULT_LENGTH =
    2;
	
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

function getDefaultWidth(
    model
) {
    return Math.min(
        model.dimensions.width / 2,
        MAX_WIDTH
    );
}

function getDrivewayConfig(
    model,
    enabled
) {
    const current =
        model.driveway ||
        {};

    const length =
        getNumber(
            current.length,
            0
        );

    const height =
        getNumber(
            current.height,
            0
        );

    return {
        ...current,

        enabled,

        width:
            getDefaultWidth(
                model
            ),

        length:
            length > 0
                ? length
                : DEFAULT_LENGTH,

        height:
            height > 0
                ? height
                : DEFAULT_HEIGHT
    };
}

export function createDrivewayController({
    runtime,
    update
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for DrivewayController'
        );
    }

    if (
        typeof update !==
        'function'
    ) {
        throw new TypeError(
            'update function is required for DrivewayController'
        );
    }

    let initialized =
        false;

    function updateDriveway(
        enabled
    ) {
        const model =
            runtime.model;

        update({
            driveway:
                getDrivewayConfig(
                    model,
                    enabled
                )
        });
    }

    function bind() {
        if (
            initialized
        ) {
            return;
        }

        initialized =
            true;

        const toggle =
            getElement(
                DRIVEWAY_TOGGLE_ID
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
                updateDriveway(
                    event.target.checked
                );
            }
        );
    }

    function syncFromModel() {
        const toggle =
            getElement(
                DRIVEWAY_TOGGLE_ID
            );

        if (
            !toggle
        ) {
            return;
        }

        toggle.checked =
            Boolean(
                runtime.model
                    .driveway
                    ?.enabled
            );
    }

    return Object.freeze({
        bind,

        syncFromModel
    });
}