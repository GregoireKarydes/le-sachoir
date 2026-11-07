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


class BudgetReserved(Exception):
    """Le reste du quota du jour est gardé pour l'Actu, écrite au dernier moment."""


# Compteur du quota Cloudflare, remis à zéro chaque jour à 00:00 UTC (1 h ou 2 h à Paris).
QUOTA_FILE = ROOT / "data" / "images-quota.json"
DAILY_BUDGET = STYLE.get("daily_budget", 80)   # images par jour à peu près permises par le quota gratuit
ACTU_RESERVE = STYLE.get("actu_reserve", 15)   # images gardées pour la prochaine Actu tant qu'elle n'est pas dessinée


def quota_state() -> dict:
    day = datetime.now(ZoneInfo("UTC")).date().isoformat()
    try:
        q = json.loads(QUOTA_FILE.read_text())
    except Exception:
        q = {}
    if q.get("day") != day:
        q = {"day": day, "count": 0, "exhausted": False}
    return q


def save_quota(q: dict):
    QUOTA_FILE.parent.mkdir(exist_ok=True)
    QUOTA_FILE.write_text(json.dumps(q, indent=1))


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
    q = quota_state()
    if q.get("exhausted"):
        raise QuotaExhausted("quota du jour déjà épuisé (data/images-quota.json)")
    r = requests.post(URL, headers={"Authorization": f"Bearer {TOKEN}"}, data=data, files=files, timeout=180)
    q["count"] += 1  # un appel refusé ou raté peut aussi consommer : on compte tout
    save_quota(q)
    if r.status_code >= 400:
        # Ne chercher « quota » que dans un message d'erreur : une image base64 peut contenir ces lettres par hasard.
        low = r.text[:2000].lower()
        if r.status_code == 429 or "allocation" in low or "quota" in low or "neuron" in low:
            q["count"] -= 1
            q["exhausted"] = True
            save_quota(q)
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


def ink(im: Image.Image, cfg: dict | None = None) -> Image.Image:
    """Rend l'image « encrée » : quelques couleurs plates, noir pur, blanc pur, un seul gris.

    Supprime les dégradés et ombrages que le modèle ajoute, puis épaissit un peu le trait.
    """
    cfg = cfg if cfg is not None else STYLE.get("ink")
    if not cfg:
        return im
    # Garde-fou : une image très colorée (hors style) serait abîmée par la réduction ; on la laisse telle quelle.
    hsv = im.resize((128, 128)).convert("HSV")
    colourful = sum(1 for _, s, v in hsv.getdata() if s > 90 and v > 60) / (128 * 128)
    if colourful > cfg.get("max_colour_share", 0.2):
        return im
    im = im.filter(ImageFilter.MedianFilter(3))  # enlève le grain avant de réduire les couleurs
    q = im.quantize(colors=cfg.get("colors", 8), method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()[: 3 * 256]
    grey = cfg.get("grey", 200)
    for i in range(0, len(pal), 3):
        r, g, b = pal[i:i + 3]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        sat = max(r, g, b) - min(r, g, b)
        pink = r - g > 50 and b - g > 0  # joues roses : on les garde
        if max(r, g, b) < cfg.get("black_below", 80):  # noir (un rouge foncé reste rouge)
            pal[i:i + 3] = [0, 0, 0]
        elif sat <= cfg.get("grey_max_saturation", 36):  # couleur neutre : blanc ou un seul gris
            v = 255 if lum > cfg.get("white_above", 205) else grey
            pal[i:i + 3] = [v, v, v]
        elif lum > 180 and sat < 90 and not pink:  # teintes pâles (peau, papier crème) : blanc
            pal[i:i + 3] = [255, 255, 255]
    q.putpalette(pal)
    out = q.convert("RGB")
    for _ in range(cfg.get("thicken", 0)):
        out = out.filter(ImageFilter.MinFilter(3))
    return out


def save_webp(im: Image.Image, dest: Path):
    raw = im
    im = ink(im)
    k = STYLE["upscale"]
    if k and k > 1:
        im = im.resize((im.width * k, im.height * k), Image.LANCZOS)
        if im is raw:  # pas d'encrage : on garde l'ancien renforcement du trait
            im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    im = paper(im, STYLE.get("paper_texture", 0))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=STYLE["webp_quality"], method=6)


