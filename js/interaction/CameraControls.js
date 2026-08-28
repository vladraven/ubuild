import * as THREE from 'three';

export function createCameraControls({
    camera,
    domElement,
    onUpdate
}) {
    if (
        !camera ||
        !domElement
    ) {
        throw new TypeError(
            'Camera and DOM element are required for CameraControls'
        );
    }

    const MIN_ZOOM =
        40;

    const MAX_ZOOM =
        90;

    const INSIDE_PADDING =
        0.35;

    const INSIDE_MIN_HEIGHT =
        1.2;

    const INSIDE_MOVE_STEP =
        0.25;

    const INSIDE_ROTATION_DISTANCE =
        1;

    let isPointerDown =
        false;

    let pointerButton =
        0;

    let pointerMoved =
        false;

    const pointerStart =
        new THREE.Vector2();

    const prevPointer =
        new THREE.Vector2();

    const target =
        new THREE.Vector3();

    const dragSpherical =
        new THREE.Spherical();

    const spherical =
        new THREE.Spherical(
            60,
            Math.PI / 3,
            Math.PI * 5 / 4
        );

    const insideSpherical =
        new THREE.Spherical(
            INSIDE_ROTATION_DISTANCE,
            Math.PI / 2,
            0
        );

    const insideTarget =
        new THREE.Vector3();

    const insideBounds =
        new THREE.Box3();

    const insidePosition =
        new THREE.Vector3();

    const insideDirection =
        new THREE.Vector3();

    const insideStartPosition =
        new THREE.Vector3();

    let insideView =
        false;

    let hasInsideBounds =
        false;

    let insideMaxDistance =
        0;

    let autoRotate =
        false;

    let rafId =
        null;

    const autoRotateSpeed =
        0.2;

    function render() {
        if (
            typeof onUpdate ===
            'function'
        ) {
            onUpdate();
        }
    }

    function applySpherical() {
        spherical.makeSafe();

        spherical.radius =
            THREE.MathUtils.clamp(
                spherical.radius,
                MIN_ZOOM,
                MAX_ZOOM
            );

        const offset =
            new THREE.Vector3()
                .setFromSpherical(
                    spherical
                );

        camera.position
            .copy(target)
            .add(offset);

        camera.lookAt(
            target
        );

        render();
    }

    function applyInsideRotation() {
        insideSpherical.makeSafe();

        insideDirection
            .setFromSphericalCoords(
                INSIDE_ROTATION_DISTANCE,
                insideSpherical.phi,
                insideSpherical.theta
            );

        insideTarget
            .copy(
                camera.position
            )
            .add(
                insideDirection
            );

        camera.lookAt(
            insideTarget
        );

        render();
    }

    function setInsideBounds(
        bounds
    ) {
        hasInsideBounds =
            false;

        insideBounds.makeEmpty();

        if (!bounds) {
            return;
        }

        if (
            bounds.min &&
            bounds.max
        ) {
            insideBounds.min.set(
                bounds.min.x,
                bounds.min.y,
                bounds.min.z
            );

            insideBounds.max.set(
                bounds.max.x,
                bounds.max.y,
                bounds.max.z
            );

            hasInsideBounds =
                !insideBounds.isEmpty();
        }
    }

    function clampInsidePosition(
        position
    ) {
        if (
            !insideView ||
            !hasInsideBounds
        ) {
            return position;
        }

        const minY =
            Math.max(
                insideBounds.min.y +
                    INSIDE_PADDING,
                INSIDE_MIN_HEIGHT
            );

        const maxX =
            insideBounds.max.x -
            INSIDE_PADDING;

        const minX =
            insideBounds.min.x +
            INSIDE_PADDING;

        const maxY =
            insideBounds.max.y -
            INSIDE_PADDING;

        const minZ =
            insideBounds.min.z +
            INSIDE_PADDING;

        const maxZ =
            insideBounds.max.z -
            INSIDE_PADDING;

        position.x =
            THREE.MathUtils.clamp(
                position.x,
                minX,
                maxX
            );

        position.y =
            THREE.MathUtils.clamp(
                position.y,
                minY,
                maxY
            );

        position.z =
            THREE.MathUtils.clamp(
                position.z,
                minZ,
                maxZ
            );

        return position;
    }

    function clampInsideDistance(
        position
    ) {
        if (
            !insideView ||
            insideMaxDistance <= 0
        ) {
            return position;
        }

        insidePosition
            .copy(position)
            .sub(
                insideStartPosition
            );

        const distance =
            insidePosition.length();

        if (
            distance <=
            insideMaxDistance
        ) {
            return position;
        }

        insidePosition
            .normalize()
            .multiplyScalar(
                insideMaxDistance
            );

        position
            .copy(
                insideStartPosition
            )
            .add(
                insidePosition
            );

        return position;
    }

    function clampInsideCamera() {
        clampInsidePosition(
            camera.position
        );

        clampInsideDistance(
            camera.position
        );
    }

    function setView(
        position,
        newTarget
    ) {
        insideView =
            false;

        if (newTarget) {
            target.copy(
                newTarget
            );
        }

        if (position) {
            camera.position.copy(
                position
            );

            const next =
                new THREE.Spherical()
                    .setFromVector3(
                        camera.position
                            .clone()
                            .sub(target)
                    );

            spherical.theta =
                next.theta;

            spherical.phi =
                next.phi;

            spherical.radius =
                THREE.MathUtils.clamp(
                    next.radius,
                    MIN_ZOOM,
                    MAX_ZOOM
                );
        }

        camera.lookAt(
            target
        );

        render();
    }

    function getView() {
        return {
            position:
                camera.position.clone(),

            target:
                target.clone()
        };
    }

    function setInsideView(
        value,
        position,
        newTarget,
        bounds = null
    ) {
        setAutoRotate(
            false
        );

        insideView =
            Boolean(value);

        if (bounds) {
            setInsideBounds(
                bounds
            );
        }

        if (
            !insideView
        ) {
            if (newTarget) {
                target.copy(
                    newTarget
                );
            }

            if (position) {
                camera.position.copy(
                    position
                );
            }

            const next =
                new THREE.Spherical()
                    .setFromVector3(
                        camera.position
                            .clone()
                            .sub(target)
                    );

            spherical.theta =
                next.theta;

            spherical.phi =
                next.phi;

            spherical.radius =
                THREE.MathUtils.clamp(
                    next.radius,
                    MIN_ZOOM,
                    MAX_ZOOM
                );

            camera.lookAt(
                target
            );

            render();

            return;
        }

        if (position) {
            camera.position.copy(
                position
            );
        }

        clampInsidePosition(
            camera.position
        );

        insideStartPosition.copy(
            camera.position
        );

        if (
            hasInsideBounds
        ) {
            const width =
                insideBounds.max.x -
                insideBounds.min.x;

            const height =
                insideBounds.max.y -
                insideBounds.min.y;

            const depth =
                insideBounds.max.z -
                insideBounds.min.z;

            insideMaxDistance =
                Math.max(
                    1,
                    Math.min(
                        Math.max(
                            width,
                            height,
                            depth
                        ) *
                        0.45,
                        Math.sqrt(
                            width *
                            width +
                            height *
                            height +
                            depth *
                            depth
                        )
                    )
                );
        } else {
            insideMaxDistance =
                0;
        }

        if (newTarget) {
            insideDirection
                .copy(newTarget)
                .sub(
                    camera.position
                );

            if (
                insideDirection.lengthSq() >
                0.000001
            ) {
                insideSpherical
                    .setFromVector3(
                        insideDirection
                    );

                insideSpherical.radius =
                    INSIDE_ROTATION_DISTANCE;
            }
        } else {
            camera.getWorldDirection(
                insideDirection
            );

            insideSpherical
                .setFromVector3(
                    insideDirection
                );

            insideSpherical.radius =
                INSIDE_ROTATION_DISTANCE;
        }

        applyInsideRotation();
    }

    function onPointerDown(e) {
        if (
            e.button !== 0 &&
            e.button !== 2
        ) {
            return;
        }

        isPointerDown =
            true;

        pointerButton =
            e.button;

        pointerMoved =
            false;

        pointerStart.set(
            e.clientX,
            e.clientY
        );

        prevPointer.set(
            e.clientX,
            e.clientY
        );

        dragSpherical.copy(
            spherical
        );

        setAutoRotate(
            false
        );

        if (
            domElement.setPointerCapture
        ) {
            try {
                domElement.setPointerCapture(
                    e.pointerId
                );
            } catch {}
        }
    }

    function onPointerMove(e) {
        if (
            !isPointerDown
        ) {
            return;
        }

        const deltaX =
            e.clientX -
            pointerStart.x;

        const deltaY =
            e.clientY -
            pointerStart.y;

        const stepX =
            e.clientX -
            prevPointer.x;

        const stepY =
            e.clientY -
            prevPointer.y;

        prevPointer.set(
            e.clientX,
            e.clientY
        );

        if (
            !pointerMoved
        ) {
            if (
                Math.abs(deltaX) < 1 &&
                Math.abs(deltaY) < 1
            ) {
                return;
            }

            pointerMoved =
                true;
        }

        if (insideView) {
            if (
                pointerButton === 0
            ) {
                insideSpherical.theta -=
                    deltaX *
                    0.005;

                insideSpherical.phi -=
                    deltaY *
                    0.005;

                insideSpherical.phi =
                    THREE.MathUtils.clamp(
                        insideSpherical.phi,
                        0.05,
                        Math.PI - 0.05
                    );

                applyInsideRotation();

                return;
            }

            if (
                pointerButton === 2
            ) {
                const moveSpeed =
                    INSIDE_MOVE_STEP;

                const forward =
                    new THREE.Vector3();

                const right =
                    new THREE.Vector3();

                const up =
                    new THREE.Vector3(
                        0,
                        1,
                        0
                    );

                camera.getWorldDirection(
                    forward
                );

                forward.y =
                    0;

                if (
                    forward.lengthSq() >
                    0.000001
                ) {
                    forward.normalize();
                }

                right
                    .crossVectors(
                        forward,
                        up
                    )
                    .normalize();

                camera.position.addScaledVector(
                    right,
                    -stepX *
                    moveSpeed
                );

                camera.position.addScaledVector(
                    up,
                    stepY *
                    moveSpeed
                );

                clampInsideCamera();

                applyInsideRotation();
            }

            return;
        }

        if (
            pointerButton === 0
        ) {
            spherical.radius =
                dragSpherical.radius;

            spherical.theta =
                dragSpherical.theta -
                deltaX *
                0.005;

            spherical.phi =
                dragSpherical.phi -
                deltaY *
                0.005;

            spherical.phi =
                THREE.MathUtils.clamp(
                    spherical.phi,
                    0.05,
                    Math.PI / 2 - 0.01
                );

            applySpherical();

            return;
        }

        if (
            pointerButton === 2
        ) {
            const panSpeed =
                spherical.radius *
                0.001;

            const right =
                new THREE.Vector3();

            const up =
                new THREE.Vector3(
                    0,
                    1,
                    0
                );

            camera.getWorldDirection(
                right
            );

            right
                .cross(up)
                .normalize();

            const offset =
                right
                    .multiplyScalar(
                        -stepX *
                        panSpeed
                    );

            offset.add(
                up.multiplyScalar(
                    stepY *
                    panSpeed
                )
            );

            target.add(
                offset
            );

            applySpherical();
        }
    }

    function onPointerUp(e) {
        isPointerDown =
            false;

        pointerMoved =
            false;

        if (
            domElement.releasePointerCapture
        ) {
            try {
                if (
                    domElement.hasPointerCapture &&
                    domElement.hasPointerCapture(
                        e.pointerId
                    )
                ) {
                    domElement.releasePointerCapture(
                        e.pointerId
                    );
                }
            } catch {}
        }
    }

    function onWheel(e) {
        e.preventDefault();

        setAutoRotate(
            false
        );

        if (insideView) {
            camera.getWorldDirection(
                insideDirection
            );

            const distance =
                e.deltaY > 0
                    ? -INSIDE_MOVE_STEP
                    : INSIDE_MOVE_STEP;

            camera.position.addScaledVector(
                insideDirection,
                distance
            );

            clampInsideCamera();

            applyInsideRotation();

            return;
        }

        const factor =
            e.deltaY > 0
                ? 1.08
                : 0.92;

        spherical.radius *=
            factor;

        spherical.radius =
            THREE.MathUtils.clamp(
                spherical.radius,
                MIN_ZOOM,
                MAX_ZOOM
            );

        applySpherical();
    }

    function onContextMenu(e) {
        e.preventDefault();
    }

    function stepAutoRotate() {
        if (
            !autoRotate
        ) {
            rafId =
                null;

            return;
        }

        if (insideView) {
            rafId =
                requestAnimationFrame(
                    stepAutoRotate
                );

            return;
        }

        spherical.theta -=
            autoRotateSpeed *
            0.01;

        applySpherical();

        rafId =
            requestAnimationFrame(
                stepAutoRotate
            );
    }

    function setAutoRotate(
        value
    ) {
        autoRotate =
            Boolean(value) &&
            !insideView;

        if (
            autoRotate
        ) {
            if (
                rafId === null
            ) {
                rafId =
                    requestAnimationFrame(
                        stepAutoRotate
                    );
            }

            return;
        }

        if (
            rafId !== null
        ) {
            cancelAnimationFrame(
                rafId
            );

            rafId =
                null;
        }
    }

    domElement.addEventListener(
        'pointerdown',
        onPointerDown
    );

    window.addEventListener(
        'pointermove',
        onPointerMove
    );

    window.addEventListener(
        'pointerup',
        onPointerUp
    );

    domElement.addEventListener(
        'wheel',
        onWheel,
        {
            passive: false
        }
    );

    domElement.addEventListener(
        'contextmenu',
        onContextMenu
    );

    function frameBounds(
        bounds
    ) {
        if (
            !bounds ||
            !bounds.center
        ) {
            return;
        }

        insideView =
            false;

        target.set(
            bounds.center.x,
            bounds.center.y,
            bounds.center.z
        );

        const maxDim =
            Math.max(
                bounds.width || 10,
                bounds.height || 5,
                bounds.length || 10
            );

        const fovRad =
            (
                camera.fov *
                Math.PI
            ) / 180;

        const fitDistance =
            maxDim /
            2 /
            Math.tan(
                fovRad /
                2
            );

        spherical.radius =
            THREE.MathUtils.clamp(
                fitDistance *
                1.5,
                MIN_ZOOM,
                MAX_ZOOM
            );

        spherical.theta =
            Math.PI *
            5 /
            4;

        spherical.phi =
            Math.PI /
            3;

        applySpherical();
    }

    function dispose() {
        setAutoRotate(
            false
        );

        domElement.removeEventListener(
            'pointerdown',
            onPointerDown
        );

        window.removeEventListener(
            'pointermove',
            onPointerMove
        );

        window.removeEventListener(
            'pointerup',
            onPointerUp
        );

        domElement.removeEventListener(
            'wheel',
            onWheel
        );

        domElement.removeEventListener(
            'contextmenu',
            onContextMenu
        );
    }

    return Object.freeze({
        target,

        frameBounds,

        updateCameraPosition:
            applySpherical,

        setView,

        getView,

        setInsideBounds,

        setInsideView,

        setAutoRotate,

        get autoRotate() {
            return autoRotate;
        },

        get baseRadius() {
            return spherical.radius;
        },

        get insideView() {
            return insideView;
        },

        dispose
    });
}