"""Publie l'édition du jour à partir de 5 h (heure de Paris) et reconstruit editions/index.json.

File d'attente (8 novembre 2026) : dès 5 h, pour chaque type (Culture G, Insolite, Grand Dossier) qui manque
à l'édition du jour ou n'y est pas fini, on pioche la BD finie à 100 % la plus ancienne de `stock/` (en évitant
le pôle de la veille et ceux des autres BD du jour). Une BD pas finie d'une édition du jour ou passée retourne
en tête de file avec ses images : rien n'est perdu.

Une édition est publiable dès 5 h si au moins une BD (hors jeu) a toutes ses cases dessinées ;
à partir de 10 h, le jeu seul suffit (mieux que rien). Les formats incomplets ou en erreur sont retirés
de l'index public jusqu'à ce qu'ils soient prêts. Une édition illisible est ignorée sans bloquer le site.
Écrit aussi data/health.json (et _site/status.json) : état de la chaîne, lu par l'Orchestrateur et le contrôle de 5 h 30.
Construit aussi le dossier _site/ déployé sur GitHub Pages (appli + éditions publiées uniquement).
"""
import json
import shutil
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seo  # noqa: E402
import stock  # noqa: E402
from validate import check_edition  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "editions"
SITE = ROOT / "_site"
PUBLISH_HOUR = 5
QUEUE_SINCE = date(2026, 11, 8)  # mise en place de la file d'attente stock/
FALLBACK_HOUR = 10  # si aucune BD n'est prête, on publie quand même le jeu à partir de cette heure


TEXT_KINDS = ("explain", "photo")  # cases sans dessin : « Pour mieux comprendre » et photo réelle (Wikimedia Commons)
# Durée de lecture (13 novembre 2026, Greg : « un Grand Dossier prend plus que 3 min »).
# Avant : un chiffre écrit par la tâche d'écriture (3 min pour un dossier de 900 mots). Désormais calculée :
# lecture des textes à 180 mots par minute (bulles et récitatifs sur téléphone), 3 s pour regarder chaque
# image, 10 s pour la carte « Pour briller ». « L'histoire complète », repliée et facultative, ne compte pas.
READ_WPM = 180
SECONDS_PER_PICTURE = 3


def reading_minutes(fmt: dict) -> int:
    words, pictures = 0, 0
    for c in fmt.get("cases", []) or []:
        if not isinstance(c, dict):
            continue
        for k in ("caption", "text"):
            words += len(str(c.get(k) or "").split())
        for b in c.get("bubbles", []) or []:
            words += len(str((b or {}).get("text") or "").split())
        if c.get("kind") != "explain":
            pictures += 1
    words += len(str((fmt.get("final") or {}).get("text") or "").split())
    seconds = words / READ_WPM * 60 + pictures * SECONDS_PER_PICTURE + 10
    return max(1, round(seconds / 60))


FREE_CASES = 4  # Grand Dossier : cases lisibles par tous quand le paywall est actif


def actu_subjects(fmt: dict) -> list[list[int]]:
    """Les sujets de l'Actu : chaque case dessinée (« fact ») ouvre un sujet, les cases qui la suivent
    (photo « En vrai », « Ce qui se passe vraiment ») lui appartiennent. Renvoie les index des cases par sujet."""
    out = []
    for i, c in enumerate(fmt.get("cases", []) or []):
        if c.get("kind") not in TEXT_KINDS or not out:
            out.append([])
        out[-1].append(i)
    return out


def drop_subjects(fmt: dict, ed_date: str, hidden: set) -> dict:
    """Actu relue par Greg (13 novembre 2026) : un sujet retiré dans l'écran admin (« date|actu:N », N à partir
    de 1) disparaît de l'édition publiée, sans toucher au fichier source (« Remettre » le fait revenir)."""
    if fmt.get("id") != "actu":
        return fmt
    gone = {int(k.split("actu:")[1]) for k in hidden if k.startswith(f"{ed_date}|actu:") and k.split("actu:")[1].isdigit()}
    if not gone:
        return fmt
    keep = [i for n, idx in enumerate(actu_subjects(fmt), 1) if n not in gone for i in idx]
    cases = [c for i, c in enumerate(fmt.get("cases", [])) if i in keep]
    for n, c in enumerate(cases, 1):
        c = dict(c)
        cases[n - 1] = {**c, "n": n} if "n" in c else c
    return {**fmt, "cases": cases}


