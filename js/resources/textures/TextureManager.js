import * as THREE from 'three';

function assertLoader(loader) {
    if (
        !loader ||
        typeof loader.load !== 'function'
    ) {
        throw new TypeError(
            'Texture loader must provide load()'
        );
    }
}

function resolveTextureUrl(source) {
    if (!source) {
        return null;
    }

    if (
        /^(https?:)?\/\//i.test(source) ||
        source.startsWith('data:') ||
        source.startsWith('blob:')
    ) {
        return source;
    }

    const base =
        typeof window !== 'undefined'
            ? window.UBUILD_CONFIG?.themeUrl
            : null;

    if (!base) {
        return source;
    }

    return `${base.replace(/\/$/, '')}/${source.replace(/^\/+/, '')}`;
}

function configureTexture(
    texture,
    definition,
    colorTexture
) {
    if (!texture) {
        return null;
    }

    texture.wrapS =
        THREE.RepeatWrapping;

    texture.wrapT =
        THREE.RepeatWrapping;

    texture.repeat.set(
        Number(definition.repeat?.x) || 1,
        Number(definition.repeat?.y) || 1
    );

    texture.rotation =
        Number(definition.rotation) || 0;

    texture.anisotropy = 16;

    texture.colorSpace =
        colorTexture
            ? THREE.SRGBColorSpace
            : THREE.NoColorSpace;

    return texture;
}

function isTextureReady(texture) {
    if (!texture) {
        return false;
    }

    const image =
        texture.image;

    if (!image) {
        return false;
    }

    if (
        typeof image.width === 'number' &&
        typeof image.height === 'number'
    ) {
        return (
            image.width > 0 &&
            image.height > 0
        );
    }

    return true;
}

function loadTexture(
    loader,
    source,
    definition,
    colorTexture,
    onLoaded,
    onError
) {
    if (!source) {
        return null;
    }

    const url =
        resolveTextureUrl(
            source
        );

    if (!url) {
        return null;
    }

    const texture =
        loader.load(
            url,

            loadedTexture => {
                if (
                    !loadedTexture
                ) {
                    if (
                        typeof onError ===
                        'function'
                    ) {
                        onError(
                            new Error(
                                'Texture loader returned no texture'
                            ),
                            url
                        );
                    }

                    return;
                }

                if (
                    !isTextureReady(
                        loadedTexture
                    )
                ) {
                    if (
                        typeof onError ===
                        'function'
                    ) {
                        onError(
                            new Error(
                                `Texture image is not ready: ${url}`
                            ),
                            url
                        );
                    }

                    return;
                }

                configureTexture(
                    loadedTexture,
                    definition,
                    colorTexture
                );

                /*
                 * Only mark a texture for update
                 * after the image actually exists.
                 */
                loadedTexture.needsUpdate =
                    true;

                loadedTexture.userData =
                    loadedTexture.userData ||
                    {};

                loadedTexture.userData.source =
                    url;

                loadedTexture.userData.isUBuildManagedTexture =
                    true;

                loadedTexture.userData.loaded =
                    true;

                if (
                    typeof onLoaded ===
                    'function'
                ) {
                    onLoaded(
                        loadedTexture,
                        url
                    );
                }
            },

            undefined,

            error => {
                if (
                    typeof onError ===
                    'function'
                ) {
                    onError(
                        error,
                        url
                    );
                }
            }
        );

    /*
     * TextureLoader creates a Texture
     * immediately, before the image has
     * necessarily loaded.
     *
     * Configure it, but DO NOT set
     * needsUpdate here.
     */
    configureTexture(
        texture,
        definition,
        colorTexture
    );

    texture.userData =
        texture.userData ||
        {};

    texture.userData.source =
        url;

    texture.userData.isUBuildManagedTexture =
        true;

    texture.userData.loaded =
        false;

    return texture;
}

function disposeBundle(
    bundle
) {
    const disposed =
        new Set();

    for (
        const texture
        of Object.values(bundle)
    ) {
        if (
            !texture ||
            disposed.has(texture)
        ) {
            continue;
        }

        texture.dispose();

        disposed.add(
            texture
        );
    }
}

export function createTextureManager({
    loader,
    catalog,
    onTextureLoaded,
    onTextureError
}) {
    assertLoader(
        loader
    );

    if (
        !catalog ||
        typeof catalog !== 'object'
    ) {
        throw new TypeError(
            'Texture catalog is required'
        );
    }

    const textures =
        new Map();

    function get(name) {
        if (
            !catalog[name]
        ) {
            throw new RangeError(
                `Unknown texture: ${name}`
            );
        }

        if (
            textures.has(name)
        ) {
            return textures.get(
                name
            );
        }

        const definition =
            catalog[name];

        const bundle =
            Object.freeze({
                colorMap:
                    loadTexture(
                        loader,
                        definition.colorMap,
                        definition,
                        true,
                        onTextureLoaded,
                        onTextureError
                    ),

                normalMap:
                    loadTexture(
                        loader,
                        definition.normalMap,
                        definition,
                        false,
                        onTextureLoaded,
                        onTextureError
                    ),

                bumpMap:
                    loadTexture(
                        loader,
                        definition.bumpMap,
                        definition,
                        false,
                        onTextureLoaded,
                        onTextureError
                    ),

                roughnessMap:
                    loadTexture(
                        loader,
                        definition.roughnessMap,
                        definition,
                        false,
                        onTextureLoaded,
                        onTextureError
                    )
            });

        textures.set(
            name,
            bundle
        );

        return bundle;
    }

    function has(name) {
        return textures.has(
            name
        );
    }

    function clear(name) {
        const bundle =
            textures.get(
                name
            );

        if (!bundle) {
            return;
        }

        disposeBundle(
            bundle
        );

        textures.delete(
            name
        );
    }

    function clearAll() {
        for (
            const bundle
            of textures.values()
        ) {
            disposeBundle(
                bundle
            );
        }

        textures.clear();
    }

    function getLoadedNames() {
        return [
            ...textures.keys()
        ];
    }

    return Object.freeze({
        get,
        has,
        clear,
        clearAll,
        getLoadedNames,
        resolveTextureUrl
    });
}