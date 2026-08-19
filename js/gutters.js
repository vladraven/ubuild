import * as THREE from 'three';

import {
    trimMat,
    eaveTrimMat
} from './colorise.js';

import {
    openingsData,
    openingDefs
} from './state.js';

export const GUTTER_CONFIG = {
    gutter: {
        lengthOffset: 0.125,
        widthOffset: 0.0,
        offsetX: 0.0,
        offsetY: -0.135
    },

    topElbow: {
        angleDeg: 25,
        length: 0.35,
        offsetX: 0.0,
        offsetY: -0.025,
        offsetZ: 0.0
    },

    bottomElbow: {
        angleDeg: 45,
        length: 0.12,
        offsetX: 0.0,
        offsetY: 0.025,
        offsetZ: 0.0
    },

    pipe: {
        wallOffset: 0.06,
        heightOffset: 0.0,
        groundOffset: 0.15,
        width: 0.08,
        depth: 0.06
    }
};

const DOWNSPOUT_DOOR_TOLERANCE = 0.3;

function createGutter(length) {
    const shape =
        new THREE.Shape();

    const w =
        0.14 +
        GUTTER_CONFIG
            .gutter
            .widthOffset;

    const h = 0.12;
    const t = 0.01;

    shape.moveTo(0, h);
    shape.lineTo(0, 0);

    shape.absarc(
        w / 2,
        0,
        w / 2,
        Math.PI,
        0,
        true
    );

    shape.lineTo(w, h);
    shape.lineTo(w - t, h);

    shape.absarc(
        w / 2,
        0,
        w / 2 - t,
        0,
        Math.PI,
        false
    );

    shape.lineTo(t, h);
    shape.closePath();

    const safeLength =
        Math.max(
            0.01,
            length +
            GUTTER_CONFIG
                .gutter
                .lengthOffset
        );

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth: safeLength,
                bevelEnabled: false
            }
        );

    geometry.translate(
        0,
        0,
        -safeLength / 2
    );

    const mesh =
        new THREE.Mesh(
            geometry,
            eaveTrimMat
        );

    mesh.castShadow = true;
    mesh.renderOrder = 2;

    const capShape =
        new THREE.Shape();

    capShape.moveTo(0, h);
    capShape.lineTo(0, 0);

    capShape.absarc(
        w / 2,
        0,
        w / 2,
        Math.PI,
        0,
        true
    );

    capShape.lineTo(w, h);
    capShape.closePath();

    const capGeometry =
        new THREE.ShapeGeometry(
            capShape
        );

    const capFront =
        new THREE.Mesh(
            capGeometry,
            eaveTrimMat
        );

    capFront.position.z =
        safeLength / 2;

    capFront.renderOrder = 2;

    mesh.add(
        capFront
    );

    const capBack =
        new THREE.Mesh(
            capGeometry,
            eaveTrimMat
        );

    capBack.position.z =
        -safeLength / 2;

    capBack.renderOrder = 2;

    mesh.add(
        capBack
    );

    return mesh;
}

function createRectPipeGeo(
    length
) {
    const safeLength =
        Math.max(
            0.01,
            length
        );

    const shape =
        new THREE.Shape();

    const w =
        GUTTER_CONFIG.pipe.width;

    const d =
        GUTTER_CONFIG.pipe.depth;

    const r = 0.012;

    shape.moveTo(
        -w / 2 + r,
        d / 2
    );

    shape.lineTo(
        w / 2 - r,
        d / 2
    );

    shape.quadraticCurveTo(
        w / 2,
        d / 2,
        w / 2,
        d / 2 - r
    );

    shape.lineTo(
        w / 2,
        -d / 2 + r
    );

    shape.quadraticCurveTo(
        w / 2,
        -d / 2,
        w / 2 - r,
        -d / 2
    );

    shape.lineTo(
        -w / 2 + r,
        -d / 2
    );

    shape.quadraticCurveTo(
        -w / 2,
        -d / 2,
        -w / 2,
        -d / 2 + r
    );

    shape.lineTo(
        -w / 2,
        d / 2 - r
    );

    shape.quadraticCurveTo(
        -w / 2,
        d / 2,
        -w / 2 + r,
        d / 2
    );

    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth: safeLength,
                bevelEnabled: false,
                curveSegments: 4
            }
        );

    geometry.translate(
        0,
        0,
        -safeLength / 2
    );

    geometry.rotateX(
        Math.PI / 2
    );

    return geometry;
}

