# U-Build — Архитектура окружения, сцены и динамического освещения

## 1. Назначение

Окружение должно быть отдельной системой, полностью независимой от геометрии здания. Здание является объектом, помещённым в окружающую среду. Scene не должна вычислять geometry здания, а BuildingGeometry не должна содержать информацию о времени суток, сезоне, погоде или освещении.

Целевая архитектура:

```text
Date / Time / Location
        ↓
Environment System
        ↓
Scene

Date / Time / Location
        ↓
Lighting System
        ↓
Scene

Building Model
        ↓
Building Geometry
        ↓
Building Renderers
        ↓
Scene
```

## 2. SceneSystem

`SceneSystem` отвечает за физическое пространство вокруг здания:

```text
Three.js Scene
Camera
Renderer
Terrain
Sky
Horizon
Background
Environment objects
Ground
Atmospheric presentation
```

SceneSystem не отвечает за геометрию здания.

## 3. Время

Система должна использовать реальную текущую дату и время пользователя либо явно заданные date/time параметры.

Дата является входом для EnvironmentSystem.

Время является входом для LightingSystem.

Необходимо предусмотреть возможность deterministic mode для тестирования, чтобы разработчик мог задать фиксированную дату и время вместо системных часов.

## 4. Сезон

Сезон определяется датой.

Базовая модель:

```text
December–February → Winter
March–May        → Spring
June–August      → Summer
September–November → Autumn
```

При необходимости система может использовать более точное astronomical/hemispheric season calculation.

Так как приложение может использоваться в разных географических регионах, сезон должен учитывать hemisphere, а не быть жёстко привязанным только к северному полушарию.

## 5. Seasonal Environment

EnvironmentSystem должен менять состояние окружения согласно сезону.

Примеры:

### Winter

```text
snow
bare trees
winter ground
lower vegetation density
winter sky
cold environmental appearance
```

### Spring

```text
green transition
young vegetation
spring ground
moderate sky conditions
```

### Summer

```text
full vegetation
green ground
summer sky
maximum vegetation state
```

### Autumn

```text
autumn vegetation
fallen leaves
different ground appearance
autumn sky
```

Главное правило: сезон не должен менять BuildingGeometry.

Здание остаётся тем же зданием.

## 6. Environment Data

EnvironmentSystem должен иметь собственную модель:

```text
EnvironmentState
    season
    hemisphere
    date
    groundProfile
    skyProfile
    vegetationProfile
    atmosphericProfile
    weatherProfile
```

Эти данные не должны находиться в `state.js` здания.

## 7. Ground

Ground является частью EnvironmentSystem.

Он не должен быть частью BuildingGeometry.

BuildingGeometry может предоставлять только необходимую информацию о положении здания относительно world origin.

Например:

```text
BuildingGeometry.bounds
```

EnvironmentSystem использует bounds для корректного размещения terrain/ground, но не изменяет здание.

## 8. Sky

Sky является отдельным компонентом SceneSystem.

Он должен учитывать:

```text
time
season
weather
sun position
atmospheric state
```

Sky не должен зависеть от wall/roof geometry.

## 9. LightingSystem

LightingSystem полностью отделяется от `scene.js`.

Он отвечает за:

```text
sun
ambient light
hemisphere light
sky illumination
shadow configuration
directional light
intensity
color temperature
```

`scene.js` создаёт сцену и регистрирует lighting resources, но не содержит расчёт положения солнца.

## 10. Положение солнца

Положение солнца должно вычисляться на основании:

```text
date
time
latitude
longitude
timezone
```

Минимальная модель:

```text
solar azimuth
solar elevation
```

Из них вычисляется направление DirectionalLight.

Таким образом, солнце утром находится низко с одной стороны, в полдень выше, вечером низко с другой стороны, а ночью direct sunlight отсутствует или становится минимальным.

## 11. Географическая привязка

Для физически корректного солнечного света необходимо иметь:

```text
latitude
longitude
timezone
```

Location должна быть частью Environment/Lighting configuration, а не BuildingGeometry.

В дальнейшем location может быть:

* фиксированной конфигурацией U-Build;
* настройкой пользователя;
* параметром проекта;
* географией конкретного заказчика.

## 12. Солнечный цикл

LightingSystem должен обеспечивать минимум четыре состояния:

```text
Night
Sunrise
Day
Sunset
```

При переходе между состояниями параметры света изменяются плавно.

Не должно быть резкого переключения:

```text
sun OFF
→
sun ON
```

если это не предусмотрено режимом производительности.

## 13. Dynamic Lighting

Освещение должно обновляться динамически.

Основной цикл:

```text
Current Date/Time
        ↓
Solar Position
        ↓
Light Direction
        ↓
Light Intensity
        ↓
Light Color
        ↓
Shadow Direction
        ↓
Scene
```

При изменении времени суток модель здания не перестраивается.

Меняется только lighting state.

## 14. Ambient Light

Ambient/hemisphere illumination должна зависеть от состояния неба.

Например:

```text
night      → low ambient
sunrise    → increasing ambient
day        → strong ambient
sunset     → decreasing ambient
```

Это позволяет избежать ситуации, когда солнце исчезло, а вся сцена остаётся одинаково освещённой.

## 15. Shadows

Directional sunlight должен управлять тенями здания.

Shadow camera должна быть настроена относительно текущего положения здания и солнца, но сама geometry здания остаётся независимой.

Для оптимизации shadow camera может получать только bounding box здания:

```text
BuildingGeometry.bounds
```

Это пример правильной зависимости:

