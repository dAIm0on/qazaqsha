# Phase 2B · Content Matrix · уроки 1-1 → 2-3

Дата: 2026-09-18  
Ветка: `phase2b/learning-mechanics-20260918`  
Stable base: `a3d8c3205bfaa9e8399cf3e6d116abea6e894b32`

## 0. Назначение

Это обязательный content gate перед кодом Phase 2B. Здесь фиксируется, что именно разрешено реализовать в G1–G6, Phrase Drill и Homework для уже открытых уроков 1-1…2-3.

Главный принцип: **мы не открываем новую грамматику и не создаём новый root-view**. Path объясняет правило из `explain-bank.js`; Practice даёт школьные жанры G1–G6; Homework коротко повторяет уже пройденное; Review остаётся FSRS-повторением уже увиденных слов/форм.

Источники, по убыванию приоритета:

1. `Казахский/учебные материалы` и карта курса — границы тем, словарь, порядок введения.
2. `ЗАДАНИЯ_ВНУТРИ_УРОКОВ_1-1_3-1.md` — жанры G1–G6 и порядок модулей.
3. `КАРТА_КОНТЕНТА_ПРОХОЖДЕНИЯ_уроки_1-1_2-3_2026-09-15` и `04_КАРТА_РАСШИРЕНИЯ_УРОКОВ_1-1_2-3_И_ИСТОЧНИКИ`.
4. `explain-bank.js`, `grammar-paths.js`, `lesson-pack-2-1.js`, `lesson-pack-2-2.js`, `lesson-pack-2-3.js`, `data.js`, `homework.js`.
5. Research/GRAM — только для более ясного объяснения уже открытого правила.

## 1. Инварианты реализации

- Использовать существующие `kind`: `choice`, `fields`, `phrase`. Не вводить отдельный `grammar` kind/view.
- G6 = исправление конкретной ошибки; feedback всегда называет **место и механизм**, а не только показывает правильный ответ.
- AI не судит правильность. Проверка локальная → diagnostic code → canonical rule → AI только объясняет.
- Не менять `core.evaluate`, FSRS-6, `desired_retention=0.90`, existing question IDs, import/export, Firebase/PWA.
- Новые G1–G6 вопросы могут иметь новые IDs, но существующие IDs не переименовывать.
- В learner-facing тексте не использовать «рычаг», «слот», «бирка», «алломорф». Использовать: **окончание**, **кусок справа**, **два шага**, **последний слог**, **твёрдое/мягкое**, **кто есть**.
- 3-1 остаётся закрытым. T20–T23 в этой фазе не использовать.
- Phrase Drill не должен искусственно повышать FSRS-статус отдельных слов.
- Homework использует те же canonical rule IDs и diagnostics, что Practice.
- Batylbol остаётся внешней ссылкой в Homework, не новым view.

## 2. Жанры G1–G6

| Код | Школьный жанр | UI-механика | Проверка |
|---|---|---|---|
| G1 | заполнить таблицу / клетку | `choice` или `fields` | локально по canonical answer |
| G2 | дописать окончание | `fields` | точная форма или точный кусок справа |
| G3 | RU → KK | `fields` / `phrase` | только открытая лексика и грамматика |
| G4 | KK → RU | `fields` / `phrase` | нормализованные допустимые русские варианты |
| G5 | преобразовать | `fields` | утверждение↔отрицание, вопрос, лицо — только открытые правила |
| G6 | найди ошибку и перепиши | `fields` + error sticker | diagnostic должен назвать ошибочный кусок и механизм |

---

# 3. Матрица по урокам

## 1-1 · Алфавит, ряд слова

Canonical rules: `T1_HARMONY`.

Граница темы: гармония/последний релевантный слог и звуковые контрасты курса. **Не делать множественное, личные окончания или фразы.**

Текущие ID-якоря: `m1-11-1` и sound/vocab карточки из `data.js`. Старые plural-карточки, исторически помеченные 1-1, не использовать как основание для открытия множественного в новом flow.

