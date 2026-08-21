# U-Build: элементы игнорируют флаги visibility

## Причина бага на скрине

Часть orchestrator'ов вообще не читает `context.model.visibility.*` — они
показывают элемент, если у геометрии есть свои собственные данные
(`roof.type === 'gabled'`, `trimsData.enabled`, и т.д.), но флаг
`visibility.X` из настроек нигде не проверяют. Поэтому даже при
полностью `false` в `visibility` часть объектов всё равно рисуется.

На скрине видно ровно это:

- **Белая плоскость** — плита фундамента.
  `FoundationOrchestrator.js` проверял только `visibility.labels`
  (для подписей Front/Back/Left/Right), а саму плиту создавал
  безусловно.
- **Вертикальная палка в центре** — конёк крыши.
  `RidgeOrchestrator.js` вообще не знал о `visibility.ridge`, смотрел
  только на `roof.type`.
- **Две диагональные палки по бокам** — угловые триммы (corner trim).
  `TrimOrchestrator.js` проверял только свой внутренний
  `trimsData.enabled`, а `visibility.trims` не читал вообще.

## Что исправлено (проверил вообще все orchestrator'ы на этот баг)

| Файл | Флаг, который был проигнорирован |
|---|---|
| `js/elements/foundation/FoundationOrchestrator.js` | `visibility.foundation` |
| `js/elements/ridge/RidgeOrchestrator.js` | `visibility.ridge` |
| `js/elements/trim/TrimOrchestrator.js` | `visibility.trims` |
| `js/elements/gutters/GuttersOrchestrator.js` | `visibility.gutters` |
| `js/elements/logo/LogoOrchestrator.js` | `visibility.logo` |
| `js/elements/mezzanine/MezzanineOrchestrator.js` | `visibility.mezzanine` |
| `js/elements/crane/CraneOrchestrator.js` | `visibility.crane` |
| `js/elements/driveway/DrivewayOrchestrator.js` | `visibility.driveway` |
| `js/elements/liner/LinerOrchestrator.js` | `visibility.liner` |
| `js/elements/awning/AwningVisualProvider.js` | `visibility.awnings` |

Во всех случаях правка одна и та же: в начале `createObject()` (или
`create()`) добавлена ранняя проверка

```js
if (context.model?.visibility?.<flag> === false) {
    return root;
}
```

рядом с уже существующей проверкой на собственный `enabled`-флаг
геометрии (если он был).

`walls`, `roof`, `panels`, `wainscot`, `frames`, `girts`, `purlins`,
`endWallColumns` уже были корректно завязаны на `visibility` — их не
трогал.

## Отдельно: `ElementOrchestrator.js`

В архиве также лежит уже отправленный ранее фикс
`TypeError: object.traverse is not a function` (`update()` передавал в
`visual.dispose()` весь `{id, geometry, object}` вместо
`instance.object`). Включил его же файл сюда, чтобы не потерять — если
уже применяли отдельно, второй раз накатывать не обязательно, просто
сверьте.

## Как применить

Скопируйте файлы из архива поверх соответствующих путей в `js/` вашего
репозитория — правки точечные, ничего вокруг не переписывалось.
