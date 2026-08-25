export const DEFAULT_PARAMS = { 
    width: 30, depth: 40, pitch: 4, upperPitch: 6, thickness: 0.05, 
    hasOverhang: false, overhang: 1.0,
    modelType: 'standard', hipOffset: 15,
    hasDormer: false, dormerWidth: 6, dormerDepth: 7.5, dormerZ: 0, dormerHeight: 18,
    dormerPitch: 4, dormerSide: 'right', 
    hasEnvironment: false, horizontalSiding: false,
    hasWainscot: false, wainscotHeight: 3.0,
    crossWidth: 20, crossDepth: 20, crossOffset: 0,
    hvLeftExt: 15, hvRightExt: 15, hvLeftOffset: 0, hvRightOffset: 0, 
    leanToWidth: 10, leanToDepth: 20, leanToHeight: 8, leanToPitch: 2,
    isVented: false, ventOffset: 0.5, eaveOverhangExt: 0.0,
    hasSoffit: false, soffitColor: null, soffitProfile: 'perforated',
    hasGableDivider: false, gableDividerColor: null, gableDividerProfile: 'standard',
    hasClosures: true,
    floors: [
        {
            id: 0,
            height: 16,
            openings: { 
                front: [], back: [], left: [], right: [], 
                left_front: [], left_back: [], right_front: [], right_back: [], 
                wing_l_front: [], wing_l_back: [], wing_l_end: [], 
                wing_r_front: [], wing_r_back: [], wing_r_end: [] 
            }
        }
    ],
    colors: { roof: null, wall: null, trim: null, wainscot: null, soffit: null, gableDivider: null },
    textureModels: { roof: null, wall: null }
};

export const state = {
    params: JSON.parse(JSON.stringify(DEFAULT_PARAMS)),
    currentHouse: null,
    selectedRoofWidth: 36, 
    selectedWallWidth: 36,
    cachedScrews: 0, 
    elementIdCounter: 0,
    selectedOpeningInfo: null, // { floorId: 0, wallId: 'front', id: 1 }
    savedHistoryData: [],
    activeFloorId: 0
};

export function resetState() {
    state.params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
    state.selectedOpeningInfo = null;
    state.activeFloorId = 0;
}

export function getGlobalHeight() {
    return state.params.floors.reduce((sum, floor) => sum + floor.height, 0);
}

export function getFloorBaseY(floorId) {
    return state.params.floors.slice(0, floorId).reduce((sum, floor) => sum + floor.height, 0);
}