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
    # Jamais l'API en ligne pendant les tests : ses BD masquées (vraies dates) faisaient échouer la publication testée.
    monkeypatch.setattr(publish, "_CFG", {})
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
    queue(site, "20261107-0903-d", story("notice"))
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

    def fake(fmt, day, prompt, size, refs, kind, premium=False):
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


def test_style_sans_touches_d_emotion_imposees():
    s = images.STYLE["style"] + images.STYLE["style_with_ref"]
    for mot in ("blush", "sweat", "hearts", "sparkles", "tears", "spiky"):
        assert mot not in s


def test_personnages_trop_proches_signales(tmp_path):
    f = story(cast=("a", "b"))
    f["cast"][0]["look"] = "Maurice, a 1904 French racing cyclist, wool jersey, knee-length shorts, a red scarf as the only colour"
    f["cast"][1]["look"] = "Lucien, a 1904 French racing cyclist, wool jersey, knee-length shorts, a red cap as the only colour"
    d = write(tmp_path, "2026-11-07", [f])
    w = " ".join(validate.check_edition(d)["warnings"])
    assert "trop proches" in w and "même couleur" in w and "silhouette" in w


def test_refaire_d_abord_la_prochaine_bd(site, monkeypatch):
    from PIL import Image
    monkeypatch.setattr(images, "EDITIONS", site / "editions")
    (site / "editions").mkdir(exist_ok=True)
    s = story("insolite")
    s["cases"][0]["image"]["redo"] = True
    a = queue(site, "20261107-0900-a", s)
    calls = []

    def fake(fmt, day, prompt, size, refs, kind, premium=False):
        calls.append(day)
        return Image.new("RGB", (8, 8), "white"), "cloudflare"
    monkeypatch.setattr(images, "draw", fake)
    assert stock.next_out("insolite") == a
    images.process(a, a / "item.json", stock.load(a), redo=True)
    img = stock.load(a)["formats"][0]["cases"][0]["image"]
    assert "redo" not in img and img["status"] == "done" and calls


def test_prompt_porte_le_cadre_les_roles_sans_case_precedente(tmp_path):
    fmt = {"art": {"subject": "how paper money was born", "setting": "a palace room", "era": "1710s France",
                   "props": {"chest": "a small wooden chest with iron bands"}}}
    p, refs = images.build("Law opens the chest", [("Law, a tall gambler", None, "the smooth salesman")],
                           fmt=fmt, panel=(2, 8))
    assert p.startswith("ONE single picture") and "comic strip" not in p.split("Scene:")[0]
    for bout in ("how paper money was born", "1710s France", "the smooth salesman", "small wooden chest"):
        assert bout in p
    # la case précédente n'est plus une référence : le modèle la recopiait
    assert "previous panel" not in p and all("x-01" not in str(r) for r in refs)
    # les consignes impératives passent avant le style
    assert p.index("no lettering") < p.index("webcomic doodle")


# --- « D'où ça vient ? » (format origine, 14 novembre 2026) ---------------------------------------------

def origine(status="done", n=8):
    cases = []
    for i in range(1, n + 1):
        c = {"n": i, "kind": "cine", "text": f"Ligne une,\nle mot *clé* {i}."}
        if i % 2:
            c["image"] = {"prompt": "p", "file": f"images/origine-{i:02d}.webp", "status": status}
        else:
            c.update(image_of=i - 1, zoom=1.2, focus="50% 30%")
        cases.append(c)
    return {"id": "origine", "title": "« Expression »", "theme": "Expression française", "cast": [],
            "art": {"subject": "s", "setting": "s", "era": "e"}, "cases": cases,
            "final": {"text": "Fait."}, "sources": [{"title": "s", "url": "https://x"}], "story": " ".join(["mot"] * 150)}


def check(fmt):
    errs, warns = [], []
    validate.check_story(fmt, Path("."), errs.append, warns.append)
    return errs, warns