def format_ready(fmt: dict) -> bool:
    if fmt.get("id") == "quiz":  # le quiz n'a pas d'image : prêt dès qu'il a ses questions
        return len(fmt.get("questions", [])) >= 1  # Plus ou moins et Swipe tiennent en une seule « question »
    cases = fmt.get("cases", [])
    drawn = [c for c in cases if c.get("kind") not in TEXT_KINDS]  # texte ou photo : rien à dessiner
    return bool(drawn) and all(c.get("image", {}).get("status") == "done" for c in drawn)


def pending_images(fmt: dict) -> int:
    imgs = [c.get("image") or {} for c in fmt.get("cases", []) if c.get("kind") not in TEXT_KINDS] + ([fmt["cover"]] if fmt.get("cover") else [])
    return sum(1 for i in imgs if i.get("status") != "done")


_CFG = None


def api_config() -> dict | None:
    """Réponse de <api>/config (paywall, BD masquées), lue une fois par publication. None si pas d'API ou injoignable."""
    global _CFG
    if _CFG is not None:
        return _CFG or None
    cfg = json.loads((Path(__file__).resolve().parent / "site.json").read_text())
    api = (cfg.get("api_url") or "").rstrip("/")
    _CFG = {}
    if api:
        try:
            # Bibliothèque standard seulement : le workflow Publication n'installe aucun paquet.
            from urllib.request import Request, urlopen
            with urlopen(Request(f"{api}/config", headers={"User-Agent": "LeSachoirPublication/1.0"}), timeout=10) as r:
                _CFG = json.loads(r.read().decode())
        except Exception as ex:  # noqa: BLE001
            print(f"! API injoignable ({ex}) : réglages de la dernière publication")
    return _CFG or None


def _last_health(key, default):
    try:
        return json.loads((ROOT / "data" / "health.json").read_text()).get(key, default)
    except Exception:  # noqa: BLE001
        return default


def paywall_on() -> bool:
    """Paywall du Grand Dossier sur le site publié. « auto » (défaut) : actif quand l'API le dit (clé Stripe en place).
    API injoignable : on garde l'état de la dernière publication, pour ne jamais exposer la suite par accident."""
    mode = json.loads((Path(__file__).resolve().parent / "site.json").read_text()).get("paywall", "auto")
    if isinstance(mode, bool):
        return mode
    cfg = api_config()
    if cfg is None:
        return bool(_last_health("paywall", False))
    on = bool(cfg.get("paywall"))
    print(f"Paywall du Grand Dossier : {'actif' if on else 'inactif'} (API)")
    return on


def hidden_set() -> set:
    """BD masquées par l'admin (« date|format ») : absentes de l'index, du site et des pages publiques."""
    cfg = api_config()
    return set(cfg.get("hidden") or []) if cfg is not None else set(_last_health("hidden", []))


def strip_hidden(dst: Path, keys: set):
    """Retire du site publié les BD masquées d'une édition (texte et images propres à ces BD)."""
    f = dst / "edition.json"
    ed = json.loads(f.read_text())
    gone = [x for x in ed.get("formats", []) if f"{dst.name}|{x.get('id')}" in keys]
    if not gone:
        return
    ed["formats"] = [x for x in ed["formats"] if x not in gone]
    keep = {x.get("cover", {}).get("file") for x in ed["formats"]}
    for x in ed["formats"]:
        for c in x.get("cases", []):
            keep |= {(c.get(k) or {}).get("file") for k in ("image", "photo")}
    for x in gone:
        for o in [x.get("cover") or {}] + [(c.get(k) or {}) for c in x.get("cases", []) for k in ("image", "photo")]:
            if o.get("file") and o["file"] not in keep:
                (dst / o["file"]).unlink(missing_ok=True)
    f.write_text(json.dumps(ed, ensure_ascii=False))


def lock_format(fmt: dict) -> tuple[dict, set]:
    """Version publique d'un Grand Dossier : les FREE_CASES premières cases, la suite servie par l'API aux ayants droit.
    Renvoie le format allégé et les fichiers d'images à retirer du site."""
    cases = fmt.get("cases", [])
    if fmt.get("id") != "dossier" or len(cases) <= FREE_CASES:
        return fmt, set()
    keep, rest = cases[:FREE_CASES], cases[FREE_CASES:]
    def files(cs):
        out = set()
        for c in cs:
            for k in ("image", "photo"):
                if (c.get(k) or {}).get("file"):
                    out.add(c[k]["file"])
        return out
    hidden = files(rest) - files(keep) - ({fmt["cover"]["file"]} if (fmt.get("cover") or {}).get("file") else set())
    outline = [c.get("tag") for c in rest if c.get("kind") == "chap" and c.get("tag")]
    return {**fmt, "cases": keep, "locked": len(rest), "outline": outline}, hidden


