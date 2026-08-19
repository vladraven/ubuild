РЕПОЗИТОРИЙ

https://github.com/vladraven/ubuild

ЭТАЛОННАЯ ВЕРСИЯ

Commit:
79a87fb

Работать исключительно с актуальной production-структурой из commit 79a87fb.

КРИТИЧЕСКОЕ ПРАВИЛО:

js/modules/ — LEGACY. НЕ ИСПОЛЬЗОВАТЬ.
js/old/ — LEGACY. НЕ ИСПОЛЬЗОВАТЬ.

Production-код находится непосредственно в /js/.

Никакие решения нельзя строить на legacy-коде.

============================================================
ЧАСТЬ I. СУЩЕСТВУЮЩИЙ ФУНКЦИОНАЛ, КОТОРЫЙ ОБЯЗАТЕЛЬНО СОХРАНИТЬ
============================================================

Цель рефакторинга — изменить архитектуру, а НЕ функциональность.

После рефакторинга приложение должно сохранять весь существующий функционал.

------------------------------------------------------------
1. ОСНОВНОЕ ПРИЛОЖЕНИЕ
------------------------------------------------------------

Приложение — browser-based Three.js steel building configurator.

WordPress page template:

3d-design-tool-new.php

Production entry:

js/app-new.js

Используется:

- Three.js;
- native ES modules;
- JavaScript ES2020+;
- Bootstrap;
- OrbitControls;
- GLTFLoader;
- WordPress;
- ACF;
- Gravity Forms.

Нет:

- React;
- Vue;
- Svelte;
- TypeScript;
- bundler;
- npm build;
- package manager.

Система работает как набор native ES modules.

------------------------------------------------------------
2. ГЛАВНЫЙ LIFECYCLE
------------------------------------------------------------

Приложение использует procedural full rebuild.

При изменении параметров:

1. читается DOM state;
2. вызывается updateBuilding();
3. mainGroup очищается;
4. геометрия всех элементов создаётся заново;
5. новые THREE.Group добавляются в mainGroup.

Render loop НЕ отвечает за построение геометрии.

Render loop занимается:

- camera;
- OrbitControls;
- damping;
- rendering.

Это поведение сохранить.

------------------------------------------------------------
3. ПАРАМЕТРИЧЕСКОЕ ЗДАНИЕ
------------------------------------------------------------

Поддерживаются параметры:

- width;
- length;
- height;
- roof pitch;
- roof type.

Roof types:

- gabled;
- left-sloped;
- right-sloped.

Размеры вводятся через связанные slider/numeric inputs.

Каноническая единица хранения:

meters.

DOM использует:

data-current-m

Display может быть:

feet
или
meters.

При изменении размеров модель перестраивается в реальном времени.

Не должно происходить:

- накопления rounding errors;
- постепенного изменения panel width;
- масштабирования текстуры вместе со зданием.

------------------------------------------------------------
4. ДВУХЕДИНИЧНАЯ СИСТЕМА
------------------------------------------------------------

Поддерживается:

Imperial / Metric.

isMetric хранится в state.js.

getU():

metric → m
imperial → ft

Все основные размеры имеют canonical metric value:

data-current-m

При переключении единиц:

- display меняется;
- canonical metric value сохраняется;
- модель не должна перестраиваться только из-за смены отображаемой единицы;
- rounding не должен накапливаться.

------------------------------------------------------------
5. СТЕНЫ
------------------------------------------------------------

building.js создаёт:

- Left wall;
- Right wall;
- Front wall;
- Back wall.

Каждая стена:

- procedural;
- THREE.ExtrudeGeometry;
- собственный orientation;
- shadow casting;
- shadow receiving;
- panel material;
- panel UV.

Толщина стены сейчас:

0.05 m.

Это фактический существующий параметр.

Не менять его без отдельного требования.

------------------------------------------------------------
6. ROOF
------------------------------------------------------------

Поддерживаются:

Gabled Roof
Left Sloped Roof
Right Sloped Roof.

Для gabled roof:

- два ската;
- ridge;
- pitch angle;
- slope length.

Для single-slope:

- один наклонный roof plane;
- left/right slope direction;
- высота противоположной стены определяется pitch.

Roof geometry должна продолжать корректно изменяться при:

- width;
- length;
- height;
- pitch;
- roof type.

------------------------------------------------------------
7. ROOF PROFILES
------------------------------------------------------------

Существуют selectable roof profiles.

В README зафиксированы:

- AWR;
- SSR24.

texturiser.js также имеет profile-dependent roof normal map density.

При выборе roof profile:

- меняется соответствующий visual texture/normal behavior;
- вызывается texture update;
- модель обновляется.

Не удалить эту связь.

------------------------------------------------------------
8. WALL PROFILES
------------------------------------------------------------

Поддерживаются wall profile families:

- AWR;
- Delta Span;
- Elite Rib;
- IMP;
- Ultra Span;
- Widespan.

panelSystem.js имеет profile registry:

awr
ssr24
delta
elite
ultra
widespan
936

Профиль влияет на physical panel density / panel width.

------------------------------------------------------------
9. PANEL SYSTEM
------------------------------------------------------------

panelSystem.js — уже существующий важный subsystem.

Он отвечает за:

- wall panel material;
- wainscot panel material;
- panel profile;
- panel density;
- physical panel width;
- physical panel height;
- normal map;
- UV coordinate system;
- panel count;
- panel boundaries.

Главный принцип:

PANEL WIDTH IS PHYSICAL.

Изменение размеров здания НЕ должно масштабировать панели.

При увеличении здания:

