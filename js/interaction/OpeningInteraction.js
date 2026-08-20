import * as THREE from 'three';

export function createOpeningInteraction({
    camera,
    domElement,
    buildingRoot,
    onOpeningChange,
    onSelect
}) {
    if (!camera || !domElement || !buildingRoot) {
        throw new TypeError('Camera, DOM element, and BuildingRoot are required');
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isDragging = false;
    let selectedOpeningId = null;
    let selectedSide = null;
    let dragPlane = new THREE.Plane();
    const planeIntersection = new THREE.Vector3();

    function getPointerNDC(e) {
        const rect = domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(e) {
        if (e.button !== 0) return;
        getPointerNDC(e);
        raycaster.setFromCamera(pointer, camera);

        const openingsGroup = buildingRoot.getObjectByName('openings');
        if (!openingsGroup) return;

        const intersects = raycaster.intersectObjects(openingsGroup.children, true);
        if (intersects.length > 0) {
            let targetMesh = intersects[0].object;
            while (targetMesh && (!targetMesh.userData || !targetMesh.userData.openingId)) {
                targetMesh = targetMesh.parent;
            }

            if (targetMesh && targetMesh.userData.openingId) {
                isDragging = true;
                selectedOpeningId = targetMesh.userData.openingId;
                selectedSide = targetMesh.userData.side;

                const normal = targetMesh.userData.geometry?.normal || new THREE.Vector3(0, 0, 1);
                dragPlane.setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(normal.x, normal.y, normal.z),
                    targetMesh.position
                );

                if (typeof onSelect === 'function') {
                    onSelect(selectedOpeningId);
                }
            }
        }
    }

    function onPointerMove(e) {
        if (!isDragging || !selectedOpeningId) return;
        getPointerNDC(e);
        raycaster.setFromCamera(pointer, camera);

        if (raycaster.ray.intersectPlane(dragPlane, planeIntersection)) {
            let newX = planeIntersection.x;
            if (selectedSide === 'L' || selectedSide === 'R') {
                newX = planeIntersection.z;
            }

            if (typeof onOpeningChange === 'function') {
                onOpeningChange({
                    id: selectedOpeningId,
                    side: selectedSide,
                    x: newX,
                    yOff: Math.max(0, planeIntersection.y)
                });
            }
        }
    }

    function onPointerUp() {
        isDragging = false;
        selectedOpeningId = null;
    }

    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    function dispose() {
        domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    }

    return Object.freeze({
        dispose
    });
}