def test_origine_images_reprises_ancien_format():
    # Ancien format « écrans » (abandonné le 14 novembre) : toujours lisible, les écrans « image_of » ne se dessinent pas.
    assert publish.format_ready(origine()) and publish.pending_images(origine()) == 0
    assert len(stock.images_of(origine())) == 4


def test_origine_est_une_bd_comme_les_autres():
    s = story("origine", status="pending")
    s["theme"] = "Expression française"
    errs, _ = check(s)
    assert errs == [] and "origine" in validate.FORMAT_IDS


def test_origine_erreurs_signalees():
    f = origine(status="pending")
    f["cases"][1]["image_of"] = 5           # écran plus loin : interdit
    f["cases"][2]["text"] = "Deux *mots* en *couleur*"
    errs, warns = check(f)
    assert any("image_of" in e for e in errs)
    assert any("un seul mot clé" in w for w in warns)


def test_origine_alterne_avec_la_notice(site, monkeypatch):
    monkeypatch.setattr(publish, "QUEUE_SINCE", datetime(2026, 1, 1).date())
    write(site, "2026-11-09", [story("notice"), QUIZ])        # hier : la Notice
    write(site, "2026-11-10", [QUIZ])
    queue(site, "20261108-0900-n", story("notice"))
    queue(site, "20261108-0901-o", story("origine"))
    publish.main(datetime(2026, 11, 10, 5, 2, tzinfo=PARIS))
    ids = [f["id"] for f in json.loads((site / "editions" / "2026-11-10" / "edition.json").read_text())["formats"]]
    assert "origine" in ids and "notice" not in ids           # aujourd'hui : D'où ça vient ?, jamais les deux
    assert len(stock.items("notice")) == 1


def test_notice_remplace_si_pas_d_origine_prete(site, monkeypatch):
    monkeypatch.setattr(publish, "QUEUE_SINCE", datetime(2026, 1, 1).date())
    write(site, "2026-11-09", [story("notice"), QUIZ])
    write(site, "2026-11-10", [QUIZ])
    queue(site, "20261108-0900-n", story("notice"))
    queue(site, "20261108-0901-o", story("origine", status="pending"))
    publish.main(datetime(2026, 11, 10, 5, 2, tzinfo=PARIS))
    ids = [f["id"] for f in json.loads((site / "editions" / "2026-11-10" / "edition.json").read_text())["formats"]]
    assert "notice" in ids and "origine" not in ids


def test_prompt_origine_comme_les_autres_bd():
    prompt, _ = images.build("a sandy riverbank", [], fmt={"id": "origine", "art": {"era": "18th century"}}, panel=(1, 5))
    assert images.STYLE["style"] in prompt and images.STYLE["constraints"] in prompt


def test_cast_prompt_one_person_no_scenery():
    """15/11/2026 : la fiche casting ne décrit ni le lieu ni les autres personnages (fal.ai les dessinait)."""
    import images
    fmt = {"art": {"setting": "a 1940s radar laboratory", "era": "1945"},
           "cast": [{"id": "a", "look": "Léa, short round, red bun"}, {"id": "b", "look": "Percy, very tall, tweed suit"}]}
    p = images.cast_prompt(fmt, fmt["cast"][0])
    assert "radar laboratory" not in p and "Percy" not in p
    assert "Exactly ONE person" in p and "1945" in p


def test_framing_and_shot_parsing():
    """15/11/2026 : cadrages variés ; « medium close-up » n'est pas lu comme « close-up »."""
    import images, validate
    assert "head and shoulders of one character" in images.framing_for("Léa laughs. medium close-up")
    assert validate.shot_of("a kitchen. medium wide shot") == "medium wide shot"
    warns = []
    drawn = [{"image": {"prompt": f"x. {s}", "cast": ["a", "b"]}} for s in ["medium shot"] * 5]
    validate.check_shots(drawn, "cultureg", warns.append)
    assert any("plans moyens" in w for w in warns) and any("gros plan" in w for w in warns)


