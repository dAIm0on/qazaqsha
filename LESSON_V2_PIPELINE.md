# Lesson Package v2 — рабочий конвейер новых уроков

## Цель

Новый урок курса добавляется данными. Обычное добавление урока не должно требовать изменений `app.js`, `learning.js`, `homework.js`, `course-progress.js` или других runtime-файлов.

Runtime знает только универсальный Lesson Package v2. Специфическая генерация форм выполняется ДО деплоя и попадает в `compiled-lessons-v2.js` как обычные проверенные вопросы.

## Статусы

- `draft` — доступен на localhost/preview, запрещён на production.
- `reviewed` — контент проверен, но всё ещё запрещён на production.
- `released` — разрешён на `qazaqsha.pages.dev`.

Production-gate встроен одновременно в `lesson-v2-runtime.js` и `lesson-registry.js`.

## Один новый урок

1. Создать каркас:

```bash
node tools/scaffold-lesson.cjs 4-2 "Название урока"
```

2. В `lessons/4-2/` заполнить шаблоны и переименовать:
   - `sources.template.json` → `sources.json`
   - `lesson.template.json` → `lesson.json`
   - `corrections.template.json` → `corrections.json`
   - `qa-fixtures.template.json` → `qa-fixtures.json`

3. Источники. Минимум для обычного школьного урока:
   - методичка — `SCHOOL_NORM`
   - упражнения — `SCHOOL_NORM`
   - домашняя работа — `SCHOOL_NORM`
   - исследовательские материалы — отдельные `RESEARCH_VERIFIED`

4. Сначала переносится исходный материал, затем добавляется teaching layer:
   - `meaning`
   - `fullExplanation`
   - `decisionSteps`
   - примеры
   - контрасты/ловушки
   - границы темы
   - частые ошибки
   - `source_refs`
   - короткая проверка после блока

Полное объяснение не заменяется короткой карточкой. В v2 оно хранится целиком и доступно на каждом экране блока.

5. Практика:
   - исходные упражнения школы сохраняют `source_item` и `prompt_original`
   - research/gold задания хранятся как данные
   - большая вариативная практика может собираться compile-time generator plugin
   - generator plugin НЕ загружается браузером
   - грамматическая практика, где словарный запас не является целью, должна давать перевод

6. Новые слова:
   - `role: target` автоматически попадает в существующий словарный контур
   - многовариантный элемент использует `forms`, например `["да","де","та","те"]`
   - FSRS не создаётся на каждую сгенерированную форму: вопросы связываются с общими rule-level skills

7. Домашняя работа:
   - сохранить исходные пункты в `homework.source_items`
   - `exercise_ids` ссылаются на стабильные ID школьных заданий
   - `word_ids` — на vocabulary IDs
   - внешние тесты — `external_tasks`
   - print/PDF сохраняет source_item и content_revision

## Стабильные ID

ID нельзя строить из позиции в массиве.

Примеры:
- `v2:4-1:negative`
- `theory:4-1:negative`
- `src:4-1:m6:6-1-4`
- `gold:4-1:negative-01`
- `stage:4-1:negative`
- `vocab:4-1:tusinu`
- `gen:4-1:nonpast-core:kelu:1sg:negative`

Если меняется только формулировка текста, стабильный ID сохраняется. Если меняется смысл навыка/задания — нужен новый ID. `content_revision` используется для защиты staged-resume от старого evidence.

Если ID всё же переименован без изменения смысла, это делается явно:

```json
{
  "migrations": [{
    "from_revision": "4-2.r1",
    "to_revision": "4-2.r2",
    "question_ids": {"old-question-id": "new-question-id"},
    "chapter_ids": {"old-chapter-id": "new-chapter-id"},
    "stage_ids": {},
    "vocab_ids": {},
    "drop_question_ids": []
  }]
}
```

Runtime не угадывает переименования. Если старый staged practice относится к другой `content_revision`, он не может автоматически закрыть новый stage.

## Компиляция

```bash
node tools/compile-lessons.cjs
```

Compiler:
1. читает source lesson;
2. валидирует schema;
3. запускает только compile-time generator plugins;
4. разворачивает генераторы в обычные questions;
5. повторно валидирует уже compiled package;
6. записывает единый `compiled-lessons-v2.js`.

Добавление нового обычного урока не меняет список offline assets: браузер всегда получает тот же `compiled-lessons-v2.js`.

## Проверки

Обязательный общий контракт:

```bash
node verify_lesson_v2_contract.cjs
```

Для 4-1 есть дополнительный acceptance fixture:

```bash
node verify_lesson_v2.cjs
```

После компиляции обязательно:

```bash
node tools/compile-lessons.cjs
git diff --exit-code -- compiled-lessons-v2.js
```

Плюс все существующие legacy `verify_*.cjs`. Новая система не имеет права ослаблять старые тесты.

## QA release gate

До `status: released` обязательны:
- generic v2 contract PASS
- lesson-specific acceptance PASS
- все legacy verify PASS
- preview соответствует HEAD
- desktop browser QA PASS
- 390×844 PASS
- нет горизонтального уезда
- console errors PASS
- resume старого прогресса PASS
- словарный тренажёр видит новые target words
- домашка и print/PDF сохраняют исходную структуру
- Service Worker/offline retest PASS либо явно BLOCKED с причиной
- известные ошибки источника не проходят как gold

Только после этого статус урока меняется на `released`.

## Правило для AI-исполнителя

Для следующего урока сначала изменять только `lessons/<ID>/...`, затем запускать compiler/verifiers. Если для нового урока потребовалось менять `app.js`, сначала остановиться и доказать, почему существующего v2-контракта недостаточно. Не добавлять lesson-specific ветвление в runtime.

## Pilot

4-1 — первый pilot:
- 11 theory blocks
- 71 school exercises
- 23 research/gold questions
- 322 compile-time generated verb forms
- 10 target vocabulary items
- 7 staged checkpoints
- runtime получает 439 questions только из compiled data

PR: #19. Пока урок остаётся `draft`; production его не устанавливает.
