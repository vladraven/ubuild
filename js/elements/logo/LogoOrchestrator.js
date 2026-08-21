import * as THREE from 'three';

const LOGO_URL =
    'https://ubuildsb.com/wp-content/themes/U-Build/js/U-build-logo.png';

const LOGO_WIDTH = 1.0;
const LOGO_HEIGHT = 0.33;
const PLATE_THICKNESS = 0.08;

let logoTexture = null;

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.logo) {
        throw new TypeError('Logo geometry is required');
    }

    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function getMaterial(
    context,
    name,
    fallback
) {
    if (
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            name,
            fallback
        );
    }

    return (
        context.materials[name] ||
        fallback
    );
}

function loadLogoTexture() {
    if (logoTexture) {
        return logoTexture;
    }

    const loader =
        new THREE.TextureLoader();

    logoTexture =
        loader.load(
            LOGO_URL
        );

    logoTexture.colorSpace =
        THREE.SRGBColorSpace;

    logoTexture.wrapS =
        THREE.ClampToEdgeWrapping;

    logoTexture.wrapT =
        THREE.ClampToEdgeWrapping;

    logoTexture.minFilter =
        THREE.LinearFilter;

    logoTexture.magFilter =
        THREE.LinearFilter;

    logoTexture.generateMipmaps =
        true;

    return logoTexture;
}

function createPlate(
    context
) {
    const material =
        getMaterial(
            context,
            'trimMetal',
            '#FFFFFF'
        );

    const geometry =
        new THREE.BoxGeometry(
            LOGO_WIDTH + 0.10,
            LOGO_HEIGHT + 0.10,
            PLATE_THICKNESS
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        'logo-plate';

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function createFrame(
    context
) {
    const material =
        getMaterial(
            context,
            'trim',
            context.materials.trimMetal ||
            '#FFFFFF'
        );

    const geometry =
        new THREE.BoxGeometry(
            LOGO_WIDTH + 0.12,
            LOGO_HEIGHT + 0.12,
            PLATE_THICKNESS / 2
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        'logo-frame';

    mesh.position.z =
        -PLATE_THICKNESS / 2;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function createLogoMesh() {
    const texture =
        loadLogoTexture();

    const material =
        new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: true
        });

    const geometry =
        new THREE.PlaneGeometry(
            LOGO_WIDTH,
            LOGO_HEIGHT
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        'logo-image';

    mesh.position.z =
        PLATE_THICKNESS / 2 +
        0.005;

    return mesh;
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const logoData =
        context.geometry.logo;

    const root =
        new THREE.Group();

    root.name =
        'logo';

    if (
        !logoData.enabled ||
        !logoData.position
    ) {
        return root;
    }

    const plate =
        createPlate(
            context
        );

    const frame =
        createFrame(
            context
        );

    const image =
        createLogoMesh();

    root.add(
        plate,
        frame,
        image
    );

    root.position.set(
        Number(
            logoData.position.x
        ) || 0,
        Number(
            logoData.position.y
        ) || 0,
        Number(
            logoData.position.z
        ) || 0
    );

    if (
        Number.isFinite(
            logoData.rotationY
        )
    ) {
        root.rotation.y =
            logoData.rotationY;
    }

    if (
        Number.isFinite(
            logoData.rotationX
        )
    ) {
        root.rotation.x =
            logoData.rotationX;
    }

    if (
        Number.isFinite(
            logoData.rotationZ
        )
    ) {
        root.rotation.z =
            logoData.rotationZ;
    }

    root.traverse(
        child => {
            if (!child.isMesh) {
                return;
            }

            child.castShadow = true;
            child.receiveShadow = true;
        }
    );

    return root;
}

function disposeMaterial(
    material
) {
    if (!material) {
        return;
    }

    if (
        material.map &&
        material.map !== logoTexture
    ) {
        material.map.dispose();
    }

    material.dispose();
}

function disposeObject(
    object
) {
    if (!object) {
        return;
    }

    object.traverse(
        child => {
            if (!child.isMesh) {
                return;
            }

            if (
                child.geometry
            ) {
                child.geometry.dispose();
                child.geometry = null;
            }

            if (
                child.material
            ) {
                if (
                    Array.isArray(
                        child.material
                    )
                ) {
                    child.material.forEach(
                        disposeMaterial
                    );
                } else {
                    disposeMaterial(
                        child.material
                    );
                }

                child.material = null;
            }
        }
    );

    const children =
        object.children.slice();

    for (
        let i = 0;
        i < children.length;
        i++
    ) {
        object.remove(
            children[i]
        );
    }

    object.removeFromParent();
}

export const LogoOrchestrator =
    Object.freeze({
        id: 'logo',

        create(context) {
            return createObject(
                context
            );
        },

        update(
            object,
            context
        ) {
            if (!object) {
                return createObject(
                    context
                );
            }

            disposeObject(
                object
            );

            return createObject(
                context
            );
        },

        dispose(object) {
            disposeObject(
                object
            );
        }
    });