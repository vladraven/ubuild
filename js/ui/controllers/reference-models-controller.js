const MODEL_MAPPING = [
    { id: 'refVehicle', key: 'allow_vehicle' },
    { id: 'refForklift', key: 'allow_forklift' },
    { id: 'refAirplane', key: 'allow_airplane' },
    { id: 'refTruck', key: 'allow_truck' }
];

export function createReferenceModelsController({ runtime }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for ReferenceModelsController');
    }

    function bind() {
        const bc = window.ConfiguratorBackendConstraints || {};

        MODEL_MAPPING.forEach((item) => {
            const checkbox = document.getElementById(item.id);
            if (!checkbox) return;

            const isAllowed = bc[item.key] !== undefined ? Boolean(bc[item.key]) : true;
            const container = checkbox.closest('.form-check');

            if (container) {
                container.style.display = isAllowed ? 'block' : 'none';
            }

            if (!isAllowed) {
                checkbox.checked = false;
            }
        });

        document.querySelectorAll('.ref-model-checkbox').forEach((cb) => {
            cb.addEventListener('change', (e) => {
                runtime.referenceModels.toggle(e.target.value, e.target.checked);
            });
        });
    }

    return Object.freeze({ bind });
}