function createDownspout(
    eaveY,
    sideX,
    overhang,
    width
) {
    const group =
        new THREE.Group();

    const pipeMat =
        trimMat;

    const pipeWidth =
        GUTTER_CONFIG.pipe.width;

    const pipeDepth =
        GUTTER_CONFIG.pipe.depth;

    const halfW =
        width / 2;

    const wallX =
        sideX *
        (
            halfW +
            overhang +
            GUTTER_CONFIG
                .pipe
                .wallOffset
        );

    const pipeBottomY =
        Math.max(
            0.02,
            GUTTER_CONFIG
                .pipe
                .groundOffset
        );

    const topAngleRad =
        (
            GUTTER_CONFIG
                .topElbow
                .angleDeg *
            Math.PI
        ) / 180;

    const topElbowLen =
        GUTTER_CONFIG
            .topElbow
            .length;

    const gutterBottomY =
        eaveY +
        GUTTER_CONFIG
            .gutter
            .offsetY;

    const topDropY =
        topElbowLen *
        Math.cos(
            topAngleRad
        );

    const pipeTopY =
        gutterBottomY -
        topDropY;

    const pipeH =
        Math.max(
            0.01,
            (
                pipeTopY -
                pipeBottomY
            ) +
            GUTTER_CONFIG
                .pipe
                .heightOffset
        );

    const pipe =
        new THREE.Mesh(
            createRectPipeGeo(
                pipeH
            ),
            pipeMat
        );

    pipe.position.set(
        wallX,
        pipeBottomY +
            pipeH / 2,
        0
    );

    pipe.castShadow = true;

    group.add(
        pipe
    );

    const actualPipeTopY =
        pipeBottomY +
        pipeH;

    if (
        topElbowLen > 0
    ) {
        const topMesh =
            new THREE.Mesh(
                createRectPipeGeo(
                    topElbowLen
                ),
                pipeMat
            );

        const topRotZ =
            -sideX *
            topAngleRad;

        const shiftX =
            (
                topElbowLen / 2
            ) *
            Math.sin(
                topAngleRad
            );

        const shiftY =
            (
                topElbowLen / 2
            ) *
            Math.cos(
                topAngleRad
            );

        topMesh.position.set(
            wallX +
                sideX *
                shiftX +
                sideX *
                GUTTER_CONFIG
                    .topElbow
                    .offsetX,

            actualPipeTopY +
                shiftY,

            GUTTER_CONFIG
                .topElbow
                .offsetZ
        );

        topMesh.rotation.z =
            topRotZ;

        topMesh.castShadow = true;

        group.add(
            topMesh
        );
    }

    const shoeLen =
        GUTTER_CONFIG
            .bottomElbow
            .length;

    if (
        shoeLen > 0
    ) {
        const btmAngleRad =
            (
                GUTTER_CONFIG
                    .bottomElbow
                    .angleDeg *
                Math.PI
            ) / 180;

        const btmMesh =
            new THREE.Mesh(
                createRectPipeGeo(
                    shoeLen
                ),
                pipeMat
            );

        const btmShiftX =
            (
                shoeLen / 2
            ) *
            Math.sin(
                btmAngleRad
            );

        const btmDropY =
            (
                shoeLen / 2
            ) *
            Math.cos(
                btmAngleRad
            );

        btmMesh.position.set(
            wallX +
                sideX *
                btmShiftX +
                sideX *
                GUTTER_CONFIG
                    .bottomElbow
                    .offsetX,

            pipeBottomY -
                btmDropY +
                GUTTER_CONFIG
                    .bottomElbow
                    .offsetY,

            GUTTER_CONFIG
                .bottomElbow
                .offsetZ
        );

        btmMesh.rotation.z =
            sideX *
            btmAngleRad;

        btmMesh.castShadow = true;

        group.add(
            btmMesh
        );
    }

    const strapGeo =
        new THREE.BoxGeometry(
            pipeWidth * 1.3,
            0.02,
            pipeDepth * 1.3
        );

    const strapMat =
        new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.3
        });

    [
        0.3,
        (
            actualPipeTopY +
            pipeBottomY
        ) * 0.5,
        actualPipeTopY - 0.1
    ].forEach(
        yPos => {
            if (
                yPos >
                    pipeBottomY &&
                yPos <
                    actualPipeTopY
            ) {
                const bracket =
                    new THREE.Mesh(
                        strapGeo,
                        strapMat
                    );

                bracket.position.set(
                    wallX,
                    yPos,
                    0
                );

                bracket.castShadow = true;

                group.add(
                    bracket
                );
            }
        }
    );

    return group;
}

