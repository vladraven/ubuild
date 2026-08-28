export const WEATHER_MOD = Object.freeze({
    clear: Object.freeze({
        fogDensity: 0.00045,
        skyDesaturate: 0.0,
        skyDarken: 0.0,
        cloudCover: 0.75,
        cloudOpacity: 0.95,
        turbidityBoost: 0.0,
        lightMul: 1.0
    }),

    cloudy: Object.freeze({
        fogDensity: 0.0014,
        skyDesaturate: 0.28,
        skyDarken: 0.1,
        cloudCover: 0.88,
        cloudOpacity: 0.96,
        turbidityBoost: 4.0,
        lightMul: 0.75
    }),

    rain: Object.freeze({
        fogDensity: 0.0038,
        skyDesaturate: 0.5,
        skyDarken: 0.3,
        cloudCover: 0.95,
        cloudOpacity: 0.98,
        turbidityBoost: 8.0,
        lightMul: 0.5
    }),

    snow: Object.freeze({
        fogDensity: 0.003,
        skyDesaturate: 0.32,
        skyDarken: 0.16,
        cloudCover: 0.85,
        cloudOpacity: 0.94,
        turbidityBoost: 5.0,
        lightMul: 0.65
    }),

    fog: Object.freeze({
        fogDensity: 0.01,
        skyDesaturate: 0.5,
        skyDarken: 0.2,
        cloudCover: 0.98,
        cloudOpacity: 0.75,
        turbidityBoost: 12.0,
        lightMul: 0.4
    })
});