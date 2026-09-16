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



// BUGFIX: exposure was compensating for an overexposed scene (see
// LightingSystem.js). Now that total light energy is realistic, a
// neutral exposure of 1.0 reproduces material albedo colors correctly
// instead of crushing them toward white via ACES tone mapping.
renderer.outputColorSpace = THREE.SRGBColorSpace; 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(
        renderer.domElement
    );

    return renderer;
}