# r7 Step 3 — прогон на ученице (открытые 1–4)

Канон: `docs/r7/R7_PLAN_AND_STEP1.md` §«Шаг 3»; handoff `18_QA_ACCEPTANCE.md` §0.1/§5 (G/H + A–F на смонтированной системе).

## Границы этого PR
- Только уроки **OPEN**: 1-1…4-2. **5-1 не открывать** (draft).
- 2-x legacy не трогать без находки прогона.
- Cold-start профиль (чистый localStorage), не профиль Кристины.
- Хост: prod `https://qazaqsha.pages.dev` или preview tip step3.

## Что проверяем (авто + ручной чеклист)
1. **Старт без краша** каждого OPEN-урока: Учёба → урок → путь (глава 1) → практика/ДЗ кнопки.
2. **Нет сырых кодов** на экране (UNKNOWN, error_key, snake_case skill ids) — через `tools/learner-text-scan.mjs` + step3 runner.
3. **Нет авторских меток** (Статус: разжёвано, Файл дыр, .md, Drive «Исходник») на path/practice.
4. **5-1 скрыт** без `?v2qa`; `ensure('5-1')===null`.
5. **ДЗ ≠ практика** где применимо (HW ∩ practice ids = 0 для v2 lessons с банком).
6. **W-2 smoke** (4-2 слова): счётчик/трек не раздувается до «всего курса» без ответа — наблюдение, не блокер без явного бага.
7. Сценарии G/H полностью вручную — вне авто; runner фиксирует NOT_RUN.

## Команды
```bash
node verify_r7_step3.cjs
node tools/step3-learner-run.mjs --host https://qazaqsha.pages.dev
# optional text scan on prod:
node tools/learner-text-scan.mjs --host https://qazaqsha.pages.dev/ --width 390
```

Отчёт: findings JSON + краткий markdown в `docs/r7/R7_STEP3_REPORT.md` (генерируется runner’ом в out dir).
