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


# ---------- « Pas d'image, pas de case » (16 novembre 2026) ----------
def test_case_sans_vraie_image_non_publiee():
    pret = {"kind": "buzz", "title": "Un", "text": "v", "video": {"url": "https://youtu.be/dQw4w9WgXcQ", "status": "ok", "embed": {"thumb": "images/buzz-3.jpg"}}}
    attente = {"kind": "buzz", "title": "Deux", "text": "v", "video": {"url": "https://youtu.be/dQw4w9WgXcQ"}}
    photo = {"kind": "buzz", "title": "Trois", "text": "v", "photo": {"commons": "File:X.jpg", "status": "done", "file": "images/photo-5.webp"}}
    actu = {"id": "actu", "cases": [{"n": 1, "kind": "fact", "caption": "S"}, {"n": 2, "kind": "explain", "title": "V"},
                                    {**pret, "n": 3}, {**attente, "n": 4}, {**photo, "n": 5}, {**BUZZ, "n": 6}]}
    out = publish.drop_unready_buzz(actu, "2026-11-20")
    assert [c.get("title") for c in out["cases"] if c["kind"] == "buzz"] == ["Un", "Trois"]  # ni la vidéo en attente ni le faux post
    assert [c["n"] for c in out["cases"]] == [1, 2, 3, 4]
    assert len(actu["cases"]) == 6  # le fichier source n'est pas touché
    # les éditions d'avant gardent leurs cartes réécrites ; les autres formats ne sont pas concernés
    assert publish.drop_unready_buzz(actu, "2026-11-16") is actu
    assert publish.drop_unready_buzz({"id": "cultureg", "cases": [BUZZ]}, "2026-11-20")["cases"] == [BUZZ]


def check_dated(cases, tmp_path, day="2026-11-20"):
    d = tmp_path / day
    d.mkdir(exist_ok=True)
    errs, warns = [], []
    validate.check_story({"id": "actu", "title": "Actu", "cases": cases, "final": {"text": "x"}, "sources": [{"url": "https://a"}]}, d, errs.append, warns.append)
    return [w for w in warns if "Sur Internet" in w and "vannes" not in w]


def test_controle_vraie_image(tmp_path):
    base = {"kind": "buzz", "trend": "T", "title": "La tendance en clair", "text": "Une vanne.", "why": "Pourquoi ça buzze : un fait.",
            "source": {"title": "Le Parisien", "url": "https://example.org/a"}}
    head = [ACTU["cases"][0], ACTU["cases"][1]]
    assert check_dated(head + [{**base, "video": {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}], tmp_path) == []
    assert check_dated(head + [{**base, "photo": {"commons": "File:Sapin.jpg"}}], tmp_path) == []
    w = " | ".join(check_dated(head + [{**base, "handle": "@Internet", "likes": "12 k"}], tmp_path))
    assert "pas de vraie image" in w and "champs de faux post" in w and "handle" in w
    w = " | ".join(check_dated(head + [{**{k: v for k, v in base.items() if k != "title"}, "video": {"url": "https://vimeo.com/123"}}], tmp_path))
    assert "YouTube ou TikTok" in w and "« title » manquant" in w
    # avant le 18 novembre : l'ancien contrôle (pseudo inventé) s'applique encore
    assert any("handle" in x for x in check_dated(head + [base], tmp_path, day="2026-11-16"))