def build(scene: str, cast: list[tuple[str, Path]]) -> tuple[str, list[Path]]:
    """Prompt et références. La référence de style est toujours l'image 0, puis une fiche par personnage."""
    refs, who = [], []
    if STYLE_REF.exists():
        refs.append(STYLE_REF)
    for look, sheet in cast:
        if sheet and sheet.exists() and len(refs) < 4:
            who.append(f"image {len(refs)} shows {look}")
            refs.append(sheet)
        else:
            who.append(look)
    head = STYLE["style_with_ref"] + " " if STYLE_REF.exists() else ""
    chars = (" Characters, same faces, hair and clothes as their reference: " + "; ".join(who) + ".") if who else ""
    return f"Scene: {scene}.{chars} {head}{STYLE['style']} {STYLE['constraints']}", refs


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


def next_actu_date() -> date:
    """Date de la prochaine édition à publier : aujourd'hui avant 5 h (Paris), demain ensuite."""
    now = datetime.now(ZoneInfo("Europe/Paris"))
    return now.date() if now.hour < 5 else now.date() + timedelta(days=1)


def next_actu_drawn() -> bool:
    f = EDITIONS / next_actu_date().isoformat() / "edition.json"
    try:
        ed = json.loads(f.read_text())
    except Exception:
        return False
    for fmt in ed.get("formats", []):
        if fmt.get("id") == "actu":
            imgs = [c["image"] for c in fmt.get("cases", []) if c.get("image")] + ([fmt["cover"]] if fmt.get("cover") else [])
            return all(i.get("status") in ("done", "failed") for i in imgs)
    return False


def check_budget(fmt: dict):
    """L'Actu passe toujours ; le stock s'arrête avant la réserve tant que la prochaine Actu n'est pas dessinée."""
    if fmt.get("id") == "actu":
        return
    reserve = 0 if next_actu_drawn() else ACTU_RESERVE
    if quota_state()["count"] >= DAILY_BUDGET - reserve:
        raise BudgetReserved(f"{quota_state()['count']} images aujourd'hui, {reserve} gardées pour l'Actu")


def process(d: Path, f: Path, ed: dict, only_actu: bool = False) -> int:
    done = 0
    max_att = STYLE["max_attempts"]

    def persist():
        f.write_text(json.dumps(ed, ensure_ascii=False, indent=2))

    for fmt in ed.get("formats", []):
        if (fmt.get("id") == "actu") != only_actu:
            continue
        looks = {c["id"]: c.get("look", c["id"]) for c in fmt.get("cast", [])}
        sheets = {c["id"]: d / c["file"] for c in fmt.get("cast", [])}

        # 1. Fiches casting
        for c in fmt.get("cast", []):
            if c.get("status") == "done" and (d / c["file"]).exists():
                continue
            head = STYLE["style_with_ref"] + " " if STYLE_REF.exists() else ""
            prompt = (f"Character reference portrait: one single character, head and upper body, facing the viewer, "
                      f"plain white background, of {c.get('look', c['id'])}. {head}{STYLE['style']} "
                      f"One image only, no panel borders. Wordless picture: no text, no lettering.")
            check_budget(fmt)
            try:
                im = generate(prompt, STYLE["cast_size"], [STYLE_REF])
                im = ink(im)
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
            prompt, refs = build(img["prompt"], [(looks[c], sheets.get(c)) for c in cast if c in looks])
            check_budget(fmt)
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
        # 1. L'Actu d'abord (écrite au dernier moment, elle ne doit jamais manquer de quota),
        for d, f, ed in editions_to_process():
            total += process(d, f, ed, only_actu=True)
        # 2. puis le stock, du plus proche au plus lointain, sans entamer la réserve de l'Actu.
        for d, f, ed in editions_to_process():
            print(f"Édition {d.name}")
            total += process(d, f, ed)
    except BudgetReserved as e:
        print(f"Stock en pause : {e}.")
        log.append(f"réserve: {e}")
    except QuotaExhausted as e:
        print(f"Quota Cloudflare du jour atteint, reprise au prochain passage. ({e})")
        log.append(f"quota: {e}")
    except Exception as e:  # ne jamais perdre les images déjà faites : on journalise et on sort proprement
        print(f"Erreur inattendue : {e!r}")
        log.append(f"erreur: {e!r}"[:400])
    save_quota(quota_state())  # toujours présent pour le commit du workflow
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "images-last-run.json").write_text(json.dumps(
        {"at": datetime.now(ZoneInfo("Europe/Paris")).isoformat(), "generated": total, "log": log}, ensure_ascii=False, indent=1))
    print(f"{total} image(s) générée(s).")


if __name__ == "__main__":
    main()
