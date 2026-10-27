'use strict';

const APP = {
  "version": 3,
  "app": {
    "name": "Ankle Mastery",
    "locale": "ru",
    "llm_required": false,
    "offline_first": true,
    "timezone_mode": "local_device"
  },
  "core_principles": [
    "scheduler объяснимый: каждая рекомендация показывает причины",
    "симптомы и усталость важнее дневных целей",
    "не фармить XP повторением одного простого упражнения",
    "load overlap не равен mastery и не равен prescription completion",
    "run readiness не является медицинским разрешением на бег"
  ],
  "ui": {
    "home_screen": {
      "show": [
        "training_mastery",
        "run_readiness",
        "best_now",
        "can_do_now",
        "better_later",
        "daily_prescription_progress",
        "skill_balance",
        "fatigue_channels",
        "next_recommended_time",
        "why_this_recommendation"
      ]
    },
    "quick_actions": [
      "done",
      "choose_other",
      "skip",
      "cannot_do",
      "log_custom_activity",
      "log_symptoms",
      "add_available_exercise"
    ],
    "skip_reasons": [
      "нет оборудования",
      "нет места",
      "устал",
      "дискомфорт",
      "не хочу сейчас",
      "другое"
    ],
    "traffic_light": {
      "green": "можно сейчас",
      "yellow": "доступно, но есть причина отложить/уменьшить",
      "red": "не рекомендовать сейчас"
    }
  },
  "program": {
    "prescription_groups": {
      "towel_straight": {
        "target_per_day": 3,
        "max_per_day": 4,
        "priority": "clinician"
      },
      "towel_bent": {
        "target_per_day": 3,
        "max_per_day": 4,
        "priority": "clinician"
      },
      "tiptoe_static": {
        "target_per_day": 3,
        "max_per_day": 4,
        "priority": "clinician"
      },
      "line_walk": {
        "target_per_day": 3,
        "max_per_day": 4,
        "priority": "clinician",
        "variants_share_credit": true
      },
      "front_back_balance": {
        "target_per_day": 3,
        "max_per_day": 4,
        "priority": "clinician"
      },
      "side_lunge": {
        "target_per_day": 3,
        "max_per_day": 4,
        "priority": "clinician"
      }
    },
    "clinician_session_defaults": {
      "recommended_sessions_per_week": 3,
      "exercises_per_session": [
        3,
        3
      ],
      "note": "product default only; not clinician-prescribed frequency"
    },
    "additional_goals": [
      {
        "id": "controlled_slide",
        "label": "Контроль скольжения больной ногой",
        "exercises": [
          "slider_injured_leg_three_directions"
        ],
        "baseline": true
      },
      {
        "id": "step_clearance",
        "label": "Уверенный шаг через препятствие",
        "exercises": [
          "obstacle_high_knee_heel_to_toe"
        ],
        "baseline": true
      },
      {
        "id": "calf_dynamic",
        "label": "Выносливость икр в подъёме и опускании",
        "exercises": [
          "bilateral_calf_raise",
          "assisted_single_leg_calf_raise",
          "single_leg_calf_raise",
          "weighted_calf_raise"
        ],
        "baseline": true
      },
      {
        "id": "unstable_control",
        "label": "Контроль на нестабильной опоре",
        "exercises": [
          "balance_board_both_tiptoe_right_front",
          "balance_board_both_tiptoe_left_front",
          "hemisphere_both_tiptoe_right_front",
          "hemisphere_both_tiptoe_left_front"
        ],
        "test": "hemisphere_hold"
      },
      {
        "id": "direction_control",
        "label": "Контроль движений в разных направлениях",
        "exercises": [
          "tiptoe_square_corner_lunges",
          "single_leg_multidirectional_reach"
        ],
        "test": "multidirectional_control_clean_rounds"
      },
      {
        "id": "lateral_control",
        "label": "Боковой контроль на носках",
        "exercises": [
          "tiptoe_sidewalk_ball_reaction",
          "tiptoe_sidewalk_cone_reach"
        ],
        "test": "multidirectional_control_clean_rounds"
      },
      {
        "id": "eversion",
        "label": "Работа стопой наружу с сопротивлением",
        "exercises": [
          "band_eversion"
        ],
        "baseline": true
      },
      {
        "id": "landing",
        "label": "Контролируемое приземление",
        "exercises": [
          "hop_to_stabilization",
          "bilateral_pogo"
        ],
        "baseline": true,
        "min_stage": 1
      }
    ]
  },
  "skills": {
    "mobility": {
      "weight": 0.08
    },
    "calf_strength_endurance": {
      "weight": 0.14
    },
    "static_balance": {
      "weight": 0.12
    },
    "dynamic_balance": {
      "weight": 0.16
    },
    "lateral_stability": {
      "weight": 0.14
    },
    "ankle_control": {
      "weight": 0.12
    },
    "gait_control": {
      "weight": 0.08
    },
    "reactive_control": {
      "weight": 0.08
    },
    "multidirectional_control": {
      "weight": 0.08
    }
  },
  "fatigue_channels": {
    "calf": {
      "decay_half_life_hours": 8,
      "yellow_from": 35,
      "red_from": 70
    },
    "ankle_control": {
      "decay_half_life_hours": 4,
      "yellow_from": 40,
      "red_from": 75
    },
    "dynamic_balance": {
      "decay_half_life_hours": 3,
      "yellow_from": 45,
      "red_from": 80
    },
    "lateral": {
      "decay_half_life_hours": 5,
      "yellow_from": 40,
      "red_from": 75
    },
    "impact": {
      "decay_half_life_hours": 18,
      "yellow_from": 25,
      "red_from": 60
    }
  },
  "scheduler": {
    "strategy": "deterministic_score_v2",
    "refresh_on": [
      "app_open",
      "exercise_logged",
      "custom_activity_logged",
      "symptom_logged",
      "exercise_status_changed",
      "clock_tick_15_min"
    ],
    "score_weights": {
      "daily_deficit": 0.25,
      "skill_deficit": 0.2,
      "freshness": 0.2,
      "weekly_balance": 0.15,
      "variety": 0.1,
      "progression_value": 0.1
    },
    "multipliers": [
      "fatigue_modifier",
      "exercise_tolerance_modifier",
      "symptom_modifier",
      "context_availability_modifier"
    ],
    "same_exercise_soft_penalty_minutes": 120,
    "same_primary_skill_penalty": 0.2,
    "recommended_list_size": 5,
    "next_time": {
      "resolution_minutes": 15,
      "search_horizon_hours": 24,
      "green_score_threshold": 0.58
    },
    "explain_recommendation": true,
    "fatigue_demand_reference": 0.65
  },
  "overlap": {
    "load_credit_affects_fatigue": true,
    "load_credit_can_reduce_priority_of_similar_exercises": true,
    "load_credit_closes_prescription_target": false,
    "structured_skill_credit_counts_for_weekly_skill_balance": true,
    "custom_activity_skill_mastery_credit": false,
    "family_variant_can_close_same_prescription_target": true
  },
  "exercise_tolerance": {
    "rolling_window_sessions": 5,
    "positive_sessions_for_progression": 3,
    "modifiers": {
      "normal": 1.0,
      "mild_reaction": 0.85,
      "moderate_reaction": 0.6,
      "strong_reaction": 0.3,
      "safety_lock": 0.0
    },
    "rules": [
      {
        "if": "pain_after <= 1 && !next_day_worse && !swelling && !instability",
        "state": "normal"
      },
      {
        "if": "pain_after == 2 || fatigue == moderate",
        "state": "mild_reaction"
      },
      {
        "if": "pain_after in [3,4] || next_day_worse",
        "state": "moderate_reaction"
      },
      {
        "if": "pain_after >= 5",
        "state": "strong_reaction"
      },
      {
        "if": "swelling || instability",
        "state": "safety_lock"
      }
    ],
    "note": "all numeric cutoffs are product heuristics, not medical diagnostic thresholds"
  },
  "symptom_checks": {
    "after_fields": [
      "pain_during_0_10",
      "pain_after_0_10",
      "local_outer_ankle_pain",
      "fatigue_low_medium_high",
      "instability",
      "swelling",
      "difficulty_easy_normal_hard"
    ],
    "delayed_fields": [
      "later_same_day_worse_same_better",
      "next_morning_worse_same_better"
    ],
    "light_exercises_can_skip_full_check": true,
    "always_ask_after": [
      "tier:S",
      "tier:FUTURE",
      "custom_activity_high_load"
    ]
  },
  "progression": {
    "success_requires": {
      "target_completed": true,
      "pain_during_max": 2,
      "pain_after_max": 2,
      "next_day_worse": false,
      "swelling": false,
      "instability": false,
      "technique": [
        "good",
        "ok"
      ]
    },
    "successful_sessions_required_default": 3,
    "auto_progress_inside_same_exercise": false,
    "offer_progression_confirmation": true,
    "never_auto_unlock_new_exercise": true
  },
  "gamification": {
    "xp": {
      "base_per_useful_dose": 10,
      "same_skill_daily_multipliers": [
        1.0,
        0.65,
        0.35,
        0.15
      ],
      "extra_volume_beyond_cap_xp": 0,
      "no_bonus_for_pain_or_failure": true
    },
    "streak": {
      "day_counts_if_distinct_skills_at_least": 2,
      "rest_freezes_per_week": 2,
      "no_penalty_for_safety_rest": true
    },
    "training_mastery": {
      "separate_from_run_readiness": true,
      "formula": {
        "exercise_mastery": 0.5,
        "skill_consistency_14d": 0.3,
        "symptom_stability_7d": 0.2
      }
    }
  },
  "exercise_lifecycle": {
    "states": [
      "active",
      "available",
      "locked",
      "archived"
    ],
    "available_to_active": "manual user action only",
    "locked_to_available": "manual stage transition / explicit unlock rule; never regular scheduler",
    "archive_preserves_history": true,
    "show_source_badge": true
  },
  "substitutions": {
    "enabled": true,
    "trigger_reasons": [
      "нет оборудования",
      "нет места",
      "не хочу сейчас"
    ],
    "method": "explicit substitute_ids first; then vector similarity",
    "minimum_skill_similarity": 0.7,
    "respect_fatigue_and_symptom_locks": true,
    "do_not_use_locked_or_archived": true
  },
  "custom_activity_logging": {
    "enabled": true,
    "presets": {
      "sand_tiptoe_fun": {
        "name": "Носки на песке",
        "load": {
          "calf": 60,
          "ankle_control": 40,
          "dynamic_balance": 35,
          "lateral": 15,
          "impact": 0
        }
      },
      "long_tiptoe_walk": {
        "name": "Долгая ходьба на носках",
        "load": {
          "calf": 55,
          "ankle_control": 30,
          "dynamic_balance": 25,
          "lateral": 10,
          "impact": 0
        }
      },
      "general_walk": {
        "name": "Обычная прогулка",
        "load": {
          "calf": 10,
          "ankle_control": 10,
          "dynamic_balance": 5,
          "lateral": 0,
          "impact": 0
        }
      }
    },
    "manual_fields": [
      "duration_minutes",
      "calf_load_low_medium_high",
      "balance_load_low_medium_high",
      "lateral_load_low_medium_high",
      "pain_after_0_10",
      "fatigue_low_medium_high"
    ],
    "freeform_requires_llm": false,
    "mastery_credit": false
  },
  "return_to_running": {
    "module_enabled": true,
    "permission_semantics": "readiness estimator only; never medical clearance",
    "initial_stage": "rehab",
    "automatic_running_permission": false,
    "impact_tests_locked_initially": true,
    "clinician_context": "реабилитолог рекомендовал примерно пару месяцев тренировать ноги/голеностоп до уверенного мастерства",
    "calendar_hint_days": 56,
    "calendar_hint_is_approximation": true
  },
  "notifications": {
    "enabled_by_default": false,
    "optional": [
      "next_good_window",
      "evening_delayed_check",
      "next_morning_check",
      "weekly_self_test"
    ]
  },
  "assessment": {
    "session_gap_minutes": 60,
    "nominal_load": 45,
    "load_factor_min": 0.5,
    "load_factor_max": 1.5,
    "fatigue_multipliers": {
      "easy": 0.9,
      "moderate": 1,
      "strong": 1.25
    },
    "moderate_pain_from": 3,
    "safety_pain_from": 5,
    "reaction_modifier": 0.6
  }
};