- количество панелей растёт;
- physical panel width остаётся прежней;
- physical panel height остаётся прежней;
- UV продолжаются;
- ribs остаются одинакового физического размера.

Формулы:

U = X / panelWidth
V = Y / panelHeight

panelSystem.js предоставляет:

configurePanelSystem()
getWallPanelMaterial()
getWainscotPanelMaterial()
setWallPanelColor()
setWainscotPanelColor()
setPanelColors()
getPanelWidth()
getPanelHeight()
getPanelSystemState()
calculatePanelCoordinate()
calculatePanelRow()
applyPanelUVs()
getPanelCount()
getPanelBoundary()
getPanelBoundaries()

НЕ ЛОМАТЬ ЭТУ СИСТЕМУ.

------------------------------------------------------------
10. WALL + WAINSCOT PANEL CONSISTENCY
------------------------------------------------------------

Стены и цоколь используют общий panel coordinate system.

Они должны иметь:

- одинаковый physical panel pitch;
- одинаковые panel boundaries;
- одинаковую систему координат;
- одинаковую panel material logic;
- разные цвета при необходимости.

Wall color и wainscot color независимы.

Например:

wall = blue
wainscot = gray

должно продолжать работать.

КРИТИЧЕСКАЯ ПРОБЛЕМА, КОТОРУЮ РЕФАКТОРИНГ ДОЛЖЕН УСТРАНИТЬ:

Сейчас wall и wainscot самостоятельно рассчитывают spatial coordinates.

Это запрещено после рефакторинга.

------------------------------------------------------------
11. WAINSCOT / ЦОКОЛЬ
------------------------------------------------------------

wainscot.js создаёт banding по:

- Left;
- Right;
- Front;
- Back.

Поддерживает:

- enable/disable;
- height;
- side visibility;
- opening holes;
- panel material;
- panel UV;
- independent color.

Высота цоколя ограничивается высотой соответствующей стены.

Если roof type single slope:

высота стены слева/справа отличается.

Цоколь должен учитывать фактическую высоту соответствующей стены.

Opening holes должны продолжать работать.

------------------------------------------------------------
12. OPENINGS
------------------------------------------------------------

Поддерживаются opening types:

1. Window
2. Walk Door Solid
3. Walk Door Solid Double
4. Overhead Panel Door
5. Bi-Fold Door
6. Hydraulic Door

Default dimensions хранятся в openingDefs.

Openings существуют на:

- F;
- B;
- L;
- R.

Каждый opening имеет:

- id;
- type;
- x;
- размеры;
- yOff для windows;
- side;
- другие state данные.

------------------------------------------------------------
13. TRUE WALL CUTOUTS
------------------------------------------------------------

Openings — НЕ decal.

В building.js отверстия создаются через:

THREE.Shape
+
THREE.Path
+
shape.holes.push()

Затем стена extrude.

Это должно сохраниться.

Окна и двери должны реально прорезать стену.

------------------------------------------------------------
14. WINDOWS
------------------------------------------------------------

windows.js отвечает за visual window assemblies.

Они привязываются к соответствующей wall side.

Окна должны:

- следовать opening state;
- иметь реальные размеры;
- двигаться вместе с opening;
- соответствовать отверстиям в стене.

------------------------------------------------------------
15. DOORS
------------------------------------------------------------

doors.js отвечает за visual door assemblies.

Поддерживаются все opening door types.

Двери:

- следуют opening position;
- следуют dimensions;
- соответствуют cutout;
- участвуют в collision logic.

------------------------------------------------------------
16. DRAG & DROP OPENINGS
------------------------------------------------------------

scene.js реализует интерактивное перемещение openings.

Поддерживается:

- pointerdown;
- pointermove;
- pointerup;
- raycaster;
- wall-plane intersection;
- local X coordinate;
- world Y;
- drag offset.

При начале drag сохраняется реальная точка захвата.

Opening НЕ должен прыгать центром к курсору.

Есть ghost mesh при drag.

Ghost:

- translucent;
- blue;
- depthTest false;
- high renderOrder.

------------------------------------------------------------
17. OPENING COLLISION
------------------------------------------------------------

resolveStrictCollisions():

- работает отдельно для каждой wall side;
- проверяет X overlap;
- проверяет Y overlap;
- предотвращает пересечение соседних openings;
- перемещает opening к ближайшей допустимой границе.

Collision должен оставаться axis-aligned.

------------------------------------------------------------
18. OPENING EDITOR
------------------------------------------------------------

Есть modal/editor для opening.

Позволяет менять:

- type;
- width;
- height;
- offset;
- position.

После изменения opening:

- state обновляется;
- UI обновляется;
- building rebuild;
- cutout обновляется;
- visual door/window обновляется.

------------------------------------------------------------
19. OPENING UI
------------------------------------------------------------

populateOpeningsUI()

должен продолжать отображать openings.

Opening state хранится в:

openingsData.F
openingsData.B
openingsData.L
openingsData.R

------------------------------------------------------------
20. OPENING IDs
------------------------------------------------------------

Есть:

openingIdCounter

и:

incrementOpeningId()
setOpeningIdCounter()

IDs используются для:

- идентификации;
- drag;
- collision;
- save/load.

Не ломать.

------------------------------------------------------------
21. FRONT/BACK/LEFT/RIGHT VISIBILITY
------------------------------------------------------------

Есть:

wF
wB
wL
wR

Они управляют видимостью соответствующих стен.

Это должно работать независимо.

------------------------------------------------------------
22. ROOF VISIBILITY
------------------------------------------------------------

checkRoof

управляет отображением roof.

Если false:

