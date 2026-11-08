"""Génère les images manquantes des éditions avec Cloudflare Workers AI (FLUX.2 klein 4B).

Ordre de travail (8 novembre 2026 : finir une BD avant d'en commencer une autre) :
  1. l'Actu de la prochaine édition ;
  2. les BD encore incomplètes des éditions du jour et des deux jours précédents ;
  3. la file d'attente `stock/` (voir stock.py) : on prend le type qui a le moins de BD finies et, dans ce type,
     la plus ancienne BD pas finie, qu'on termine à 100 % avant de passer à la suivante ;
  (1 bis : les images à refaire de l'édition à venir et de la prochaine BD finie de chaque type passent juste après l'Actu)
  4. quand chaque type a assez de BD finies d'avance (`stock_target` dans style.json), les images que le contrôle
     qualité veut refaire (`"redo": true`) : l'ancienne image reste publiée tant que la nouvelle n'est pas faite ;
  5. puis on continue de remplir la file.
Dans chaque BD : fiches casting (références), couverture, puis les cases "pending".

Le script s'arrête proprement quand le quota quotidien est épuisé :
les images restantes restent "pending" et seront faites au prochain passage.

Renfort payant fal.ai (même modèle FLUX.2 klein 4B) : seulement quand le budget gratuit Cloudflare du jour
est atteint, seulement pour les deux prochaines éditions à publier, et dans la limite de plafonds en dollars
(`fal_daily_usd`, `fal_monthly_usd` dans style.json, suivis dans data/images-fal.json). Crédits prépayés sans recharge.

Variables d'environnement : CF_ACCOUNT_ID, CF_API_TOKEN, et facultatif FAL_KEY.
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stock  # noqa: E402
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
EDITIONS = ROOT / "editions"
STYLE = json.loads((Path(__file__).parent / "style.json").read_text())
STYLE_REF = ROOT / "pipeline" / "style_ref.png"  # facultatif : une case validée qui fixe le style

ACCOUNT = os.environ.get("CF_ACCOUNT_ID")
TOKEN = os.environ.get("CF_API_TOKEN")
URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/ai/run/{STYLE['model']}"
FAL_KEY = os.environ.get("FAL_KEY")
FAL_URL = "https://fal.run/" + STYLE.get("fal_model", "fal-ai/flux-2/klein/4b/edit")
FAL_FILE = ROOT / "data" / "images-fal.json"
FAL_DAILY = STYLE.get("fal_daily_usd", 0.40)
FAL_MONTHLY = STYLE.get("fal_monthly_usd", 9.0)
FAL_PRICE_MP = STYLE.get("fal_usd_per_mp", 0.01)    # prix public : 0,01 $ par mégapixel
FAL_DAYS_AHEAD = STYLE.get("fal_days_ahead", 1)       # 0 = prochaine édition seulement, 1 = et la suivante


class QuotaExhausted(Exception):
    pass


class BudgetReserved(Exception):
    """Le reste du quota du jour est gardé pour l'Actu, écrite au dernier moment."""


# Compteur du quota Cloudflare, remis à zéro chaque jour à 00:00 UTC (1 h ou 2 h à Paris).
# Le quota gratuit se compte en neurones (10 000 par jour). Mesure du 7 novembre 2026 : 80 appels = 14,3k neurones,
# soit environ 180 par appel en moyenne : le budget est donc tenu en neurones estimés, avec une marge sous 10 000.
QUOTA_FILE = ROOT / "data" / "images-quota.json"
NEURON_BUDGET = STYLE.get("neuron_budget", 9000)          # neurones estimés permis par jour (marge sous 10 000)
NEURON_COST = STYLE.get("neuron_cost", {"case": 200, "cover": 200, "cast": 80})  # coût estimé d'un appel, par type
ACTU_RESERVE = STYLE.get("actu_reserve_neurons", 2600)    # gardés pour la prochaine Actu tant qu'elle n'est pas dessinée


def quota_state() -> dict:
    day = datetime.now(ZoneInfo("UTC")).date().isoformat()
    try:
        q = json.loads(QUOTA_FILE.read_text())
    except Exception:
        q = {}
    if q.get("day") != day:
        q = {"day": day, "count": 0, "neurons": 0, "exhausted": False}
    q.setdefault("neurons", q.get("count", 0) * 180)  # ancien fichier sans neurones : estimation moyenne
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


