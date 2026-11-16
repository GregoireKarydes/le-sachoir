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
import embeds  # noqa: E402
from seo import POLES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "editions"
FORMAT_IDS = {"actu", "cultureg", "insolite", "notice", "origine", "dossier", "quiz"}
QUIZ_KINDS = {"", "culture", "geo", "frise", "dico", "plusmoins", "swipe", "chiffre", "citation"}
IMAGE_STATUS = {None, "pending", "retry", "done", "failed"}
CAST_STATUS = {None, "pending", "done", "skipped", "failed"}
THEMES = {t.replace("'", "’") for ths in POLES.values() for t in ths}
CAPTION_MAX, BUBBLE_MAX = 20, 15  # mots, d'après prompts/CHARTE.md (7 novembre 2026 : plus de place pour expliquer)
MAX_CAST = {"cultureg": 2, "insolite": 2, "notice": 2, "origine": 2, "dossier": 4}  # 13 novembre 2026 : moins de personnages, moins de confusions au dessin
MAX_CASES = {"dossier": 24, "notice": 5, "origine": 5}  # 8 novembre 2026 : dossiers un peu plus courts (avant : 30) ; 14 novembre : micro-BD La Notice
EXPLAIN_MAX = 70            # mots d'une case « Pour mieux comprendre »
PHOTO_MAX = 45  # case photo : légende courte
ACTU_CAPTION_MAX, ACTU_EXPLAIN_MAX = 30, 65  # 16 novembre 2026 : 65 mots avec la ligne « Repère : » (avant 50).  8 novembre 2026 : Actu = 1 case dessinée (récitatif chargé, 1 bulle) + 1 case « Ce qui se passe vraiment »
# « D'où ça vient ? » (14 novembre 2026) : 8 à 10 écrans de cinéma, 25 mots au plus, un seul mot en couleur (*mot*),
# 5 ou 6 images dessinées au plus (« image_of » reprend l'image d'un écran précédent).
CINE_SCREENS, CINE_MAX = (8, 10), 25
ACTU_ZOOM_MAX = 90   # « Comment ça se fait ? » (13 novembre 2026) : sujet du jour creusé, 3 à 5 maillons
ACTU_BRIEF_MAX = 45  # 16 novembre 2026 : « Ce qui se passe vraiment » d'une brève (le sujet du jour garde 65 mots)
ACTU_SUITE_MAX = 45  # case « La suite »
ACTU_MINUTES_MAX = 4  # l'Actu se lit en 3 à 4 minutes (elle en faisait 5 le 16 novembre)
BUZZ_REAL_SINCE = "2026-11-18"  # « Sur Internet » : une vraie image par case, plus de faux post (même date que publish.py)
HUMOUR_SINCE = "2026-11-18"  # éditions concernées par les contrôles d'humour (les BD déjà publiées ne sont pas relues)
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


# Têtes qui reviennent (15 novembre 2026) : le « jeune roux en sweat vert » revenait 5 fois en dix jours, dont deux
# fois dans l'édition du 15. Une fiche pas encore dessinée qui reprend la même coiffure (couleur) et la même couleur
# dominante qu'un personnage d'une autre BD récente (14 derniers jours) ou de la file est signalée.
HAIR = {"red": "red", "ginger": "red", "auburn": "red", "copper": "red", "orange": "red", "blond": "blond", "blonde": "blond",
        "golden": "blond", "black": "black", "brown": "brown", "chestnut": "brown", "grey": "grey", "gray": "grey",
        "silver": "grey", "white": "white", "pink": "pink", "blue": "blue", "purple": "purple", "green": "green"}
_RECENT = None


def _signature(look: str):
    import re
    low = (look or "").lower()
    if re.search(r"\bbald", low):
        hair = "bald"
    else:
        hair = None
        for m in re.finditer(r"((?:[a-z-]+[ ,]+){0,4})(?:hair|bun|afro|curls|ponytail|braids?|mohawk)\b", low):
            words = re.findall(r"[a-z]+", m.group(1))
            hit = [HAIR[w] for w in words if w in HAIR]
            if hit:
                hair = hit[-1]
                break
    acc = _accent(look)
    return (hair, acc) if hair and acc else None


