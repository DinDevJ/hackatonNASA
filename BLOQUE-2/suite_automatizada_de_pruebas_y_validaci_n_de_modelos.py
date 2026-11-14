"""
Suite de Pruebas Automatizadas — Motor Biomédico NASA Space Apps 2026
Ejecuta 6 escenarios clínicos verificables contra AstronautHealthEngine.
Uso: python test_suite_validacion.py
"""

import json
import copy
from astronaut_health_engine import AstronautHealthEngine

# Perfil basal prevuelo de referencia (AST-003)
BASE_PROFILE = {
    "crew_id": "AST-003",
    "mission_phase": "in_flight",
    "mission_day": 45,
    "demographics": {"sex": "F", "baseline_body_mass_kg": 62.5},
    "medical_context": {
        "02:V01_preflight_dxa_femoral_neck_g_cm2": 0.92,
        "02:V16_bisphosphonate_mg_week": 70,
        "02:V39_potassium_citrate_meq_day": 20,
        "02:V38_renal_stone_history": {"has_history": False, "episodes": 0},
        "01:V64_hormonal_therapy": {"active": True, "type": "combined_ocp"}
    },
    "preflight_baselines": {
        "01:V108_hemoglobin_g_dl": {"mean": 13.4, "sd": 0.4},
        "01:V109_hematocrit_pct": {"mean": 40.2, "sd": 1.2},
        "01:V98_lymphocytes_10e9_l": {"mean": 2.1, "sd": 0.3},
        "01:V99_neutrophils_10e9_l": {"mean": 3.8, "sd": 0.6},
        "01:V117_wbc_10e9_l": {"mean": 6.4, "sd": 0.8},
        "02:V31_serum_sodium_mmol_l": {"mean": 140.0, "sd": 1.5},
        "02:V14_serum_calcium_mg_dl": {"mean": 9.4, "sd": 0.3},
        "02:V07_urinary_ntx_nmol_day": {"mean": 310.0, "sd": 45.0},
        "02:V08_serum_ctx_ng_ml": {"mean": 0.34, "sd": 0.08},
        "01:V104_pvt_reaction_ms": {"mean": 245.0, "sd": 18.0}
    }
}

# Telemetría nominal de partida
NOMINAL_TELEMETRY = {
    "mission_day": 45,
    "mission_phase": "in_flight",
    "radiation_telemetry": {
        "01:V90_cumulative_effective_dose_msv": 85.0,
        "01:V91_dose_equivalent_rate_msv_day": 0.68,
        "01:V95_peak_dose_rate_mgy_h": 0.03,
        "01:V96_space_weather_shelter": {"alert_active": False, "shelter_setup_minutes": None, "time_in_shelter_hours": 0.0}
    },
    "hydration_and_urine": {
        "02:V34_fluid_intake_ml": 2300,
        "02:V35_current_body_mass_kg": 62.1,
        "02:V32_urine_specific_gravity": 1.012,
        "02:V33_urine_color_camera": {"cie_b_star": 14.5},
        "02:V20_urine_ph": 6.2,
        "01:V30_dipstick": {"blood_hematuria": "negative", "nitrites": "negative"}
    },
    "exercise_symptoms_cognition": {
        "02:V15_ared_session": {"sessions_last_7d": 6, "peak_load_bodyweight_multiple": 2.4},
        "01:V101_radiation_prodromal_symptoms": {"nausea": False, "vomiting_episodes": 0},
        "01:V100_hours_to_first_emesis": None,
        "01:V118_anemia_symptoms": {"exertional_dyspnea": False, "orthostatic_dizziness": False},
        "02:V37_renal_colic_symptoms": {"flank_pain_scale_0_10": 0, "gross_hematuria": False},
        "01:V104_cognitive_pvt": {"mean_reaction_ms": 248.0, "lapses_count": 1}
    }
}

NOMINAL_LAB = {
    "mission_phase": "in_flight",
    "lab_results": [
        {"id": "01:V108", "value": 13.5},
        {"id": "01:V109", "value": 40.5},
        {"id": "01:V98", "value": 2.05},
        {"id": "01:V99", "value": 3.9},
        {"id": "01:V117", "value": 6.5},
        {"id": "02:V31", "value": 140.2},
        {"id": "02:V14", "value": 9.4},
        {"id": "02:V07", "value": 330.0},
        {"id": "02:V08", "value": 0.36}
    ]
}


