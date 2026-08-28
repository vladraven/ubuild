import * as THREE from 'three';

export function multiplyColor(hex, multiplier) {
    const color = new THREE.Color(hex);

    color.r = Math.min(
        1,
        Math.max(0, color.r * multiplier[0])
    );

    color.g = Math.min(
        1,
        Math.max(0, color.g * multiplier[1])
    );

    color.b = Math.min(
        1,
        Math.max(0, color.b * multiplier[2])
    );

    return color;
}

export function desaturateColor(color, amount) {
    const result = color.clone();

    const luminance =
        result.r * 0.299 +
        result.g * 0.587 +
        result.b * 0.114;

    result.r +=
        (luminance - result.r) * amount;

    result.g +=
        (luminance - result.g) * amount;

    result.b +=
        (luminance - result.b) * amount;

    return result;
}