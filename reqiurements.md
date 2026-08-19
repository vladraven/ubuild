Единый список требований к архитектуре ubuild

Baseline: 982dafa.

Цель — довести текущую архитектуру до законченной модели, не ломая существующий функционал.

1. Архитектурная модель

Целевая цепочка:

UI / state
    ↓
builder.js
    ↓
buildingGeometry.js
    ↓
element orchestrators
    ↓
colorise.js / texturiser.js / panelSystem.js
    ↓
THREE.js
builder.js

builder.js — только оркестратор.

Он:

получает параметры здания;
вызывает createBuildingGeometry();
передаёт geometry соответствующим element-модулям;
собирает результат в mainGroup;
управляет общим lifecycle rebuild.

Он не должен:

вычислять координаты здания;
повторно рассчитывать roof geometry;
рассчитывать положения trims/gutters/ridge;
создавать материалы;
знать внутреннюю геометрию элементов;
напрямую управлять внутренним состоянием element-модулей.
2. buildingGeometry.js — единственный источник геометрии здания

Все координаты и пространственные параметры должны формироваться один раз.

Он является source of truth для:

building
walls
roof
foundation
wainscot
panels
mainFrames
girts
purlins
endWallColumns
trims
ridge
gutters
awnings
liner
mezzanine
crane
driveway
logo
openings
overhangs
Обязательное правило

Если координата зависит от:

width
length
height
pitch
roofType
overF
overB
overL
overR
wallThickness
foundation
opening geometry

она вычисляется в buildingGeometry.js.

Element renderer не пересчитывает её самостоятельно.

3. Единая система координат

Все элементы здания должны использовать одну и ту же систему:

X = ширина здания
Y = высота
Z = длина здания

Особенно:

walls
wainscot
panels
roof
trims
ridge
gutters
overhangs

не должны иметь независимых систем координат.

Это должно исключить:

несовпадение панелей стены и цоколя;
несовпадение границ рядов;
смещение trims;
смещение gutters;
рассогласование roof/ridge;
проблемы при изменении размеров здания.
4. Стены и цоколь

Стены и цоколь должны использовать:

одну систему координат;
один panel system;
одинаковый принцип расчёта панелей;
одинаковые reference coordinates.

При изменении:

width
length
height

панели должны оставаться физически корректными.

Панели

Ширина панели — фиксированная, а не масштабируемая.

Изменение ширины здания должно изменять:

количество панелей

и положение последней панели, но не ширину стандартной панели.

То же правило для цоколя.

5. panelSystem.js

panelSystem.js — единственный источник логики панелей.

Он отвечает за:

ширину панели;
высоту панели;
количество;
рядность;
spacing;
boundaries;
panel material;
wall panel material;
wainscot panel material;
цвет панелей.

Wall и wainscot не должны иметь две независимые реализации panel layout.

6. colorise.js — единственный источник материалов

Все shared materials должны находиться в:

colorise.js

В частности:

wallMat
wainscotMat
panelMat
roofMat
trimMat
eaveTrimMat
rakeTrimMat
frameMat
steelMat
concreteMat
glassMat
ceilingMat
mezzMat
intWallMat

Element-модули не создают собственные копии:

new THREE.MeshStandardMaterial(...)

для материалов, которые уже существуют в colorise.js.

7. Structural materials

Особенно исправить:

main-frames.js
girts.js
purlins.js
end-wall-columns.js
foundation.js

Сейчас они создают локальные:

frameMat
steelMat
concreteMat

Это запрещено.

Должно быть:

main-frames.js        → frameMat
girts.js              → steelMat
purlins.js            → steelMat
end-wall-columns.js   → steelMat
foundation.js         → concreteMat

из colorise.js.

8. Цвета structural elements

Цвет structural elements должен управляться централизованно.

Нужно обеспечить независимую настройку:

frame
steel / secondary steel
concrete

при необходимости через UI.

Все изменения должны проходить через:

updateMaterialColors()

а не через hardcoded colors внутри element modules.

9. texturiser.js

texturiser.js отвечает за:

textures;
bump/normal/height maps;
UV;
texture orientation;
повторение текстур;
texture configuration.

Element-модули должны получать необходимые texture/material resources через централизованный слой.

10. Element orchestrators

Каждый элемент является собственным orchestrator.

Например:

