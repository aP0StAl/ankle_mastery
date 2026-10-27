'use strict';

const RDCFG = {
  "version": 2,
  "principles": [
    "Run Readiness отдельный от Training Mastery",
    "самотесты сравнивают правую травмированную сторону с левой, когда тест двусторонний",
    "Текущее решение использует последнее сопоставимое измерение, прежние результаты — история",
    "пороговые значения помечены как product_heuristic",
    "приложение не выдаёт медицинское разрешение на бег"
  ],
  "domains": {
    "pain": {
      "weight": 0.18
    },
    "ankle_capacity": {
      "weight": 0.2
    },
    "confidence": {
      "weight": 0.12
    },
    "sensorimotor_control": {
      "weight": 0.25
    },
    "impact_running_capacity": {
      "weight": 0.25
    }
  },
  "self_report": {
    "frequency_days": 7,
    "questions": [
      {
        "id": "trust_right_leg",
        "text": "Насколько ты уверен, что правая лодыжка не подведёт тебя при движении?",
        "scale": [
          0,
          10
        ],
        "higher_is_better": true,
        "endpoints": [
          "совсем не уверен",
          "полностью уверен"
        ]
      },
      {
        "id": "fear_of_rolling",
        "text": "Насколько боишься, что правая нога подвернётся?",
        "scale": [
          0,
          10
        ],
        "higher_is_better": false,
        "endpoints": [
          "совсем не боюсь",
          "очень боюсь"
        ]
      },
      {
        "id": "feel_ready_to_easy_run",
        "text": "Насколько готов сейчас к лёгкому бегу?",
        "scale": [
          0,
          10
        ],
        "higher_is_better": true,
        "endpoints": [
          "совсем не готов",
          "полностью готов"
        ]
      }
    ]
  },
  "tests": [
    {
      "id": "hemisphere_hold",
      "name": "Балансборд — удержание с задней страховочной ногой",
      "status": "active",
      "domain": "sensorimotor_control",
      "metric": "seconds",
      "bilateral": true,
      "aggregate": "latest_comparable",
      "target_injured_side_sec": 30,
      "target_note": "30 секунд — граница домашнего теста; результат относится к этому балансборду и этой постановке стоп, а не к полусфере у реабилитолога.",
      "protocol_id": "balance_board_dome_down_front_full_foot_rear_toe",
      "what_measures": "Контроль голеностопа на нестабильной поверхности",
      "unit": "секунд",
      "unit_short": "сек",
      "reference_volume": 45,
      "test_load_vector": {
        "calf": 0.25,
        "ankle_control": 0.9,
        "dynamic_balance": 0.35,
        "lateral": 0.45,
        "impact": 0
      },
      "protocol": [
        "Детский твёрдый балансборд: куполом вниз, плоская поверхность сверху.",
        "Тестируемая нога впереди. Вся стопа стоит примерно по центру плоской поверхности.",
        "Задняя нога на полу сзади, касается пола только носком. Задняя пятка поднята.",
        "Задняя нога — только лёгкая страховочная опора. Основной вес на передней тестируемой ноге.",
        "Стой спокойно, без намеренного раскачивания. Максимум — 30 секунд на каждую сторону.",
        "Измерь отдельно левую здоровую и правую повреждённую сторону. Не смешивай с BOSU куполом вверх, полностью одноногим балансом, передней стопой на носке или двумя полноценными опорами."
      ],
      "max_value": 30
    },
    {
      "id": "tandem_flat_clean_steps",
      "name": "Ходьба пятка к носку — чистые шаги",
      "status": "active",
      "domain": "sensorimotor_control",
      "metric": "clean_steps",
      "bilateral": false,
      "aggregate": "latest_comparable",
      "protocol_id": "tandem_flat_line_clean_steps_v1",
      "what_measures": "Обычная ходьба по линии, с постановкой пятки перед носком",
      "unit": "чистых шагов",
      "unit_short": "шагов",
      "reference_volume": 100,
      "test_load_vector": {
        "calf": 0.1,
        "ankle_control": 0.3,
        "dynamic_balance": 0.35,
        "lateral": 0,
        "impact": 0
      },
      "protocol": [
        "Иди по прямой, ставя пятку одной стопы перед носком другой. Опирайся на полную стопу, не иди на носках.",
        "Считай чистые шаги до потери положения или симптомов. Не продолжай ради рекорда.",
        "На 100 шагах заверши тест. Достигнутая граница не означает, что это твой максимум."
      ],
      "max_value": 100,
      "max_test_steps": 100,
      "readiness_reference": 100,
      "dose_exercise_id": "tandem_walk_flat"
    },
    {
      "id": "tandem_tiptoe_clean_steps",
      "name": "Ходьба по линии на носках — чистые шаги",
      "status": "active",
      "domain": "sensorimotor_control",
      "metric": "clean_steps",
      "bilateral": false,
      "aggregate": "latest_comparable",
      "protocol_id": "tandem_tiptoe_line_clean_steps_v1",
      "what_measures": "Контролируемые шаги на носках по прямой",
      "unit": "чистых шагов",
      "unit_short": "шагов",
      "reference_volume": 100,
      "test_load_vector": {
        "calf": 0.9,
        "ankle_control": 0.65,
        "dynamic_balance": 0.75,
        "lateral": 0.2,
        "impact": 0
      },
      "protocol": [
        "Иди по прямой линии на носках, контролируя каждый шаг.",
        "Считай шаги до первого опускания пяток, спасательного шага или выхода из линии, требующего восстановления положения.",
        "На 100 шагах заверши тест: 100+ — верхняя граница текущего теста. Не добавляй шаги ради лучшего результата."
      ],
      "max_value": 100,
      "max_test_steps": 100,
      "readiness_reference": 100,
      "dose_exercise_id": "tandem_walk_tiptoe"
    },
    {
      "id": "multidirectional_control_clean_rounds",
      "name": "Многонаправленный контроль — фишки",
      "status": "active",
      "domain": "sensorimotor_control",
      "metric": "clean_rounds",
      "bilateral": false,
      "aggregate": "latest_comparable",
      "protocol_id": "tiptoe_four_diagonal_cones_right_lunge_v1",
      "what_measures": "Контроль движения на носках в четырёх направлениях",
      "unit": "чистых раундов",
      "unit_short": "раундов",
      "reference_volume": 3,
      "test_load_vector": {
        "calf": 0.35,
        "ankle_control": 0.8,
        "dynamic_balance": 1,
        "lateral": 0.9,
        "impact": 0
      },
      "protocol": [
        "Расставь 4 фишки по диагоналям вокруг центра и начни в центре. Выполняй тест на носках.",
        "Правой повреждённой ногой сделай контролируемое движение / выпад к очередной фишке, коснись её рукой и вернись в центр.",
        "Продолжай к следующей фишке. 1 раунд = все 4 фишки с возвращением в центр после каждой.",
        "Чистый раунд — без опускания пяток, спасательного шага, явной потери равновесия, неконтролируемого движения или боли, заставившей изменить движение."
      ],
      "readiness_reference": 3
    },
    {
      "id": "knee_to_wall",
      "name": "Колено к стене — подвижность голеностопа",
      "status": "available_manual",
      "domain": "ankle_capacity",
      "metric": "cm",
      "bilateral": true,
      "aggregate": "latest_comparable",
      "symmetry_target": 0.9,
      "threshold_type": "product_heuristic",
      "protocol_id": "knee_to_wall_heel_down_cm_v1",
      "what_measures": "Расстояние от стопы до стены при касании коленом",
      "unit": "сантиметров",
      "unit_short": "см",
      "reference_volume": 10,
      "test_load_vector": {
        "calf": 0.1,
        "ankle_control": 0.2,
        "dynamic_balance": 0,
        "lateral": 0,
        "impact": 0
      },
      "protocol": [
        "Встань лицом к стене. Стопа направлена прямо, пятка остаётся на полу.",
        "Продвинь колено к стене без отрыва пятки. Найди максимальное комфортное расстояние от большого пальца до стены.",
        "Измерь расстояние в сантиметрах отдельно слева и справа; используй одинаковое положение стоп."
      ]
    },
    {
      "id": "single_leg_calf_raise_test",
      "name": "Подъёмы на носок одной ногой — тест",
      "status": "available_manual",
      "domain": "ankle_capacity",
      "metric": "clean_reps",
      "bilateral": true,
      "aggregate": "latest_comparable",
      "symmetry_target": 0.9,
      "threshold_type": "product_heuristic",
      "note": "не делает упражнение ACTIVE в тренировочной программе",
      "protocol_id": "single_leg_calf_raise_clean_reps_v1",
      "what_measures": "Чистые подъёмы на носок каждой ногой",
      "unit": "повторений",
      "unit_short": "повт.",
      "reference_volume": 20,
      "test_load_vector": {
        "calf": 1,
        "ankle_control": 0.45,
        "dynamic_balance": 0.15,
        "lateral": 0.1,
        "impact": 0
      },
      "protocol": [
        "Стой на одной ноге на ровном полу рядом с опорой. Касайся опоры только для равновесия.",
        "Поднимайся на носок и контролируемо опускайся, сохраняя одинаковую высоту и темп.",
        "Считай чистые повторения до потери техники или симптомов. Повтори отдельно другой ногой."
      ],
      "dose_exercise_id": "single_leg_calf_raise"
    },
    {
      "id": "single_leg_balance_errors",
      "name": "Одноногий баланс — ошибки",
      "status": "available_manual",
      "domain": "sensorimotor_control",
      "metric": "errors_per_30s",
      "bilateral": true,
      "lower_is_better": true,
      "aggregate": "latest_comparable",
      "protocol_id": "single_leg_balance_errors_30s_v1",
      "what_measures": "Число потерь положения за 30 секунд; меньше лучше",
      "unit": "ошибок за 30 секунд",
      "unit_short": "ошибок / 30 сек",
      "reference_volume": 60,
      "test_load_vector": {
        "calf": 0.2,
        "ankle_control": 0.6,
        "dynamic_balance": 0.35,
        "lateral": 0.2,
        "impact": 0
      },
      "protocol": [
        "Стой на одной ноге на ровном полу 30 секунд с открытыми глазами, рядом со страховочной опорой.",
        "Считай ошибкой касание пола другой ногой, спасательный шаг или хват за опору. После ошибки вернись в исходное положение.",
        "Измерь число ошибок отдельно слева и справа. Ноль ошибок — валидный результат."
      ]
    },
    {
      "id": "pogo_bilateral",
      "name": "Лёгкие пружинящие прыжки двумя ногами",
      "status": "locked",
      "domain": "impact_running_capacity",
      "metric": "clean_reps",
      "unlock_stage": "ready_for_impact",
      "protocol_id": "bilateral_pogo_clean_reps_v1",
      "what_measures": "Контроль лёгких пружинящих прыжков",
      "unit": "повторений",
      "unit_short": "повт.",
      "reference_volume": 20,
      "test_load_vector": {
        "calf": 0.7,
        "ankle_control": 0.5,
        "dynamic_balance": 0.6,
        "lateral": 0.2,
        "impact": 0.8
      },
      "protocol": [
        "Этот тест доступен после ручного перехода к этапу ударной нагрузки.",
        "На ровной поверхности выполни лёгкие невысокие прыжки двумя ногами с мягким контролируемым приземлением.",
        "Считай только чистые повторения; закончи при потере контроля или симптомах."
      ],
      "readiness_reference": 20,
      "aggregate": "latest_comparable"
    },
    {
      "id": "single_leg_hop_basic",
      "name": "Базовый прыжок на одной ноге",
      "status": "locked",
      "domain": "impact_running_capacity",
      "metric": "clean_reps",
      "bilateral": true,
      "symmetry_target": 0.9,
      "threshold_type": "product_heuristic",
      "unlock_stage": "ready_for_impact",
      "protocol_id": "single_leg_hop_clean_reps_v1",
      "what_measures": "Контроль повторных прыжков на месте каждой ногой",
      "unit": "повторений",
      "unit_short": "повт.",
      "reference_volume": 10,
      "test_load_vector": {
        "calf": 0.7,
        "ankle_control": 0.7,
        "dynamic_balance": 0.7,
        "lateral": 0.3,
        "impact": 1
      },
      "protocol": [
        "После ручного открытия ударных тестов выполняй невысокие прыжки на месте одной ногой на ровном полу.",
        "Считай контролируемые повторения без спасательного шага. Заверши при потере контроля или симптомах.",
        "Повтори отдельно другой ногой. Здесь вводится число повторений, а не расстояние."
      ],
      "aggregate": "latest_comparable"
    },
    {
      "id": "lateral_hop",
      "name": "Боковые прыжки",
      "status": "locked",
      "domain": "impact_running_capacity",
      "metric": "clean_reps",
      "bilateral": true,
      "symmetry_target": 0.9,
      "threshold_type": "product_heuristic",
      "unlock_stage": "ready_for_impact",
      "protocol_id": "lateral_hop_clean_reps_v1",
      "what_measures": "Контроль бокового приземления каждой ногой",
      "unit": "повторений",
      "unit_short": "повт.",
      "reference_volume": 10,
      "test_load_vector": {
        "calf": 0.6,
        "ankle_control": 0.7,
        "dynamic_balance": 0.8,
        "lateral": 1,
        "impact": 1
      },
      "protocol": [
        "После ручного открытия ударных тестов сделай небольшие боковые прыжки на одной ноге на ровной поверхности.",
        "Сохраняй одинаковое расстояние и контролируемое приземление. Считай только чистые повторения.",
        "Заверши при потере контроля или симптомах; повтори отдельно другой ногой."
      ],
      "aggregate": "latest_comparable"
    }
  ],
  "stages": [
    {
      "id": "rehab",
      "order": 0,
      "name": "Реабилитация",
      "description": "контроль, баланс, сила и походка без ударной нагрузки"
    },
    {
      "id": "ready_for_impact",
      "order": 1,
      "name": "Подготовка к ударной нагрузке",
      "description": "сначала низкие двуногие прыжки с остановкой, затем упругие; одноногие и боковые тесты открываются отдельно",
      "entry_heuristics": [
        "Личные цели базового плана подтверждены",
        "Функциональная проверка выполнена без нерешённых ограничений",
        "Известны нормальные самочувствие и реакция утром",
        "Первая проба только 2×3 низких двуногих прыжка с остановкой"
      ],
      "threshold_type": "product_heuristic"
    },
    {
      "id": "ready_for_run_walk",
      "order": 2,
      "name": "Чередование бега и ходьбы",
      "description": "Ударные тесты переносятся без симптомов и ухудшения следующим утром",
      "manual_confirmation_required": true
    },
    {
      "id": "easy_continuous_run",
      "order": 3,
      "name": "Лёгкий непрерывный бег",
      "manual_confirmation_required": true
    },
    {
      "id": "normal_volume",
      "order": 4,
      "name": "Обычный объём бега",
      "manual_confirmation_required": true
    },
    {
      "id": "speed_hills_direction",
      "order": 5,
      "name": "Скорость, подъёмы и смены направления",
      "manual_confirmation_required": true
    }
  ],
  "run_readiness_formula": {
    "domain_weighted_score": true,
    "missing_locked_domain_policy": "show_as_locked_not_zero",
    "do_not_claim_100_until_impact_domain_available": true,
    "symmetry_formula": "injured / healthy, clamped to 1.0; for lower-is-better metrics invert appropriately"
  },
  "delayed_response_gate": {
    "required_for_impact_and_run_stages": true,
    "checks": [
      "same_day_reaction",
      "next_morning_reaction"
    ],
    "if_worse": "stage progression blocked until stable recheck"
  }
};
