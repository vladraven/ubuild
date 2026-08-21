import * as THREE from 'three';

const BEAM = Object.freeze({
    frame: 0.16,
    girt: 0.07,
    purlin: 0.07,
    endColumn: 0.12
});

function assertContext(context) {
    if (!context || typeof context !== 'object') {
        throw new TypeError('Element context is required');
    }

    if (!context.structuralGeometry) {
        throw new TypeError('Structural geometry is required');
    }

    if (!context.materials) {
        throw new TypeError('Material system is required');
    }
}

function resolveMaterial(context) {
    if (typeof context.materials.get === 'function') {
        return context.materials.get(
            'structuralSteel',
            context.colors?.frame
        );
    }

    return (
        context.materials.structuralSteel ||
        context.materials.steel
    );
}

function createBeam(
    lineSeg,
    material,
    thickness = 0.12,
    offset = null
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

    if (offset) {
        start.add(offset);
        end.add(offset);
    }

    const direction =
        end.clone().sub(start);

    const length =
        direction.length();

    if (length <= 0.001) {
        return null;
    }

    direction.normalize();

    const geometry =
        new THREE.BoxGeometry(
            thickness,
            thickness,
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
        direction
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function getRoofInteriorOffset(
    lineSeg,
    thickness
) {
    if (
        !lineSeg ||
        !lineSeg.start ||
        !lineSeg.end
    ) {
        return null;
    }

    const direction =
        new THREE.Vector3(
            lineSeg.end.x -
                lineSeg.start.x,
            lineSeg.end.y -
                lineSeg.start.y,
            lineSeg.end.z -
                lineSeg.start.z
        );

    const length =
        direction.length();

    if (length <= 0.001) {
        return null;
    }

    direction.normalize();

    let normal =
        new THREE.Vector3(
            -direction.y,
            direction.x,
            0
        );

    if (normal.y > 0) {
        normal.negate();
    }

    normal.normalize();

    if (normal.y >= 0) {
        normal.set(
            0,
            -1,
            0
        );
    }

    return normal.multiplyScalar(
        thickness / 2 + 0.015
    );
}

function getPurlinOffset(
    roofType,
    lineSeg,
    thickness
) {
    if (
        !lineSeg ||
        !lineSeg.start ||
        !lineSeg.end
    ) {
        return null;
    }

    const direction =
        new THREE.Vector3(
            lineSeg.end.x -
                lineSeg.start.x,
            lineSeg.end.y -
                lineSeg.start.y,
            lineSeg.end.z -
                lineSeg.start.z
        );

    const length =
        direction.length();

    if (length <= 0.001) {
        return null;
    }

    direction.normalize();

    if (
        roofType === 'gabled'
    ) {
        const roofSlope =
            Math.abs(
                lineSeg.start.x
            ) > 0.001
                ? (
                    lineSeg.start.y -
                    lineSeg.end.y
                ) /
                (
                    lineSeg.start.x -
                    lineSeg.end.x
                )
                : 0;

        let normal =
            new THREE.Vector3(
                -roofSlope,
                1,
                0
            );

        if (normal.y > 0) {
            normal.negate();
        }

        normal.normalize();

        return normal.multiplyScalar(
            thickness / 2 + 0.015
        );
    }

    return new THREE.Vector3(
        0,
        -(thickness / 2 + 0.015),
        0
    );
}

function getColumnDimensions(
    context
) {
    const structural =
        context.structuralGeometry ||
        {};

    const model =
        context.model ||
        {};

    const columns =
        structural.columnDimensions ||
        structural.columns ||
        model.structural?.columns ||
        {};

    const dBottom =
        Number(
            columns.dBottom ??
            columns.dStart ??
            model.geometry?.colDStart ??
            0.20
        );

    const dTop =
        Number(
            columns.dTop ??
            columns.dEnd ??
            model.geometry?.colDEnd ??
            0.60
        );

    const flangeWidth =
        Number(
            columns.flangeWidth ??
            columns.flangeW ??
            0.20
        );

    const flangeThickness =
        Number(
            columns.flangeThickness ??
            columns.flangeT ??
            0.012
        );

    const webThickness =
        Number(
            columns.webThickness ??
            columns.webT ??
            0.008
        );

    return Object.freeze({
        dBottom:
            Number.isFinite(dBottom) &&
            dBottom > 0
                ? dBottom
                : 0.20,

        dTop:
            Number.isFinite(dTop) &&
            dTop > 0
                ? dTop
                : 0.60,

        flangeWidth:
            Number.isFinite(flangeWidth) &&
            flangeWidth > 0
                ? flangeWidth
                : 0.20,

        flangeThickness:
            Number.isFinite(flangeThickness) &&
            flangeThickness > 0
                ? flangeThickness
                : 0.012,

        webThickness:
            Number.isFinite(webThickness) &&
            webThickness > 0
                ? webThickness
                : 0.008
    });
}

function createColumnShape(
    sign,
    dBottom,
    dTop,
    height
) {
    const shape =
        new THREE.Shape();

    shape.moveTo(
        0,
        0
    );

    shape.lineTo(
        0,
        height
    );

    shape.lineTo(
        sign * dTop,
        height
    );

    shape.lineTo(
        sign * dBottom,
        0
    );

    shape.closePath();

    return shape;
}

function createColumnWeb(
    shape,
    material,
    webThickness
) {
    const geometry =
        new THREE.ExtrudeGeometry(
            shape,
            {
                depth: webThickness,
                bevelEnabled: false,
                curveSegments: 1,
                steps: 1
            }
        );

    geometry.translate(
        0,
        0,
        -webThickness / 2
    );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function createColumnInnerFlange(
    sign,
    height,
    material,
    flangeWidth,
    flangeThickness
) {
    const geometry =
        new THREE.BoxGeometry(
            flangeThickness,
            height,
            flangeWidth
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    /*
     * The inner flange is placed immediately
     * inside the structural reference axis.
     *
     * LEFT:
     *      flange -> +X
     *
     * RIGHT:
     *      flange -> -X
     */

    mesh.position.set(
        sign *
            (
                flangeThickness / 2
            ),
        height / 2,
        0
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function createColumnOuterFlange(
    sign,
    dBottom,
    dTop,
    height,
    material,
    flangeWidth,
    flangeThickness
) {
    const delta =
        dTop -
        dBottom;

    const length =
        Math.hypot(
            height,
            delta
        );

    const angle =
        Math.atan2(
            delta,
            height
        );

    const geometry =
        new THREE.BoxGeometry(
            flangeThickness,
            length,
            flangeWidth
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    /*
     * The flange follows the OUTER edge
     * of the tapered web.
     *
     * LEFT:
     *
     *       /
     *      /
     *     /
     *
     * RIGHT:
     *
     *     \
     *      \
     *       \
     */

    mesh.position.set(
        sign *
            (
                (
                    dBottom +
                    dTop
                ) / 2
            ),
        height / 2,
        0
    );

    /*
     * Do not mirror a finished mesh.
     *
     * Explicitly assign the correct rotation
     * for each handedness.
     */

    mesh.rotation.z =
        sign > 0
            ? -angle
            : angle;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

function createSolidColumn(
    lineSeg,
    material,
    side,
    dimensions
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

    const height =
        direction.length();

    if (height <= 0.001) {
        return null;
    }

    const dBottom =
        dimensions.dBottom;

    const dTop =
        dimensions.dTop;

    const flangeWidth =
        dimensions.flangeWidth;

    const flangeThickness =
        dimensions.flangeThickness;

    const webThickness =
        dimensions.webThickness;

    /*
     * The handedness is determined ONLY by
     * the column identity.
     *
     * LEFT  = +X
     * RIGHT = -X
     *
     * There is deliberately no scale.x = -1.
     */

    const sign =
        side === 'left'
            ? 1
            : -1;

    const shape =
        createColumnShape(
            sign,
            dBottom,
            dTop,
            height
        );

    const web =
        createColumnWeb(
            shape,
            material,
            webThickness
        );

    const innerFlange =
        createColumnInnerFlange(
            sign,
            height,
            material,
            flangeWidth,
            flangeThickness
        );

    const outerFlange =
        createColumnOuterFlange(
            sign,
            dBottom,
            dTop,
            height,
            material,
            flangeWidth,
            flangeThickness
        );

    const group =
        new THREE.Group();

    group.name =
        `${side}-column-profile`;

    group.add(
        web,
        innerFlange,
        outerFlange
    );

    /*
     * CRITICAL:
     *
     * The structural line is the mounting axis.
     *
     * We do NOT center the bounding box.
     *
     * We do NOT shift the complete profile
     * by dTop / 2.
     *
     * We do NOT mirror the group.
     */

    group.position.copy(
        start
    );

    /*
     * Current structural columns are vertical.
     *
     * Only compensate for an actual non-vertical
     * structural line.
     *
     * There is intentionally NO rotation around
     * the Y axis. That was one of the causes of
     * the apparent mirrored/turned second column.
     */

    const vertical =
        new THREE.Vector3(
            0,
            height,
            0
        );

    const actual =
        direction.clone();

    const horizontal =
        new THREE.Vector3(
            actual.x,
            0,
            actual.z
        );

    if (
        horizontal.lengthSq() >
        0.00000001
    ) {
        const quaternion =
            new THREE.Quaternion();

        quaternion.setFromUnitVectors(
            vertical.normalize(),
            actual.normalize()
        );

        group.quaternion.copy(
            quaternion
        );
    }

    return group;
}

function createObject(
    context
) {
    assertContext(
        context
    );

    const root =
        new THREE.Group();

    root.name =
        'structural';

    const material =
        resolveMaterial(
            context
        );

    const vis =
        context.model?.visibility ||
        {};

    const roofType =
        context.structuralGeometry
            ?.roofType ||
        context.model?.roof?.type ||
        'gabled';

    const columnDimensions =
        getColumnDimensions(
            context
        );

    /*
     * MAIN FRAMES
     */

    if (
        vis.frames !== false &&
        context.structuralGeometry.frames
    ) {
        for (
            const frame
            of context.structuralGeometry.frames
        ) {
            const group =
                new THREE.Group();

            group.name =
                `frame-${frame.index}`;

            /*
             * LEFT MAIN COLUMN
             */

            if (
                frame.leftColumn
            ) {
                const column =
                    createSolidColumn(
                        frame.leftColumn,
                        material,
                        'left',
                        columnDimensions
                    );

                if (column) {
                    group.add(
                        column
                    );
                }
            }

            /*
             * LEFT RAFTER
             *
             * Unchanged structural behavior.
             */

            if (
                frame.leftRafter
            ) {
                const offset =
                    getRoofInteriorOffset(
                        frame.leftRafter,
                        BEAM.frame
                    );

                const beam =
                    createBeam(
                        frame.leftRafter,
                        material,
                        BEAM.frame,
                        offset
                    );

                if (beam) {
                    group.add(
                        beam
                    );
                }
            }

            /*
             * RIGHT RAFTER
             *
             * Unchanged structural behavior.
             */

            if (
                frame.rightRafter
            ) {
                const offset =
                    getRoofInteriorOffset(
                        frame.rightRafter,
                        BEAM.frame
                    );

                const beam =
                    createBeam(
                        frame.rightRafter,
                        material,
                        BEAM.frame,
                        offset
                    );

                if (beam) {
                    group.add(
                        beam
                    );
                }
            }

            /*
             * RIGHT MAIN COLUMN
             */

            if (
                frame.rightColumn
            ) {
                const column =
                    createSolidColumn(
                        frame.rightColumn,
                        material,
                        'right',
                        columnDimensions
                    );

                if (column) {
                    group.add(
                        column
                    );
                }
            }

            /*
             * SINGLE-SLOPE RAFTER
             *
             * Unchanged.
             */

            if (
                frame.rafter
            ) {
                const offset =
                    getRoofInteriorOffset(
                        frame.rafter,
                        BEAM.frame
                    );

                const beam =
                    createBeam(
                        frame.rafter,
                        material,
                        BEAM.frame,
                        offset
                    );

                if (beam) {
                    group.add(
                        beam
                    );
                }
            }

            root.add(
                group
            );
        }
    }

    /*
     * GIRTS
     *
     * Unchanged.
     */

    if (
        vis.girts !== false &&
        context.structuralGeometry.girts
    ) {
        for (
            const girt
            of context.structuralGeometry.girts
        ) {
            const sideKeys = [
                'frontSegments',
                'backSegments',
                'leftSegments',
                'rightSegments'
            ];

            for (
                const sideKey
                of sideKeys
            ) {
                const segments =
                    girt[sideKey] ||
                    [];

                for (
                    const segment
                    of segments
                ) {
                    const beam =
                        createBeam(
                            segment,
                            material,
                            BEAM.girt
                        );

                    if (beam) {
                        root.add(
                            beam
                        );
                    }
                }
            }
        }
    }

    /*
     * PURLINS
     *
     * Unchanged.
     */

    if (
        vis.purlins !== false &&
        context.structuralGeometry.purlins
    ) {
        for (
            const purlin
            of context.structuralGeometry.purlins
        ) {
            if (
                purlin.planes
            ) {
                for (
                    const segment
                    of Object.values(
                        purlin.planes
                    )
                ) {
                    const offset =
                        getPurlinOffset(
                            roofType,
                            segment,
                            BEAM.purlin
                        );

                    const beam =
                        createBeam(
                            segment,
                            material,
                            BEAM.purlin,
                            offset
                        );

                    if (beam) {
                        root.add(
                            beam
                        );
                    }
                }
            } else if (
                purlin.plane
            ) {
                const offset =
                    getPurlinOffset(
                        roofType,
                        purlin.plane,
                        BEAM.purlin
                    );

                const beam =
                    createBeam(
                        purlin.plane,
                        material,
                        BEAM.purlin,
                        offset
                    );

                if (beam) {
                    root.add(
                        beam
                    );
                }
            }
        }
    }

    /*
     * END WALL COLUMNS
     *
     * Unchanged.
     */

    if (
        vis.endWallColumns !== false &&
        context.structuralGeometry
            .endWallColumns
    ) {
        for (
            const column
            of context.structuralGeometry
                .endWallColumns
        ) {
            const left =
                createBeam(
                    column.left,
                    material,
                    BEAM.endColumn
                );

            const right =
                createBeam(
                    column.right,
                    material,
                    BEAM.endColumn
                );

            if (left) {
                root.add(
                    left
                );
            }

            if (right) {
                root.add(
                    right
                );
            }
        }
    }

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
            if (!child.isMesh) {
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

export const StructuralOrchestrator =
    Object.freeze({
        id: 'structural',

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