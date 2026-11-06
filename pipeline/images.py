"""Génère les images manquantes des éditions avec Cloudflare Workers AI (FLUX.2 klein 4B).

Pour chaque édition non publiée (et celle du jour) :
  1. les fiches casting (portraits 512x512) servent ensuite de références ;
  2. la couverture de chaque format ;
  3. les cases dont l'image est "pending" ou "retry".

Le script s'arrête proprement quand le quota quotidien est épuisé :
les images restantes restent "pending" et seront faites au prochain passage.

Variables d'environnement : CF_ACCOUNT_ID, CF_API_TOKEN.
"""
import base64
import io
import json
import os
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "editions"
STYLE = json.loads((Path(__file__).parent / "style.json").read_text())
STYLE_REF = ROOT / "pipeline" / "style_ref.png"  # facultatif : une case validée qui fixe le style

ACCOUNT = os.environ.get("CF_ACCOUNT_ID")
TOKEN = os.environ.get("CF_API_TOKEN")
URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/{STYLE['model']}"


class QuotaExhausted(Exception):
    pass


def ref_bytes(path: Path) -> bytes:
    """Les images de référence doivent faire moins de 512x512."""
    im = Image.open(path).convert("RGB")
    im.thumbnail((448, 448))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def generate(prompt: str, size, refs: list[Path]) -> Image.Image:
    files = {}
    for i, ref in enumerate([r for r in refs if r.exists()][:4]):
        files[f"input_image_{i}"] = (f"ref{i}.png", ref_bytes(ref), "image/png")
    data = {
        "prompt": prompt,
        "width": str(size[0]),
        "height": str(size[1]),
        "guidance": str(STYLE["guidance"]),
    }
    # requests envoie en multipart dès qu'il y a des fichiers ; on force le multipart sinon.
    if not files:
        files = {k: (None, v) for k, v in data.items()}
        data = None
    r = requests.post(URL, headers={"Authorization": f"Bearer {TOKEN}"}, data=data, files=files, timeout=180)
    if r.status_code >= 400:
        # Ne chercher « quota » que dans un message d'erreur : une image base64 peut contenir ces lettres par hasard.
        low = r.text[:2000].lower()
        if r.status_code == 429 or "allocation" in low or "quota" in low or "neuron" in low:
            raise QuotaExhausted(r.text[:300])
        raise RuntimeError(f"HTTP {r.status_code} : {r.text[:250]}")
    payload = r.json()
    b64 = (payload.get("result") or {}).get("image")
    if not b64:
        raise RuntimeError(f"Réponse sans image : {str(payload)[:300]}")
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