export function createGuttersGroup(
    width,
    length,
    height,
    pitchRatio,
    roofType,
    enabled,
    overL = 0,
    overR = 0,
    overF = 0,
    overB = 0
) {
    const group =
        new THREE.Group();

    if (!enabled) {
        return group;
    }

    const halfW =
        width / 2;

    const isLSloped =
        roofType ===
        'left-sloped';

    const isRSloped =
        roofType ===
        'right-sloped';

    const isSingle =
        isLSloped ||
        isRSloped;

    const totalRise =
        isSingle
            ? width * pitchRatio
            : halfW * pitchRatio;

    const eaveDropL =
        overL *
        pitchRatio;

    const eaveDropR =
        overR *
        pitchRatio;

    const extraH =
        0.03;

    let leftEaveY =
        height -
        eaveDropL +
        extraH / 2;

    let rightEaveY =
        height -
        eaveDropR +
        extraH / 2;

    if (isLSloped) {
        rightEaveY =
            height +
            totalRise +
            eaveDropR +
            extraH / 2;
    }

    if (isRSloped) {
        leftEaveY =
            height +
            totalRise +
            eaveDropL +
            extraH / 2;
    }

    /*
     * The gutter follows the actual longitudinal
     * roof dimension including front/back overhangs.
     */

    const gutterLength =
        length +
        overF +
        overB;

    const zOffset =
        (overF - overB) / 2;

    const gutterL =
        createGutter(
            gutterLength
        );

    gutterL.scale.x = -1;

    gutterL.position.set(
        -halfW -
            overL +
            GUTTER_CONFIG
                .gutter
                .offsetX,

        leftEaveY +
            GUTTER_CONFIG
                .gutter
                .offsetY,

        zOffset
    );

    group.add(
        gutterL
    );

    const gutterR =
        createGutter(
            gutterLength
        );

    gutterR.position.set(
        halfW +
            overR -
            GUTTER_CONFIG
                .gutter
                .offsetX,

        rightEaveY +
            GUTTER_CONFIG
                .gutter
                .offsetY,

        zOffset
    );

    group.add(
        gutterR
    );

    /*
     * Downspouts are distributed along the actual
     * roof/gutter length.
     */

    const metersPerSpout =
        25 * 0.3048;

    const numDownspouts =
        Math.max(
            2,
            Math.ceil(
                gutterLength /
                metersPerSpout
            ) + 1
        );

    const spacing =
        (
            gutterLength - 0.6
        ) /
        Math.max(
            1,
            numDownspouts - 1
        );

    const gutterStartZ =
        -gutterLength / 2;

    for (
        let i = 0;
        i < numDownspouts;
        i++
    ) {
        const zPos =
            zOffset +
            gutterStartZ +
            0.3 +
            i * spacing;

        const dsL =
            createDownspout(
                leftEaveY,
                -1,
                overL,
                width
            );

        dsL.position.set(
            0,
            0,
            zPos
        );

        dsL.userData = {
            isDownspout: true,
            side: 'L',
            wallPos:
                zPos -
                zOffset
        };

        group.add(
            dsL
        );

        const dsR =
            createDownspout(
                rightEaveY,
                1,
                overR,
                width
            );

        dsR.position.set(
            0,
            0,
            zPos
        );

        dsR.userData = {
            isDownspout: true,
            side: 'R',
            wallPos:
                zPos -
                zOffset
        };

        group.add(
            dsR
        );
    }

    return group;
}

export function updateDownspoutVisibility(
    root
) {
    if (!root) {
        return;
    }

    const downspouts = [];

    root.traverse(
        obj => {
            if (
                obj.userData &&
                obj.userData.isDownspout
            ) {
                downspouts.push(
                    obj
                );
            }
        }
    );

    downspouts.forEach(
        ds => {
            const side =
                ds.userData.side;

            const dsPos =
                ds.userData.wallPos;

            const doorsOnWall =
                (
                    openingsData[side] ||
                    []
                ).filter(
                    op =>
                        op.type !==
                        'Window'
                );

            const collides =
                doorsOnWall.some(
                    door => {
                        const def =
                            openingDefs[
                                door.type
                            ] || {
                                w: 2.0
                            };

                        const doorW =
                            door.w ||
                            def.w;

                        const minX =
                            door.x -
                            doorW / 2 -
                            DOWNSPOUT_DOOR_TOLERANCE;

                        const maxX =
                            door.x +
                            doorW / 2 +
                            DOWNSPOUT_DOOR_TOLERANCE;

                        return (
                            dsPos >= minX &&
                            dsPos <= maxX
                        );
                    }
                );

            ds.visible =
                !collides;
        }
    );
}