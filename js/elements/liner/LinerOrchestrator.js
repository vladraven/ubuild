import * as THREE from 'three';

const LINER_RIDGE_HEIGHT =
    1;

const LINER_RIDGE_WIDTH =
    LINER_RIDGE_HEIGHT * 4;

const LINER_RIDGE_GAP =
    LINER_RIDGE_HEIGHT * 4;

const LINER_RIDGE_PERIOD =
    LINER_RIDGE_WIDTH +
    LINER_RIDGE_GAP;

function assertContext(
    context
) {
    if (
        !context ||
        typeof context !==
        'object'
    ) {
        throw new TypeError(
            'Element context is required'
        );
    }

    if (
        !context.geometry?.liner
    ) {
        throw new TypeError(
            'Liner geometry is required'
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

function resolveMaterial(
    context
) {
    if (
        typeof context.materials.get !==
        'function'
    ) {
        return (
            context.materials.interiorWall ||
            context.materials.wallMetal
        );
    }

    return context.materials.get(
        'interiorWall',
        context.colors?.interiorWall ||
        '#EEEEEE'
    );
}

function createShape(
    sideData
) {
    const shape =
        new THREE.Shape();

    sideData.shapeData.points.forEach(
        (
            point,
            index
        ) => {
            if (
                index === 0
            ) {
                shape.moveTo(
                    point.x,
                    point.y
                );

                return;
            }

            shape.lineTo(
                point.x,
                point.y
            );
        }
    );

    shape.closePath();

    for (
        const hole
        of sideData.shapeData.holes
    ) {
        const path =
            new THREE.Path();

        path.moveTo(
            hole.minX,
            hole.minY
        );

        path.lineTo(
            hole.maxX,
            hole.minY
        );

        path.lineTo(
            hole.maxX,
            hole.maxY
        );

        path.lineTo(
            hole.minX,
            hole.maxY
        );

        path.closePath();

        shape.holes.push(
            path
        );
    }

    return shape;
}

function createGeometry(
    sideData
) {
    return new THREE.ExtrudeGeometry(
        createShape(
            sideData
        ),
        {
            depth:
                sideData.thickness,

            bevelEnabled:
                false
        }
    );
}

function getSideWidth(
    geometry
) {
    geometry.computeBoundingBox();

    const box =
        geometry.boundingBox;

    if (
        !box
    ) {
        return 1;
    }

    return Math.max(
        1,
        box.max.x -
        box.min.x
    );
}

function createMaterial(
    source,
    width
) {
    const material =
        source.clone();

    material.side =
        THREE.DoubleSide;

    // Each wall needs its own texture scale.
    if (
        !source.bumpMap
    ) {
        material.needsUpdate =
            true;

        return material;
    }

    const bumpMap =
        source.bumpMap.clone();

    bumpMap.wrapS =
        THREE.RepeatWrapping;

    bumpMap.wrapT =
        THREE.RepeatWrapping;

    bumpMap.repeat.set(
        width /
        LINER_RIDGE_PERIOD,
        1
    );

    bumpMap.needsUpdate =
        true;

    material.bumpMap =
        bumpMap;

    material.needsUpdate =
        true;

    return material;
}

function createSideMesh(
    sideData,
    sourceMaterial
) {
    const geometry =
        createGeometry(
            sideData
        );

    const material =
        createMaterial(
            sourceMaterial,
            getSideWidth(
                geometry
            )
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        `liner-side-${sideData.side}`;

    const bounds =
        sideData.bounds;

    if (
        sideData.side === 'F'
    ) {
        mesh.position.set(
            bounds.min.x,
            0,
            bounds.min.z
        );
    } else if (
        sideData.side === 'B'
    ) {
        mesh.position.set(
            bounds.max.x,
            0,
            bounds.max.z
        );

        mesh.rotation.y =
            Math.PI;
    } else if (
        sideData.side === 'L'
    ) {
        mesh.position.set(
            bounds.max.x,
            0,
            bounds.min.z
        );

        mesh.rotation.y =
            -Math.PI / 2;
    } else if (
        sideData.side === 'R'
    ) {
        mesh.position.set(
            bounds.min.x,
            0,
            bounds.max.z
        );

        mesh.rotation.y =
            Math.PI / 2;
    }

    mesh.castShadow =
        false;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const liner =
        context.geometry.liner;

    const root =
        new THREE.Group();

    root.name =
        'liner';

    if (
        !liner.enabled
    ) {
        return root;
    }

    if (
        context.model?.visibility?.liner ===
        false
    ) {
        return root;
    }

    const material =
        resolveMaterial(
            context
        );

    for (
        const side
        of [
            'F',
            'B',
            'L',
            'R'
        ]
    ) {
        const sideData =
            liner.sides[side];

        if (
            !sideData
        ) {
            continue;
        }

        root.add(
            createSideMesh(
                sideData,
                material
            )
        );
    }

    return root;
}

function disposeMaterial(
    material
) {
    if (
        !material
    ) {
        return;
    }

    if (
        material.bumpMap &&
        material.bumpMap !==
        material.userData?.sharedBumpMap
    ) {
        material.bumpMap.dispose();
    }

    material.dispose();
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

            if (
                Array.isArray(
                    child.material
                )
            ) {
                for (
                    const material
                    of child.material
                ) {
                    disposeMaterial(
                        material
                    );
                }
            } else {
                disposeMaterial(
                    child.material
                );
            }

            child.material =
                null;
        }
    );

    const children =
        object.children.slice();

    for (
        const child
        of children
    ) {
        object.remove(
            child
        );
    }

    object.removeFromParent();
}

export const LinerOrchestrator =
    Object.freeze({

        id:
            'liner',

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