def recent_looks() -> list:
    """(clé de la BD, id, signature, statut de la fiche) pour les éditions des 14 derniers jours et toute la file."""
    global _RECENT
    if _RECENT is not None:
        return _RECENT
    import datetime as _dt
    since = (_dt.date.today() - _dt.timedelta(days=14)).isoformat()
    files = [p for p in EDITIONS.glob("*/edition.json") if p.parent.name >= since] + list((ROOT / "stock").glob("*/*/item.json"))
    out = []
    for f in files:
        try:
            ed = json.loads(f.read_text())
        except Exception:
            continue
        for fmt in ed.get("formats", []):
            for c in fmt.get("cast", []) or []:
                sig = _signature(c.get("look", "")) if isinstance(c, dict) else None
                if sig:
                    out.append((f"{f.parent.name}/{fmt.get('id')}", c.get("id"), sig))
    _RECENT = out
    return out


def check_recent_faces(fmt: dict, d: Path, warn):
    key = f"{d.name}/{fmt.get('id')}"
    for c in fmt.get("cast", []) or []:
        if not isinstance(c, dict) or c.get("status") == "done":
            continue
        sig = _signature(c.get("look", ""))
        if not sig:
            continue
        same = sorted({k for k, cid, s in recent_looks() if s == sig and k != key})
        if same:
            warn(f"fiche {c.get('id')} : même tête qu'un personnage récent ({sig[0]} hair, {sig[1]} main colour : "
                 f"{', '.join(same[:3])}) ; changer coiffure ou couleur dominante")


# Découpage (15 novembre 2026, demande de Greg) : 63 % des cases étaient en « medium shot », 5 % en gros plan,
# presque toujours deux personnages debout face au lecteur. Le dernier mot de cadrage du prompt fait foi.
SHOTS = ["extreme close-up", "medium close-up", "close-up", "medium wide shot", "medium shot", "wide shot",
         "low angle", "high angle", "bird's-eye view", "over-the-shoulder", "from behind", "insert"]
CLOSE = {"extreme close-up", "medium close-up", "close-up", "insert"}


def shot_of(prompt: str) -> str | None:
    pat = "|".join(re.escape(k) for k in sorted(SHOTS, key=len, reverse=True))
    found = re.findall(pat, (prompt or "").lower())
    return found[-1] if found else None


def check_shots(drawn: list, fid: str, warn):
    """Variété des cadrages d'une BD pas encore dessinée (voir « Découpage » dans prompts/SCHEMA.md)."""
    shots = [shot_of((c.get("image") or {}).get("prompt", "")) for c in drawn]
    n = len(shots)
    if n < 3:
        return
    missing = [i for i, s in enumerate(shots, 1) if not s]
    if missing:
        warn(f"découpage : cadrage absent en fin de prompt, case(s) dessinée(s) {', '.join(map(str, missing))}")
    medium = sum(1 for s in shots if s == "medium shot")
    if medium > max(1, round(.4 * n)):
        warn(f"découpage : {medium} plans moyens sur {n} cases (au plus 40 %), varier gros plans, plans larges, angles")
    if fid != "actu" and not any(s in CLOSE for s in shots):
        warn("découpage : aucun gros plan (close-up) ; il en faut au moins un, souvent sur la réaction de la chute")
    for i in range(1, n):
        if shots[i] and shots[i] == shots[i - 1]:
            warn(f"découpage : cases dessinées {i} et {i + 1} au même cadrage ({shots[i]})")
            break
    if fid != "actu":
        duo = sum(1 for c in drawn if len((c.get("image") or {}).get("cast", []) or []) >= 2)
        if duo == n:
            warn("découpage : les deux personnages sont dans toutes les cases ; au moins une case avec un seul personnage ou un objet seul")