| Модуль | G | kind | Стимул / словарь | Ожидаемый ответ и варианты | Ошибка / diagnostic | Точный feedback | Rule | Homework |
|---|---|---|---|---|---|---|---|---|
| 1 | G1 | choice | «какой ряд?» на Ә / Қ / Г / О | Ә — мягкий; Қ — твёрдый; Г — мягкий; О — твёрдый | `HARMONY_CLASS` | «Смотри на казахский звук, а не на русскую “мягкость” согласного.» | T1_HARMONY | короткое повторение пар |
| 2 | G1 | fields | парная клетка: Ә → ?; Ө → ?; Ү → ?; І → ? | А / О / Ұ / Ы | `HARMONY_PAIR` | «У этой пары меняется гласная ряда: Ә ↔ А.» | T1_HARMONY | слова урока |
| 3 | G1 | fields | `кітап`: какой кусок справа решает ряд | `тап`, твёрдый | `HARMONY_EDGE` | «Решает последний релевантный слог: **тап**, поэтому ряд твёрдый.» | T1_HARMONY | 1–2 аналогичных слова |
| 4 | G1 | choice | `мұғалім`: край мягкий/твёрдый; какой слог | мягкий; `лім` | `HARMONY_EDGE` | «Не окрашивай всё слово целиком. Для окончания смотри на правый край: **лім**.» | T1_HARMONY | смешанные слова |
| 5 | G6 | fields | «`кітап` мягкое, потому что `кі`» | «нет; решает `тап`, ряд твёрдый» | `HARMONY_WRONG_EDGE` | «Ошибка в выборе края: ты посмотрела на начало. Для окончания решает **тап**.» | T1_HARMONY | одна исправительная карточка |

Лексика: `көл/қол, шын/шың, он/оң, үн/ұн, орман/арман, ән, мән, өзен, өрт, көп, тіс, біз, кім, мыс, жыл, алтын, су, ту, ит, ми, мұғалім, мұхит, заңгер, кітап` — только то, что уже открыто в курсе.

Acceptance 1-1: никакого `-тар`, никаких предложений с личными окончаниями, никаких future rules.

---

## 1-2 · Множественное число

Canonical rule: `T2_PLURAL_LDT`.

Текущие ID-якоря: `m2-12-1…m2-12-5` (обратное ед. число), текущие plural questions из `data.js`.

Основной словарь: `кітап, адам, жер, қыз, дос, сөз, қала, жігіт, ұл, ту, көше, қол`.

| Модуль | G | kind | Стимул | Ожидаемый ответ / варианты | Ошибка / diagnostic | Точный feedback | Rule | Homework |
|---|---|---|---|---|---|---|---|---|
| 1 | G2 | fields | `кітап + ___` | `тар` или полная `кітаптар`, в зависимости от UI | `PLURAL_INITIAL_LDT`, `HARMONY` | «Ты выбрала **-лар**. После **п** множественное начинается с **т**, поэтому **кітаптар**.» | T2_PLURAL_LDT | 3–5 G2 |
| 1b | G2 | fields | `адам + ___` | `дар` / `адамдар` | `PLURAL_INITIAL_LDT` | «После **м** нужен **д**: **адамдар**.» | T2_PLURAL_LDT | см. выше |
| 1c | G2 | fields | `жер + ___` | `лер` / `жерлер` | `PLURAL_INITIAL_LDT` / `HARMONY` | «Последний слог мягкий → **е**; после **р** начало **л**: **жерлер**.» | T2_PLURAL_LDT | см. выше |
| 2 | G3 | fields | книги / люди / земли / девушки / друзья | `кітаптар / адамдар / жерлер / қыздар / достар` | plural diagnostics | показывать конкретный неверный кусок | T2_PLURAL_LDT | RU→KK короткий блок |
| 3 | G4 | fields | `жерлер, қыздар` | земли/земля (мн.); девушки/девочки — принимать только предусмотренные словарём варианты | `TRANSLATION_VARIANT` | «Форма множественная; нужен русский ответ во множественном числе.» | T2_PLURAL_LDT | KK→RU |
| 4 | G1 | fields | клетка ед.→мн.: `кітап → ?`, `адам → ?` | canonical plural | plural diagnostics | тот же механизм, что G2 | T2_PLURAL_LDT | не дублировать весь модуль |
| 5 | G6 | fields | `*кітаплар` | `кітаптар` | `PLURAL_INITIAL_LDT` | «Ошибка в первом согласном окончания: после **п** нужен **т**.» | T2_PLURAL_LDT | 1 G6 |
| 5b | G6 | fields | `*адамлар` | `адамдар` | `PLURAL_INITIAL_LDT` | «После **м** нужен **д**, поэтому **адамдар**.» | T2_PLURAL_LDT |  |
| 5c | G6 | fields | `*жердер` | `жерлер` | `PLURAL_INITIAL_LDT` | «После **р** здесь начинается **л**: **жерлер**.» | T2_PLURAL_LDT |  |
| 5d | G6 | fields | `*қолдер` | `қолдар` | `HARMONY` | «Ошибка в гласной окончания: **қол** твёрдое → **а**: **қолдар**.» | T2_PLURAL_LDT |  |

