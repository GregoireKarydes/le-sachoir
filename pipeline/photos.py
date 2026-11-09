"""Cases photo : télécharge les vraies images choisies sur Wikimedia Commons et note leur source.

Une case `{"kind": "photo", "title", "text", "photo": {"commons": "File:…"}}` est écrite par les tâches Claude.
Ce script (lancé par le workflow Images) demande à l'API Commons l'adresse, l'auteur et la licence du fichier,
refuse les licences non libres, enregistre une version de 1080 px de large en WebP à côté de la BD
et remplit `photo.file`, `credit`, `license`, `license_url`, `source`, `status: "done"`.
Après 3 échecs : `status: "failed"`, la case est alors simplement sautée par l'appli et les pages publiques.

Garde-fous automatiques (9 novembre 2026), avant tout téléchargement :
- licence libre uniquement ;
- refus d'un fichier marqué par Commons comme soumis au droit à l'image (« personality rights ») ;
- refus si une catégorie du fichier évoque une image choquante ou intime (nudité, cadavres, sang, blessés, exécutions…) ;
- refus si l'image représente (« depicts », données structurées de Commons) une personne vivante d'après Wikidata ;
- dans l'Actu, refus de toute personne représentée, morte ou vivante, et des portraits : on montre le lieu, l'institution, l'objet.
Une photo qui passe ces filtres sans données « depicts » est marquée `"review": true` : le contrôle qualité la regarde avant tout.
Un refus pour ces raisons est définitif (`status: "rejected"` et `reason`) : la case est sautée partout.
"""
import html
import io
import json
import re
import sys
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "LeSachoirBot/1.0 (https://gregoirekarydes.github.io/le-sachoir/)"}
# Catégories Commons qui signalent une image choquante, intime ou à éviter dans une BD grand public.
SENSITIVE = re.compile(r"(nud(e|ity)|naked|topless|genital|pornograph|sexual|erotic|corpse|dead bod|cadaver|death of|"
                       r"blood|gore|injur|wound|execution|hanging|lynch|tortur|massacre|atrocit|casualt|suicide|"
                       r"victims of|graphic content|children in|minors)", re.I)
PORTRAIT = re.compile(r"(portrait|headshot|people of|men of|women of|politicians|mugshot|selfie)", re.I)
WIKIDATA = "https://www.wikidata.org/w/api.php"
FREE = re.compile(r"^(cc0|cc[ -]by|cc[ -]by-sa|public domain|pd\b|pd-|attribution|no restrictions)", re.I)


