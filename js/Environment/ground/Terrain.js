import * as THREE from 'three';

const DEFAULT_SIZE = 800;
const DEFAULT_SEGMENTS = 192;
const DEFAULT_MAX_HEIGHT = 4.5;
const DEFAULT_SEED = 937.137;

function fract(value) {
    return value - Math.floor(value);
}

function smoothstep(edge0, edge1, value) {
    const t = Math.min(
        1,
        Math.max(
            0,
            (value - edge0) /
                Math.max(0.000001, edge1 - edge0)
        )
    );

    return t * t * (3 - 2 * t);
}

function hash2D(x, z, seed) {
    return fract(
        Math.sin(
            x * 127.1 +
            z * 311.7 +
            seed
        ) * 43758.5453123
    );
}

function valueNoise(x, z, seed) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);

    const fx = x - ix;
    const fz = z - iz;

    const a = hash2D(ix, iz, seed);
    const b = hash2D(ix + 1, iz, seed);
    const c = hash2D(ix, iz + 1, seed);
    const d = hash2D(ix + 1, iz + 1, seed);

    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);

    return (
        THREE.MathUtils.lerp(
            THREE.MathUtils.lerp(a, b, ux),
            THREE.MathUtils.lerp(c, d, ux),
            uz
        ) * 2
    ) - 1;
}

function terrainNoise(x, z, seed) {
    const lowFrequency =
        valueNoise(
            x * 0.008,
            z * 0.008,
            seed
        ) * 0.68;

    const mediumFrequency =
        valueNoise(
            x * 0.019 + 47.13,
            z * 0.019 - 31.71,
            seed
        ) * 0.24;

    const detail =
        valueNoise(
            x * 0.052 - 113.2,
            z * 0.052 + 79.6,
            seed
        ) * 0.08;

    return (
        lowFrequency +
        mediumFrequency +
        detail
    );
}

export function createTerrain(config = {}) {
    const size =
        Number(config.size) || DEFAULT_SIZE;

    const segments =
        Number(config.segments) || DEFAULT_SEGMENTS;

    const maxHeight =
        Number(config.maxHeight) ||
        DEFAULT_MAX_HEIGHT;

    const seed =
        Number(config.seed) ||
        DEFAULT_SEED;

    let flatHalfWidth = 45;
    let flatHalfDepth = 45;
    let transition = 70;

    const geometry =
        new THREE.PlaneGeometry(
            size,
            size,
            segments,
            segments
        );

    geometry.rotateX(-Math.PI / 2);

    function getMask(x, z) {
        const dx = Math.max(
            Math.abs(x) - flatHalfWidth,
            0
        );

        const dz = Math.max(
            Math.abs(z) - flatHalfDepth,
            0
        );

        const distance = Math.sqrt(
            dx * dx +
            dz * dz
        );

        return smoothstep(
            0,
            transition,
            distance
        );
    }

    function rebuild() {
        const position =
            geometry.attributes.position;

        for (
            let i = 0;
            i < position.count;
            i++
        ) {
            const x = position.getX(i);
            const z = position.getZ(i);

            const mask = getMask(x, z);

            const height =
                terrainNoise(
                    x,
                    z,
                    seed
                ) *
                maxHeight *
                mask;

            position.setY(
                i,
                height
            );
        }

        position.needsUpdate = true;

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
    }

    function updateBounds(buildingBounds) {
        if (!buildingBounds) {
            return;
        }

        let width = 0;
        let depth = 0;

        if (
            buildingBounds.min &&
            buildingBounds.max
        ) {
            width = Math.abs(
                buildingBounds.max.x -
                buildingBounds.min.x
            );

            depth = Math.abs(
                buildingBounds.max.z -
                buildingBounds.min.z
            );
        } else {
            const boundsSize =
                buildingBounds.size ||
                buildingBounds.dimensions;

            if (boundsSize) {
                width = Number(
                    boundsSize.x ??
                    boundsSize.width ??
                    0
                );

                depth = Number(
                    boundsSize.z ??
                    boundsSize.depth ??
                    0
                );
            }
        }

        flatHalfWidth = Math.max(
            45,
            width * 0.5 + 12
        );

        flatHalfDepth = Math.max(
            45,
            depth * 0.5 + 12
        );

        transition = Math.max(
            60,
            Math.max(
                width,
                depth
            ) * 0.75
        );

        rebuild();
    }

    function dispose() {
        geometry.dispose();
    }

    rebuild();

    return Object.freeze({
        geometry,
        rebuild,
        updateBounds,
        dispose
    });
}