walls
wainscot
roof
foundation
mainFrames
girts
purlins
trims
ridge
gutters
awnings
liner
mezzanine
crane
driveway

Element-модуль:

получает geometry;
получает material/texture resources;
создаёт THREE meshes;
возвращает Group.

Он не является источником geometry здания.

11. Запрет state.js в element renderers

Element modules не должны читать:

state.js

для определения геометрии.

Особенно исправить:

awnings.js

где сейчас есть:

import { ltState } from './state.js';

и:

const config = ltState[side];

Вся необходимая информация должна быть подготовлена в:

geometry.awnings
12. Awnings

geometry.awnings должен содержать всё необходимое:

active/enabled
wallF
wallL
wallR
position
width
depth
startY
postH
roof
rotation

awnings.js не должен обращаться к ltState.

13. Ridge

ridge.js остаётся отдельным element module.

Но:

ridge.js

не должен вычислять building geometry.

Например, нельзя локально рассчитывать:

roofPlaneRise = halfWidth * Math.tan(...)

если это уже относится к положению ridge относительно roof.

buildingGeometry.js должен предоставить готовую reference geometry.

ridge.js отвечает только за создание физической формы ridge.

14. Trims

Trims должны использовать geometry из buildingGeometry.

Нельзя независимо вычислять:

eave position
rake position
ridge position
roof edge

через собственные копии формул.

Особенно нельзя возвращать старую проблему:

overF / overB

когда крыша знает о свесах, а trims — нет.

15. Gutters

gutters.js должен использовать:

geometry.gutters

как источник положения.

В geometry должны быть определены:

eaves
downspouts
position
side
height
length
overhang
visibility

builder.js не должен после создания gutters отдельно выполнять:

updateDownspoutVisibility()

Visibility должна приходить из geometry.

Это уже исправлено в 982dafa.

16. Residual spatial math

Нужно убрать оставшиеся расчёты building geometry из:

awnings.js
gutters.js
ridge.js

Разрешено рассчитывать форму самого элемента.

Например:

труба → сегменты трубы
ridge → профиль металлической накладки
awning → форма конкретной стены

Но нельзя вычислять там:

где находится стена здания
где находится карниз здания
где находится ridge здания
где находится roof plane здания
17. Magic offsets

Запрещены необъяснимые:

-0.124
-0.135
0.05

если они являются пространственными поправками относительно здания.

Каждый offset должен иметь физический смысл.

Например:

roof thickness
trim thickness
wall clearance
pipe clearance
foundation clearance

должны быть именованными параметрами.

18. Разделение geometry и element configuration

Не складывать всё в один гигантский buildingGeometry.DEFAULTS.

Разделять:

Geometry
где находится элемент
какого он размера относительно здания
как он связан с building geometry
Element configuration
толщина конкретного профиля
ширина металлической накладки
форма профиля
material properties

Например:

geometry.roof.ridge
    → положение и длина ridge


RIDGE_CONFIG
    → ширина/толщина/форма профиля
19. GPU resource lifecycle

При каждом rebuild нельзя ограничиваться:

mainGroup.clear();

Необходимо освобождать:

Geometry
local Materials
Textures

которые принадлежат удаляемому объекту.

20. Shared materials нельзя dispose при rebuild

Это критично.

Материалы из:

colorise.js

являются shared resources.

Поэтому нельзя при каждом rebuild делать:

material.dispose();

для них.

Нужно различать:

shared resources

и:

instance-owned resources
21. Local cloned materials

Особенно проверить:

wallMat.clone()

в awnings.js.

Такие материалы должны:

либо быть устранены;
либо быть зарегистрированы как local resources;
либо корректно dispose при rebuild.
22. Единый dispose mechanism

Желательно иметь единый механизм уровня:

disposeObjectTree()

который:

проходит по объектам;
освобождает geometry;
освобождает local materials;
освобождает принадлежащие textures;
не уничтожает shared resources.
23. scene.js

scene.js отвечает за:

scene
camera
renderer
lights
terrain
interaction
raycasting
controls

Он не должен владеть building element geometry.

При этом текущий 982dafa не надо искусственно переделывать только ради этого пункта: trim geometry в текущем scene.js не является подтверждённой проблемой.

24. UI/state separation

UI/state содержит:

user choices
toggles
dimensions
colors
opening definitions
configuration state

Но это не означает, что renderers должны читать state напрямую.

