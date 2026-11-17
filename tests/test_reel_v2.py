"""Reel v2 « La question du jour » (17 novembre 2026) : voix, minutage des sous-titres, lien en bio /insta."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import publish  # noqa: E402
import reel_v2  # noqa: E402
import social_render  # noqa: E402


def test_prononciation():
    said = reel_v2.pronounce("50% de remise sur lesachoir.fr, même à 3°C")
    assert "pour cent" in said and "le sachoir point f r" in said and "degrés" in said
    assert reel_v2.clean("« Bip » 🤯 ok") == "Bip ok"


def test_minutage_des_mots_couvre_la_phrase():
    words = reel_v2.word_times("Ce code-barres ne connaît même pas le prix.", 1.0, 3.0)
    assert [w for w, _, _ in words][0] == "Ce"
    assert abs(words[0][1] - 1.0) < 1e-6 and abs(words[-1][2] - 4.0) < 1e-6
    assert all(a[2] <= b[1] + 1e-6 for a, b in zip(words, words[1:]))


def test_empreinte_v2_suit_les_temps():
    post = {"kind": "reel", "version": 2, "title": "T", "beats": [{"role": "hook", "say": "A"}], "caption": "x"}
    fp = social_render.fingerprint(post)
    assert social_render.fingerprint({**post, "caption": "autre"}) == fp  # la légende ne refait pas la vidéo
    assert social_render.fingerprint({**post, "beats": [{"role": "hook", "say": "B"}]}) != fp


def test_lien_en_bio(tmp_path):
    index = [{"date": "2026-11-19", "formats": [{"id": "notice", "url": "histoires/2026-11-19-x/"}]},
             {"date": "2026-11-17", "formats": [{"id": "notice", "url": "histoires/2026-11-17-code-barres/"}]}]
    d = tmp_path / "2026-11-19"
    d.mkdir()
    (d / "post.json").write_text(json.dumps({"date": "2026-11-19", "story": {"edition": "2026-11-17", "format": "notice"}}))
    target = publish.insta_target(index, "2026-11-19", tmp_path)
    assert target.startswith("./histoires/2026-11-17-code-barres/?utm_source=instagram")
    (d / "post.json").write_text(json.dumps({"date": "2026-11-19", "story": {"edition": "2026-11-19", "format": "notice"}}))
    assert publish.insta_target(index, "2026-11-19", tmp_path).startswith("./?d=2026-11-19&f=notice&utm_source=instagram")
    assert publish.insta_target(index, "2026-11-19", tmp_path / "rien").startswith("./?utm_source=instagram")
    # Deux posts le même jour : l'actu à 12 h 15, la culture à 18 h 30 ; la page choisit au clic.
    a = tmp_path / "2026-11-19-actu"
    a.mkdir()
    (a / "post.json").write_text(json.dumps({"date": "2026-11-19", "time": "12:15", "story": {"edition": "2026-11-19", "format": "actu"}}))
    (d / "post.json").write_text(json.dumps({"date": "2026-11-19", "time": "18:30", "story": {"edition": "2026-11-19", "format": "notice"}}))
    index[0]["formats"].append({"id": "actu", "url": "histoires/2026-11-19-a/"})
    t = publish.insta_targets(index, "2026-11-19", tmp_path)
    assert [x[0] for x in t] == ["12:15", "18:30"] and "f=actu" in t[0][1] and "f=notice" in t[1][1]


def test_carrousel_v2(tmp_path):
    import carousel_v2  # noqa: E402
    post = {"date": "2026-11-18", "kind": "carousel", "version": 2, "tone": "archive",
            "slides": [{"text": "Une énigme\nsur **deux** lignes."}, {"text": "Bloc un.\n\nBloc **deux**."},
                       {"text": "La **réponse**."}]}
    info = carousel_v2.render(post, tmp_path)
    assert info["files"] == ["slide-01.jpg", "slide-02.jpg", "slide-03.jpg", "slide-04.jpg"]
    from PIL import Image
    assert Image.open(tmp_path / "slide-01.jpg").size == (1080, 1350)
    assert info["tiktok_files"][0] == "tiktok-01.jpg" and Image.open(tmp_path / "tiktok-01.jpg").size == (1080, 1920)
    assert carousel_v2.tokens("le **13 chiffres**.")[-1] == [("chiffres", True), (".", False)]
