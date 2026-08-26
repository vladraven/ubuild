# UIAdapter.js: разбивка на контроллеры (коммит ab9b6df)

`UIAdapter.js` был 2075 строк и совмещал 8+ ролей. Разбил на отдельные
файлы-контроллеры под `js/ui/controllers/`, `UIAdapter.js` теперь только
создаёт их и связывает — сам не содержит доменной логики.

## Как распаковать

Разархивируйте прямо в ваш `js/`-каталог — структура внутри архива уже
`js/ui/...`, файлы лягут куда нужно. `UIAdapter.js` заменит существующий,
`js/ui/controllers/` — новая папка.

## Что куда переехало

| Было в UIAdapter.js | Стало |
|---|---|
| toDisplay/toMeters, isImperial, bindUnits, syncDistSlidersToUnit, unit-label sync | `js/ui/controllers/units-controller.js` |
| bindDimension, handleDimensionChange, showDimensionToast, width/length/height sync | `js/ui/controllers/dimensions-controller.js` |
| bindPitch, bindRoofControls, getPitchLimits, updatePitchControls, formatPitchRatio, parsePitchInput, roof type/profile/wall-profile sync | `js/ui/controllers/roof-controller.js` |
| bindOverhangs, overhang F/B/L/R sync | `js/ui/controllers/overhangs-controller.js` |
| bindWainscot, wainscot sync | `js/ui/controllers/wainscot-controller.js` |
| normalizeColorKey, getColorTarget, setColor, bindColors, color sync | `js/ui/controllers/colors-controller.js` |
| bindVisibility, visibility checkbox sync | `js/ui/controllers/visibility-controller.js` |
| bindReferenceModels | `js/ui/controllers/reference-models-controller.js` |
| bindInformationNotice | `js/ui/controllers/information-notice-controller.js` |
| setElementVal, setElementChecked (использовались вообще всеми) | `js/ui/dom-helpers.js` |
| `updateInputsFromModel()` (был один гигантский метод на 300 строк) | **разнесён по контроллерам** — каждый контроллер сам умеет `syncFromModel()` для своей части DOM. `UIAdapter.js` просто вызывает их все по очереди в `syncAll()`. Отдельного "ModelSync"-файла нарочно не делал: DOM-синхронизация — не отдельная роль, а часть каждого домена (синхронизировать поля ширины — работа Dimensions-контроллера, а не какого-то стороннего синхронизатора). |
| Actions orchestration | не трогал — `UIActions.js` уже был отдельным файлом, как и был |

## Что НЕ трогал специально

- **`js/ui/UIActions.js`** — уже был отдельным файлом, не относится к
  распухшему `UIAdapter.js`, оставил как есть.
- **`js/ui/UIColorAdapter.js`** — нашёл в кодовой базе при разборе. Это
  мёртвый код: 834 строки, `createUIColorAdapter()` нигде не
  импортируется и не вызывается — ни из `app-new.js`, ни из старого
  `UIAdapter.js`. Не относится к текущей задаче (это не то, что было
  внутри `UIAdapter.js`, а отдельный неиспользуемый файл), поэтому не
  трогал и не удалял — заметил на всякий случай, если захотите
  разобраться отдельно.

## На что обратить внимание при точной проверке поведения

Постарался сохранить оригинальное поведение один в один, включая пару
неочевидных мест:

- **`colors-controller.js`** (`setColor`) и **`visibility-controller.js`**
  — в оригинале эти два места звали `runtime.update()` **напрямую**, без
  последующего вызова `updateInputsFromModel()` на весь UI (в отличие от
  dimensions/roof/overhangs/wainscot, которые всегда дёргали полный
  ресинк). Сохранил это как есть — то есть смена цвета или галочки
  visibility не будет заново перерисовывать все остальные контролы,
  ровно как было раньше.
- **`roof-controller.js`** (`applyRoofType`, переключение
  gabled/left-sloped/right-sloped) — в оригинале после
  `runtime.update(nextModel)` шёл прямой вызов `updateInputsFromModel()`.
  Сделал то же самое через `syncAll` (а не через общий `update(patch)`),
  чтобы не было двойного `runtime.update()` подряд.

## Публичный API не изменился

`app-new.js` дёргает только `createUIAdapter(runtime).init()` — эта
сигнатура не тронута. `UIAdapter.js` по-прежнему возвращает `{ init,
updateInputsFromModel, toDisplay, toMeters, saveDesign, renderGallery,
renderCompare }` — на случай, если что-то ещё в шаблоне или консоли
браузера дергает эти методы напрямую.

## Проверка

Прогнал весь граф модулей через Node с замоканным `document`/`window` —
`init()`, `toDisplay`/`toMeters`, `updateInputsFromModel()` отрабатывают
без ошибок, все контроллеры создаются и связываются корректно. Полный
рендер в браузере (реальный DOM/Three.js) не тестировал — рекомендую
пройтись по всем контролам глазами после установки: размеры, крыша
(тип/профиль/pitch), свесы, wainscot, цвета, чекбоксы visibility,
единицы измерения, reference-модели.