def generate(prompt: str, size, refs: list[Path], kind: str = "case") -> Image.Image:
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
        # Un refus peut être passager (7 novembre : refus « allocation used up » avec 0 neurone compté).
        # On retente un appel au plus toutes les 2 h au lieu de bloquer toute la journée.
        since = q.get("exhausted_at")
        try:
            stale = since is None or datetime.now(ZoneInfo("UTC")) - datetime.fromisoformat(since) >= timedelta(hours=2)
        except ValueError:
            stale = True
        if not stale:
            raise QuotaExhausted("quota du jour déjà épuisé (data/images-quota.json)")
        q["exhausted"] = False
        save_quota(q)
    r = requests.post(URL, headers={"Authorization": f"Bearer {TOKEN}"}, data=data, files=files, timeout=180)
    cost = NEURON_COST.get(kind, 200)
    q["count"] += 1  # un appel refusé ou raté peut aussi consommer : on compte tout
    q["neurons"] += cost
    q.setdefault("by_kind", {})[kind] = q.get("by_kind", {}).get(kind, 0) + 1
    save_quota(q)
    if r.status_code >= 400:
        # Ne chercher « quota » que dans un message d'erreur : une image base64 peut contenir ces lettres par hasard.
        low = r.text[:2000].lower()
        if r.status_code == 429 or "allocation" in low or "quota" in low or "neuron" in low:
            q["count"] -= 1
            q["neurons"] -= cost
            q["by_kind"][kind] -= 1
            q["exhausted"] = True
            q["exhausted_at"] = datetime.now(ZoneInfo("UTC")).isoformat()
            save_quota(q)
            raise QuotaExhausted(r.text[:300])
        raise RuntimeError(f"HTTP {r.status_code} : {r.text[:250]}")
    payload = r.json()
    b64 = (payload.get("result") or {}).get("image")
    if not b64:
        raise RuntimeError(f"Réponse sans image : {str(payload)[:300]}")
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


class FalUnavailable(Exception):
    """Pas de renfort payant possible (pas de clé, plafond atteint, crédit épuisé, date trop lointaine)."""


def fal_state() -> dict:
    now = datetime.now(ZoneInfo("Europe/Paris"))
    try:
        st = json.loads(FAL_FILE.read_text())
    except Exception:
        st = {}
    if st.get("month") != now.strftime("%Y-%m"):
        st = {"month": now.strftime("%Y-%m"), "spent": 0.0, "images": 0, "days": {}}
    st.setdefault("days", {})
    st.setdefault("blocked", None)
    return st


def save_fal(st: dict):
    FAL_FILE.parent.mkdir(exist_ok=True)
    FAL_FILE.write_text(json.dumps(st, indent=1))


def fal_cost(size, refs: list[Path]) -> float:
    """Estimation prudente : sortie + images de référence, à 0,01 $ le mégapixel."""
    mp = size[0] * size[1] / 1e6
    for r in refs:
        try:
            w, h = Image.open(r).size
            k = min(1.0, 448 / max(w, h))  # ref_bytes réduit à 448 px
            mp += w * h * k * k / 1e6
        except Exception:
            mp += 0.2
    return round(mp * FAL_PRICE_MP, 5)


def fal_eligible(day: date) -> bool:
    return day <= next_actu_date() + timedelta(days=FAL_DAYS_AHEAD)