# ---------- Humour et info : les formules qui reviennent (16 novembre 2026) ----------
# Constat sur 38 BD : 19 chutes en « Donc… », 6 ouvertures en « Qui a inventé… ? », presque aucune case muette,
# une question suivie d'une réponse dans près d'une case sur deux, et une carte « Pour briller » qui répète le résumé.
# Règles : « Des scènes, pas des interviews » dans prompts/CHARTE.md. Avertissements seulement, rien de bloquant.
OPENING_FORMULAS = [
    (re.compile(r"^\W*(mais )?qui a (invent|eu l.id|choisi|d[ée]cid|pondu|imagin)", re.I), "« Qui a inventé / eu l’idée… ? »"),
    (re.compile(r"(c.est|c.[ée]tait) (un peu |encore )?(de )?ma faute|c.est moi qui ai commenc", re.I), "« C’est (un peu) ma faute »"),
    (re.compile(r"^\W*moi\W+(enfin|presque)", re.I), "« Moi. Enfin, presque. »"),
]
CLOSING_FORMULAS = [
    (re.compile(r"^\W*donc\b", re.I), "une chute qui commence par « Donc… » (le résumé va dans le récitatif, pas dans la chute)"),
    (re.compile(r"^\W*(en r[ée]sum[ée]|en bref|bref)\b", re.I), "une chute qui résume (« En bref… »)"),
]
GAG_KINDS = {"litteral", "anachronisme", "mauvaise-foi", "litote", "escalade", "bureau", "comparaison", "silence"}
INTERVIEW_MAX = .34      # part des cases dessinées « question → réponse » au-delà de laquelle la BD est une interview
SILENT_FROM = 6          # à partir de 6 cases dessinées, au moins une case muette (les micro-BD de 4 ou 5 cases en sont dispensées)
FINAL_OVERLAP = .6       # part des mots de la carte « Pour briller » déjà dans une même case : au-delà, c'est une redite
STOP_FR = set("le la les un une des de du d l et ou a au aux en est sont c ce cet cette ces qui que qu dans par pour sur avec sans "
              "son sa ses leur leurs se s n ne pas plus il elle ils elles on y à ont été être avoir comme mais donc car "
              "très tout tous toute toutes même depuis vers chez entre aussi alors puis".split())
_OPENERS = None


def _norm(t: str) -> list:
    return [w for w in re.findall(r"[a-zà-ÿœ0-9]+", str(t or "").lower().replace("’", " ").replace("'", " "))]


def _content(t: str) -> set:
    return {w for w in _norm(t) if w not in STOP_FR and len(w) > 2}


def _drawn(fmt: dict) -> list:
    return [c for c in fmt.get("cases", []) or [] if isinstance(c, dict) and c.get("kind") not in ("explain", "photo", "buzz") and not c.get("image_of")]


def _edges(fmt: dict):
    """(trois premiers mots de la première bulle, trois premiers mots de la dernière bulle) d'une BD."""
    dr = _drawn(fmt)
    first = next((b.get("text", "") for c in dr for b in c.get("bubbles", []) or []), "")
    last = next((b.get("text", "") for c in reversed(dr) for b in reversed(c.get("bubbles", []) or [])), "")
    return " ".join(_norm(first)[:3]), " ".join(_norm(last)[:3])


def recent_edges() -> list:
    """Ouvertures et chutes des BD récentes (14 jours) et de la file, pour repérer deux BD qui commencent ou finissent pareil."""
    global _OPENERS
    if _OPENERS is not None:
        return _OPENERS
    out = []
    since = (__import__("datetime").date.today() - __import__("datetime").timedelta(days=14)).isoformat()
    files = [p for p in sorted(EDITIONS.glob("*/edition.json")) if p.parent.name >= since] + sorted((ROOT / "stock").glob("*/*/item.json"))
    for p in files:
        try:
            for f in json.loads(p.read_text()).get("formats", []):
                if isinstance(f, dict) and f.get("id") in MAX_CAST:
                    out.append((str(p.parent), f.get("title", ""), *_edges(f)))
        except (ValueError, OSError):
            continue
    _OPENERS = out
    return out


