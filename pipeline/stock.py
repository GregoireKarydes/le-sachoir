"""File d'attente des BD hors Actu (8 novembre 2026).

Les Culture G, Insolites, Notices, « D'où ça vient ? » et Grands Dossiers ne sont plus écrits pour une date : ils entrent dans une file,
`stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json` (même forme qu'une édition : {"formats": [une BD]}),
avec leurs images dans `images/` et leurs fiches dans `cast/` à côté.

- Les images finissent une BD à 100 % avant d'attaquer la suivante du même type (la plus ancienne d'abord).
- Chaque matin, la publication pioche pour l'édition du jour une BD finie de chaque type, puis la retire de la file.
- Une BD pas finie dans une édition passée ou du jour (ancien système) retourne en tête de file avec ses images.
- Une image que le contrôle qualité veut refaire reste publiée (`"redo": true`) jusqu'à sa nouvelle version.
"""
import json
import re
import shutil
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo import POLES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
STOCK = ROOT / "stock"
TYPES = ("cultureg", "insolite", "notice", "origine", "dossier")  # notice = La Notice, origine = D'où ça vient ? (14 novembre 2026)
ORDER = ["dossier", "actu", "cultureg", "insolite", "notice", "origine", "quiz"]  # ordre des formats dans une édition

_POLE_OF = {t: p for p, ts in POLES.items() for t in ts}


def pole(theme: str | None) -> str | None:
    return _POLE_OF.get((theme or "").replace("'", "’"))


def images_of(fmt: dict) -> list[dict]:
    """Images à dessiner : couverture et cases (hors « Pour mieux comprendre »)."""
    imgs = [c["image"] for c in fmt.get("cases", []) if isinstance(c, dict) and c.get("image") and c.get("kind") not in ("explain", "photo")]
    return ([fmt["cover"]] if fmt.get("cover") else []) + imgs


def normalize(fmt: dict, d: Path) -> bool:
    """Une image « à refaire » dont le fichier existe reste publiée : status done + redo. Renvoie True si changé."""
    changed = False
    for img in images_of(fmt):
        if img.get("status") in ("retry", "pending", "failed") and img.get("file") and (d / img["file"]).exists():
            img["status"] = "done"
            img["redo"] = True
            img.pop("qa", None)
            changed = True
    return changed


def is_ready(fmt: dict, d: Path) -> bool:
    """Finie à 100 % : couverture et toutes les cases dessinées, fichiers présents."""
    imgs = images_of(fmt)
    return bool(imgs) and all(i.get("status") == "done" and (d / i.get("file", "")).exists() for i in imgs)


def left(fmt: dict) -> int:
    return sum(1 for i in images_of(fmt) if i.get("status") != "done")


def items(kind: str) -> list[Path]:
    """Dossiers de la file d'un type, du plus ancien au plus récent."""
    base = STOCK / kind
    if not base.exists():
        return []
    return sorted(p for p in base.iterdir() if (p / "item.json").exists())


def load(p: Path) -> dict | None:
    try:
        it = json.loads((p / "item.json").read_text())
        return it if isinstance(it, dict) and isinstance(it.get("formats"), list) and it["formats"] else None
    except Exception:
        return None


def save(p: Path, it: dict):
    (p / "item.json").write_text(json.dumps(it, ensure_ascii=False, indent=2))


def summary() -> dict:
    """Par type : BD finies, en cours, bloquées, images restantes."""
    out = {}
    for kind in TYPES:
        s = {"ready": 0, "waiting": 0, "blocked": 0, "images_left": 0, "focus": None, "next": None,
             "next_redo": 0}
        for p in items(kind):
            it = load(p)
            if not it:
                s["blocked"] += 1
                continue
            fmt = it["formats"][0]
            normalize(fmt, p)
            if is_ready(fmt, p):
                s["ready"] += 1
                if s["next"] is None and not it.get("blocked"):
                    s["next"] = p.name  # prochaine BD de ce type à sortir (à relire en priorité)
                    s["next_redo"] = sum(1 for i in images_of(fmt) if i.get("redo"))
            elif it.get("blocked"):
                s["blocked"] += 1
            else:
                s["waiting"] += 1
                s["images_left"] += left(fmt)
                if s["focus"] is None:
                    s["focus"] = f"{p.name} ({left(fmt)} image(s) à faire)"
        out[kind] = s
    return out


def next_out(kind: str) -> Path | None:
    """Prochaine BD de ce type qui sortira : la plus ancienne finie (la publication peut en sauter une pour le pôle)."""
    return pick(kind, set())


