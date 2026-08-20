# U-Build — Migration Roadmap

## Этап 0 — Baseline

Зафиксировать текущий production commit и функциональное поведение. До изменения архитектуры пройти Regression Checklist и получить baseline screenshots/tests. Текущий функционал не считается допустимым для удаления только потому, что его реализация неудобна.

## Этап 1 — Geometry Invariants

Главная задача — сделать `buildingGeometry.js` единственным источником пространственных зависимостей. Убрать residual spatial math из `builder.js`, `awnings.js`, `gutters.js`, `ridge.js`, `trims` и других element modules. Ввести семантические geometry namespaces: `walls`, `roof`, `foundation`, `panels`, `openings`, `frames`, `trims`, `gutters`, `additional`. После каждого изменения прогонять geometry invariants.

**Результат:** изменение width/length/height/roof/pitch/overhangs не приводит к расхождению элементов.

## Этап 2 — Resource Architecture

Разделить:

```text
geometry
colors
materials
textures
element configuration
```

Централизовать shared materials. Убрать duplicate material creation. Ввести ownership model и единый dispose mechanism для instance-owned resources.

**Результат:** rebuild не создаёт неконтролируемые resource leaks и не уничтожает shared materials.

## Этап 3 — Element Orchestrators

Каждый element renderer сделать чистым orchestrator:

```text
geometry + config + resources → THREE.Group
```

Удалить прямое чтение `state.js`. Особенно проверить awnings, gutters, ridge, trims, structural elements.

**Результат:** element modules больше не знают архитектуру здания.

## Этап 4 — Environment

Создать отдельный EnvironmentSystem:

```text
date
hemisphere
season
weather
terrain
sky
vegetation
atmosphere
```

Scene перестаёт быть владельцем building logic. Environment обновляется независимо от building rebuild.

**Результат:** сезон меняет окружение, но не геометрию здания.

## Этап 5 — Lighting

Создать LightingSystem и SolarPosition:

```text
date
time
timezone
latitude
longitude
        ↓
solar position
        ↓
sun / ambient / shadows
```

Ввести deterministic mode для тестов.

**Результат:** изменение времени суток обновляет свет без rebuild здания.

## Этап 6 — Scene Separation

Получить окончательную структуру:

```text
Scene
├── Environment
├── Lighting
├── Building
└── Interaction
```

Scene владеет только визуальным world lifecycle.

## Этап 7 — Cleanup

После стабилизации удалить legacy geometry implementations, дублирующиеся расчёты, unused constants, старые material creation paths и временные compatibility layers. Обновить README/todo архитектурой, которая реально работает.

## Правило миграции

Нельзя одновременно менять geometry, rendering, materials и UI без промежуточной проверки. Каждый этап должен оставлять приложение работоспособным.

## Definition of Done

Миграция считается завершённой, когда:

1. все существующие функции проходят Regression Checklist;
2. BuildingGeometry является единственным источником building spatial relationships;
3. renderers не читают state;
4. shared resources централизованы;
5. environment независим от building;
6. lighting независим от building;
7. rebuild не ломает geometry invariants;
8. dynamic lighting не вызывает building rebuild;
9. resource lifecycle корректен;
10. legacy architecture удалена.