Phrase Drill: после модуля G3. Только уже открытые слова/структуры. Phrase tracking отдельно от word FSRS.

Acceptance 1-2: последовательность **G2 → G3 → Phrase → G4/G1 → G6**. Обязательные проверки: `тар`, `книги`, `*кітаплар`.

---

## 1-3 · Числа + после числа без множественного

Canonical rules: `T4_NO_PLURAL_AFTER_NUMBER`, `T5_NUMERAL_CONFUSION`, `T5_NUMERAL_COMPOSE`, `PHONE_GROUPS`.

Текущие ID-якоря: `m2-13-1…m2-13-5` для plural vocabulary, `hw2-13-kk/ru` для чисел; current number generator/diagnostics остаются локальными, но бесконечный генератор не включать внутрь lesson flow.

| Модуль | G | kind | Стимул | Ожидаемый ответ / варианты | Ошибка / diagnostic | Точный feedback | Rule | Homework |
|---|---|---|---|---|---|---|---|---|
| 1 | G3 | fields | 17 | `он жеті` | `NUMERAL_COMPOSE` | «Сначала десяток, потом единицы: **он жеті**.» | T5_NUMERAL_COMPOSE | 2–3 числа |
| 1b | G3 | fields | 32 | `отыз екі` | `NUMERAL_COMPOSE` | «В казахском: **отыз екі** — десяток перед единицей.» | T5_NUMERAL_COMPOSE |  |
| 1c | G3 | fields | 60 / 6 | `алпыс / алты` | `NUMERAL_CONFUSION_6_60` | «6 — **алты**, 60 — **алпыс**. Это разные слова одной семьи.» | T5_NUMERAL_CONFUSION | contrast pair |
| 2 | G4 | fields | `қырық бес` | `45` | `NUMERAL_VALUE` | «Собери значение: қырық = 40, бес = 5 → 45.» | T5_NUMERAL_COMPOSE | слово→цифра |
| 3 | G3 | fields | +7 (707)… группами | формат PHONE из текущего банка | `PHONE_GROUPS` | «Читай номер группами; ноль не пропускай.» | PHONE_GROUPS | короткий phone block |
| 4 | G3 / phrase | phrase | две книги | `екі кітап` | `PLURAL_AFTER_NUMBER` | «После числа существительное остаётся без окончания множественного: **екі кітап**.» | T4_NO_PLURAL_AFTER_NUMBER | 2–4 phrases |
| 4b | G3 / phrase | phrase | много людей | `көп адам` | `PLURAL_AFTER_NUMBER` | «После **көп** здесь не добавляем окончание множественного: **көп адам**.» | T4_NO_PLURAL_AFTER_NUMBER |  |
| 4c | G3 / phrase | phrase | сколько девушек | `қанша қыз` | `PLURAL_AFTER_NUMBER` | «После **қанша** форма существительного остаётся без множественного окончания.» | T4_NO_PLURAL_AFTER_NUMBER |  |
| 5 | G6 | fields | `*көп адамдар` | `көп адам` | `PLURAL_AFTER_NUMBER` | «Лишнее окончание **-дар** после көп. Нужно **көп адам**.» | T4_NO_PLURAL_AFTER_NUMBER | 1–2 G6 |
| 5b | G6 | fields | `*екі кітаптар` | `екі кітап` | `PLURAL_AFTER_NUMBER` | «Число **екі** уже выражает количество; **-тар** лишнее.» | T4_NO_PLURAL_AFTER_NUMBER |  |
| 5c | G6 | fields | `*кітаптер` | `кітаптар` | `HARMONY` | «Здесь нет числа; множественное нужно, но гласная неверная: **кітаптар**.» | T2_PLURAL_LDT reminder only |  |