# ---------- Adresses des pages d'histoire (16 novembre 2026) ----------
def test_slug_coupe_au_mot_entier_pour_les_nouvelles_histoires():
    import seo
    fmt = {"id": "insolite", "title": "Le président français est prince d’Andorre, et c’est la faute d’un comte de Foix"}
    brut = seo.slugify(fmt["title"])
    entier = seo.slugify(fmt["title"], whole=True)
    assert len(brut) <= 70 and len(entier) <= 70
    assert brut.startswith(entier) and not entier.endswith("-")
    assert entier == "le-president-francais-est-prince-d-andorre-et-c-est-la-faute"
    # un titre court ou qui tombe juste ne change pas
    assert seo.slugify("Un titre court", whole=True) == "un-titre-court"
    # un mot interminable : coupe brute plutôt qu'une adresse trop courte
    assert len(seo.slugify("a" * 200, whole=True)) == 70


def test_les_anciennes_adresses_ne_bougent_pas():
    import seo
    fmt = {"id": "insolite", "title": "Le président français est prince d’Andorre, et c’est la faute d’un comte de Foix"}
    assert seo.story_slug("2026-11-16", fmt) == seo.legacy_story_slug("2026-11-16", fmt)
    assert seo.story_slug(seo.WHOLE_WORD_SLUGS_SINCE, fmt) != seo.legacy_story_slug(seo.WHOLE_WORD_SLUGS_SINCE, fmt)


# ---------- Humour et info : formules, interview, cases muettes, « Pour briller » (16 novembre 2026) ----------
def _bd(cases, final="Le fait le plus surprenant de toute cette histoire, raconté autrement.", fid="cultureg", title="Titre"):
    out = []
    for i, c in enumerate(cases, 1):
        cap, bubbles = c
        out.append({"n": i, "caption": cap, "bubbles": [{"who": "a", "text": t} for t in bubbles], "image": {"prompt": "x", "file": f"i{i}.webp"}})
    return {"id": fid, "title": title, "cases": out, "final": {"text": final}}


def _humour(fmt, others=()):
    got = []
    validate.check_humour(fmt, Path("stock/cultureg/x"), got.append, others=list(others))
    return got


def test_formules_usees_signalees():
    fmt = _bd([("Un fait.", ["Qui a inventé ce comptage absurde ?", "Nous."]), ("Un autre fait.", []), ("Un troisième.", ["Tiens."]),
               ("Suite.", ["Ah."]), ("Fin.", ["Donc je perds en vieux français.", "Voilà."])])
    got = " | ".join(_humour(fmt))
    assert "ouverture" in got and "Qui a inventé" in got
    assert "chute" in got and "Donc" in got


def test_bd_en_scene_sans_avertissement():
    fmt = _bd([("Au village, le scribe fait l'appel.", ["Martin ! Avancez !", "Lequel ? On est six."]), ("Les six avancent d'un pas.", []),
               ("Le scribe soupire.", ["Bon. On va vous trouver des surnoms."]), ("Il trempe sa plume.", ["Toi, le forgeron : Lefèvre."]),
               ("Le sixième attend toujours.", ["Et toujours pas de manteau."])])
    assert _humour(fmt) == []


def test_interview_et_absence_de_case_muette():
    fmt = _bd([("Fait %d." % i, ["Et pourquoi ?", "Parce que."]) for i in range(6)])
    got = " | ".join(_humour(fmt))
    assert "format interview : 6 cases sur 6" in got
    assert "aucune case muette" in got