def check_humour(fmt: dict, d: Path, warn, others=None):
    """Formules, interview, cases muettes, carte « Pour briller » : BD de la file ou à venir (les bulles se réécrivent sans redessiner)."""
    fid = fmt["id"]
    dr = _drawn(fmt)
    if fid == "actu":
        return check_actu_humour(fmt, dr, warn, d)
    if fid not in MAX_CAST or len(dr) < 3:
        return
    first = [b.get("text", "") for b in dr[0].get("bubbles", []) or []]
    last = [b.get("text", "") for b in dr[-1].get("bubbles", []) or []]
    for rx, label in OPENING_FORMULAS:
        if any(rx.search(t) for t in first):
            warn(f"formule usée en ouverture : {label}")
    for rx, label in CLOSING_FORMULAS:
        if any(rx.search(t) for t in last):
            warn(f"formule usée en chute : {label}")
    qa = sum(1 for c in dr if len(c.get("bubbles") or []) >= 2 and str(c["bubbles"][0].get("text", "")).rstrip(" » ").endswith("?"))
    if qa > max(2, round(INTERVIEW_MAX * len(dr))):
        warn(f"format interview : {qa} cases sur {len(dr)} sont une question suivie de sa réponse (au plus un tiers) ; "
             "faire vivre la situation aux personnages au lieu de la commenter")
    if len(dr) >= SILENT_FROM and not any(not (c.get("bubbles") or []) for c in dr):
        warn("aucune case muette : au moins une case sans bulle où l'image porte le gag (réaction, objet absurde)")
    # La carte « Pour briller » ne répète ni le résumé (récitatif de la dernière case dessinée) ni le titre.
    fin = _content((fmt.get("final") or {}).get("text"))
    if len(fin) >= 5:
        resume, title = _content(dr[-1].get("caption")), _content(fmt.get("title"))
        if resume and len(fin & resume) / len(fin) >= FINAL_OVERLAP:
            warn("carte « Pour briller » : redite du résumé de la dernière case ; donner plutôt le fait le plus surprenant, celui qu'on ressort au dîner")
        elif len(title) >= 4 and len(fin & title) / len(title) >= .75:
            warn("carte « Pour briller » : redite du titre ; donner plutôt le fait le plus surprenant, celui qu'on ressort au dîner")
    mine = _edges(fmt)
    for where, title, op, cl in (recent_edges() if others is None else others):
        if where == str(d) or title == fmt.get("title"):
            continue
        if mine[0] and len(mine[0].split()) == 3 and mine[0] == op:
            warn(f"ouverture identique à « {title} » (« {op}… »)")
            break
        if mine[1] and len(mine[1].split()) == 3 and mine[1] == cl:
            warn(f"chute identique à « {title} » (« {cl}… »)")
            break


DISCOVERY_TAGS = {"sciences", "science", "espace", "tech", "technologie", "numerique", "sante", "environnement", "climat", "energie",
                  "culture", "cinema", "musique", "livres", "patrimoine", "arts"}
SCIENCE_TAGS = {"sciences", "science", "espace", "tech", "technologie", "numerique", "sante", "environnement", "climat", "energie"}
SPORT_TAGS = {"sport", "sports", "football", "rugby", "tennis", "cyclisme", "basket", "handball", "athletisme", "formule 1"}


def _tag(c: dict) -> str:
    t = __import__("unicodedata").normalize("NFKD", str(c.get("tag") or "").lower())
    return "".join(ch for ch in t if not __import__("unicodedata").combining(ch)).strip()


def actu_subjects(fmt: dict) -> list:
    """Les sujets de l'Actu : chaque case dessinée (hors « Comment ça se fait ? ») ouvre un sujet ; les cases qui suivent
    (photo, « Ce qui se passe vraiment », zoom) lui appartiennent. « La suite » et « Sur Internet » sont à part."""
    out = []
    for c in fmt.get("cases", []) or []:
        if not isinstance(c, dict) or c.get("kind") == "buzz" or c.get("suite"):
            continue
        if c.get("kind") not in ("explain", "photo") and not c.get("zoom"):
            out.append([])
        if out:
            out[-1].append(c)
    return out


