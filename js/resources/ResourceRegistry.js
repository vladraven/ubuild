function assertName(name) {
    if (
        typeof name !== 'string' ||
        name.trim() === ''
    ) {
        throw new TypeError(
            'Resource name must be a non-empty string'
        );
    }
}

function assertResource(resource, name) {
    if (
        resource === null ||
        resource === undefined
    ) {
        throw new TypeError(
            `Resource is required: ${name}`
        );
    }
}

export function createResourceRegistry() {
    const resources = new Map();

    function register(
        name,
        resource
    ) {
        assertName(name);
        assertResource(
            resource,
            name
        );

        if (resources.has(name)) {
            throw new Error(
                `Resource already registered: ${name}`
            );
        }

        resources.set(
            name,
            resource
        );

        return resource;
    }

    function replace(
        name,
        resource
    ) {
        assertName(name);
        assertResource(
            resource,
            name
        );

        resources.set(
            name,
            resource
        );

        return resource;
    }

    function get(
        name
    ) {
        assertName(name);

        if (!resources.has(name)) {
            throw new Error(
                `Resource not found: ${name}`
            );
        }

        return resources.get(name);
    }

    function has(
        name
    ) {
        assertName(name);

        return resources.has(name);
    }

    function remove(
        name
    ) {
        assertName(name);

        return resources.delete(name);
    }

    function clear() {
        resources.clear();
    }

    function entries() {
        return [...resources.entries()];
    }

    function names() {
        return [...resources.keys()];
    }

    function values() {
        return [...resources.values()];
    }

    function size() {
        return resources.size;
    }

    return Object.freeze({
        register,
        replace,
        get,
        has,
        remove,
        clear,
        entries,
        names,
        values,
        size
    });
}