roof geometry не должна отображаться.

------------------------------------------------------------
23. OVERHANGS
------------------------------------------------------------

overhangs.js поддерживает:

- left overhang;
- right overhang;
- front overhang;
- back overhang.

Параметры:

overL
overR
overF
overB

Canonical units — meters.

Существующая геометрия использует:

totalLength =
length + overF + overB

zOffset =
(overF - overB) / 2

Это КРИТИЧЕСКАЯ геометрия.

При:

overF != overB

крыша физически смещается по Z.

После нового архитектурного решения эта формула должна существовать только в buildingGeometry.js.

------------------------------------------------------------
24. AWNINGS / LEAN-TOS
------------------------------------------------------------

Поддерживаются lean-to / awnings на:

- Left;
- Right;
- Front;
- Back.

ltState:

L
R
F
B

Каждая сторона имеет:

active
drop
depth
pitch
cutL
cutR
wallF
wallL
wallR

Lean-to должен поддерживать:

- independent depth;
- independent drop;
- pitch;
- left/right cuts;
- end-wall options;
- side-wall options.

Это существующая функциональность.

Не удалить.

------------------------------------------------------------
25. INTERIOR LINER
------------------------------------------------------------

interior-liner.js.

Поддерживает:

- enable/disable;
- height;
- interior wall liner;
- ceiling liner.

Состояния:

intWallsEn
intWallsH
ceilEn

Цвет interior wall исторически следует wallColor.

Сохранить.

------------------------------------------------------------
26. MEZZANINE
------------------------------------------------------------

mezzanine.js.

Поддерживает:

- enable/disable;
- coverage;
- Z position;
- height;
- color.

State:

mezzEn
mezzCov
mezzZ
mezzH
mezzanineColor

------------------------------------------------------------
27. BRIDGE CRANE
------------------------------------------------------------

crane.js.

Поддерживает:

- enable/disable;
- crane height / Z parameter;
- procedural crane structure.

State:

craneEn
craneZ

Не удалить.

------------------------------------------------------------
28. STRUCTURAL FRAMES
------------------------------------------------------------

main-frames.js.

Создаёт portal frame structural elements.

Используются:

- tapered I-beams;
- web;
- flanges;
- roof pitch angle;
- trigonometric mitering.

Frame geometry зависит от:

- width;
- length;
- height;
- pitch;
- roof type.

Structural geometry должна перейти на единый buildingGeometry source.

Материал остаётся отдельным.

------------------------------------------------------------
29. GIRTS
------------------------------------------------------------

girts.js.

Поддерживает:

- enable/disable;
- wall girts;
- spacing/placement.

State:

checkGirts

Не удалять.

------------------------------------------------------------
30. PURLINS
------------------------------------------------------------

purlins.js.

Поддерживает:

- enable/disable;
- roof purlins;
- pitch-dependent placement.

State:

checkPurlins

Не удалять.

------------------------------------------------------------
31. END WALL COLUMNS
------------------------------------------------------------

end-wall-columns.js.

Поддерживает:

- enable/disable;
- end-wall structural columns;
- roof-dependent geometry.

State:

checkEWColumns

Не удалять.

------------------------------------------------------------
32. TRIMS
------------------------------------------------------------

trims.js отвечает за trim system.

Существуют:

- corner trims;
- eave trims;
- rake trims;
- ridge logic;
- gutter integration.

Trim material:

trimMat

Eave trim material:

eaveTrimMat

Существующие профили не заменять простыми boxes.

Eave trim имеет procedural metal flashing profile.

Corner trim имеет L-shaped profile.

Rake trim имеет отдельный profile.

------------------------------------------------------------
33. RIDGE
------------------------------------------------------------

В commit 79a87fb ridge НЕ является отдельным ridge.js.

Не создавать ridge.js только потому, что архитектурно это кажется правильным.

В текущей версии ridge logic находится в trims.js.

При рефакторинге можно выделить ridge позже, но только сохранив behavior.

------------------------------------------------------------
34. GUTTERS
------------------------------------------------------------

В commit 79a87fb gutters.js существует отдельно, но его integration связана с trims.js.

Поддерживаются:

- horizontal gutter;
- top elbow;
- vertical downspout;
- bottom elbow;
- mounting straps;
- configurable offsets.

GUTTER_CONFIG содержит:

gutter.lengthOffset
gutter.widthOffset
gutter.offsetX
gutter.offsetY

topElbow.angleDeg
topElbow.length
topElbow.offsetX
topElbow.offsetY
topElbow.offsetZ

bottomElbow.angleDeg
bottomElbow.length
bottomElbow.offsetX
bottomElbow.offsetY
bottomElbow.offsetZ

pipe.wallOffset
pipe.heightOffset
pipe.groundOffset
pipe.width
pipe.depth

------------------------------------------------------------
35. DOWNSPOUT COLLISION WITH DOORS
------------------------------------------------------------

updateDownspoutVisibility()

автоматически скрывает downspout, если он пересекается с door.

Это запускается после каждого rebuild.

Сохранить.

------------------------------------------------------------
36. DRIVEWAY
------------------------------------------------------------

driveway.js.

Поддерживает:

drivewayEn

Создаёт concrete driveway/slab element.

------------------------------------------------------------
37. FOUNDATION
------------------------------------------------------------

foundation.js.

Создаёт foundation group.

Foundation относится к общей геометрии здания.

После рефакторинга foundation coordinates должны прийти из buildingGeometry.js.

Материал foundation остаётся в material layer.

------------------------------------------------------------
38. LOGO
------------------------------------------------------------

logo.js.

Front-side building branding/logo.