def fal_generate(prompt: str, size, refs: list[Path]) -> Image.Image:
    if not FAL_KEY:
        raise FalUnavailable("pas de clé FAL_KEY")
    st = fal_state()
    today = datetime.now(ZoneInfo("Europe/Paris")).date().isoformat()
    if st.get("blocked") == today:
        raise FalUnavailable("fal.ai a refusé plus tôt aujourd'hui (crédit épuisé ?)")
    cost = fal_cost(size, refs)
    day_spent = st["days"].get(today, 0.0)
    if day_spent + cost > FAL_DAILY:
        raise FalUnavailable(f"plafond du jour atteint ({day_spent:.2f} $ / {FAL_DAILY:.2f} $)")
    if st["spent"] + cost > FAL_MONTHLY:
        raise FalUnavailable(f"plafond du mois atteint ({st['spent']:.2f} $ / {FAL_MONTHLY:.2f} $)")
    urls = ["data:image/png;base64," + base64.b64encode(ref_bytes(r)).decode() for r in refs if r.exists()][:4]
    if not urls:  # le mode « edit » demande au moins une image : la référence de style est toujours là en pratique
        raise FalUnavailable("aucune image de référence")
    body = {"prompt": prompt, "image_urls": urls, "image_size": {"width": size[0], "height": size[1]},
            "num_inference_steps": 4, "output_format": "png", "sync_mode": True, "num_images": 1}
    r = requests.post(FAL_URL, headers={"Authorization": f"Key {FAL_KEY}", "Content-Type": "application/json"},
                      json=body, timeout=180)
    # On compte la dépense dès l'appel (un appel raté peut être facturé) : estimation prudente.
    st["spent"] = round(st["spent"] + cost, 5)
    st["days"][today] = round(day_spent + cost, 5)
    st["images"] += 1
    low = r.text[:500].lower() if r.status_code >= 400 else ""  # une image base64 peut contenir ces lettres
    if r.status_code in (401, 402, 403) or "balance" in low or "credit" in low:
        st["spent"] = round(st["spent"] - cost, 5)
        st["days"][today] = round(day_spent, 5)
        st["images"] -= 1
        st["blocked"] = today
        save_fal(st)
        raise FalUnavailable(f"fal.ai refuse ({r.status_code}) : {r.text[:200]}")
    save_fal(st)
    if r.status_code >= 400:
        raise RuntimeError(f"fal HTTP {r.status_code} : {r.text[:250]}")
    url = ((r.json().get("images") or [{}])[0]).get("url", "")
    if url.startswith("data:"):
        raw = base64.b64decode(url.split(",", 1)[1])
    elif url:
        raw = requests.get(url, timeout=60).content
    else:
        raise RuntimeError(f"fal : réponse sans image {r.text[:200]}")
    return Image.open(io.BytesIO(raw)).convert("RGB")


CF_BLOCKED = None  # raison du blocage Cloudflare pour ce passage (budget gratuit atteint ou refus)


def draw(fmt: dict, day: date, prompt: str, size, refs: list[Path], kind: str) -> tuple[Image.Image, str]:
    """Cloudflare gratuit d'abord ; fal.ai en renfort pour les éditions proches. Renvoie (image, fournisseur)."""
    global CF_BLOCKED
    if not CF_BLOCKED:
        try:
            check_budget(fmt, kind)   # BudgetReserved remonte : le stock attend sans payer
            return generate(prompt, size, refs, kind), "cloudflare"
        except QuotaExhausted as e:
            CF_BLOCKED = str(e)
            print(f"  Cloudflare arrêté pour aujourd'hui : {e}")
    if not fal_eligible(day):
        raise QuotaExhausted(f"{CF_BLOCKED} ; {day} trop lointaine pour le renfort payant")
    try:
        return fal_generate(prompt, size, refs), "fal"
    except FalUnavailable as e:
        raise QuotaExhausted(f"{CF_BLOCKED} ; renfort fal.ai indisponible : {e}")


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
    orig = list(pal)
    grey = cfg.get("grey", 200)
    for i in range(0, len(pal), 3):
        r, g, b = pal[i:i + 3]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        sat = max(r, g, b) - min(r, g, b)
        pink = r - g > 50 and b - g > 0  # joues roses : on les garde
        if max(r, g, b) < cfg.get("black_below", 80):  # noir (un rouge foncé reste rouge)
            pal[i:i + 3] = [0, 0, 0]
        elif sat <= cfg.get("grey_max_saturation", 36):  # couleur neutre : noir, blanc ou un seul gris
            # Un trait dessiné en gris foncé reste un trait : il passe en noir, pas en gris clair
            # (bug du 7 novembre : une image aux traits gris sortait entièrement délavée).
            v = 0 if lum < cfg.get("line_below", 140) else 255 if lum > cfg.get("white_above", 205) else grey
            pal[i:i + 3] = [v, v, v]
        elif lum > 180 and sat < 90 and not pink:  # teintes pâles (peau, papier crème) : blanc
            pal[i:i + 3] = [255, 255, 255]
    # Garde-fou : s'il ne reste aucun noir, la couleur neutre la plus sombre devient le trait.
    used = {c for _, c in q.getcolors(256) or []}
    if used and not any(pal[3 * c:3 * c + 3] == [0, 0, 0] for c in used):
        darkest = min(used, key=lambda c: sum(orig[3 * c:3 * c + 3]))
        pal[3 * darkest:3 * darkest + 3] = [0, 0, 0]
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
        if im is raw and STYLE.get("sharpen"):  # renforcement du trait, désactivé avec l'encrage le 7 novembre
            im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    im = paper(im, STYLE.get("paper_texture", 0))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=STYLE["webp_quality"], method=6)