def lock_site_edition(dst: Path):
    f = dst / "edition.json"
    ed = json.loads(f.read_text())
    gone = set()
    for i, fmt in enumerate(ed.get("formats", [])):
        ed["formats"][i], hidden = lock_format(fmt)
        gone |= hidden
    for name in gone:
        (dst / name).unlink(missing_ok=True)
    f.write_text(json.dumps(ed, ensure_ascii=False))


def fill_from_stock(now: datetime) -> list[str]:
    """Range les BD : celles pas finies des éditions passées ou du jour retournent en file, l'édition du jour pioche."""
    today = now.date()
    notes = []
    for d in sorted(EDITIONS.iterdir()):
        try:
            day = date.fromisoformat(d.name)
        except ValueError:
            continue
        f = d / "edition.json"
        # Seulement les éditions récentes, depuis l'arrivée de la file (les plus anciennes restent telles quelles).
        if day > today or day < max(QUEUE_SINCE, today - timedelta(days=2)) or not f.exists() \
                or (day == today and now.hour < PUBLISH_HOUR):
            continue
        try:
            ed = json.loads(f.read_text())
        except Exception:
            continue
        if ed.get("demo"):
            continue
        changed = False
        for fmt in list(ed.get("formats", [])):
            if fmt.get("id") in stock.TYPES:
                changed |= stock.normalize(fmt, d)
                if not stock.is_ready(fmt, d):
                    dst = stock.back_to_stock(d, ed, fmt, day.strftime("%Y%m%d") + "-0000")
                    notes.append(f"{d.name}/{fmt['id']} pas finie : remise en file ({dst.name})")
                    changed = True
        if day == today:
            yesterday = EDITIONS / (today - timedelta(days=1)).isoformat() / "edition.json"
            try:
                prev = {x.get("id"): stock.pole(x.get("theme")) for x in json.loads(yesterday.read_text()).get("formats", [])}
            except Exception:
                prev = {}
            for kind in stock.TYPES:
                if any(x.get("id") == kind for x in ed.get("formats", [])):
                    continue
                taken = {stock.pole(x.get("theme")) for x in ed.get("formats", []) if x.get("id") in stock.TYPES}
                item = stock.pick(kind, taken | {prev.get(kind)})
                if item:
                    fmt = stock.into_edition(item, d, ed)
                    notes.append(f"{d.name}/{kind} : « {fmt.get('title', '')} » prise dans la file ({item.name})")
                    changed = True
        if changed:
            f.write_text(json.dumps(ed, ensure_ascii=False, indent=2))
    # Édition du jour absente : on la crée dès qu'une BD finie attend dans la file.
    f = EDITIONS / today.isoformat() / "edition.json"
    if now.hour >= PUBLISH_HOUR and not f.exists() and any(stock.pick(k, set()) for k in stock.TYPES):
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps({"date": today.isoformat(), "status": "draft", "formats": []}, ensure_ascii=False, indent=2))
        notes += fill_from_stock(now)
    for n in notes:
        print(n)
    return notes


