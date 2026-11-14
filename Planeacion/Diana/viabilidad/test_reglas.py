"""Pruebas de las reglas de Diana. Correr con:  python -m pytest Planeacion/Diana/viabilidad -q"""
from pathlib import Path

import numpy as np
import pytest

from motor_reglas import cargar_reglas, evaluar, z_robusto

REGLAS = cargar_reglas(Path(__file__).with_name("reglas_diana.yaml"))


def ids(actual, historial=None):
    return {r.id for r in evaluar(REGLAS, actual, historial)}


# ---------------------------------------------------------------- fatiga multivariable (Ana)
def escenario_ana(dias_cortos=3, rhr_hoy=66.0, rmssd_hoy=38.0):
    rng = np.random.default_rng(1)
    sueno = list(7.1 + rng.normal(0, 0.25, 14)) + [5.6] * dias_cortos  # basal 7 h 05 m
    rhr = list(58 + rng.normal(0, 1.5, 14))
    rmssd = list(62 + rng.normal(0, 5, 14))
    actual = {"03:V18_resting_hr_sleep_bpm": rhr_hoy, "03:V17_hrv_rmssd_ms": rmssd_hoy}
    hist = {"04:A40_sleep_duration_h": sueno, "03:V18_resting_hr_sleep_bpm": rhr,
            "03:V17_hrv_rmssd_ms": rmssd}
    return actual, hist


def test_fatiga_dispara_con_las_tres_senales():
    assert "PREV-FATIGA-MULTIVAR-01" in ids(*escenario_ana())


def test_fatiga_no_dispara_con_solo_dos_noches_cortas():
    assert "PREV-FATIGA-MULTIVAR-01" not in ids(*escenario_ana(dias_cortos=2))


def test_fatiga_no_dispara_si_solo_falla_el_sueno():
    assert "PREV-FATIGA-MULTIVAR-01" not in ids(*escenario_ana(rhr_hoy=58.5, rmssd_hoy=61))


def test_sin_linea_base_suficiente_no_dispara():
    actual, hist = escenario_ana()
    hist = {k: v[-6:] for k, v in hist.items()}  # menos de 7 días
    assert "PREV-FATIGA-MULTIVAR-01" not in ids(actual, hist)


def test_z_robusto_con_mad_cero_no_revienta():
    assert z_robusto(70, [60] * 14) is None


# ---------------------------------------------------------------- GI
@pytest.mark.parametrize("actual, dispara", [
    ({"04:A43_diarrhea_present": True, "04:A1_body_temp_c": 38.2}, True),
    ({"04:A43_diarrhea_present": True, "04:A43_hours_without_improvement": 30}, True),
    ({"04:A43_diarrhea_present": True, "04:A43_hours_without_improvement": 10, "04:A1_body_temp_c": 37.0}, False),
    ({"04:A43_diarrhea_present": False, "04:A1_body_temp_c": 39.0}, False),
])
def test_contact_surgeon_gi(actual, dispara):
    assert ("ESC-CONTACT-SURGEON-GI-01" in ids(actual)) is dispara


def test_oto():
    assert "ESC-CONTACT-SURGEON-OTO-01" in ids({"04:A20_otoscopy_finding": "perforated"})
    assert "ESC-CONTACT-SURGEON-OTO-01" not in ids({"04:A20_otoscopy_finding": "normal"})


# ---------------------------------------------------------------- salud mental
def test_item9_dispara_aunque_el_total_sea_bajo():
    # En NHANES el 31 % de quienes marcan el ítem 9 tienen PHQ-9 < 10
    r = evaluar(REGLAS, {"03:V1_phq9_item9_self_harm": 1, "03:V1_phq9_total": 5})
    seg = [x for x in r if x.id == "PRIV-MENTAL-SAFETY-OVERRIDE-01"]
    assert seg and seg[0].privacy_override == ["CMO", "FLIGHT_SURGEON"]
    assert "PHQ9-AMARILLA-01" not in {x.id for x in r}


