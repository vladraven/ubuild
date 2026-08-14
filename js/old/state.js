import * as THREE from 'three';

// --- Инициализация базового состояния ---
export let isMetric = false;

export const openingDefs = {
    "Window": { w: 1.0, h: 1.0, yOff: 1.0 },
    "Walk Door Solid": { w: 1.0, h: 2.1, yOff: 0 },
    "Walk Door Solid Double": { w: 2.0, h: 2.1, yOff: 0 },
    "Overhead Panel Door": { w: 3.0, h: 3.0, yOff: 0 },
    "Bi-Fold Door": { w: 4.0, h: 3.0, yOff: 0 },
    "Hydraulic Door": { w: 4.0, h: 3.0, yOff: 0 }
};

export const openingsData = {
    F: [],
    B: [],
    L: [],
    R: []
};

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
export const referenceModels = [];
export const placedModels = [];

export let appData = {};

// --- Вспомогательные методы слоя состояния ---

/**
 * Возвращает строковое представление текущей единицы измерения.
 */
export const getU = () => (isMetric ? 'm' : 'ft');

/**
 * Инициализирует метаданные приложения и запускает определение геолокации.
 */
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

/**
 * Устанавливает системную метрику (метрическая / имперская).
 */
export function setMetric(value) {
    isMetric = value;
}

/**
 * Инкрементирует и возвращает уникальный идентификатор для нового проема.
 */
export function incrementOpeningId() {
    return openingIdCounter++;
}

/**
 * Принудительно устанавливает счетчик идентификаторов проемов.
 */
export function setOpeningIdCounter(val) {
    openingIdCounter = val;
}

/**
 * Очищает временные массивы трехмерных объектов и хитбоксов сцены при перестроении.
 */
export function resetBuildingState() {
    hitboxes.length = 0;
    referenceModels.length = 0;
    for (const key in dragPlanesMap) {
        delete dragPlanesMap[key];
    }
}

// --- Контракт сериализации (ADR-004 / 01_ENGINE_SPECIFICATION) ---

/**
 * Сериализует текущее состояние конфигуратора в JSON DTO.
 */
export function dehydrate() {
    return JSON.stringify({
        schemaVersion: "1.0.0", // Семантическое версионирование схемы данных
        isMetric,
        openingIdCounter,
        openingsData,
        ltState,
        placedModels,
        userLocation
    });
}

/**
 * Восстанавливает состояние конфигуратора из JSON DTO.
 */
export function hydrate(jsonString) {
    try {
        const payload = JSON.parse(jsonString);
        if (!payload) return false;

        if (payload.isMetric !== undefined) isMetric = payload.isMetric;
        if (payload.openingIdCounter !== undefined) openingIdCounter = payload.openingIdCounter;

        if (payload.openingsData) {
            Object.keys(openingsData).forEach(side => {
                openingsData[side] = Array.isArray(payload.openingsData[side]) 
                    ? [...payload.openingsData[side]] 
                    : [];
            });
        }

        if (payload.ltState) {
            Object.keys(ltState).forEach(side => {
                if (payload.ltState[side]) {
                    Object.assign(ltState[side], payload.ltState[side]);
                }
            });
        }

        if (payload.placedModels) {
            placedModels.length = 0;
            placedModels.push(...payload.placedModels);
        }

        if (payload.userLocation) {
            Object.assign(userLocation, payload.userLocation);
        }

        return true;
    } catch (e) {
        console.error("Hydration failed: invalid state schema", e);
        return false;
    }
}