Добавляется только при соответствующей видимости front wall.

Не удалять.

------------------------------------------------------------
39. AWNINGS
------------------------------------------------------------

awnings.js — отдельный существующий модуль.

Не путать:

awnings.js
и
ltState / lean-to geometry.

Сохранить существующее поведение.

------------------------------------------------------------
40. COLOR SYSTEM
------------------------------------------------------------

colorise.js — единственный источник цветов/material definitions.

Существуют:

concreteMat
roofMat
trimMat
eaveTrimMat
steelMat
glassMat
frameMat
wallMat
wainscotMat
panelMat
ceilingMat
mezzMat
intWallMat

Wall material фактически принадлежит panelSystem.js.

colorise.js использует panelSystem API.

Это сохранить.

------------------------------------------------------------
41. INDEPENDENT COLORS
------------------------------------------------------------

Поддерживаются независимые цвета:

- Roof;
- Wall;
- Trim;
- Eave Trim;
- Wainscot;
- Ceiling;
- Mezzanine.

При изменении цвета:

geometry НЕ должна пересчитываться ради цвета.

Material update должен происходить отдельно.

Wall и wainscot должны оставаться независимо окрашиваемыми.

------------------------------------------------------------
42. TEXTURE SYSTEM
------------------------------------------------------------

texturiser.js отвечает за texture/normal-map configuration.

Roof profile:

- AWR;
- SSR24;
- другие существующие mappings.

Wall profile:

- AWR;
- Delta;
- Elite;
- Ultra;
- Widespan;
- и существующие profiles.

Roof normal map создаётся procedural через canvas.

Roof texture:

- RepeatWrapping;
- anisotropy;
- rotation;
- profile-dependent repeat;
- normalScale.

Не смешивать texture logic с geometry logic.

------------------------------------------------------------
43. NORMAL MAPS
------------------------------------------------------------

Panel normal map:

- procedural;
- cached;
- repeat;
- physical panel pitch.

Roof normal map:

- procedural;
- cached;
- profile-dependent density.

Не создавать normal maps заново без необходимости.

------------------------------------------------------------
44. SCENE
------------------------------------------------------------

scene.js создаёт:

- THREE.Scene;
- mainGroup;
- PerspectiveCamera;
- WebGLRenderer;
- OrbitControls;
- lighting;
- terrain;
- skybox.

Renderer:

- antialias;
- preserveDrawingBuffer;
- high-performance;
- shadows;
- PCFSoftShadowMap.

------------------------------------------------------------
45. LIGHTING
------------------------------------------------------------

Существуют:

- HemisphereLight;
- AmbientLight;
- DirectionalLight.

Directional light:

- shadows;
- 4096 shadow map;
- bias;
- normalBias;
- radius;
- shadow camera bounds.

Не удалять.

------------------------------------------------------------
46. SKYBOX
------------------------------------------------------------

CubeTextureLoader используется для skybox.

Не удалять.

------------------------------------------------------------
47. TERRAIN
------------------------------------------------------------

Terrain:

- PlaneGeometry;
- 3000 × 3000;
- 128 × 128 segments;
- procedural hills;
- trigonometric noise;
- radial falloff;
- vertex colors;
- grass texture;
- bump map;
- anisotropy.

Terrain должен продолжать существовать независимо от building geometry.

Terrain НЕ должен входить в buildingGeometry.js.

------------------------------------------------------------
48. REFERENCE MODELS
------------------------------------------------------------

external-references-models.js.

Поддерживаются reference props:

- car;
- forklift;
- airplane;
- semi-truck.

Модели:

- GLTF;
- runtime loaded;
- Box3 bounds;
- real-world normalization;
- grounded at Y=0;
- draggable.

Reference models должны сохраняться при refactoring.

------------------------------------------------------------
49. MODEL DRAGGING
------------------------------------------------------------

Reference models можно:

- place;
- drag;
- reposition.

Используется raycaster / ground plane.

------------------------------------------------------------
50. GEOLOCATION
------------------------------------------------------------

state.js запрашивает browser geolocation.

userLocation:

lat
lon

Не удалять существующую возможность.

------------------------------------------------------------
51. SAVE / LOAD
------------------------------------------------------------

Система сохраняет designs client-side.

Storage:

localStorage

Key:

configurator_designs

No dedicated backend database.

Saved designs:

- multiple;
- reload;
- delete.

Не менять storage contract без отдельного требования.

------------------------------------------------------------
52. GALLERY
------------------------------------------------------------

Gallery отображает saved designs.

Поддерживает:

- selection;
- load;
- delete;
- preview.

------------------------------------------------------------
53. COMPARE
------------------------------------------------------------

Compare feature позволяет сравнивать saved designs.

Compare overlay:

- side-by-side;
- specifications;
- selected designs.

Сохранить.

------------------------------------------------------------
54. SHARE URL
------------------------------------------------------------

Full configuration сериализуется в:

?config=...

Формат:

JSON
→ UTF-8 safe base64
→ URL query parameter.

safeBase64Encode()
safeBase64Decode()

Поддерживается восстановление configuration из URL.

------------------------------------------------------------
55. URL CONFIG LOAD
------------------------------------------------------------

applyUrlConfig(renderCallback):

- читает ?config;
- декодирует state;
- восстанавливает dimensions;
- pitch;
- roofType;
- colors;
- wainscot;
- interior liner;
- ceiling;
- mezzanine;
- crane;
- overhangs;
- wall visibility;
- driveway;
- openings;
- opening ID counter.

После восстановления:

populateOpeningsUI()
renderCallback()

должны продолжать работать.

