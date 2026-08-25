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

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

/*
 * Creates a rake trim whose longitudinal axis remains exactly on
 * lineSeg.start -> lineSeg.end.
 *
 * The only difference from createProfileMesh() is the final end cut.
 *
 * The cut is a 45-degree miter:
 *
 *     ─────────────────╲
 *                      ╲
 *                       ●
 *
 * The centerline itself is NOT rotated.
 *
 * The end plane is diagonal across the width of the trim so that
 * two perpendicular rake trims can meet at one common building
 * corner/ridge point without producing the old M-shaped overlap.
 *
 * miterSide:
 *     -1 = diagonal runs one way across the profile
 *     +1 = mirrored diagonal
 */
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

    /*
     * Same stable basis as createProfileMesh().
     *
     * local X = width of the trim
     * local Y = depth/thickness of the trim
     * local Z = longitudinal direction
     */

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

    /*
     * The miter is made across the width of the trim.
     *
     * For a 45-degree cut:
     *
     * longitudinal offset =
     * width offset
     *
     * The point at one edge of the trim therefore reaches the
     * nominal end point while the opposite edge finishes one
     * trim-width earlier.
     */

    const halfWidth =
        width / 2;

    const halfDepth =
        depth / 2;

    const sign =
        miterSide >= 0
            ? 1
            : -1;

    /*
     * local X positions:
     *
     * x0 = left side
     * x1 = right side
     *
     * local Z positions at the cut:
     *
     * z = length - sign * x
     *
     * Shift x so the centreline still terminates exactly at
     * lineSeg.end.
     */

    const cutAt =
        x => {
            return (
                length -
                sign * x
            );
        };

    const x0 =
        -halfWidth;

    const x1 =
        halfWidth;

    const z0 =
        cutAt(x0);

    const z1 =
        cutAt(x1);

    /*
     * Clamp the cut so a pathological very short rake cannot
     * reverse the geometry.
     */

    const minEnd =
        Math.min(
            z0,
            z1
        );

    if (
        minEnd <= 0
    ) {
        return createProfileMesh(
            lineSeg,
            material,
            width,
            depth
        );
    }

    /*
     * Vertices:
     *
     * Start rectangle:
     *
     *   0 ----- 1
     *   |       |
     *   2 ----- 3
     *
     * End rectangle is diagonal:
     *
     *   4 --------
     *      \
     *       \
     *        5
     *
     * We use the complete rectangular thickness at both sides
     * of the diagonal cut.
     */

    const vertices = [
        /*
         * START - upper side
         */
        x0,
        -halfDepth,
        0,

        x1,
        -halfDepth,
        0,

        /*
         * START - lower side
         */
        x0,
        halfDepth,
        0,

        x1,
        halfDepth,
        0,

        /*
         * END - upper side
         */
        x0,
        -halfDepth,
        z0,

        x1,
        -halfDepth,
        z1,

        /*
         * END - lower side
         */
        x0,
        halfDepth,
        z0,

        x1,
        halfDepth,
        z1
    ];

    /*
     * Convert local vertices into world coordinates.
     */

    const position =
        new Float32Array(
            vertices.length
        );

    for (
        let i = 0;
        i < vertices.length;
        i += 3
    ) {
        const local =
            new THREE.Vector3(
                vertices[i],
                vertices[i + 1],
                vertices[i + 2]
            );

        const world =
            start.clone()
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

        position[i] =
            world.x;

        position[i + 1] =
            world.y;

        position[i + 2] =
            world.z;
    }

    /*
     * Faces.
     *
     * The winding is chosen so normals face outward.
     */

    const indices = [
        /*
         * START
         */
        0, 2, 1,
        1, 2, 3,

        /*
         * TOP
         */
        0, 1, 5,
        0, 5, 4,

        /*
         * BOTTOM
         */
        2, 6, 7,
        2, 7, 3,

        /*
         * LEFT SIDE
         */
        0, 4, 6,
        0, 6, 2,

        /*
         * RIGHT SIDE
         */
        1, 3, 7,
        1, 7, 5,

        /*
         * DIAGONAL END
         */
        4, 5, 7,
        4, 7, 6
    ];

    const geometry =
        new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            position,
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

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

/**
 * L-shaped corner trim — continuous vertical profile
 * that wraps the outside corner of two walls.
 *
 * sx, sz: outward wall direction signs for this corner.
 */
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

    const tS =
        0.10;

    const t =
        0.008;

    const sx =
        corner.sx != null
            ? corner.sx
            : -1;

    const sz =
        corner.sz != null
            ? corner.sz
            : -1;

    const dirX =
        -sx;

    const dirZ =
        -sz;

    const shape =
        new THREE.Shape();

    shape.moveTo(
        0,
        0
    );

    shape.lineTo(
        dirX * tS,
        0
    );

    shape.lineTo(
        dirX * tS,
        dirZ * t
    );

    shape.lineTo(
        dirX * t,
        dirZ * t
    );

    shape.lineTo(
        dirX * t,
        dirZ * tS
    );

    shape.lineTo(
        0,
        dirZ * tS
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

    pos.needsUpdate = true;

    geometry.computeVertexNormals();

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

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 8;

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
        context.model?.visibility?.trims === false
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

    /*
     * EAVE TRIMS
     */

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

    /*
     * RAKE TRIMS
     *
     * Each rake remains parallel to its roof/wall direction.
     *
     * The only special treatment is the 45-degree end cut.
     */

    const roofTrimGroup =
        new THREE.Group();

    roofTrimGroup.name =
        'roof-trim';

    for (
        const rake
        of trimsData.rake
    ) {
        /*
         * Mirror the miter according to the side.
         *
         * The two opposite rake trims therefore receive opposite
         * diagonal end cuts and meet at the same point.
         */

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

    /*
     * CORNER TRIMS
     */

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