Acceptance 1-3: `екі кітап`, `*екі кітаптар`, `алты/алпыс`, phone group. Никаких порядковых чисел — они открываются только в 2-3.

---

## 2-1 · Мен / сен / сіз / емес / вопрос

Canonical rules: **сначала `T12_GLUE`**, затем `T6_PERSON_SG`, `T7_EMES`; вопрос — только тот объём, который реально открыт уроком.

Текущие ID-якоря: `e21-form-*`, `e21-who-*`, `e21-tr-*`, `e21-neg-*`, `e21-aff-*`, `e21-qa-*`, `e21-fix-*`.

Legacy pack slugs (`person-sg/person-neg/person-q`) при рендеринге/feedback должны маппиться на canonical T12/T6/T7, а не становиться вторым источником объяснения.

| Модуль | G | kind | Стимул | Ожидаемый ответ / варианты | Ошибка / diagnostic | Точный feedback | Rule | Current anchors / Homework |
|---|---|---|---|---|---|---|---|---|
| 1 | G1 | fields | я + адам | `адаммын` | person consonant/harmony | «После **м** у формы “я” здесь **-мын**: **адаммын**.» | T12_GLUE + T6_PERSON_SG | e21-form-* |
| 1b | G1 | fields | я + дос | `доспын` | `PERSON_INITIAL` | «Основа оканчивается на **с**, поэтому у “я” начало **п**: **доспын**.» | T6_PERSON_SG | e21-form-* |
| 1c | G1 | fields | я + қыз / мұғалім | `қызбын / мұғаліммін` | person diagnostics | feedback по конкретному краю | T6_PERSON_SG | e21-form-* |
| 2 | G2 | fields | `дос + ___` для «я» | `пын` или `доспын` | `PERSON_INITIAL` | «После **с** нужен **п**: **доспын**.» | T6_PERSON_SG | e21-form-* |
| 3 | G5 | fields | `мен мұғаліммін → не` | `мен мұғалім емеспін` | `EMES_ORDER`, `PERSON_ON_EMES` | «Окончание “кто есть” переносится на **емес**: **емеспін**.» | T7_EMES | e21-neg-* |
| 4 | G5 | fields | `сен доссың → вопрос` | `сен доссың ба?` | `QUESTION_PARTICLE` | «Вопросительная частица стоит отдельным словом в конце: **ба**.» | current question rule | e21-qa-* |
| 5 | G3 | fields/phrase | я учитель | `мен мұғаліммін`; допускается без местоимения только если текущий canonical answer это разрешает | person diagnostics | точный кусок | T6_PERSON_SG | e21-tr-* |
| 5b | G3 | fields/phrase | ты не врач | `сен дәрігер емессің` | EMES diagnostics | «После емес окончание считается от **емес**, не от дәрігер.» | T7_EMES | e21-neg/tr |
| 5c | G3 | fields/phrase | вы учитель? | `сіз мұғалімсіз бе?` | question/person | exact | T6 + question | e21-tr/fix |
| 6 | G6 | fields | `*мен дәрігер` | `мен дәрігермін` | `MISSING_PERSON_ENDING` | «Не хватает куска “кто есть” у **мен**: дәрігер**мін**.» | T6_PERSON_SG | new G6, reuse e21-fix patterns |
| 6b | G6 | fields | `*досмын` | `доспын` | `PERSON_INITIAL` | «Ошибка на стыке после **с**: нужен **п**, не м.» | T6_PERSON_SG | new/derived |
| 6c | G6 | fields | `*қыз емесбін` | `қыз емеспін` | `PERSON_ON_EMES` | «Смотри на край **емес**: он заканчивается на с, поэтому **пін**.» | T7_EMES | new/derived |