def _clean(t) -> str:
    return " ".join(str(t or "").split()).rstrip(". ")


def story_context(fmt: dict) -> str:
    """Le cadre commun à toutes les images d'une BD (champ `art`), pour des cases cohérentes entre elles."""
    art = fmt.get("art") or {}
    bits = []
    if art.get("subject"):
        bits.append(f"The strip tells {_clean(art['subject'])}")
    if art.get("setting"):
        bits.append(f"setting: {_clean(art['setting'])}")
    if art.get("era"):
        bits.append(f"period: {_clean(art['era'])}, with clothes, objects and places of that period unless a joke says otherwise")
    return (" " + "; ".join(bits) + ".") if bits else ""


def props_for(fmt: dict, scene: str) -> str:
    """Objets récurrents décrits une fois pour toutes (`art.props`), rappelés quand la case les montre."""
    props = (fmt.get("art") or {}).get("props") or {}
    low = (scene or "").lower()
    used = [f"the {k} is {_clean(v)}" for k, v in props.items() if k and k.lower() in low]
    return (" Recurring objects, drawn exactly the same in every panel: " + "; ".join(used) + ".") if used else ""


def build(scene: str, cast: list[tuple], fmt: dict | None = None, prev: Path | None = None,
          panel: tuple[int, int] | None = None) -> tuple[str, list[Path]]:
    """Prompt et références. La référence de style est toujours l'image 0, puis une fiche par personnage,
    puis, s'il reste une place, la case précédente de la même BD (continuité : mêmes personnages, même lieu).

    `cast` : (look, fiche) ou (look, fiche, rôle). `panel` : (numéro de la case, nombre de cases dessinées)."""
    fmt = fmt or {}
    refs, who = [], []
    if STYLE_REF.exists():
        refs.append(STYLE_REF)
    for entry in cast:
        look, sheet = entry[0], entry[1]
        role = _clean(entry[2]) if len(entry) > 2 and entry[2] else ""
        desc = _clean(look) + (f" ({role})" if role else "")
        if sheet and sheet.exists() and len(refs) < 4:
            who.append(f"image {len(refs)} shows {desc}")
            refs.append(sheet)
        else:
            who.append(desc)
    head = STYLE["style_with_ref"] + " " if STYLE_REF.exists() else ""
    if len(who) >= 2:
        # 8 novembre 2026 : des personnages d'une même BD se ressemblaient ; on insiste sur ce qui les distingue.
        chars = (f" {len(who)} clearly different characters, never alike, each with their own height, body shape, "
                 "hairstyle, clothes and accessory: " + "; ".join(who) + ".")
    elif who:
        chars = " Character, as in the reference: " + who[0] + "."
    else:
        chars = ""
    where = f"Panel {panel[0]} of {panel[1]} of the same comic strip. " if panel else ""
    cont = ""
    if prev is not None and prev.exists() and len(refs) < 4:
        cont = (f" Image {len(refs)} is the previous panel: keep the same character designs and, if the place is the same, "
                f"the same room and props, but draw the new moment with a new pose and framing; do not copy image {len(refs)}.")
        refs.append(prev)
    logic = " Everything must make sense for this moment of the story: right people, right objects, right place, nothing random."
    # Les consignes impératives (pas de texte, haut libre) passent avant le style : jamais coupées si le prompt est long.
    return (f"{where}Scene: {_clean(scene)}.{story_context(fmt)}{chars}{props_for(fmt, scene)}{cont}{logic} "
            f"{STYLE['constraints']} {head}{STYLE['style']}"), refs


