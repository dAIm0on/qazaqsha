# R7 2T-a — уроки 1-1…2-3 (часть)

SW: `qazaq-offline-live-20261006-r7-2ta-2`.

| Сделано | Детали |
|---------|--------|
| Ударения убраны | 1-2 (2), 2-1 (4), 2-2 (1). 3-2/3-3 оставлены для 2T-b. `verify_r7_step2_homework_t13` ждёт 7. |
| line-clamp | `#question-title.practice-prompt` / `.practice-prompt` / `.question-note` — вопрос целиком |
| contentRevision после F5 | `progress.js` сохраняет `grammarPath.contentRevision`; `persistLessonPath` не затирает известную ревизию null-ом |
| «пройдено» при bump | `loadLessonPath` / `pathNeedsV2TheoryReplay`: bump content_revision alone (те же chapter id) **не** сбрасывает done; reset только legacy/unmapped / явный `pathNeedsReplay` |
| content_revision bump | один раз на изменённые уроки: 1-2.r2, 2-1.r2, 2-2.r2 (+ migrations). 1-1/1-3/2-3 без правок текста — без bump |
| 3-1 «Методичка откладывает…» | не трогали (2T-b / R7_2T_LIST) |

## Не сделано в этом PR (осталось на 2T-a или отдельно)
- Полная сверка текстов теории 1-1…2-3 с методичкой сайта / r7-источниками (~50 глав).
- Любые спорные правила из методички (пока только ударения + рендер + contentRevision).


## T15 (grammar-paths)
Строка «Ударение: бо́лыңыз…» снята: T15 = прощания 2-3 (GRAM_T15), в зоне 1–2; ударение не ставим. 3-x (бала́мыз / Анамы́з) не трогали.
