"""Actu relue le soir (13 novembre 2026) : un sujet retiré dans l'admin disparaît de l'édition publiée."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import publish  # noqa: E402

ACTU = {"id": "actu", "cases": [
    {"n": 1, "kind": "fact", "caption": "Sujet 1", "image": {"status": "done"}},
    {"n": 2, "kind": "photo", "title": "En vrai 1"},
    {"n": 3, "kind": "explain", "title": "Vraiment 1"},
    {"n": 4, "kind": "fact", "caption": "Sujet 2", "image": {"status": "failed"}},
    {"n": 5, "kind": "explain", "title": "Vraiment 2"},
    {"n": 6, "kind": "fact", "caption": "Sujet 3", "image": {"status": "done"}},
    {"n": 7, "kind": "explain", "title": "Vraiment 3"},
]}


def test_sujets_decoupes_par_case_dessinee():
    assert publish.actu_subjects(ACTU) == [[0, 1, 2], [3, 4], [5, 6]]


def test_sujet_retire_et_cases_renumerotees():
    out = publish.drop_subjects(ACTU, "2026-11-14", {"2026-11-14|actu:2"})
    assert [c.get("caption") or c.get("title") for c in out["cases"]] == ["Sujet 1", "En vrai 1", "Vraiment 1", "Sujet 3", "Vraiment 3"]
    assert [c["n"] for c in out["cases"]] == [1, 2, 3, 4, 5]
    assert ACTU["cases"][3]["caption"] == "Sujet 2"  # la source n'est pas modifiée


def test_un_sujet_retire_dont_l_image_a_echoue_ne_bloque_plus_la_publication():
    assert not publish.format_ready(ACTU)
    assert publish.format_ready(publish.drop_subjects(ACTU, "2026-11-14", {"2026-11-14|actu:2"}))


def test_autre_date_ou_autre_format_intacts():
    assert publish.drop_subjects(ACTU, "2026-11-15", {"2026-11-14|actu:2"}) is ACTU
    assert publish.drop_subjects({"id": "cultureg", "cases": []}, "2026-11-14", {"2026-11-14|actu:1"})["id"] == "cultureg"