def editions_to_process():
    today = datetime.now(ZoneInfo("Europe/Paris")).date()
    # Priorité : l'édition du jour, puis le stock le plus proche ; la démo passe en dernier.
    dirs = [d for d in EDITIONS.iterdir() if d.is_dir()]
    def demo(d):
        try:
            return bool(json.loads((d / "edition.json").read_text()).get("demo"))
        except Exception:
            return False
    def past(d):
        return d.name < today.isoformat()
    # Ordre : aujourd'hui et le stock à venir, puis les 2 derniers jours (images ratées à refaire), puis la démo.
    for d in sorted(dirs, key=lambda d: (demo(d), past(d), d.name)):
        f = d / "edition.json"
        if not f.exists():
            continue
        try:
            day = date.fromisoformat(d.name)
        except ValueError:
            continue
        ed = json.loads(f.read_text())
        # On traite l'édition du jour (Actu tardive, régénérations), le stock à venir
        # et les deux jours précédents, pour que leurs formats incomplets finissent par paraître.
        if day < today - timedelta(days=2) and not ed.get("demo"):
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


class BudgetReached(QuotaExhausted):
    """Plafond quotidien de neurones atteint : on s'arrête avant que Cloudflare ne refuse (ou ne facture)."""


def check_budget(fmt: dict, kind: str = "case"):
    """Plafond strict pour tout le monde ; le stock s'arrête en plus avant la réserve de l'Actu."""
    q = quota_state()
    cost = NEURON_COST.get(kind, 200)
    if q["neurons"] + cost > NEURON_BUDGET:
        raise BudgetReached(f"{q['neurons']} neurones estimés aujourd'hui (plafond {NEURON_BUDGET})")
    if fmt.get("id") == "actu":
        return
    reserve = 0 if next_actu_drawn() else ACTU_RESERVE
    if q["neurons"] + cost > NEURON_BUDGET - reserve:
        raise BudgetReserved(f"{q['neurons']} neurones estimés aujourd'hui, {reserve} gardés pour l'Actu")


def uses(fmt: dict) -> dict:
    """Nombre d'images (cases + couverture) où apparaît chaque personnage du casting."""
    n = {}
    imgs = [c["image"] for c in fmt.get("cases", []) if c.get("image")] + ([fmt["cover"]] if fmt.get("cover") else [])
    for img in imgs:
        for cid in img.get("cast", []):
            n[cid] = n.get(cid, 0) + 1
    return n


