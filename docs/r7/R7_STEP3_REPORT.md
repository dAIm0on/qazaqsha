# Step 3 learner run (auto)

- host: https://qazaqsha.pages.dev
- tip base: main `ab7c13c` (prod SW r7-51-6)
- fails: **0**, warns: **0** (path/practice/homework cold-start for 1-1…4-2)
- 5-1: hidden, `ensure=null` (start+end)

## Auto findings
Все OPEN-уроки: путь открылся, практика с формой, домашка открылась; pageerror нет; авторских меток/Mastery D нет.

## Наблюдения (не auto-fail)
- **3-3 практика**, первая карточка: заголовок «Сборник 1-1 · әке» — похоже на ярлык школьного листа (историческое имя сборника), не краш. Полный разбор G/H = NOT_RUN.
- Сценарии **G/H** и полный cold-start «не читал теорию» по §5 — **NOT_RUN** (нужен ручной/расширенный прогон).
- Известные находки плана (хаб слов 4-2 → vocab-must 1-1, line-clamp, и т.п.) — уже в шаге 2/2T, этим PR не трогаем.

## Артефакты
- `docs/r7/R7_STEP3_FINDINGS.json`
- скрины path: `/workspace/r7/step3/out/path-{1-1,3-1,4-2}.png`
