export const CONFIG = {
    textureScaleRoof: 0.25, 
    textureScaleWall: 26.0,
    wallMetalness: 0.35, wallRoughness: 0.50,
    roofMetalness: 0.45, roofRoughness: 0.40,
    cameraGroundMargin: 0.05,
    lightAmbientIntensityBase: 0.4,      
    lightHemiIntensity: 0.6,            
    lightDirIntensityBase: 1.2,         
    lightDirIntensityEnvOn: 1.5,        
    urlSkybox: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/cube/skyboxsun25deg/',
    urlGrass: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r148/examples/textures/terrain/grasslight-big.jpg',
    defaultBgColorHex: 0xf0f4f8,
    minSpacing: 3.28 
};

export const PRODUCT_CODES = {
    roof_panel: "RS-100-WM",
    wall_panel: "WS-200-WM",
    trim: "TR-50-WM",
    screw_wood: "SCW-15-WD",
    screw_metal: "SCM-12-MT",
    closure_vented: "CL-V-88",
    closure_solid: "CL-S-99"
};

export const STD_WINDOWS = [{w:2,h:2}, {w:2,h:3}, {w:2,h:4}, {w:3,h:3}, {w:3,h:4}, {w:3,h:5}, {w:4,h:3}, {w:4,h:4}, {w:4,h:5}, {w:5,h:4}, {w:6,h:4}];
export const STD_DOORS = [
    {w:3,h:7}, {w:6,h:7}, {w:8,h:7}, {w:9,h:7}, 
    {w:10,h:10}, {w:12,h:12}, {w:16,h:7}, {w:16,h:16}
];

export const SVGS = {
    WINDOW_1: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="20" y="20" width="60" height="60"/><line x1="20" y1="50" x2="80" y2="50"/><line x1="50" y1="20" x2="50" y2="80"/></svg>`,
    WINDOW_2: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="10" y="20" width="80" height="60"/><line x1="50" y1="20" x2="50" y2="80"/></svg>`,
    WINDOW_3: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="10" y="20" width="80" height="60"/><line x1="36" y1="20" x2="36" y2="80"/><line x1="63" y1="20" x2="63" y2="80"/></svg>`,
    DOOR_1: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="30" y="10" width="40" height="90"/><circle cx="60" cy="55" r="3" fill="currentColor"/></svg>`,
    DOOR_2: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="10" y="10" width="80" height="90"/><line x1="50" y1="10" x2="50" y2="100"/><circle cx="42" cy="55" r="3" fill="currentColor"/><circle cx="58" cy="55" r="3" fill="currentColor"/></svg>`,
    DOOR_3: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><rect x="10" y="10" width="80" height="90"/><line x1="10" y1="32" x2="90" y2="32"/><line x1="10" y1="54" x2="90" y2="54"/><line x1="10" y1="76" x2="90" y2="76"/></svg>`
};