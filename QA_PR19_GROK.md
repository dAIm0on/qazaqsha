# PR #19 — handoff для Grok Build и Grok Bot

BRANCH: `feature/lesson-package-v2-4-1-20260929`
PR: `#19`
BASE: `main`
MERGE: ЗАПРЕЩЁН без отдельной фразы пользователя.

## Grok Build — сначала локальная проверка

1. Открыть актуальный HEAD этой ветки. Не использовать старую копию `C:\Users\1\src\...`.
2. Каноническая локальная копия по карте пользователя: `G:\Мой диск\Казахский\qazaqsha-repo`.
3. Зафиксировать:
   - HEAD
   - `git status --short`
   - `git rev-parse main`
   - `git merge-base main HEAD`

4. Выполнить:

```bash
node tools/compile-lessons.cjs
node verify_lesson_v2_contract.cjs
node verify_lesson_v2.cjs
```

5. После compiler обязательно:

```bash
git diff --exit-code -- compiled-lessons-v2.js
```

6. Затем запустить ВСЕ имеющиеся `verify_*.cjs`, включая старые тесты 1-1…3-3, trainer, K1, tutor, personal trainers, stage, T21/T22/T23/T32 и новые v2 tests. Не ослаблять и не переписывать тест ради PASS.

7. Если FAIL:
   - записать команду
   - expected
   - actual
   - первый релевантный stack/error
   - остановить release
   - исправлять код/данные, не тест

## Grok Build — preview

GitHub PR публично показывает `This branch has not been deployed / No deployments`. Нужно создать preview тем способом, который реально используется для Qazaqsha в текущей локальной инфраструктуре/Cloudflare Pages. Не угадывать URL.

После деплоя сообщить строго:

```text
HEAD: <full sha>
PREVIEW: <https url>
BUILD_IDENTITY: PASS/FAIL + как доказано совпадение с HEAD
V2_CONTRACT: PASS/FAIL
V2_4_1: PASS/FAIL
LEGACY_VERIFY: PASS/FAIL + перечень
```

Не merge.

## Grok Bot — black-box QA после получения PREVIEW

Проверять именно PREVIEW и именно заявленный HEAD.

### A. Доступность урока

- На preview урок 4-1 виден.
- Production `https://qazaqsha.pages.dev/` при `status:draft` НЕ должен показывать/устанавливать 4-1.
- Старые уроки 1-1…3-3 доступны как раньше.

### B. Теория 4-1

Пройти урок с нуля.

Проверить 11 блоков:
1. смысл формы
2. основа
3. А/Е/Й
4. лица
5. ол/олар + ДЫ/ДІ
6. снятие местоимения
7. отрицание
8. чередование основы
9. жұмыс істеу
10. знакомство
11. да/де/та/те

Для каждого блока:
- короткие шаги читаемы
- полное объяснение доступно прямо внутри блока
- есть примеры
- есть проверка понимания
- можно вернуться назад/к уроку
- после блока есть выбор: дальше или «Практиковаться ещё»
- практика не выглядит как обязательный финальный экзамен

### C. Неограниченная практика

Три раза подряд открыть «Практиковаться ещё» на отрицании.

Ожидание:
- каждый подход до 12 заданий
- наборы не должны быть идентичными
- подряд не должно бессмысленно идти одно и то же слово
- в заданиях на грамматику есть перевод
- правильные формы включают:
  - жазбаймын
  - кетпейміз
  - шықпаймын
  - таппаймын
  - кешікпеймін
  - жаппаймын
  - тікпеймін

### D. Ошибки

Проверить ввод:
- `жазайды` → должен объяснить А/Е/Й
- `кетпеміз` → должен указать обязательный Й
- `жазбеймін` → гармония отрицания
- `асығпаймын` → чередование основы
- `таппайсыздар` при Сіз → лицо
- `не жазамын` → отрицание должно быть внутри глагола

### E. Слова

В «Новые слова» должны появиться 10 target items урока:
түсіну, бару, жүру, жату, отыру, тұру, ашу, жабу, тігу, да/де/та/те.

Для `да/де/та/те`:
- recognition по отдельным формам
- production просит все четыре формы
- не должно быть задания, где один ответ `да/де/та/те` ожидается как буквальная строка с косыми чертами

### F. Домашка/PDF

- исходные 4 пункта домашки видны
- упражнений 71
- source_item сохраняется
- JSON export содержит `content_revision` и `source_items`
- print/PDF: A4, без горизонтального уезда, таблица читаема
- внешний BatylBol link присутствует
- source defects 6-1.4 и 6-2.3 не принимаются как неправильный gold

### G. Resume

Проверить:
- выйти в середине theory и вернуться
- выйти в середине optional practice и вернуться
- выйти в середине staged practice и вернуться
- старый прогресс 1-1…3-3 не сброшен
- после обновления `content_revision` старый staged evidence не должен автоматически закрывать новый stage

### H. Mobile 390×844

На всех ключевых экранах:
- нет horizontal scroll
- кнопки не перекрываются
- input виден над клавиатурой
- full explanation читается
- chapter navigation доступна
- homework print controls не ломают layout

### I. Console / SW

- console errors: 0 критических
- 404 runtime assets: 0
- `nonpast-engine.js` НЕ должен запрашиваться браузером
- `compiled-lessons-v2.js` должен загружаться
- offline retest после первого успешного online load

Финальный формат ответа Grok Bot:

```text
HEAD:
PREVIEW:
BUILD_IDENTITY:
DESKTOP:
MOBILE_390x844:
THEORY_11:
OPTIONAL_PRACTICE:
ERROR_DIAGNOSTICS:
VOCAB_10:
HOMEWORK_71:
PDF_PRINT:
RESUME:
LEGACY_SMOKE:
CONSOLE:
OFFLINE_SW:
FINAL: PASS / FAIL / BLOCKED

FAIL DETAILS:
- ...
```