def main(now: datetime | None = None):
    now = now or datetime.now(ZoneInfo("Europe/Paris"))
    today = now.date()
    moves = fill_from_stock(now)
    index = []
    health = {"updated_at": now.isoformat(), "today": today.isoformat(), "problems": [], "days": [], "stock_moves": moves}
    gate = paywall_on()
    health["paywall"] = gate
    hidden = hidden_set()
    health["hidden"] = sorted(hidden)
    for d in sorted(EDITIONS.iterdir()):
        f = d / "edition.json"
        if not f.exists():
            continue
        try:
            day = date.fromisoformat(d.name)
        except ValueError:
            continue
        check = check_edition(d)
        if check["data"] is None:
            msg = f"{d.name} ignorée : {'; '.join(check['errors'])}"
            print(f"! {msg}")
            health["problems"].append(msg)
            continue
        ed = check["data"]
        bad = check["bad_formats"]
        for fid, errs in bad.items():
            msg = f"{d.name}/{fid} non publiable : {'; '.join(errs)}"
            print(f"! {msg}")
            health["problems"].append(msg)

        def ok(x):
            return x.get("id") not in bad and format_ready(drop_subjects(x, d.name, hidden))

        if day >= today:
            health["days"].append({
                "date": d.name, "status": ed.get("status", "draft"),
                "formats": {x.get("id"): ("prêt" if ok(x) else "erreur" if x.get("id") in bad else f"{pending_images(x)} image(s) à faire")
                            for x in ed.get("formats", [])},
            })
        # Une image que le contrôle qualité veut refaire reste en ligne tant que la nouvelle n'est pas prête.
        changed = any([stock.normalize(x, d) for x in ed.get("formats", []) if x.get("id") != "quiz"])
        # Durée de lecture recalculée d'après le contenu (jamais saisie à la main).
        for x in ed.get("formats", []):
            if x.get("id") != "quiz" and x.get("cases") and x.get("minutes") != reading_minutes(x):
                x["minutes"] = reading_minutes(x)
                changed = True
        if ed.get("status") != "published" and (day < today or (day == today and now.hour >= PUBLISH_HOUR)):
            stories = any(ok(x) for x in ed.get("formats", []) if x.get("id") != "quiz")
            late = day < today or now.hour >= FALLBACK_HOUR
            if stories or (late and any(ok(x) for x in ed.get("formats", []))):
                ed["status"] = "published"
                ed["published_at"] = now.isoformat()
                changed = True
                print(f"Publication de l'édition {d.name}")
        if changed:
            f.write_text(json.dumps(ed, ensure_ascii=False, indent=2))
        if ed.get("status") == "published":
            ready = [x for x in ed.get("formats", []) if ok(x) and f"{d.name}|{x.get('id')}" not in hidden]
            index.append({
                "date": d.name,
                "demo": bool(ed.get("demo")),
                "formats": [{"id": x["id"], "label": x.get("label", ""), "title": x.get("title", ""), "kind": x.get("kind", ""),
                              "url": "" if x["id"] == "quiz" else f"histoires/{seo.story_slug(d.name, x)}/",
                              "theme": x.get("theme", ""), "minutes": x.get("minutes", 0),
                              "tagline": x.get("tagline", ""),
                              # Nombre de cases lisibles : l'appli affiche « Lu ✓ » ou « Case 3 / 10 » dans les listes.
                              "cases": len([c for c in x.get("cases", []) if c.get("kind") != "photo" or (c.get("photo") or {}).get("status") == "done"]),
                              "cover": x.get("cover", {}).get("file") if x.get("cover", {}).get("status") == "done" else None}
                             for x in ready],
            })
    index.sort(key=lambda e: e["date"], reverse=True)
    write_health(health, index, today)
    (EDITIONS / "index.json").write_text(json.dumps({"updated_at": now.isoformat(), "editions": index}, ensure_ascii=False, indent=1))
    print(f"{len(index)} édition(s) publiée(s) dans l'index.")

    # Site statique : appli + éditions publiées
    if SITE.exists():
        shutil.rmtree(SITE)
    shutil.copytree(ROOT / "app", SITE)
    (SITE / "editions").mkdir()
    shutil.copy(EDITIONS / "index.json", SITE / "editions" / "index.json")
    for e in index:
        src = EDITIONS / e["date"]
        dst = SITE / "editions" / e["date"]
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns("cast", "*.md"))
        strip_hidden(dst, hidden)
        if any(k.startswith(f"{e['date']}|actu:") for k in hidden):
            f2 = dst / "edition.json"
            ed2 = json.loads(f2.read_text())
            ed2["formats"] = [drop_subjects(x, e["date"], hidden) for x in ed2.get("formats", [])]
            f2.write_text(json.dumps(ed2, ensure_ascii=False, indent=2))
        if gate:
            lock_site_edition(dst)
    (SITE / ".nojekyll").write_text("")
    shutil.copy(ROOT / "data" / "health.json", SITE / "status.json")
    seo.build(SITE, index, gate=gate)
    print("Site construit dans _site/")


