import { getBuildingModelLimits } from '../../model/buildingModel.js';
import { setElementVal } from '../dom-helpers.js';

export function createDimensionsController({ runtime, units, update }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for DimensionsController');
    }

    let dimensionToastEl = null;
    let dimensionToastTimer = null;

    function showDimensionToast(message) {
        if (!dimensionToastEl) {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
                container.style.zIndex = '999999';
                document.body.appendChild(container);
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

            dimensionToastEl = document.getElementById('dimension-limit-toast');
        }

        const textEl = document.getElementById('dimension-limit-toast-text');
        if (textEl) textEl.textContent = message;

        if (window.bootstrap && window.bootstrap.Toast) {
            window.bootstrap.Toast.getOrCreateInstance(dimensionToastEl, { delay: 4000 }).show();
        } else {
            dimensionToastEl.classList.add('show');
            clearTimeout(dimensionToastTimer);
            dimensionToastTimer = setTimeout(
                () => dimensionToastEl.classList.remove('show'),
                4000
            );
        }
    }

    function handleDimensionChange(prop, value) {
        const meters = units.toMeters(value);
        if (meters <= 0) return;

        const constraints = window.ConfiguratorBackendConstraints || {};
        const limitMap = {
            width: 'max_width',
            length: 'max_length',
            height: 'max_height'
        };

        const limits = getBuildingModelLimits()[prop] || {};

        let maxM = typeof limits.max === 'number' ? limits.max : Infinity;
        let minM = typeof limits.min === 'number' ? limits.min : 0;

        if (
            limitMap[prop] &&
            Number.isFinite(Number(constraints[limitMap[prop]]))
        ) {
            maxM = Number(constraints[limitMap[prop]]);
        }

        const sliderId =
            prop === 'width' ? 'inputW'
                : prop === 'length' ? 'inputL'
                    : prop === 'height' ? 'inputH'
                        : null;

        if (sliderId) {
            const slider = document.getElementById(sliderId);
            if (slider) {
                const dm = parseFloat(slider.getAttribute('data-m-max'));
                if (Number.isFinite(dm) && dm < maxM) maxM = dm;

                const dmin = parseFloat(slider.getAttribute('data-m-min'));
                if (Number.isFinite(dmin) && dmin > minM) minM = dmin;
            }
        }

        let clamped = meters;
        let violated = false;

        if (clamped < minM) {
            clamped = minM;
            violated = true;
        }

        if (clamped > maxM) {
            clamped = maxM;
            violated = true;
        }

        if (sliderId) {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.setAttribute('data-current-m', clamped);
            }
        }

        update({
            dimensions: {
                ...runtime.model.dimensions,
                [prop]: clamped
            }
        });

        if (violated) {
            const unit = units.isImperial() ? 'ft' : 'm';
            const display = units.toDisplay(clamped);
            showDimensionToast(`Maximum ${prop} reached (${display} ${unit}).`);
        }
    }

    function bindDimension(ids, prop) {
        const elements = document.querySelectorAll(ids);
        elements.forEach((el) => {
            el.addEventListener('input', (e) => handleDimensionChange(prop, e.target.value));

            if (el.tagName === 'INPUT' && el.type !== 'range') {
                el.addEventListener('change', (e) => handleDimensionChange(prop, e.target.value));
            }
        });
    }

    function bind() {
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
    }

    function syncFromModel() {
        const d = runtime.model.dimensions;

        const setDim = (sliderId, valId, meters) => {
            const display = units.toDisplay(meters);
            setElementVal([`#${sliderId}`, `#${valId}`], display);

            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.setAttribute('data-current-m', meters);
            }
        };

        setDim('inputW', 'valW', d.width);
        setDim('inputL', 'valL', d.length);
        setDim('inputH', 'valH', d.height);

        setElementVal(
            ['#input-width', '#slider-width', '#val-width', '#building-width', '#width-ft'],
            units.toDisplay(d.width)
        );

        setElementVal(
            ['#input-length', '#slider-length', '#val-length', '#building-length', '#length-ft'],
            units.toDisplay(d.length)
        );

        setElementVal(
            ['#input-height', '#slider-height', '#val-height', '#building-height', '#height-ft'],
            units.toDisplay(d.height)
        );
    }

    return Object.freeze({
        bind,
        syncFromModel
    });
}
