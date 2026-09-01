import {
    setElementChecked
}
from '../dom-helpers.js';

const WALLS =
    Object.freeze([
        Object.freeze({
            control: '#wF',
            key: 'wallFront'
        }),

        Object.freeze({
            control: '#wB',
            key: 'wallBack'
        }),

        Object.freeze({
            control: '#wL',
            key: 'wallLeft'
        }),

        Object.freeze({
            control: '#wR',
            key: 'wallRight'
        })
    ]);

export function createWallVisibilityController({
    runtime,
    update
}) {
    if (
        !runtime
    ) {
        throw new TypeError(
            'UBuildRuntime instance is required for WallVisibilityController'
        );
    }

    if (
        typeof update !==
        'function'
    ) {
        throw new TypeError(
            'update function is required for WallVisibilityController'
        );
    }

    let initialized =
        false;

    function bindWall(
        wall
    ) {
        const control =
            document.querySelector(
                wall.control
            );

        if (
            !control ||
            control.type !==
            'checkbox'
        ) {
            return;
        }

        control.addEventListener(
            'change',
            (
                event
            ) => {
                update({
                    visibility: {
                        ...runtime.model.visibility,

                        [wall.key]:
                            event.target.checked
                    }
                });
            }
        );
    }

    function bind() {
        if (
            initialized
        ) {
            return;
        }

        initialized =
            true;

        for (
            const wall
            of WALLS
        ) {
            bindWall(
                wall
            );
        }
    }

    function syncFromModel() {
        const visibility =
            runtime.model.visibility;

        if (
            !visibility
        ) {
            return;
        }

        for (
            const wall
            of WALLS
        ) {
            setElementChecked(
                [
                    wall.control
                ],
                visibility[
                    wall.key
                ] !==
                    false
            );
        }
    }

    return Object.freeze({
        bind,

        syncFromModel
    });
}