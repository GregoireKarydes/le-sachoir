"""Publie l'édition du jour à partir de 5 h (heure de Paris) et reconstruit editions/index.json.

Une édition est publiable si au moins un format a toutes ses cases dessinées.
Les formats incomplets à 5 h sont retirés de l'index public jusqu'à ce que leurs images soient prêtes.
Construit aussi le dossier _site/ déployé sur GitHub Pages (appli + éditions publiées uniquement).
"""
import json
import shutil
import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seo  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "editions"
SITE = ROOT / "_site"
PUBLISH_HOUR = 5


def format_ready(fmt: dict) -> bool:
    if fmt.get("id") == "quiz":  # le quiz n'a pas d'image : prêt dès qu'il a ses questions
        return len(fmt.get("questions", [])) >= 3
    cases = fmt.get("cases", [])
    return bool(cases) and all(c.get("image", {}).get("status") == "done" for c in cases)


def main():
    now = datetime.now(ZoneInfo("Europe/Paris"))
    today = now.date()
    index = []
    for d in sorted(EDITIONS.iterdir()):
        f = d / "edition.json"
        if not f.exists():
            continue
        try:
            day = date.fromisoformat(d.name)
        except ValueError:
            continue
        ed = json.loads(f.read_text())
        changed = False
        if ed.get("status") != "published" and (day < today or (day == today and now.hour >= PUBLISH_HOUR)):
            if any(format_ready(x) for x in ed.get("formats", [])):
                ed["status"] = "published"
                ed["published_at"] = now.isoformat()
                changed = True
                print(f"Publication de l'édition {d.name}")
        if changed:
            f.write_text(json.dumps(ed, ensure_ascii=False, indent=2))
        if ed.get("status") == "published":
            ready = [x for x in ed.get("formats", []) if format_ready(x)]
            known = {th.replace("'", "’") for ths in seo.POLES.values() for th in ths}
            for x in ready:
                if x["id"] not in ("actu", "quiz") and (x.get("theme") or "").replace("'", "’") not in known:
                    print(f"! {d.name}/{x['id']} : thématique absente ou inconnue ({x.get('theme')!r}), l'histoire sera rangée dans « Autres »")
            index.append({
                "date": d.name,
                "demo": bool(ed.get("demo")),
                "formats": [{"id": x["id"], "label": x.get("label", ""), "title": x.get("title", ""),
                              "url": "" if x["id"] == "quiz" else f"histoires/{seo.story_slug(d.name, x)}/",
                              "theme": x.get("theme", ""), "minutes": x.get("minutes", 0),
                              "tagline": x.get("tagline", ""),
                              "cover": x.get("cover", {}).get("file") if x.get("cover", {}).get("status") == "done" else None}
                             for x in ready],
            })
    index.sort(key=lambda e: e["date"], reverse=True)
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
    seo.build(SITE, index)
    print("Site construit dans _site/")


if __name__ == "__main__":
    main()
