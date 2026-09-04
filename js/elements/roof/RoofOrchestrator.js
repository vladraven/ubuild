import * as THREE from 'three';

import {
    normalizePanelProfile
} from '../../panels/PanelProfiles.js';

import {
    createPanelMaterial,
    PanelMapType
} from '../../panels/PanelMaterialFactory.js';

const ROOF_THICKNESS =
    0.10;

const DEFAULT_PROFILE =
    'awr';

const BUMP_SCALE =
    0.5;

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
    return normalizePanelProfile(
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
            'roofMetal'
        );
    }

    return (
        context.materials.roofMetal ||
        context.materials.roof
    );
}

function toVector3(
    point
) {
    return new THREE.Vector3(
        point.x,
        point.y,
        point.z
    );
}

function getPanelWidth(
    corners
) {
    const first =
        toVector3(
            corners[0]
        );

    const second =
        toVector3(
            corners[3]
        );

    return first.distanceTo(
        second
    );
}

function createRoofMaterial(
    source,
    profileId,
    slot,
    width
) {
    return createPanelMaterial(
        source,
        {
            profileId,

            slot,

            span:
                width,

            mapType:
                PanelMapType.HEIGHT,

            bumpScale:
                BUMP_SCALE,

            side:
                THREE.FrontSide
        }
    );
}

function createCeilingMaterial(
    source
) {
    return createPanelMaterial(
        source,
        {
            profileId:
                DEFAULT_PROFILE,

            slot:
                'roof-ceiling',

            span:
                1,

            mapType:
                PanelMapType.NONE,

            side:
                THREE.FrontSide
        }
    );
}

function createSideMaterial(
    source
) {
    return createPanelMaterial(
        source,
        {
            profileId:
                DEFAULT_PROFILE,

            slot:
                'roof-side',

            span:
                1,

            mapType:
                PanelMapType.NONE,

            side:
                THREE.FrontSide
        }
    );
}

function createBottom(
    top,
    thickness
) {
    return top.map(
        vertex =>
            new THREE.Vector3(
                vertex.x,
                vertex.y -
                thickness,
                vertex.z
            )
    );
}

function addFace(
    positions,
    uvs,
    indices,
    a,
    b,
    c,
    d,
    faceUvs
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
        faceUvs[0],
        faceUvs[1],

        faceUvs[2],
        faceUvs[3],

        faceUvs[4],
        faceUvs[5],

        faceUvs[6],
        faceUvs[7]
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

const TOP_FACE_UVS =
    Object.freeze([
        0,
        0,

        0,
        1,

        1,
        1,

        1,
        0
    ]);

const STANDARD_FACE_UVS =
    Object.freeze([
        0,
        0,

        1,
        0,

        1,
        1,

        0,
        1
    ]);

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
            toVector3
        );

    const bottom =
        createBottom(
            top,
            thickness
        );

    const positions =
        [];

    const uvs =
        [];

    const indices =
        [];

    /*
     * Roof panel direction is:
     *
     * corners[0] -> corners[3]
     *
     * This is the same direction used by
     * PanelGeometry and getPanelWidth().
     *
     * U therefore follows the physical panel
     * width rather than the longitudinal roof
     * direction.
     */
    addFace(
        positions,
        uvs,
        indices,
        top[0],
        top[1],
        top[2],
        top[3],
        TOP_FACE_UVS
    );

    addFace(
        positions,
        uvs,
        indices,
        bottom[3],
        bottom[2],
        bottom[1],
        bottom[0],
        STANDARD_FACE_UVS
    );

    addFace(
        positions,
        uvs,
        indices,
        bottom[0],
        bottom[1],
        top[1],
        top[0],
        STANDARD_FACE_UVS
    );

    addFace(
        positions,
        uvs,
        indices,
        bottom[1],
        bottom[2],
        top[2],
        top[1],
        STANDARD_FACE_UVS
    );

    addFace(
        positions,
        uvs,
        indices,
        bottom[2],
        bottom[3],
        top[3],
        top[2],
        STANDARD_FACE_UVS
    );

    addFace(
        positions,
        uvs,
        indices,
        bottom[3],
        bottom[0],
        top[0],
        top[3],
        STANDARD_FACE_UVS
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

    geometry.clearGroups();

    geometry.addGroup(
        0,
        6,
        0
    );

    geometry.addGroup(
        6,
        6,
        1
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

    geometry.computeVertexNormals();

    geometry.computeBoundingBox();

    geometry.computeBoundingSphere();

    return geometry;
}

function createPanelMesh(
    panel,
    sourceMaterial,
    profileId,
    ceilingMaterial,
    sideMaterial
) {
    const width =
        getPanelWidth(
            panel.corners
        );

    const roofMaterial =
        createRoofMaterial(
            sourceMaterial,
            profileId,
            `roof-${panel.index}`,
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

    mesh.name =
        `roof-panel-${panel.index}`;

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
    ceilingMaterial,
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
                ceilingMaterial,
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

    const ceilingMaterial =
        createCeilingMaterial(
            sourceMaterial
        );

    const sideMaterial =
        createSideMaterial(
            sourceMaterial
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
                ceilingMaterial,
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