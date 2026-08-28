import * as THREE from 'three';

function assertContext(context) {
    if (
        !context ||
        typeof context !== 'object'
    ) {
        throw new TypeError(
            'Element context is required'
        );
    }

    if (
        !context.geometry?.trims
    ) {
        throw new TypeError(
            'Trims geometry is required'
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

const RAKE_TRIM_WIDTH = 0.12;
const RAKE_TRIM_DEPTH = 0.06;

const CORNER_TRIM_LEG = 0.10;
const CORNER_TRIM_THICKNESS = 0.008;

function resolveMaterial(
    context,
    name = 'trimMetal'
) {
    if (
        typeof context.materials.get ===
        'function'
    ) {
        return context.materials.get(
            name,
            context.colors?.trim
        );
    }

    return (
        context.materials[name] ||
        context.materials.trimMetal ||
        context.materials.steel
    );
}

function createProfileMesh(
    lineSeg,
    material,
    width = 0.1,
    depth = 0.05
) {
    if (
        !lineSeg ||
        !lineSeg.start ||
        !lineSeg.end
    ) {
        return null;
    }

    const start =
        new THREE.Vector3(
            lineSeg.start.x,
            lineSeg.start.y,
            lineSeg.start.z
        );

    const end =
        new THREE.Vector3(
            lineSeg.end.x,
            lineSeg.end.y,
            lineSeg.end.z
        );

    const direction =
        end.clone().sub(start);

    const length =
        direction.length();

    if (
        length <= 0.001
    ) {
        return null;
    }

    direction.normalize();

    let upHint =
        new THREE.Vector3(
            0,
            1,
            0
        );

    if (
        Math.abs(
            direction.dot(
                upHint
            )
        ) > 0.999
    ) {
        upHint =
            new THREE.Vector3(
                1,
                0,
                0
            );
    }

    const xAxis =
        new THREE.Vector3()
            .crossVectors(
                upHint,
                direction
            )
            .normalize();

    const yAxis =
        new THREE.Vector3()
            .crossVectors(
                direction,
                xAxis
            )
            .normalize();

    const geometry =
        new THREE.BoxGeometry(
            width,
            depth,
            length
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.position.copy(
        start
            .clone()
            .add(end)
            .multiplyScalar(
                0.5
            )
    );

    const basis =
        new THREE.Matrix4()
            .makeBasis(
                xAxis,
                yAxis,
                direction
            );

    mesh.quaternion.setFromRotationMatrix(
        basis
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createRakeTrimMesh(
    lineSeg,
    material,
    width = RAKE_TRIM_WIDTH,
    depth = RAKE_TRIM_DEPTH,
    miterSide = 1
) {
    if (
        !lineSeg ||
        !lineSeg.start ||
        !lineSeg.end
    ) {
        return null;
    }

    const start =
        new THREE.Vector3(
            lineSeg.start.x,
            lineSeg.start.y,
            lineSeg.start.z
        );

    const end =
        new THREE.Vector3(
            lineSeg.end.x,
            lineSeg.end.y,
            lineSeg.end.z
        );

    const direction =
        end.clone().sub(start);

    const length =
        direction.length();

    if (
        length <= 0.001
    ) {
        return null;
    }

    direction.normalize();

    let upHint =
        new THREE.Vector3(
            0,
            1,
            0
        );

    if (
        Math.abs(
            direction.dot(
                upHint
            )
        ) > 0.999
    ) {
        upHint =
            new THREE.Vector3(
                1,
                0,
                0
            );
    }

    const xAxis =
        new THREE.Vector3()
            .crossVectors(
                upHint,
                direction
            )
            .normalize();

    const yAxis =
        new THREE.Vector3()
            .crossVectors(
                direction,
                xAxis
            )
            .normalize();

    const halfWidth =
        width / 2;

    const halfDepth =
        depth / 2;

    const sign =
        miterSide >= 0
            ? 1
            : -1;

    const cutAt =
        x =>
            length -
            sign * x;

    const x0 =
        -halfWidth;

    const x1 =
        halfWidth;

    const z0 =
        cutAt(x0);

    const z1 =
        cutAt(x1);

    if (
        Math.min(
            z0,
            z1
        ) <= 0
    ) {
        return createProfileMesh(
            lineSeg,
            material,
            width,
            depth
        );
    }

    const localVertices = [
        x0,
        -halfDepth,
        0,

        x1,
        -halfDepth,
        0,

        x0,
        halfDepth,
        0,

        x1,
        halfDepth,
        0,

        x0,
        -halfDepth,
        z0,

        x1,
        -halfDepth,
        z1,

        x0,
        halfDepth,
        z0,

        x1,
        halfDepth,
        z1
    ];

    const positions =
        new Float32Array(
            localVertices.length
        );

    for (
        let i = 0;
        i < localVertices.length;
        i += 3
    ) {
        const local =
            new THREE.Vector3(
                localVertices[i],
                localVertices[i + 1],
                localVertices[i + 2]
            );

        const world =
            start
                .clone()
                .add(
                    xAxis
                        .clone()
                        .multiplyScalar(
                            local.x
                        )
                )
                .add(
                    yAxis
                        .clone()
                        .multiplyScalar(
                            local.y
                        )
                )
                .add(
                    direction
                        .clone()
                        .multiplyScalar(
                            local.z
                        )
                );

        positions[i] =
            world.x;

        positions[i + 1] =
            world.y;

        positions[i + 2] =
            world.z;
    }

    const indices = [
        0, 2, 1,
        1, 2, 3,

        0, 1, 5,
        0, 5, 4,

        2, 6, 7,
        2, 7, 3,

        0, 4, 6,
        0, 6, 2,

        1, 3, 7,
        1, 7, 5,

        4, 5, 7,
        4, 7, 6
    ];

    const geometry =
        new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            positions,
            3
        )
    );

    geometry.setIndex(
        indices
    );

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        'rake-trim';

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createCornerTrimMesh(
    corner,
    material
) {
    if (
        !corner ||
        !corner.edge ||
        !corner.edge.start ||
        !corner.edge.end
    ) {
        return null;
    }

    const start =
        corner.edge.start;

    const end =
        corner.edge.end;

    const colH =
        Math.abs(
            end.y -
            start.y
        );

    if (
        colH <= 0.001
    ) {
        return null;
    }

    const leg =
        CORNER_TRIM_LEG;

    const thickness =
        CORNER_TRIM_THICKNESS;

    const sx =
        corner.sx != null
            ? corner.sx
            : -1;

    const sz =
        corner.sz != null
            ? corner.sz
            : -1;

    /*
     * sx / sz already describe the
     * outward direction of the corner.
     *
     * Do NOT invert them.
     */

    const dirX =
        sx;

    const dirZ =
        sz;

    const cut =
        thickness;

    const shape =
        new THREE.Shape();

    shape.moveTo(
        0,
        0
    );

    shape.lineTo(
        dirX *
            (leg - cut),
        0
    );

    shape.lineTo(
        dirX * leg,
        dirZ * thickness
    );

    shape.lineTo(
        dirX * thickness,
        dirZ * thickness
    );

    shape.lineTo(
        dirX * thickness,
        dirZ *
            (leg - cut)
    );

    shape.lineTo(
        0,
        dirZ * leg
    );

    shape.closePath();

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth: colH,
                bevelEnabled: false,
                steps: 1,
                curveSegments: 1
            }
        );

    geometry.rotateX(
        -Math.PI / 2
    );

    const pos =
        geometry.attributes.position;

    for (
        let i = 0;
        i < pos.count;
        i++
    ) {
        pos.setZ(
            i,
            -pos.getZ(i)
        );
    }

    pos.needsUpdate =
        true;

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.name =
        corner.id ||
        'corner-trim';

    mesh.position.set(
        start.x,
        Math.min(
            start.y,
            end.y
        ),
        start.z
    );

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    mesh.renderOrder =
        8;

    return mesh;
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const trimsData =
        context.geometry.trims;

    const root =
        new THREE.Group();

    root.name =
        'trims';

    root.userData.trimGroups =
        Object.create(
            null
        );

    if (
        !trimsData.enabled
    ) {
        return root;
    }

    if (
        context.model?.visibility?.trims ===
        false
    ) {
        return root;
    }

    const trimMaterial =
        resolveMaterial(
            context,
            'trimMetal'
        );

    const eaveMaterial =
        resolveMaterial(
            context,
            'eaveTrim'
        );

    console.log(
        'TRIM MATERIAL',
        trimMaterial?.uuid,
        trimMaterial?.color?.getHexString?.(),
        context.colors?.trim,
        context.colors?.wall
    );

    const eaveGroup =
        new THREE.Group();

    eaveGroup.name =
        'eave-trim';

    for (
        const eave
        of trimsData.eaves
    ) {
        const mesh =
            createProfileMesh(
                eave.edge,
                eaveMaterial,
                0.12,
                0.06
            );

        if (
            mesh
        ) {
            eaveGroup.add(
                mesh
            );
        }
    }

    const roofTrimGroup =
        new THREE.Group();

    roofTrimGroup.name =
        'roof-trim';

    for (
        const rake
        of trimsData.rake
    ) {
        const miterSide =
            rake.slope === 'left'
                ? 1
                : -1;

        const mesh =
            createRakeTrimMesh(
                rake.edge,
                trimMaterial,
                RAKE_TRIM_WIDTH,
                RAKE_TRIM_DEPTH,
                miterSide
            );

        if (
            mesh
        ) {
            roofTrimGroup.add(
                mesh
            );
        }
    }

    const cornerGroup =
        new THREE.Group();

    cornerGroup.name =
        'corner-trim';

    for (
        const corner
        of trimsData.corners
    ) {
        const mesh =
            createCornerTrimMesh(
                corner,
                trimMaterial
            );

        if (
            mesh
        ) {
            console.log(
                'CORNER TRIM MATERIAL',
                mesh.material?.uuid,
                mesh.material?.color?.getHexString?.(),
                'trim=',
                context.colors?.trim,
                'wall=',
                context.colors?.wall
            );

            cornerGroup.add(
                mesh
            );
        }
    }

    root.add(
        eaveGroup,
        roofTrimGroup,
        cornerGroup
    );

    root.userData.trimGroups.eave =
        eaveGroup;

    root.userData.trimGroups.roof =
        roofTrimGroup;

    root.userData.trimGroups.corner =
        cornerGroup;

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
        i < children.length;
        i++
    ) {
        object.remove(
            children[i]
        );
    }

    object.removeFromParent();
}

export const TrimOrchestrator =
    Object.freeze({
        id: 'trims',

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