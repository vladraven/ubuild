# U-Build — Архитектура параметрического моделирования здания

## 1. Цель

Цель новой архитектуры — превратить U-Build из системы, в которой множество модулей повторно вычисляют координаты здания, в устойчивую параметрическую систему. Здание должно существовать прежде всего как математическая модель взаимосвязанных параметров и геометрических отношений. Three.js должен быть конечным представлением этой модели, а не местом, где хранится логика здания.

Главный принцип:

**Parameters → Building Model → Geometry Model → Element Orchestrators → Three.js**

При этом материалы, панели, текстуры и дополнительные модели являются независимыми ресурсными системами.

## 2. Источники истины

Система должна иметь строго определённые Single Sources of Truth:

* `BuildingModel` — независимые параметры здания;
* `BuildingGeometry` — производная пространственная модель;
* `PanelSystem` — правила панелей;
* `MaterialSystem` — физические материалы;
* `ColorSystem` — цвета;
* `TextureSystem` — текстуры и UV;
* `OpeningSystem` — двери и окна;
* `AdditionalModels` — дополнительные модели;
* `Environment` — внешняя сцена;
* `Lighting` — динамический свет.

Ни один renderer не должен создавать собственную альтернативную версию этих данных.

## 3. BuildingModel

`BuildingModel` содержит только параметры, которые пользователь действительно задаёт или которые являются независимыми конфигурационными значениями.

Примеры:

```text
width
length
height
roofType
pitch
overhangs
wall configuration
opening configuration
wainscot configuration
liner configuration
mezzanine configuration
crane configuration
awning configuration
driveway configuration
visibility
```

Здесь не должно быть Three.js objects, Mesh, Vector3 или готовых координат.

## 4. GeometryModel

`BuildingGeometry` получает `BuildingModel` и вычисляет полную пространственную модель здания.

Он определяет:

```text
building bounds
wall planes
wall edges
wall heights
roof planes
eaves
ridge
roof edges
foundation bounds
panel boundaries
frame lines
girt lines
purlin lines
opening boundaries
wainscot boundaries
trim reference lines
gutter reference lines
awning anchors
mezzanine anchors
crane anchors
```

Главное правило: если координата зависит от геометрии здания, она вычисляется здесь.

## 5. Anchors вместо координат

Вместо передачи десятков независимых `x/y/z` система должна передавать семантические anchors.

Например:

```text
geometry.walls.left.plane
geometry.walls.right.plane
geometry.walls.front.plane
geometry.walls.back.plane

geometry.roof.left.eave
geometry.roof.right.eave
geometry.roof.ridge

geometry.foundation.bounds
geometry.frames.lines
geometry.openings.front[]
```

Это делает зависимости явными.

## 6. Геометрические отношения

Geometry model должен описывать не только координаты, но и отношения:

```text
roof.ridge ↔ roof.planes
roof.eave ↔ wall.top
wall ↔ foundation
wall ↔ wainscot
wall ↔ panels
wall ↔ openings
roof ↔ trims
roof ↔ gutters
frames ↔ building envelope
purlins ↔ roof planes
girts ↔ wall planes
```

Если ширина здания изменяется, эти отношения пересчитываются системой geometry, а не отдельными renderers.

## 7. Разделение Geometry и Element Configuration

Нельзя помещать всё в один огромный `DEFAULTS`.

Например:

```text
BuildingGeometry
    → где находится ridge
    → какая его длина
    → относительно чего он расположен

RidgeConfig
    → ширина профиля
    → толщина
    → форма
    → профиль
```

Аналогично для trims, gutters, frames, panels и других элементов.

## 8. PanelSystem

`PanelSystem` является отдельным ядром.

Он отвечает за:

```text
panel width
panel height
panel spacing
panel count
last panel width
rows
boundaries
profile
rib density
wall panel color
wainscot panel color
roof panel configuration
UV layout
```

Wall и wainscot используют одну систему расчёта panel layout.

Изменение ширины здания не масштабирует стандартную панель. Оно меняет количество панелей и размер допустимого крайнего элемента согласно правилам системы.

## 9. ColorSystem

Цвет не является частью geometry.

Например:

```text
geometry.walls.front
    +
panelSystem.wallProfile
    +
colorSystem.wallColor
    +
materialSystem.panelMaterial
```

дают визуальный wall panel.

Цвета должны быть централизованы и не должны находиться в element renderers.

## 10. MaterialSystem

MaterialSystem отвечает за физические материалы:

```text
steel
structural steel
concrete
glass
roof metal
wall metal
trim metal
ceiling
interior wall
mezzanine
```

Материал описывает свойства поверхности, а не её положение.

Element renderer только запрашивает нужный material resource.

## 11. TextureSystem

TextureSystem отвечает за:

```text
albedo/color maps
normal maps
bump maps
roughness
UV
tiling
orientation
physical scale
```

TextureSystem не знает, где находится здание.

## 12. OpeningSystem

Openings являются отдельной параметрической системой.

Она отвечает за:

```text
type
width
height
position
side
vertical offset
collision rules
allowed zones
cutout geometry
```

Geometry engine получает openings и строит wall geometry с соответствующими holes/cutouts.

Renderer не должен самостоятельно решать, допустимо ли положение двери или окна.

## 13. StructuralSystem

Structural geometry должна быть производной от BuildingGeometry.