def process(d: Path, f: Path, ed: dict, only_actu: bool = False, day: date | None = None, redo: bool = False) -> int:
    """Dessine ce qui manque. `day` : date qui décide du renfort payant (date.max = jamais).
    `redo` : refait seulement les images marquées « redo » par le contrôle qualité (l'ancienne reste en ligne)."""
    done = 0
    max_att = STYLE["max_attempts"]
    if day is None:
        try:
            day = date.fromisoformat(d.name)
        except ValueError:
            day = date.max  # démo : jamais de renfort payant
    if redo:
        day = date.max  # jamais de dépense payante pour refaire une image déjà publiable

    def persist():
        f.write_text(json.dumps(ed, ensure_ascii=False, indent=2))

    for fmt in ed.get("formats", []):
        if (fmt.get("id") == "actu") != only_actu:
            continue
        if stock.normalize(fmt, d):
            persist()
        looks = {c["id"]: c.get("look", c["id"]) for c in fmt.get("cast", [])}
        roles = {c["id"]: c.get("role", "") for c in fmt.get("cast", [])}
        sheets = {c["id"]: d / c["file"] for c in fmt.get("cast", [])}

        # 1. Fiches casting (sautées pour un personnage qui n'apparaît qu'une fois : la description suffit)
        used = uses(fmt)
        for c in fmt.get("cast", []):
            if redo or (c.get("status") == "done" and (d / c["file"]).exists()):
                continue  # en mode « refaire », on ne dessine rien d'autre que les images marquées
            if used.get(c["id"], 0) <= 1:
                if c.get("status") != "skipped":
                    c["status"] = "skipped"
                    persist()
                continue
            head = STYLE["style_with_ref"] + " " if STYLE_REF.exists() else ""
            role = f" Role in the story: {_clean(c['role'])}." if c.get("role") else ""
            others = [_clean(o.get("look", "")) for o in fmt.get("cast", []) if o is not c][:3]
            unlike = (" This character must look clearly different from the other characters of the strip ("
                      + "; ".join(others) + ").") if others else ""
            prompt = (f"Character design sheet: one single character, full body, standing, facing the viewer, "
                      f"plain white background, of {_clean(c.get('look', c['id']))}.{role}{story_context(fmt)} "
                      "A singular, memorable caricature: exaggerated silhouette, signature hairstyle and accessory, "
                      f"body language that tells who this person is.{unlike} One image only, no panel borders. "
                      f"Wordless picture: no text, no lettering. {head}{STYLE['style']}")
            try:
                im, via = draw(fmt, day, prompt, STYLE["cast_size"], [STYLE_REF], "cast")
                im = ink(im)
            except (QuotaExhausted, BudgetReserved):
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
            if via != "cloudflare":
                c["via"] = via
            done += 1
            persist()
            print(f"  fiche {fmt['id']}/{c['id']} ({via})")

        # 2. Couverture puis 3. cases
        jobs = []
        if fmt.get("cover"):
            jobs.append((fmt["cover"], STYLE["cover_size"], "cover"))
        drawn = [case["image"] for case in fmt.get("cases", []) if case.get("image") and case.get("kind") != "explain"]
        jobs += [(img, STYLE["case_size"], "case") for img in drawn]
        for img, size, kind in jobs:
            ctx = context_for(d, fmt, img, drawn, looks, sheets, roles)
            if redo:
                if img.get("status") == "done" and img.get("redo"):
                    done += redo_one(d, img, size, kind, fmt, day, ctx, persist)
                continue
            if img.get("status") not in ("pending", "retry", None):
                continue
            if img.get("attempts", 0) >= max_att:
                img["status"] = "failed"
                persist()
                continue
            prompt, refs = build(img["prompt"], **ctx)
            img["attempts"] = img.get("attempts", 0) + 1
            try:
                im, via = draw(fmt, day, prompt, size, refs, kind)
            except (QuotaExhausted, BudgetReserved):
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
            if via != "cloudflare":
                img["via"] = via
            img.pop("qa", None)
            img.pop("error", None)
            done += 1
            persist()
            print(f"  image {img['file']} ({via})")
            time.sleep(0.5)
    return done


def context_for(d: Path, fmt: dict, img: dict, drawn: list, looks: dict, sheets: dict, roles: dict) -> dict:
    """Tout ce que le modèle doit savoir pour une image : personnages (fiche, rôle), cadre de la BD,
    numéro de la case et case précédente (continuité, sauf `"same_place": false` ou aucun personnage commun)."""
    cast = [(looks[c], sheets.get(c), roles.get(c)) for c in img.get("cast", []) if c in looks]
    ctx = {"cast": cast, "fmt": fmt}
    if img in drawn:
        i = drawn.index(img)
        ctx["panel"] = (i + 1, len(drawn))
        if i > 0 and img.get("same_place") is not False:
            p = drawn[i - 1]
            shared = set(p.get("cast", [])) & set(img.get("cast", []))
            if p.get("status") == "done" and p.get("file") and (shared or img.get("same_place")):
                ctx["prev"] = d / p["file"]
    return ctx


def redo_one(d, img, size, kind, fmt, day, ctx, persist) -> int:
    """Nouvelle version d'une image déjà publiée ; en cas d'échec l'ancienne reste (2 essais au plus)."""
    prompt, refs = build(img["prompt"], **ctx)
    try:
        im, via = draw(fmt, day, prompt, size, refs, kind)
    except (QuotaExhausted, BudgetReserved):
        raise
    except Exception as e:
        img["redo_attempts"] = img.get("redo_attempts", 0) + 1
        img["error"] = str(e)[:300]
        if img["redo_attempts"] >= 2:
            img.pop("redo", None)  # on garde l'ancienne image
        persist()
        return 0
    save_webp(im, d / img["file"])
    for k in ("redo", "redo_attempts", "qa", "error"):
        img.pop(k, None)
    if via != "cloudflare":
        img["via"] = via
    persist()
    print(f"  refaite {img['file']} ({via})")
    return 1


