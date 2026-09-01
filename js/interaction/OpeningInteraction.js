import * as THREE from 'three';

const DOUBLE_CLICK_DELAY =
    300;

const DRAG_THRESHOLD =
    5;

const WINDOW_TYPE =
    'Window';

const SIDE_NORMALS =
    Object.freeze({
        F:
            new THREE.Vector3(
                0,
                0,
                1
            ),

        B:
            new THREE.Vector3(
                0,
                0,
                -1
            ),

        L:
            new THREE.Vector3(
                -1,
                0,
                0
            ),

        R:
            new THREE.Vector3(
                1,
                0,
                0
            )
    });

function isWindow(
    type
) {
    return String(
        type ||
        ''
    )
        .trim()
        .toLowerCase() ===
        WINDOW_TYPE.toLowerCase();
}

function findOpeningTarget(
    object
) {
    let current =
        object;

    while (
        current
    ) {
        if (
            current.userData?.openingId
        ) {
            return current;
        }

        current =
            current.parent;
    }

    return null;
}

function getOpeningId(
    opening
) {
    return (
        opening?.userData?.openingId ||
        opening?.userData?.id ||
        null
    );
}

function getOpeningSide(
    opening
) {
    return (
        opening?.userData?.side ||
        opening?.userData?.opening?.side ||
        null
    );
}

function getOpeningType(
    opening
) {
    return (
        opening?.userData?.type ||
        opening?.userData?.openingType ||
        opening?.userData?.opening?.type ||
        ''
    );
}

function getSideCoordinate(
    point,
    side
) {
    if (
        side === 'L' ||
        side === 'R'
    ) {
        return point.z;
    }

    return point.x;
}

