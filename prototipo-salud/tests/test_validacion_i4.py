"""Pruebas sin red del adaptador Inspiration4 (fixture minimo con el formato de los archivos OSDR; no son datos)."""
from datetime import date

from validacion import inspiration4 as I


def test_fechas_de_puntos():
    assert I.fecha_de("L-3") == date(2021, 9, 13)
    assert I.fecha_de("R+1") == date(2021, 9, 19)


def test_a_nativo_mapea_y_pasa_la_puerta(tmp_path):
    (tmp_path / "cbc.csv").write_text(
        "ANALYTE,VALUE,RANGE_MIN,RANGE_MAX,UNITS,TEST_TYPE,SUBJECT_ID,SEX,TEST_DATE\n"
        "WHITE BLOOD CELL COUNT,5.4,3.8,10.8,Thousand/uL,CBC,C001,M,L-92\n"
        "MCV,92.8,80,100,fL,CBC,C001,M,L-92\n")
    (tmp_path / "cmp.csv").write_text(
        "ANALYTE,VALUE,RANGE_MIN,RANGE_MAX,UNITS,TEST_TYPE,SUBJECT_ID,SEX,timepoint\n"
        "POTASSIUM,3.0,3.5,5.3,mmol/L,CMP,C001,M,R+1\n")
    (tmp_path / "cv.csv").write_text(
        "Analyte,Concentration,Timepoint,ID,Unit,Timepoint2,Type,Percent\nCRP,2000000,L-44,C001,pg/ml,Preflight,X,1\n")
    rutas = {"cbc": tmp_path / "cbc.csv", "cmp": tmp_path / "cmp.csv", "cv": tmp_path / "cv.csv"}
    nat = I.a_nativo(rutas)
    assert sorted(nat["variable_id"]) == ["01:V39", "04:A10", "04:A13"]
    assert (nat["simulated"] == "false").all() and nat["notes"].str.contains(I.ETIQUETA, regex=False).all()
    assert float(nat.loc[nat.variable_id == "04:A13", "value"].iloc[0]) == 2.0
    obs, rech, _ = I.entradas.desde_nativo(nat)
    assert len(obs) == 3 and len(rech) == 0
    b = I.banderas_laboratorio(rutas)
    assert list(b["variable_id"]) == ["01:V39"]