Acceptance 2-1: сначала T12_GLUE в Path; затем `адаммын`, `доспын`, `емес`, вопрос, `*досмын`, `*мен дәрігер`.

---

## 2-2 · Біз / сендер / сіздер / признак

Canonical rules: `T8_PERSON_PL`, `T8_ADJ_PRED`; T12_GLUE только reminder, без второго канона.

Текущие ID-якоря: `e22-form-*` (person-biz/person-sender/etc), translation/negative/fix groups из `lesson-pack-2-2.js`.

Для Phase 2B использовать в первую очередь слова, уже знакомые ученику к 2-2: `дос, адам, студент, бастық, мұғалім, ақылды`; не тянуть редкие слова только потому, что они есть в большом legacy pack.

| Модуль | G | kind | Стимул | Ожидаемый ответ / варианты | Ошибка / diagnostic | Точный feedback | Rule | Current anchors / Homework |
|---|---|---|---|---|---|---|---|---|
| 1 | G1 | fields | мы + дос | `доспыз` | plural-person consonant | «После с у біз форма начинается с **п**: **доспыз**.» | T8_PERSON_PL | e22-form-* |
| 1b | G1 | fields | мы + адам | `адамбыз` | `BIZ_AFTER_MN` | «После **м** у біз нужна **б**: **адамбыз**, не *адаммыз.» | T8_PERSON_PL | e22-form-* |
| 1c | G1 | fields | мы + студент | `студентпіз` | person diagnostics | exact | T8_PERSON_PL | e22-form-* |
| 2 | G1 | fields | вы свои + студент | `сендер студентсіңдер` | `SENDER_ENDING` | «Сендер уже выражает “вас несколько”; на студент не добавляй множественное.» | T8_PERSON_PL | e22-form-* |
| 3 | G5 | fields | `біз студентпіз → не` | `біз студент емеспіз` | EMES/person plural | «После емес окончание относится к біз: **емеспіз**.» | T8_PERSON_PL + T7 reminder | current neg group |
| 4 | G3 | phrase | мы друзья | `біз доспыз` | person plural | exact | T8_PERSON_PL | translation group |
| 4b | G3 | phrase | вы начальники | `сендер бастықсыңдар` | `PLURAL_ON_PREDICATE` | «Сендер уже даёт множественность; **бастық** остаётся без -тар.» | T8_PERSON_PL | translation group |
| 5 | G1/G3 | fields | я/мы + ақылды | `мен ақылдымын / біз ақылдымыз` | `ADJ_GENDER_TRANSFER` | «Не ищи русский род. Ақылды не меняется по роду; добавляется только окончание лица.» | T8_ADJ_PRED | current adjective items |
| 6 | G6 | fields | `*біз адаммыз` | `біз адамбыз` | `BIZ_AFTER_MN` | «После **м** у біз нужен **б**: **адамбыз**.» | T8_PERSON_PL | new/derived |
| 6b | G6 | fields | `*сендер достарсыңдар` | `сендер доссыңдар` | `PLURAL_ON_PREDICATE` | «Лишнее **-тар**: сендер уже показывает, что людей несколько.» | T8_PERSON_PL | fix group |

Homework: 2–3 формы G1/G3 + слова урока + 4 phrase, если phrase-bank готов. Не добавлять possessive 3-1.

---

## 2-3 · Ол / вопросительная частица / порядковые

Canonical rules: `T9_OL`, `T10_QUESTION`, `T11_ORDINAL`.

