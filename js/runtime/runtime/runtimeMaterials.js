import {
    THREE
} from './runtimeImports.js';

import {
    getPanelNormalMapForUse
} from '../../panels/PanelProfiles.js';

function normalizeColor(
    value,
    fallback
) {
    if (
        value instanceof THREE.Color
    ) {
        return value.clone();
    }

    if (
        typeof value === 'number' &&
        Number.isFinite(value)
    ) {
        return new THREE.Color(
            value
        );
    }

    if (
        typeof value === 'string'
    ) {
        const normalized =
            value.trim();

        if (
            normalized !== ''
        ) {
            try {
                return new THREE.Color(
                    normalized
                );
            } catch {}
        }
    }

    return new THREE.Color(
        fallback
    );
}

function createPanelMaterial(
    color,
    normalMap = null
) {
    const material =
        new THREE.MeshStandardMaterial({
            color,
            metalness: 0.42,
            roughness: 0.42,
            envMapIntensity: 1.05,
            side: THREE.DoubleSide
        });

    if (normalMap) {
        material.normalMap =
            normalMap;

        material.normalScale =
            new THREE.Vector2(
                0.5,
                0.5
            );
    }

    material.needsUpdate =
        true;

    return material;
}

function createMetalMaterial(
    color,
    metalness,
    roughness
) {
    return new THREE.MeshStandardMaterial({
        color,
        metalness,
        roughness,
        side: THREE.DoubleSide
    });
}