def previous_actus(d: Path, n: int = 6) -> list:
    """Les Actus des éditions précédentes (les plus récentes d'abord) : [(date, format actu)], au plus n jours en arrière."""
    out = []
    try:
        day = __import__("datetime").date.fromisoformat(d.name)
    except ValueError:
        return out
    for k in range(1, n + 1):
        prev = (day - __import__("datetime").timedelta(days=k)).isoformat()
        try:
            ed = json.loads((d.parent / prev / "edition.json").read_text())
        except (OSError, ValueError):
            continue
        a = next((f for f in ed.get("formats", []) if isinstance(f, dict) and f.get("id") == "actu"), None)
        if a:
            out.append((prev, a))
    return out


def _actu_minutes(fmt: dict) -> float:
    w, pics = 0, 0
    for c in fmt.get("cases", []) or []:
        if not isinstance(c, dict):
            continue
        w += words(c.get("caption")) + words(c.get("text")) + words(c.get("why")) + sum(words(x) for x in c.get("steps") or [])
        w += sum(words((b or {}).get("text")) for b in c.get("bubbles", []) or [])
        pics += c.get("kind") not in ("explain", "buzz")
    w += words((fmt.get("final") or {}).get("text"))
    return (w / 180 * 60 + pics * 3 + 10) / 60


