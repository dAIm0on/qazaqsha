# AI INGEST PROTOCOL — новый урок Qazaqsha через Lesson Package v2

Этот файл — единое задание для AI-исполнителя, который добавляет очередной школьный урок.

## Входные данные

Исполнитель получает:
- LESSON_ID, например `4-2`;
- название урока;
- три школьных источника: методичка, упражнения, домашняя работа;
- дополнительные исследования, если они уже есть;
- актуальную ветку Qazaqsha.

Канонический репозиторий определять по `00_СТАРТ_QAZAQSHA.md` / `MAP.md`. Не использовать старые локальные копии.

## Главный запрет

Обычный новый урок НЕ должен требовать lesson-specific изменений:
- `app.js`
- `learning.js`
- `homework.js`
- `course-progress.js`
- `lesson-v2-runtime.js`
- `lesson-registry.js`

Сначала работать только в:
- `lessons/<LESSON_ID>/...`
- при необходимости compile-time generator plugin в `tools/`

Если кажется, что нужно менять runtime, остановиться и сначала доказать, какой именно универсальный контракт отсутствует.

## Шаг 1. Создать каркас

```bash
node tools/scaffold-lesson.cjs <LESSON_ID> "<TITLE>"
```

Заполнять templates, затем переименовать в:
- `sources.json`
- `lesson.json`
- `corrections.json`
- `qa-fixtures.json`

Урок начинает жизнь только как:

```json
{
  "status": "draft",
  "release": {
    "approved": false,
    "preview_head": "",
    "preview_url": ""
  }
}
```

## Шаг 2. Разобрать школьные источники без интерпретационных потерь

Сначала построить точную карту источника.

Для методички:
- все определения;
- все таблицы;
- все правила;
- все примеры;
- все ограничения/оговорки;
- все фразы и словарь.

Для упражнений:
- номер модуля/упражнения;
- исходный prompt;
- stimulus;
- исходный ключ;
- перевод, если есть;
- связь с правилом.

Для домашки:
- каждый исходный пункт отдельно;
- список слов;
- внешние тесты/ссылки;
- любые требования по сдаче.

Школьный текст НЕ исправлять молча.

Если найден дефект:
1. сохранить оригинал;
2. добавить запись в `corrections.json`;
3. добавить known-bad fixture в `qa-fixtures.json`;
4. исправленный gold разрешён только с объяснением причины и source_ref.

## Шаг 3. Отделить школьную норму от расширенного исследования

Роли источников:
- `SCHOOL_NORM` — то, что реально дано ученику;
- `RESEARCH_VERIFIED` — расширение для понимания, методики и проверки;
- другие роли использовать только осознанно.

Research не должен стирать школьную терминологию. Он должен объяснять её понятнее и находить ошибки/дыры.

## Шаг 4. Построить teaching layer с нуля

Каждую новую тему разбить на маленькие смысловые блоки.

Обязательный theory contract каждого блока:
- стабильный `id`;
- `rule_id`;
- понятный `title`;
- `meaning` — что ученик должен понять до терминов;
- `fullExplanation` — полное объяснение простым русским;
- `shortHint` — краткое напоминание, НЕ замена полного объяснения;
- `decisionSteps` — алгоритм;
- `examples`;
- `contrastExamples`;
- `limitations` — что пока не изучаем;
- `commonConfusions`;
- `source_refs`;
- минимум одна короткая `check`.

Принцип подачи:
1. смысл;
2. знакомая русская логика/аналогия, если помогает;
3. один новый механизм;
4. разобранный пример;
5. ловушка;
6. короткая проверка;
7. выбор ученика: идти дальше или практиковаться ещё.

Не начинать с абстрактного грамматического термина, если смысл можно объяснить бытово.

## Шаг 5. Практика

Нужны три слоя.

### A. School source exercises

Сохранять:
- `source_item`;
- `prompt_original`;
- исходный порядок/идентичность;
- правильный source_ref.

### B. Research/gold

Небольшой набор специально подобранных заданий:
- ключевые якоря;
- контрасты;
- типичные ошибки;
- transfer на свежие примеры.

### C. Большой вариативный банк

Предпочтительно:
- compile-time generator plugin, если правило детерминированное;
- либо готовые `generated_questions` как данные.

Generator работает только при компиляции. Браузер не должен знать лингвистическую механику конкретного урока.

Если для нового типа упражнения нет generator plugin, это НЕ блокирует урок: сгенерировать reviewed `generated_questions` как data.

### Практика без словарного барьера

