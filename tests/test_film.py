"""Reels en styles alternés (20 novembre 2026, go de Greg) : validation des post.json, minutage, pages des 5 styles."""
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
EX = ROOT / "pipeline" / "styles" / "examples"
STYLE_FILES = {"ipad-sketch": "sketch.js", "flat-space-explainer": "zoom.js", "comic-history": "comic.js", "hd-2d": "pixel.js", "ink-wash": "ink.js"}


def examples():
    return [json.loads(p.read_text()) for p in sorted(EX.glob("*/post.json"))]


def test_les_cinq_exemples_sont_valides():
    np = pytest.importorskip("numpy")  # noqa: F841
    import film_render as F
    posts = examples()
    assert {p["style"] for p in posts} == set(F.STYLES)
    for p in posts:
        assert F.validate(json.loads(json.dumps(p))) == [], p["style"]


def test_validation_refuse_les_erreurs():
    pytest.importorskip("numpy")
    import film_render as F
    base = examples()[0]
    bad = json.loads(json.dumps(base)); bad["style"] = "scifi-toon"
    assert F.validate(bad)
    bad = json.loads(json.dumps(base)); bad["film"]["beats"][0]["text"] = "Une affirmation sans question."
    assert any("question" in e for e in F.validate(bad))
    bad = json.loads(json.dumps(base)); bad["film"]["beats"][1]["set"] = "decor-invente"
    assert any("set inconnu" in e for e in F.validate(bad))
    bad = json.loads(json.dumps(base)); bad["film"]["beats"] = bad["film"]["beats"][:3]
    assert any("6 à 14" in e for e in F.validate(bad))


def test_minutage_un_plan_par_replique():
    np = pytest.importorskip("numpy")
    import film_render as F
    post = next(p for p in examples() if p["style"] == "hd-2d")
    F.validate(post)
    audio = {i: np.zeros(int(2.4 * F.SR)) for i in range(len(post["film"]["beats"]))}
    tl = F.build_timeline(post, audio)
    B = tl["beats"]
    assert tl["band"]["t0"] == 0 and tl["band"]["text"] == post["band"]           # la question dès la première image
    assert tl["lines"][0]["t"] <= .15                                              # la question est dite tout de suite
    assert all(abs(B[k]["t1"] - B[k + 1]["t0"]) < 1e-6 for k in range(len(B) - 1))
    assert sum(1 for b in B if b.get("bulb")) == 1 and B[-2].get("bulb")          # l'ampoule cachée, une fois
    assert tl["dur"] == B[-1]["t1"] and tl["end_t0"] > tl["dur"]                   # bible v3 : pas de carte de fin
    assert tl["band"]["again"] == pytest.approx(tl["dur"] - 3.0) and tl["band"]["url"] == "lesachoir.fr"
    for l in tl["lines"]:
        assert l["t"] < l["sub_t1"] <= tl["dur"]


def test_exemples_au_format_30_35_s():
    # Greg, 20 novembre 2026 : 30 à 35 s ; une phrase par plan ; « Et ça, maintenant, tu le sais. » va dans la légende.
    for p in examples():
        words = sum(len(b["text"].split()) for b in p["film"]["beats"])
        assert 60 <= words <= 90, (p["style"], words)
        assert all(len(b["text"].split()) <= 13 for b in p["film"]["beats"]), p["style"]
        assert "tu le sais" not in " ".join(b["text"] for b in p["film"]["beats"]).lower()
        assert p["film"]["beats"][-1]["text"].startswith("Voilà")
        assert "tu le sais" in p["caption"].lower()


def test_chaque_style_a_sa_page_et_ses_decors():
    import film_render as F
    page = ROOT / "pipeline" / "styles"
    main = (page / "main.js").read_text()
    for style, f in STYLE_FILES.items():
        js = (page / f).read_text()
        assert f"'{style}'" in main and f"'./{f}'" in main
        for need in ("export function draw", "export function subtitles", "export const THEME"):
            assert need in js, (f, need)
        for s in F.STYLES[style]["sets"] - {"page", "nuit"}:
            assert f"'{s}'" in js, (f, s)


def test_rendu_et_publication_branches():
    import social_render
    p = examples()[0]
    fp = social_render.fingerprint(p)
    q = json.loads(json.dumps(p)); q["film"]["beats"][0]["text"] += " ?"
    assert social_render.fingerprint(q) != fp
    src = (ROOT / "pipeline" / "social_render.py").read_text()
    assert 'post.get("kind") == "film"' in src and "film_render.render" in src
    assert '"film"' in (ROOT / "pipeline" / "social_publish.py").read_text()
    assert '"film" in kinds' in (ROOT / ".github" / "workflows" / "instagram.yml").read_text()


def test_page_sans_erreur(tmp_path):
    """Avec Playwright et Chromium (machine de rendu) : chaque style s'ouvre et dessine sans erreur JavaScript."""
    pytest.importorskip("numpy"); pytest.importorskip("playwright")
    import os
    import film_render as F
    os.environ["FILM_TTS"] = "silent"
    for p in examples():
        try:
            F.stills(p, tmp_path / p["style"], at=(0.4, 6.0, -1.0))
        except Exception as e:  # noqa
            if "Executable doesn't exist" in str(e) or "BrowserType.launch" in str(e):
                pytest.skip("Chromium absent")
            raise
        assert len(list((tmp_path / p["style"]).glob("*.jpg"))) == 3
