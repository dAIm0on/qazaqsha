# r7 → код: план шагов 1–3 и что делает PR шага 1

Основа: handoff `qazaqsha-document-handoff-Q5A-Q6B-r7-2026-10-06.zip` (SHA-256 `acf8edce…907f`, проверен), MANIFEST_R7, EDITS_R7, PASS-DOC r6→r7.
Точка отсчёта кода: `main` = `8d6b032` (тот же коммит, что в UI/Knowledge/state audit r7).
Решения владельца не пересматриваются: Q4=A, OPEN-NORM-1=A, Q5=A (T13=13), Q6=B, Q7/L-07 не монтировать, W-2=C, ударения не трогать.

## Шаг 1 — runtime + миграция прогресса (этот PR, draft)

| Контракт r7 | Что сделано | Что сознательно НЕ сделано |
|---|---|---|
| C-PROGRESS / ST-08…09 | `evidence-state.js`: новое пространство `state.evidence` (v1). Одноразовый маркер `r7-progress-1` (fingerprint входа, `history_partial`), снимок исходных байт `qazaq-kris-course-v1-before-r7` | schema остаётся 7: старые сборки продолжают читать экспорт/облако; откат = старая сборка просто игнорирует `evidence`. FSRS/records/skills/events/ДЗ не переписываются |
| C-ROUNDTRIP / ST-03, ST-10 | `progress.migrate/serialize/merge` проводят `evidence` через reload, экспорт/импорт, облако; merge двух устройств без двойного счёта | — |
| C-FIELD (минимум) | На каждую первую попытку: question-ID, индекс поля, fingerprint поля, урок, ревизия, origin | Полный sidecar field-key/mapping ревизий (2361 поле) — шаг 2 вместе с данными |
| C-RUNTIME / Q6-B | Реальный способ ответа по полю из DOM: кнопки (`hidden` input) = `choice`, иначе `typed`; `multi` = `choice`. choice/подсказка/показ ответа/rule-peek → не independent | Новые kind для блоков 3–4 (choice/tap-token/sort/word-bank/detect) не включены: enum/payload в r7 = PROPOSED (см. вопросы) |
| W-2=C | Хранение form-level evidence для `vocab:4-2:qalaisyn` (один source-ID, четыре формы из данных урока). `formStatus()` → full credit только при 4/4 | UI зачёта не меняется. Старый агрегат (`checklist.words`, completed) = `insufficient_evidence`, не 4/4 |
| Q5-A / C-ROLE | `word_question_ids` ДЗ строится из `homework.word_ids` через записанную связь source vocab-ID → catalog word-ID (на текущих данных набор идентичен прежнему во всех 11 уроках) | Сам JSON 4-2 (23→T13, текст `hw-item:4-2:3`) не меняется — это шаг 2 |
| C-HOMEWORK / ST-01…02 | Поведение ДЗ не изменено: без Knowledge.observe; исключение hinted+record → Again сохранено и закреплено verify | Новой политики нет |

Не тронуто: палитра/цвета, kb-compact, UI ошибки words-drill, ударения, свободная практика (`qazaqsha.freePractice.v1` не импортируется).

## Шаг 2 — fixtures + банк заданий (после ответа на вопросы)

1. Данные Q5-A: `lessons/4-2/lesson.json` → `homework.word_ids` = T13 в исходном порядке; текст только `source_items[2]` (`hw-item:4-2:3`, number "3"); 23 vocabulary-объекта, `source_items[3]`, `ext:4-2:bez-isk`, exercise_ids, checklist не меняются; `compiled-lessons-v2.js` через `tools/compile-lessons.cjs`; content_revision + `migrations` урока.
2. W-2=C: четыре отдельные проверки форм `Қалайсың / Қалайсыңдар / Қалайсыз / Қалайсыздар` (typed, по одной форме), без новых word-ID; подключение `formStatus` к статусу слов ДЗ 4-2.
3. Fallback `Lesson42Homework` (29 глаголов) — guard: не используется как T13 при наличии V2 (Q5-13).
4. Банк 3–4 (b34-*/up-*) с `origin`, пересечение с `homework.exercise_ids` = ∅ (автопроверка), FINAL_UNAIDED_TASK, без L-07; Q4/OPEN-NORM-1 в graded-ответах по решению владельца (`…ңмын/…ңмін`, `Мен сіздің мұғаліміңіз емеспін`), `corr:3-3:L-01/L-01b` не создавать.
5. Новые kind 3–4 (только после утверждения payload): schema → runtime → package ingress → UI → readAnswers → grader → evidence; в 1–2 новых kind нет (verify).
6. Field sidecar (FREG): field-key + ревизия + fingerprint, mapping при перестановке полей.
7. Verify: Q5-01…14, Q6-01…19, ST-04…07/11…12, H-01…08 из матрицы r7.

## Шаг 3 — прогон на ученике

По r7 (18_QA_ACCEPTANCE §0.1/§5 и матрица «обязательные доказательства»): на preview, не на production и не на реальном профиле Кристины.
- Проверяющий «cold-start»: видит только экран, не читал теорию урока, внешние источники = FAIL; фиксируются попытки, подсказки, названный сломанный шаг, время.
- Сценарии G (оригинальная ДЗ 4-2 и др.), H (новые слова ≥75%), A–F на смонтированной системе; протокол §5 построчно.
- Для W-2: каждая из 4 форм самостоятельно без подсказки ≥1 раза → full credit; до этого — нет.
- Доказательства: снимки state до/после, diff, повтор миграции, rollback на копии, export/import, cloud-merge; HOLD/unsupported/not_run отдельно от incorrect.

## Открытые вопросы (не решались за владельца)

1. W-2=C, что считается «форма выполнена»: в PR строгая политика `w2c-strict-v1` — только самостоятельный ввод одной формы (produce/single). Засчитывать ли распознавание (форма → перевод) и один общий ответ «все 4 формы»? Сейчас — записываются, но не засчитываются.
2. Q6-B payload/enum для блоков 3–4 в r7 — PROPOSED («согласовать exact payload/enum»). Утвердить предложение C-RUNTIME (choice с option-ID, tap-token, sort, word-bank, detect composite) или иначе?
3. Кнопки внутри fields (1-1, Q6-02) сейчас дают Knowledge-мастерство как ввод. В PR только записывается `choice`; менять ли mastery для блоков 1–2 (затронет текущих учеников)?
4. Частица `da/де/та/те` ↔ `да` (два catalog key) и canonical storage — BLOCKED_CONTRACT в r7; в PR не трогается.
5. Handoff r7 (04/01/17 §1) сам по себе запрещает код; основание для кода — прямое поручение Кристины в этой задаче.
