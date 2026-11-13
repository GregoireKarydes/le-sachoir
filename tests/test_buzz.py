"""« Pendant ce temps, sur Internet » (13 novembre 2026) : cases sans dessin à la fin de l'Actu, retirables une à une."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
import publish  # noqa: E402
import validate  # noqa: E402

BUZZ = {"kind": "buzz", "handle": "@Internet", "name": "Internet", "trend": "Pain au chocolat",
        "text": "Le débat chocolatine reprend. La paix des boulangeries n'aura duré que trois jours.",
        "why": "Pourquoi ça buzze : un sondage relance la querelle.", "source": {"title": "Le Parisien", "url": "https://example.org/a"}}
ACTU = {"id": "actu", "cases": [
    {"kind": "fact", "caption": "Sujet 1", "image": {"status": "done"}},
    {"kind": "explain", "title": "Vraiment 1"},
    {**BUZZ, "trend": "Un"}, {**BUZZ, "trend": "Deux"}, {**BUZZ, "trend": "Trois"},
]}


def test_chaque_case_internet_est_un_sujet_retirable():
    assert publish.actu_subjects(ACTU) == [[0, 1], [2], [3], [4]]
    out = publish.drop_subjects(ACTU, "2026-11-14", {"2026-11-14|actu:3"})
    assert [c.get("trend") for c in out["cases"] if c["kind"] == "buzz"] == ["Un", "Trois"]


def test_pas_d_image_attendue_pour_une_case_internet():
    assert publish.format_ready(ACTU)


def check(cases):
    errs, warns = [], []
    validate.check_story({"id": "actu", "title": "Actu", "cases": cases, "final": {"text": "x"}, "sources": [{"url": "https://a"}]},
                         ROOT, errs.append, warns.append)
    return [w for w in warns if "Sur Internet" in w]


def test_validation_place_pseudo_et_source():
    assert check(ACTU["cases"]) == []
    bad = [{**BUZZ, "handle": "Jean Dupont", "source": {}}, ACTU["cases"][0], ACTU["cases"][1]]
    w = " | ".join(check(bad))
    assert "à la fin" in w and "handle" in w and "source" in w
