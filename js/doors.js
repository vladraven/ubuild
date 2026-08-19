// js/doors.js
import * as THREE from 'three';
import {
    openingsData,
    openingDefs,
    hitboxes
} from './state.js';

import {
    doorFrameMat,
    doorPanelMat,
    doorTrimMat
} from './colorise.js';

function createBox(
    w,
    h,
    d,
    mat,
    x = 0,
    y = 0,
    z = 0
) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(
            w,
            h,
            d
        ),
        mat
    );

    mesh.position.set(
        x,
        y,
        z
    );

    return mesh;
}

export function buildDoorMesh(op) {
    const grp =
        new THREE.Group();

    const def =
        openingDefs[op.type] || {
            w: 2.0,
            h: 2.1
        };

    const w =
        op.w || def.w;

    const h =
        op.h || def.h;

    const d = 0.2;
    const f = 0.05;

    grp.add(
        createBox(
            w,
            f,
            d,
            doorFrameMat,
            0,
            -h / 2 + f / 2,
            0
        )
    );

    grp.add(
        createBox(
            w,
            f,
            d,
            doorFrameMat,
            0,
            h / 2 - f / 2,
            0
        )
    );

    grp.add(
        createBox(
            f,
            h - f * 2,
            d,
            doorFrameMat,
            -w / 2 + f / 2,
            0,
            0
        )
    );

    grp.add(
        createBox(
            f,
            h - f * 2,
            d,
            doorFrameMat,
            w / 2 - f / 2,
            0,
            0
        )
    );

    if (op.type === 'Walk Door Solid') {
        grp.add(
            createBox(
                w - f * 2,
                h - f,
                d - 0.05,
                doorPanelMat,
                0,
                f / 2,
                0
            )
        );

        grp.add(
            createBox(
                0.05,
                0.2,
                0.3,
                doorTrimMat,
                w / 2 - 0.15,
                0,
                0
            )
        );
    }

    else if (
        op.type === 'Walk Door Solid Double'
    ) {
        grp.add(
            createBox(
                0.02,
                h - f,
                d,
                doorFrameMat,
                0,
                f / 2,
                0
            )
        );

        grp.add(
            createBox(
                w / 2 - f,
                h - f,
                d - 0.05,
                doorPanelMat,
                -w / 4,
                f / 2,
                0
            )
        );

        grp.add(
            createBox(
                w / 2 - f,
                h - f,
                d - 0.05,
                doorPanelMat,
                w / 4,
                f / 2,
                0
            )
        );

        grp.add(
            createBox(
                0.05,
                0.2,
                0.3,
                doorTrimMat,
                -0.1,
                0,
                0
            )
        );

        grp.add(
            createBox(
                0.05,
                0.2,
                0.3,
                doorTrimMat,
                0.1,
                0,
                0
            )
        );
    }

    else if (
        op.type === 'Overhead Panel Door'
    ) {
        const pw =
            w - f * 2;

        const ph =
            (h - f) / 4;

        for (
            let i = 0;
            i < 4;
            i++
        ) {
            const py =
                -h / 2 +
                f +
                ph * i +
                ph / 2;

            grp.add(
                createBox(
                    pw,
                    ph - 0.02,
                    d - 0.05,
                    doorPanelMat,
                    0,
                    py,
                    0
                )
            );
        }
    }

    else if (
        op.type === 'Bi-Fold Door'
    ) {
        const pw =
            w - f * 2;

        const ph =
            (h - f) / 2;

        const zOffsetOutside =
            0.22;

        const bottomPanel =
            createBox(
                pw,
                ph - 0.01,
                d - 0.05,
                doorPanelMat,
                0,
                -h / 4 + f / 2,
                zOffsetOutside
            );

        bottomPanel.rotation.x =
            0.1;

        grp.add(bottomPanel);

        const topPanel =
            createBox(
                pw,
                ph - 0.01,
                d - 0.05,
                doorPanelMat,
                0,
                h / 4 + f / 2,
                zOffsetOutside
            );

        topPanel.rotation.x =
            -0.1;

        grp.add(topPanel);
    }

    else if (
        op.type === 'Hydraulic Door'
    ) {
        const p =
            createBox(
                w,
                h,
                d - 0.05,
                doorPanelMat,
                0,
                h / 4,
                h / 4
            );

        p.rotation.x =
            -0.3;

        grp.add(p);
    }

    const hit =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                w,
                h
            ),
            new THREE.MeshBasicMaterial({
                visible: false
            })
        );

    hit.position.z =
        0.3;

    grp.add(hit);

    return {
        mesh: grp,
        hit
    };
}

export function createDoorsGroupForWall(
    side,
    wallLength
) {
    const group =
        new THREE.Group();

    if (!openingsData[side]) {
        return group;
    }

    openingsData[side].forEach(op => {
        if (op.type === 'Window') {
            return;
        }

        const def =
            openingDefs[op.type] || {
                w: 2.0,
                h: 2.1
            };

        const opW =
            op.w || def.w;

        const opH =
            op.h || def.h;

        const yOff = 0;

        const opObj =
            buildDoorMesh(op);

        opObj.mesh.position.set(
            op.x,
            yOff + opH / 2,
            0
        );

        opObj.hit.userData = {
            isOpening: true,
            side,
            opId: op.id,
            opData: op,
            meshGroup: opObj.mesh,
            wallLength
        };

        hitboxes.push(
            opObj.hit
        );

        group.add(
            opObj.mesh
        );
    });

    return group;
}