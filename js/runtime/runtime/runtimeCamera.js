import {
    THREE
} from './runtimeImports.js';

function assertContainer(
    container
) {
    if (
        !container ||
        typeof container.appendChild !==
        'function'
    ) {
        throw new TypeError(
            'A valid DOM container element is required'
        );
    }
}

export function createCamera(
    container,
    geometry
) {
    assertContainer(
        container
    );

    if (
        !geometry ||
        !geometry.bounds
    ) {
        throw new TypeError(
            'Building geometry with bounds is required'
        );
    }

    const width =
        Math.max(
            container.clientWidth,
            1
        );

    const height =
        Math.max(
            container.clientHeight,
            1
        );

    const camera =
        new THREE.PerspectiveCamera(
            45,
            width / height,
            0.1,
            5000
        );

    return camera;
}