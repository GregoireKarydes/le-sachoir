"""Contrôle des éditions : repère ce qui casserait l'appli ou la publication avant que ça arrive.

Usage : python pipeline/validate.py [editions/AAAA-MM-JJ | stock/<type>/<nom> ...]
(sans argument : toutes les éditions et toute la file d'attente stock/)
Code de sortie 1 s'il y a au moins une erreur ; les avertissements ne bloquent pas.

Utilisé aussi par publish.py : une édition illisible est ignorée, un format en erreur n'est pas publié,
mais le reste du site part quand même.
"""
import json
import re
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
MAX_CAST = {"cultureg": 2, "insolite": 2, "dossier": 4}  # 13 novembre 2026 : moins de personnages, moins de confusions au dessin
MAX_CASES = {"dossier": 24}  # 8 novembre 2026 : dossiers un peu plus courts (avant : 30)
EXPLAIN_MAX = 70            # mots d'une case « Pour mieux comprendre »
PHOTO_MAX = 45  # case photo : légende courte
ACTU_CAPTION_MAX, ACTU_EXPLAIN_MAX = 30, 50  # 8 novembre 2026 : Actu = 1 case dessinée (récitatif chargé, 1 bulle) + 1 case « Ce qui se passe vraiment »
STORY_RANGE = (120, 300)    # mots de « L'histoire complète »  # plafonds fixés le 7 novembre 2026 pour tenir dans le quota gratuit d'images


SILHOUETTE = {"tall", "short", "thin", "skinny", "plump", "round", "chubby", "broad", "huge", "small", "tiny", "lanky",
              "stocky", "wiry", "hunched", "hunchbacked", "big", "giant", "fat", "slim", "bony", "child", "kid", "teenage",
              "old", "elderly", "little", "massive", "petite", "stout", "rigid", "belly"}
LOOK_STOP = set("a an the of and with in on his her their as only colour color black white grey gray shirt coat "
                "trousers man woman in his her its".split())
COLOURS = ("red", "blue", "green", "yellow", "orange", "purple", "pink", "gold", "golden", "brown", "teal", "violet", "turquoise")


def _look_words(look: str) -> set:
    import re
    return {w for w in re.findall(r"[a-z]+", (look or "").lower()) if w not in LOOK_STOP and len(w) > 2}


def _accent(look: str) -> str | None:
    low = (look or "").lower()
    i = low.find("as main colo")  # 9 novembre 2026 : images en couleur, une couleur dominante par personnage
    if i < 0:
        i = low.find("as the only colo")  # anciennes fiches noir et blanc
    if i < 0:
        return None
    clause = low[max(0, low.rfind(",", 0, i)):i]
    return next((c for c in COLOURS if c in clause.split()), None)


def check_cast_distinct(cast: list, warn):
    """8 novembre 2026 : des personnages d'une même BD se ressemblaient. Avertissements seulement."""
    seen = {}
    for c in cast:
        look = c.get("look", "")
        if not _look_words(look) & SILHOUETTE:
            warn(f"fiche {c.get('id')} : pas de silhouette marquée (grand, petit, rond, maigre, vieux…) dans « look »")
        col = _accent(look)
        if col and col in seen:
            warn(f"fiches {seen[col]} et {c.get('id')} : même couleur dominante ({col}), à différencier")
        if col:
            seen[col] = c.get("id")
    for i, a in enumerate(cast):
        for b in cast[i + 1:]:
            wa, wb = _look_words(a.get("look")), _look_words(b.get("look"))
            if wa and wb and len(wa & wb) / len(wa | wb) > 0.25:
                warn(f"fiches {a.get('id')} et {b.get('id')} trop proches ({', '.join(sorted(wa & wb)[:6])})")


