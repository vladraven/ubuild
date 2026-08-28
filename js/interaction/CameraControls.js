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

    let insideView =
        false;

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
            Math.max(
                MIN_ZOOM,
                Math.min(
                    MAX_ZOOM,
                    spherical.radius
                )
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

    function setView(
        position,
        newTarget
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
                Math.max(
                    MIN_ZOOM,
                    Math.min(
                        MAX_ZOOM,
                        next.radius
                    )
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
        newTarget
    ) {
        setAutoRotate(
            false
        );

        insideView =
            Boolean(value);

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

        if (insideView) {
            camera.lookAt(
                target
            );
        } else {
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
                Math.max(
                    MIN_ZOOM,
                    Math.min(
                        MAX_ZOOM,
                        next.radius
                    )
                );

            camera.lookAt(
                target
            );
        }

        render();
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
                Math.max(
                    0.05,
                    Math.min(
                        Math.PI / 2 -
                            0.01,
                        spherical.phi
                    )
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

        if (
            insideView
        ) {
            const direction =
                new THREE.Vector3();

            camera.getWorldDirection(
                direction
            );

            const distance =
                e.deltaY > 0
                    ? -0.25
                    : 0.25;

            camera.position.addScaledVector(
                direction,
                distance
            );

            render();

            return;
        }

        const factor =
            e.deltaY > 0
                ? 1.08
                : 0.92;

        spherical.radius *=
            factor;

        spherical.radius =
            Math.max(
                MIN_ZOOM,
                Math.min(
                    MAX_ZOOM,
                    spherical.radius
                )
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
            Boolean(value);

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
            Math.max(
                MIN_ZOOM,
                Math.min(
                    MAX_ZOOM,
                    fitDistance *
                        1.5
                )
            );

        /*
         * Mirror the previous camera position
         * through the building center.
         *
         * Old side:
         * PI / 4
         *
         * Mirrored side:
         * PI / 4 + PI
         */
        spherical.theta =
            Math.PI * 5 / 4;

        spherical.phi =
            Math.PI / 3;

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

        setInsideView,

        setAutoRotate,

        get autoRotate() {
            return autoRotate;
        },

        get baseRadius() {
            return spherical.radius;
        },

        dispose
    });
}