Текущие ID-якоря: `e23-form-*` (включая `e23-form-21` = ол + маман → маман), question/fix groups, ordinal groups `e23-ord-*`, `e23-ordq-*`, `m23-ordp-*`.

Большой legacy pack содержит чрезмерно сложные числовые примеры. В lesson flow Phase 2B использовать короткие формы курса; длинные числа не ставить раньше базового 20-й.

| Модуль | G | kind | Стимул | Ожидаемый ответ / варианты | Ошибка / diagnostic | Точный feedback | Rule | Current anchors / Homework |
|---|---|---|---|---|---|---|---|---|
| 1 | G1 | fields | он + қонақ / жігіт / мұғалім | `ол қонақ / ол жігіт / ол мұғалім` или голая форма в клетке, если pronoun уже дан | `OL_PERSON_ENDING` | «После **ол** окончания мын/сың/сыз нет.» | T9_OL | e23-form-* |
| 2 | G2 | fields | `ол қонақ + ___` | `па` | `QUESTION_INITIAL` | «Қонақ заканчивается на қ, поэтому вопрос начинается с **п**: **па**.» | T10_QUESTION | question group |
| 2b | G2 | fields | `ол адам + ___` | `ба` | `QUESTION_INITIAL` | «После **м** нужна **ба**.» | T10_QUESTION | question group |
| 2c | G2 | fields | `олар ақылды + ___` | `ма` | `QUESTION_INITIAL` | «Последнее слово заканчивается гласной → **ма/ме**; ряд твёрдый → **ма**.» | T10_QUESTION | question group |
| 3 | G3 | phrase | он гость? | `ол қонақ па?` | question diagnostics | exact | T9 + T10 | phrase/homework |
| 3b | G3 | phrase | он не учитель? | `ол мұғалім емес пе?` | `QUESTION_AFTER_EMES` | «Смотри на последнее слово **емес**: оно заканчивается на с → **пе**.» | T10_QUESTION | phrase/homework |
| 4 | G2/G3 | fields | 20-й | `жиырмасыншы` | `ORDINAL_SUFFIX` | «Сначала обычное **жиырма**, затем окончание порядкового на последнем слове: **жиырмасыншы**.» | T11_ORDINAL | e23-ord-* |
| 5 | G6 | fields | `*ол мұғаліммін` | `ол мұғалім` | `OL_PERSON_ENDING` | «Лишнее **-мін**: у ол нет окончания “кто есть”.» | T9_OL | fix group |
| 5b | G6 | fields | `*ол қонақ ба` | `ол қонақ па` | `QUESTION_INITIAL` | «Қонақ заканчивается на қ, поэтому **па**, не ба.» | T10_QUESTION | fix group |
| 5c | G6 | fields | `*ол қонақ?` | `ол қонақ па?` | `MISSING_QUESTION_PARTICLE` | «Одной интонации по правилу курса недостаточно: нужна частица **па**.» | T10_QUESTION | new/derived |

Homework: короткий G2 + G3, слова урока, 4 phrase. Слово `менің`, если уже встречается в ДЗ как vocab, не превращает possessive в открытую грамматику.

---

# 4. Phrase Drill

Phrase Drill живёт внутри Practice, не новый root-view.

Минимальные правила:

1. Phrase доступна только после соответствующего базового модуля урока.
2. 1-2: после G3; только plural phrases на знакомой лексике.
3. 1-3: `екі кітап / көп адам / қанша қыз` и числа в рамках урока.
4. 2-1: мен/сен/сіз + affirmative/емес/question.
5. 2-2: біз/сендер/сіздер + affirmative/емес/adjective.
6. 2-3: ол + question/емес; ordinal — отдельный короткий набор.
7. Phrase attempts не засчитываются как word FSRS Good/Mastered.
8. Ошибки phrase раскладываются на те же diagnostics/rule IDs, а не получают отдельный «phrase rule».

# 5. Homework mapping

