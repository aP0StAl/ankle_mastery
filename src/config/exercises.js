'use strict';

const EXCFG = {
  "version": 2,
  "semantics": {
    "status": {
      "active": "участвует в рекомендациях",
      "available": "есть в каталоге, но добавляется пользователем вручную",
      "locked": "следующая стадия, не может быть включена обычным scheduler",
      "archived": "скрыто из активной программы, история сохраняется"
    },
    "source": {
      "clinician_home": "явно назначено для дома",
      "clinician_session": "выполнялось с реабилитологом; домашняя частота не задавалась",
      "optional_context": "дополнительная/игровая активность",
      "assistant_suggested_disabled": "обсуждалось как возможное дополнение; не назначено очным специалистом",
      "home_equipment_variant": "домашняя замена оборудования; исходное движение выполнялось с реабилитологом, эквивалентность нагрузки не установлена"
    },
    "important": "load credit, prescription credit и mastery credit — независимые вещи"
  },
  "exercises": [
    {
      "id": "towel_stretch_straight_knee",
      "name": "Растяжка икры полотенцем — прямое колено",
      "source": "clinician_home",
      "enabled": true,
      "tier": "B",
      "primary_skills": [
        "mobility"
      ],
      "secondary_skills": [
        "calf"
      ],
      "load_channels": {
        "calf": 0.1,
        "ankle_control": 0.0,
        "dynamic_balance": 0.0,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration",
        "target_sec": 60,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 3,
        "max_per_day": 4
      },
      "min_rest_minutes": 120,
      "instructions": [
        "Сидя или лёжа, колено выпрямлено.",
        "Полотенце вокруг передней части стопы, мягко потянуть носок на себя.",
        "Тянуть до ощущения растяжения в икре, не до боли около наружной лодыжки."
      ],
      "progression": {
        "type": "none"
      },
      "status": "active",
      "order_in_tier": 1,
      "mastery_tracking": {
        "enabled": false
      },
      "symptom_check_policy": "light",
      "prescription_credit": {
        "group": "towel_straight",
        "min_per_day": 3,
        "target_per_day": 3,
        "max_per_day": 4
      },
      "skill_credit": {
        "mobility": 1.0
      },
      "frequency_basis": "clinician_prescribed",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": false,
        "track_outer_ankle_pain": true
      },
      "legacy_rest_minutes": 90
    },
    {
      "id": "towel_stretch_bent_knee",
      "name": "Растяжка икры полотенцем — согнутое колено",
      "source": "clinician_home",
      "enabled": true,
      "tier": "B",
      "primary_skills": [
        "mobility"
      ],
      "secondary_skills": [
        "soleus"
      ],
      "load_channels": {
        "calf": 0.1,
        "ankle_control": 0.0,
        "dynamic_balance": 0.0,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration",
        "target_sec": 60,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 3,
        "max_per_day": 4
      },
      "min_rest_minutes": 120,
      "instructions": [
        "Согнуть колено и мягко потянуть стопу полотенцем на себя.",
        "Цель — мягкая растяжка, без боли в наружной лодыжке."
      ],
      "progression": {
        "type": "none"
      },
      "status": "active",
      "order_in_tier": 2,
      "mastery_tracking": {
        "enabled": false
      },
      "symptom_check_policy": "light",
      "prescription_credit": {
        "group": "towel_bent",
        "min_per_day": 3,
        "target_per_day": 3,
        "max_per_day": 4
      },
      "skill_credit": {
        "mobility": 1.0
      },
      "frequency_basis": "clinician_prescribed",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": false,
        "track_outer_ankle_pain": true
      },
      "legacy_rest_minutes": 90
    },
    {
      "id": "bilateral_tiptoe_static",
      "name": "Статика на носках двух ног",
      "source": "clinician_home",
      "enabled": true,
      "tier": "B",
      "primary_skills": [
        "calf",
        "static_balance"
      ],
      "secondary_skills": [
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.3,
        "ankle_control": 0.25,
        "dynamic_balance": 0.0,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "hold_reps",
        "hold_sec": 5,
        "reps": 10,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 3,
        "max_per_day": 4
      },
      "min_rest_minutes": 120,
      "instructions": [
        "Подняться на носки двумя ногами.",
        "Удерживать 5 секунд, плавно опуститься.",
        "Не выполнять до дрожи/отказа."
      ],
      "progression": {
        "type": "restore_prescription",
        "ceiling": 10,
        "step": 1,
        "reduce_step": 1
      },
      "status": "active",
      "order_in_tier": 3,
      "mastery_tracking": {
        "enabled": true,
        "metric": "hold_reps",
        "successful_sessions_required": 3,
        "quality_fields": [
          "technique"
        ]
      },
      "symptom_check_policy": "light",
      "prescription_credit": {
        "group": "tiptoe_static",
        "min_per_day": 3,
        "target_per_day": 3,
        "max_per_day": 4
      },
      "skill_credit": {
        "calf_strength_endurance": 0.7,
        "static_balance": 0.4,
        "ankle_control": 0.4
      },
      "frequency_basis": "clinician_prescribed",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": false,
        "track_outer_ankle_pain": true
      },
      "legacy_rest_minutes": 120
    },
    {
      "id": "tandem_walk_flat",
      "name": "Ходьба по линии пятка-к-носку",
      "source": "clinician_home",
      "enabled": true,
      "tier": "A",
      "primary_skills": [
        "dynamic_balance",
        "gait_control"
      ],
      "secondary_skills": [
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.1,
        "ankle_control": 0.3,
        "dynamic_balance": 0.35,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "steps",
        "target_steps": 16,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 1,
        "max_per_day": 4
      },
      "min_rest_minutes": 120,
      "instructions": [
        "Идти по прямой, ставя пятку одной стопы почти вплотную перед носком другой.",
        "Двигаться медленно и без рывков."
      ],
      "progression": {
        "type": "unlock_next",
        "next_exercise_id": "tandem_walk_tiptoe",
        "success_sessions": 3,
        "require_pain_at_most": 2,
        "require_rpe_at_most": 5,
        "test_probe": {
          "target_steps": 4
        }
      },
      "status": "active",
      "order_in_tier": 4,
      "mastery_tracking": {
        "enabled": true,
        "metric": "steps",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "prescription_credit": {
        "group": "line_walk",
        "min_per_day": 3,
        "target_per_day": 3,
        "max_per_day": 4
      },
      "skill_credit": {
        "dynamic_balance": 0.8,
        "gait_control": 0.8,
        "ankle_control": 0.4
      },
      "frequency_basis": "clinician_prescribed",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "legacy_rest_minutes": 90
    },
    {
      "id": "tandem_walk_tiptoe",
      "name": "Ходьба по линии на носках",
      "source": "clinician_home",
      "enabled": true,
      "tier": "A",
      "primary_skills": [
        "dynamic_balance",
        "calf"
      ],
      "secondary_skills": [
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.45,
        "ankle_control": 0.4,
        "dynamic_balance": 0.45,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "steps",
        "target_steps": 12,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 4
      },
      "min_rest_minutes": 120,
      "instructions": [
        "Продвинутый вариант ходьбы по линии.",
        "Не выполнять, если икры уже сильно утомлены."
      ],
      "progression": {
        "type": "maintain",
        "ceiling": 12,
        "step": 1
      },
      "status": "active",
      "order_in_tier": 5,
      "mastery_tracking": {
        "enabled": true,
        "metric": "steps",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "prescription_credit": {
        "group": "line_walk",
        "min_per_day": 3,
        "target_per_day": 3,
        "max_per_day": 4,
        "variant_of": "tandem_walk_flat"
      },
      "skill_credit": {
        "dynamic_balance": 0.8,
        "calf_strength_endurance": 0.7,
        "ankle_control": 0.6
      },
      "frequency_basis": "clinician_prescribed",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "legacy_rest_minutes": 180,
      "max_recommended_per_day": 4
    },
    {
      "id": "right_leg_balance_left_front_back",
      "name": "Баланс на правой ноге: левая вперёд/назад",
      "source": "clinician_home",
      "enabled": true,
      "tier": "A",
      "primary_skills": [
        "static_balance",
        "ankle_control"
      ],
      "secondary_skills": [
        "dynamic_balance"
      ],
      "load_channels": {
        "calf": 0.15,
        "ankle_control": 0.45,
        "dynamic_balance": 0.3,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "cycles",
        "front_hold_sec": 5,
        "back_hold_sec": 5,
        "cycles": 5,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 1,
        "max_per_day": 4
      },
      "min_rest_minutes": 120,
      "instructions": [
        "Правая нога — опорная.",
        "Левое колено поднять перед собой и удерживать 5 секунд.",
        "Левую ногу отвести назад; при необходимости слегка коснуться пола носком и удерживать 5 секунд.",
        "Правая стопа остаётся спокойной, без резких завалов."
      ],
      "progression": {
        "type": "reduce_support",
        "notes": "Постепенно уменьшать опору носком левой ноги, если всё комфортно.",
        "ceiling": 5,
        "probe_cycles": 3,
        "next_exercise_id": "single_leg_multidirectional_reach"
      },
      "status": "active",
      "order_in_tier": 6,
      "mastery_tracking": {
        "enabled": true,
        "metric": "clean_cycles",
        "successful_sessions_required": 3,
        "quality_fields": [
          "support_touches",
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "prescription_credit": {
        "group": "front_back_balance",
        "min_per_day": 3,
        "target_per_day": 3,
        "max_per_day": 4
      },
      "skill_credit": {
        "static_balance": 0.9,
        "ankle_control": 0.8,
        "dynamic_balance": 0.5
      },
      "frequency_basis": "clinician_prescribed",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "legacy_rest_minutes": 90
    },
    {
      "id": "left_side_lunge_right_leg_straight",
      "name": "Боковой выпад влево с прямой правой ногой",
      "source": "clinician_home",
      "enabled": true,
      "tier": "A",
      "primary_skills": [
        "lateral_stability",
        "dynamic_balance"
      ],
      "secondary_skills": [
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.2,
        "ankle_control": 0.45,
        "dynamic_balance": 0.45,
        "lateral": 0.4,
        "impact": 0.0
      },
      "dose": {
        "type": "hold_reps",
        "hold_sec": 5,
        "reps": 5,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 1,
        "max_per_day": 4
      },
      "min_rest_minutes": 120,
      "instructions": [
        "Сделать шаг левой ногой в сторону и перейти в неглубокий боковой выпад.",
        "Правая нога остаётся прямой; правая стопа контролируемо на полу.",
        "Удерживать 5 секунд.",
        "Возвращаться медленно: сначала в нейтральное положение, затем обычным шагом поставить левую стопу рядом.",
        "Не выполнять прыжковый возврат."
      ],
      "progression": {
        "type": "increase_controlled_range"
      },
      "status": "active",
      "order_in_tier": 7,
      "mastery_tracking": {
        "enabled": true,
        "metric": "clean_reps",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "prescription_credit": {
        "group": "side_lunge",
        "min_per_day": 3,
        "target_per_day": 3,
        "max_per_day": 4
      },
      "skill_credit": {
        "lateral_stability": 0.9,
        "dynamic_balance": 0.7,
        "ankle_control": 0.6
      },
      "frequency_basis": "clinician_prescribed",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "legacy_rest_minutes": 120
    },
    {
      "id": "slider_injured_leg_three_directions",
      "name": "Слайдер больной ногой: вправо / назад / вперёд",
      "source": "clinician_session",
      "enabled": true,
      "tier": "B",
      "primary_skills": [
        "ankle_control",
        "movement_control"
      ],
      "secondary_skills": [
        "hip_control"
      ],
      "load_channels": {
        "calf": 0.1,
        "ankle_control": 0.25,
        "dynamic_balance": 0.15,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "directional_reps",
        "directions": [
          "right",
          "back",
          "forward"
        ],
        "reps_per_direction": 5,
        "sets": 2
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 240,
      "instructions": [
        "Здоровая левая нога — опорная и слегка согнута.",
        "Правая стопа прижимает скользящий кружок к полу.",
        "Сдвинуть вправо и вернуть, назад и вернуть, вперёд и вернуть.",
        "Движение медленное и контролируемое."
      ],
      "notes": "Домашняя частота реабилитологом явно не задавалась; значения частоты — технический консервативный default приложения, а не медицинское назначение.",
      "status": "active",
      "order_in_tier": 8,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "light",
      "skill_credit": {
        "movement_control": 0.7,
        "ankle_control": 0.5,
        "dynamic_balance": 0.4
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "equipment": [
        "slider_or_towel_on_smooth_floor"
      ],
      "context_tags": [
        "smooth_floor"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": false,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "maintain",
        "ceiling": 5,
        "step": 1
      }
    },
    {
      "id": "hemisphere_weight_shift_injured_front",
      "name": "Полусфера: перенос веса на больную ногу — прежняя карточка",
      "source": "clinician_session",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "static_balance",
        "ankle_control"
      ],
      "secondary_skills": [
        "dynamic_balance"
      ],
      "load_channels": {
        "calf": 0.2,
        "ankle_control": 0.55,
        "dynamic_balance": 0.35,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 10,
        "sets": 3
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 3
      },
      "min_rest_minutes": 240,
      "instructions": [
        "Прежнее описание не уточняло положение обеих стоп и смену ног. Карточка сохранена для истории.",
        "Уточнённые варианты: обе пятки подняты, передняя стопа на оборудовании, задняя на полу. Для правой и левой ноги впереди теперь отдельные карточки; балансборд и полусфера учитываются отдельно."
      ],
      "progression": {
        "type": "duration_levels",
        "levels_sec": [
          10,
          12,
          14,
          16,
          18,
          20
        ],
        "success_sessions_per_level": 3,
        "require_pain_at_most": 2,
        "require_rpe_at_most": 5,
        "final_goal": "несколько комфортных подходов по 20–30 секунд",
        "ceiling": 20,
        "step": 2,
        "reduce_step": 2
      },
      "status": "archived",
      "order_in_tier": 9,
      "mastery_tracking": {
        "enabled": true,
        "metric": "hold_seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ],
        "mastered_definition": "3x30s comfortable, low errors, no symptom reaction"
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "static_balance": 1.0,
        "ankle_control": 0.9,
        "dynamic_balance": 0.5
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "notes": "",
      "equipment": [
        "hemisphere_or_balance_dome"
      ],
      "context_tags": [
        "equipment"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      }
    },
    {
      "id": "hemisphere_weight_shift_rear_heel_up",
      "name": "Полусфера: перенос веса + задняя пятка поднята — прежняя карточка",
      "source": "clinician_session",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "static_balance",
        "ankle_control"
      ],
      "secondary_skills": [
        "calf"
      ],
      "load_channels": {
        "calf": 0.3,
        "ankle_control": 0.65,
        "dynamic_balance": 0.4,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 10,
        "sets": 3
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 300,
      "instructions": [
        "Прежнее описание не уточняло положение обеих стоп и смену ног. Карточка сохранена для истории.",
        "Уточнённые варианты: обе пятки подняты, передняя стопа на оборудовании, задняя на полу. Для правой и левой ноги впереди теперь отдельные карточки; балансборд и полусфера учитываются отдельно."
      ],
      "progression": {
        "type": "duration_levels",
        "levels_sec": [
          10,
          12,
          14,
          16,
          18,
          20
        ],
        "success_sessions_per_level": 3,
        "ceiling": 20,
        "step": 2,
        "reduce_step": 2
      },
      "status": "archived",
      "order_in_tier": 10,
      "mastery_tracking": {
        "enabled": true,
        "metric": "hold_seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "static_balance": 1.0,
        "ankle_control": 1.0,
        "calf_strength_endurance": 0.4
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "notes": "",
      "equipment": [
        "hemisphere_or_balance_dome"
      ],
      "context_tags": [
        "equipment"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      }
    },
    {
      "id": "balance_board_both_tiptoe_right_front",
      "name": "Балансборд: обе ноги на носках — правая впереди",
      "source": "home_equipment_variant",
      "enabled": true,
      "tier": "S",
      "primary_skills": [
        "static_balance",
        "ankle_control"
      ],
      "secondary_skills": [
        "calf"
      ],
      "load_channels": {
        "calf": 0.3,
        "ankle_control": 0.65,
        "dynamic_balance": 0.4,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 10,
        "sets": 3
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1
      },
      "min_rest_minutes": 300,
      "instructions": [
        "Правая нога впереди: передняя часть стопы / носок на детском балансборде.",
        "Левая нога сзади, на полу: опора на носок.",
        "Обе пятки подняты. Удерживать положение так, как выполнялось с реабилитологом.",
        "После нескольких подходов поменять ноги местами. Подходы с другой ногой впереди записывать в её отдельной карточке.",
        "Указанный объём относится только к ноге впереди, названной в этой карточке. Это начальный объём приложения, а не новое назначение реабилитолога.",
        "Дома используется детский балансборд; по твоим ощущениям он значительно легче полусферы. Его освоение учитывается отдельно от полусферы.",
        "Тест балансборда с передней стопой целиком на поверхности — другой вариант: здесь передняя пятка поднята."
      ],
      "progression": {
        "type": "duration_levels",
        "levels_sec": [
          10,
          12,
          14,
          16,
          18,
          20
        ],
        "success_sessions_per_level": 3,
        "ceiling": 20,
        "step": 2,
        "reduce_step": 2
      },
      "status": "active",
      "order_in_tier": 9,
      "mastery_tracking": {
        "enabled": true,
        "metric": "hold_seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "static_balance": 1.0,
        "ankle_control": 1.0,
        "calf_strength_endurance": 0.4
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "notes": "",
      "equipment": [
        "balance_board"
      ],
      "context_tags": [
        "equipment"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      }
    },
    {
      "id": "balance_board_both_tiptoe_left_front",
      "name": "Балансборд: обе ноги на носках — левая впереди",
      "source": "home_equipment_variant",
      "enabled": true,
      "tier": "S",
      "primary_skills": [
        "static_balance",
        "ankle_control"
      ],
      "secondary_skills": [
        "calf"
      ],
      "load_channels": {
        "calf": 0.3,
        "ankle_control": 0.65,
        "dynamic_balance": 0.4,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 10,
        "sets": 3
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1
      },
      "min_rest_minutes": 300,
      "instructions": [
        "Левая нога впереди: передняя часть стопы / носок на детском балансборде.",
        "Правая нога сзади, на полу: опора на носок.",
        "Обе пятки подняты. Удерживать положение так, как выполнялось с реабилитологом.",
        "После нескольких подходов поменять ноги местами. Подходы с другой ногой впереди записывать в её отдельной карточке.",
        "Указанный объём относится только к ноге впереди, названной в этой карточке. Это начальный объём приложения, а не новое назначение реабилитолога.",
        "Дома используется детский балансборд; по твоим ощущениям он значительно легче полусферы. Его освоение учитывается отдельно от полусферы.",
        "Тест балансборда с передней стопой целиком на поверхности — другой вариант: здесь передняя пятка поднята."
      ],
      "progression": {
        "type": "duration_levels",
        "levels_sec": [
          10,
          12,
          14,
          16,
          18,
          20
        ],
        "success_sessions_per_level": 3,
        "ceiling": 20,
        "step": 2,
        "reduce_step": 2
      },
      "status": "active",
      "order_in_tier": 10,
      "mastery_tracking": {
        "enabled": true,
        "metric": "hold_seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "static_balance": 1.0,
        "ankle_control": 1.0,
        "calf_strength_endurance": 0.4
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "notes": "",
      "equipment": [
        "balance_board"
      ],
      "context_tags": [
        "equipment"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      }
    },
    {
      "id": "hemisphere_both_tiptoe_right_front",
      "name": "Полусфера: обе ноги на носках — правая впереди",
      "source": "clinician_session",
      "enabled": true,
      "tier": "S",
      "primary_skills": [
        "static_balance",
        "ankle_control"
      ],
      "secondary_skills": [
        "calf"
      ],
      "load_channels": {
        "calf": 0.3,
        "ankle_control": 0.65,
        "dynamic_balance": 0.4,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 10,
        "sets": 3
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1
      },
      "min_rest_minutes": 300,
      "instructions": [
        "Правая нога впереди: передняя часть стопы / носок на полусфере.",
        "Левая нога сзади, на полу: опора на носок.",
        "Обе пятки подняты. Удерживать положение так, как выполнялось с реабилитологом.",
        "После нескольких подходов поменять ноги местами. Подходы с другой ногой впереди записывать в её отдельной карточке.",
        "Указанный объём относится только к ноге впереди, названной в этой карточке. Это начальный объём приложения, а не новое назначение реабилитолога.",
        "Этот вариант выполнялся на полусфере с реабилитологом. Домашний балансборд учитывается отдельно; его освоение не подтверждает освоение полусферы.",
        "Тест балансборда с передней стопой целиком на поверхности — другой вариант: здесь передняя пятка поднята."
      ],
      "progression": {
        "type": "duration_levels",
        "levels_sec": [
          10,
          12,
          14,
          16,
          18,
          20
        ],
        "success_sessions_per_level": 3,
        "ceiling": 20,
        "step": 2,
        "reduce_step": 2
      },
      "status": "available",
      "order_in_tier": 11,
      "mastery_tracking": {
        "enabled": true,
        "metric": "hold_seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "static_balance": 1.0,
        "ankle_control": 1.0,
        "calf_strength_endurance": 0.4
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "notes": "",
      "equipment": [
        "hemisphere"
      ],
      "context_tags": [
        "equipment"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      }
    },
    {
      "id": "hemisphere_both_tiptoe_left_front",
      "name": "Полусфера: обе ноги на носках — левая впереди",
      "source": "clinician_session",
      "enabled": true,
      "tier": "S",
      "primary_skills": [
        "static_balance",
        "ankle_control"
      ],
      "secondary_skills": [
        "calf"
      ],
      "load_channels": {
        "calf": 0.3,
        "ankle_control": 0.65,
        "dynamic_balance": 0.4,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 10,
        "sets": 3
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1
      },
      "min_rest_minutes": 300,
      "instructions": [
        "Левая нога впереди: передняя часть стопы / носок на полусфере.",
        "Правая нога сзади, на полу: опора на носок.",
        "Обе пятки подняты. Удерживать положение так, как выполнялось с реабилитологом.",
        "После нескольких подходов поменять ноги местами. Подходы с другой ногой впереди записывать в её отдельной карточке.",
        "Указанный объём относится только к ноге впереди, названной в этой карточке. Это начальный объём приложения, а не новое назначение реабилитолога.",
        "Этот вариант выполнялся на полусфере с реабилитологом. Домашний балансборд учитывается отдельно; его освоение не подтверждает освоение полусферы.",
        "Тест балансборда с передней стопой целиком на поверхности — другой вариант: здесь передняя пятка поднята."
      ],
      "progression": {
        "type": "duration_levels",
        "levels_sec": [
          10,
          12,
          14,
          16,
          18,
          20
        ],
        "success_sessions_per_level": 3,
        "ceiling": 20,
        "step": 2,
        "reduce_step": 2
      },
      "status": "available",
      "order_in_tier": 12,
      "mastery_tracking": {
        "enabled": true,
        "metric": "hold_seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "static_balance": 1.0,
        "ankle_control": 1.0,
        "calf_strength_endurance": 0.4
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "notes": "",
      "equipment": [
        "hemisphere"
      ],
      "context_tags": [
        "equipment"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      }
    },
    {
      "id": "obstacle_high_knee_heel_to_toe",
      "name": "Перешагивание препятствий: цапля + пятка-перекат",
      "source": "clinician_session",
      "enabled": true,
      "tier": "A",
      "primary_skills": [
        "gait_control",
        "single_leg_control"
      ],
      "secondary_skills": [
        "dynamic_balance"
      ],
      "load_channels": {
        "calf": 0.15,
        "ankle_control": 0.3,
        "dynamic_balance": 0.3,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "steps",
        "target_steps": 20,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 180,
      "instructions": [
        "Медленно перешагивать через безопасные невысокие препятствия.",
        "Перед шагом поднимать колено высоко, как 'цапля'.",
        "Ставить стопу на пятку и плавно перекатываться через всю стопу к носку.",
        "Не торопиться; качество шага важнее скорости."
      ],
      "notes": "Домашняя частота реабилитологом явно не задавалась.",
      "status": "active",
      "order_in_tier": 11,
      "mastery_tracking": {
        "enabled": true,
        "metric": "clean_steps",
        "successful_sessions_required": 3,
        "quality_fields": [
          "stumbles",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "gait_control": 1.0,
        "single_leg_control": 0.8,
        "dynamic_balance": 0.5
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "equipment": [
        "safe_low_obstacles"
      ],
      "context_tags": [
        "space"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "maintain",
        "ceiling": 15,
        "step": 1
      }
    },
    {
      "id": "tiptoe_sidewalk_ball_reaction",
      "name": "Боковая ходьба на носках + ловля мяча",
      "source": "clinician_session",
      "enabled": true,
      "tier": "A",
      "primary_skills": [
        "reactive_balance",
        "lateral_stability"
      ],
      "secondary_skills": [
        "calf",
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.55,
        "ankle_control": 0.55,
        "dynamic_balance": 0.6,
        "lateral": 0.55,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 30,
        "sets": 2
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 360,
      "instructions": [
        "Ходить на носках вправо-влево.",
        "Партнёр бросает большой мягкий мяч как прямо в корпус, так и немного в стороны.",
        "Задача — ловить мяч без резких провалов стопы и без потери контроля."
      ],
      "solo_alternative": "броски небольшого мягкого мяча в стену с небольшими смещениями цели",
      "notes": "Домашняя частота реабилитологом явно не задавалась.",
      "status": "active",
      "order_in_tier": 12,
      "mastery_tracking": {
        "enabled": true,
        "metric": "seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "misses",
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "reactive_control": 1.0,
        "lateral_stability": 0.8,
        "dynamic_balance": 0.8,
        "calf_strength_endurance": 0.6
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "equipment": [
        "soft_ball_or_wall"
      ],
      "substitute_ids": [
        "tiptoe_sidewalk_cone_reach"
      ],
      "context_tags": [
        "space",
        "dynamic"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "maintain",
        "ceiling": 30,
        "step": 1
      }
    },
    {
      "id": "tiptoe_square_corner_lunges",
      "name": "Фишки-квадрат: выпады к углам на носках",
      "source": "clinician_session",
      "enabled": true,
      "tier": "S",
      "primary_skills": [
        "multidirectional_control",
        "dynamic_balance"
      ],
      "secondary_skills": [
        "calf",
        "lateral_stability"
      ],
      "load_channels": {
        "calf": 0.5,
        "ankle_control": 0.6,
        "dynamic_balance": 0.65,
        "lateral": 0.6,
        "impact": 0.0
      },
      "dose": {
        "type": "directional_rounds",
        "directions": 4,
        "rounds": 2
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 360,
      "instructions": [
        "Встать в центр квадрата из четырёх фишек.",
        "Работать на носках.",
        "Делать контролируемые выпады больной правой ногой к углам и касаться соответствующей фишки рукой.",
        "Возвращаться контролируемо, не прыжком."
      ],
      "notes": "Домашняя частота реабилитологом явно не задавалась.",
      "status": "active",
      "order_in_tier": 13,
      "mastery_tracking": {
        "enabled": true,
        "metric": "clean_rounds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "multidirectional_control": 1.0,
        "dynamic_balance": 1.0,
        "lateral_stability": 0.8,
        "calf_strength_endurance": 0.6
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "equipment": [
        "4_cones_or_markers"
      ],
      "context_tags": [
        "space",
        "dynamic"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "maintain",
        "ceiling": 2,
        "step": 1
      }
    },
    {
      "id": "tiptoe_sidewalk_cone_reach",
      "name": "Боковая ходьба на носках + касание фишек",
      "source": "clinician_session",
      "enabled": true,
      "tier": "A",
      "primary_skills": [
        "lateral_stability",
        "dynamic_balance"
      ],
      "secondary_skills": [
        "calf"
      ],
      "load_channels": {
        "calf": 0.5,
        "ankle_control": 0.5,
        "dynamic_balance": 0.55,
        "lateral": 0.55,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 30,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 300,
      "instructions": [
        "Поставить фишки/ориентиры по бокам.",
        "Ходить вправо-влево на носках.",
        "По очереди дотягиваться рукой до фишек."
      ],
      "notes": "Домашняя частота реабилитологом явно не задавалась.",
      "status": "active",
      "order_in_tier": 14,
      "mastery_tracking": {
        "enabled": true,
        "metric": "seconds",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "technique"
        ]
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "lateral_stability": 0.9,
        "dynamic_balance": 0.8,
        "calf_strength_endurance": 0.6
      },
      "frequency_basis": "product_default_after_supervised_tolerance",
      "equipment": [
        "cones_or_household_markers"
      ],
      "substitute_ids": [
        "tiptoe_sidewalk_ball_reaction"
      ],
      "context_tags": [
        "space",
        "dynamic"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "maintain",
        "ceiling": 30,
        "step": 1
      }
    },
    {
      "id": "sand_tiptoe_walk_or_stand",
      "name": "Стояние/ходьба на носках по песку",
      "source": "optional_context",
      "enabled": false,
      "tier": "C",
      "primary_skills": [
        "calf_endurance",
        "unstable_surface_control"
      ],
      "secondary_skills": [
        "dynamic_balance"
      ],
      "load_channels": {
        "calf": 0.65,
        "ankle_control": 0.45,
        "dynamic_balance": 0.4,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "duration_sets",
        "target_sec": 45,
        "sets": 2
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 1
      },
      "min_rest_minutes": 480,
      "instructions": [
        "Использовать как дополнительную игровую активность, а не тест на максимальную выносливость.",
        "Не соревноваться регулярно 'до последнего'."
      ],
      "notes": "Если после песка икры заметно утомлены несколько часов, считать силовую/икроножную нагрузку на день частично выполненной.",
      "status": "available",
      "order_in_tier": 15,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "light",
      "skill_credit": {
        "calf_strength_endurance": 0.7,
        "unstable_surface_control": 0.7,
        "dynamic_balance": 0.5
      },
      "frequency_basis": "optional_activity",
      "equipment": [
        "sand"
      ],
      "context_tags": [
        "outdoors"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": false,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "none"
      }
    },
    {
      "id": "single_leg_calf_raise",
      "name": "Подъём на носок одной ногой",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "calf_strength",
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.75,
        "ankle_control": 0.35,
        "dynamic_balance": 0.1,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "reps_sets",
        "reps": 5,
        "sets": 2,
        "sides": 2
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 720,
      "activation_rule": "Включать вручную, когда пользователь/врач решит добавить отдельную силовую прогрессию.",
      "status": "available",
      "order_in_tier": 16,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "calf_strength_endurance": 1.0,
        "ankle_control": 0.5
      },
      "frequency_basis": "manual_add_only",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "calf_strength",
        "ceiling": 12,
        "step": 1,
        "reduce_step": 1,
        "next_exercise_id": "weighted_calf_raise",
        "test_probe": {
          "reps": 2,
          "sets": 1
        }
      },
      "instructions": [
        "Доза указана для каждой ноги отдельно. Между подходами отдыхай две минуты; опора рукой только для равновесия."
      ]
    },
    {
      "id": "band_eversion",
      "name": "Эверсия стопы с резинкой",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "peroneal_strength",
        "lateral_stability"
      ],
      "load_channels": {
        "calf": 0.2,
        "ankle_control": 0.3,
        "dynamic_balance": 0.0,
        "lateral": 0.35,
        "impact": 0.0
      },
      "dose": {
        "type": "reps_sets",
        "reps": 10,
        "sets": 2,
        "resistance": "current"
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 360,
      "activation_rule": "Не включать автоматически: это обсуждалось как полезное дополнение, но не было назначено очным реабилитологом.",
      "status": "available",
      "order_in_tier": 17,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "lateral_stability": 0.8,
        "peroneal_strength": 1.0
      },
      "frequency_basis": "manual_add_only",
      "equipment": [
        "resistance_band"
      ],
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "reps_then_variant",
        "ceiling": 15,
        "step": 1,
        "reduce_step": 1,
        "probe_reps": 10
      }
    },
    {
      "id": "hops_and_direction_changes",
      "name": "Прыжки и быстрые смены направления",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "tier": "FUTURE",
      "primary_skills": [
        "plyometric_control",
        "return_to_run"
      ],
      "load_channels": {
        "calf": 0.8,
        "ankle_control": 0.8,
        "dynamic_balance": 0.9,
        "lateral": 0.0,
        "impact": 0.9
      },
      "min_rest_minutes": 1440,
      "activation_rule": "Только отдельной ручной активацией после разрешения врача/реабилитолога или явного решения пользователя на следующем этапе.",
      "status": "locked",
      "order_in_tier": 18,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "impact_control": 1.0,
        "reactive_control": 1.0,
        "return_to_run": 1.0
      },
      "frequency_basis": "manual_add_only",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      }
    },
    {
      "id": "single_leg_multidirectional_reach",
      "name": "Баланс на правой ноге + движение свободной ногой в нескольких направлениях",
      "source": "assistant_suggested_disabled",
      "status": "available",
      "enabled": false,
      "tier": "S",
      "order_in_tier": 999,
      "primary_skills": [
        "multidirectional_control",
        "single_leg_control"
      ],
      "secondary_skills": [
        "ankle_control",
        "dynamic_balance"
      ],
      "skill_credit": {
        "multidirectional_control": 1.0,
        "single_leg_control": 0.9,
        "ankle_control": 0.8,
        "dynamic_balance": 0.7
      },
      "load_channels": {
        "calf": 0.25,
        "ankle_control": 0.55,
        "dynamic_balance": 0.55,
        "lateral": 0.35,
        "impact": 0.0
      },
      "dose": {
        "type": "directional_reps",
        "directions": [
          "front",
          "side",
          "back_diagonal"
        ],
        "reps_per_direction": 3,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 300,
      "instructions": [
        "Правая нога остаётся опорной.",
        "Свободной ногой дотянуться/коснуться ориентиров в разных направлениях.",
        "Двигаться медленно; качество и спокойная стопа важнее дальности."
      ],
      "frequency_basis": "manual_add_only",
      "activation_rule": "Обсуждалось как полезное дополнение; добавлять в ACTIVE только вручную.",
      "mastery_tracking": {
        "enabled": true,
        "metric": "clean_reaches",
        "successful_sessions_required": 3,
        "quality_fields": [
          "balance_errors",
          "support_touches",
          "technique"
        ]
      },
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "maintain",
        "ceiling": 3,
        "step": 1
      },
      "prescription_credit": {
        "group": "front_back_balance",
        "target_per_day": 3,
        "max_per_day": 4,
        "variant_of": "right_leg_balance_left_front_back"
      }
    },
    {
      "id": "bilateral_calf_raise",
      "name": "Подъёмы на носки двумя ногами",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "calf_strength",
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.4,
        "ankle_control": 0.35,
        "dynamic_balance": 0.1,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "reps_sets",
        "reps": 6,
        "sets": 1
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 720,
      "activation_rule": "Добавляй только уже разрешённую тебе нагрузку. Первая небольшая проба — настройка приложения, не назначение врача.",
      "status": "available",
      "order_in_tier": 16,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "calf_strength_endurance": 1.0,
        "ankle_control": 0.5
      },
      "frequency_basis": "manual_add_only",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "small_step",
        "step": 1,
        "reduce_step": 1,
        "ceiling": 12,
        "next_exercise_id": "assisted_single_leg_calf_raise"
      },
      "instructions": [
        "Встань на ровный пол рядом с опорой. Вес на двух ногах.",
        "Плавно подними обе пятки и опусти их. Сохраняй высоту и темп.",
        "Закончи при потере контроля, боли или ухудшении. Это движение, не статическое удержание."
      ],
      "new_protocol": true
    },
    {
      "id": "assisted_single_leg_calf_raise",
      "name": "Подъём на носок правой ногой с помощью опоры",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "calf_strength",
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.55,
        "ankle_control": 0.35,
        "dynamic_balance": 0.1,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "reps_sets",
        "reps": 4,
        "sets": 1,
        "support": "usual"
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 720,
      "activation_rule": "Добавляй только уже разрешённую тебе нагрузку. Первая небольшая проба — настройка приложения, не назначение врача.",
      "status": "available",
      "order_in_tier": 16,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "calf_strength_endurance": 1.0,
        "ankle_control": 0.5
      },
      "frequency_basis": "manual_add_only",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "small_step",
        "step": 1,
        "reduce_step": 1,
        "ceiling": 10
      },
      "instructions": [
        "Встань на правую ногу у устойчивой опоры. Помогай руками настолько, чтобы движение оставалось ровным.",
        "Плавно подними пятку и опусти. Не переноси дозу с двух ног.",
        "Закончи при потере высоты, контроля или ухудшении."
      ],
      "new_protocol": true
    },
    {
      "id": "weighted_calf_raise",
      "name": "Одноногие подъёмы на носок с дополнительным весом",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "calf_strength",
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.65,
        "ankle_control": 0.35,
        "dynamic_balance": 0.1,
        "lateral": 0.0,
        "impact": 0.0
      },
      "dose": {
        "type": "reps_sets",
        "reps": 8,
        "sets": 3,
        "weight_kg": "1",
        "sides": 2,
        "protocol_id": "single_leg_weighted_floor_v2"
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 720,
      "activation_rule": "Добавляй только уже разрешённую тебе нагрузку. Первая небольшая проба — настройка приложения, не назначение врача.",
      "status": "available",
      "order_in_tier": 16,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "calf_strength_endurance": 1.0,
        "ankle_control": 0.5
      },
      "frequency_basis": "manual_add_only",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "weighted_strength",
        "ceiling": 12,
        "step": 1,
        "reduce_step": 1
      },
      "instructions": [
        "Стой на одной ноге на ровном полу, касаясь опоры только для равновесия.",
        "Удерживай небольшой фактический груз; сохрани высоту и контролируемое опускание.",
        "Повтори заданные подходы отдельно каждой ногой. Между подходами отдыхай две минуты.",
        "Старые двуногие записи с грузом относятся к другой задаче."
      ],
      "new_protocol": true
    },
    {
      "id": "hop_to_stabilization",
      "name": "Небольшой прыжок с остановкой приземления",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "tier": "S",
      "primary_skills": [
        "calf_strength",
        "ankle_control"
      ],
      "load_channels": {
        "calf": 0.65,
        "ankle_control": 0.35,
        "dynamic_balance": 0.4,
        "lateral": 0.0,
        "impact": 0.6
      },
      "dose": {
        "type": "reps_sets",
        "reps": 3,
        "sets": 2
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 720,
      "activation_rule": "Добавляй только уже разрешённую тебе нагрузку. Первая небольшая проба — настройка приложения, не назначение врача.",
      "status": "available",
      "order_in_tier": 16,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "impact_control": 1,
        "reactive_control": 0.5
      },
      "frequency_basis": "manual_add_only",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "small_step",
        "step": 1,
        "reduce_step": 1,
        "ceiling": 5
      },
      "instructions": [
        "Только после разрешения ударной работы. Ровный пол, страховочная опора рядом.",
        "Сделай маленький прыжок двумя ногами. Мягко приземлись и полностью остановись на 2 секунды.",
        "Следующий прыжок начинай из устойчивого положения. Закончи при боли, шаткости, отёке или потере контроля. Это тренировка, не тест.",
        "После каждого невысокого приземления удерживай положение две секунды; между подходами отдыхай 60–90 секунд."
      ],
      "new_protocol": true,
      "unlock_stage": "ready_for_impact"
    },
    {
      "id": "bilateral_pogo",
      "name": "Низкие упругие прыжки двумя ногами",
      "source": "assistant_suggested_disabled",
      "enabled": false,
      "status": "available",
      "tier": "S",
      "primary_skills": [
        "impact_control",
        "reactive_control"
      ],
      "load_channels": {
        "calf": 0.65,
        "ankle_control": 0.35,
        "dynamic_balance": 0.4,
        "lateral": 0,
        "impact": 0.65
      },
      "dose": {
        "type": "reps_sets",
        "reps": 5,
        "sets": 2
      },
      "recommended_frequency": {
        "min_per_day": 0,
        "max_per_day": 1,
        "suggested_days_per_week": 2
      },
      "min_rest_minutes": 720,
      "mastery_tracking": {
        "enabled": true
      },
      "symptom_check_policy": "standard",
      "skill_credit": {
        "impact_control": 1,
        "reactive_control": 1
      },
      "frequency_basis": "manual_add_only",
      "tolerance_tracking": {
        "rolling_sessions": 5,
        "track_pain": true,
        "track_fatigue": true,
        "track_next_day": true,
        "track_outer_ankle_pain": true
      },
      "progression": {
        "type": "pogo_ladder",
        "ceiling": 10,
        "reduce_step": 1
      },
      "instructions": [
        "После подтверждённых двуногих приземлений 2×5 с остановкой. Ровный пол, страховочная опора рядом.",
        "Легко и невысоко подпрыгивай двумя ногами, мягко пружиня голеностопом; не задерживайся на две секунды после каждого контакта.",
        "Начальная проба 2×5. Между подходами отдыхай 60–90 секунд. Затем программа выбирает 2×8 и 2×10 по качеству и утренней реакции.",
        "Закончи при боли, шаткости, потере мягкого приземления или контроля. Это тренировка; тест 20 подряд — отдельная задача."
      ],
      "new_protocol": true,
      "unlock_stage": "ready_for_impact"
    }
  ]
};
