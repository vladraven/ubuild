import * as THREE from 'three';

export const SKY_VERTEX_SHADER = `
varying vec3 vWorldDirection;

void main() {
    vec4 worldPosition =
        modelMatrix * vec4(
            position,
            1.0
        );

    vWorldDirection =
        normalize(
            worldPosition.xyz -
            cameraPosition
        );

    gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(
            position,
            1.0
        );
}
`;

export const SKY_FRAGMENT_SHADER = `
uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform float uCloudCover;
uniform float uCloudOpacity;
uniform float uHaze;
uniform float uSunIntensity;
uniform float uExposure;
uniform float uTime;

varying vec3 vWorldDirection;

float hash(vec2 p) {
    return fract(
        sin(
            dot(
                p,
                vec2(
                    127.1,
                    311.7
                )
            )
        ) *
        43758.5453123
    );
}

float noise(vec2 p) {
    vec2 i =
        floor(p);

    vec2 f =
        fract(p);

    f =
        f * f *
        (
            3.0 -
            2.0 * f
        );

    float a =
        hash(i);

    float b =
        hash(
            i +
            vec2(
                1.0,
                0.0
            )
        );

    float c =
        hash(
            i +
            vec2(
                0.0,
                1.0
            )
        );

    float d =
        hash(
            i +
            vec2(
                1.0,
                1.0
            )
        );

    return mix(
        mix(
            a,
            b,
            f.x
        ),
        mix(
            c,
            d,
            f.x
        ),
        f.y
    );
}

float fbm(vec2 p) {
    float value =
        0.0;

    float amplitude =
        0.5;

    for (
        int i = 0;
        i < 4;
        i++
    ) {
        value +=
            amplitude *
            noise(p);

        p *=
            2.03;

        amplitude *=
            0.5;
    }

    return value;
}

void main() {
    vec3 direction =
        normalize(
            vWorldDirection
        );

    float height =
        clamp(
            direction.y *
            0.5 +
            0.5,
            0.0,
            1.0
        );

    float horizonMix =
        smoothstep(
            0.0,
            0.58,
            height
        );

    vec3 skyColor =
        mix(
            uHorizonColor,
            uZenithColor,
            horizonMix
        );

    float haze =
        pow(
            1.0 -
            height,
            2.5
        ) *
        uHaze;

    skyColor =
        mix(
            skyColor,
            uHorizonColor,
            clamp(
                haze,
                0.0,
                1.0
            )
        );

    vec2 cloudUV =
        direction.xz /
        max(
            0.15,
            direction.y +
            0.22
        );

    cloudUV *=
        1.15;

    cloudUV.x +=
        uTime *
        0.0015;

    float cloudNoise =
        fbm(
            cloudUV
        );

    float threshold =
        1.0 -
        uCloudCover;

    float cloud =
        smoothstep(
            threshold -
            0.12,
            threshold +
            0.12,
            cloudNoise
        );

    cloud *=
        smoothstep(
            -0.03,
            0.22,
            direction.y
        );

    vec3 cloudColor =
        mix(
            uHorizonColor,
            vec3(
                1.0
            ),
            0.55
        );

    cloudColor *=
        0.75 +
        uSunIntensity *
        0.25;

    skyColor =
        mix(
            skyColor,
            cloudColor,
            cloud *
            uCloudOpacity
        );

    skyColor *=
        uExposure;

    gl_FragColor =
        vec4(
            skyColor,
            1.0
        );
}
`;

export function createSkyMaterial(
    config = {}
) {
    return new THREE.ShaderMaterial({
        side:
            THREE.BackSide,

        depthWrite:
            false,

        uniforms: {
            uZenithColor: {
                value:
                    new THREE.Color(
                        config.zenithColor ||
                        0x3a8fd0
                    )
            },

            uHorizonColor: {
                value:
                    new THREE.Color(
                        config.horizonColor ||
                        0x87ceeb
                    )
            },

            uCloudCover: {
                value:
                    Number(
                        config.cloudCover
                    ) || 0.75
            },

            uCloudOpacity: {
                value:
                    Number(
                        config.cloudOpacity
                    ) || 0.95
            },

            uHaze: {
                value:
                    Number(
                        config.haze
                    ) || 0.0
            },

            uSunIntensity: {
                value:
                    Number(
                        config.sunIntensity
                    ) || 1.0
            },

            uExposure: {
                value:
                    Math.max(
                        0,
                        Number(
                            config.exposure
                        ) || 1
                    )
            },

            uTime: {
                value:
                    0
            }
        },

        vertexShader:
            SKY_VERTEX_SHADER,

        fragmentShader:
            SKY_FRAGMENT_SHADER
    });
}