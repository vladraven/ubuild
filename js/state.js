import * as THREE from 'three';

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

export const getU = () => (isMetric ? 'm' : 'ft');

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
    openingIdCounter++;
    return `op_${Date.now()}_${openingIdCounter}_${Math.floor(Math.random() * 1000)}`;
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

export function collectCurrentState() {
    const selectedModels = [];
    document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
        if (cb.checked) selectedModels.push(cb.value);
    });

    return {
        w: parseFloat(document.getElementById('inputW')?.getAttribute('data-current-m') || 18.288),
        l: parseFloat(document.getElementById('inputL')?.getAttribute('data-current-m') || 30.48),
        h: parseFloat(document.getElementById('inputH')?.getAttribute('data-current-m') || 4.8768),
        pitch: document.getElementById('inputPitch')?.value || '0.05',
        roofType: document.getElementById('roofType')?.value || 'gabled',
        roofColor: document.getElementById('colorRoof')?.value || '',
        wallColor: document.getElementById('colorWall')?.value || '',
        trimColor: document.getElementById('colorTrim')?.value || '',
        eaveTrimColor: document.getElementById('colorEaveTrim')?.value || '',
        wainscotColor: document.getElementById('colorWainscot')?.value || '',
        ceilingColor: document.getElementById('colorCeiling')?.value || '',
        mezzanineColor: document.getElementById('colorMezzanine')?.value || '',
        wainscotEn: document.getElementById('wainscotEn')?.checked || false,
        wsHeight: parseFloat(document.getElementById('inputWSHeight')?.getAttribute('data-current-m') || 0),
        intWallsEn: document.getElementById('intWallsEn')?.checked || false,
        intWallsH: document.getElementById('intWallsH')?.value || '100',
        ceilEn: document.getElementById('ceilEn')?.checked || false,
        mezzEn: document.getElementById('mezzEn')?.checked || false,
        mezzCov: document.getElementById('mezzCov')?.value || '1',
        mezzZ: document.getElementById('mezzZ')?.value || '0',
        mezzH: document.getElementById('mezzH')?.value || '50',
        craneEn: document.getElementById('craneEn')?.checked || false,
        craneZ: document.getElementById('craneZ')?.value || '50',
        overL: parseFloat(document.getElementById('overL')?.getAttribute('data-current-m') || 0),
        overR: parseFloat(document.getElementById('overR')?.getAttribute('data-current-m') || 0),
        overF: parseFloat(document.getElementById('overF')?.getAttribute('data-current-m') || 0),
        overB: parseFloat(document.getElementById('overB')?.getAttribute('data-current-m') || 0),
        wF: document.getElementById('wF')?.checked ?? true,
        wB: document.getElementById('wB')?.checked ?? true,
        wL: document.getElementById('wL')?.checked ?? true,
        wR: document.getElementById('wR')?.checked ?? true,
        checkGutters: document.getElementById('checkGutters')?.checked || false,
        drivewayEn: document.getElementById('drivewayEn')?.checked || false,
        selectedReferenceModels: selectedModels,
        ltState: ltState,
        openingsData: openingsData
    };
}