------------------------------------------------------------
56. INSIDE VIEW
------------------------------------------------------------

Inside View toggle:

viewInsideToggle.

При включении:

- сохраняется внешняя camera position;
- сохраняется controls target;
- autoRotate выключается;
- camera переносится внутрь здания;
- target устанавливается по высоте здания.

При выключении:

- камера восстанавливается.

Не удалять.

------------------------------------------------------------
57. QUOTE MODAL
------------------------------------------------------------

Quote modal:

- делает JPEG snapshot renderer;
- показывает preview;
- собирает dimensions;
- собирает roof type;
- собирает colors;
- собирает wainscot;
- собирает additional elements;
- собирает awnings;
- собирает openings;
- генерирует share URL;
- заполняет Gravity Forms.

Gravity Forms:

Form ID 4.

Используются существующие field IDs.

Не ломать lead pipeline.

------------------------------------------------------------
58. QUOTE SPECIFICATION DUMP
------------------------------------------------------------

В quote info dump должны попадать:

MAIN PARAMETERS:

Width
Length
Height
Roof Type
Pitch
Wainscot Height

COLORS:

Roof
Walls
Trim
Wainscot

ADDITIONAL ELEMENTS:

Interior Walls
Ceiling Liner
Mezzanine
Crane

AWNINGS:

Front
Back
Left
Right

Для каждого active awning:

Drop
Depth
Pitch
Cut L
Cut R
Walls options

OPENINGS:

side
type
offset.

------------------------------------------------------------
59. UNIT-AWARE QUOTE
------------------------------------------------------------

Quote data должен отображаться в текущей unit system:

ft
или
m.

Canonical values берутся из:

data-current-m.

Не использовать уже округлённый display value как источник истины.

------------------------------------------------------------
60. SIDEBAR SUMMARY
------------------------------------------------------------

builder.js обновляет summary:

dimensions
roof
colors

Summary показывает:

width
length
height
pitch
roof type
roof profile
roof color
wall profile
wall color.

Не удалять.

------------------------------------------------------------
61. RESET
------------------------------------------------------------

Существуют reset mechanisms через tools-actions/UI.

Reset должен:

- очистить state;
- clear reference models;
- очистить hitboxes;
- очистить drag planes;
- восстановить defaults;
- rebuild.

------------------------------------------------------------
62. ACF BACKEND LIMITS
------------------------------------------------------------

WordPress ACF задаёт ограничения:

ubuild_max_width
ubuild_max_length
ubuild_max_height
ubuild_max_overhang
ubuild_max_foundation_height
ubuild_pitch_awr
ubuild_pitch_ssr24

Frontend должен учитывать эти ограничения.

------------------------------------------------------------
63. FEATURE FLAGS
------------------------------------------------------------

ACF controls:

ubuild_allow_vehicle
ubuild_allow_forklift
ubuild_allow_airplane
ubuild_allow_truck
ubuild_allow_interior_liner
ubuild_allow_mezzanine
ubuild_allow_crane
ubuild_allow_downspouts

Не обходить feature flags.

------------------------------------------------------------
64. VALIDATION
------------------------------------------------------------

Dimensions continuously validated against backend maximums.

При clamp:

Bootstrap toast.

Не удалить validation.

------------------------------------------------------------
65. UI
------------------------------------------------------------

ui.js отвечает за:

- control bindings;
- slider/numeric synchronization;
- toggles;
- opening UI;
- gallery;
- compare;
- validation;
- render callback wiring.

UI changes должны продолжать вызывать правильные element rebuilds/material updates.

------------------------------------------------------------
66. DRAG / RAYCASTING
------------------------------------------------------------

scene.js отвечает за:

- raycaster;
- mouse coordinates;
- opening hitboxes;
- drag planes;
- reference model interactions.

Не смешивать это с buildingGeometry.js.

------------------------------------------------------------
67. BUILDING GEOMETRY ARCHITECTURE
------------------------------------------------------------

ТЕПЕРЬ НОВАЯ АРХИТЕКТУРА.

Создать:

js/buildingGeometry.js

Это ЕДИНСТВЕННЫЙ SOURCE OF TRUTH для spatial geometry здания.

------------------------------------------------------------
68. RESPONSIBILITY OF buildingGeometry.js
------------------------------------------------------------

buildingGeometry.js отвечает за:

ВСЮ геометрию ВСЕХ физических элементов здания.

Он должен рассчитывать:

- building dimensions;
- building center;
- wall reference planes;
- wall outer surfaces;
- wall inner surfaces;
- foundation coordinates;
- wainscot coordinates;
- roof planes;
- roof angles;
- roof slope lengths;
- roof edges;
- overhangs;
- front/back roof extension;
- roof Z offset;
- ridge coordinates;
- eave coordinates;
- rake coordinates;
- trim coordinates;
- gutter coordinates;
- downspout base positions;
- frame coordinates;
- girts;
- purlins;
- end-wall columns;
- interior liner;
- mezzanine;
- crane;
- awnings / lean-tos;
- driveway;
- other spatially dependent building elements.

Если элемент физически существует в здании и его положение зависит от размеров здания — его spatial coordinates должны приходить из buildingGeometry.js.

------------------------------------------------------------
69. buildingGeometry.js MUST NOT
------------------------------------------------------------

НЕ должен:

- импортировать colorise.js;
- импортировать materials;
- создавать THREE.Mesh;
- создавать THREE.Material;
- создавать textures;
- создавать normal maps;
- читать DOM;
- читать document;
- читать input elements;
- обращаться к mainGroup;
- управлять camera;
- управлять renderer;
- управлять UI;
- управлять localStorage.