Например:

```text
BuildingGeometry
    → frame lines
    → girt lines
    → purlin lines
    → end wall column positions
```

Structural renderer превращает эти references в физические металлические элементы.

Он не пересчитывает размеры здания.

## 14. Element Orchestrator

Каждый элемент — orchestration layer.

Например:

```text
FoundationOrchestrator
WallOrchestrator
WainscotOrchestrator
RoofOrchestrator
FrameOrchestrator
GirtOrchestrator
PurlinOrchestrator
TrimOrchestrator
RidgeOrchestrator
GutterOrchestrator
AwningOrchestrator
LinerOrchestrator
MezzanineOrchestrator
CraneOrchestrator
DrivewayOrchestrator
LogoOrchestrator
```

Каждый получает:

```text
geometry
configuration
materials
colors
textures
```

и возвращает:

```text
THREE.Group
```

## 15. Что orchestrator не делает

Element orchestrator не должен:

* читать `state.js`;
* вычислять положение здания;
* вычислять roof pitch;
* определять положение других элементов;
* создавать альтернативную geometry model;
* создавать shared materials;
* использовать magic offsets;
* повторять формулы из `BuildingGeometry`.

Он отвечает только за сборку конкретного визуального элемента.

## 16. Foundation

Foundation получает:

```text
geometry.foundation
materialSystem.concrete
foundation configuration
```

и создаёт foundation meshes.

Он не знает, почему foundation находится именно в данной координате.

## 17. Walls

Walls получают:

```text
geometry.walls
geometry.openings
panelSystem
materialSystem
colorSystem
textureSystem
```

и создают wall groups.

## 18. Wainscot

Wainscot получает:

```text
geometry.wainscot
panelSystem
colorSystem
materialSystem
```

и создаёт нижние панели.

Wainscot не должен иметь собственную систему координат.

## 19. Roof

Roof получает готовые roof planes:

```text
geometry.roof.planes
geometry.roof.edges
geometry.roof.eaves
geometry.roof.ridge
```

и превращает их в meshes.

Pitch calculation отсутствует внутри Roof renderer.

## 20. Ridge

Ridge получает:

```text
geometry.roof.ridge
RidgeConfig
material
```

и создаёт только физический металлический профиль.

## 21. Trims

Trims получают готовые reference lines:

```text
eave
rake
ridge
roof edge
```

и создают физические profiles.

Они не вычисляют положение этих линий.

## 22. Gutters

Gutters получают:

```text
geometry.gutters.eaves
geometry.gutters.downspouts
GutterConfig
material
```

и создают gutters/downspouts.

## 23. Awnings

Awning geometry должна быть заранее рассчитана системой geometry:

```text
enabled
wall
anchor
width
depth
roof
post positions
post height
rotation
clearances
```

`awnings.js` только собирает модель.

Прямой доступ к `ltState` запрещён.

## 24. Additional Models

Дополнительные модели должны быть отделены от основной геометрии здания.

Например:

```text
logo
crane
mezzanine
driveway
awning
interior liner
```

Они получают anchors от BuildingGeometry, но не становятся источником этих anchors.

## 25. Rebuild pipeline

Полный rebuild должен выглядеть так:

```text
User changes parameter
        ↓
State update
        ↓
BuildingModel
        ↓
Validation
        ↓
BuildingGeometry
        ↓
PanelSystem
        ↓
OpeningSystem
        ↓
Element Orchestrators
        ↓
THREE Groups
        ↓
Scene
```

Никакой renderer не должен самостоятельно запускать собственный каскад пересчётов.

## 26. Resource lifecycle

При rebuild старое визуальное дерево удаляется через единый resource lifecycle.

Необходимо различать:

```text
shared resources
instance resources
```

Shared materials/textures нельзя уничтожать при удалении одного здания.

Instance-owned geometry/material/texture должны освобождаться.

## 27. Инварианты

После изменения любого базового параметра должны сохраняться:

```text
wall ↔ foundation
wall ↔ panels
wall ↔ openings
wall ↔ wainscot
roof ↔ wall
roof ↔ ridge
roof ↔ trims
roof ↔ gutters
roof ↔ overhangs
frames ↔ building
girts ↔ walls
purlins ↔ roof
```

Это не набор тестов на отдельные объекты. Это архитектурные invariants системы.

## 28. Запрет magic offsets

Любая пространственная поправка должна иметь физическое имя.

Недопустимо:

```text
y -= 0.135
```

Допустимо:

```text
y -= gutterOffsetY
```

где `gutterOffsetY` имеет документированный физический смысл.

## 29. Конечная модель

Идеальная структура:

```text
State
  ↓
BuildingModel
  ↓
BuildingGeometry
  ├── Walls
  ├── Roof
  ├── Foundation
  ├── Frames
  ├── Panels
  ├── Openings
  ├── Trims
  ├── Gutters
  └── Additional anchors

PanelSystem
MaterialSystem
ColorSystem
TextureSystem
  ↓
Element Orchestrators
  ↓
Three.js
```

Таким образом, изменение здания происходит в одном месте — параметрической модели. Геометрия пересчитывается централизованно. Визуальные элементы становятся потребителями данных, а не их источниками. Это принципиально устраняет текущую проблему, при которой изменение одного размера может привести к каскаду независимых формул и разрушению пространственной согласованности.
