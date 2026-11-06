"""Banc d'essai de styles : dessine les mêmes scènes dans plusieurs styles pour choisir celui du Sachoir.

Lit style-tests/request.json, écrit les images dans style-tests/<date>/, puis supprime la demande.
Le style retenu devient le texte "style" de pipeline/style.json, et sa meilleure case peut devenir
pipeline/style_ref.png (référence de style passée à toutes les images).
"""
import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import images as gen  # réutilise l'appel Cloudflare, l'agrandissement et le grain papier

ROOT = Path(__file__).resolve().parent.parent
REQ = ROOT / "style-tests" / "request.json"


def main():
    if not REQ.exists():
        print("Aucune demande de test de style.")
        return
    req = json.loads(REQ.read_text())
    out = ROOT / "style-tests" / datetime.now(ZoneInfo("Europe/Paris")).date().isoformat()
    out.mkdir(parents=True, exist_ok=True)
    results = []
    try:
        for s in req["styles"]:
            for i, scene in enumerate(req["scenes"], 1):
                prompt = f"{s['prompt']} Scene: {scene}. {gen.STYLE['constraints']}"
                im = gen.generate(prompt, gen.STYLE["case_size"], [])
                dest = out / f"{s['id']}-{i}.webp"
                gen.save_webp(im, dest)
                results.append({"style": s["id"], "name": s["name"], "scene": i, "file": dest.name})
                print(f"  {dest.name}")
    except gen.QuotaExhausted as e:
        print(f"Quota atteint : {e}")
    (out / "results.json").write_text(json.dumps({"request": req, "results": results}, ensure_ascii=False, indent=2))
    if len(results) == len(req["styles"]) * len(req["scenes"]):
        REQ.unlink()
    print(f"{len(results)} image(s) de test dans {out.relative_to(ROOT)}")


if __name__ == "__main__":
    if not os.environ.get("CF_API_TOKEN"):
        raise SystemExit("CF_ACCOUNT_ID et CF_API_TOKEN sont requis.")
    main()