def queue_index(today: date) -> dict:
    """Index des BD à venir pour l'écran admin (data/queue.json) : file d'attente par type et prochaines éditions.
    Le contenu complet est lu à la demande par l'API (route admin), jamais publié sur le site."""
    def brief(fmt):
        imgs = stock.images_of(fmt)
        return {"title": fmt.get("title", ""), "theme": fmt.get("theme", ""), "tagline": fmt.get("tagline", ""),
                "minutes": fmt.get("minutes", 0), "cases": len(fmt.get("cases", [])),
                "photos": sum(1 for c in fmt.get("cases", []) if c.get("kind") == "photo"),
                "images_done": sum(1 for i in imgs if i.get("status") == "done"), "images_total": len(imgs),
                "failed": sum(1 for i in imgs if i.get("status") == "failed"),
                "redo": sum(1 for i in imgs if i.get("redo"))}
    out = {"updated_at": datetime.now(ZoneInfo("Europe/Paris")).isoformat(timespec="minutes"), "stock": {}, "editions": []}
    for kind in stock.TYPES:
        nxt = stock.next_out(kind)
        rows = []
        for p in stock.items(kind):
            it = stock.load(p)
            if not it:
                rows.append({"path": f"stock/{kind}/{p.name}", "name": p.name, "status": "blocked", "title": p.name, "error": "item.json illisible"})
                continue
            fmt = it["formats"][0]
            status = "ready" if stock.is_ready(fmt, p) and not it.get("blocked") else "blocked" if it.get("blocked") else "waiting"
            rows.append({"path": f"stock/{kind}/{p.name}", "name": p.name, "added": it.get("added", ""), "status": status,
                         "next": nxt is not None and p == nxt, **brief(fmt)})
        out["stock"][kind] = rows
    for d in sorted(EDITIONS.iterdir()):
        try:
            day = date.fromisoformat(d.name)
            ed = json.loads((d / "edition.json").read_text())
        except (ValueError, OSError):
            continue
        if day < today:
            continue
        fmts = []
        for x in ed.get("formats", []):
            row = {"id": x.get("id"), "label": x.get("label", ""), "kind": x.get("kind", "")}
            row.update({"title": x.get("title", ""), "questions": len(x.get("questions", []))} if x.get("id") == "quiz" else brief(x))
            fmts.append(row)
        out["editions"].append({"date": d.name, "path": f"editions/{d.name}", "status": ed.get("status", "draft"),
                                "newsletter": bool(ed.get("newsletter")), "formats": fmts})
    return out


def write_health(health: dict, index: list, today: date):
    """Résumé lisible par une machine : l'édition du jour est-elle en ligne, combien de jours d'avance ?"""
    pub = next((e for e in index if e["date"] == today.isoformat()), None)
    health["today_published"] = bool(pub)
    health["today_stories"] = [x["id"] for x in pub["formats"] if x["id"] != "quiz"] if pub else []
    health["last_published"] = index[0]["date"] if index else None
    # File d'attente : BD finies (dessinées à 100 %) et écrites, par type. Les jours d'avance sont ceux du type le plus juste.
    try:
        (ROOT / "data" / "queue.json").write_text(json.dumps(queue_index(today), ensure_ascii=False, indent=1))
    except Exception as ex:  # noqa: BLE001 — l'index admin ne doit jamais bloquer la publication
        print(f"! queue.json : {ex}")
    summ = stock.summary()
    health["stock"] = summ
    ahead = min(s["ready"] for s in summ.values())
    health["days_ahead_drawn"] = ahead
    health["days_ahead_written"] = min(s["ready"] + s["waiting"] for s in summ.values())
    health["quiz_days_ahead"] = sum(1 for x in health["days"] if x["date"] > today.isoformat() and x["formats"].get("quiz") == "prêt")
    for kind, s in summ.items():
        if s["blocked"]:
            health["problems"].append(f"file {kind} : {s['blocked']} BD bloquée(s) (image en échec), à corriger par la tâche Stock")
    try:
        health["quota"] = json.loads((ROOT / "data" / "images-quota.json").read_text())
    except Exception:
        health["quota"] = None
    try:
        fal = json.loads((ROOT / "data" / "images-fal.json").read_text())
        health["fal"] = {"month": fal.get("month"), "spent_usd": fal.get("spent"), "images": fal.get("images"),
                         "today_usd": fal.get("days", {}).get(today.isoformat(), 0), "blocked": fal.get("blocked")}
    except Exception:
        health["fal"] = None
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "health.json").write_text(json.dumps(health, ensure_ascii=False, indent=1))
    print(f"Santé : édition du jour {'en ligne' if pub else 'ABSENTE'}, file : "
          + ", ".join(f"{k} {s['ready']} finie(s) + {s['waiting']} en cours" for k, s in summ.items()) + f", {ahead} jour(s) d'avance dessinés, "
          f"{len(health['problems'])} problème(s).")


if __name__ == "__main__":
    main()