def paper(im: Image.Image, strength: float) -> Image.Image:
    """Ajoute un grain de papier chaud, pour l'effet « dessiné et imprimé à la main »."""
    if not strength:
        return im
    w, h = im.size
    grain = Image.effect_noise((w // 2, h // 2), 40).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(0.8))
    fibres = Image.effect_noise((w // 8, h // 8), 25).resize((w, h), Image.BICUBIC)
    tex = Image.blend(grain, fibres, 0.5).convert("RGB")
    warm = Image.new("RGB", (w, h), (247, 238, 220))
    tex = ImageChops.multiply(tex.point(lambda v: 160 + v * 95 // 255), warm)
    return Image.blend(im, ImageChops.multiply(im, tex), strength * 2.5)


def save_webp(im: Image.Image, dest: Path):
    k = STYLE["upscale"]
    if k and k > 1:
        im = im.resize((im.width * k, im.height * k), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    im = paper(im, STYLE.get("paper_texture", 0))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=STYLE["webp_quality"], method=6)


def full_prompt(scene: str, cast_looks: list[str]) -> str:
    who = (" Characters (match the reference images): " + "; ".join(cast_looks) + ".") if cast_looks else ""
    return f"{STYLE['style']} Scene: {scene}.{who} {STYLE['constraints']}"


def editions_to_process():
    today = datetime.now(ZoneInfo("Europe/Paris")).date()
    # Priorité : l'édition du jour, puis le stock le plus proche ; la démo passe en dernier.
    dirs = [d for d in EDITIONS.iterdir() if d.is_dir()]
    def demo(d):
        try:
            return bool(json.loads((d / "edition.json").read_text()).get("demo"))
        except Exception:
            return False
    for d in sorted(dirs, key=lambda d: (demo(d), d.name)):
        f = d / "edition.json"
        if not f.exists():
            continue
        try:
            day = date.fromisoformat(d.name)
        except ValueError:
            continue
        ed = json.loads(f.read_text())
        # On traite l'édition du jour (Actu tardive, régénérations) et le stock à venir.
        if day < today and not ed.get("demo"):
            continue
        yield d, f, ed


def process(d: Path, f: Path, ed: dict) -> int:
    done = 0
    max_att = STYLE["max_attempts"]

    def persist():
        f.write_text(json.dumps(ed, ensure_ascii=False, indent=2))

    for fmt in ed.get("formats", []):
        looks = {c["id"]: c.get("look", c["id"]) for c in fmt.get("cast", [])}
        sheets = {c["id"]: d / c["file"] for c in fmt.get("cast", [])}

        # 1. Fiches casting
        for c in fmt.get("cast", []):
            if c.get("status") == "done" and (d / c["file"]).exists():
                continue
            prompt = (f"{STYLE['style']} Character reference portrait: one single head-and-shoulders portrait, facing the viewer, "
                      f"plain light cream background, of {c.get('look', c['id'])}. One image only, no panels, no frames, "
                      f"absolutely no text, no letters, no speech bubbles.")
            try:
                im = generate(prompt, STYLE["cast_size"], [STYLE_REF])
            except QuotaExhausted:
                raise
            except Exception as e:
                print(f"  ! fiche {c['id']} : {e}")
                c["error"] = str(e)[:300]
                persist()
                continue
            c.pop("error", None)
            dest = d / c["file"]
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.save(dest, "PNG")
            c["status"] = "done"
            done += 1
            persist()
            print(f"  fiche {fmt['id']}/{c['id']}")

        # 2. Couverture puis 3. cases
        jobs = []
        if fmt.get("cover"):
            jobs.append((fmt["cover"], STYLE["cover_size"]))
        jobs += [(case["image"], STYLE["case_size"]) for case in fmt.get("cases", []) if case.get("image")]
        for img, size in jobs:
            if img.get("status") not in ("pending", "retry", None):
                continue
            if img.get("attempts", 0) >= max_att:
                img["status"] = "failed"
                persist()
                continue
            cast = img.get("cast", [])
            refs = [sheets[c] for c in cast if c in sheets][:3] + [STYLE_REF]
            prompt = full_prompt(img["prompt"], [looks[c] for c in cast if c in looks])
            img["attempts"] = img.get("attempts", 0) + 1
            try:
                im = generate(prompt, size, refs)
            except QuotaExhausted:
                img["attempts"] -= 1
                persist()
                raise
            except Exception as e:  # une image ratée ne bloque pas les autres
                print(f"  ! {img['file']} : {e}")
                img["error"] = str(e)[:300]
                img["status"] = "pending" if img["attempts"] < max_att else "failed"
                persist()
                continue
            save_webp(im, d / img["file"])
            img["status"] = "done"
            img.pop("qa", None)
            img.pop("error", None)
            done += 1
            persist()
            print(f"  image {img['file']}")
            time.sleep(0.5)
    return done


def main():
    if not ACCOUNT or not TOKEN:
        sys.exit("CF_ACCOUNT_ID et CF_API_TOKEN sont requis (secrets GitHub).")
    total = 0
    log = []
    try:
        for d, f, ed in editions_to_process():
            print(f"Édition {d.name}")
            total += process(d, f, ed)
    except QuotaExhausted as e:
        print(f"Quota Cloudflare du jour atteint, reprise au prochain passage. ({e})")
        log.append(f"quota: {e}")
    except Exception as e:  # ne jamais perdre les images déjà faites : on journalise et on sort proprement
        print(f"Erreur inattendue : {e!r}")
        log.append(f"erreur: {e!r}"[:400])
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "images-last-run.json").write_text(json.dumps(
        {"at": datetime.now(ZoneInfo("Europe/Paris")).isoformat(), "generated": total, "log": log}, ensure_ascii=False, indent=1))
    print(f"{total} image(s) générée(s).")


if __name__ == "__main__":
    main()
