function assertElementDefinition(definition) {
    if (!definition || typeof definition !== 'object') {
        throw new TypeError('Element definition is required');
    }
    if (typeof definition.id !== 'string' || definition.id.trim() === '') {
        throw new TypeError('Element definition id is required');
    }
}
function assertGeometryProvider(provider) {
    if (!provider || typeof provider.create !== 'function') {
        throw new TypeError('Element geometry provider must provide create()');
    }
}
function assertVisualProvider(provider) {
    if (!provider || typeof provider.create !== 'function') {
        throw new TypeError('Element visual provider must provide create()');
    }
}
export function createElementOrchestrator({ definition, geometry, visual }) {
    assertElementDefinition(definition);
    assertGeometryProvider(geometry);
    assertVisualProvider(visual);
    function create(context) {
        const elementGeometry = geometry.create(context);
        const elementVisual = visual.create({
            ...context,
            geometry: elementGeometry
        });
        return {
            id: definition.id,
            geometry: elementGeometry,
            object: elementVisual
        };
    }
    function update(instance, context) {
        if (!instance) {
            return create(context);
        }
        const elementGeometry = geometry.create(context);
        const nextContext = {
            ...context,
            geometry: elementGeometry
        };
        if (typeof visual.update === 'function') {
            const elementVisual = visual.update(instance.object, nextContext);
            const nextInstance = {
                id: definition.id,
                geometry: elementGeometry,
                object: elementVisual || instance.object
            };
            if (nextInstance.object !== instance.object && typeof visual.dispose === 'function') {
                visual.dispose(instance);
            }
            return nextInstance;
        }
        const elementVisual = visual.create(nextContext);
        if (typeof visual.dispose === 'function') {
            visual.dispose(instance);
        }
        return {
            id: definition.id,
            geometry: elementGeometry,
            object: elementVisual
        };
    }
    function dispose(instance) {
        if (!instance || typeof visual.dispose !== 'function') {
            return;
        }
        visual.dispose(instance.object || instance);
    }
    return Object.freeze({
        id: definition.id,
        create,
        update,
        dispose
    });
}