export function createMaterialSystem(
    model
) {
    const colors =
        model?.colors || {};

    const profileId =
        model?.roof?.profile ||
        'awr';

    const dimensions =
        model?.dimensions || {};

    const panelLength =
        Math.max(
            1,
            dimensions.length || 10
        );

    const panelWidth =
        Math.max(
            1,
            dimensions.width || 10
        );

    const wallNormalMap =
        getPanelNormalMapForUse(
            'awr',
            'wall',
            panelLength,
            panelWidth
        );

    const wainscotNormalMap =
        getPanelNormalMapForUse(
            'awr',
            'wainscot',
            panelLength,
            panelWidth
        );

    const roofNormalMap =
        getPanelNormalMapForUse(
            profileId,
            'roof',
            panelLength * 0.8,
            panelWidth * 1.5
        );

    const materials =
        new Map();

    materials.set(
        'wallMetal',
        createPanelMaterial(
            normalizeColor(
                colors.wall,
                0xffffff
            ),
            wallNormalMap
        )
    );

    materials.set(
        'wall',
        createPanelMaterial(
            normalizeColor(
                colors.wall,
                0xffffff
            ),
            wallNormalMap
        )
    );

    materials.set(
        'wainscotMetal',
        createPanelMaterial(
            normalizeColor(
                colors.wainscot,
                0xffffff
            ),
            wainscotNormalMap
        )
    );

    materials.set(
        'roofMetal',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.roof,
                0xffffff
            ),
            metalness: 0.55,
            roughness: 0.34,
            envMapIntensity: 1.15,
            normalMap: roofNormalMap,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'structuralSteel',
        createMetalMaterial(
            normalizeColor(
                colors.steel ??
                colors.frame,
                0xffffff
            ),
            0.65,
            0.45
        )
    );

    materials.set(
        'steel',
        createMetalMaterial(
            normalizeColor(
                colors.steel ??
                colors.frame,
                0xffffff
            ),
            0.65,
            0.45
        )
    );

    materials.set(
        'concrete',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.concrete,
                0xb8b8b8
            ),
            metalness: 0.1,
            roughness: 0.9,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'trimMetal',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.trim,
                0xffffff
            ),
            metalness: 0.65,
            roughness: 0.28,
            envMapIntensity: 1.2,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'eaveTrim',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.eaveTrim ??
                colors.trim,
                0xffffff
            ),
            metalness: 0.65,
            roughness: 0.28,
            envMapIntensity: 1.2,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'doorTrim',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.trim,
                0xffffff
            ),
            metalness: 0.65,
            roughness: 0.28,
            envMapIntensity: 1.2,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'doorFrame',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.trim,
                0xffffff
            ),
            metalness: 0.65,
            roughness: 0.28,
            envMapIntensity: 1.2,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'frame',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.frame ??
                colors.steel,
                0xffffff
            ),
            metalness: 0.55,
            roughness: 0.5,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'doorPanel',
        createPanelMaterial(
            normalizeColor(
                colors.doorPanel ??
                colors.wall,
                0xffffff
            )
        )
    );

    materials.set(
        'glass',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.glass,
                0x9fc5e8
            ),
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            metalness: 0,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'mezzanine',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.mezzanine,
                0xffffff
            ),
            metalness: 0.4,
            roughness: 0.6,
            side: THREE.DoubleSide
        })
    );

    materials.set(
        'interiorWall',
        new THREE.MeshStandardMaterial({
            color: normalizeColor(
                colors.interiorWall ??
                colors.wall,
                0xffffff
            ),
            metalness: 0.1,
            roughness: 0.8,
            side: THREE.DoubleSide
        })
    );

    function applyColors(
        nextColors = {}
    ) {
        const wall =
            normalizeColor(
                nextColors.wall,
                0xffffff
            );

        const roof =
            normalizeColor(
                nextColors.roof,
                0xffffff
            );

        const trim =
            normalizeColor(
                nextColors.trim,
                0xffffff
            );

        const eaveTrim =
            normalizeColor(
                nextColors.eaveTrim ??
                nextColors.trim,
                0xffffff
            );

        const frame =
            normalizeColor(
                nextColors.frame ??
                nextColors.steel,
                0xffffff
            );

        const steel =
            normalizeColor(
                nextColors.steel ??
                nextColors.frame,
                0xffffff
            );

        const concrete =
            normalizeColor(
                nextColors.concrete,
                0xb8b8b8
            );

        const glass =
            normalizeColor(
                nextColors.glass,
                0x9fc5e8
            );

        const mezzanine =
            normalizeColor(
                nextColors.mezzanine,
                0xffffff
            );

        const interiorWall =
            normalizeColor(
                nextColors.interiorWall ??
                nextColors.wall,
                0xffffff
            );

        const wainscot =
            normalizeColor(
                nextColors.wainscot,
                0xffffff
            );

        const doorPanel =
            normalizeColor(
                nextColors.doorPanel ??
                nextColors.wall,
                0xffffff
            );

        materials.get(
            'wallMetal'
        ).color.copy(
            wall
        );

        materials.get(
            'wall'
        ).color.copy(
            wall
        );

        materials.get(
            'wainscotMetal'
        ).color.copy(
            wainscot
        );

        materials.get(
            'roofMetal'
        ).color.copy(
            roof
        );

        materials.get(
            'trimMetal'
        ).color.copy(
            trim
        );

        materials.get(
            'doorTrim'
        ).color.copy(
            trim
        );

        materials.get(
            'doorFrame'
        ).color.copy(
            trim
        );

        materials.get(
            'eaveTrim'
        ).color.copy(
            eaveTrim
        );

        materials.get(
            'frame'
        ).color.copy(
            frame
        );

        materials.get(
            'structuralSteel'
        ).color.copy(
            steel
        );

        materials.get(
            'steel'
        ).color.copy(
            steel
        );

        materials.get(
            'concrete'
        ).color.copy(
            concrete
        );

        materials.get(
            'glass'
        ).color.copy(
            glass
        );

        materials.get(
            'mezzanine'
        ).color.copy(
            mezzanine
        );

        materials.get(
            'interiorWall'
        ).color.copy(
            interiorWall
        );

        materials.get(
            'doorPanel'
        ).color.copy(
            doorPanel
        );

        for (
            const material
            of materials.values()
        ) {
            material.needsUpdate =
                true;
        }
    }

    applyColors(
        colors
    );

    return Object.freeze({
        get(name) {
            return (
                materials.get(name) ??
                materials.get('steel')
            );
        },

        applyColors,

        dispose() {
            for (
                const material
                of materials.values()
            ) {
                material.dispose();
            }

            materials.clear();
        }
    });
}