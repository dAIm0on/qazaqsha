(function(r){'use strict';const data={
  "version": "morph-20260924-v1",
  "scope": "curated_regular_nominal_and_verbal_junctions",
  "families": {
    "PL": {
      "id": "PL",
      "label": "Множественное число",
      "variants": [
        "лар",
        "лер",
        "дар",
        "дер",
        "тар",
        "тер"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "L_BACK"
    },
    "GEN": {
      "id": "GEN",
      "label": "Родительный падеж",
      "variants": [
        "ның",
        "нің",
        "дың",
        "дің",
        "тың",
        "тің"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "N_GEN"
    },
    "DAT": {
      "id": "DAT",
      "label": "Дательный падеж",
      "variants": [
        "ға",
        "ге",
        "қа",
        "ке",
        "а",
        "е",
        "на",
        "не"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "DAT_MORPH_FIRST"
    },
    "ACC": {
      "id": "ACC",
      "label": "Винительный падеж",
      "variants": [
        "ны",
        "ні",
        "ды",
        "ді",
        "ты",
        "ті",
        "н"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "ACC_MORPH_FIRST"
    },
    "LOC": {
      "id": "LOC",
      "label": "Местный падеж",
      "variants": [
        "да",
        "де",
        "та",
        "те",
        "нда",
        "нде"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "LOC_MORPH_FIRST"
    },
    "ABL": {
      "id": "ABL",
      "label": "Исходный падеж",
      "variants": [
        "дан",
        "ден",
        "тан",
        "тен",
        "нан",
        "нен"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "ABL_MORPH_FIRST"
    },
    "INS": {
      "id": "INS",
      "label": "Инструментал/комитатив",
      "variants": [
        "мен",
        "бен",
        "пен"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "M_NASAL_FIXED_E"
    },
    "POSS_1SG": {
      "id": "POSS_1SG",
      "label": "Принадлежность: первое лицо ед.",
      "variants": [
        "ым",
        "ім",
        "м"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "V_C_OPTIONAL_I"
    },
    "POSS_2SG": {
      "id": "POSS_2SG",
      "label": "Принадлежность: второе лицо неформальное",
      "variants": [
        "ың",
        "ің",
        "ң"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "V_C_OPTIONAL_I"
    },
    "POSS_1PL": {
      "id": "POSS_1PL",
      "label": "Принадлежность: первое лицо мн.",
      "variants": [
        "ымыз",
        "іміз",
        "мыз",
        "міз"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "V_C_OPTIONAL_I"
    },
    "POSS_2POL": {
      "id": "POSS_2POL",
      "label": "Принадлежность: второе лицо вежливое",
      "variants": [
        "ыңыз",
        "іңіз",
        "ңыз",
        "ңіз"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "V_C_OPTIONAL_I"
    },
    "POSS_3": {
      "id": "POSS_3",
      "label": "Принадлежность: третье лицо",
      "variants": [
        "ы",
        "і",
        "сы",
        "сі"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "V_C_OPTIONAL_S"
    },
    "COP_1SG": {
      "id": "COP_1SG",
      "label": "Именная/полная предикация: я",
      "variants": [
        "мын",
        "мін",
        "бын",
        "бін",
        "пын",
        "пін"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "M_NASAL_BACK"
    },
    "COP_1PL": {
      "id": "COP_1PL",
      "label": "Именная/полная предикация: мы",
      "variants": [
        "мыз",
        "міз",
        "быз",
        "біз",
        "пыз",
        "піз"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "M_BACK"
    },
    "COP_2SG": {
      "id": "COP_2SG",
      "label": "Предикация: ты",
      "variants": [
        "сың",
        "сің"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "H_I"
    },
    "COP_2POL": {
      "id": "COP_2POL",
      "label": "Предикация: Вы",
      "variants": [
        "сыз",
        "сіз"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "H_I"
    },
    "COP_2PL": {
      "id": "COP_2PL",
      "label": "Предикация: вы неформальное",
      "variants": [
        "сыңдар",
        "сіңдер"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "COMPOSITE_AGREEMENT"
    },
    "COP_2PL_POL": {
      "id": "COP_2PL_POL",
      "label": "Предикация: вы вежливое мн.",
      "variants": [
        "сыздар",
        "сіздер"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "COMPOSITE_AGREEMENT"
    },
    "AGR_SHORT_1SG": {
      "id": "AGR_SHORT_1SG",
      "label": "Краткая личная серия: я",
      "variants": [
        "м"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "SHORT_SERIES"
    },
    "AGR_SHORT_1PL": {
      "id": "AGR_SHORT_1PL",
      "label": "Краткая личная серия: мы",
      "variants": [
        "қ",
        "к"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "SHORT_SERIES_H"
    },
    "AGR_SHORT_2SG": {
      "id": "AGR_SHORT_2SG",
      "label": "Краткая личная серия: ты",
      "variants": [
        "ң"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "SHORT_SERIES"
    },
    "AGR_SHORT_2POL": {
      "id": "AGR_SHORT_2POL",
      "label": "Краткая личная серия: Вы",
      "variants": [
        "ңыз",
        "ңіз"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "SHORT_SERIES_H"
    },
    "Q": {
      "id": "Q",
      "label": "Вопросительная частица",
      "variants": [
        "ма",
        "ме",
        "ба",
        "бе",
        "па",
        "пе"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "M_BACK_SPACE"
    },
    "NEG": {
      "id": "NEG",
      "label": "Глагольное отрицание",
      "variants": [
        "ма",
        "ме",
        "ба",
        "бе",
        "па",
        "пе"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "M_BACK"
    },
    "PAST": {
      "id": "PAST",
      "label": "Простое прошедшее",
      "variants": [
        "ды",
        "ді",
        "ты",
        "ті"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "D_BACK"
    },
    "PTCP_GAN": {
      "id": "PTCP_GAN",
      "label": "Причастная форма",
      "variants": [
        "ған",
        "ген",
        "қан",
        "кен"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "G_BACK"
    },
    "COND": {
      "id": "COND",
      "label": "Условное наклонение",
      "variants": [
        "са",
        "се"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "H_A"
    },
    "CVB_IP": {
      "id": "CVB_IP",
      "label": "Деепричастие",
      "variants": [
        "ып",
        "іп",
        "п"
      ],
      "sources": [
        "S10",
        "S23"
      ],
      "conditions": "V_C_OPTIONAL_I"
    }
  },
  "lemmas": [
    {
      "id": "n-бала",
      "text": "бала",
      "gloss": "ребёнок",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        40,
        67,
        95,
        106
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-әке",
      "text": "әке",
      "gloss": "отец",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        96,
        97,
        337,
        464
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-қала",
      "text": "қала",
      "gloss": "город",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        28,
        86,
        132,
        350
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-көше",
      "text": "көше",
      "gloss": "улица",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        325
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-адам",
      "text": "адам",
      "gloss": "человек",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        3,
        20,
        21,
        34
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-мұғалім",
      "text": "мұғалім",
      "gloss": "учитель",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        436
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-қыз",
      "text": "қыз",
      "gloss": "девушка",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        72,
        96,
        102,
        351
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-сөз",
      "text": "сөз",
      "gloss": "слово",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        2,
        3,
        5,
        6
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-ұл",
      "text": "ұл",
      "gloss": "сын",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        234,
        602,
        603,
        712
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-көл",
      "text": "көл",
      "gloss": "озеро",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        19,
        27,
        320,
        358
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-жер",
      "text": "жер",
      "gloss": "земля",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        8,
        13,
        21,
        31
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-қар",
      "text": "қар",
      "gloss": "снег",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        35,
        46,
        156,
        254
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-кітап",
      "text": "кітап",
      "gloss": "книга",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": "кітаб",
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        145,
        340,
        400,
        437
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-мектеп",
      "text": "мектеп",
      "gloss": "школа",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": "мектеб",
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        3,
        108,
        129,
        271
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-қонақ",
      "text": "қонақ",
      "gloss": "гость",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": "қонағ",
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        381,
        387,
        398,
        399
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-көлік",
      "text": "көлік",
      "gloss": "транспорт",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": "көліг",
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        9,
        10,
        15,
        16
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-ат",
      "text": "ат",
      "gloss": "имя",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        8,
        20,
        21,
        34
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-ит",
      "text": "ит",
      "gloss": "собака",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        37,
        65,
        124,
        162
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-су",
      "text": "су",
      "gloss": "вода",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": "glide",
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        8,
        19,
        36,
        60
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-үй",
      "text": "үй",
      "gloss": "дом",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": "glide",
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        4,
        8,
        18,
        34
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-тау",
      "text": "тау",
      "gloss": "гора",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": "glide",
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        10,
        75,
        124,
        126
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-ән",
      "text": "ән",
      "gloss": "песня",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        100,
        708
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-аң",
      "text": "аң",
      "gloss": "зверь",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        8,
        20,
        60,
        62
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-орын",
      "text": "орын",
      "gloss": "место",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": "орн",
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        5,
        187,
        260,
        271
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-ерін",
      "text": "ерін",
      "gloss": "губа",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": "ерн",
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        236,
        245,
        321,
        385
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-жол",
      "text": "жол",
      "gloss": "дорога",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        3,
        4,
        18,
        20
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-сіңлі",
      "text": "сіңлі",
      "gloss": "младшая сестра",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        348,
        529
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-аға",
      "text": "аға",
      "gloss": "старший брат",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        17,
        19,
        36,
        95
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-дос",
      "text": "дос",
      "gloss": "друг",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        29,
        42,
        44,
        187
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-әріптес",
      "text": "әріптес",
      "gloss": "коллега",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        102
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-арна",
      "text": "арна",
      "gloss": "русло",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        70,
        73,
        79,
        109
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-жыра",
      "text": "жыра",
      "gloss": "овраг",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        280,
        283,
        452,
        492
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-сөре",
      "text": "сөре",
      "gloss": "полка",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        516
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-шеге",
      "text": "шеге",
      "gloss": "гвоздь",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        19,
        324,
        442,
        561
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-арқан",
      "text": "арқан",
      "gloss": "верёвка",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        45,
        68,
        69,
        77
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-тұман",
      "text": "тұман",
      "gloss": "туман",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        173,
        318,
        359,
        395
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-орман",
      "text": "орман",
      "gloss": "лес",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        353,
        359,
        451,
        461
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-өзен",
      "text": "өзен",
      "gloss": "река",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        465
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-өлең",
      "text": "өлең",
      "gloss": "стихотворение",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        30,
        39,
        67,
        348
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-таң",
      "text": "таң",
      "gloss": "рассвет",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        36,
        62,
        82,
        151
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-күз",
      "text": "күз",
      "gloss": "осень",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        6,
        310,
        327,
        334
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-жез",
      "text": "жез",
      "gloss": "латунь",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        263
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-қаз",
      "text": "қаз",
      "gloss": "гусь",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        18,
        37,
        39,
        77
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-мұз",
      "text": "мұз",
      "gloss": "лёд",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        4,
        35,
        143,
        249
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-тал",
      "text": "тал",
      "gloss": "ива",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        145,
        176,
        185,
        369
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-жыл",
      "text": "жыл",
      "gloss": "год",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        19,
        33,
        81,
        112
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-шөл",
      "text": "шөл",
      "gloss": "пустыня",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        390,
        392,
        649
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-бел",
      "text": "бел",
      "gloss": "поясница",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        5,
        75,
        88,
        141
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-бал",
      "text": "бал",
      "gloss": "мёд",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        118,
        119,
        120,
        122
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-нар",
      "text": "нар",
      "gloss": "верблюд",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        345,
        359,
        446,
        636
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-зәкір",
      "text": "зәкір",
      "gloss": "якорь",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        287
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-темір",
      "text": "темір",
      "gloss": "железо",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        184,
        337,
        423,
        525
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-жыр",
      "text": "жыр",
      "gloss": "песня-сказание",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        100,
        235,
        283,
        284
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-қыр",
      "text": "қыр",
      "gloss": "возвышенность",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        374,
        405,
        406
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-құс",
      "text": "құс",
      "gloss": "птица",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        8,
        10,
        35,
        37
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-тас",
      "text": "тас",
      "gloss": "камень",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        9,
        36,
        43,
        76
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-шаш",
      "text": "шаш",
      "gloss": "волосы",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        36,
        119,
        185,
        302
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-бесік",
      "text": "бесік",
      "gloss": "колыбель",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": "бесіг",
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        34,
        145,
        328,
        344
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-бұлақ",
      "text": "бұлақ",
      "gloss": "родник",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": "бұлағ",
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        35,
        80,
        118,
        170
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-есік",
      "text": "есік",
      "gloss": "дверь",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": "есіг",
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        238,
        257,
        259,
        570
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-қап",
      "text": "қап",
      "gloss": "мешок",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": "қаб",
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        7,
        331,
        341,
        355
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-ет",
      "text": "ет",
      "gloss": "мясо",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        6,
        38,
        122,
        133
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-сүт",
      "text": "сүт",
      "gloss": "молоко",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        20,
        30,
        36,
        188
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-бұлт",
      "text": "бұлт",
      "gloss": "облако",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        35,
        36,
        42,
        45
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-бақ",
      "text": "бақ",
      "gloss": "сад",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": "бағ",
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        6,
        109,
        116,
        117
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "n-құм",
      "text": "құм",
      "gloss": "песок",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        39,
        155,
        168,
        245
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-сым",
      "text": "сым",
      "gloss": "проволока",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        7,
        298,
        525
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-шам",
      "text": "шам",
      "gloss": "лампа",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        32,
        89,
        116,
        120
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-дәм",
      "text": "дәм",
      "gloss": "вкус",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        74,
        207,
        208,
        307
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-күй",
      "text": "күй",
      "gloss": "инструментальная пьеса",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": "glide",
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        62,
        100,
        140,
        243
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-ай",
      "text": "ай",
      "gloss": "луна",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": "glide",
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        22,
        25,
        27,
        31
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-сай",
      "text": "сай",
      "gloss": "лощина",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": "glide",
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        179,
        492,
        493,
        502
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-той",
      "text": "той",
      "gloss": "праздник",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": "glide",
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        220,
        271,
        455,
        527
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-жең",
      "text": "жең",
      "gloss": "рукав",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        119,
        241,
        267
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-ине",
      "text": "ине",
      "gloss": "игла",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        18,
        135,
        292,
        378
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-таба",
      "text": "таба",
      "gloss": "сковорода",
      "pos": "noun",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        529,
        530,
        646
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-бар",
      "text": "бар",
      "gloss": "идти",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        4,
        6,
        7,
        17
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-кел",
      "text": "кел",
      "gloss": "приходить",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        438,
        657,
        708,
        715
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-жаз",
      "text": "жаз",
      "gloss": "писать",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        120,
        242,
        654,
        710
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-сез",
      "text": "сез",
      "gloss": "чувствовать",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-ал",
      "text": "ал",
      "gloss": "брать",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        4,
        45,
        49,
        50
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-көр",
      "text": "көр",
      "gloss": "видеть",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        323
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-кет",
      "text": "кет",
      "gloss": "уходить",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        309,
        715
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-айт",
      "text": "айт",
      "gloss": "сказать",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        30,
        205,
        388,
        679
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-жап",
      "text": "жап",
      "gloss": "закрывать",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": "жау",
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        73,
        89,
        90,
        240
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "v-сеп",
      "text": "сеп",
      "gloss": "сеять",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": "сеу",
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        504,
        507
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Перед гласным используется заданный словарный вариант"
    },
    {
      "id": "v-ойна",
      "text": "ойна",
      "gloss": "играть",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        454,
        455,
        716
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-сөйле",
      "text": "сөйле",
      "gloss": "говорить",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-сен",
      "text": "сен",
      "gloss": "верить",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        186,
        202,
        210,
        507
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-тан",
      "text": "тан",
      "gloss": "узнавать",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        538,
        713,
        715,
        716
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-қал",
      "text": "қал",
      "gloss": "оставаться",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        350
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-бөл",
      "text": "бөл",
      "gloss": "делить",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-қой",
      "text": "қой",
      "gloss": "ставить",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        7,
        8,
        22,
        35
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-күл",
      "text": "күл",
      "gloss": "смеяться",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        329,
        330,
        378
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-бас",
      "text": "бас",
      "gloss": "нажимать",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        2,
        8,
        12,
        34
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-өт",
      "text": "өт",
      "gloss": "проходить",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        471,
        472
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-жина",
      "text": "жина",
      "gloss": "собирать",
      "pos": "verb",
      "harmony": "back",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        270,
        271
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "v-ізде",
      "text": "ізде",
      "gloss": "искать",
      "pos": "verb",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": false,
      "split": "transfer",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "dictionaryPdfPages": [
        666,
        667
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma",
      "lexicalNote": "Регулярная основа в допущенных конструкциях"
    },
    {
      "id": "n-егіз",
      "text": "егіз",
      "gloss": "близнец",
      "pos": "noun",
      "harmony": "front",
      "vowelStem": null,
      "edgeOverride": null,
      "predicate": true,
      "split": "train",
      "sources": [
        "S18",
        "S10",
        "S23"
      ],
      "provenance": "generated_by_verified_rule_on_curated_lemma"
    }
  ],
  "levels": [
    {
      "id": "harmony",
      "title": "Ряд гласного",
      "rule": "Гласный суффикса согласуется с рядом основы: а/е или ы/і.",
      "families": [
        "DAT",
        "LOC"
      ],
      "stage": 1,
      "choice": "harmony"
    },
    {
      "id": "voice",
      "title": "Звонкий или глухой стык",
      "rule": "После глухого края: қ/к или т; после звонкого: ғ/г или д.",
      "families": [
        "DAT",
        "LOC"
      ],
      "stage": 2,
      "choice": "onset"
    },
    {
      "id": "plural",
      "title": "Л, Д или Т",
      "rule": "Л после гласного, й/у и р; Д после л, м/н/ң, з/ж; Т после глухого.",
      "families": [
        "PL"
      ],
      "stage": 3
    },
    {
      "id": "nasal",
      "title": "Похожие группы, разные формы",
      "rule": "После м/н/ң: адамның, адамды, адамнан. Учитывай требуемую форму.",
      "families": [
        "GEN",
        "ACC",
        "ABL",
        "INS"
      ],
      "stage": 4
    },
    {
      "id": "poss",
      "title": "Чей предмет",
      "rule": "После гласного: балам; после согласного: атым. Изменение основы проверяй отдельно.",
      "families": [
        "POSS_1SG",
        "POSS_2SG",
        "POSS_1PL",
        "POSS_2POL",
        "POSS_3"
      ],
      "stage": 5
    },
    {
      "id": "person",
      "title": "Я, мы и вопрос",
      "rule": "После носового: адаммын, адамбыз, адам ба. Одинаковый звук не означает одинаковую группу во всех правилах.",
      "families": [
        "COP_1SG",
        "COP_1PL",
        "COP_2SG",
        "COP_2POL",
        "COP_2PL",
        "COP_2PL_POL",
        "Q"
      ],
      "stage": 5
    },
    {
      "id": "chains",
      "title": "Цепочки",
      "rule": "Смотри на уже полученную форму. После принадлежности третьему лицу: кітабына, кітабын, кітабында, кітабынан.",
      "families": [
        "PL",
        "POSS_1SG",
        "POSS_2SG",
        "POSS_1PL",
        "POSS_2POL",
        "POSS_3",
        "DAT",
        "ACC",
        "LOC",
        "ABL"
      ],
      "stage": 6
    },
    {
      "id": "verbs",
      "title": "Глагольные стыки",
      "rule": "Ма/ме, ба/бе, па/пе выбираются по краю глагольной основы; дальше край обновляется.",
      "families": [
        "NEG",
        "PAST",
        "PTCP_GAN",
        "COND",
        "CVB_IP",
        "AGR_SHORT_1SG",
        "AGR_SHORT_1PL",
        "AGR_SHORT_2SG",
        "AGR_SHORT_2POL"
      ],
      "stage": 7
    },
    {
      "id": "mixed",
      "title": "Смешанная практика",
      "rule": "Сначала значение формы, затем её условие. У каждого семейства собственные группы.",
      "families": [
        "PL",
        "GEN",
        "DAT",
        "ACC",
        "LOC",
        "ABL",
        "INS",
        "POSS_1SG",
        "POSS_2SG",
        "POSS_1PL",
        "POSS_2POL",
        "POSS_3",
        "COP_1SG",
        "COP_1PL",
        "COP_2SG",
        "COP_2POL",
        "COP_2PL",
        "COP_2PL_POL",
        "Q",
        "NEG",
        "PAST",
        "PTCP_GAN",
        "COND",
        "CVB_IP",
        "AGR_SHORT_1SG",
        "AGR_SHORT_1PL",
        "AGR_SHORT_2SG",
        "AGR_SHORT_2POL"
      ],
      "stage": 8
    }
  ],
  "audio": [],
  "audioStatus": "no_reviewed_assets",
  "pseudowords": [],
  "sources": {
    "S01": {
      "title": "McCollum, A. G.; Chen, S. (2021, online 2020). Kazakh. JIPA 51(2), 276–298. DOI 10.1017/S0025100319000185",
      "url": "https://ira.lib.polyu.edu.hk/bitstream/10397/92461/2/44254_kazakh.pdf"
    },
    "S04": {
      "title": "Қазақ тілі орфографиясының негізгі ережелері",
      "url": "https://emle.kz/themes/emle/pdf/kazakh-orthography-main-rules.pdf"
    },
    "S10": {
      "title": "Dotton, Z.; Wagner, J. D. A Grammar of Kazakh. Duke University, около 2018",
      "url": "https://slaviccenters.duke.edu/sites/slaviccenters.duke.edu/files/file-attachments/kazakh-grammar.pdf"
    },
    "S18": {
      "title": "Уәли, Н. и др. (2013). Орфографиялық сөздік. 6-е изд. Алматы: Дәуір. 720 с. ISBN 978-601-217-425-0",
      "url": "https://emle.kz/uploads/books/20260312142005250.pdf"
    },
    "S23": {
      "title": "Жанпейісов, Е. (ред.), 2002. Қазақ грамматикасы. Фонетика, сөзжасам, морфология, синтаксис. Астана. ISBN 9965-571-09-0",
      "url": "https://qazcorpus.kz/_oqu-ishorpus/Dengeilyk/pdf/Қазақ_грамматикасы.pdf"
    },
    "S26": {
      "title": "McCollum (2018). The empirical consequences of data collection methods: A case study from Kazakh vowel harmony. Linguistic Discovery 16.2:72–110",
      "url": "https://journals.dartmouth.edu/journals/xmlpage/1/document/1133"
    }
  }
};if(typeof module!=='undefined'&&module.exports)module.exports=data;else r.MorphData=data;})(typeof window!=='undefined'?window:globalThis);