def words(t: str) -> int:
    """Mots réels : la ponctuation française espacée (« : ; ? ! ») ne compte pas."""
    return sum(1 for w in str(t or "").split() if any(ch.isalnum() for ch in w))


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
    # 13 novembre 2026 : un indice par question (affiché à la demande) rend le jeu moins frustrant.
    no_hint = [str(i) for i, q in enumerate(qs, 1) if isinstance(q, dict) and q.get("type") not in ("chain", "swipe") and not q.get("hint")]
    if no_hint:
        warn(f"question(s) sans indice « hint » : {', '.join(no_hint)}")


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
    drawn = [c for c in cases if isinstance(c, dict) and c.get("kind") not in ("explain", "photo", "buzz")]
    # « Pendant ce temps, sur Internet » (13 novembre 2026) : 3 cases à la fin de l'Actu, réécrites par nous.
    buzz = [c for c in cases if isinstance(c, dict) and c.get("kind") == "buzz"]
    if buzz and fid != "actu":
        warn("cases « Sur Internet » (kind buzz) réservées à l'Actu")
    if fid == "actu" and buzz:
        if len(buzz) > 3:
            warn(f"{len(buzz)} cases « Sur Internet », 3 au plus")
        tail = cases[-len(buzz):]
        if any(not (isinstance(c, dict) and c.get("kind") == "buzz") for c in tail):
            warn("les cases « Sur Internet » vont toutes à la fin de l'Actu, à la suite")
        for c in buzz:
            k = c.get("n", "?")
            if words(c.get("text")) > 40:
                warn(f"case {k} (Sur Internet) : {words(c.get('text'))} mots (max 40)")
            if words(c.get("why")) > 30:
                warn(f"case {k} (Sur Internet) : « why » de {words(c.get('why'))} mots (max 30)")
            if not re.match(r"^@[A-Za-zÀ-ÿ0-9_]{2,24}$", str(c.get("handle") or "")):
                warn(f"case {k} (Sur Internet) : « handle » inventé et générique attendu (« @Internet »)")
            if not str((c.get("source") or {}).get("url", "")).startswith("https://"):
                warn(f"case {k} (Sur Internet) : source (article qui explique la tendance) manquante")
    if len(drawn) > MAX_CASES.get(fid, 99):
        warn(f"{len(drawn)} cases dessinées, au-delà du plafond de {MAX_CASES[fid]} (quota d'images)")
    check_cast_distinct([c for c in fmt.get("cast", []) or [] if isinstance(c, dict)], warn)
    n_cast = len([c for c in fmt.get("cast", []) or [] if isinstance(c, dict)])
    # Seulement pour une BD pas encore entièrement dessinée : c'est là qu'on peut encore réduire le casting.
    todo = any((c.get("image") or {}).get("status") != "done" for c in drawn)
    if todo and n_cast > MAX_CAST.get(fid, 99):
        warn(f"{n_cast} personnages au casting, {MAX_CAST[fid]} au plus pour ce format (le dessin les confond)")
    for i, c in enumerate(drawn, 1):
        if todo and (c.get("image") or {}).get("status") != "done" and len((c.get("image") or {}).get("cast", []) or []) > 2:
            warn(f"case dessinée {i} : plus de 2 personnages avec fiche dans l'image")
    # 9 novembre 2026 (Greg) : des vraies images souvent, ça rend l'histoire réelle. Signalé pour que la tâche Stock en ajoute.
    n_photo = sum(1 for c in cases if isinstance(c, dict) and c.get("kind") == "photo")
    want = {"cultureg": 1, "insolite": 1, "dossier": 2}.get(fid, 0)
    if n_photo < want:
        warn(f"{n_photo} vraie(s) photo(s) (« kind »: « photo »), il en faut au moins {want} si un document libre existe")
    if fid != "actu":
        art = fmt.get("art") or {}
        missing = [k for k in ("subject", "setting", "era") if not art.get(k)]
        if missing:
            warn(f"cadre visuel « art » incomplet ({', '.join(missing)}) : les cases risquent d'être incohérentes")
    no_role = [c.get("id") for c in fmt.get("cast", []) or [] if isinstance(c, dict) and not c.get("role")]
    if no_role and fid != "actu":
        warn(f"fiches sans « role » : {', '.join(map(str, no_role))}")
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
        if case.get("kind") == "explain":  # « Pour mieux comprendre » : texte seul, sans image
            if not case.get("title") or not (case.get("text") or case.get("steps")):
                err(f"case {i} (Pour mieux comprendre) : « title » et « text » ou « steps » obligatoires")
            n = words(case.get("text")) + sum(words(x) for x in case.get("steps") or []) + words(case.get("joke"))
            emax = ACTU_EXPLAIN_MAX if fid == "actu" else EXPLAIN_MAX
            if n > emax:
                warn(f"case {i} (Pour mieux comprendre) : {n} mots (max {emax})")
            if case.get("image"):
                err(f"case {i} (Pour mieux comprendre) : pas d’image pour ce type de case")
            continue
        if case.get("kind") == "photo":  # vraie photo (Wikimedia Commons) : titre, courte explication, source affichée
            ph = case.get("photo") or {}
            if not case.get("title") or not case.get("text"):
                err(f"case {i} (photo) : « title » et « text » obligatoires")
            if not (ph.get("commons") or ph.get("file")):
                err(f"case {i} (photo) : « photo.commons » (nom du fichier sur Wikimedia Commons) obligatoire")
            elif ph.get("commons") and not str(ph["commons"]).startswith("File:"):
                warn(f"case {i} (photo) : « commons » doit commencer par « File: »")
            if words(case.get("text")) > PHOTO_MAX:
                warn(f"case {i} (photo) : {words(case.get('text'))} mots (max {PHOTO_MAX})")
            if case.get("image"):
                err(f"case {i} (photo) : pas d’image dessinée pour ce type de case")
            continue
        cmax = ACTU_CAPTION_MAX if fid == "actu" else CAPTION_MAX
        if words(case.get("caption")) > cmax:
            warn(f"case {i} : récitatif de {words(case.get('caption'))} mots (max {cmax})")
        if fid == "actu":
            if len(case.get("bubbles") or []) > 1:
                warn(f"case {i} : Actu, une seule bulle (la blague) ; l'info va dans le récitatif")
            # 9 novembre 2026 : par sujet, case dessinée → photo réelle (« En vrai ») → « Ce qui se passe vraiment ».
            nxt = cases[i] if i < len(cases) else None
            has_photo = isinstance(nxt, dict) and nxt.get("kind") == "photo"
            if has_photo:
                nxt = cases[i + 1] if i + 1 < len(cases) else None
            else:
                warn(f"case {i} : Actu, pas de photo réelle (« kind »: « photo ») juste après la case dessinée")
            if not (isinstance(nxt, dict) and nxt.get("kind") == "explain"):
                warn(f"case {i} : Actu, il manque la case « Ce qui se passe vraiment » après la case dessinée (et sa photo)")
        for b in case.get("bubbles", []) or []:
            if not b.get("who"):
                warn(f"case {i} : bulle sans « who » (nom de la personne qui parle)")
            elif b["who"] in cast_ids and not next((x.get("name") for x in fmt.get("cast", []) if x.get("id") == b["who"]), ""):
                warn(f"case {i} : le personnage {b['who']!r} n'a pas de « name » (nom affiché au-dessus de ses bulles)")
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
    if fid != "actu":
        sw = words(fmt.get("story"))
        if not sw:
            warn("« L’histoire complète » (champ story) manquante")
        elif not STORY_RANGE[0] <= sw <= STORY_RANGE[1]:
            warn(f"« L’histoire complète » : {sw} mots (repère {STORY_RANGE[0]} à {STORY_RANGE[1]})")
    if not (fmt.get("final") or {}).get("text"):
        warn("carte « Pour briller » manquante")
    if not fmt.get("sources"):
        warn("aucune source")


