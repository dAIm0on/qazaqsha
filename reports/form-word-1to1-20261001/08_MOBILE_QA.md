# 08 — Mobile QA

MOBILE: BLOCKED / NOT_RUN

Обязательный live black-box `390×844` и `200%` zoom не был выполнен. Browser automation не стартовала из-за внешнего TinyFish wallet blocker: balance `-$1.14`.

Статически подтверждено:
- viewport meta: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`;
- таблицы на mobile помещены во внутренний horizontal scroll container `.morph-matrix`;
- document-level overflow не заявляется как PASS без живого браузера;
- казахские keyrail buttons имеют минимум 44×44;
- full-input использует обычный text input;
- caret insertion реализован через `selectionStart/selectionEnd`.

Обязательные реальные проверки после разблокировки browser-run:
1. 390×844 — нет document-level horizontal scroll.
2. Все 7 parts доступны.
3. Урок 2.2: таблица скроллится внутри блока.
4. Full input не перекрывается клавиатурой.
5. Казахская клавиша вставляет символ в каретку.
6. 200% zoom — controls и content остаются доступны.
7. reload / back / rules / all-topics сохраняют контекст.