export function createOpeningInteraction({
    camera,
    domElement,
    buildingRoot,
    onOpeningChange,
    onSelect
}) {
    if (
        !camera ||
        !domElement ||
        !buildingRoot
    ) {
        throw new TypeError(
            'Camera, DOM element, and BuildingRoot are required'
        );
    }

    const raycaster =
        new THREE.Raycaster();

    const pointer =
        new THREE.Vector2();

    const dragPlane =
        new THREE.Plane();

    const planeIntersection =
        new THREE.Vector3();

    const worldPosition =
        new THREE.Vector3();

    const worldQuaternion =
        new THREE.Quaternion();

    let pointerDownTarget =
        null;

    let pointerDownX =
        0;

    let pointerDownY =
        0;

    let clickTimer =
        null;

    let lastClickTime =
        0;

    let lastClickOpeningId =
        null;

    let isDragging =
        false;

    let ignorePointerUp =
        false;

    let selectedOpeningId =
        null;

    let selectedSide =
        null;

    let selectedType =
        null;

    let dragOffsetX =
        0;

    let dragOffsetY =
        0;

    function getPointerNDC(
        event
    ) {
        const rect =
            domElement.getBoundingClientRect();

        pointer.x =
            (
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width
            ) *
            2 -
            1;

        pointer.y =
            -(
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height
            ) *
            2 +
            1;
    }

    function raycastOpening(
        event
    ) {
        getPointerNDC(
            event
        );

        buildingRoot.updateWorldMatrix(
            true,
            true
        );

        raycaster.setFromCamera(
            pointer,
            camera
        );

        const intersections =
            raycaster.intersectObject(
                buildingRoot,
                true
            );

        for (
            const intersection
            of intersections
        ) {
            const target =
                findOpeningTarget(
                    intersection.object
                );

            if (
                target
            ) {
                return target;
            }
        }

        return null;
    }

    function clearClickTimer() {
        if (
            clickTimer ===
            null
        ) {
            return;
        }

        window.clearTimeout(
            clickTimer
        );

        clickTimer =
            null;
    }

    function selectOpening(
        openingId
    ) {
        if (
            typeof onSelect ===
            'function'
        ) {
            onSelect(
                openingId
            );
        }
    }

    function getDragNormal(
        opening,
        side
    ) {
        const sideNormal =
            SIDE_NORMALS[
                side
            ];

        if (
            sideNormal
        ) {
            return sideNormal.clone();
        }

        opening.getWorldQuaternion(
            worldQuaternion
        );

        return new THREE.Vector3(
            0,
            0,
            1
        )
            .applyQuaternion(
                worldQuaternion
            )
            .normalize();
    }

    function startDrag(
        event,
        opening
    ) {
        const openingId =
            getOpeningId(
                opening
            );

        const side =
            getOpeningSide(
                opening
            );

        if (
            !openingId ||
            !side
        ) {
            return false;
        }

        opening.getWorldPosition(
            worldPosition
        );

        const normal =
            getDragNormal(
                opening,
                side
            );

        dragPlane.setFromNormalAndCoplanarPoint(
            normal,
            worldPosition
        );

        getPointerNDC(
            event
        );

        raycaster.setFromCamera(
            pointer,
            camera
        );

        if (
            !raycaster.ray.intersectPlane(
                dragPlane,
                planeIntersection
            )
        ) {
            return false;
        }

        selectedOpeningId =
            openingId;

        selectedSide =
            side;

        selectedType =
            getOpeningType(
                opening
            );

        dragOffsetX =
            getSideCoordinate(
                worldPosition,
                side
            ) -
            getSideCoordinate(
                planeIntersection,
                side
            );

        dragOffsetY =
            worldPosition.y -
            planeIntersection.y;

        isDragging =
            true;

        ignorePointerUp =
            true;

        return true;
    }

    function stopDrag() {
        isDragging =
            false;

        ignorePointerUp =
            false;

        selectedOpeningId =
            null;

        selectedSide =
            null;

        selectedType =
            null;

        dragOffsetX =
            0;

        dragOffsetY =
            0;
    }

    function onPointerDown(
        event
    ) {
        if (
            event.button !== 0
        ) {
            return;
        }

        // The next click ends active drag mode.
        if (
            isDragging
        ) {
            stopDrag();

            event.preventDefault();

            return;
        }

        pointerDownTarget =
            raycastOpening(
                event
            );

        if (
            !pointerDownTarget
        ) {
            return;
        }

        pointerDownX =
            event.clientX;

        pointerDownY =
            event.clientY;
    }

    function onPointerMove(
        event
    ) {
        if (
            !isDragging ||
            !selectedOpeningId ||
            !selectedSide
        ) {
            return;
        }

        getPointerNDC(
            event
        );

        raycaster.setFromCamera(
            pointer,
            camera
        );

        if (
            !raycaster.ray.intersectPlane(
                dragPlane,
                planeIntersection
            )
        ) {
            return;
        }

        const change =
            {
                id:
                    selectedOpeningId,

                side:
                    selectedSide,

                x:
                    getSideCoordinate(
                        planeIntersection,
                        selectedSide
                    ) +
                    dragOffsetX
            };

        if (
            isWindow(
                selectedType
            )
        ) {
            change.yOff =
                Math.max(
                    0,
                    planeIntersection.y +
                    dragOffsetY
                );
        }

        if (
            typeof onOpeningChange ===
            'function'
        ) {
            onOpeningChange(
                change
            );
        }

        event.preventDefault();
    }

    function onPointerUp(
        event
    ) {
        // Ignore pointerup belonging to the second double-click.
        if (
            ignorePointerUp
        ) {
            ignorePointerUp =
                false;

            pointerDownTarget =
                null;

            return;
        }

        if (
            isDragging
        ) {
            return;
        }

        const target =
            pointerDownTarget;

        pointerDownTarget =
            null;

        if (
            !target
        ) {
            return;
        }

        const moved =
            Math.hypot(
                event.clientX -
                    pointerDownX,
                event.clientY -
                    pointerDownY
            );

        if (
            moved >
            DRAG_THRESHOLD
        ) {
            return;
        }

        const openingId =
            getOpeningId(
                target
            );

        if (
            !openingId
        ) {
            return;
        }

        const now =
            performance.now();

        const isDoubleClick =
            lastClickOpeningId ===
                openingId &&
            now -
                lastClickTime <=
                DOUBLE_CLICK_DELAY;

        if (
            isDoubleClick
        ) {
            clearClickTimer();

            lastClickTime =
                0;

            lastClickOpeningId =
                null;

            const dragStarted =
                startDrag(
                    event,
                    target
                );

            console.log(
                'OPENING DRAG START',
                {
                    openingId,
                    dragStarted
                }
            );

            return;
        }

        clearClickTimer();

        lastClickTime =
            now;

        lastClickOpeningId =
            openingId;

        clickTimer =
            window.setTimeout(
                () => {
                    clickTimer =
                        null;

                    selectOpening(
                        openingId
                    );

                    lastClickTime =
                        0;

                    lastClickOpeningId =
                        null;
                },
                DOUBLE_CLICK_DELAY
            );
    }

    function dispose() {
        clearClickTimer();

        domElement.removeEventListener(
            'pointerdown',
            onPointerDown
        );

        domElement.removeEventListener(
            'pointermove',
            onPointerMove
        );

        domElement.removeEventListener(
            'pointerup',
            onPointerUp
        );

        stopDrag();
    }

    domElement.addEventListener(
        'pointerdown',
        onPointerDown
    );

    domElement.addEventListener(
        'pointermove',
        onPointerMove
    );

    domElement.addEventListener(
        'pointerup',
        onPointerUp
    );

    return Object.freeze({
        dispose
    });
}