def test_pour_briller_ne_repete_pas_une_case():
    resume = "Saint Martin a rendu son prénom très populaire, devenu le nom de famille numéro un en France."
    fmt = _bd([("Début.", ["Tiens."]), ("Milieu.", []), (resume, ["Voilà."])], final="Saint Martin a rendu son prénom populaire : il est devenu le nom de famille numéro un en France.")
    assert any("Pour briller" in m and "résumé" in m for m in _humour(fmt))
    fmt["final"]["text"] = "Martin n'a donné que la moitié de son manteau : l'autre moitié appartenait à l'armée romaine."
    assert not any("Pour briller" in m for m in _humour(fmt))


def test_ouverture_identique_a_une_bd_recente():
    fmt = _bd([("Début.", ["Regardez-moi ce bazar, messieurs !"]), ("Milieu.", []), ("Fin.", ["Rideau."])])
    others = [("stock/cultureg/autre", "Une autre BD", "regardez moi ce", "tout autre chose")]
    assert any("ouverture identique" in m for m in _humour(fmt, others))
    assert not any("identique" in m for m in _humour(fmt, [("stock/cultureg/autre", "Une autre BD", "bonjour à tous", "bonne nuit les")]))


SRC2 = [{"title": "Le Monde", "url": "https://a.fr/1"}, {"title": "franceinfo", "url": "https://b.fr/2"}]


def _sujet(gag, tag="Société", lead=False, repere=True, zoom=True, photo=True, sources=SRC2, words_extra="", **extra):
    """Un sujet d'Actu au format du 16 novembre 2026 : dessin, photo (sujet du jour), explication, zoom (sujet du jour)."""
    txt = "Quoi : un fait." + words_extra + "\nPourquoi ça compte : parce que.\n" + ("Repère : dix fois plus qu'en 2020.\n" if repere else "") + "Et maintenant : la suite."
    out = [{"kind": "fact", "tag": tag, "gag": gag, "lead": lead, "caption": "Un fait.", "bubbles": [{"who": "x", "text": "Blague."}], "image": {"prompt": "x", "file": "a.webp"}, **extra}]
    if lead and photo:
        out.append({"kind": "photo", "title": "Le lieu", "text": "Ce qu'on voit.", "photo": {"commons": "File:X.jpg"}})
    out.append({"kind": "explain", "tag": "Ce qui se passe vraiment", "title": "T", "text": txt, "sources": sources})
    if lead and zoom:
        out.append({"kind": "explain", "zoom": True, "tag": "Comment ça se fait ?", "title": "Pourquoi ?", "steps": ["Un.", "Deux.", "Trois."]})
    return out


def _actu(*subjects, extra=()):
    cases = [c for s in subjects for c in s] + list(extra)
    for n, c in enumerate(cases, 1):
        c["n"] = n
    return {"id": "actu", "title": "Actu", "cases": cases}


def _check_actu(fmt, prev=()):
    got = []
    validate.check_actu_humour(fmt, validate._drawn(fmt), got.append, Path("editions/2026-12-01"), prev=list(prev))
    return got


def test_actu_au_bon_format_sans_avertissement():
    ok = _actu(_sujet("litteral", "Économie", lead=True), _sujet("litote", "Sciences"), _sujet("escalade", "Monde"), _sujet("bureau", "Culture"))
    assert _check_actu(ok) == []


def test_actu_mecaniques_variees_et_repere():
    fmt = _actu(_sujet("litteral", "Économie", lead=True, repere=False), _sujet("litteral", "Sciences"), _sujet(None, "Monde"))
    joined = " | ".join(_check_actu(fmt))
    assert "même mécanique de blague plusieurs fois" in joined and "litteral" in joined
    assert "mécanique de la blague absente" in joined
    assert joined.count("Repère") == 1  # demandé au sujet du jour seulement


