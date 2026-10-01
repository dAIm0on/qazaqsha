# CURRENT_PROBLEM — Qazaqsha / «Форма слова» 1:1

Дата фиксации: 2026-10-01  
База: `dAIm0on/qazaqsha`  
Ветка работы: `feature/form-word-1to1-40x40-20261001`  
Baseline HEAD: `f6788e3e2d737b029c851e54288c14f6b33b21d6`  
Production: https://qazaqsha.pages.dev/

## 1. Что именно сломано сейчас

Проблема системная для всех 40 NAV2-уроков: навигационный каталог описывает урок как небольшой набор `steps[]`, а каждый обычный шаг указывает один `sourceHeadingId`. Runtime затем извлекает только этот heading и соседние блоки до следующего `subheading`.

Текущая цепочка:

`lesson -> steps[] -> sourceHeadingId -> slice(sourceHeadingId) -> блоки до следующего subheading -> UI`

Это не является полным отображением исходного learner-материала. Наличие heading в уроке доказывает только наличие одной выбранной секции, а не полный охват предназначенных уроку paragraph/example/table/warning/list/term/try/contrast.

## 2. Где происходит выборочная фильтрация

Файл `morph-nav2.js`.

Функция `slice(headingId)`:
- находит старый learner-lesson через префикс heading;
- находит индекс конкретного `sourceHeadingId`;
- начинает собирать блоки с этого места;
- прекращает сбор при следующем `subheading`.

Функция построения учебного шага затем делает:

`const blocks = step.sourceHeadingId ? slice(step.sourceHeadingId) : []`

и рендерит только этот slice.

Следовательно, сама архитектура renderer не умеет доказать, что ученик получил весь диапазон исходного содержания.

## 3. Где это видно в каталоге

Файл `morph-nav2-catalog.js`.

Примеры:
- `nav2.2.2` содержит только `sourceHeadingId: "pl.7"`;
- `nav2.2.3` также опирается на `pl.7`;
- `nav2.2.4` — на `pl.13`.

При этом исходный `learner.pl.several` содержит больше обязательных единиц: шесть вариантов множественного числа, группы конечных звуков, полную таблицу, различие после р/л, ограничения и примеры. Один heading не является эквивалентом всего этого набора.

Тот же паттерн используется и в остальных частях курса.

## 4. Почему это даёт потерю материала

`morph-learner-v2.js` уже содержит подробный ученический слой. Но NAV2 не строит маршрут из полного ordered списка его блоков. Он выбирает несколько опорных heading и поэтому часть исходных единиц:
- не имеет render target в основном маршруте;
- остаётся только в старом полном разборе/справочнике;
- либо вообще не достигается из конкретного NAV2-урока.

Это противоречит новому контракту 01.10.2026: полный исходный материал должен доходить до ученика, а сокращаться может только объём одного экрана.

## 5. Практика

Текущий NAV2 в основном открывает существующий `practiceOpen`/free-practice блок. В исторической реализации значительная часть задач строилась как распознавание уже сгенерированной правильной формы и distractor.

Такой механизм полезен как один из ранних уровней, но не доказывает продуктивный навык. Для каждого продуктивного навыка требуется закончить лестницу заданием, где правильная полная форма заранее не показана:
- наблюдение;
- один признак;
- часть окончания;
- следующий выбор;
- полное окончание;
- сборка;
- самостоятельный ввод;
- новое слово;
- смешанный выбор правила.

`FINAL_UNAIDED_TASK` должен быть явным и проверяемым.

## 6. Runtime-файлы, которые участвуют

Минимально:
- `morph-learner-v2.js` — канонический ученический материал;
- `morph-nav2-catalog.js` — NAV2 7 частей / 40 уроков и текущие выборочные связи;
- `morph-nav2.js` — маршрутизация и renderer;
- `morph-ui.js` — интеграция раздела;
- `free-practice-content.js`;
- `free-practice-config.js`;
- `free-practice-view.js`;
- `free-practice-queue.js`;
- `free-practice-state.js`;
- `morph-state.js`;
- `morph.css`;
- `sw.js`.