```text
BuildingGeometry
        ↓
bounding information
        ↓
LightingSystem
```

а не:

```text
LightingSystem
        ↓
изменение BuildingGeometry
```

## 16. Weather

Weather должен быть отдельным слоем от season.

Например:

```text
clear
cloudy
rain
snow
fog
```

Season определяет базовое состояние среды.

Weather может временно изменять его.

Например:

```text
Winter + Snow
Summer + Rain
Autumn + Fog
```

Weather не должен изменять архитектуру здания.

## 17. Environment vs Lighting

Важно не смешивать эти системы.

`EnvironmentSystem` отвечает за:

```text
ground
sky appearance
season
vegetation
weather presentation
atmosphere
```

`LightingSystem` отвечает за:

```text
sun position
sun intensity
sun color
ambient illumination
hemisphere illumination
shadows
```

SceneSystem только объединяет их.

## 18. Scene lifecycle

Scene создаётся один раз.

Building rebuild не должен уничтожать:

```text
scene
camera
renderer
environment
lights
```

Перестраивается только building subtree.

Например:

```text
Scene
├── Environment
├── Lighting
├── Building
└── Helpers
```

При изменении размеров:

```text
Building
   ↓
dispose
   ↓
rebuild
```

Environment и Lighting остаются существовать.

## 19. Camera

Camera относится к SceneSystem.

Она может использовать bounds здания для автоматического framing:

```text
BuildingGeometry.bounds
        ↓
Camera framing
```

Но камера не должна влиять на geometry.

## 20. Raycasting

Raycasting относится к Scene/Interaction layer.

Он определяет, с каким объектом взаимодействует пользователь.

При этом object identity должна быть привязана к element metadata, а не к случайной структуре Three.js hierarchy.

## 21. Environment objects

Дополнительные объекты окружения должны быть отдельными resources:

```text
trees
snow
grass
ground details
clouds
environment props
```

Они не являются частью здания.

Их жизненный цикл должен управляться EnvironmentSystem.

## 22. Performance

Environment и Lighting должны обновляться отдельно от полного building rebuild.

Изменение времени:

```text
Lighting update
```

не должно вызывать:

```text
createBuildingGeometry()
```

Изменение сезона:

```text
Environment update
```

не должно перестраивать:

```text
walls
roof
frames
foundation
```

если только конкретный environmental effect не требует изменения визуального слоя.

## 23. Testability

LightingSystem должен поддерживать deterministic input:

```text
date
time
latitude
longitude
timezone
```

Например:

```text
2026-06-21
12:00
latitude
longitude
```

должны всегда давать одинаковое солнечное положение.

EnvironmentSystem аналогично должен принимать дату явно, чтобы сезонные тесты не зависели от текущей даты компьютера.

## 24. Архитектура файлов

Целевая структура может выглядеть так:

```text
js/
    model/
        buildingModel.js
        buildingGeometry.js
        openings.js

    panels/
        panelSystem.js
        panelProfiles.js

    materials/
        materials.js
        colors.js
        textures.js

    elements/
        foundation.js
        walls.js
        wainscot.js
        roof.js
        frames.js
        girts.js
        purlins.js
        trims.js
        ridge.js
        gutters.js
        awnings.js
        mezzanine.js
        crane.js
        driveway.js
        logo.js

    environment/
        environment.js
        seasons.js
        weather.js
        terrain.js
        sky.js

    lighting/
        lighting.js
        solarPosition.js
        shadows.js

    scene/
        scene.js
        camera.js
        interaction.js

    builder.js
```

Это пример логического разделения, а не требование сохранить именно эти имена.

## 25. Общая архитектура приложения

Итоговая система должна выглядеть концептуально так:

```text
                         ┌───────────────┐
                         │  UI / State   │
                         └───────┬───────┘
                                 ↓
                         ┌───────────────┐
                         │ BuildingModel │
                         └───────┬───────┘
                                 ↓
                       ┌───────────────────┐
                       │ BuildingGeometry  │
                       └─────────┬─────────┘
                                 ↓
                      ┌─────────────────────┐
                      │ Element Orchestrators│
                      └──────────┬──────────┘
                                 ↓
                           ┌───────────┐
                           │ Building  │
                           └─────┬─────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ↓                   ↓                   ↓
       PanelSystem        MaterialSystem       TextureSystem
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 ↓
                              Scene
                                 ↑
             ┌───────────────────┴───────────────────┐
             │                                       │
      EnvironmentSystem                         LightingSystem
             ↑                                       ↑
             │                                       │
       Date / Season                         Date / Time / Location
```

## 26. Главный архитектурный принцип

Здание, материалы, панели, дополнительные модели, окружение и освещение должны быть независимыми системами. Их объединяет только orchestrator/scene layer.

**BuildingGeometry отвечает на вопрос «где находится здание и его части». MaterialSystem отвечает «из чего это сделано». ColorSystem отвечает «какого оно цвета». PanelSystem отвечает «как устроена панельная раскладка». AdditionalModels отвечает «какие дополнительные объекты должны быть добавлены». Environment отвечает «что находится вокруг здания сейчас». Lighting отвечает «как сейчас падает свет». Scene отвечает «как всё это отображается вместе».**

При такой архитектуре изменение размеров здания не должно затрагивать материалы, цвета, сезон, освещение или окружение; изменение времени суток не должно пересчитывать геометрию здания; изменение материала не должно пересчитывать координаты; изменение сезона не должно разрушать архитектуру здания. Это и является основой устойчивого параметрического конфигуратора.