def check_actu_humour(fmt: dict, dr: list, warn, d: Path | None = None, prev=None):
    """L'Actu (règles des 16 novembre 2026) : blagues variées, un sujet du jour creusé et des brèves, un sujet « découverte »,
    le sport un jour sur deux, les sources de chaque sujet, les suites promises, l'équilibre des personnalités, 3 à 4 minutes."""
    prev = (previous_actus(d) if d is not None else []) if prev is None else prev
    cases = [c for c in fmt.get("cases", []) or [] if isinstance(c, dict)]
    # --- blagues : une mécanique une seule fois (la case dessinée « Comment ça se fait ? » en est dispensée)
    gags = [c.get("gag") for c in dr if not c.get("zoom")]
    for i, g in enumerate(gags, 1):
        if not g:
            warn(f"case dessinée {i} : mécanique de la blague absente (champ « gag » : {', '.join(sorted(GAG_KINDS))})")
        elif g not in GAG_KINDS:
            warn(f"case dessinée {i} : mécanique « {g} » inconnue ({', '.join(sorted(GAG_KINDS))})")
    twice = sorted({g for g in gags if g and gags.count(g) > 1})
    if twice:
        warn(f"même mécanique de blague plusieurs fois le même jour : {', '.join(twice)} (une fois chacune au plus)")
    buzz = [str(c.get("text") or "") for c in cases if c.get("kind") == "buzz"]
    starts = [" ".join(_norm(t.split(". ")[-1])[:1]) for t in buzz]
    if len(buzz) >= 2 and any(starts.count(x) > 1 for x in starts if x):
        warn("« Sur Internet » : plusieurs vannes construites pareil (même premier mot de chute, « Moi, ma… ») ; varier")
    subjects = actu_subjects(fmt)
    if not subjects:
        return
    # --- un sujet du jour creusé, puis des brèves
    if not 3 <= len(subjects) <= 5:
        warn(f"{len(subjects)} sujets : viser 1 sujet du jour et 2 à 4 brèves (3 à 5 sujets)")
    leads = [k for k, sub in enumerate(subjects) if sub[0].get("lead")]
    if len(leads) != 1:
        warn(f"{len(leads)} sujet(s) du jour (« lead »: true sur sa case dessinée) : il en faut exactement un")
    elif leads[0] != 0:
        warn("le sujet du jour (« lead ») ouvre l'Actu : le placer en premier")
    for k, sub in enumerate(subjects, 1):
        lead = bool(sub[0].get("lead"))
        name = "sujet du jour" if lead else f"brève {k}"
        ex = next((c for c in sub if c.get("kind") == "explain" and not c.get("zoom")), None)
        if ex:
            lines = [l.strip() for l in str(ex.get("text") or "").split("\n") if l.strip()]
            for label in ("Quoi :", "Pourquoi ça compte :", "Et maintenant :"):
                if not any(l.startswith(label) for l in lines):
                    warn(f"{name} : ligne « {label} » absente de « Ce qui se passe vraiment »")
            if lead and not any(l.startswith("Repère :") for l in lines):
                warn("sujet du jour : ligne « Repère : » absente (une comparaison chiffrée qui donne l'échelle)")
            if not lead and words(ex.get("text")) > ACTU_BRIEF_MAX:
                warn(f"{name} : « Ce qui se passe vraiment » de {words(ex.get('text'))} mots (max {ACTU_BRIEF_MAX} pour une brève)")
            srcs = {str(x.get("title") or "").strip().lower() for x in ex.get("sources") or [] if isinstance(x, dict) and str(x.get("url", "")).startswith("https://")}
            if len(srcs - {""}) < 2:
                warn(f"{name} : deux sources de médias différents attendues dans « sources » de la case « Ce qui se passe vraiment » (titre + adresse https)")
        if lead:
            if not any(c.get("kind") == "photo" for c in sub):
                warn("sujet du jour : pas de vraie photo (le lieu, l'objet ou l'institution dont on parle)")
            if not any(c.get("kind") == "explain" and c.get("zoom") for c in sub):
                warn("sujet du jour : pas creusé (case texte « Comment ça se fait ? », « zoom »: true, 3 à 5 maillons)")
    # --- rubriques : un sujet « découverte » par Actu, le sport un jour sur deux, les sciences régulièrement
    tags = [_tag(sub[0]) for sub in subjects]
    if not any(t in DISCOVERY_TAGS for t in tags):
        warn("aucun sujet « découverte » (sciences, espace, tech, santé, environnement ou culture) : en prendre un dans « discovery » du fichier RSS")
    prev_tags = [[_tag(sub[0]) for sub in actu_subjects(a)] for _, a in prev[:2]]
    sport = [sub[0] for sub in subjects if _tag(sub[0]) in SPORT_TAGS]
    if sport and prev_tags and any(t in SPORT_TAGS for t in prev_tags[0]) and not any(c.get("major") for c in sport):
        warn("du sport deux jours de suite : un jour sur deux au plus, sauf événement majeur (« major »: true sur la case)")
    if len(prev_tags) == 2 and not any(t in SCIENCE_TAGS for ts in [tags] + prev_tags for t in ts):
        warn("aucun sujet de sciences, de tech, de santé ou d'environnement en trois Actus")
    # --- personnalités politiques : déclarées, et pas toujours les mêmes
    for sub in subjects:
        c = sub[0]
        if _tag(c) == "politique" and not c.get("people"):
            warn("sujet politique sans champ « people » (nom et parti des personnalités mises en scène) : l'équilibre ne peut pas être suivi")
    week = {}
    for _, a in prev[:6]:
        for name in {str(w.get("name") or "").strip() for c in a.get("cases", []) or [] if isinstance(c, dict) for w in c.get("people") or []}:
            week[name] = week.get(name, 0) + 1
    for name in sorted({str(w.get("name") or "").strip() for c in cases for w in c.get("people") or []} - {""}):
        if week.get(name, 0) >= 2:
            warn(f"{name} : déjà dans {week[name]} Actus sur les 6 derniers jours ; varier les personnalités et les bords")
    # --- « La suite » : ce que les Actus précédentes avaient annoncé (« due ») et dont on connaît le résultat
    suites = [c for c in cases if c.get("suite")]
    if len(suites) > 2:
        warn(f"{len(suites)} cases « La suite », 2 au plus")
    for c in suites:
        if not re.fullmatch(r"\d{4}-\d\d-\d\d#\d+", str(c.get("of") or "")):
            warn("case « La suite » : champ « of » attendu (« AAAA-MM-JJ#n » : édition et numéro de la case qui annonçait l'échéance)")
        if not any(str(x.get("url", "")).startswith("https://") for x in c.get("sources") or [] if isinstance(x, dict)):
            warn("case « La suite » : au moins une source (titre + adresse https)")
    if d is not None and re.fullmatch(r"\d{4}-\d\d-\d\d", d.name):
        done = {str(c.get("of")) for c in suites}
        for i, (date, a) in enumerate(prev[:4]):
            later = prev[:i]  # éditions sorties entre l'annonce et aujourd'hui
            done_before = {str(c.get("of")) for _, x in later for c in x.get("cases", []) or [] if isinstance(c, dict) and c.get("suite")}
            for c in a.get("cases", []) or []:
                if isinstance(c, dict) and c.get("kind") == "explain" and re.fullmatch(r"\d{4}-\d\d-\d\d", str(c.get("due") or "")):
                    ref = f"{date}#{c.get('n')}"
                    if c["due"] < d.name and ref not in done and ref not in done_before:
                        warn(f"« La suite » attendue : « {c.get('title', '')} » annonçait une échéance le {c['due']} ({ref}) ; donner le résultat s'il est connu")
    # --- durée de lecture
    if _actu_minutes(fmt) > ACTU_MINUTES_MAX + .5:
        warn(f"Actu trop longue : environ {round(_actu_minutes(fmt))} min de lecture (viser 3 à 4) ; raccourcir les brèves ou en retirer une")


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