Он отвечает только за geometry model.

------------------------------------------------------------
70. GEOMETRY MODEL
------------------------------------------------------------

Результат должен быть полноценным объектом:

geometry = {
    building,
    foundation,
    walls,
    wainscot,
    roof,
    overhangs,
    ridge,
    trims,
    gutters,
    downspouts,
    frames,
    girts,
    purlins,
    endWallColumns,
    interiorLiner,
    mezzanine,
    crane,
    awnings,
    driveway
}

Не обязательно буквально использовать именно эти имена, если существующая архитектура требует другое naming.

Но ответственность должна быть такой.

------------------------------------------------------------
71. NO DUPLICATED GEOMETRY FORMULAS
------------------------------------------------------------

После рефакторинга запрещено:

building.js:
    const halfW = width / 2;

wainscot.js:
    const halfW = width / 2;

trims.js:
    const halfW = width / 2;

gutters.js:
    const halfW = width / 2;

Это одна и та же spatial calculation.

Она должна существовать только в:

buildingGeometry.js.

Element orchestrators получают готовое:

geometry.walls.left
geometry.wainscot.left
geometry.trims.left
etc.

------------------------------------------------------------
72. WALL / WAINSCOT ALIGNMENT
------------------------------------------------------------

Критически важно.

Wall и wainscot должны быть рассчитаны в одной coordinate system.

Например:

geometry.walls.left.outerSurfaceX

geometry.wainscot.left.outerSurfaceX

geometry.trims.left.surfaceX

Все должны быть связаны геометрически.

Никаких независимых offsets в каждом файле.

Это должно устранить:

- wainscot перекрывает trim;
- trim находится внутри здания;
- разные координаты wall/wainscot;
- различный panel alignment.

------------------------------------------------------------
73. ROOF ALIGNMENT
------------------------------------------------------------

Roof, overhang, trim, ridge, gutter должны использовать одну roof coordinate system.

В частности:

roof.length =
length + overF + overB

roof.zOffset =
(overF - overB) / 2

roof.frontZ
roof.backZ

должны вычисляться один раз.

trims.js НЕ должен самостоятельно считать:

halfL
overF
overB
roofLength.

gutters.js НЕ должен самостоятельно считать их.

ridge НЕ должен самостоятельно считать их.

------------------------------------------------------------
74. COLORS ARCHITECTURE
------------------------------------------------------------

colorise.js остаётся source of truth для:

- colors;
- materials;
- material properties.

buildingGeometry.js не знает о цвете.

Пример:

geometry =
    buildingGeometry(...)

materials =
    colorise(...)

building =
    createBuilding(
        geometry,
        materials
    )

------------------------------------------------------------
75. TEXTURE ARCHITECTURE
------------------------------------------------------------

texturiser.js остаётся source of truth для texture configuration.

Он отвечает за:

- texture;
- normal map;
- profile;
- repeat;
- anisotropy;
- rotation;
- texture properties.

Не помещать texture logic в buildingGeometry.js.

------------------------------------------------------------
76. PANEL ARCHITECTURE
------------------------------------------------------------

panelSystem.js остаётся source of truth для:

- physical panel width;
- physical panel height;
- panel density;
- profile;
- panel count;
- panel boundaries;
- UV;
- normal map;
- wall panel material;
- wainscot panel material.

buildingGeometry.js не должен знать panel texture details.

------------------------------------------------------------
77. ELEMENT ORCHESTRATORS
------------------------------------------------------------

Каждый element file становится orchestrator конкретного физического элемента.

Например:

building.js

получает:

geometry.walls
materials.wall
texture/panel system
openings state

и создаёт wall meshes.

wainscot.js

получает:

geometry.wainscot
materials.wainscot
panelSystem
openings

и создаёт wainscot.

overhangs.js

получает:

geometry.roof / geometry.overhangs
materials.roof
texture

и создаёт roof overhangs.

trims.js

получает:

geometry.trims
materials.trim
materials.eaveTrim

и создаёт trims.

gutters.js

получает:

geometry.gutters
materials.eaveTrim/trim

и создаёт gutters/downspouts.

Каждый элемент сам является orchestrator своего элемента.

------------------------------------------------------------
78. ELEMENT ORCHESTRATOR MAY HANDLE
------------------------------------------------------------

Element orchestrator может:

- выбрать material;
- получить texture;
- получить normal map;
- получить panel material;
- создать THREE geometry;
- создать THREE Mesh;
- создать child meshes;
- применить element-specific properties;
- применить shadows;
- применить UV;
- собрать THREE.Group.

Но НЕ должен заново рассчитывать глобальную геометрию здания.

------------------------------------------------------------
79. BUILDER
------------------------------------------------------------

builder.js — GLOBAL ORCHESTRATOR.

Он:

1. validates UI;
2. updates materials;
3. reads state;
4. asks buildingGeometry for geometry;
5. calls each element orchestrator;
6. passes geometry;
7. passes materials;
8. passes textures/maps/config;
9. adds groups to mainGroup;
10. updates sidebar summary.

builder.js НЕ строит geometry.

builder.js НЕ должен содержать spatial formulas.

------------------------------------------------------------
80. STATE
------------------------------------------------------------

state.js продолжает хранить:

- unit system;
- openingDefs;
- openingsData;
- opening IDs;
- ltState;
- user location;
- hitboxes;
- drag planes;
- reference models;
- placed models;
- appData.

Не превращать buildingGeometry.js в state manager.

------------------------------------------------------------
81. MATERIAL CHANGE BEHAVIOR
------------------------------------------------------------

