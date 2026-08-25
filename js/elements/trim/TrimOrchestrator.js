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

// Rake trims are built as separate boxes butted end-to-end at the ridge
// point, with no mitering - their centerlines meet exactly, but each box's
// half-width sticks out sideways from that centerline, so the outer/inner
// corners of the two boxes don't line up at the joint. That's the visible
// notch/gap at the peak. Overshooting each rake segment slightly past the
// ridge point makes the two boxes overlap there instead of just touching,
// which closes the gap (the overlap itself gets hidden under the ridge cap).
const RAKE_RIDGE_OVERSHOOT = 0.009;
// Extra length added past each end of the ridge cap so it fully covers the
// rake-trim joint below it instead of stopping exactly at the nominal
// ridge-line endpoint.
const RIDGE_CAP_OVERSHOOT = 0.009;
// Small downward nudge (world Y) so the ridge cap's base corners sit at/
// slightly below the rake trims' outer face - i.e. the ridge visually
// tucks under the trim instead of floating above it with a gap showing
// through underneath.
const RIDGE_CAP_TUCK = -0.025;

function extendSegmentAtRidge(edge, slope, amount) {
    if (!edge || !slope || !amount) return edge;

    const start = new THREE.Vector3(edge.start.x, edge.start.y, edge.start.z);
    const end = new THREE.Vector3(edge.end.x, edge.end.y, edge.end.z);
    const dir = end.clone().sub(start);
    if (dir.lengthSq() < 1e-8) return edge;
    dir.normalize();

    if (slope === 'left') {
        // end === ridge point for the left-hand slope segment
        end.add(dir.clone().multiplyScalar(amount));
    } else if (slope === 'right') {
        // start === ridge point for the right-hand slope segment
        start.add(dir.clone().multiplyScalar(-amount));
    } else {
        return edge;
    }

    return {
        start: { x: start.x, y: start.y, z: start.z },
        end: { x: end.x, y: end.y, z: end.z }
    };
}

function extendSegmentBothEnds(edge, amount) {
    if (!edge || !amount) return edge;

    const start = new THREE.Vector3(edge.start.x, edge.start.y, edge.start.z);
    const end = new THREE.Vector3(edge.end.x, edge.end.y, edge.end.z);
    const dir = end.clone().sub(start);
    if (dir.lengthSq() < 1e-8) return edge;
    dir.normalize();

    start.add(dir.clone().multiplyScalar(-amount));
    end.add(dir.clone().multiplyScalar(amount));

    return {
        start: { x: start.x, y: start.y, z: start.z },
        end: { x: end.x, y: end.y, z: end.z }
    };
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
            .multiplyScalar(0.5)
    );

    // FIX: quaternion.setFromUnitVectors(Z, direction) only guarantees the
    // box's length axis (local Z) lands on the segment direction - it says
    // nothing about roll around that axis, so the profile's width/depth
    // faces came out at an arbitrary, inconsistent angle per segment. That
    // is the "trim looks twisted around its own axis" artefact, and it's
    // also why the trim no longer sat flush against the ridge cap (their
    // faces weren't co-planar with the roof surface anymore).
    //
    // Fix: build an explicit orthonormal basis with world-up as a stable
    // reference (Gram-Schmidt), instead of letting three.js pick an
    // unconstrained roll. World Y works as the up-hint for every trim
    // segment in this model (eaves run along Z, rakes run diagonally in a
    // vertical X-Y plane) - projecting it perpendicular to the segment
    // direction consistently puts the box's "width" axis along the
    // building's depth (Z) axis and its "depth" axis flush against the
    // roof/wall plane, which is what an L-flashing profile needs.
    let upHint = new THREE.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(upHint)) > 0.999) {
        // Segment is (near) vertical - world Y can't be used as a
        // reference in that case, fall back to world X.
        upHint = new THREE.Vector3(1, 0, 0);
    }

    const xAxis = new THREE.Vector3().crossVectors(upHint, direction).normalize();
    const yAxis = new THREE.Vector3().crossVectors(direction, xAxis).normalize();

    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, direction);
    mesh.quaternion.setFromRotationMatrix(basis);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

