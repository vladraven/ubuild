# U-Build — BuildingModel & BuildingGeometry Schema

## 1. Назначение

Этот документ определяет формальный контракт между параметрами здания и его производной геометрией. `BuildingModel` содержит только независимые параметры конфигурации. `BuildingGeometry` содержит только производные пространственные данные. Ни один element renderer не имеет права самостоятельно вычислять положение части здания.

## 2. Единицы

Внутренняя система измерений — метры.

- `width`, `length`, `height` — m
- `wallThickness`, `roofThickness` — m
- `pitchRatio` — dimensionless
- `pitchAngle` — radians
- `overhangs` — m
- координаты — m
- rotations — radians
- colors — normalized/UI color representation
- dates — ISO-8601
- time — local time with timezone
- latitude/longitude — degrees

UI может работать в imperial, но преобразование происходит до передачи данных в `BuildingModel`.

## 3. BuildingModel

```text
BuildingModel {
    dimensions: {
        width: number,
        length: number,
        height: number
    },

    roof: {
        type: "gabled" | "left-sloped" | "right-sloped",
        pitchRatio: number,
        overhangs: {
            front: number,
            back: number,
            left: number,
            right: number
        }
    },

    walls: {
        thickness: number
    },

    foundation: {
        enabled: boolean,
        height: number
    },

    panels: {
        profile: string,
        wallHeight: number,
        wainscotHeight: number
    },

    openings: Opening[],

    awnings: AwningConfiguration[],
    liner: LinerConfiguration,
    mezzanine: MezzanineConfiguration,
    crane: CraneConfiguration,
    driveway: DrivewayConfiguration,
    logo: LogoConfiguration,

    visibility: VisibilityState
}
```

## 4. Opening

```text
Opening {
    id: string,
    type: "Window" | "Door",
    side: "F" | "B" | "L" | "R",
    x: number,
    yOff: number,
    width: number,
    height: number
}
```

Opening configuration не содержит готовых world coordinates.

## 5. Geometry root

```text
BuildingGeometry {
    bounds,
    walls,
    foundation,
    roof,
    panels,
    openings,
    frames,
    girts,
    purlins,
    endWallColumns,
    wainscot,
    trims,
    ridge,
    gutters,
    awnings,
    liner,
    mezzanine,
    crane,
    driveway,
    logo
}
```

## 6. Bounds

```text
Bounds {
    min: Vector3,
    max: Vector3,
    center: Vector3,
    width: number,
    height: number,
    length: number
}
```

Bounds являются производными от BuildingModel.

## 7. Wall geometry

```text
WallGeometry {
    side,
    plane,
    bounds,
    profile,
    openings,
    topEdge,
    bottomEdge,
    corners
}
```

Wall geometry является единственным источником пространственных данных для wall-related elements.

## 8. Roof geometry

```text
RoofGeometry {
    type,
    pitchRatio,
    pitchAngle,
    rise,
    planes[],
    edges[],
    eaves: {
        left,
        right
    },
    ridge,
    overhangs,
    bounds
}
```

Roof renderer получает готовые planes/edges/eaves/ridge и не повторяет расчёт pitch.

## 9. Foundation geometry

```text
FoundationGeometry {
    bounds,
    height,
    footprint,
    top,
    bottom
}
```

Foundation renderer только превращает эту информацию в mesh.

## 10. Panel geometry

```text
PanelGeometry {
    side,
    rows[],
    panels[]
}

Panel {
    index,
    bounds,
    width,
    height,
    isLast,
    profile
}
```

PanelSystem отвечает за layout. BuildingGeometry предоставляет envelope и допустимые границы.

## 11. Structural geometry

```text
StructuralGeometry {
    frames[],
    girts[],
    purlins[],
    endWallColumns[]
}
```

Каждый structural reference должен содержать anchor/line/bounds, необходимые renderer'у.

## 12. Openings geometry

```text
OpeningGeometry {
    id,
    side,
    bounds,
    cutout,
    anchor
}
```

Collision и validity проверяются до создания render geometry.

## 13. Trims

```text
TrimGeometry {
    eaves[],
    rake[],
    ridge[],
    roofEdges[]
}
```

Trim renderer не вычисляет roof edge position.

## 14. Gutters

```text
GutterGeometry {
    eaves[],
    downspouts[],
    outlets[],
    anchors[]
}
```

Downspout positions являются производной частью geometry.

## 15. Additional geometry

Каждый дополнительный элемент получает собственный namespace:

```text
geometry.awnings
geometry.liner
geometry.mezzanine
geometry.crane
geometry.driveway
geometry.logo
```

## 16. Invariants

Обязательные invariants:

```text
wall ↔ foundation
wall ↔ wainscot
wall ↔ panels
wall ↔ openings
roof ↔ wall
roof ↔ ridge
roof ↔ trims
roof ↔ gutters
roof ↔ overhangs
frames ↔ building envelope
girts ↔ walls
purlins ↔ roof
```

При изменении width/length/height/pitch/roofType/overhangs ни один invariant не должен нарушаться.

## 17. Fixed panel invariant

Стандартная ширина панели не изменяется при изменении ширины здания.

Изменяется:

```text
panel count
last panel width
panel positions
```

но не масштаб стандартной панели.

## 18. Geometry ownership

`BuildingGeometry` владеет пространственными зависимостями здания.

`PanelSystem` владеет panel layout.

`MaterialSystem` владеет materials.

`ColorSystem` владеет colors.

`TextureSystem` владеет textures.

Renderer владеет только созданными Three.js objects.

## 19. Запрещено

Element renderer не может:

```text
import state.js
calculate building coordinates
calculate roof pitch
calculate eave position
calculate ridge position
calculate gutter position
create duplicate shared materials
use unexplained spatial offsets
```

## 20. Главный контракт

```text
BuildingModel
    ↓
BuildingGeometry
    ↓
Element Orchestrator
    ↓
THREE.Object3D
```

Любое нарушение этой цепочки считается архитектурным дефектом.