Если проверяется грамматика, а не слово:
- показывать перевод леммы/фразы;
- не заставлять ученика угадывать незнакомое значение;
- одинаковое слово не повторять подряд без причины;
- повторения разносить;
- большие банки использовать маленькими подходами;
- ученик сам решает, сколько ещё практиковаться.

## Шаг 6. Ошибки и remediation

Для каждого ключевого правила определить:
- ожидаемые error patterns;
- диагностический код;
- понятную feedback-фразу;
- fresh retry;
- delayed recheck.

Нельзя ограничиваться «неверно».

Если ошибка не классифицируется, сохранять её как unclassified для последующего анализа, но не придумывать причину.

## Шаг 7. Vocabulary

Каждое слово:
- стабильный lexical ID;
- lemma;
- translations;
- `role: target|context`;
- source_refs.

`target` автоматически должен попадать в существующий «Новые слова».

Если один учебный элемент имеет несколько обязательных форм, использовать `forms`.

Пример:

```json
{
  "id": "vocab:4-1:also",
  "lemma": "да/де/та/те",
  "forms": ["да","де","та","те"],
  "translations": ["тоже"],
  "role": "target"
}
```

## Шаг 8. Стабильные ID

Нельзя:
- `exercise-1`;
- ID по позиции массива;
- chapter-01 как постоянную идентичность.

Нужно:
- `v2:4-2:<semantic-rule>`
- `theory:4-2:<semantic-rule>`
- `src:4-2:<module>:<source-number>`
- `gold:4-2:<skill>-<case>`
- `stage:4-2:<semantic-stage>`
- `vocab:4-2:<lemma-slug>`

Если порядок блоков меняется, ID не меняются.

Если ID переименован без изменения смысла — добавить `migrations`. Runtime ничего не угадывает.

## Шаг 9. Prerequisites и границы темы

Явно заполнить:
- `prerequisites.lessons`;
- `skills_required`;
- `skills_review`;
- `scope.allowed`;
- `scope.blocked_future`.

Нельзя случайно тренировать будущую грамматику в примерах текущего урока.

## Шаг 10. Stages

Stage — это обязательная основная проверка, а не вся практика.

Требования:
- semantic stable stage ID;
- 3+ core questions;
- independent IDs;
- rule IDs;
- разумный min ratio;
- ровно один `final:true`, последний.

Не превращать optional practice после каждого theory block в обязательную оценку.

## Шаг 11. Домашка

`homework.source_items` обязана сохранять исходные пункты школьной домашки.

`exercise_ids` — реальные stable IDs школьных упражнений.

`word_ids` — target vocabulary.

Print/PDF должен сохранять:
- source_item;
- prompt_original;
- ответы ученика;
- content_revision.

## Шаг 12. Компиляция

```bash
node tools/compile-lessons.cjs
```

После компиляции:

```bash
git diff --exit-code -- compiled-lessons-v2.js
```

Если diff есть после второго запуска — compiler недетерминирован или snapshot устарел. Release запрещён.

## Шаг 13. Проверки

Всегда:

```bash
node verify_lesson_v2_contract.cjs
```

Если для урока есть acceptance verifier:

```bash
node verify_lesson_v2.cjs
```

И все legacy `verify_*.cjs`.

Нельзя ослаблять старые тесты ради нового урока.

## Шаг 14. Preview

Нужен реальный Cloudflare preview с доказанным HEAD.

Проверить:
- desktop;
- 390×844;
- console;
- resume;
- theory;
- optional practice;
- vocab;
- homework;
- PDF/print;
- offline/SW;
- отсутствие запросов к compile-time engines.

## Шаг 15. Release

До полного QA:
- `status: draft`;
- `release.approved:false`.

После полного PASS:
1. записать preview HEAD SHA40;
2. записать preview URL;
3. поставить approved_at/note;
4. `release.approved:true`;
5. `status: released`;
6. повторно compiler + все tests + новый preview;
7. только после явной команды пользователя можно merge.

## Финальный отчёт AI-исполнителя

```text
LESSON_ID:
BRANCH:
HEAD:
SOURCE_METHOD:
SOURCE_EXERCISES:
SOURCE_HOMEWORK:
THEORY_BLOCKS:
SCHOOL_EXERCISES:
GOLD_QUESTIONS:
COMPILE_TIME_GENERATED:
TARGET_VOCAB:
STAGES:
KNOWN_SOURCE_CORRECTIONS:
V2_CONTRACT:
LESSON_ACCEPTANCE:
LEGACY_VERIFY:
PREVIEW:
MOBILE_390x844:
CONSOLE:
OFFLINE_SW:
RELEASE_STATUS:
FINAL: PASS / FAIL / BLOCKED
```