Если пользователь меняет:

colorRoof
colorWall
colorTrim
colorEaveTrim
colorWainscot
colorCeiling
colorMezzanine

должен обновляться material.

Geometry calculation не должен изменяться.

------------------------------------------------------------
82. DIMENSION CHANGE BEHAVIOR
------------------------------------------------------------

Если пользователь меняет:

W
L
H
Pitch
Roof Type
Overhangs

buildingGeometry должен пересчитаться.

Все element orchestrators получают новую geometry.

Никакие старые coordinates не должны остаться.

------------------------------------------------------------
83. PROFILE CHANGE BEHAVIOR
------------------------------------------------------------

Если меняется:

roofProfile
wallProfile

должна обновиться texture/panel system.

Physical geometry здания не должна изменяться, если profile не меняет реальную конструктивную геометрию.

------------------------------------------------------------
84. PANEL WIDTH GUARANTEE
------------------------------------------------------------

Это критическое acceptance criterion.

Если здание:

10 m wide

и затем:

20 m wide

panel width остаётся прежней.

Количество панелей меняется.

Панель не растягивается.

То же самое для:

wainscot.

Количество и границы панелей стены и цоколя должны быть согласованы с общей panel coordinate system.

------------------------------------------------------------
85. MATERIAL INDEPENDENCE
------------------------------------------------------------

Wall:

colorWall

Wainscot:

colorWainscot

Roof:

colorRoof

Trim:

colorTrim

Eave trim:

colorEaveTrim

Ceiling:

colorCeiling

Mezzanine:

colorMezzanine

Не объединять их в один материал ради упрощения.

------------------------------------------------------------
86. NO FUNCTIONAL REGRESSIONS
------------------------------------------------------------

После рефакторинга должны продолжать работать:

- dimensions;
- roof type;
- pitch;
- wall visibility;
- roof visibility;
- wall profile;
- roof profile;
- wall color;
- wainscot color;
- roof color;
- trim color;
- eave trim color;
- ceiling color;
- mezzanine color;
- wainscot enable;
- wainscot height;
- windows;
- doors;
- opening drag;
- opening collision;
- opening editor;
- overhangs;
- awnings;
- interior liner;
- ceiling liner;
- mezzanine;
- crane;
- gutters;
- downspouts;
- girts;
- purlins;
- end-wall columns;
- driveway;
- logo;
- reference models;
- inside view;
- save;
- load;
- gallery;
- compare;
- share URL;
- quote;
- screenshot;
- Gravity Forms;
- validation;
- units.

------------------------------------------------------------
87. NO MAGIC OFFSETS
------------------------------------------------------------

Не исправлять geometry новым:

+0.003
-0.124
+0.05

если это не реальный физический parameter.

Каждый offset должен иметь смысл:

wall thickness
panel thickness
trim thickness
clearance
roof thickness
etc.

Если offset относится к геометрии здания — он находится в buildingGeometry.js.

Если относится к визуальному material/profile — находится в element/material layer.

------------------------------------------------------------
88. NO HIDDEN DUPLICATION
------------------------------------------------------------

Запрещено иметь:

roofLength в trims.js
roofLength в gutters.js
roofLength в ridge.js
roofLength в overhangs.js

Правильно:

geometry.roof.length

используется всеми.

То же самое для:

halfW
halfL
roofAngle
roofZOffset
frontZ
backZ
wallOuterX
wallOuterZ
etc.

------------------------------------------------------------
89. REFACTORING STRATEGY
------------------------------------------------------------

Не делать массовую перепись сразу.

Порядок:

STEP 1

Изучить все production root files.

STEP 2

Создать полноценный buildingGeometry.js.

STEP 3

Перенести в него существующие spatial calculations БЕЗ изменения поведения.

STEP 4

Подключить building.js.

STEP 5

Проверить walls/openings.

STEP 6

Подключить wainscot.js.

STEP 7

Проверить:

wall/wainscot alignment
panel alignment
independent colors
openings.

STEP 8

Подключить overhangs.js.

STEP 9

Проверить roof geometry.

STEP 10

Подключить trims.js.

STEP 11

Проверить:

corner trims
eave trims
rake trims
ridge
front/back overhangs
side overhangs.

STEP 12

Подключить gutters.js.

STEP 13

Проверить:

gutter length
downspouts
door collision.

STEP 14

Подключить остальные structural elements:

frames
girts
purlins
end-wall columns
liner
mezzanine
crane
awnings
driveway.

------------------------------------------------------------
90. BEHAVIOR-PRESERVING FIRST
------------------------------------------------------------

Первый этап рефакторинга должен воспроизводить текущую геометрию.

То есть:

OLD:
independent formulas

NEW:
same formulas
→ one source.

Нельзя одновременно:

- менять архитектуру;
- менять dimensions;
- менять roof formulas;
- менять materials;
- менять panel system.

Сначала перенос.

Потом исправление выявленных ошибок.

------------------------------------------------------------
91. EXISTING KNOWN BUG
------------------------------------------------------------

Известна проблема:

При изменении размеров здания:

- panel width не должна изменяться;
- panel count должен изменяться;
- wall/wainscot panel boundaries должны совпадать.

Это уже решалось через panelSystem.js.

Не регрессировать.

------------------------------------------------------------
92. EXISTING KNOWN BUG: TRIMS / OVERHANGS
------------------------------------------------------------

В текущей архитектуре createTrimsGroup получает:

width
length
height
pitchRatio
roofType
enabled
overL
overR
guttersEnabled

но НЕ получает:

overF
overB.

В то же время overhangs.js использует:

length + overF + overB