def test_actu_sujet_du_jour_et_breves():
    sans_lead = _actu(_sujet("litteral", "Sciences"), _sujet("litote", "Monde"), _sujet("escalade", "Culture"))
    assert any("0 sujet(s) du jour" in m for m in _check_actu(sans_lead))
    pas_creuse = _actu(_sujet("litteral", "Sciences", lead=True, zoom=False, photo=False), _sujet("litote", "Monde"), _sujet("escalade", "Culture"))
    got = " | ".join(_check_actu(pas_creuse))
    assert "pas creusé" in got and "pas de vraie photo" in got
    longue = _actu(_sujet("litteral", "Sciences", lead=True), _sujet("litote", "Monde", words_extra=" mot" * 40), _sujet("escalade", "Culture"))
    assert any("max 45 pour une brève" in m for m in _check_actu(longue))
    six = _actu(_sujet("litteral", "Sciences", lead=True), *[_sujet(g, "Monde") for g in ("litote", "escalade", "bureau", "comparaison", "anachronisme")])
    assert any("6 sujets" in m for m in _check_actu(six))


def test_actu_sources_par_sujet():
    fmt = _actu(_sujet("litteral", "Sciences", lead=True), _sujet("litote", "Monde", sources=[{"title": "Le Monde", "url": "https://a.fr/1"}]), _sujet("escalade", "Culture"))
    got = _check_actu(fmt)
    assert sum("deux sources" in m for m in got) == 1 and any("brève 2" in m for m in got)


def test_actu_decouverte_sport_et_sciences():
    sans = _actu(_sujet("litteral", "Politique", lead=True, people=[{"name": "A", "party": "X"}]), _sujet("litote", "Monde"), _sujet("escalade", "Sport"))
    assert any("découverte" in m for m in _check_actu(sans))
    hier = _actu(_sujet("litteral", "Économie", lead=True), _sujet("litote", "Sport"), _sujet("escalade", "Culture"))
    avant = _actu(_sujet("litteral", "Économie", lead=True), _sujet("litote", "Monde"), _sujet("escalade", "Cinéma"))
    auj = _actu(_sujet("litteral", "Économie", lead=True), _sujet("litote", "Sport"), _sujet("escalade", "Culture"))
    got = " | ".join(_check_actu(auj, prev=[("2026-11-30", hier), ("2026-11-29", avant)]))
    assert "du sport deux jours de suite" in got
    assert "aucun sujet de sciences" in got
    majeur = _actu(_sujet("litteral", "Économie", lead=True), _sujet("litote", "Sport", major=True), _sujet("escalade", "Santé"))
    got = " | ".join(_check_actu(majeur, prev=[("2026-11-30", hier), ("2026-11-29", avant)]))
    assert "sport" not in got and "sciences" not in got


def test_actu_personnalites_politiques():
    lecornu = [{"name": "Sébastien Lecornu", "party": "Renaissance"}]
    sans_people = _actu(_sujet("litteral", "Politique", lead=True), _sujet("litote", "Sciences"), _sujet("escalade", "Culture"))
    assert any("sans champ « people »" in m for m in _check_actu(sans_people))
    def jour(people):
        return _actu(_sujet("litteral", "Politique", lead=True, people=people), _sujet("litote", "Sciences"), _sujet("escalade", "Culture"))
    prev = [("2026-11-30", jour(lecornu)), ("2026-11-28", jour(lecornu))]
    assert any("Sébastien Lecornu : déjà dans 2 Actus" in m for m in _check_actu(jour(lecornu), prev=prev))
    assert not any("déjà dans" in m for m in _check_actu(jour([{"name": "Autre", "party": "Y"}]), prev=prev))