# Époque du sujet (20 novembre 2026, retour d'un bêta-testeur : « très axé sur le passé ») : chaque BD de la file
# dit si elle parle du passé, du présent ou du futur. Objectif : environ un tiers chacun, et pas plus de 2 BD
# « passé » dans une même édition. D'où ça vient ? est du passé par nature, La Notice du présent.
EPOQUES = ("passe", "present", "futur")
EPOQUE_DEFAULT = {"origine": "passe", "notice": "present"}
MAX_PASSE_PAR_EDITION = 2


def epoque(fmt: dict) -> str | None:
    e = fmt.get("epoque") or EPOQUE_DEFAULT.get(fmt.get("id"))
    return e if e in EPOQUES else None


def pick(kind: str, avoid: set, avoid_epoque: set | None = None) -> Path | None:
    """BD finie la plus ancienne, en évitant si possible une époque déjà trop présente dans l'édition (d'abord),
    puis les pôles déjà pris (veille, autres BD du jour)."""
    avoid_epoque = avoid_epoque or set()
    ready = []
    for p in items(kind):
        it = load(p)
        if it and not it.get("blocked") and is_ready(it["formats"][0], p):
            f = it["formats"][0]
            ready.append((p, pole(f.get("theme")), epoque(f)))
    if not ready:
        return None
    # Tri stable : l'ordre de la file reste le départage.
    return min(ready, key=lambda r: (r[2] in avoid_epoque, r[1] in avoid))[0]


def epoque_counts(last: int = 30) -> dict:
    """Répartition passé / présent / futur des dernières BD écrites (file et éditions), hors D'où ça vient ?."""
    seen = []
    for d in sorted((ROOT / "editions").glob("*/edition.json")):
        try:
            seen += [(d.parent.name, f) for f in json.loads(d.read_text()).get("formats", []) if f.get("id") in TYPES]
        except Exception:
            pass
    for kind in TYPES:
        for p in items(kind):
            it = load(p)
            if it:
                seen.append((p.name, it["formats"][0]))
    out = {e: 0 for e in EPOQUES}
    out["?"] = 0
    for _, f in sorted(seen, key=lambda x: x[0])[-last:]:
        if f.get("id") == "origine":
            continue
        out[epoque(f) or "?"] += 1
    return out


def _files(fmt: dict) -> list[str]:
    """Fichiers d'une BD à déplacer avec elle : dessins, fiches casting et photos réelles (oubliées avant le 10 novembre 2026)."""
    photos = [c["photo"]["file"] for c in fmt.get("cases", []) or []
              if isinstance(c, dict) and c.get("kind") == "photo" and (c.get("photo") or {}).get("file")]
    return ([i["file"] for i in images_of(fmt) if i.get("file")] + [c["file"] for c in fmt.get("cast", []) if c.get("file")]
            + photos)


def _copy(src: Path, dst: Path, rels: list[str]):
    for rel in rels:
        if (src / rel).exists():
            (dst / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src / rel, dst / rel)


def into_edition(item_dir: Path, ed_dir: Path, ed: dict) -> dict:
    """Place une BD finie de la file dans l'édition (fichiers compris) et la retire de la file."""
    fmt = load(item_dir)["formats"][0]
    _copy(item_dir, ed_dir, _files(fmt))
    fmt["from_stock"] = item_dir.name
    fmt.pop("redo_attempts", None)
    ed["formats"] = [x for x in ed.get("formats", []) if x.get("id") != fmt["id"]] + [fmt]
    ed["formats"].sort(key=lambda x: ORDER.index(x["id"]) if x.get("id") in ORDER else 99)
    shutil.rmtree(item_dir)
    return fmt


def slug(text: str) -> str:
    import unicodedata
    t = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40].strip("-") or "bd"


def back_to_stock(ed_dir: Path, ed: dict, fmt: dict, prefix: str) -> Path:
    """Remet en file une BD pas finie d'une édition, avec ses images (elle passe en tête : nom le plus ancien)."""
    kind = fmt["id"]
    dst = STOCK / kind / f"{prefix}-{slug(fmt.get('title'))}"
    n = 2
    while dst.exists():
        dst = STOCK / kind / f"{prefix}-{slug(fmt.get('title'))}-{n}"
        n += 1
    dst.mkdir(parents=True)
    _copy(ed_dir, dst, _files(fmt))
    for rel in _files(fmt):
        if (ed_dir / rel).exists():
            (ed_dir / rel).unlink()
    fmt.pop("from_stock", None)
    save(dst, {"added": prefix, "from_edition": ed_dir.name, "formats": [fmt]})
    ed["formats"] = [x for x in ed["formats"] if x is not fmt]
    return dst
