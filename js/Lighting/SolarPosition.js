// js/lighting/SolarPosition.js

const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

function parseTimeMinutes(timeString) {
    if (typeof timeString !== 'string' || !timeString.includes(':')) {
        return 720;
    }
    const parts = timeString.split(':');
    const hours = Number(parts[0]) || 0;
    const minutes = Number(parts[1]) || 0;
    const seconds = Number(parts[2]) || 0;
    return hours * 60 + minutes + seconds / 60;
}

function getDayOfYear(year, month, day) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysBeforeMonth = [
        0, 31, isLeap ? 60 : 59, isLeap ? 91 : 90, isLeap ? 121 : 120,
        isLeap ? 152 : 151, isLeap ? 182 : 181, isLeap ? 213 : 212,
        isLeap ? 244 : 243, isLeap ? 274 : 273, isLeap ? 305 : 304,
        isLeap ? 335 : 334
    ];
    return daysBeforeMonth[month - 1] + day;
}

function getTimezoneOffsetHours(timezone, year, month, day) {
    if (typeof timezone === 'number') {
        return timezone;
    }
    try {
        const dateSample = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: typeof timezone === 'string' && timezone.trim() ? timezone : 'America/Winnipeg',
            timeZoneName: 'shortOffset',
            hour12: false
        });
        const parts = formatter.formatToParts(dateSample);
        const tzPart = parts.find(p => p.type === 'timeZoneName')?.value;
        if (tzPart) {
            const match = tzPart.match(/GMT([+-]?\d+)(?::(\d+))?/);
            if (match) {
                const h = parseInt(match[1], 10);
                const m = match[2] ? parseInt(match[2], 10) / 60 : 0;
                return h >= 0 ? h + m : h - m;
            }
        }
    } catch {
        // fallback
    }
    return -5.0; // CDT по умолчанию
}

export function getSolarState(input) {
    if (!input || typeof input !== 'object') {
        throw new TypeError('LightingInput must be an object');
    }

    const dateStr = typeof input.date === 'string' ? input.date : '2026-06-21';
    const timeStr = typeof input.time === 'string' ? input.time : '12:00';
    const latitude = Number.isFinite(input.latitude) ? input.latitude : 49.8951;
    const longitude = Number.isFinite(input.longitude) ? input.longitude : -97.1384;

    const dateParts = dateStr.split('-').map(Number);
    const year = dateParts[0] || 2026;
    const month = dateParts[1] || 6;
    const day = dateParts[2] || 21;

    const totalMinutes = parseTimeMinutes(timeStr);
    const hourDecimal = totalMinutes / 60.0;
    const dayOfYear = getDayOfYear(year, month, day);

    // Дробный год в радианах (gamma)
    const gamma = (2 * Math.PI / 365.0) * (dayOfYear - 1 + (hourDecimal - 12.0) / 24.0);

    // Уравнение времени в минутах (Equation of Time)
    const eqTime = 229.18 * (
        0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma)
    );

    // Склонение солнца (Solar Declination) в радианах
    const declination = 0.006918 -
        0.399912 * Math.cos(gamma) +
        0.070257 * Math.sin(gamma) -
        0.006758 * Math.cos(2 * gamma) +
        0.000907 * Math.sin(2 * gamma) -
        0.002697 * Math.cos(3 * gamma) +
        0.00148 * Math.sin(3 * gamma);

    const tzOffsetHours = getTimezoneOffsetHours(input.timezone, year, month, day);
    const timeOffset = eqTime + 4.0 * longitude - 60.0 * tzOffsetHours;
    const trueSolarTime = totalMinutes + timeOffset;

    // Часовой угол в градусах и радианах
    const hourAngleDeg = (trueSolarTime / 4.0) - 180.0;
    const hourAngleRad = hourAngleDeg * DEG_TO_RAD;
    const latRad = latitude * DEG_TO_RAD;

    // Зенитный угол
    let cosZenith = Math.sin(latRad) * Math.sin(declination) +
                    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngleRad);
    cosZenith = Math.max(-1.0, Math.min(1.0, cosZenith));
    const zenithRad = Math.acos(cosZenith);
    const elevation = 90.0 - (zenithRad * RAD_TO_DEG);

    // Солнечный азимут (по часовой стрелке от Севера: N=0, E=90, S=180, W=270)
    let azimuth;
    const sinZenith = Math.sin(zenithRad);
    if (sinZenith > 0.0001) {
        let cosAzimuth = (Math.sin(declination) - Math.sin(latRad) * cosZenith) / (Math.cos(latRad) * sinZenith);
        cosAzimuth = Math.max(-1.0, Math.min(1.0, cosAzimuth));
        const azimuthRad = Math.acos(cosAzimuth);
        if (hourAngleDeg > 0) {
            azimuth = 360.0 - (azimuthRad * RAD_TO_DEG);
        } else {
            azimuth = azimuthRad * RAD_TO_DEG;
        }
    } else {
        azimuth = 180.0;
    }

    // Расчет восхода и заката для определения фазы
    const cosHourAngleSunrise = (Math.cos(90.833 * DEG_TO_RAD) - (Math.sin(latRad) * Math.sin(declination))) /
                                (Math.cos(latRad) * Math.cos(declination));

    let sunriseMinutes = 360;
    let sunsetMinutes = 1080;

    if (cosHourAngleSunrise >= -1.0 && cosHourAngleSunrise <= 1.0) {
        const haSunriseDeg = Math.acos(cosHourAngleSunrise) * RAD_TO_DEG;
        sunriseMinutes = 720 - 4.0 * (longitude + haSunriseDeg) - eqTime + 60.0 * tzOffsetHours;
        sunsetMinutes = 720 - 4.0 * (longitude - haSunriseDeg) - eqTime + 60.0 * tzOffsetHours;
    }

    let phase = 'day';
    if (elevation < -0.833) {
        phase = 'night';
    } else if (Math.abs(totalMinutes - sunriseMinutes) <= 45) {
        phase = 'sunrise';
    } else if (Math.abs(totalMinutes - sunsetMinutes) <= 45) {
        phase = 'sunset';
    }

    return Object.freeze({
        azimuth,
        elevation,
        phase,
        sunrise: `${String(Math.floor(sunriseMinutes / 60)).padStart(2, '0')}:${String(Math.floor(sunriseMinutes % 60)).padStart(2, '0')}`,
        sunset: `${String(Math.floor(sunsetMinutes / 60)).padStart(2, '0')}:${String(Math.floor(sunsetMinutes % 60)).padStart(2, '0')}`
    });
}