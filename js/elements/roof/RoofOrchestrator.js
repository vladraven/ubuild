import * as THREE from 'three';
import { getPanelNormalMapForUse } from '../../panels/PanelProfiles.js';

const ROOF_THICKNESS = 0.10;

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.geometry?.roof) {
        throw new TypeError('Roof geometry is required');
    }

    if (!context.panelGeometry?.roof) {
        throw new TypeError('Roof panel geometry is required');
    }

    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    const profileId =
        context.model?.roof?.profile || 'awr';

    const normalMap =
        getPanelNormalMapForUse(
            profileId,
            'roof',
            Math.max(
                1,
                context.model?.dimensions?.length || 10
            ) * 0.8,
            Math.max(
                1,
                context.model?.dimensions?.width || 10
            ) * 1.5
        );

    if (
        typeof context.materials.get ===
        'function'
    ) {
        const mat =
            context.materials.get(
                'roofMetal',
                context.colors?.roof,
                {
                    normalMap
                }
            );

        mat.side =
            THREE.DoubleSide;

        mat.needsUpdate =
            true;

        return mat;
    }

    if (
        context.materials.roofMetal
    ) {
        return context.materials.roofMetal;
    }

    if (
        context.materials.roof
    ) {
        return context.materials.roof;
    }

    throw new Error(
        'Roof material is not available'
    );
}

function createSolidPlaneGeometry(
    corners,
    thickness
) {
    if (
        !Array.isArray(corners) ||
        corners.length !== 4
    ) {
        throw new TypeError(
            'Roof panel must contain four corners'
        );
    }

    /*
     * The supplied corners define the ACTUAL
     * outer/top surface of the roof.
     *
     * Do not move this surface.
     *
     * The complete 20 cm thickness is created
     * inward/downward from this surface.
     */

    const top =
        corners.map(
            corner =>
                new THREE.Vector3(
                    corner.x,
                    corner.y,
                    corner.z
                )
        );

    const edgeA =
        top[1]
            .clone()
            .sub(top[0]);

    const edgeB =
        top[3]
            .clone()
            .sub(top[0]);

    const normal =
        edgeA
            .cross(edgeB)
            .normalize();

    if (
        normal.lengthSq() <=
        1e-12
    ) {
        throw new Error(
            'Roof panel geometry is degenerate'
        );
    }

    /*
     * We need the bottom surface on the
     * opposite side of the roof plane.
     *
     * The supplied roof normal is not assumed
     * to point downward, therefore determine the
     * downward direction from the normal itself.
     *
     * For the building roof coordinate system,
     * the outer roof surface must remain unchanged.
     */

    const downward =
        normal.y > 0
            ? normal
                .clone()
                .negate()
            : normal.clone();

    const offset =
        downward
            .multiplyScalar(
                thickness
            );

    const bottom =
        top.map(
            vertex =>
                vertex
                    .clone()
                    .add(offset)
        );

    const vertices =
        new Float32Array([
            /*
             * Bottom
             */
            bottom[0].x,
            bottom[0].y,
            bottom[0].z,

            bottom[1].x,
            bottom[1].y,
            bottom[1].z,

            bottom[2].x,
            bottom[2].y,
            bottom[2].z,

            bottom[3].x,
            bottom[3].y,
            bottom[3].z,

            /*
             * Top / outer roof surface
             */
            top[0].x,
            top[0].y,
            top[0].z,

            top[1].x,
            top[1].y,
            top[1].z,

            top[2].x,
            top[2].y,
            top[2].z,

            top[3].x,
            top[3].y,
            top[3].z
        ]);

    const uvs =
        new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1,

            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]);

    const indices = [
        /*
         * Bottom
         */
        0, 2, 1,
        0, 3, 2,

        /*
         * Top
         */
        4, 5, 6,
        4, 6, 7,

        /*
         * Side 0
         */
        0, 1, 5,
        0, 5, 4,

        /*
         * Side 1
         */
        1, 2, 6,
        1, 6, 5,

        /*
         * Side 2
         */
        2, 3, 7,
        2, 7, 6,

        /*
         * Side 3
         */
        3, 0, 4,
        3, 4, 7
    ];

    const geometry =
        new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            vertices,
            3
        )
    );

    geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(
            uvs,
            2
        )
    );

    geometry.setIndex(
        indices
    );

    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

function createPanelMesh(
    panel,
    material
) {
    const geometry =
        createSolidPlaneGeometry(
            panel.corners,
            ROOF_THICKNESS
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.userData.element =
        'roof';

    mesh.userData.panelIndex =
        panel.index;

    mesh.userData.roofThickness =
        ROOF_THICKNESS;

    mesh.castShadow =
        true;

    mesh.receiveShadow =
        true;

    return mesh;
}

function createPlaneGroup(
    planeId,
    panels,
    material
) {
    const group =
        new THREE.Group();

    group.name =
        `roof-${planeId}`;

    for (
        const panel
        of panels
    ) {
        group.add(
            createPanelMesh(
                panel,
                material
            )
        );
    }

    return group;
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
        'roof';

    if (
        context.model?.visibility?.roof ===
        false
    ) {
        return root;
    }

    const material =
        resolveMaterial(
            context
        );

    for (
        const [
            planeId,
            panels
        ]
        of Object.entries(
            context.panelGeometry.roof
        )
    ) {
        if (
            Array.isArray(
                panels
            ) &&
            panels.length
        ) {
            root.add(
                createPlaneGroup(
                    planeId,
                    panels,
                    material
                )
            );
        }
    }

    return root;
}

function disposeObject(
    object
) {
    if (!object) {
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
                child.geometry = null;
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

export const RoofOrchestrator =
    Object.freeze({
        id: 'roof',

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
            if (!object) {
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