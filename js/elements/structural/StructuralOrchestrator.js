import * as THREE from 'three';

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.structuralGeometry) {
        throw new TypeError(
            'Structural geometry is required'
        );
    }

    if (!context.materials) {
        throw new TypeError(
            'Material system is required'
        );
    }
}

function resolveMaterial(context) {
    if (
        typeof context.materials.get === 'function'
    ) {
        return context.materials.get(
            'structuralSteel',
            context.colors?.frame
        );
    }

    if (context.materials.structuralSteel) {
        return context.materials.structuralSteel;
    }

    if (context.materials.steel) {
        return context.materials.steel;
    }

    throw new Error(
        'Structural steel material is not available'
    );
}

function createBeam(
    line,
    material,
    thickness = 0.1
) {
    const direction = new THREE.Vector3(
        line.end.x - line.start.x,
        line.end.y - line.start.y,
        line.end.z - line.start.z
    );

    const length = direction.length();

    if (length <= 0) {
        return null;
    }

    const geometry =
        new THREE.BoxGeometry(
            thickness,
            thickness,
            length
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    const start =
        new THREE.Vector3(
            line.start.x,
            line.start.y,
            line.start.z
        );

    const end =
        new THREE.Vector3(
            line.end.x,
            line.end.y,
            line.end.z
        );

    const center =
        start.clone().add(end).multiplyScalar(0.5);

    mesh.position.copy(center);

    mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction.normalize()
    );

    return mesh;
}

function createObject(context) {
    assertContext(context);

    const root =
        new THREE.Group();

    root.name = 'structural';

    const material =
        resolveMaterial(context);

    for (
        const frame
        of context.structuralGeometry.frames
    ) {
        const group =
            new THREE.Group();

        group.name =
            `frame-${frame.index}`;

        for (
            const key
            of [
                'leftColumn',
                'leftRafter',
                'rightRafter',
                'rightColumn',
                'rafter'
            ]
        ) {
            if (!frame[key]) {
                continue;
            }

            const beam =
                createBeam(
                    frame[key],
                    material
                );

            if (beam) {
                group.add(beam);
            }
        }

        root.add(group);
    }

    for (
        const girt
        of context.structuralGeometry.girts
    ) {
        for (
            const side
            of [
                'front',
                'back',
                'left',
                'right'
            ]
        ) {
            const beam =
                createBeam(
                    girt[side],
                    material
                );

            if (beam) {
                root.add(beam);
            }
        }
    }

    for (
        const purlin
        of context.structuralGeometry.purlins
    ) {
        if (purlin.planes) {
            for (
                const line
                of Object.values(
                    purlin.planes
                )
            ) {
                const beam =
                    createBeam(
                        line,
                        material
                    );

                if (beam) {
                    root.add(beam);
                }
            }

            continue;
        }

        const beam =
            createBeam(
                purlin.plane,
                material
            );

        if (beam) {
            root.add(beam);
        }
    }

    return root;
}

function disposeObject(object) {
    if (!object) {
        return;
    }

    for (
        const child
        of [...object.children]
    ) {
        disposeObject(child);
    }

    object.geometry?.dispose();
    object.removeFromParent();
}

export const StructuralOrchestrator =
    Object.freeze({
        id: 'structural',

        create(context) {
            return createObject(context);
        },

        update(object, context) {
            if (!object) {
                return createObject(context);
            }

            disposeObject(object);

            return createObject(context);
        },

        dispose(object) {
            disposeObject(object);
        }
    });