def print_result(scenario_num: int, name: str, result: dict):
    print("=" * 78)
    print(f"ESCENARIO {scenario_num}: {name}")
    print(f"Estado -> DMO Proyectada: {result['bone_projection']['projected_dmo_pct']}% | "
          f"Cruce Hueso-Riñón: {result['bone_renal_cross_active']} | "
          f"Alertas Totales: {result['total_alerts']}")
    if not result["alerts"]:
        print("  [OK] Sin alertas clínicas. Todos los parámetros dentro de umbral/línea base.")
    for a in result["alerts"]:
        print(f"  [{a['severity']}] ({a['subsystem']} - {', '.join(a['variable_ids'])}) {a['title']}")
        print(f"     Detalle: {a['detail']}")
        print(f"     Acción : {a['recommendation']}")
    print("PASS \n")


def run_all_tests():
    # -------------------------------------------------------------------------
    # ESCENARIO 1: Operación Nominal en Órbita
    # -------------------------------------------------------------------------
    engine = AstronautHealthEngine(copy.deepcopy(BASE_PROFILE))
    res1 = engine.evaluate_all(copy.deepcopy(NOMINAL_TELEMETRY), copy.deepcopy(NOMINAL_LAB))
    assert res1["total_alerts"] == 0, f"Se esperaban 0 alertas, se obtuvieron {res1['total_alerts']}"
    assert res1["bone_projection"]["ared_compliant"] is True
    assert res1["bone_renal_cross_active"] is False
    print_result(1, "Operación Nominal en Órbita (Día 45)", res1)

    # -------------------------------------------------------------------------
    # ESCENARIO 2: Tormenta Solar (SPE) + Síntomas Cruzados + Linfopenia
    # -------------------------------------------------------------------------
    tel2 = copy.deepcopy(NOMINAL_TELEMETRY)
    tel2["radiation_telemetry"]["01:V95_peak_dose_rate_mgy_h"] = 118.0
    tel2["radiation_telemetry"]["01:V96_space_weather_shelter"] = {
        "alert_active": True, "shelter_setup_minutes": 40, "time_in_shelter_hours": 3.5
    }
    tel2["exercise_symptoms_cognition"]["01:V101_radiation_prodromal_symptoms"] = {
        "nausea": True, "vomiting_episodes": 1
    }
    tel2["exercise_symptoms_cognition"]["01:V100_hours_to_first_emesis"] = 1.5

    lab2 = copy.deepcopy(NOMINAL_LAB)
    for item in lab2["lab_results"]:
        if item["id"] == "01:V98":
            item["value"] = 1.15  # Caída aguda de linfocitos (Z = -3.17)

    res2 = engine.evaluate_all(tel2, lab2)
    critical_titles = [a["title"] for a in res2["alerts"] if a["severity"] == "CRITICAL"]
    assert len(critical_titles) == 3, f"Se esperaban 3 alertas CRITICAL (SPE, ARS, Linfopenia), hubo {len(critical_titles)}"
    print_result(2, "Tormenta Solar (SPE) + Síntomas ARS + Biodosimetría Linfocitaria", res2)

    # -------------------------------------------------------------------------
    # ESCENARIO 3: Filtro de Falso Positivo por Mareo Espacial (Día 2)
    # -------------------------------------------------------------------------
    tel3 = copy.deepcopy(NOMINAL_TELEMETRY)
    tel3["mission_day"] = 2
    tel3["exercise_symptoms_cognition"]["01:V101_radiation_prodromal_symptoms"] = {
        "nausea": True, "vomiting_episodes": 2
    }
    res3 = engine.evaluate_all(tel3, copy.deepcopy(NOMINAL_LAB))
    assert not any(a["severity"] == "CRITICAL" for a in res3["alerts"]), "No debe disparar alerta CRITICAL por mareo espacial"
    assert any("Mareo Espacial" in a["title"] for a in res3["alerts"])
    print_result(3, "Filtro de Especificidad: Mareo Espacial en Día 2 (Sin Radiación)", res3)

    # -------------------------------------------------------------------------
    # ESCENARIO 4: Cruce Hueso–Riñón + Riesgo Litiásico (ARED bajo + NTX/Ca altos)
    # -------------------------------------------------------------------------
    base4 = copy.deepcopy(BASE_PROFILE)
    base4["medical_context"]["02:V16_bisphosphonate_mg_week"] = 0
    base4["medical_context"]["02:V38_renal_stone_history"] = {"has_history": True, "episodes": 1}
    engine4 = AstronautHealthEngine(base4)

    tel4 = copy.deepcopy(NOMINAL_TELEMETRY)
    tel4["mission_day"] = 120
    tel4["hydration_and_urine"]["02:V34_fluid_intake_ml"] = 1650
    tel4["hydration_and_urine"]["02:V33_urine_color_camera"]["cie_b_star"] = 24.8
    tel4["hydration_and_urine"]["02:V20_urine_ph"] = 5.3
    tel4["exercise_symptoms_cognition"]["02:V15_ared_session"] = {
        "sessions_last_7d": 3, "peak_load_bodyweight_multiple": 1.4
    }

    lab4 = copy.deepcopy(NOMINAL_LAB)
    for item in lab4["lab_results"]:
        if item["id"] == "02:V14":
            item["value"] = 10.2   # Calcio sérico elevado (Z = +2.67)
        if item["id"] == "02:V07":
            item["value"] = 690.0  # NTX urinario +122.6 %

    res4 = engine4.evaluate_all(tel4, lab4)
    assert res4["bone_renal_cross_active"] is True, "Debe activarse el cruce fisiológico hueso-riñón"
    assert any("cálculos renales" in a["title"].lower() for a in res4["alerts"])
    print_result(4, "Cruce Fisiológico Hueso–Riñón y Riesgo de Litiasis", res4)

    # -------------------------------------------------------------------------
    # ESCENARIO 5: Hemoconcentración en Vuelo vs. Anemia Espacial al Retorno
    # -------------------------------------------------------------------------
    lab5_flight = copy.deepcopy(NOMINAL_LAB)
    for item in lab5_flight["lab_results"]:
        if item["id"] == "01:V108":
            item["value"] = 14.5  # Z = +2.75 sobre 13.4 prevuelo

    res5_flight = engine.evaluate_all(copy.deepcopy(NOMINAL_TELEMETRY), lab5_flight)
    assert any("Hemoconcentración" in a["title"] for a in res5_flight["alerts"])
    print_result(5, "5A. Hemoconcentración Esperada en Vuelo (Evita Falso Positivo)", res5_flight)

    tel5_return = copy.deepcopy(NOMINAL_TELEMETRY)
    tel5_return["mission_phase"] = "post_flight"
    tel5_return["exercise_symptoms_cognition"]["01:V118_anemia_symptoms"]["orthostatic_dizziness"] = True

    lab5_return = copy.deepcopy(NOMINAL_LAB)
    lab5_return["mission_phase"] = "post_flight"
    for item in lab5_return["lab_results"]:
        if item["id"] == "01:V108":
            item["value"] = 11.9  # Caída de -11.2 % respecto a 13.4 prevuelo

    res5_return = engine.evaluate_all(tel5_return, lab5_return)
    assert any("Anemia espacial postvuelo" in a["title"] for a in res5_return["alerts"])
    print_result(5, "5B. Anemia Espacial Confirmada al Retorno (Día R+4)", res5_return)

    # -------------------------------------------------------------------------
    # ESCENARIO 6: Enlentecimiento Cognitivo en Prueba PVT (01:V104)
    # -------------------------------------------------------------------------
    tel6 = copy.deepcopy(NOMINAL_TELEMETRY)
    tel6["exercise_symptoms_cognition"]["01:V104_cognitive_pvt"] = {
        "mean_reaction_ms": 295.0, "lapses_count": 4
    }
    res6 = engine.evaluate_all(tel6, copy.deepcopy(NOMINAL_LAB))
    assert any("PVT" in a["title"] for a in res6["alerts"])
    print_result(6, "Evaluación Cognitiva Individualizada (PVT 01:V104)", res6)

    print("TODAS LAS PRUEBAS DE VALIDACIÓN SE EJECUTARON EXITOSAMENTE CON LOS UMBRALES DEFINIDOS.")


if __name__ == "__main__":
    run_all_tests()