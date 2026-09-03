import * as THREE from 'three';

import {
    getPanelHeightMapForUse,
    getPanelRepeat
} from '../../panels/PanelProfiles.js';

const ROOF_THICKNESS =
    0.10;

const DEFAULT_PROFILE =
    'awr';

const BUMP_SCALE =
    0.18;

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
        !context.panelGeometry?.roof
    ) {
        throw new TypeError(
            'Roof panel geometry is required'
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

function getProfileId(
    context
) {
    return (
        context.model?.roof?.profile ||
        DEFAULT_PROFILE
    );
}

function getSourceMaterial(
    context
) {
    if (
        typeof context.materials.get ===
        'function'
    ) {
        return context.materials.get(
            'roofMetal',
            context.colors?.roof
        );
    }

    return (
        context.materials.roofMetal ||
        context.materials.roof
    );
}

function getPanelWidth(
    corners
) {
    const first =
        new THREE.Vector3(
            corners[0].x,
            corners[0].y,
            corners[0].z
        );

    const second =
        new THREE.Vector3(
            corners[1].x,
            corners[1].y,
            corners[1].z
        );

    return first.distanceTo(
        second
    );
}

function createPanelMaterial(
    source,
    profileId,
    slot,
    width
) {
    const material =
        source.clone();

    const bumpMap =
        getPanelHeightMapForUse(
            profileId,
            slot,
            getPanelRepeat(
                width,
                profileId
            ),
            1
        );

    material.normalMap =
        null;

    material.bumpMap =
        bumpMap;

    material.bumpScale =
        bumpMap ?
        BUMP_SCALE :
        0;

    material.side =
        THREE.DoubleSide;

    material.needsUpdate =
        true;

    return material;
}

function createSideMaterial(
    source
) {
    const material =
        source.clone();

    material.normalMap =
        null;

    material.bumpMap =
        null;

    material.roughnessMap =
        null;

    material.metalnessMap =
        null;

    material.side =
        THREE.DoubleSide;

    material.needsUpdate =
        true;

    return material;
}

function createSolidPlaneGeometry(
    corners,
    thickness
) {
    if (
        !Array.isArray(
            corners
        ) ||
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
                    vertex.y -
                    thickness,
                    vertex.z
                )
        );

    const positions =
        [];

    const uvs =
        [];

    const indices =
        [];

    function addFace(
        a,
        b,
        c,
        d
    ) {
        const base =
            positions.length /
            3;

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

            1,
            0,

            1,
            1,

            0,
            1
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

    addFace(
        bottom[0],
        bottom[2],
        bottom[1],
        bottom[3]
    );

    addFace(
        top[0],
        top[1],
        top[2],
        top[3]
    );

    addFace(
        bottom[0],
        bottom[1],
        top[1],
        top[0]
    );

    addFace(
        bottom[1],
        bottom[2],
        top[2],
        top[1]
    );

    addFace(
        bottom[2],
        bottom[3],
        top[3],
        top[2]
    );

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

    geometry.computeVertexNormals();

    geometry.computeBoundingBox();

    geometry.computeBoundingSphere();

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
        2
    );

    geometry.addGroup(
        18,
        6,
        2
    );

    geometry.addGroup(
        24,
        6,
        2
    );

    geometry.addGroup(
        30,
        6,
        2
    );

    return geometry;
}

function createPanelMesh(
    panel,
    sourceMaterial,
    profileId,
    sideMaterial
) {
    const width =
        getPanelWidth(
            panel.corners
        );

    const roofMaterial =
        createPanelMaterial(
            sourceMaterial,
            profileId,
            `roof-${panel.index}`,
            width
        );

    const ceilingMaterial =
        createPanelMaterial(
            sourceMaterial,
            profileId,
            `ceiling-${panel.index}`,
            width
        );

    const geometry =
        createSolidPlaneGeometry(
            panel.corners,
            ROOF_THICKNESS
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            [
                roofMaterial,
                ceilingMaterial,
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
    sourceMaterial,
    profileId,
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
                sourceMaterial,
                profileId,
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

    const profileId =
        getProfileId(
            context
        );

    const sourceMaterial =
        getSourceMaterial(
            context
        );

    if (
        !sourceMaterial
    ) {
        throw new Error(
            'Roof material is not available'
        );
    }

    const sideMaterial =
        createSideMaterial(
            sourceMaterial
        );

    root.userData.sideMaterial =
        sideMaterial;

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
            !Array.isArray(
                panels
            ) ||
            !panels.length
        ) {
            continue;
        }

        root.add(
            createPlaneGroup(
                planeId,
                panels,
                sourceMaterial,
                profileId,
                sideMaterial
            )
        );
    }

    return root;
}

function disposeMaterial(
    material,
    disposedMaterials
) {
    if (
        !material ||
        disposedMaterials.has(
            material
        )
    ) {
        return;
    }

    disposedMaterials.add(
        material
    );

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

    const disposedMaterials =
        new Set();

    object.traverse(
        child => {
            if (
                !child.isMesh
            ) {
                return;
            }

            child.geometry?.dispose();

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
                        material,
                        disposedMaterials
                    );
                }
            } else {
                disposeMaterial(
                    child.material,
                    disposedMaterials
                );
            }

            child.geometry =
                null;

            child.material =
                null;
        }
    );

    for (
        const child
        of object.children.slice()
    ) {
        object.remove(
            child
        );
    }

    object.removeFromParent();
}

export const RoofOrchestrator =
    Object.freeze({

        id:
            'roof',

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