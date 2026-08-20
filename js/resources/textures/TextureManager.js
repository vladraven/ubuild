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

function configureTexture(
    texture,
    definition
) {
    texture.wrapS = 1000;
    texture.wrapT = 1000;

    texture.repeat.set(
        definition.repeat.x,
        definition.repeat.y
    );

    texture.rotation =
        definition.rotation;

    texture.needsUpdate = true;

    return texture;
}

function loadTexture(
    loader,
    source,
    definition
) {
    if (!source) {
        return null;
    }

    return configureTexture(
        loader.load(source),
        definition
    );
}

export function createTextureManager({
    loader,
    catalog
}) {
    assertLoader(loader);

    if (
        !catalog ||
        typeof catalog !== 'object'
    ) {
        throw new TypeError(
            'Texture catalog is required'
        );
    }

    const textures = new Map();

    function get(
        name
    ) {
        if (!catalog[name]) {
            throw new RangeError(
                `Unknown texture: ${name}`
            );
        }

        if (textures.has(name)) {
            return textures.get(name);
        }

        const definition =
            catalog[name];

        const bundle = Object.freeze({
            colorMap: loadTexture(
                loader,
                definition.colorMap,
                definition
            ),

            normalMap: loadTexture(
                loader,
                definition.normalMap,
                definition
            ),

            bumpMap: loadTexture(
                loader,
                definition.bumpMap,
                definition
            ),

            roughnessMap: loadTexture(
                loader,
                definition.roughnessMap,
                definition
            )
        });

        textures.set(
            name,
            bundle
        );

        return bundle;
    }

    function has(
        name
    ) {
        return textures.has(name);
    }

    function clear(
        name
    ) {
        const bundle =
            textures.get(name);

        if (!bundle) {
            return;
        }

        disposeBundle(bundle);

        textures.delete(name);
    }

    function clearAll() {
        for (
            const bundle
            of textures.values()
        ) {
            disposeBundle(bundle);
        }

        textures.clear();
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
            disposed.add(texture);
        }
    }

    function getLoadedNames() {
        return [...textures.keys()];
    }

    return Object.freeze({
        get,
        has,
        clear,
        clearAll,
        getLoadedNames
    });
}