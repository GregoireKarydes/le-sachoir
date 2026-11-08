"""Cases photo : télécharge les vraies images choisies sur Wikimedia Commons et note leur source.

Une case `{"kind": "photo", "title", "text", "photo": {"commons": "File:…"}}` est écrite par les tâches Claude.
Ce script (lancé par le workflow Images) demande à l'API Commons l'adresse, l'auteur et la licence du fichier,
refuse les licences non libres, enregistre une version de 1080 px de large en WebP à côté de la BD
et remplit `photo.file`, `credit`, `license`, `license_url`, `source`, `status: "done"`.
Après 3 échecs : `status: "failed"`, la case est alors simplement sautée par l'appli et les pages publiques.
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
FREE = re.compile(r"^(cc0|cc[ -]by|cc[ -]by-sa|public domain|pd\b|pd-|attribution|no restrictions)", re.I)


def strip(t: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", t or ""))).strip()


def resolve(name: str) -> dict:
    r = requests.get(API, headers=UA, timeout=20, params={
        "action": "query", "format": "json", "titles": name, "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime", "iiurlwidth": 1080})
    r.raise_for_status()
    page = next(iter(r.json()["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise ValueError(f"fichier introuvable sur Commons : {name}")
    info = page["imageinfo"][0]
    meta = info.get("extmetadata", {})
    lic = strip(meta.get("LicenseShortName", {}).get("value", ""))
    if meta.get("NonFree", {}).get("value") or not FREE.search(lic):
        raise ValueError(f"licence non libre ou inconnue : {lic!r}")
    return {
        "url": info.get("thumburl") or info["url"],
        "credit": strip(meta.get("Artist", {}).get("value", ""))[:90] or "Auteur inconnu",
        "license": lic,
        "license_url": meta.get("LicenseUrl", {}).get("value", ""),
        "source": info.get("descriptionurl", ""),
    }


def fetch(case: dict, folder: Path) -> bool:
    ph = case.setdefault("photo", {})
    if ph.get("status") in ("done", "failed") or not ph.get("commons"):
        return False
    try:
        meta = resolve(ph["commons"])
        r = requests.get(meta.pop("url"), headers=UA, timeout=40)
        r.raise_for_status()
        im = Image.open(io.BytesIO(r.content)).convert("RGB")
        if im.width > 1080:
            im = im.resize((1080, round(im.height * 1080 / im.width)), Image.LANCZOS)
        name = f"images/photo-{case.get('n', 0)}-{re.sub(r'[^a-z0-9]+', '-', ph['commons'].lower())[5:40].strip('-')}.webp"
        (folder / "images").mkdir(exist_ok=True)
        im.save(folder / name, "WEBP", quality=82)
        ph.update(meta, file=name, status="done")
        print(f"  photo : {ph['commons']} ({meta['license']})")
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
                    changed |= fetch(c, f.parent)
        if changed:
            f.write_text(json.dumps(data, ensure_ascii=False, indent=2))
            n += 1
    print(f"Photos : {n} fichier(s) mis à jour.")


if __name__ == "__main__":
    sys.exit(main())