Защищённые языковые данные и scoring без отдельной необходимости не менять:
- `morph-data.js`;
- `morph-engine.js`;
- `morph-gold.json`;
- FSRS/scored assessment state.

## 7. Новая архитектура 1:1

Целевая цепочка:

`canonical learner source -> source inventory -> lesson source manifest -> deterministic screen compiler -> renderer -> student`

Для каждого NAV2-урока будет машинно проверяемая полная связь:
- `lessonId`;
- `orderedSourceUnitIds[]`;
- при необходимости reusable/shared source units;
- learning outcome;
- practice skill metadata;
- `FINAL_UNAIDED_TASK` либо явное обоснование observation-only.

`sourceHeadingId` больше не будет механизмом доказательства полноты урока.

Renderer:
- получает source unit по ID из `morph-learner-v2.js`;
- сохраняет исходный текст/данные объекта без редакторского сжатия;
- сохраняет порядок;
- сохраняет тип блока;
- группирует единицы только для размера экрана;
- не имеет функции summary/shorten.

## 8. Как будет обеспечиваться 100% coverage

Будет создан machine inventory всех learner-required source units с:
- sourceUnitId;
- source lesson;
- type;
- source order;
- normalized fingerprint/hash;
- required.

Из lesson manifest автоматически строится обратный индекс `sourceUnitId -> render targets`.

Gate:
- каждый required source unit имеет минимум один render target;
- ни одна обязательная единица не имеет `OMITTED`/`SHORTENED`;
- special-type coverage = 100%;
- порядок source units внутри каждого назначенного диапазона совпадает с каноном.

Повторное использование одной единицы в нескольких уроках допустимо и не считается ошибкой.

## 9. Как будет проверяться текстовая идентичность

UI не будет хранить переписанную копию канонического блока для обычной теории. Renderer получает объект непосредственно из learner source по ID.

Для QA нормализуется только техническая разметка/пробелы. Для каждой единицы считается fingerprint. Если содержание source unit было заменено, потеряна строка таблицы, пример, перевод или условие — fidelity gate = FAIL.

Дополнительные UI-подписи/переходы не считаются заменой source content.

## 10. Состояние и миграция

Сохраняются существующие:
- active lesson / per-lesson cursor;
- viewed;
- attempted;
- skipped;
- correctWithoutHint;
- correctWithHint;
- drafts;
- free-practice queue;
- occurrenceId;
- return/excursion context;
- assessment;
- FSRS.

Новый screen compiler детерминирован относительно catalog/content version. Старые числовые step cursors мигрируются через стабильный source anchor/alias там, где он доступен; просмотр старого шага не превращается в знание новых дочерних шагов.

Перед первой записью новой schema сохраняется versioned backup. Повторная миграция идемпотентна.

## 11. Тесты, которые будут добавлены/усилены

1. Source inventory consistency.
2. 40/40 lesson manifest completeness.
3. Source coverage = 100%.
4. Text fidelity = 100%.
5. Table/scheme/example/warning/contrast coverage = 100%.
6. Order fidelity = 100%.
7. No unresolved `sourceHeadingId` as coverage mechanism.
8. No hidden technical codes in student UI.
9. Every productive lesson has an unaided verification path or documented observation-only reason.
10. State migration/save-resume/return-context regression.
11. Existing verify scripts remain green.
12. Preview black-box: desktop, 390×844, 200% zoom, back/forward, reload, rule/practice return, Kazakh input, wrong/hint/reveal/unaided/end/next.
13. Offline/service-worker regression.

## 12. Ограничение публикации

Работа выполняется в отдельной ветке. Merge и production не выполняются без отдельного разрешения Крис и запрещены при любом обязательном FAIL.

## 13. Главный неизменяемый контракт

НЕЛЬЗЯ СОКРАЩАТЬ УЧЕБНЫЙ МАТЕРИАЛ РАДИ КОРОТКОГО УРОКА. МОЖНО СОКРАЩАТЬ ТОЛЬКО ОБЪЁМ ИНФОРМАЦИИ НА ОДНОМ ЭКРАНЕ.
