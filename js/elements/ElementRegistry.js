function assertId(id) {
    if (
        typeof id !== 'string' ||
        id.trim() === ''
    ) {
        throw new TypeError(
            'Element id must be a non-empty string'
        );
    }
}

function assertOrchestrator(
    orchestrator,
    id
) {
    if (
        !orchestrator ||
        typeof orchestrator.create !== 'function'
    ) {
        throw new TypeError(
            `Invalid element orchestrator: ${id}`
        );
    }
}

export function createElementRegistry() {
    const elements = new Map();

    function register(
        id,
        orchestrator
    ) {
        assertId(id);
        assertOrchestrator(
            orchestrator,
            id
        );

        if (elements.has(id)) {
            throw new Error(
                `Element already registered: ${id}`
            );
        }

        elements.set(
            id,
            orchestrator
        );

        return orchestrator;
    }

    function get(id) {
        assertId(id);

        if (!elements.has(id)) {
            throw new Error(
                `Element not found: ${id}`
            );
        }

        return elements.get(id);
    }

    function has(id) {
        assertId(id);

        return elements.has(id);
    }

    function remove(id) {
        assertId(id);

        return elements.delete(id);
    }

    function clear() {
        elements.clear();
    }

    function ids() {
        return [...elements.keys()];
    }

    function values() {
        return [...elements.values()];
    }

    function entries() {
        return [...elements.entries()];
    }

    function createAll(context) {
        const result = new Map();

        for (
            const [id, orchestrator]
            of elements
        ) {
            result.set(
                id,
                orchestrator.create(
                    context
                )
            );
        }

        return result;
    }

    function updateAll(
        instances,
        context
    ) {
        const result = new Map();

        for (
            const [id, orchestrator]
            of elements
        ) {
            const current =
                instances?.get(id) ?? null;

            result.set(
                id,
                orchestrator.update(
                    current,
                    context
                )
            );
        }

        return result;
    }

    function disposeAll(
        instances
    ) {
        for (
            const [id, orchestrator]
            of elements
        ) {
            const instance =
                instances?.get(id);

            if (!instance) {
                continue;
            }

            orchestrator.dispose(
                instance.object
            );
        }
    }

    return Object.freeze({
        register,
        get,
        has,
        remove,
        clear,
        ids,
        values,
        entries,
        createAll,
        updateAll,
        disposeAll
    });
}