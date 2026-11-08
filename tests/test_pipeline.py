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
import stock  # noqa: E402
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
            if c.get("image", {}).get("status") == "done":
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
    monkeypatch.setattr(stock, "STOCK", tmp_path / "stock")
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


def queue(root: Path, name: str, fmt: dict, files=True):
    d = root / "stock" / fmt["id"] / name
    (d / "images").mkdir(parents=True)
    for c in fmt.get("cases", []):
        if files and c.get("image", {}).get("status") == "done":
            (d / c["image"]["file"]).write_bytes(b"x")
    (d / "item.json").write_text(json.dumps({"formats": [fmt]}))
    return d


def test_jours_d_avance(site):
    write(site, "2026-11-07", [story(), QUIZ])
    queue(site, "20261107-0900-a", story("cultureg"))
    queue(site, "20261107-0901-b", story("insolite"))
    queue(site, "20261107-0902-c", story("dossier", status="pending"))
    publish.main(datetime(2026, 11, 7, 6, 0, tzinfo=PARIS))
    h = json.loads((site / "data" / "health.json").read_text())
    assert h["days_ahead_drawn"] == 0 and h["days_ahead_written"] == 1
    assert h["stock"]["dossier"]["waiting"] == 1 and h["stock"]["cultureg"]["ready"] == 1


def test_edition_pioche_une_bd_finie_dans_la_file(site, monkeypatch):
    monkeypatch.setattr(publish, "QUEUE_SINCE", datetime(2026, 1, 1).date())
    write(site, "2026-11-09", [QUIZ])
    queue(site, "20261107-0900-pas-finie", story("cultureg", status="pending"))
    old = queue(site, "20261107-0901-finie", story("cultureg"))
    queue(site, "20261107-0902-finie-aussi", story("cultureg"))
    publish.main(datetime(2026, 11, 9, 4, 0, tzinfo=PARIS))   # avant 5 h : on ne touche à rien
    assert old.exists()
    publish.main(datetime(2026, 11, 9, 5, 2, tzinfo=PARIS))
    ed = json.loads((site / "editions" / "2026-11-09" / "edition.json").read_text())
    assert [f["id"] for f in ed["formats"]] == ["cultureg", "quiz"]
    assert ed["formats"][0]["from_stock"] == "20261107-0901-finie" and not old.exists()
    assert (site / "editions" / "2026-11-09" / "images" / "cultureg-1.webp").exists()
    assert published(site) == ["2026-11-09"]
    assert len(stock.items("cultureg")) == 2


def test_bd_pas_finie_retourne_en_file(site, monkeypatch):
    monkeypatch.setattr(publish, "QUEUE_SINCE", datetime(2026, 1, 1).date())
    s = story("insolite")
    s["cases"][1]["image"]["status"] = "pending"
    write(site, "2026-11-09", [s, QUIZ])
    publish.main(datetime(2026, 11, 9, 5, 2, tzinfo=PARIS))
    ed = json.loads((site / "editions" / "2026-11-09" / "edition.json").read_text())
    assert [f["id"] for f in ed["formats"]] == ["quiz"]
    [back] = stock.items("insolite")
    assert back.name.startswith("20261109-0000") and (back / "images" / "insolite-1.webp").exists()


def test_image_a_refaire_reste_publiee(site):
    s = story()
    s["cases"][0]["image"]["status"] = "retry"   # le contrôle qualité veut la refaire, l'ancienne est là
    d = write(site, "2026-11-07", [s, QUIZ])
    (d / "images" / "cultureg-1.webp").write_bytes(b"x")
    publish.main(datetime(2026, 11, 7, 6, 0, tzinfo=PARIS))
    ids = [f["id"] for f in json.loads((site / "editions" / "index.json").read_text())["editions"][0]["formats"]]
    assert "cultureg" in ids


def test_images_finissent_une_bd_avant_la_suivante(site, monkeypatch):
    from PIL import Image
    monkeypatch.setattr(images, "EDITIONS", site / "editions")
    (site / "editions").mkdir(exist_ok=True)
    a = queue(site, "20261107-0900-a", story("cultureg", status="pending", n=3))
    b = queue(site, "20261107-0901-b", story("cultureg", status="pending", n=3))
    calls = []

    def fake(fmt, day, prompt, size, refs, kind):
        if len(calls) >= 4:  # 1 fiche casting + 3 cases
            raise images.QuotaExhausted("fini")
        calls.append(kind)
        return Image.new("RGB", (8, 8), "white"), "cloudflare"
    monkeypatch.setattr(images, "draw", fake)
    with pytest.raises(images.QuotaExhausted):
        images.process_stock("fill")
    assert stock.is_ready(stock.load(a)["formats"][0], a)
    assert stock.left(stock.load(b)["formats"][0]) == 3


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


def test_case_explicative_ne_bloque_pas(site):
    s = story()
    s["cases"].insert(1, {"n": 99, "kind": "explain", "title": "Pour comprendre", "text": "Un texte court."})
    s["story"] = " ".join(["mot"] * 150)
    write(site, "2026-11-07", [s, QUIZ])
    publish.main(datetime(2026, 11, 7, 6, 0, tzinfo=PARIS))
    assert published(site) == ["2026-11-07"]
    r = validate.check_edition(site / "editions" / "2026-11-07")
    assert r["ok"], r["errors"]
