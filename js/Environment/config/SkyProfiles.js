export const PHASE_SKY = Object.freeze({
    night: Object.freeze({
        zenithMul: [0.04, 0.06, 0.12],
        horizonMul: [0.08, 0.10, 0.18],
        sunVisibility: 0.0,
        exposure: 0.35
    }),

    sunrise: Object.freeze({
        zenithMul: [0.55, 0.45, 0.55],
        horizonMul: [1.4, 0.75, 0.45],
        sunVisibility: 0.9,
        exposure: 0.85
    }),

    day: Object.freeze({
        zenithMul: [1.0, 1.0, 1.0],
        horizonMul: [1.0, 1.0, 1.0],
        sunVisibility: 1.0,
        exposure: 1.0
    }),

    sunset: Object.freeze({
        zenithMul: [0.50, 0.35, 0.45],
        horizonMul: [1.5, 0.55, 0.30],
        sunVisibility: 0.85,
        exposure: 0.8
    })
});