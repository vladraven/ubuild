function assertElementDefinition(
    definition
) {
    if (
        !definition ||
        typeof definition !== 'object'
    ) {
        throw new TypeError(
            'Element definition is required'
        );
    }

    if (
        typeof definition.id !== 'string' ||
        definition.id.trim() === ''
    ) {
        throw new TypeError(
            'Element definition id is required'
        );
    }
}

function assertGeometryProvider(
    provider
) {
    if (
        !provider ||
        typeof provider.create !== 'function'
    ) {
        throw new TypeError(
            'Element geometry provider must provide create()'
        );
    }
}

function assertVisualProvider(
    provider
) {
    if (
        !provider ||
        typeof provider.create !== 'function'
    ) {
        throw new TypeError(
            'Element visual provider must provide create()'
        );
    }
}

export function createElementOrchestrator({
    definition,
    geometry,
    visual
}) {
    assertElementDefinition(
        definition
    );

    assertGeometryProvider(
        geometry
    );

    assertVisualProvider(
        visual
    );

    function create(context) {
        const elementGeometry =
            geometry.create(
                context
            );

        const elementVisual =
            visual.create({
                ...context,
                geometry: elementGeometry
            });

        return {
            id: definition.id,
            geometry: elementGeometry,
            object: elementVisual
        };
    }

    function update(
        object,
        context
    ) {
        if (!object) {
            return create(context);
        }

        const elementGeometry =
            geometry.create(
                context
            );

        if (
            typeof visual.update === 'function'
        ) {
            visual.update(
                object,
                {
                    ...context,
                    geometry: elementGeometry
                }
            );

            return {
                id: definition.id,
                geometry: elementGeometry,
                object
            };
        }

        const replacement =
            visual.create({
                ...context,
                geometry: elementGeometry
            });

        return {
            id: definition.id,
            geometry: elementGeometry,
            object: replacement
        };
    }

    function dispose(
        object
    ) {
        if (
            !object ||
            typeof visual.dispose !== 'function'
        ) {
            return;
        }

        visual.dispose(
            object
        );
    }

    return Object.freeze({
        id: definition.id,
        create,
        update,
        dispose
    });
}