и:

(overF - overB) / 2.

Новая geometry architecture должна устранить это расхождение.

------------------------------------------------------------
93. EXISTING KNOWN BUG: WAINSCOT/TRIM DEPTH
------------------------------------------------------------

Wall, wainscot и trims имеют независимые spatial calculations.

Из-за этого trim может оказаться:

- внутри здания;
- за wainscot;
- перекрытым wainscot.

После рефакторинга все должны использовать единую geometry model.

------------------------------------------------------------
94. TESTING / MANUAL VERIFICATION
------------------------------------------------------------

После каждого шага проверить минимум:

A.

Small building.

B.

Large building.

C.

Gabled roof.

D.

Left slope.

E.

Right slope.

F.

overF = 0
overB = 0.

G.

overF != overB.

H.

Wall color != Wainscot color.

I.

Change building dimensions.

J.

Change wall profile.

K.

Change roof profile.

L.

Enable/disable wainscot.

M.

Openings on all four walls.

N.

Door + downspout collision.

O.

Lean-to on each side.

P.

Mezzanine.

Q.

Crane.

R.

Interior liner.

S.

Inside View.

T.

Save/load.

U.

Share URL.

V.

Quote.

------------------------------------------------------------
95. GIT / FILE DISCIPLINE
------------------------------------------------------------

Работать по одному файлу.

Перед изменением файла:

1. прочитать фактический файл из 79a87fb;
2. проверить imports;
3. проверить exports;
4. проверить реальные параметры;
5. проверить реальные DOM IDs;
6. проверить реальные material names;
7. проверить реальные функции.

Не предполагать наличие файла.

Не создавать API, которого нет, без необходимости.

Не использовать legacy.

Не выводить псевдокод вместо рабочего кода.

Если файл изменяется:

вывести ПОЛНЫЙ файл.

Не выводить diff.

------------------------------------------------------------
96. FINAL ARCHITECTURE
------------------------------------------------------------

Итоговая архитектура должна быть:

builder.js
    =
GLOBAL ORCHESTRATOR

buildingGeometry.js
    =
SINGLE SOURCE OF TRUTH
FOR ALL BUILDING SPATIAL GEOMETRY

colorise.js
    =
COLORS + MATERIALS

texturiser.js
    =
TEXTURES + NORMAL MAPS

panelSystem.js
    =
PANEL WIDTH + PANEL COUNT + UV + PANEL NORMALS

state.js
    =
APPLICATION STATE

scene.js
    =
THREE SCENE + CAMERA + RAYCASTING + DRAGGING

ui.js
    =
UI / EVENTS / EDITORS

tools-actions.js
    =
SAVE / LOAD / SHARE / QUOTE / COMPARE / INSIDE VIEW

ELEMENT ORCHESTRATORS:

building.js
wainscot.js
overhangs.js
trims.js
gutters.js
foundation.js
main-frames.js
girts.js
purlins.js
end-wall-columns.js
interior-liner.js
mezzanine.js
crane.js
awnings.js
driveway.js
logo.js
windows.js
doors.js
external-references-models.js

Each element orchestrator:

geometry
+
materials
+
textures/maps
+
element-specific state
=
THREE.Group

------------------------------------------------------------
97. ABSOLUTE RULE
------------------------------------------------------------

НЕ ДОПУСКАТЬ:

Element → самостоятельно вычисляет общую геометрию здания.

РАЗРЕШЕНО:

Element → получает geometry → создаёт свою геометрию.

НЕ ДОПУСКАТЬ:

Geometry → знает о цвете.

РАЗРЕШЕНО:

Element → получает material.

НЕ ДОПУСКАТЬ:

Geometry → знает о texture.

РАЗРЕШЕНО:

Element → получает texture/map.

НЕ ДОПУСКАТЬ:

Builder → считает coordinates.

РАЗРЕШЕНО:

Builder → вызывает buildingGeometry.

------------------------------------------------------------
98. ОСНОВНОЙ ПРИНЦИП
------------------------------------------------------------

WHERE:

buildingGeometry.js

WHAT:

element orchestrator

HOW IT LOOKS:

colorise.js + texturiser.js + panelSystem.js

WHEN:

builder.js

STATE:

state.js

SCENE:

scene.js

UI:

ui.js

TOOLS:

tools-actions.js

Ни одна ответственность не должна быть продублирована.

------------------------------------------------------------
99. КРИТЕРИЙ УСПЕХА
------------------------------------------------------------

После рефакторинга можно изменить:

width
length
height
pitch
roof type
overL
overR
overF
overB

и вся геометрия здания автоматически перестраивается согласованно:

walls
wainscot
roof
overhangs
trims
ridge
gutters
frames
girts
purlins
columns
liner
mezzanine
crane
awnings
driveway
etc.

При этом:

- panel width остаётся физически фиксированной;
- panel boundaries совпадают;
- wall/wainscot coordinates совпадают;
- trims находятся снаружи;
- ridge следует крыше;
- gutters следуют крыше;
- front/back roof overhangs учитываются;
- independent colors сохраняются;
- textures сохраняются;
- openings сохраняются;
- UI сохраняется;
- save/load/share/quote сохраняются.

Главная цель:

ОДНА ГЕОМЕТРИЧЕСКАЯ МОДЕЛЬ
+
НЕЗАВИСИМЫЕ ELEMENT ORCHESTRATORS
+
НЕЗАВИСИМЫЕ MATERIAL/TEXTURE SYSTEMS
+
builder КАК ОРКЕСТРАТОР.

Никакой функциональности существующего приложения не удалять в процессе рефакторинга.