# Форма слова — 1:1 restoration QA packet

Дата: 2026-10-01  
Runtime implementation SHA: `4a0a89871c052fc8b277c013e172e906347b2f84`  
Ветка: `feature/form-word-1to1-40x40-20261001`  
PR: https://github.com/dAIm0on/qazaqsha/pull/51  
Preview: https://feature-form-word-1to1-40x40.qazaqsha.pages.dev

## Статус

Машинная часть выполнена для всех 40 NAV2-уроков, не pilot:
- 40/40 lessons имеют explicit `orderedSourceUnitIds[]`;
- 508/508 canonical `MorphLearner` source units имеют render target;
- 235 source-driven screens;
- renderer получает canonical blocks по ID без редакторского summary;
- 39 productive lessons имеют проверенный practice route и full-input unaided contract;
- 1 observation-only lesson: `nav2.1.1`;
- CI #114: 47 verification scripts PASS;
- NAV2 state: 68 legacy aliases + 40 cursor clamp cases PASS;
- общий morph resume regression PASS.

Обязательный живой black-box desktop/mobile не был запущен: браузерная automation остановлена ДО старта из-за TinyFish wallet balance -$1.14. Этот пакет поэтому честно оставляет `MOBILE: FAIL` и `FINAL: FAIL` до реального browser-run. Это не трактуется как дефект runtime и не заменяется статической проверкой.

## Файлы

01 — inventory canonical source units.  
02 — полная lesson→source→screen карта.  
03 — coverage по каждой source unit.  
04 — fidelity: source hash и способ render.  
05 — tables / structured schemes coverage.  
06 — practice skill matrix 40/40.  
07 — novice QA status.  
08 — mobile QA status.  
09 — regression QA.  
10 — итоговый gate.

## Контракт

Источник истины: `morph-learner-v2.js`.  
Runtime map: `morph-nav2-catalog.js`.  
Renderer: `morph-nav2.js`.  
Дублирующий runtime source-manifest удалён, чтобы не было второй расходящейся карты.
