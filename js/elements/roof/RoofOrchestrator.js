import * as THREE from 'three';
import { getPanelNormalMapForUse } from '../../panels/PanelProfiles.js';

const ROOF_THICKNESS = 0.10;

function assertContext(context) {
    if (
        !context ||
        typeof context !== 'object'
    ) {
        throw new TypeError(
            'Element context is required'
        );
    }

    if (!context.geometry?.roof) {
        throw new TypeError(
            'Roof geometry is required'
        );
    }

    if (!context.panelGeometry?.roof) {
        throw new TypeError(
            'Roof panel geometry is required'
        );
    }

    if (!context.materials) {
        throw new TypeError(
            'Material system is required'
        );
    }
}

function resolveMaterial(context) {
    const profileId =
        context.model?.roof?.profile ||
        'awr';

    const normalMap =
        getPanelNormalMapForUse(
            profileId,
            'roof',
            Math.max(
                1,
                context.model?.dimensions?.length ||
                10
            ) * 0.8,
            Math.max(
                1,
                context.model?.dimensions?.width ||
                10
            ) * 1.5
        );

    if (
        typeof context.materials.get ===
        'function'
    ) {
        const material =
            context.materials.get(
                'roofMetal',
                context.colors?.roof,
                {
                    normalMap
                }
            );

        material.side =
            THREE.DoubleSide;

        material.needsUpdate =
            true;

        return material;
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

function createSideMaterial(
    material
) {
    const sideMaterial =
        material.clone();

    sideMaterial.normalMap =
        null;

    sideMaterial.bumpMap =
        null;

    sideMaterial.roughnessMap =
        null;

    sideMaterial.metalnessMap =
        null;

    sideMaterial.needsUpdate =
        true;

    return sideMaterial;
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

    const top =
        corners.map(
            corner =>
                new THREE.Vector3(
                    corner.x,
                    corner.y,
                    corner.z
                )
        );

    const bottom =
        top.map(
            vertex =>
                new THREE.Vector3(
                    vertex.x,
                    vertex.y - thickness,
                    vertex.z
                )
        );

    const positions = [];
    const uvs = [];
    const indices = [];

    function addFace(
        a,
        b,
        c,
        d,
        uvScaleU = 1,
        uvScaleV = 1
    ) {
        const base =
            positions.length / 3;

        positions.push(
            a.x,
            a.y,
            a.z,

            b.x,
            b.y,
            b.z,

            c.x,
            c.y,
            c.z,

            d.x,
            d.y,
            d.z
        );

        uvs.push(
            0,
            0,

            uvScaleU,
            0,

            uvScaleU,
            uvScaleV,

            0,
            uvScaleV
        );

        indices.push(
            base,
            base + 1,
            base + 2,

            base,
            base + 2,
            base + 3
        );
    }

    /*
     * Bottom.
     *
     * Independent vertices.
     */
    addFace(
        bottom[0],
        bottom[2],
        bottom[1],
        bottom[3]
    );

    /*
     * Top.
     *
     * Independent vertices.
     */
    addFace(
        top[0],
        top[1],
        top[2],
        top[3]
    );

    /*
     * Side 0.
     *
     * Independent vertices.
     */
    addFace(
        bottom[0],
        bottom[1],
        top[1],
        top[0]
    );

    /*
     * Side 1.
     */
    addFace(
        bottom[1],
        bottom[2],
        top[2],
        top[1]
    );

    /*
     * Side 2.
     */
    addFace(
        bottom[2],
        bottom[3],
        top[3],
        top[2]
    );

    /*
     * Side 3.
     */
    addFace(
        bottom[3],
        bottom[0],
        top[0],
        top[3]
    );

    const geometry =
        new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
            positions,
            3
        )
    );

    geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
            uvs,
            2
        )
    );

    geometry.setIndex(
        indices
    );

    /*
     * Every face owns its own vertices.
     *
     * 6 faces × 4 vertices = 24 vertices.
     *
     * Therefore the top surface and the
     * vertical side faces cannot share normals.
     */
    geometry.computeVertexNormals();

    geometry.computeBoundingBox();

    geometry.computeBoundingSphere();

    /*
     * Material groups:
     *
     * 0 = bottom
     * 1 = top
     * 2 = side 0
     * 3 = side 1
     * 4 = side 2
     * 5 = side 3
     */
    geometry.clearGroups();

    geometry.addGroup(
        0,
        6,
        1
    );

    geometry.addGroup(
        6,
        6,
        0
    );

    geometry.addGroup(
        12,
        6,
        1
    );

    geometry.addGroup(
        18,
        6,
        1
    );

    geometry.addGroup(
        24,
        6,
        1
    );

    geometry.addGroup(
        30,
        6,
        1
    );

    return geometry;
}

function createPanelMesh(
    panel,
    material,
    sideMaterial
) {
    const geometry =
        createSolidPlaneGeometry(
            panel.corners,
            ROOF_THICKNESS
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            [
                material,
                sideMaterial
            ]
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
    material,
    sideMaterial
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
                material,
                sideMaterial
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

    const sideMaterial =
        createSideMaterial(
            material
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
                    material,
                    sideMaterial
                )
            );
        }
    }

    root.userData.sideMaterial =
        sideMaterial;

    return root;
}

function disposeObject(
    object
) {
    if (!object) {
        return;
    }

    const disposedMaterials =
        new Set();

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

            if (
                Array.isArray(
                    child.material
                )
            ) {
                for (
                    const material
                    of child.material
                ) {
                    if (
                        material ===
                        object.userData?.sideMaterial &&
                        !disposedMaterials.has(
                            material
                        )
                    ) {
                        material.dispose();

                        disposedMaterials.add(
                            material
                        );
                    }
                }
            }
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