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



// Matches legacy/js/scene.js: legacy never set toneMapping/exposure at
// all, so three.js used its default THREE.NoToneMapping -- lit surfaces
// and the skybox background both rendered at their native brightness
// with no extra tone-curve/exposure multiplier crushing either one.
// ACESFilmicToneMapping + a low exposure was being used here to
// compensate for overexposed material colors, but that same exposure
// multiplies the ENTIRE framebuffer including scene.background, so any
// exposure low enough to fix building colors also crushed the sky to
// near-black. Removing tone mapping (like legacy) means colors are
// corrected via light intensity instead of exposure, and the sky is no
// longer collateral damage.
renderer.outputColorSpace = THREE.SRGBColorSpace; 
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(
        renderer.domElement
    );

    return renderer;
}