def test_actu_la_suite_attendue():
    hier = _actu(_sujet("litteral", "Diplomatie", lead=True), _sujet("litote", "Sciences"), _sujet("escalade", "Culture"))
    annonce = next(c for c in hier["cases"] if c["kind"] == "explain" and not c.get("zoom"))
    annonce.update(title="Francophonie : une succession sous tension", due="2026-11-30")
    auj = _actu(_sujet("litteral", "Économie", lead=True), _sujet("litote", "Sciences"), _sujet("escalade", "Culture"))
    got = _check_actu(auj, prev=[("2026-11-30", hier)])
    assert any("« La suite » attendue" in m and "Francophonie" in m and f"2026-11-30#{annonce['n']}" in m for m in got)
    suite = {"kind": "explain", "suite": True, "tag": "La suite", "title": "Francophonie : c'est voté", "text": "Annoncé : un vote lundi.\nRésultat : élue.",
             "of": f"2026-11-30#{annonce['n']}", "sources": SRC2[:1]}
    assert _check_actu(_actu(_sujet("litteral", "Économie", lead=True), _sujet("litote", "Sciences"), _sujet("escalade", "Culture"), extra=[suite]), prev=[("2026-11-30", hier)]) == []
    # une échéance pas encore passée n'est pas réclamée
    annonce["due"] = "2026-12-05"
    assert not any("La suite" in m for m in _check_actu(auj, prev=[("2026-11-30", hier)]))


def test_actu_trop_longue():
    fmt = _actu(_sujet("litteral", "Sciences", lead=True), _sujet("litote", "Monde"), _sujet("escalade", "Culture"),
                extra=[{"kind": "buzz", "text": "mot " * 900, "why": "x"}])
    assert any("Actu trop longue" in m for m in _check_actu(fmt))


def test_sujets_retirables_avec_zoom_et_suite():
    fmt = _actu(_sujet("litteral", "Sciences", lead=True), _sujet("litote", "Monde"),
                extra=[{"kind": "explain", "suite": True, "title": "S", "text": "x"}, {"kind": "buzz", "text": "b"}])
    fmt["cases"].insert(4, {"kind": "fact", "zoom": True, "caption": "Le mécanisme.", "image": {"prompt": "x", "file": "z.webp"}})
    groups = publish.actu_subjects(fmt)
    kinds = [[("zoom-" if fmt["cases"][i].get("zoom") else "") + ("suite" if fmt["cases"][i].get("suite") else fmt["cases"][i]["kind"]) for i in g] for g in groups]
    assert kinds == [["fact", "photo", "explain", "zoom-explain", "zoom-fact"], ["fact", "explain"], ["suite"], ["buzz"]]
    assert publish.reading_minutes({"cases": [{"kind": "explain", "steps": ["mot " * 90] * 2}]}) == 1


def test_sur_internet_vannes_variees():
    fmt = {"id": "actu", "title": "Actu", "cases": [
        {"n": 1, "kind": "buzz", "text": "Des chevaux dans un bus. Moi, ma trottinette reste dehors."},
        {"n": 2, "kind": "buzz", "text": "Un hélico papal. Moi, mon vélo n'a pas de surnom."}]}
    got = []
    validate.check_humour(fmt, Path("editions/2026-12-01"), got.append)
    assert any("Sur Internet" in m for m in got)


# ---------- Collecte : sujets les plus repris, équilibre de l'Actu (16 novembre 2026) ----------
def test_sujets_les_plus_repris_et_decouverte():
    import hot
    def it(source, title, rubrique="général"):
        return {"source": source, "title": title, "rubrique": rubrique, "role": "veille", "published": "2026-11-15T10:00:00+01:00"}
    items = [it("Le Monde", "SpaceX récupère l'étage supérieur de Starship", "sciences"),
             it("Le Figaro", "Starship : SpaceX réussit à récupérer l'étage supérieur"),
             it("Le Parisien", "SpaceX récupère enfin l'étage supérieur de sa fusée Starship"),
             it("franceinfo", "Le Smic augmente de 1,6 % au 1er décembre"),
             it("Libération", "Smic : une hausse de 1,6 % au 1er décembre, annonce Matignon"),
             it("BBC World", "Storm warning issued for northern coasts")]
    groups = hot.hot_topics(items)
    assert [g["sources"] for g in groups] == [3, 2]
    assert "starship" in groups[0]["keywords"]
    disc = hot.hot_topics(items, min_sources=1, keep=lambda i: i["rubrique"] == "sciences")
    assert len(disc) == 1 and disc[0]["sources"] == 3