def stock_target(kind: str) -> int:
    return (STYLE.get("stock_target") or {}).get(kind, 2)


def process_stock(phase: str) -> int:
    """phase "fill" : jusqu'à `stock_target` BD finies par type ; "more" : au-delà. Une BD à la fois par type."""
    total = 0
    stuck = set()  # types dont la BD en cours n'a pas pu avancer pendant ce passage (erreur d'image)
    while True:
        summ = stock.summary()
        todo = []
        for kind in stock.TYPES:
            if kind in stuck or (phase == "fill" and summ[kind]["ready"] >= stock_target(kind)):
                continue
            # BD en cours : la plus ancienne pas finie et pas bloquée
            cur = None
            for p in stock.items(kind):
                it = stock.load(p)
                if it and not it.get("blocked") and not stock.is_ready(it["formats"][0], p):
                    cur = (p, it)
                    break
            if cur:
                todo.append((summ[kind]["ready"], stock.TYPES.index(kind), kind, cur))
        if not todo:
            return total
        todo.sort(key=lambda x: x[:2])  # le type le plus en retard d'abord ; à égalité Culture G, Insolite, Dossier
        ready, _, kind, (p, it) = todo[0]
        f = p / "item.json"
        # Renfort payant seulement si ce type n'a plus aucune BD finie pour la prochaine publication.
        day = next_actu_date() if ready == 0 else date.max
        print(f"File {kind} : {p.name} ({stock.left(it['formats'][0])} image(s) à faire)")
        before = stock.left(it["formats"][0])
        total += process(p, f, it, day=day)
        fmt = it["formats"][0]
        if any(i.get("status") == "failed" for i in stock.images_of(fmt)):
            it["blocked"] = "image en échec après plusieurs essais : simplifier son prompt et remettre attempts à 0"
            f.write_text(json.dumps(it, ensure_ascii=False, indent=2))
            print(f"  ! {p.name} bloquée : {it['blocked']}")
        elif stock.left(fmt) >= before:
            stuck.add(kind)  # pas d'avancée (erreurs passagères) : on réessaiera au prochain passage


def main():
    if not ACCOUNT or not TOKEN:
        sys.exit("CF_ACCOUNT_ID et CF_API_TOKEN sont requis (secrets GitHub).")
    total = 0
    log = []
    try:
        # 1. L'Actu d'abord (écrite au dernier moment, elle ne doit jamais manquer de quota),
        for d, f, ed in editions_to_process():
            total += process(d, f, ed, only_actu=True)
        # 1 bis. les images à refaire des prochaines BD à sortir : l'édition à venir et la prochaine BD finie de
        #        chaque type (le contrôle qualité se concentre sur elles ; au plus 6 par passage).
        nxt = EDITIONS / next_actu_date().isoformat() / "edition.json"
        if nxt.exists():
            ed_next = json.loads(nxt.read_text())
            total += process(nxt.parent, nxt, ed_next, only_actu=True, redo=True)
            total += process(nxt.parent, nxt, ed_next, redo=True)
        for kind in stock.TYPES:
            p = stock.next_out(kind)
            it = stock.load(p) if p else None
            if it:
                total += process(p, p / "item.json", it, redo=True)
        # 2. les BD incomplètes des éditions récentes (ancien système, ou image ratée),
        for d, f, ed in editions_to_process():
            print(f"Édition {d.name}")
            total += process(d, f, ed)
        # 3. la file d'attente : une BD finie à la fois, jusqu'à l'avance voulue,
        total += process_stock("fill")
        # 4. les images à refaire (l'ancienne reste en ligne), éditions récentes puis file,
        for d, f, ed in editions_to_process():
            total += process(d, f, ed, redo=True)
        for kind in stock.TYPES:
            for p in stock.items(kind):
                it = stock.load(p)
                if it:
                    total += process(p, p / "item.json", it, redo=True)
        # 5. puis on continue de remplir la file.
        total += process_stock("more")
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
