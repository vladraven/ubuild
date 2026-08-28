const COLOR_ALIASES =
    Object.freeze({
        eavetrim:
            'eaveTrim',

        raketrim:
            'rakeTrim',

        structuralsteel:
            'structuralSteel',

        interiorwall:
            'interiorWall',

        wainscotmetal:
            'wainscot'
    });

function normalizeColorKey(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    let key =
        String(value).trim();

    if (!key) {
        return null;
    }

    key =
        key
            .replace(
                /^color[-_]?/i,
                ''
            )
            .replace(
                /[-_]+(.)/g,
                (_, char) =>
                    char.toUpperCase()
            );

    const lower =
        key.toLowerCase();

    return (
        COLOR_ALIASES[lower] ||
        key.charAt(0).toLowerCase() +
        key.slice(1)
    );
}

function normalizeColorValue(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const color =
        String(value).trim();

    return color || null;
}

export function createColors(model) {
    return Object.freeze({
        ...(model?.colors || {})
    });
}

export {
    COLOR_ALIASES,
    normalizeColorKey,
    normalizeColorValue
};