| Урок | Homework grammar | Vocab | Phrase | External |
|---|---|---|---|---|
| 1-1 | 1–2 harmony/edge checks | слова 1-1 | нет | Batylbol Zvuki |
| 1-2 | G2 + G3 | слова 1-2 | 4 phrase после готовности банка | Batylbol plural |
| 1-3 | G3 numbers + `екі кітап` | слова/числа 1-3 | 4 phrase | внешнее по курсу |
| 2-1 | person + емес + question | слова 2-1 | 4 phrase | Batylbol LichnyeEdChislo |
| 2-2 | біз/сендер/сіздер + adjective | слова 2-2 | 4 phrase | Batylbol LichnyeLitso1-2 |
| 2-3 | ол + question + ordinal | слова 2-3 | 4 phrase | Batylbol Lichnye + Voprositelnye |

Homework не создаёт новый canonical text. Объяснение всегда берётся через тот же canonical rule context, что Practice/Path.

# 6. Diagnostics contract Phase 2B

Обязательные минимум-коды/механизмы:

- harmony/last relevant syllable;
- plural initial L/D/T;
- plural vowel A/E;
- plural after number;
- numeral confusion 6/60, 7/70, 8/80, 9/90;
- numeral composition/value;
- person ending missing;
- person ending initial consonant;
- ending on емес;
- біз after м/н/ң;
- redundant plural with сендер/сіздер;
- ол with forbidden personal ending;
- question particle initial consonant;
- question after емес;
- missing question particle;
- ordinal suffix.

Feedback template:

> Ты выбрала **X**. Здесь смотрим на **конкретный край/слово/букву**. Поэтому нужен **Y** → **полная правильная форма**.

Запрещённый feedback: «Неверно. Правильный ответ: …» без механизма.

# 7. Acceptance matrix

Обязательные сценарии перед merge Phase 2B:

### 1-2
- `кітап + ___ → тар`
- RU `книги → кітаптар`
- `*кітаплар → кітаптар` с объяснением «после п начинается с т»

### 1-3
- `60 ↔ алпыс`, `6 ↔ алты`
- `две книги → екі кітап`
- `*екі кітаптар → екі кітап` с diagnostic `PLURAL_AFTER_NUMBER`

### 2-1
- `я + адам → адаммын`
- `я + дос → доспын`
- affirmative → емес
- statement → question
- `*досмын → доспын`
- `*мен дәрігер → мен дәрігермін`

### 2-2
- `біз + адам → адамбыз`
- `біз + дос → доспыз`
- `сендер + дос → доссыңдар`
- `*сендер достарсыңдар → сендер доссыңдар`

### 2-3
- `ол + мұғалім → ол мұғалім`
- `ол қонақ + ? → па`
- `ол адам + ? → ба`
- `20-й → жиырмасыншы`
- `*ол мұғаліммін → ол мұғалім`
- `*ол қонақ ба → ол қонақ па`

# 8. Что Phase 2B НЕ делает

- Не открывает 3-1.
- Не добавляет T20–T23 в открытый curriculum.
- Не меняет FSRS, desired retention, question IDs или scheduler.
- Не создаёт новый root navigation item.
- Не делает бесконечный number generator частью lesson flow.
- Не переносит редкую лексику из больших legacy packs, если она ещё не была в курсе.
- Не дублирует объяснения ExplainBank внутри packs.
- Не смешивает G6 в начало урока.
- Не превращает AI в проверяющий механизм.

# 9. Следующий кодовый шаг

После принятия этой матрицы:

1. реализовать G1 table/cell;
2. G2 suffix completion;
3. G3 RU→KK;
4. G4 KK→RU;
5. G5 transform;
6. G6 error rewrite;
7. Phrase Drill;
8. Homework integration;
9. unified Learn → Path → Practice → Homework → Review;
10. regression + Preview acceptance.

Первый implementation commit: **G1 table/cell** на уже открытых уроках, без новой грамматики и без изменения старых question IDs. Следующий отдельный commit — **G2 suffix completion**. G6 добавляется позже своим отдельным шагом, после G3–G5, как зафиксировано в плане.
