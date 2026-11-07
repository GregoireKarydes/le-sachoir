"""Publie l'édition du jour à partir de 5 h (heure de Paris) et reconstruit editions/index.json.

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
from validate import check_edition  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "editions"
SITE = ROOT / "_site"
PUBLISH_HOUR = 5
FALLBACK_HOUR = 10  # si aucune BD n'est prête, on publie quand même le jeu à partir de cette heure


def format_ready(fmt: dict) -> bool:
    if fmt.get("id") == "quiz":  # le quiz n'a pas d'image : prêt dès qu'il a ses questions
        return len(fmt.get("questions", [])) >= 1  # Plus ou moins et Swipe tiennent en une seule « question »
    cases = fmt.get("cases", [])
    return bool(cases) and all(c.get("image", {}).get("status") == "done" for c in cases)


def pending_images(fmt: dict) -> int:
    imgs = [c.get("image") or {} for c in fmt.get("cases", [])] + ([fmt["cover"]] if fmt.get("cover") else [])
    return sum(1 for i in imgs if i.get("status") != "done")


def main(now: datetime | None = None):
    now = now or datetime.now(ZoneInfo("Europe/Paris"))
    today = now.date()
    index = []
    health = {"updated_at": now.isoformat(), "today": today.isoformat(), "problems": [], "days": []}
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
            return x.get("id") not in bad and format_ready(x)

        if day >= today:
            health["days"].append({
                "date": d.name, "status": ed.get("status", "draft"),
                "formats": {x.get("id"): ("prêt" if ok(x) else "erreur" if x.get("id") in bad else f"{pending_images(x)} image(s) à faire")
                            for x in ed.get("formats", [])},
            })
        changed = False
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
            ready = [x for x in ed.get("formats", []) if ok(x)]
            index.append({
                "date": d.name,
                "demo": bool(ed.get("demo")),
                "formats": [{"id": x["id"], "label": x.get("label", ""), "title": x.get("title", ""), "kind": x.get("kind", ""),
                              "url": "" if x["id"] == "quiz" else f"histoires/{seo.story_slug(d.name, x)}/",
                              "theme": x.get("theme", ""), "minutes": x.get("minutes", 0),
                              "tagline": x.get("tagline", ""),
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
    (SITE / ".nojekyll").write_text("")
    shutil.copy(ROOT / "data" / "health.json", SITE / "status.json")
    seo.build(SITE, index)
    print("Site construit dans _site/")


def write_health(health: dict, index: list, today: date):
    """Résumé lisible par une machine : l'édition du jour est-elle en ligne, combien de jours d'avance ?"""
    pub = next((e for e in index if e["date"] == today.isoformat()), None)
    health["today_published"] = bool(pub)
    health["today_stories"] = [x["id"] for x in pub["formats"] if x["id"] != "quiz"] if pub else []
    health["last_published"] = index[0]["date"] if index else None
    # Jours d'avance : jours consécutifs à partir de demain dont toutes les BD du stock sont dessinées (l'Actu se fait la nuit).
    ahead = 0
    days = {x["date"]: x for x in health["days"]}
    for i in range(1, 15):
        x = days.get((today + timedelta(days=i)).isoformat())
        stock = {k: v for k, v in (x or {}).get("formats", {}).items() if k not in ("actu", "quiz")}
        if not stock or any(v != "prêt" for v in stock.values()):
            break
        ahead += 1
    health["days_ahead_drawn"] = ahead
    health["days_ahead_written"] = sum(1 for x in health["days"] if x["date"] > today.isoformat())
    try:
        health["quota"] = json.loads((ROOT / "data" / "images-quota.json").read_text())
    except Exception:
        health["quota"] = None
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "health.json").write_text(json.dumps(health, ensure_ascii=False, indent=1))
    print(f"Santé : édition du jour {'en ligne' if pub else 'ABSENTE'}, {ahead} jour(s) d'avance dessinés, "
          f"{len(health['problems'])} problème(s).")


if __name__ == "__main__":
    main()
