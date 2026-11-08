"""Paywall du site publié et cases photo. Lancer : python -m pytest -q tests"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import photos  # noqa: E402
import publish  # noqa: E402
import seo  # noqa: E402


def dossier(n=8):
    cases = [{"n": i, "kind": "chap" if i in (1, 6) else "", "tag": f"Chapitre {i}", "caption": f"Texte secret {i}",
              "image": {"file": f"images/dossier-{i}.webp", "status": "done"}} for i in range(1, n + 1)]
    cases.append({"n": n + 1, "kind": "photo", "title": "Vraie photo", "text": "Légende.",
                  "photo": {"commons": "File:X.jpg", "file": "images/photo-9-x.webp", "status": "done", "credit": "A", "license": "CC BY 4.0", "source": "https://commons.wikimedia.org/wiki/File:X.jpg"}})
    return {"id": "dossier", "title": "T", "theme": "Histoire de France", "cover": {"file": "images/dossier-cover.webp", "status": "done"},
            "cases": cases, "final": {"text": "F"}, "story": "Résumé public.", "sources": []}


def test_lock_format_garde_4_cases_et_cache_le_reste():
    out, hidden = publish.lock_format(dossier())
    assert len(out["cases"]) == 4 and out["locked"] == 5
    assert out["outline"] == ["Chapitre 6"]
    assert "images/dossier-5.webp" in hidden and "images/photo-9-x.webp" in hidden
    assert "images/dossier-1.webp" not in hidden and "images/dossier-cover.webp" not in hidden
    assert "Texte secret 7" not in json.dumps(out)


def test_lock_ne_touche_pas_les_autres_formats():
    f = {**dossier(), "id": "cultureg"}
    assert publish.lock_format(f)[0] is f


def test_lock_site_edition_supprime_les_images(tmp_path):
    ed = {"date": "2026-11-08", "formats": [dossier()]}
    (tmp_path / "images").mkdir()
    for c in ed["formats"][0]["cases"]:
        (tmp_path / (c.get("image") or c.get("photo"))["file"]).write_text("x")
    (tmp_path / "edition.json").write_text(json.dumps(ed))
    publish.lock_site_edition(tmp_path)
    assert (tmp_path / "images/dossier-4.webp").exists()
    assert not (tmp_path / "images/dossier-5.webp").exists()
    assert len(json.loads((tmp_path / "edition.json").read_text())["formats"][0]["cases"]) == 4


def test_page_seo_verrouillee_sans_la_suite():
    s = {"fmt": dossier(), "date": "2026-11-08", "demo": False, "slug": "x", "published": "", "title": "T", "label": "Le Grand Dossier",
         "theme": "Histoire de France", "url_abs": "https://x/histoires/x/", "cover_abs": ""}
    page = seo.story_page(s, Path("."), [], gate=True)
    assert "Texte secret 3" in page and "Texte secret 5" not in page and "Résumé public." in page
    assert '"isAccessibleForFree": false' in page and "Chapitre 6" in page
    full = seo.story_page(s, Path("."), [], gate=False)
    assert "Texte secret 8" in full and "Wikimedia Commons" in full


def test_photo_licence_non_libre_refusee(monkeypatch):
    class R:
        def raise_for_status(self): pass
        def json(self):
            return {"query": {"pages": {"1": {"imageinfo": [{"url": "u", "descriptionurl": "d", "extmetadata": {"LicenseShortName": {"value": "Fair use"}}}]}}}}
    monkeypatch.setattr(photos.requests, "get", lambda *a, **k: R())
    case = {"n": 3, "kind": "photo", "photo": {"commons": "File:Y.jpg"}}
    assert photos.fetch(case, Path("/tmp"))
    assert case["photo"]["attempts"] == 1 and "licence" in case["photo"]["error"]


def test_photo_licence_libre_acceptee(monkeypatch):
    class R:
        def raise_for_status(self): pass
        def json(self):
            return {"query": {"pages": {"1": {"imageinfo": [{"url": "u", "thumburl": "t", "descriptionurl": "https://commons.wikimedia.org/wiki/File:Y.jpg",
                    "extmetadata": {"LicenseShortName": {"value": "CC BY-SA 4.0"}, "Artist": {"value": "<a href='x'>Jean Dupont</a>"}}}]}}}}
    monkeypatch.setattr(photos.requests, "get", lambda *a, **k: R())
    meta = photos.resolve("File:Y.jpg")
    assert meta["credit"] == "Jean Dupont" and meta["license"] == "CC BY-SA 4.0" and meta["url"] == "t"


def test_paywall_lu_sur_l_api_sans_paquet(monkeypatch, tmp_path):
    import io
    import urllib.request
    monkeypatch.setattr(urllib.request, "urlopen", lambda req, timeout=10: io.BytesIO(b'{"paywall": true}'))
    real = json.loads
    monkeypatch.setattr(publish.json, "loads", lambda t, *a, **k: {"api_url": "https://api.test", "paywall": "auto"} if isinstance(t, str) and '"base_url"' in t else real(t, *a, **k))
    assert publish.paywall_on() is True