def test_item9_cero_no_rompe_el_candado():
    assert "PRIV-MENTAL-SAFETY-OVERRIDE-01" not in ids({"03:V1_phq9_item9_self_harm": 0})


@pytest.mark.parametrize("phq2, item9, abre", [(0, 0, False), (1, 0, False), (2, 0, True), (0, 1, True)])
def test_puerta_checkin(phq2, item9, abre):
    a = {"03:V2_phq2_total": phq2, "03:V1_phq9_item9_self_harm": item9}
    assert ("CHECKIN-ABRIR-PHQ9-01" in ids(a)) is abre


@pytest.mark.parametrize("total, esperado", [(9, set()), (10, {"PHQ9-AMARILLA-01"}), (14, {"PHQ9-AMARILLA-01"}),
                                             (15, {"PHQ9-ROJA-01"})])
def test_niveles_phq9(total, esperado):
    assert ids({"03:V1_phq9_total": total}) & {"PHQ9-AMARILLA-01", "PHQ9-ROJA-01"} == esperado


def test_estres_vas_ambar_y_rojo_excluyentes():
    hist = {"03:V9_stress_vas": [30, 32, 28, 35, 31, 29, 33, 30, 34, 27, 31, 30, 32, 29]}
    assert ids({"03:V9_stress_vas": 36}, hist) & {"ESTRES-VAS-AMBAR-01", "ESTRES-VAS-ROJO-01"} == {"ESTRES-VAS-AMBAR-01"}
    assert ids({"03:V9_stress_vas": 60}, hist) & {"ESTRES-VAS-AMBAR-01", "ESTRES-VAS-ROJO-01"} == {"ESTRES-VAS-ROJO-01"}


# ---------------------------------------------------------------- vigilia y orina
@pytest.mark.parametrize("h, esperado", [(15.9, set()), (16, {"VIGILIA-AMBAR-01"}), (21, {"VIGILIA-ROJA-01"})])
def test_vigilia(h, esperado):
    assert ids({"03:V62_hours_awake": h}) & {"VIGILIA-AMBAR-01", "VIGILIA-ROJA-01"} == esperado


def test_proteina_con_orina_concentrada_no_alarma_a_la_cmo():
    r = ids({"04:A22d_protein_positive": True, "04:A22h_specific_gravity": 1.030})
    assert "ORINA-HIDRATACION-01" in r and "ORINA-PROTEINA-CMO-01" not in r


def test_proteina_con_orina_normal_avisa_a_la_cmo():
    assert "ORINA-PROTEINA-CMO-01" in ids({"04:A22d_protein_positive": True, "04:A22h_specific_gravity": 1.015})


def test_itu_requiere_leucocitos_y_nitritos():
    assert "ORINA-ITU-01" in ids({"04:A22a_leukocytes_positive": True, "04:A22b_nitrites_positive": True})
    assert "ORINA-ITU-01" not in ids({"04:A22a_leukocytes_positive": True, "04:A22b_nitrites_positive": False})


def test_resultados_ordenados_por_gravedad():
    r = evaluar(REGLAS, {"03:V62_hours_awake": 17, "03:V1_phq9_item9_self_harm": 1})
    assert [x.escalation_level for x in r] == sorted([x.escalation_level for x in r], reverse=True)


# ---------------------------------------------------------------- auditoría del YAML
def _condiciones(r):
    for c in r["conditions"]:
        yield from (c["any_of"] if "any_of" in c else [c])


def test_toda_condicion_declara_su_origen():
    faltan = [r["id"] for r in REGLAS for c in _condiciones(r) if c.get("origin") not in ("[A]", "[T]", "tu_normal")]
    assert not faltan, faltan


def test_ids_unicos():
    assert len({r["id"] for r in REGLAS}) == len(REGLAS)
