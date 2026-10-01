# 09 — Regression QA

REGRESSION: PASS для runtime implementation `4a0a89871c052fc8b277c013e172e906347b2f84`.

GitHub Actions Verify Qazaqsha #114:
- conclusion: SUCCESS;
- 47 verification scripts PASS;
- `VERIFY_MORPH_NAV2_1TO1 PASS`;
- 40 lessons;
- 508 source units;
- 508 mapped source units;
- sourceCoverage = 1;
- 235 compiled source screens;
- 39 productive lessons;
- `VERIFY_MORPH_NAV2_STATE PASS 68 legacy step aliases + 40 clamped cursors`;
- `MORPH_RESUME_RUNTIME_OK`.

Special canonical coverage:
- tables: 11/11;
- examples: 278/278;
- warnings: 23/23;
- lists: 7/7;
- ordered-list: 1/1;
- try: 11/11;
- term: 6/6;
- link: 2/2.

Отдельно: старый `verify_morph_source_coverage.cjs` может писать SKIPPED без внешнего pack 32/34. Это не новый 1:1 gate. Новый обязательный `verify_morph_nav2_1to1.cjs` прошёл и проверяет текущий canonical learner source напрямую.
