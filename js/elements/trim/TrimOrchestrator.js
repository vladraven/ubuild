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
            .multiplyScalar(0.5)
    );

    mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(
            0,
            0,
            1
        ),
        direction.normalize()
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function createRidgeMesh(
    ridge,
    material
) {
    if (
        !ridge ||
        !ridge.edge ||
        !ridge.profile
    ) {
        return null;
    }

    const start =
        new THREE.Vector3(
            ridge.edge.start.x,
            ridge.edge.start.y,
            ridge.edge.start.z
        );

    const end =
        new THREE.Vector3(
            ridge.edge.end.x,
            ridge.edge.end.y,
            ridge.edge.end.z
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

    const halfWidth =
        ridge.profile.halfWidth;

    const pitchRatio =
        ridge.profile.pitchRatio;

    /*
     * Local triangular profile.
     *
     * The apex is exactly at (0, 0).
     *
     * The two bottom corners are calculated
     * from the roof pitch.
     *
     * Therefore the two sides have exactly
     * the same slope as the roof.
     */

    const baseY =
        -halfWidth *
        pitchRatio;

    const shape =
        new THREE.Shape();

    shape.moveTo(
        -halfWidth,
        baseY
    );

    shape.lineTo(
        0,
        0
    );

    shape.lineTo(
        halfWidth,
        baseY
    );

    shape.closePath();

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth: length,
                steps: 1,
                bevelEnabled: false,
                curveSegments: 1
            }
        );

    /*
     * ExtrudeGeometry extends along local +Z.
     *
     * Center it around the actual ridge line.
     */

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

    mesh.position.copy(
        start
            .clone()
            .add(end)
            .multiplyScalar(0.5)
    );

    /*
     * Ridge direction is exactly the roof ridge
     * direction: front -> back.
     */

    mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(
            0,
            0,
            1
        ),
        direction
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

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
        Object.create(null);

    if (
        !trimsData.enabled
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
     * EAVE GROUP
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

        if (mesh) {
            eaveGroup.add(
                mesh
            );
        }
    }

    /*
     * ROOF / RAKE GROUP
     */

    const roofTrimGroup =
        new THREE.Group();

    roofTrimGroup.name =
        'roof-trim';

    for (
        const rake
        of trimsData.rake
    ) {
        const mesh =
            createProfileMesh(
                rake.edge,
                trimMaterial,
                0.12,
                0.06
            );

        if (mesh) {
            roofTrimGroup.add(
                mesh
            );
        }
    }

    /*
     * RIDGE GROUP
     */

    const ridgeGroup =
        new THREE.Group();

    ridgeGroup.name =
        'ridge-trim';

    for (
        const ridge
        of trimsData.ridge
    ) {
        const mesh =
            createRidgeMesh(
                ridge,
                trimMaterial
            );

        if (mesh) {
            ridgeGroup.add(
                mesh
            );
        }
    }

    /*
     * CORNER GROUP
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
            createProfileMesh(
                corner.edge,
                trimMaterial,
                0.08,
                0.08
            );

        if (mesh) {
            cornerGroup.add(
                mesh
            );
        }
    }

    root.add(
        eaveGroup,
        roofTrimGroup,
        ridgeGroup,
        cornerGroup
    );

    root.userData.trimGroups.eave =
        eaveGroup;

    root.userData.trimGroups.roof =
        roofTrimGroup;

    root.userData.trimGroups.ridge =
        ridgeGroup;

    root.userData.trimGroups.corner =
        cornerGroup;

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

export const TrimOrchestrator =
    Object.freeze({
        id: 'trims',

        create(context) {
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

        dispose(object) {
            disposeObject(
                object
            );
        }
    });