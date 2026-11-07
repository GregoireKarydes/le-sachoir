"""Contrôle des éditions : repère ce qui casserait l'appli ou la publication avant que ça arrive.

Usage : python pipeline/validate.py [editions/AAAA-MM-JJ ...]   (sans argument : toutes les éditions)
Code de sortie 1 s'il y a au moins une erreur ; les avertissements ne bloquent pas.

Utilisé aussi par publish.py : une édition illisible est ignorée, un format en erreur n'est pas publié,
mais le reste du site part quand même.
"""
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo import POLES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "editions"
FORMAT_IDS = {"actu", "cultureg", "insolite", "dossier", "quiz"}
QUIZ_KINDS = {"", "culture", "geo", "frise", "dico", "plusmoins", "swipe", "chiffre", "citation"}
IMAGE_STATUS = {None, "pending", "retry", "done", "failed"}
CAST_STATUS = {None, "pending", "done", "skipped", "failed"}
THEMES = {t.replace("'", "’") for ths in POLES.values() for t in ths}
CAPTION_MAX, BUBBLE_MAX = 20, 15  # mots, d'après prompts/CHARTE.md (7 novembre 2026 : plus de place pour expliquer)
MAX_CASES = {"dossier": 30}  # plafonds fixés le 7 novembre 2026 pour tenir dans le quota gratuit d'images


def words(t: str) -> int:
    return len(str(t or "").split())


def check_quiz(fmt: dict, err, warn):
    if (fmt.get("kind") or "") not in QUIZ_KINDS:
        err(f"jeu de type inconnu {fmt.get('kind')!r}")
    qs = fmt.get("questions")
    if not isinstance(qs, list) or not qs:
        err("jeu sans questions")
        return
    for i, q in enumerate(qs, 1):
        if not isinstance(q, dict):
            err(f"question {i} n'est pas un objet")
            continue
        if "choices" in q:
            ch = q.get("choices")
            if not isinstance(ch, list) or len(ch) < 2:
                err(f"question {i} : moins de 2 réponses")
            elif not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(ch):
                err(f"question {i} : « answer » hors des réponses")
        if q.get("type") in ("order", "chain", "swipe") and not q.get("items"):
            err(f"question {i} : « items » manquant")


def check_story(fmt: dict, d: Path, err, warn):
    fid = fmt["id"]
    if fid != "actu" and (fmt.get("theme") or "").replace("'", "’") not in THEMES:
        warn(f"thématique absente ou inconnue ({fmt.get('theme')!r}) : rangée dans « Autres »")
    if not fmt.get("title"):
        err("titre manquant")
    cases = fmt.get("cases")
    if not isinstance(cases, list) or not cases:
        err("aucune case")
        return
    if len(cases) > MAX_CASES.get(fid, 99):
        warn(f"{len(cases)} cases, au-delà du plafond de {MAX_CASES[fid]} (quota d'images)")
    cast_ids = set()
    for c in fmt.get("cast", []) or []:
        if not c.get("id") or not c.get("file"):
            err(f"fiche casting incomplète : {c}")
            continue
        cast_ids.add(c["id"])
        if c.get("status") not in CAST_STATUS:
            err(f"fiche {c['id']} : statut inconnu {c.get('status')!r}")
    imgs = [("couverture", fmt["cover"])] if fmt.get("cover") else []
    for i, case in enumerate(cases, 1):
        if not isinstance(case, dict):
            err(f"case {i} n'est pas un objet")
            continue
        if words(case.get("caption")) > CAPTION_MAX:
            warn(f"case {i} : récitatif de {words(case.get('caption'))} mots (max {CAPTION_MAX})")
        for b in case.get("bubbles", []) or []:
            if words(b.get("text")) > BUBBLE_MAX:
                warn(f"case {i} : bulle de {words(b.get('text'))} mots (max {BUBBLE_MAX})")
        if not case.get("image"):
            err(f"case {i} sans image")
        else:
            imgs.append((f"case {i}", case["image"]))
    files = set()
    for name, img in imgs:
        if not img.get("prompt"):
            err(f"{name} : prompt d'image manquant")
        if not img.get("file"):
            err(f"{name} : fichier d'image manquant")
        elif img["file"] in files:
            err(f"{name} : fichier {img['file']} déjà utilisé par une autre image")
        files.add(img.get("file"))
        if img.get("status") not in IMAGE_STATUS:
            err(f"{name} : statut inconnu {img.get('status')!r}")
        if img.get("status") == "done" and img.get("file") and not (d / img["file"]).exists():
            err(f"{name} : marquée faite mais {img['file']} est absent")
        unknown = set(img.get("cast", []) or []) - cast_ids
        if unknown:
            err(f"{name} : personnages sans fiche casting {sorted(unknown)}")
    if not (fmt.get("final") or {}).get("text"):
        warn("carte « Pour briller » manquante")
    if not fmt.get("sources"):
        warn("aucune source")


def check_edition(d: Path) -> dict:
    """Renvoie {"ok": bool, "errors": [...], "warnings": [...], "bad_formats": {id: [...]}, "data": edition | None}."""
    res = {"ok": True, "errors": [], "warnings": [], "bad_formats": {}, "data": None}
    f = d / "edition.json"
    try:
        ed = json.loads(f.read_text())
    except Exception as e:
        res["ok"] = False
        res["errors"].append(f"JSON illisible : {e}")
        return res
    res["data"] = ed
    if not isinstance(ed, dict) or not isinstance(ed.get("formats"), list):
        res["ok"] = False
        res["errors"].append("pas de liste « formats »")
        return res
    try:
        date.fromisoformat(d.name)
        if ed.get("date") and ed["date"] != d.name:
            res["errors"].append(f"date {ed['date']} différente du dossier {d.name}")
    except ValueError:
        pass
    seen = set()
    for fmt in ed["formats"]:
        fid = fmt.get("id") if isinstance(fmt, dict) else None
        errs = []
        err = errs.append
        warn = lambda m, fid=fid: res["warnings"].append(f"{fid} : {m}")
        if fid not in FORMAT_IDS:
            res["errors"].append(f"format inconnu {fid!r}")
            continue
        if fid in seen:
            err("format en double dans l'édition")
        seen.add(fid)
        try:
            (check_quiz if fid == "quiz" else lambda x, e, w: check_story(x, d, e, w))(fmt, err, warn)
        except Exception as e:  # une structure inattendue ne doit pas faire planter le contrôle
            err(f"structure inattendue : {e!r}")
        if errs:
            res["bad_formats"][fid] = errs
            res["errors"] += [f"{fid} : {m}" for m in errs]
    res["ok"] = not res["errors"]
    return res


def main(argv):
    dirs = [Path(a) for a in argv] or sorted(p for p in EDITIONS.iterdir() if (p / "edition.json").exists())
    n_err = 0
    for d in dirs:
        r = check_edition(d)
        for m in r["errors"]:
            print(f"::error file={d / 'edition.json'}::{d.name} — {m}")
        for m in r["warnings"]:
            print(f"::warning file={d / 'edition.json'}::{d.name} — {m}")
        n_err += len(r["errors"])
        print(f"{d.name} : {'OK' if r['ok'] else str(len(r['errors'])) + ' erreur(s)'}, {len(r['warnings'])} avertissement(s)")
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
