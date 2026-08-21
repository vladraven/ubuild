# U-Build: восстановленная функциональность фронтенда

Сравнение `legacy/` с текущим рефакторингом. Ниже — что было реально
потеряно и что я восстановил, плюс что осталось проверить.

## Изменённые/новые файлы в архиве

- `js/ui/UIAdapter.js` — правки
- `js/runtime/UBuildRuntime.js` — правки
- `js/interaction/CameraControls.js` — правки
- `js/interaction/ReferenceModelInteraction.js` — **новый файл**
- `js/integration/GravityFormsAdapter.js` — правки
- `js/elements/referenceModels/ReferenceModelsOrchestrator.js` — без изменений содержимого, включён для контекста (теперь подключается из runtime)

Скопируйте их поверх соответствующих файлов в `js/`.

## Что было подтверждено как регрессия и исправлено

1. **Reference Models (машины/погрузчик/самолёт/грузовик) были полностью
   отключены.** `ReferenceModelsOrchestrator.js` существовал, но нигде не
   импортировался — чекбоксы `.ref-model-checkbox` ничего не делали.
   Плюс отсутствовал drag машин мышью по сцене (был в legacy
   `external-references-models.js`).
   → Подключил оркестратор в `UBuildRuntime.js` (GLTFLoader, группа
   добавлена в сцену, публичный API `runtime.referenceModels`), добавил
   `ReferenceModelInteraction.js` для drag'а, привязал чекбоксы в
   `UIAdapter.js` (`bindReferenceModels`).

2. **Кнопка Reset сбрасывала только камеру**, а не весь дизайн. В legacy
   `initResetFeature()` после `confirm()` сбрасывала размеры, крышу, цвета,
   wainscot, mezzanine/crane/driveway, openings, reference-модели.
   → Переписал обработчик `btnReset` в `UIAdapter.js`: `confirm()` +
   `runtime.update(getBuildingModelDefaults())` + сброс галочек
   reference-моделей + сброс камеры.

3. **Quote-модалка (заявка на расчёт) теряла почти все данные.** Legacy
   `setupQuoteModal()` писала в форму цвета, wainscot, доп. элементы
   (interior walls/ceiling/mezzanine/crane), тенты, отдельные поля
   ширины/длины/высоты и ссылку на конфигурацию. Новая версия писала
   только скриншот и укороченный текст без всего этого.
   → Дополнил `formatBuildingSpecificationText()` в `GravityFormsAdapter.js`
   (цвета/доп.элементы/тенты) и добавил `fieldMap` для отдельных полей
   формы (`input_4_10/12/13/14`) + событие `show.bs.modal` для превью
   в момент открытия модалки (как в legacy), не только на клик отправки.

4. **Ввод недопустимых габаритов (шире/выше максимума) не давал
   обратной связи.** В новой модели `createBuildingModel()` бросает
   исключение при выходе за `LIMITS`, а `handleDimensionChange()` его не
   ловил — модель просто не обновлялась, без предупреждения пользователю.
   В legacy `checkAspectRatioViolations()` обрезала значение до максимума
   и показывала toast.
   → `handleDimensionChange()` в `UIAdapter.js` теперь берёт лимиты через
   `getBuildingModelLimits()`, клэмпит значение и показывает
   Bootstrap-toast с предупреждением (или без Bootstrap — свой fallback).

5. **Автовращение камеры при простое (idle auto-rotate) отсутствовало
   полностью** — не было даже механизма (`CameraControls.js` не имел
   цикла `requestAnimationFrame`, только render-on-demand). Legacy включала
   `controls.autoRotate = true` при старте и выключала при любом
   взаимодействии пользователя.
   → Добавил `setAutoRotate()`/собственный лёгкий rAF-цикл в
   `CameraControls.js`, включается в `runtime.start()`, выключается при
   pointerdown/wheel/переходе в inside-view — как в legacy.

## Важное уточнение — НЕ регрессия

Тенты/навесы (awnings, lean-tos) выглядели как полностью потерянная
фича — в новом коде нет вообще никакой JS-логики для `ltEnL/ltDropL/...`.
**Но это не баг рефакторинга**: я сверил PHP-шаблон `3d-design-tool-new.php`
в `legacy/` и в текущей версии — они побайтово идентичны, и весь блок
тентов в обеих версиях обёрнут в `<div style="display: none;">` с
комментарием "kept hidden exactly as before". То есть фича была скрыта
уже в legacy (флаг/WIP), и её JS-логика в рефакторинге закономерно не
переносилась. Трогать не стал, чтобы не включить то, что должно быть
выключено.

## Что нашёл, но НЕ успел исправить (нужно ваше решение/дальнейшая работа)

- **`validateAndClampOpenings`** (legacy `ui.js`) — при уменьшении здания
  окна/двери, которые перестают помещаться в стену, обрезались/удалялись
  и позиция окон поджималась к границам стены. Не нашёл эквивалента в
  новой модели/`OpeningOrchestrator` — надо проверить, не даёт ли
  geometry-слой просто визуальный артефакт (окно "вылезает" за стену)
  при сильном уменьшении здания.
- **Лимиты на overhangs/wainscotHeight** — та же потенциальная проблема,
  что была с шириной/высотой (необработанный `assertRange` → исключение
  без обратной связи), но я проверил и исправил только `dimensions.*`.
  Стоит проверить `bindOverhangs`/`bindWainscot` в `UIAdapter.js` по
  аналогии.
- Полный список функций legacy vs новой кодовой базы — см. ниже, для
  файлов `colorise.js`, `texturiser.js`, `panelSystem.js` соответствие
  переименовано (не потеряно), но детально построчно не сверял каждую —
  при необходимости могу пройтись отдельно по каждому модулю.

## Как применить

Скопируйте файлы из архива поверх `js/...` в вашем репозитории (пути
внутри архива совпадают со структурой репо), затем `git diff` — все
изменения точечные, без переписывания остальной логики.
