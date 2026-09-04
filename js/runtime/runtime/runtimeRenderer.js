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

export function createRenderer(
    container
) {
    assertContainer(container);

    const renderer =
        new THREE.WebGLRenderer({
            antialias: true,
            powerPreference:
                'high-performance',
            preserveDrawingBuffer:
                true
        });

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio || 1,
            2
        )
    );

    renderer.setSize(
        Math.max(
            container.clientWidth,
            1
        ),
        Math.max(
            container.clientHeight,
            1
        )
    );

    renderer.shadowMap.enabled =
        true;

    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;



renderer.outputColorSpace = THREE.SRGBColorSpace; 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMappingExposure = .5;

    container.appendChild(
        renderer.domElement
    );

    return renderer;
}