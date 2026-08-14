import * as THREE from 'three';

export let isMetric = false;
export const getU = () => isMetric ? 'm' : 'ft';

export const openingDefs = {
    "Window": { w: 1.0, h: 1.0, yOff: 1.0 },
    "Walk Door Solid": { w: 1.0, h: 2.1, yOff: 0 },
    "Walk Door Solid Double": { w: 2.0, h: 2.1, yOff: 0 },
    "Overhead Panel Door": { w: 3.0, h: 3.0, yOff: 0 },
    "Bi-Fold Door": { w: 4.0, h: 3.0, yOff: 0 },
    "Hydraulic Door": { w: 4.0, h: 3.0, yOff: 0 }
};

// Исправлено: Массивы проемов теперь абсолютно пустые при первой загрузке
export const openingsData = {
    F: [],
    B: [],
    L: [],
    R: []
};

// Сброшено в 0, так как дефолтных проемов нет
export let openingIdCounter = 0;

export const ltState = {
    L: { active: false, drop: 0, depth: 3, pitch: 1, cutL: 0, cutR: 0, wallF: false, wallL: false, wallR: false },
    R: { active: false, drop: 0, depth: 3, pitch: 1, cutL: 0, cutR: 0, wallF: false, wallL: false, wallR: false },
    F: { active: false, drop: 0, depth: 3, pitch: 1, cutL: 0, cutR: 0, wallF: false, wallL: false, wallR: false },
    B: { active: false, drop: 0, depth: 3, pitch: 1, cutL: 0, cutR: 0, wallF: false, wallL: false, wallR: false }
};

export const userLocation = { lat: null, lon: null };

export const hitboxes = [];
export const dragPlanesMap = {};

// Массив для отслеживания загруженных внешних моделей, которые можно перемещать
export const referenceModels = [];

export let appData = {};

export function initState(data) {
    appData = data;
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation.lat = position.coords.latitude;
                userLocation.lon = position.coords.longitude;
            },
            (error) => {
                console.warn("Geolocation Error:", error.message);
            }
        );
    }
}

export function setMetric(value) {
    isMetric = value;
}

export function incrementOpeningId() {
    return openingIdCounter++;
}

export function setOpeningIdCounter(val) {
    openingIdCounter = val;
}

export function resetBuildingState() {
    hitboxes.length = 0;
    referenceModels.length = 0;
    for (const key in dragPlanesMap) {
        delete dragPlanesMap[key];
    }
}

export const placedModels = [];