def check_cine(cases: list, err, warn):
    """« D'où ça vient ? » : récit en écrans de cinéma (texte posé par l'appli sur le bas de l'image)."""
    screens = [c for c in cases if isinstance(c, dict) and c.get("kind") == "cine"]
    if len(screens) != len([c for c in cases if isinstance(c, dict)]):
        warn("D'où ça vient ? : seulement des écrans « kind »: « cine » (ni bulles ni cases texte)")
    lo, hi = CINE_SCREENS
    if not lo <= len(screens) <= hi:
        warn(f"D'où ça vient ? : {len(screens)} écrans, il en faut {lo} à {hi}")
    for i, c in enumerate(cases, 1):
        if not isinstance(c, dict) or c.get("kind") != "cine":
            continue
        txt = str(c.get("text") or "")
        if not txt.strip():
            err(f"écran {i} : « text » vide")
        if words(txt.replace("*", "")) > CINE_MAX:
            warn(f"écran {i} : {words(txt.replace('*', ''))} mots (max {CINE_MAX})")
        marks = re.findall(r"\*[^*\n]+\*", txt)
        if len(marks) != 1 or txt.count("*") != 2:
            warn(f"écran {i} : un seul mot clé en couleur, écrit *ainsi*")
        if c.get("bubbles") or c.get("caption"):
            warn(f"écran {i} : ni bulle ni récitatif, tout le texte va dans « text »")
        ref = c.get("image_of")
        if ref is not None:
            src = cases[ref - 1] if isinstance(ref, int) and 1 <= ref < i else None
            if not (isinstance(src, dict) and src.get("image")):
                err(f"écran {i} : « image_of » doit donner le numéro d'un écran précédent qui a sa propre image")
            if c.get("image"):
                err(f"écran {i} : « image » et « image_of » à la fois")
        z = c.get("zoom")
        if z is not None and not (isinstance(z, (int, float)) and 1 <= z <= 1.6):
            warn(f"écran {i} : « zoom » entre 1 et 1,6")


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
    drawn = [c for c in cases if isinstance(c, dict) and c.get("kind") not in ("explain", "photo", "buzz") and not c.get("image_of")]
    if any(isinstance(c, dict) and c.get("kind") == "cine" for c in cases):
        check_cine(cases, err, warn)  # ancien format écrans (14 novembre 2026), abandonné le jour même
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
            # 16 novembre 2026 (Greg : les faux posts, « c'est pas terrible ») : une vraie image, plus de pseudo ni de compteurs inventés.
            real = bool(re.fullmatch(r"\d{4}-\d\d-\d\d", d.name)) and d.name >= BUZZ_REAL_SINCE
            if real:
                vurl = str((c.get("video") or {}).get("url") or "")
                has = embeds.provider(vurl) in embeds.VIDEO or str((c.get("photo") or {}).get("commons") or "").startswith("File:") \
                    or bool(embeds.provider(str((c.get("post") or {}).get("url") or "")))
                if not has:
                    warn(f"case {k} (Sur Internet) : pas de vraie image (« video.url » YouTube ou TikTok, ou « photo.commons ») : la case ne sera pas publiée")
                if vurl and embeds.provider(vurl) not in embeds.VIDEO:
                    warn(f"case {k} (Sur Internet) : « video.url » doit être l'adresse d'une vidéo YouTube ou TikTok ({vurl!r})")
                if not c.get("title"):
                    warn(f"case {k} (Sur Internet) : « title » manquant (la tendance en quelques mots)")
                elif words(c.get("title")) > 12:
                    warn(f"case {k} (Sur Internet) : titre de {words(c.get('title'))} mots (max 12)")
                fake = [x for x in ("handle", "name", "likes", "shares", "ago") if c.get(x)]
                if fake:
                    warn(f"case {k} (Sur Internet) : champs de faux post à retirer ({', '.join(fake)})")
            elif not re.match(r"^@[A-Za-zÀ-ÿ0-9_]{2,24}$", str(c.get("handle") or "")):
                warn(f"case {k} (Sur Internet) : « handle » inventé et générique attendu (« @Internet »)")
            if not str((c.get("source") or {}).get("url", "")).startswith("https://"):
                warn(f"case {k} (Sur Internet) : source (article qui explique la tendance) manquante")
            post = c.get("post")
            if post is not None:
                url = (post or {}).get("url", "") if isinstance(post, dict) else ""
                if not embeds.provider(url):
                    warn(f"case {k} (Sur Internet) : « post.url » doit être l'adresse d'un post X, Bluesky ou TikTok ({url!r})")
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
    if todo and ("stock" in d.parts or d.name >= __import__("datetime").date.today().isoformat()):
        check_recent_faces(fmt, d, warn)
    if todo and ("stock" in d.parts or d.name >= __import__("datetime").date.today().isoformat()):
        check_shots(drawn, fid, warn)
    # 16 novembre 2026 : formules, interview, cases muettes, « Pour briller ». Même une BD dessinée : les bulles se réécrivent.
    if "stock" in d.parts or (re.fullmatch(r"\d{4}-\d\d-\d\d", d.name) and d.name >= HUMOUR_SINCE):
        check_humour(fmt, d, warn)
    # 9 novembre 2026 (Greg) : des vraies images souvent, ça rend l'histoire réelle. Signalé pour que la tâche Stock en ajoute.
    n_photo = sum(1 for c in cases if isinstance(c, dict) and c.get("kind") == "photo")
    want = {"cultureg": 1, "insolite": 1, "notice": 1, "origine": 1, "dossier": 2}.get(fid, 0)
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
            emax = (ACTU_ZOOM_MAX if case.get("zoom") else ACTU_SUITE_MAX if case.get("suite") else ACTU_EXPLAIN_MAX) if fid == "actu" else EXPLAIN_MAX
            if fid == "actu" and case.get("zoom") and not 3 <= len(case.get("steps") or []) <= 5:
                warn(f"case {i} (Comment ça se fait ?) : 3 à 5 maillons dans « steps »")
            if n > emax:
                warn(f"case {i} (Pour mieux comprendre) : {n} mots (max {emax})")
            if case.get("image"):
                err(f"case {i} (Pour mieux comprendre) : pas d’image pour ce type de case")
            continue
        if fid == "origine" and case.get("kind") == "cine" and case.get("image_of"):
            continue  # reprend l'image d'un écran précédent : contrôlé dans check_cine
        if case.get("kind") == "buzz":  # « Pendant ce temps, sur Internet » : texte seul, contrôlé plus haut
            if case.get("image"):
                err(f"case {i} (Sur Internet) : pas d’image pour ce type de case")
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
            nxt = cases[i] if i < len(cases) else None
            if case.get("zoom"):  # 13 novembre 2026 : « Comment ça se fait ? », dessin du mécanisme puis sa case texte
                if not (isinstance(nxt, dict) and nxt.get("kind") == "explain" and nxt.get("zoom")):
                    warn(f"case {i} : « Comment ça se fait ? » dessinée sans sa case texte (explain, zoom) juste après")
            else:  # par sujet : case dessinée → photo réelle si elle montre vraiment le sujet → « Ce qui se passe vraiment »
                if isinstance(nxt, dict) and nxt.get("kind") == "photo":
                    nxt = cases[i + 1] if i + 1 < len(cases) else None
                if not (isinstance(nxt, dict) and nxt.get("kind") == "explain" and not nxt.get("suite")):
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
