import * as THREE from 'three';

function assertContext(
    context
) {
    if (
        !context ||
        typeof context !== 'object'
    ) {
        throw new TypeError(
            'Element context is required'
        );
    }

    if (
        !context.geometry?.roof
    ) {
        throw new TypeError(
            'Roof geometry is required'
        );
    }

    if (
        !context.materials
    ) {
        throw new TypeError(
            'Material system is required'
        );
    }
}

const RIDGE_CAP_WIDTH = 0.25;
const RIDGE_CAP_THICKNESS = 0.02;

const RIDGE_CAP_END_INSET = 0.04;
const RIDGE_CAP_TUCK = 0.015;

function resolveMaterial(
    context
) {
    if (
        typeof context.materials.get ===
        'function'
    ) {
        return context.materials.get(
            'trimMetal',
            context.colors?.trim
        );
    }

    return (
        context.materials.trimMetal ||
        context.materials.steel
    );
}

function createRidgeEdge(
    edge,
    inset
) {
    if (
        !edge ||
        !edge.start ||
        !edge.end
    ) {
        return null;
    }

    const start =
        new THREE.Vector3(
            edge.start.x,
            edge.start.y,
            edge.start.z
        );

    const end =
        new THREE.Vector3(
            edge.end.x,
            edge.end.y,
            edge.end.z
        );

    const direction =
        end
            .clone()
            .sub(
                start
            );

    const length =
        direction.length();

    if (
        length <=
        inset * 2
    ) {
        return null;
    }

    direction.normalize();

    start.add(
        direction
            .clone()
            .multiplyScalar(
                inset
            )
    );

    end.add(
        direction
            .clone()
            .multiplyScalar(
                -inset
            )
    );

    return {
        start,
        end,
        length:
            start.distanceTo(
                end
            )
    };
}

function createRidgeMesh(
    edge,
    roof,
    material
) {
    if (
        !edge ||
        !roof
    ) {
        return null;
    }

    const start =
        edge.start;

    const end =
        edge.end;

    const length =
        edge.length;

    if (
        length <=
        0.001
    ) {
        return null;
    }

    const halfWidth =
        RIDGE_CAP_WIDTH /
        2;

    const pitchAngle =
        Number(
            roof.pitchAngle
        );

    const rise =
        halfWidth *
        Math.tan(
            pitchAngle
        );

    const shape =
        new THREE.Shape();

    shape.moveTo(
        -halfWidth,
        -rise
    );

    shape.lineTo(
        0,
        0
    );

    shape.lineTo(
        halfWidth,
        -rise
    );

    shape.lineTo(
        halfWidth,
        -rise +
            RIDGE_CAP_THICKNESS
    );

    shape.lineTo(
        0,
        RIDGE_CAP_THICKNESS
    );

    shape.lineTo(
        -halfWidth,
        -rise +
            RIDGE_CAP_THICKNESS
    );

    shape.closePath();

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth:
                    length,

                bevelEnabled:
                    false,

                steps:
                    1,

                curveSegments:
                    1
            }
        );

    geometry.translate(
        0,
        0,
        -length / 2
    );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        'ridge-cap';

    mesh.position.set(
        (
            start.x +
            end.x
        ) / 2,

        (
            start.y +
            end.y
        ) / 2,

        (
            start.z +
            end.z
        ) / 2
    );

    mesh.position.y -=
        RIDGE_CAP_TUCK;

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function isVisible(
    context
) {
    const visibility =
        context.model?.visibility ||
        {};

    return (
        visibility.ridge !==
        false
    ) && (
        visibility.trims !==
        false
    );
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const root =
        new THREE.Group();

    root.name =
        'ridge';

    if (
        !isVisible(
            context
        )
    ) {
        return root;
    }

    const roof =
        context.geometry.roof;

    if (
        roof.type !==
        'gabled'
    ) {
        return root;
    }

    if (
        !roof.ridge ||
        !roof.ridge.edge
    ) {
        return root;
    }

    const material =
        resolveMaterial(
            context
        );

    const edge =
        createRidgeEdge(
            roof.ridge.edge,
            RIDGE_CAP_END_INSET
        );

    if (
        !edge
    ) {
        return root;
    }

    const mesh =
        createRidgeMesh(
            edge,
            roof,
            material
        );

    if (
        mesh
    ) {
        root.add(
            mesh
        );
    }

    return root;
}

function disposeObject(
    object
) {
    if (
        !object
    ) {
        return;
    }

    object.traverse(
        child => {
            if (
                !child.isMesh
            ) {
                return;
            }

            if (
                child.geometry
            ) {
                child.geometry.dispose();

                child.geometry =
                    null;
            }
        }
    );

    const children =
        object.children.slice();

    for (
        let i = 0;
        i <
        children.length;
        i++
    ) {
        object.remove(
            children[i]
        );
    }

    object.removeFromParent();
}

export const RidgeOrchestrator =
    Object.freeze({
        id:
            'ridge',

        create(
            context
        ) {
            return createObject(
                context
            );
        },

        update(
            object,
            context
        ) {
            if (
                !object
            ) {
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

        dispose(
            object
        ) {
            disposeObject(
                object
            );
        }
    });