def check_edition(d: Path) -> dict:
    """Renvoie {"ok": bool, "errors": [...], "warnings": [...], "bad_formats": {id: [...]}, "data": edition | None}."""
    res = {"ok": True, "errors": [], "warnings": [], "bad_formats": {}, "data": None}
    f = d / "item.json" if (d / "item.json").exists() else d / "edition.json"  # BD de la file stock/ ou édition
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
    dirs = [Path(a) for a in argv] or (sorted(p for p in EDITIONS.iterdir() if (p / "edition.json").exists())
                                       + sorted(p.parent for p in (ROOT / "stock").glob("*/*/item.json")))
    n_err = 0
    for d in dirs:
        r = check_edition(d)
        f = d / ("item.json" if (d / "item.json").exists() else "edition.json")
        if (d / "item.json").exists() and r["data"] is not None:
            fmts = r["data"].get("formats", [])
            if len(fmts) != 1 or fmts[0].get("id") != d.parent.name:
                r["errors"].append(f"une file {d.parent.name} doit contenir exactement une BD {d.parent.name}")
                r["ok"] = False
        for m in r["errors"]:
            print(f"::error file={f}::{d.name} — {m}")
        for m in r["warnings"]:
            print(f"::warning file={f}::{d.name} — {m}")
        n_err += len(r["errors"])
        print(f"{d.name} : {'OK' if r['ok'] else str(len(r['errors'])) + ' erreur(s)'}, {len(r['warnings'])} avertissement(s)")
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
