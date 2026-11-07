"""Tests de la chaîne : publication, contrôle des éditions, budget d'images. Lancer : python -m pytest -q tests"""
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import images  # noqa: E402
import publish  # noqa: E402
import validate  # noqa: E402

PARIS = ZoneInfo("Europe/Paris")


def story(fid="cultureg", status="done", n=2, cast=("a",)):
    return {
        "id": fid, "title": "Titre", "theme": "" if fid == "actu" else "Histoire de France",
        "cast": [{"id": c, "look": "x", "file": f"cast/{fid}-{c}.png"} for c in cast],
        "cases": [{"n": i, "caption": "Court.", "bubbles": [],
                   "image": {"prompt": "p", "cast": list(cast), "file": f"images/{fid}-{i}.webp", "status": status}}
                  for i in range(1, n + 1)],
        "final": {"text": "Fait."}, "sources": [{"title": "s", "url": "https://x"}],
    }


QUIZ = {"id": "quiz", "kind": "culture", "questions": [{"q": "?", "choices": ["a", "b"], "answer": 1}]}


def write(root: Path, day: str, formats, raw: str | None = None):
    d = root / "editions" / day
    (d / "images").mkdir(parents=True)
    for f in formats:
        for c in f.get("cases", []):
            if c["image"]["status"] == "done":
                (d / c["image"]["file"]).write_bytes(b"x")
    (d / "edition.json").write_text(raw if raw is not None else json.dumps({"date": day, "status": "draft", "formats": formats}))
    return d


@pytest.fixture
def site(tmp_path, monkeypatch):
    (tmp_path / "app").mkdir()
    (tmp_path / "app" / "index.html").write_text("<html></html>")
    (tmp_path / "data").mkdir()
    monkeypatch.setattr(publish, "ROOT", tmp_path)
    monkeypatch.setattr(publish, "EDITIONS", tmp_path / "editions")
    monkeypatch.setattr(publish, "SITE", tmp_path / "_site")
    monkeypatch.setattr(publish.seo, "build", lambda *a, **k: None)
    return tmp_path


def published(root):
    return [e["date"] for e in json.loads((root / "editions" / "index.json").read_text())["editions"]]


def test_json_casse_n_empeche_pas_la_publication(site):
    write(site, "2026-11-07", [story(), QUIZ])
    write(site, "2026-11-08", [], raw="{ pas du json")
    publish.main(datetime(2026, 11, 7, 6, 0, tzinfo=PARIS))
    assert published(site) == ["2026-11-07"]
    health = json.loads((site / "data" / "health.json").read_text())
    assert health["today_published"] and any("2026-11-08" in p for p in health["problems"])
    assert (site / "_site" / "status.json").exists()


def test_pas_de_publication_avant_5h(site):
    write(site, "2026-11-07", [story(), QUIZ])
    publish.main(datetime(2026, 11, 7, 4, 59, tzinfo=PARIS))
    assert published(site) == []


def test_jeu_seul_attend_10h(site):
    write(site, "2026-11-07", [story(status="pending"), QUIZ])
    publish.main(datetime(2026, 11, 7, 6, 0, tzinfo=PARIS))
    assert published(site) == []
    publish.main(datetime(2026, 11, 7, 10, 5, tzinfo=PARIS))
    assert published(site) == ["2026-11-07"]


def test_format_en_erreur_ecarte(site):
    bad = story("insolite")
    bad["cases"][0]["image"]["cast"] = ["inconnu"]
    write(site, "2026-11-07", [story(), bad, QUIZ])
    publish.main(datetime(2026, 11, 7, 6, 0, tzinfo=PARIS))
    ids = [f["id"] for f in json.loads((site / "editions" / "index.json").read_text())["editions"][0]["formats"]]
    assert "insolite" not in ids and "cultureg" in ids


def test_jours_d_avance(site):
    write(site, "2026-11-07", [story(), QUIZ])
    write(site, "2026-11-08", [story(), QUIZ])
    write(site, "2026-11-09", [story(status="pending"), QUIZ])
    publish.main(datetime(2026, 11, 7, 6, 0, tzinfo=PARIS))
    assert json.loads((site / "data" / "health.json").read_text())["days_ahead_drawn"] == 1


def test_validation(tmp_path):
    f = story()
    f["cases"][0]["image"]["file"] = f["cases"][1]["image"]["file"]
    d = write(tmp_path, "2026-11-07", [f, {"id": "quiz", "questions": [{"choices": ["a"], "answer": 3}]}])
    r = validate.check_edition(d)
    assert not r["ok"] and set(r["bad_formats"]) == {"cultureg", "quiz"}


