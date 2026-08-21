// js/interaction/ReferenceModelInteraction.js
//
// Restores drag-to-reposition behaviour for reference models (vehicles,
// forklifts, airplanes, trucks) that existed in the legacy
// external-references-models.js (onPointerDown/Move/Up + DragControls-style
// plane intersection). This was silently dropped during the refactor: the
// new ReferenceModelsOrchestrator only auto-placed models and had no
// pointer interaction at all.
//
// Implementation note: CameraControls.js is a bespoke orbit implementation
// (not three/examples OrbitControls) with no `.enabled` switch, so this
// module binds its own listeners in the capture phase and calls
// stopImmediatePropagation() while a model is actively grabbed to prevent
// the camera-orbit listeners (registered on the same element, bubble phase)
// from also reacting to the same pointer events.
import * as THREE from 'three';

export function createReferenceModelInteraction({ camera, domElement, group, onDragEnd }) {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeHit = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();

    let selected = null;
    let dragging = false;

    function updatePointer(event) {
        const rect = domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pickRoot(object) {
        let root = object;
        while (root.parent && root.parent !== group) {
            root = root.parent;
        }
        return root;
    }

    function onPointerDown(event) {
        if (!group || !group.children.length) return;

        updatePointer(event);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(group.children, true);
        if (hits.length === 0) return;

        selected = pickRoot(hits[0].object);
        dragging = true;

        raycaster.ray.intersectPlane(dragPlane, planeHit);
        dragOffset.copy(selected.position).sub(planeHit || new THREE.Vector3());

        event.stopImmediatePropagation();
        event.preventDefault();
    }

    function onPointerMove(event) {
        if (!dragging || !selected) return;

        updatePointer(event);
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(dragPlane, planeHit)) {
            selected.position.x = planeHit.x + dragOffset.x;
            selected.position.z = planeHit.z + dragOffset.z;
        }

        event.stopImmediatePropagation();
        event.preventDefault();
    }

    function onPointerUp(event) {
        if (!dragging) return;
        dragging = false;
        selected = null;
        if (typeof onDragEnd === 'function') onDragEnd();
        event.stopImmediatePropagation();
    }

    domElement.addEventListener('pointerdown', onPointerDown, { capture: true });
    domElement.addEventListener('pointermove', onPointerMove, { capture: true });
    domElement.addEventListener('pointerup', onPointerUp, { capture: true });
    domElement.addEventListener('pointerleave', onPointerUp, { capture: true });

    function dispose() {
        domElement.removeEventListener('pointerdown', onPointerDown, { capture: true });
        domElement.removeEventListener('pointermove', onPointerMove, { capture: true });
        domElement.removeEventListener('pointerup', onPointerUp, { capture: true });
        domElement.removeEventListener('pointerleave', onPointerUp, { capture: true });
    }

    return Object.freeze({ dispose });
}
