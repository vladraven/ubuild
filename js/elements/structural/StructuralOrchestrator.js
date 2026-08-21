import * as THREE from 'three';

const BEAM = Object.freeze({
    frame: 0.16,
    girt: 0.07,
    purlin: 0.07,
    endColumn: 0.12
});

const STRUCTURAL_INSET = 0.08;
const ROOF_BEAM_CLEARANCE = 0.015;

function isFiniteVector(
    vector
) {
    return (
        vector &&
        Number.isFinite(vector.x) &&
        Number.isFinite(vector.y) &&
        Number.isFinite(vector.z)
    );
}

function assertContext(
    context
) {
    if (
        !context ||
        typeof context !== 'object'
    ) {
        throw new TypeError(
            'Element context is required'
        );
    }

    if (
        !context.structuralGeometry
    ) {
        throw new TypeError(
            'Structural geometry is required'
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

function resolveMaterial(
    context
) {
    if (
        typeof context.materials.get ===
        'function'
    ) {
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
            Number(lineSeg.start.x),
            Number(lineSeg.start.y),
            Number(lineSeg.start.z)
        );

    const end =
        new THREE.Vector3(
            Number(lineSeg.end.x),
            Number(lineSeg.end.y),
            Number(lineSeg.end.z)
        );

    if (
        !isFiniteVector(start) ||
        !isFiniteVector(end)
    ) {
        return null;
    }

    if (
        offset &&
        isFiniteVector(offset)
    ) {
        start.add(
            offset
        );

        end.add(
            offset
        );
    }

    const direction =
        end.clone().sub(
            start
        );

    const length =
        direction.length();

    if (
        !Number.isFinite(length) ||
        length <= 0.001
    ) {
        return null;
    }

    direction.normalize();

    if (
        !isFiniteVector(direction)
    ) {
        return null;
    }

    const safeThickness =
        Number(thickness);

    if (
        !Number.isFinite(
            safeThickness
        ) ||
        safeThickness <= 0
    ) {
        return null;
    }

    const geometry =
        new THREE.BoxGeometry(
            safeThickness,
            safeThickness,
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

function getRoofInteriorNormal(
    lineSeg
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
            Number(lineSeg.start.x),
            Number(lineSeg.start.y),
            Number(lineSeg.start.z)
        );

    const end =
        new THREE.Vector3(
            Number(lineSeg.end.x),
            Number(lineSeg.end.y),
            Number(lineSeg.end.z)
        );

    if (
        !isFiniteVector(start) ||
        !isFiniteVector(end)
    ) {
        return null;
    }

    const direction =
        end.clone().sub(
            start
        );

    const length =
        direction.length();

    if (
        !Number.isFinite(length) ||
        length <= 0.001
    ) {
        return null;
    }

    direction.normalize();

    /*
     * Roof beams run in X/Y.
     * Building longitudinal axis is Z.
     *
     * Cross product gives a normal to
     * the roof plane.
     */

    const longitudinal =
        new THREE.Vector3(
            0,
            0,
            1
        );

    let normal =
        new THREE.Vector3()
            .crossVectors(
                longitudinal,
                direction
            );

    const normalLength =
        normal.length();

    if (
        !Number.isFinite(
            normalLength
        ) ||
        normalLength <= 0.000001
    ) {
        /*
         * This can only happen for a beam
         * parallel to the building length.
         *
         * Such a beam is horizontal rather
         * than a sloped rafter. Use vertical
         * inward direction instead.
         */

        normal.set(
            0,
            -1,
            0
        );

        return normal;
    }

    normal.normalize();

    if (
        normal.y > 0
    ) {
        normal.negate();
    }

    if (
        !isFiniteVector(normal)
    ) {
        return null;
    }

    return normal;
}

function createRoofBeam(
    lineSeg,
    material,
    thickness
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
            Number(lineSeg.start.x),
            Number(lineSeg.start.y),
            Number(lineSeg.start.z)
        );

    const end =
        new THREE.Vector3(
            Number(lineSeg.end.x),
            Number(lineSeg.end.y),
            Number(lineSeg.end.z)
        );

    if (
        !isFiniteVector(start) ||
        !isFiniteVector(end)
    ) {
        return null;
    }

    const direction =
        end.clone().sub(
            start
        );

    const length =
        direction.length();

    if (
        !Number.isFinite(length) ||
        length <= 0.001
    ) {
        return null;
    }

    direction.normalize();

    const normal =
        getRoofInteriorNormal(
            lineSeg
        );

    if (
        !normal
    ) {
        return null;
    }

    const safeThickness =
        Number(thickness);

    if (
        !Number.isFinite(
            safeThickness
        ) ||
        safeThickness <= 0
    ) {
        return null;
    }

    /*
     * Move the complete beam inward so
     * that its exterior face is below
     * the roof plane.
     */

    const inward =
        normal
            .clone()
            .multiplyScalar(
                safeThickness / 2 +
                ROOF_BEAM_CLEARANCE
            );

    if (
        !isFiniteVector(inward)
    ) {
        return null;
    }

    start.add(
        inward
    );

    end.add(
        inward
    );

    if (
        !isFiniteVector(start) ||
        !isFiniteVector(end)
    ) {
        return null;
    }

    /*
     * Standard BoxGeometry.
     *
     * Z axis follows the beam.
     *
     * We deliberately do not construct
     * a custom matrix here. This avoids
     * degenerate Matrix4 bases and NaN
     * propagation.
     */

    const geometry =
        new THREE.BoxGeometry(
            safeThickness,
            safeThickness,
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

    if (
        !Number.isFinite(length) ||
        length <= 0.001
    ) {
        return null;
    }

    direction.normalize();

    if (
        roofType === 'gabled'
    ) {
        const dx =
            lineSeg.start.x -
            lineSeg.end.x;

        const dy =
            lineSeg.start.y -
            lineSeg.end.y;

        const roofSlope =
            Math.abs(dx) > 0.001
                ? dy / dx
                : 0;

        let normal =
            new THREE.Vector3(
                -roofSlope,
                1,
                0
            );

        if (
            normal.y > 0
        ) {
            normal.negate();
        }

        const normalLength =
            normal.length();

        if (
            !Number.isFinite(
                normalLength
            ) ||
            normalLength <= 0.000001
        ) {
            return new THREE.Vector3(
                0,
                -(
                    thickness / 2 +
                    ROOF_BEAM_CLEARANCE
                ),
                0
            );
        }

        normal.normalize();

        return normal.multiplyScalar(
            thickness / 2 +
            ROOF_BEAM_CLEARANCE
        );
    }

    return new THREE.Vector3(
        0,
        -(
            thickness / 2 +
            ROOF_BEAM_CLEARANCE
        ),
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
            Number.isFinite(
                dBottom
            ) &&
            dBottom > 0
                ? dBottom
                : 0.20,

        dTop:
            Number.isFinite(
                dTop
            ) &&
            dTop > 0
                ? dTop
                : 0.60,

        flangeWidth:
            Number.isFinite(
                flangeWidth
            ) &&
            flangeWidth > 0
                ? flangeWidth
                : 0.20,

        flangeThickness:
            Number.isFinite(
                flangeThickness
            ) &&
            flangeThickness > 0
                ? flangeThickness
                : 0.012,

        webThickness:
            Number.isFinite(
                webThickness
            ) &&
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
                depth:
                    webThickness,

                bevelEnabled:
                    false,

                curveSegments:
                    1,

                steps:
                    1
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

    mesh.position.set(
        sign *
            (
                flangeThickness /
                2
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

    const rawStart =
        new THREE.Vector3(
            lineSeg.start.x,
            lineSeg.start.y,
            lineSeg.start.z
        );

    const rawEnd =
        new THREE.Vector3(
            lineSeg.end.x,
            lineSeg.end.y,
            lineSeg.end.z
        );

    if (
        !isFiniteVector(rawStart) ||
        !isFiniteVector(rawEnd)
    ) {
        return null;
    }

    const start =
        rawStart.y <= rawEnd.y
            ? rawStart
            : rawEnd;

    const end =
        rawStart.y <= rawEnd.y
            ? rawEnd
            : rawStart;

    const height =
        end.y -
        start.y;

    if (
        !Number.isFinite(height) ||
        height <= 0.001
    ) {
        return null;
    }

    const sign =
        side === 'left'
            ? 1
            : -1;

    const shape =
        createColumnShape(
            sign,
            dimensions.dBottom,
            dimensions.dTop,
            height
        );

    const web =
        createColumnWeb(
            shape,
            material,
            dimensions.webThickness
        );

    const innerFlange =
        createColumnInnerFlange(
            sign,
            height,
            material,
            dimensions.flangeWidth,
            dimensions.flangeThickness
        );

    const outerFlange =
        createColumnOuterFlange(
            sign,
            dimensions.dBottom,
            dimensions.dTop,
            height,
            material,
            dimensions.flangeWidth,
            dimensions.flangeThickness
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

    group.position.copy(
        start
    );

    group.traverse(
        child => {
            if (
                !child.isMesh
            ) {
                return;
            }

            child.castShadow =
                true;

            child.receiveShadow =
                true;
        }
    );

    return group;
}

function moveLineZ(
    lineSeg,
    delta
) {
    if (
        !lineSeg ||
        !lineSeg.start ||
        !lineSeg.end
    ) {
        return null;
    }

    return {
        start: {
            x: lineSeg.start.x,
            y: lineSeg.start.y,
            z:
                lineSeg.start.z +
                delta
        },

        end: {
            x: lineSeg.end.x,
            y: lineSeg.end.y,
            z:
                lineSeg.end.z +
                delta
        }
    };
}

function createFrameGroup(
    frame,
    frameIndex,
    frameCount,
    material,
    columnDimensions
) {
    const group =
        new THREE.Group();

    group.name =
        `frame-${frame.index}`;

    let frameOffsetZ = 0;

    if (
        frameIndex === 0
    ) {
        frameOffsetZ =
            STRUCTURAL_INSET +
            columnDimensions.flangeWidth /
                2;
    } else if (
        frameIndex ===
        frameCount - 1
    ) {
        frameOffsetZ =
            -(
                STRUCTURAL_INSET +
                columnDimensions.flangeWidth /
                    2
            );
    }

    if (
        frame.leftColumn
    ) {
        const columnLine =
            frameOffsetZ !== 0
                ? moveLineZ(
                    frame.leftColumn,
                    frameOffsetZ
                )
                : frame.leftColumn;

        const column =
            createSolidColumn(
                columnLine,
                material,
                'left',
                columnDimensions
            );

        if (
            column
        ) {
            group.add(
                column
            );
        }
    }

    if (
        frame.leftRafter
    ) {
        const rafterLine =
            frameOffsetZ !== 0
                ? moveLineZ(
                    frame.leftRafter,
                    frameOffsetZ
                )
                : frame.leftRafter;

        const beam =
            createRoofBeam(
                rafterLine,
                material,
                BEAM.frame
            );

        if (
            beam
        ) {
            group.add(
                beam
            );
        }
    }

    if (
        frame.rightRafter
    ) {
        const rafterLine =
            frameOffsetZ !== 0
                ? moveLineZ(
                    frame.rightRafter,
                    frameOffsetZ
                )
                : frame.rightRafter;

        const beam =
            createRoofBeam(
                rafterLine,
                material,
                BEAM.frame
            );

        if (
            beam
        ) {
            group.add(
                beam
            );
        }
    }

    if (
        frame.rightColumn
    ) {
        const columnLine =
            frameOffsetZ !== 0
                ? moveLineZ(
                    frame.rightColumn,
                    frameOffsetZ
                )
                : frame.rightColumn;

        const column =
            createSolidColumn(
                columnLine,
                material,
                'right',
                columnDimensions
            );

        if (
            column
        ) {
            group.add(
                column
            );
        }
    }

    if (
        frame.rafter
    ) {
        const rafterLine =
            frameOffsetZ !== 0
                ? moveLineZ(
                    frame.rafter,
                    frameOffsetZ
                )
                : frame.rafter;

        const beam =
            createRoofBeam(
                rafterLine,
                material,
                BEAM.frame
            );

        if (
            beam
        ) {
            group.add(
                beam
            );
        }
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

    const visibility =
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

    const frames =
        context.structuralGeometry
            .frames ||
        [];

    if (
        visibility.frames !== false
    ) {
        for (
            let index = 0;
            index < frames.length;
            index++
        ) {
            const group =
                createFrameGroup(
                    frames[index],
                    index,
                    frames.length,
                    material,
                    columnDimensions
                );

            root.add(
                group
            );
        }
    }

    if (
        visibility.girts !== false &&
        context.structuralGeometry
            .girts
    ) {
        for (
            const girt
            of context.structuralGeometry
                .girts
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

                    if (
                        beam
                    ) {
                        root.add(
                            beam
                        );
                    }
                }
            }
        }
    }

    if (
        visibility.purlins !== false &&
        context.structuralGeometry
            .purlins
    ) {
        for (
            const purlin
            of context.structuralGeometry
                .purlins
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

                    if (
                        beam
                    ) {
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

                if (
                    beam
                ) {
                    root.add(
                        beam
                    );
                }
            }
        }
    }

    if (
        visibility.endWallColumns !== false &&
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

            if (
                left
            ) {
                root.add(
                    left
                );
            }

            if (
                right
            ) {
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
    if (
        !object
    ) {
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
        const child
        of children
    ) {
        object.remove(
            child
        );
    }

    object.removeFromParent();
}

export const StructuralOrchestrator =
    Object.freeze({
        id: 'structural',

        create(
            context
        ) {
            return createObject(
                context
            );
        },

        update(
            object,
            context
        ) {
            if (
                !object
            ) {
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

        dispose(
            object
        ) {
            disposeObject(
                object
            );
        }
    });