def strip(t: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", t or ""))).strip()


class Refused(ValueError):
    """Refus définitif (droit à l'image, image choquante, personne vivante) : on ne réessaie pas."""


def depicted(pageid) -> list[str]:
    """Éléments Wikidata « représente » (P180) des données structurées du fichier Commons."""
    if not pageid:
        return []
    r = requests.get(API, headers=UA, timeout=20, params={"action": "wbgetentities", "format": "json", "ids": f"M{pageid}"})
    r.raise_for_status()
    ent = next(iter((r.json().get("entities") or {}).values()), {}) or {}
    st = (ent.get("statements") or ent.get("claims") or {}).get("P180", [])
    return [x["mainsnak"]["datavalue"]["value"]["id"] for x in st if x.get("mainsnak", {}).get("datavalue")]


def humans(qids: list[str]) -> list[dict]:
    """Parmi ces éléments Wikidata, les êtres humains, avec « vivant » = pas de date de décès."""
    if not qids:
        return []
    r = requests.get(WIKIDATA, headers=UA, timeout=20, params={"action": "wbgetentities", "format": "json", "ids": "|".join(qids[:40]), "props": "claims|labels", "languages": "fr|en"})
    r.raise_for_status()
    out = []
    for q, ent in (r.json().get("entities") or {}).items():
        cl = ent.get("claims") or {}
        if any(c.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id") == "Q5" for c in cl.get("P31", [])):
            lab = (ent.get("labels", {}).get("fr") or ent.get("labels", {}).get("en") or {}).get("value", q)
            out.append({"id": q, "name": lab, "alive": "P570" not in cl})
    return out


def resolve(name: str, fid: str = "") -> dict:
    r = requests.get(API, headers=UA, timeout=20, params={
        "action": "query", "format": "json", "titles": name, "prop": "imageinfo|categories",
        "iiprop": "url|extmetadata|mime", "iiurlwidth": 1080, "cllimit": "max"})
    r.raise_for_status()
    page = next(iter(r.json()["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise ValueError(f"fichier introuvable sur Commons : {name}")
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})
    lic = strip(meta.get("LicenseShortName", {}).get("value", ""))
    if meta.get("NonFree", {}).get("value") or not FREE.search(lic):
        raise ValueError(f"licence non libre ou inconnue : {lic!r}")
    # Garde-fous sur le contenu
    if "personality" in strip(meta.get("Restrictions", {}).get("value", "")).lower():
        raise Refused("droit à l'image : personne identifiable (marquage Commons « personality rights »)")
    cats = [c.get("title", "") for c in page.get("categories", [])] + [strip(meta.get("Categories", {}).get("value", ""))]
    bad = next((c for c in cats if SENSITIVE.search(c)), None)
    if bad:
        raise Refused(f"image sensible (catégorie « {bad.replace('Category:', '')[:60]} »)")
    if fid == "actu" and any(PORTRAIT.search(c) for c in cats):
        raise Refused("Actu : portrait de personne refusé, montrer le lieu ou l'institution")
    deps = depicted(page.get("pageid"))
    people = humans(deps)
    alive = [h["name"] for h in people if h["alive"]]
    if alive:
        raise Refused(f"personne vivante représentée : {', '.join(alive[:3])}")
    if fid == "actu" and people:
        raise Refused(f"Actu : personne représentée ({', '.join(h['name'] for h in people[:3])}), montrer le lieu ou l'institution")
    return {
        "review": not deps,  # pas de données « représente » : relecture humaine obligatoire
        "url": info.get("thumburl") or info["url"],
        "credit": strip(meta.get("Artist", {}).get("value", ""))[:90] or "Auteur inconnu",
        "license": lic,
        "license_url": meta.get("LicenseUrl", {}).get("value", ""),
        "source": info.get("descriptionurl", ""),
    }


def fetch(case: dict, folder: Path, fid: str = "") -> bool:
    ph = case.setdefault("photo", {})
    if ph.get("status") == "done" and not ph.get("guard") and ph.get("commons"):
        # Photo récupérée avant les garde-fous (9 novembre 2026) : on la repasse aux filtres, sans la retélécharger.
        try:
            meta = resolve(ph["commons"], fid)
            ph.update(guard=1, review=meta["review"])
        except Refused as ex:
            ph.update(status="rejected", reason=str(ex)[:200], guard=1)
            print(f"  ✗ photo retirée {ph.get('commons')} : {ex}")
        except Exception as ex:  # noqa: BLE001 — réseau : on réessaiera au prochain passage
            print(f"  ! contrôle de {ph.get('commons')} remis à plus tard : {ex}")
            return False
        return True
    if ph.get("status") in ("done", "failed", "rejected") or not ph.get("commons"):
        return False
    try:
        meta = resolve(ph["commons"], fid)
        r = requests.get(meta.pop("url"), headers=UA, timeout=40)
        r.raise_for_status()
        im = Image.open(io.BytesIO(r.content)).convert("RGB")
        if im.width > 1080:
            im = im.resize((1080, round(im.height * 1080 / im.width)), Image.LANCZOS)
        name = f"images/photo-{case.get('n', 0)}-{re.sub(r'[^a-z0-9]+', '-', ph['commons'].lower())[5:40].strip('-')}.webp"
        (folder / "images").mkdir(exist_ok=True)
        im.save(folder / name, "WEBP", quality=82)
        ph.update(meta, file=name, status="done", guard=1)
        print(f"  photo : {ph['commons']} ({meta['license']}){' — à relire' if meta['review'] else ''}")
    except Refused as ex:
        ph.update(status="rejected", reason=str(ex)[:200])
        print(f"  ✗ photo refusée {ph.get('commons')} : {ex}")
    except Exception as ex:  # noqa: BLE001
        ph["attempts"] = ph.get("attempts", 0) + 1
        ph["error"] = str(ex)[:200]
        if ph["attempts"] >= 3:
            ph["status"] = "failed"
        print(f"  ! photo {ph.get('commons')} : {ex}")
    return True


def main():
    files = sorted(ROOT.glob("editions/*/edition.json")) + sorted(ROOT.glob("stock/*/*/item.json"))
    n = 0
    for f in files:
        try:
            data = json.loads(f.read_text())
        except ValueError:
            continue
        fmts = data.get("formats") or ([data] if data.get("cases") else [])
        changed = False
        for fmt in fmts:
            for c in fmt.get("cases", []) or []:
                if isinstance(c, dict) and c.get("kind") == "photo":
                    changed |= fetch(c, f.parent, fmt.get("id", ""))
        if changed:
            f.write_text(json.dumps(data, ensure_ascii=False, indent=2))
            n += 1
    print(f"Photos : {n} fichier(s) mis à jour.")


if __name__ == "__main__":
    sys.exit(main())
