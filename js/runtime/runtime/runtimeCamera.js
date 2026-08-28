import {
    THREE
} from './runtimeImports.js';

function assertContainer(container) {
    if (
        !container ||
        typeof container.appendChild !== 'function'
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
    assertContainer(container);

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

    const bounds =
        geometry.bounds;

    const center =
        bounds.center;

    const size =
        Math.max(
            bounds.width,
            bounds.height,
            bounds.length,
            1
        );

    camera.position.set(
        center.x + size * 1.4,
        center.y + size * 0.9,
        center.z + size * 1.4
    );

    camera.lookAt(
        center.x,
        center.y,
        center.z
    );

    return camera;
}