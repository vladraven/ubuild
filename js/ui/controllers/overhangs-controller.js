import { setElementVal } from '../dom-helpers.js';

const SIDES = ['front', 'back', 'left', 'right'];
const SUFFIX = { front: 'F', back: 'B', left: 'L', right: 'R' };

export function createOverhangsController({ runtime, units, update }) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for OverhangsController');
    }

    function bind() {
        for (const side of SIDES) {
            const suffix = SUFFIX[side];
            const elements = document.querySelectorAll(
                `#inputOH${suffix},#overhang-${side},#slider-overhang-${side},#val-overhang-${side}`
            );

            elements.forEach((el) =>
                el.addEventListener('input', (e) =>
                    update({
                        roof: {
                            ...runtime.model.roof,
                            overhangs: {
                                ...runtime.model.roof.overhangs,
                                [side]: units.toMeters(e.target.value)
                            }
                        }
                    })
                )
            );
        }
    }

    function syncFromModel() {
        const ov = runtime.model.roof?.overhangs || {};

        setElementVal(
            ['#inputOHF', '#valOHF', '#overhang-front', '#val-overhang-front'],
            units.toDisplay(ov.front || 0)
        );

        setElementVal(
            ['#inputOHB', '#valOHB', '#overhang-back', '#val-overhang-back'],
            units.toDisplay(ov.back || 0)
        );

        setElementVal(
            ['#inputOHL', '#valOHL', '#overhang-left', '#val-overhang-left'],
            units.toDisplay(ov.left || 0)
        );

        setElementVal(
            ['#inputOHR', '#valOHR', '#overhang-right', '#val-overhang-right'],
            units.toDisplay(ov.right || 0)
        );
    }

    return Object.freeze({ bind, syncFromModel });
}