def test_budget_neurones(tmp_path, monkeypatch):
    monkeypatch.setattr(images, "QUOTA_FILE", tmp_path / "q.json")
    monkeypatch.setattr(images, "next_actu_drawn", lambda: False)
    day = datetime.now(ZoneInfo("UTC")).date().isoformat()
    (tmp_path / "q.json").write_text(json.dumps({"day": day, "count": 30, "neurons": images.NEURON_BUDGET - images.ACTU_RESERVE}))
    with pytest.raises(images.BudgetReserved):
        images.check_budget({"id": "cultureg"})
    images.check_budget({"id": "actu"})  # l'Actu passe dans la réserve
    (tmp_path / "q.json").write_text(json.dumps({"day": day, "count": 50, "neurons": images.NEURON_BUDGET - 10}))
    with pytest.raises(images.BudgetReached):
        images.check_budget({"id": "actu"})


def test_fiche_casting_inutile_sautee(tmp_path, monkeypatch):
    f = story(cast=("a",), n=1)
    f["cast"].insert(0, {"id": "b", "look": "y", "file": "cast/b.png"})  # sautée avant que « a » ne bute sur le budget
    f["cases"][0]["image"]["cast"] = ["a", "b"]
    f["cases"].append({"n": 2, "image": {"prompt": "p", "cast": ["a"], "file": "images/2.webp", "status": "done"}})
    d = write(tmp_path, "2026-11-07", [f])
    ed = json.loads((d / "edition.json").read_text())
    monkeypatch.setattr(images, "check_budget", lambda *a: (_ for _ in ()).throw(images.QuotaExhausted("stop")))
    with pytest.raises(images.QuotaExhausted):
        images.process(d, d / "edition.json", ed)
    cast = {c["id"]: c.get("status") for c in ed["formats"][0]["cast"]}
    assert cast["b"] == "skipped" and cast["a"] != "skipped"


class FakeResp:
    def __init__(self, code=200, body=None):
        self.status_code, self._body = code, body or {}
        self.text = json.dumps(self._body)

    def json(self):
        return self._body


def png_data_uri():
    import base64, io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "white").save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@pytest.fixture
def fal(tmp_path, monkeypatch):
    monkeypatch.setattr(images, "QUOTA_FILE", tmp_path / "q.json")
    monkeypatch.setattr(images, "FAL_FILE", tmp_path / "fal.json")
    monkeypatch.setattr(images, "FAL_KEY", "test")
    monkeypatch.setattr(images, "CF_BLOCKED", None)
    monkeypatch.setattr(images, "next_actu_drawn", lambda: True)
    day = datetime.now(ZoneInfo("UTC")).date().isoformat()
    (tmp_path / "q.json").write_text(json.dumps({"day": day, "count": 60, "neurons": images.NEURON_BUDGET}))
    calls = []
    monkeypatch.setattr(images.requests, "post", lambda url, **k: calls.append(url) or FakeResp(200, {"images": [{"url": png_data_uri()}]}))
    return calls


def test_renfort_fal_quand_cloudflare_est_plein(fal):
    soon = images.next_actu_date()
    im, via = images.draw({"id": "cultureg"}, soon, "p", (512, 896), [images.STYLE_REF], "case")
    assert via == "fal" and fal and "fal.run" in fal[0]
    st = json.loads(images.FAL_FILE.read_text())
    assert st["images"] == 1 and 0 < st["spent"] < 0.02


def test_pas_de_renfort_pour_le_stock_lointain(fal):
    from datetime import timedelta
    with pytest.raises(images.QuotaExhausted):
        images.draw({"id": "cultureg"}, images.next_actu_date() + timedelta(days=3), "p", (512, 896), [images.STYLE_REF], "case")
    assert not fal


def test_plafond_fal(fal, monkeypatch):
    monkeypatch.setattr(images, "FAL_DAILY", 0.001)
    with pytest.raises(images.QuotaExhausted):
        images.draw({"id": "actu"}, images.next_actu_date(), "p", (512, 896), [images.STYLE_REF], "case")
    assert not fal


def test_credit_fal_epuise(fal, monkeypatch):
    monkeypatch.setattr(images.requests, "post", lambda url, **k: FakeResp(403, {"detail": "Exhausted balance"}))
    with pytest.raises(images.QuotaExhausted):
        images.draw({"id": "actu"}, images.next_actu_date(), "p", (512, 896), [images.STYLE_REF], "case")
    st = json.loads(images.FAL_FILE.read_text())
    assert st["blocked"] and st["images"] == 0