/**
 * L-shaped corner (angle) trim — continuous vertical profile
 * that wraps the outside corner of two walls.
 * Matches legacy createCornerTrimGeo behaviour.
 *
 * sx, sz: outward wall direction signs for this corner
 *   (e.g. FL: sx=-1, sz=-1 when front is -Z).
 */
function createCornerTrimMesh(corner, material) {
    if (
        !corner ||
        !corner.edge ||
        !corner.edge.start ||
        !corner.edge.end
    ) {
        return null;
    }

    const start = corner.edge.start;
    const end = corner.edge.end;
    const colH = Math.abs(end.y - start.y);

    if (colH <= 0.001) {
        return null;
    }

    const tS = 0.10; // overall leg length (same as legacy TRIM_CONFIG.tS)
    const t = 0.008; // metal thickness

    // Outward signs; default to -1 if missing
    const sx = corner.sx != null ? corner.sx : -1;
    const sz = corner.sz != null ? corner.sz : -1;

    // Arms of the L point inward from the exterior corner
    // (dir = -outward), so the profile covers the outside faces.
    const dirX = -sx;
    const dirZ = -sz;

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(dirX * tS, 0);
    shape.lineTo(dirX * tS, dirZ * t);
    shape.lineTo(dirX * t, dirZ * t);
    shape.lineTo(dirX * t, dirZ * tS);
    shape.lineTo(0, dirZ * tS);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: colH,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 1
    });

    // Extrude is along +Z; rotate so extrusion becomes +Y (up the wall)
    geometry.rotateX(-Math.PI / 2);

    // Flip Z so the profile faces the correct exterior side
    // (same post-process as legacy)
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        pos.setZ(i, -pos.getZ(i));
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = corner.id || 'corner-trim';

    // Place at the base of the corner (y = 0), xz at wall corner
    mesh.position.set(
        start.x,
        Math.min(start.y, end.y),
        start.z
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 8;

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

    // Small downward nudge so the ridge cap's base corners sit at/just
    // below the rake trims' outer face - tucks the ridge into the trim
    // instead of floating above it with a visible gap underneath.
    mesh.position.y -= RIDGE_CAP_TUCK;

    /*
     * Ridge direction is exactly the roof ridge
     * direction: front -> back.
     */

    // FIX: same arbitrary-roll problem as createProfileMesh() above.
    // This profile is a symmetric triangle straddling the ridge line, so
    // an undetermined roll doesn't just look twisted - it rotates the
    // whole triangular cap off-center, so one side digs down into the
    // roof/rake trim instead of sitting evenly on both slopes. Using the
    // same explicit up-hint basis keeps it symmetric.
    let ridgeUpHint = new THREE.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(ridgeUpHint)) > 0.999) {
        ridgeUpHint = new THREE.Vector3(1, 0, 0);
    }
    const ridgeXAxis = new THREE.Vector3().crossVectors(ridgeUpHint, direction).normalize();
    const ridgeYAxis = new THREE.Vector3().crossVectors(direction, ridgeXAxis).normalize();
    const ridgeBasis = new THREE.Matrix4().makeBasis(ridgeXAxis, ridgeYAxis, direction);
    mesh.quaternion.setFromRotationMatrix(ridgeBasis);

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

    // FIX: visibility.trims was never checked here - only the geometry's
    // own trimsData.enabled flag gated this, so toggling trims off in
    // visibility had no effect (this is what produced the diagonal
    // corner-trim poles even with everything set to false).
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
                extendSegmentAtRidge(
                    rake.edge,
                    rake.slope,
                    RAKE_RIDGE_OVERSHOOT
                ),
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
        const extendedRidge = ridge && ridge.edge
            ? { ...ridge, edge: extendSegmentBothEnds(ridge.edge, RIDGE_CAP_OVERSHOOT) }
            : ridge;

        const mesh =
            createRidgeMesh(
                extendedRidge,
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
            createCornerTrimMesh(
                corner,
                trimMaterial
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