def test_equilibre_de_l_actu(tmp_path, monkeypatch):
    from datetime import date
    def actu(people):
        return {"formats": [{"id": "actu", "cases": [{"kind": "fact", "people": people}, {"kind": "fact", "people": people[:1]}]}]}
    for d, people in [("2026-11-20", [{"name": "A", "party": "X"}, {"name": "B", "party": "Y"}]), ("2026-11-21", [{"name": "A", "party": "X"}]),
                      ("2026-11-01", [{"name": "Vieux", "party": "Z"}])]:
        (tmp_path / d).mkdir()
        (tmp_path / d / "edition.json").write_text(json.dumps(actu(people)))
    monkeypatch.setattr(publish, "EDITIONS", tmp_path)
    b = publish.actu_balance(date(2026, 11, 21))
    assert b["editions"] == 2
    assert [(p["name"], p["n"]) for p in b["people"]] == [("A", 2), ("B", 1)]  # une fois par édition, hors période ignoré
    assert b["parties"] == [{"party": "X", "n": 2}, {"party": "Y", "n": 1}]


def test_checks_json_pour_les_taches(tmp_path, monkeypatch):
    from datetime import date
    root = tmp_path
    (root / "data").mkdir(); (root / "editions").mkdir()
    bd = root / "stock" / "cultureg" / "20261201-0000-essai"
    bd.mkdir(parents=True)
    fmt = _bd([("Un fait.", ["Qui a inventé ce truc ?", "Nous."]), ("Deux.", ["Ah."]), ("Trois.", ["Donc voilà.", "Oui."])])
    (bd / "item.json").write_text(json.dumps({"added": "20261201-0000", "formats": [fmt]}))
    monkeypatch.setattr(publish, "ROOT", root); monkeypatch.setattr(publish, "EDITIONS", root / "editions")
    publish.write_checks(date(2026, 12, 1))
    out = json.loads((root / "data" / "checks.json").read_text())
    assert out["items"][0]["path"] == "stock/cultureg/20261201-0000-essai"
    assert any("formule usée en ouverture" in w for w in out["items"][0]["warnings"])


def _queue(root, kind, name, ep, theme="Histoire de France"):
    d = root / "stock" / kind / name
    d.mkdir(parents=True)
    f = story(kind)
    f["theme"], f["epoque"] = theme, ep
    for c in f["cases"]:
        (d / c["image"]["file"]).parent.mkdir(parents=True, exist_ok=True)
        (d / c["image"]["file"]).write_bytes(b"x")
    (d / "item.json").write_text(json.dumps({"added": "x", "formats": [f]}))


def test_pick_evite_un_troisieme_passe(site):
    # 20 novembre 2026 : « très axé sur le passé ». Avec 2 BD « passé » déjà dans l'édition, la file sert d'abord du présent.
    _queue(site, "insolite", "20261120-0100-vieux", "passe")
    _queue(site, "insolite", "20261120-0200-actuel", "present")
    assert stock.pick("insolite", set()).name == "20261120-0100-vieux"
    assert stock.pick("insolite", set(), {"passe"}).name == "20261120-0200-actuel"


def test_pick_garde_le_passe_si_rien_d_autre(site):
    _queue(site, "insolite", "20261120-0100-vieux", "passe")
    assert stock.pick("insolite", set(), {"passe"}).name == "20261120-0100-vieux"


def test_epoque_par_defaut():
    assert stock.epoque({"id": "origine"}) == "passe"
    assert stock.epoque({"id": "notice"}) == "present"
    assert stock.epoque({"id": "cultureg", "epoque": "futur"}) == "futur"
    assert stock.epoque({"id": "cultureg"}) is None