Правильный путь:

state
 ↓
builder
 ↓
buildingGeometry
 ↓
element renderer
25. Openings

Существующий функционал openings должен сохраниться:

двери;
окна;
позиции;
размеры;
collision detection;
drag & drop;
cutouts;
wall side;
opening definitions.

Refactor не должен ломать эту систему.

26. Existing functional requirements

После рефакторинга должны продолжить работать:

building width
building length
building height
roof type
roof pitch
roof overhangs
wall colors
wainscot colors
roof color
trim colors
eave trim color
ceiling color
mezzanine color
openings
windows
doors
opening drag/drop
opening collision
awnings
gutters
downspouts
ridge
trims
frames
girts
purlins
end-wall columns
foundation
liner
mezzanine
crane
driveway
logo
units
metric / imperial
save
share
quote
27. Rebuild invariant

При любом изменении:

width
length
height
pitch
roof type
overhang
opening
color
element visibility

не должно возникать:

смещения элементов;
рассогласования координат;
изменения фиксированной ширины панели;
изменения panel proportions;
разрыва trims;
смещения ridge;
смещения gutters;
проникновения trims внутрь здания;
перекрытия trims цоколем;
рассогласования стены и цоколя.
28. Geometry invariants

Должны сохраняться:

wall ↔ wainscot
wall ↔ panels
wall ↔ openings
roof ↔ trims
roof ↔ ridge
roof ↔ gutters
roof ↔ overhangs
foundation ↔ building

Все эти отношения должны происходить из одного geometry model.

29. Нельзя возвращаться к legacy architecture

Не использовать:

modules/

или старые legacy geometry implementations, если они не входят в production path.

Ориентир по структуре — текущий production repository начиная с:

982dafa
30. Документация

После завершения архитектурного рефакторинга обновить:

README.md
todo.md

Документация должна описывать реальный module graph, а не старую архитектуру.

В README явно зафиксировать:

builder
buildingGeometry
element orchestrators
colorise
texturiser
panelSystem
state/UI
resource lifecycle
31. Порядок реализации

Я бы зафиксировал такой порядок:

Phase 1 — Materials
Убрать локальный frameMat.
Убрать локальный steelMat.
Убрать локальный concreteMat.
Перевести все structural modules на colorise.js.
Централизовать structural colors.
Phase 2 — State isolation
Убрать ltState из awnings.js.
Перенести awning configuration в geometry.awnings.
Проверить остальные element modules на прямой импорт state.js.
Phase 3 — Geometry purity
Убрать residual building calculations из ridge.js.
Убрать residual building calculations из gutters.js.
Убрать residual building calculations из awnings.js.
Проверить trims.
Проверить roof/overhangs.
Phase 4 — Magic offsets
Найти все hardcoded spatial offsets.
Классифицировать каждый:
physical parameter;
element parameter;
geometry reference.
Убрать необъяснимые offsets.
Перенести необходимые параметры в правильный слой.
Phase 5 — Resource lifecycle
Реализовать dispose traversal.
Разделить shared/local materials.
Закрыть cloned materials.
Проверить textures.
Проверить rebuild через sliders.
Phase 6 — Verification
Проверить все размеры здания.
Проверить roof types.
Проверить overhangs.
Проверить panels.
Проверить wainscot.
Проверить trims.
Проверить ridge.
Проверить gutters.
Проверить awnings.
Проверить openings.
Проверить colors.
Проверить save/share/quote.
Проверить metric/imperial.
Phase 7 — Documentation
Обновить README.md.
Обновить todo.md.
Зафиксировать архитектурные invariants.
Критерий завершения

Рефакторинг считается завершённым, когда выполняется следующее:

builder.js
    = orchestrator


buildingGeometry.js
    = единственный источник building geometry


colorise.js
    = единственный источник shared materials/colors


texturiser.js
    = textures/maps


panelSystem.js
    = panel geometry/layout/material logic


element modules
    = создание своих THREE объектов


state.js
    ≠ источник geometry для renderers


legacy modules
    ≠ production path


rebuild
    = без GPU memory leak


UI changes
    = не ломают geometry invariants

И самое главное правило всей архитектуры:

Ни один element renderer не должен самостоятельно решать, где находится элемент здания. Он должен получить это решение из buildingGeometry и только построить соответствующий THREE.js объект.