# U-Build — Environment & Lighting Minimal API

## 1. Общий принцип

Environment и Lighting работают независимо от BuildingGeometry.

```text
Date/Time/Location
        ↓
Environment / Lighting
        ↓
Scene
```

Building rebuild не является частью этого цикла.

## 2. Environment input

```text
EnvironmentInput {
    date: ISODate,
    hemisphere: "north" | "south",
    weather: "clear" | "cloudy" | "rain" | "snow" | "fog",
    location?: {
        latitude: number,
        longitude: number,
        timezone: string
    }
}
```

## 3. Environment state

```text
EnvironmentState {
    date,
    season,
    hemisphere,
    weather,
    groundProfile,
    skyProfile,
    vegetationProfile,
    atmosphericProfile
}
```

## 4. Environment API

```text
createEnvironment(config)
getEnvironmentState()
updateEnvironment(input)
disposeEnvironment()
```

`updateEnvironment()` изменяет только environment resources.

Она не вызывает `createBuildingGeometry()`.

## 5. Season API

```text
getSeason(date, hemisphere)
```

Возвращает:

```text
"winter"
"spring"
"summer"
"autumn"
```

Функция должна быть deterministic.

## 6. Lighting input

```text
LightingInput {
    date: ISODate,
    time: string,
    timezone: string,
    latitude: number,
    longitude: number
}
```

## 7. Solar state

```text
SolarState {
    azimuth: number,
    elevation: number,
    sunrise: DateTime,
    sunset: DateTime,
    phase: "night" | "sunrise" | "day" | "sunset"
}
```

## 8. Lighting state

```text
LightingState {
    solar: SolarState,

    sun: {
        direction,
        intensity,
        color
    },

    ambient: {
        intensity,
        color
    },

    hemisphere: {
        intensity,
        skyColor,
        groundColor
    },

    shadows: {
        enabled,
        direction,
        cameraBounds
    }
}
```

## 9. Lighting API

```text
createLighting(config)
getSolarState(input)
getLightingState(input)
updateLighting(input)
disposeLighting()
```

`getSolarState()` не имеет побочных эффектов.

## 10. Update cycle

При каждом animation/update tick:

```text
currentDateTime
       ↓
getSolarState()
       ↓
getLightingState()
       ↓
updateLighting()
```

Для производительности solar calculation может выполняться только при изменении времени с необходимой точностью.

## 11. Building independence

Недопустимо:

```text
updateLighting()
    ↓
createBuildingGeometry()
```

Допустимо:

```text
BuildingGeometry.bounds
    ↓
Lighting shadow bounds
```

## 12. Environment independence

Недопустимо:

```text
updateEnvironment()
    ↓
rebuildBuilding()
```

если изменение environment не требует исключительно визуального изменения environment-dependent object.

## 13. Scene API

```text
createScene()
attachBuilding(group)
attachEnvironment(group)
attachLighting(lights)
updateScene()
disposeScene()
```

Scene не вычисляет geometry здания.

## 14. Deterministic mode

Все вычисления должны работать от явного времени:

```text
getSolarState({
    date,
    time,
    timezone,
    latitude,
    longitude
})
```

а не непосредственно от `new Date()` внутри расчётной функции.

Текущая дата может использоваться только на уровне application adapter.

## 15. Runtime adapters

Production:

```text
System Clock
    ↓
Application Time Adapter
    ↓
Environment / Lighting
```

Tests:

```text
Fixed Date/Time
    ↓
Environment / Lighting
```

## 16. Performance invariant

Изменение времени суток:

```text
Lighting update
```

Изменение сезона:

```text
Environment update
```

Изменение размеров:

```text
Building rebuild
```

Это три независимых lifecycle операции.