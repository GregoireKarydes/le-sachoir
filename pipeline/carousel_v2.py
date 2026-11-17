"""Carrousel v2 « récit en diapositives » (17 novembre 2026, voir le doc projet `claude/reel-v2.md`, partie carrousel).

Inspiré de la mécanique des carrousels d'histoire qui buzzent (Le Coq Savant) : une vraie photo plein cadre, assombrie,
quelques phrases très courtes en gros, alignées à gauche, un ou deux mots mis en valeur (jaune Sachoir), et une histoire
racontée diapositive après diapositive, chacune finissant sur une relance. Pas de BD obligatoire : l'image sert le récit.

Entrée : `social/instagram/<date>/post.json` avec `"kind": "carousel"`, `"version": 2` et `slides` :
  {"text": "Ils étaient tellement incapables…\\n\\nqu'on en fit un **verbe**.", "image": {"commons": "..."}}
- `text` : lignes courtes ; une ligne vide sépare deux blocs ; `**mot**` = mot mis en valeur (jaune).
- `image` : `{"commons": "termes de recherche"}` (archive du domaine public, Wikimedia Commons, sans clé),
  `{"photo": "english keywords"}` (photo libre de droits Pixabay, secret `PIXABAY_API_KEY`), `{"bd": 3}` (case n° 3 de
  l'histoire `story`), `{"same": true}` (même image que la diapositive précédente, cadrée un peu autrement),
  ou rien (fond encre uni). Une image introuvable retombe sur Commons, une case de l'histoire, puis le fond uni.
- `tone` (au niveau du post) : `archive` (noir et blanc, par défaut pour l'histoire) ou `couleur`.
La dernière diapositive est toujours la carte du Sachoir (« Une question comme ça chaque matin, en BD »).
Sortie : `slide-01.jpg`… en 1080 x 1350."""
import hashlib
import json
import os
import re
import tempfile
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

import reel_v2

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "pipeline" / "fonts"
W, H = 1080, 1350
INK, CREAM, YELLOW, WHITE = (23, 20, 15), (250, 246, 238), (245, 182, 42), (255, 255, 255)
MAX_SLIDES = 10  # couverture et carte finale comprises (limite sûre pour Buffer)


def mont(size, weight="ExtraBold"):
    return ImageFont.truetype(str(FONTS / f"Montserrat-{weight}.ttf"), size)


# ---------- images ----------

def pixabay_photo(query, used, folder):
    key = os.environ.get("PIXABAY_API_KEY", "").strip()
    if not key or not query:
        return None
    try:
        r = requests.get("https://pixabay.com/api/", timeout=30, params={
            "key": key, "q": query[:100], "image_type": "photo", "orientation": "vertical", "per_page": 20,
            "safesearch": "true", "min_width": 1000})
        r.raise_for_status()
        hits = r.json().get("hits", [])
    except Exception as e:  # noqa
        print(f"Pixabay photo « {query} » : {e}")
        return None
    for h in hits:
        if ("pixabay", h["id"]) in used:
            continue
        url = h.get("largeImageURL") or h.get("webformatURL")
        dst = folder / f"pixabay-{h['id']}.jpg"
        try:
            resp = requests.get(url, timeout=60)
            resp.raise_for_status()
            dst.write_bytes(resp.content)
            Image.open(dst).convert("RGB").save(dst, quality=92)
        except Exception as e:  # noqa
            print(f"Pixabay : téléchargement raté ({e})")
            continue
        used.add(("pixabay", h["id"]))
        return dst
    return None


def pick_image(spec, i, post, bd, used, folder, prev):
    spec = spec or {}
    if spec.get("same") and prev:
        return prev
    p = None
    if spec.get("photo"):
        p = pixabay_photo(spec["photo"], used, folder)
    if not p and (spec.get("commons") or spec.get("photo")):
        src = reel_v2.commons_image(spec.get("commons") or spec.get("photo"), used, folder)
        p = src["path"] if src else None
    if not p and spec.get("bd") is not None:
        p = bd.get(spec["bd"])
    if not p and spec and bd:
        keys = sorted(bd)
        p = bd[keys[i % len(keys)]]
    return p


def background(path, tone, variant):
    """Photo recadrée en 4:5, désaturée (archive) ou légèrement éteinte (couleur), assombrie pour le texte."""
    if not path:
        img = Image.new("RGB", (W, H), INK)
    else:
        img = Image.open(path).convert("RGB")
        # Recadrage : une image reprise (`same`) est zoomée et décalée pour ne pas répéter le même cadre.
        zoom = 1.0 + 0.12 * (variant % 3)
        img = ImageOps.fit(img, (round(W * zoom), round(H * zoom)), Image.LANCZOS, centering=(0.5, 0.4))
        dx = (img.width - W) * [0.5, 0.2, 0.8][variant % 3]
        img = img.crop((int(dx), int((img.height - H) * 0.4), int(dx) + W, int((img.height - H) * 0.4) + H))
        if tone == "archive":
            img = ImageOps.grayscale(img).convert("RGB")
            img = ImageEnhance.Contrast(img).enhance(1.15)
        else:
            img = ImageEnhance.Color(img).enhance(0.75)
        img = ImageEnhance.Brightness(img).enhance(0.55)
    # Voile noir dégradé : très marqué en haut (là où est le texte), plus léger en bas, puis vignette.
    shade = Image.new("L", (W, H))
    d = ImageDraw.Draw(shade)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=int(190 - 130 * min(1, y / (H * 0.75))))
    img = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), img, shade)
    vign = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vign).ellipse([-W * 0.25, -H * 0.2, W * 1.25, H * 1.2], fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(160))
    return Image.composite(img, Image.new("RGB", (W, H), (0, 0, 0)), vign)


# ---------- texte ----------

TOKEN = re.compile(r"\*\*(.+?)\*\*(\S*)|(\S+)")


def tokens(line):
    """[(morceaux, …)] : chaque mot est une liste de morceaux (texte, mis_en_valeur) collés sans espace,
    pour que « **13 chiffres**. » garde son point collé au mot jaune."""
    out = []
    for m in TOKEN.finditer(line):
        if m.group(1):
            words = m.group(1).split()
            out += [[(w, True)] for w in words]
            if m.group(2):
                out[-1].append((m.group(2), False))
        else:
            out.append([(m.group(3), False)])
    return out


def word_w(d, word, fnt):
    return sum(d.textlength(t, font=fnt) for t, _ in word)


def layout(text, fnt, width, d):
    """Blocs → lignes de mots, retour à la ligne automatique. Renvoie [[(mot, valeur)] | None (espace de bloc)]."""
    lines = []
    for bi, block in enumerate(str(text).strip().split("\n\n")):
        if bi:
            lines.append(None)
        for raw in block.split("\n"):
            cur, cur_w = [], 0
            sp = d.textlength(" ", font=fnt)
            for word in tokens(raw):
                ww = word_w(d, word, fnt) + sp
                if cur and cur_w + ww - sp > width:
                    lines.append(cur)
                    cur, cur_w = [], 0
                cur.append(word)
                cur_w += ww
            if cur:
                lines.append(cur)
    return lines


def draw_text(img, text, cover):
    d = ImageDraw.Draw(img)
    margin = 84
    width = W - 2 * margin
    size = 86 if cover else 64
    raw_lines = [ln for ln in str(text).replace("\n\n", "\n").split("\n") if ln.strip()]
    while True:
        fnt = mont(size)
        lines = layout(text, fnt, width, d)
        lh = int(size * 1.22)
        gap = int(size * 0.75)
        total = sum(gap if ln is None else lh for ln in lines)
        # Les retours à la ligne voulus par l'auteur sont gardés : on réduit la taille plutôt que de recouper une ligne.
        widest = max(sum(word_w(d, w, fnt) for w in tokens(r)) + d.textlength(" ", font=fnt) * (len(tokens(r)) - 1)
                     for r in raw_lines)
        if (total <= H * 0.62 and widest <= width) or size <= 46:
            break
        size -= 2
    y = int(H * 0.30) - total // 2 if not cover else int(H * 0.40) - total // 2
    y = max(330 if PLATFORM == "tiktok" else 150, y)
    space = d.textlength(" ", font=fnt)
    for ln in lines:
        if ln is None:
            y += gap
            continue
        x = margin
        for word in ln:
            for t, hi in word:
                # ombre portée pour la lisibilité sur image claire
                d.text((x + 3, y + 4), t, font=fnt, fill=(0, 0, 0))
                d.text((x, y), t, font=fnt, fill=YELLOW if hi else WHITE)
                x += d.textlength(t, font=fnt)
            x += space
        y += lh
    return img


PLATFORM = "instagram"  # « tiktok » pendant le rendu de la version verticale 1080 x 1920


def brand(img, n, total):
    from social_render import logo  # noqa
    lg = logo(150)
    # pastille crème sous le logo pour qu'il reste lisible sur fond sombre
    pad = 14
    plate = Image.new("RGBA", (lg.width + 2 * pad, lg.height + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(plate).rounded_rectangle([0, 0, plate.width - 1, plate.height - 1], radius=18, fill=CREAM + (235,))
    plate.paste(lg, (pad, pad), lg)
    if PLATFORM == "tiktok":  # le bas et la droite de l'écran TikTok sont couverts par la légende et les boutons
        img.paste(plate, (60, 170), plate)
        return img
    img.paste(plate, (W - plate.width - 48, H - plate.height - 44), plate)
    if 1 < n < total:  # petit compteur discret, comme une page de BD
        d = ImageDraw.Draw(img)
        d.text((60, H - 80), f"{n}/{total}", font=mont(30, "SemiBold"), fill=(200, 196, 188))
    return img


def end_slide(post, bd_first):
    img = background(bd_first, "couleur", 0) if bd_first else Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    from social_render import logo  # noqa
    cw, ch = 900, 820
    x0, y0 = (W - cw) // 2, (H - ch) // 2
    d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], radius=48, fill=CREAM)
    lg = logo(560)
    img.paste(lg, ((W - lg.width) // 2, y0 + 80), lg)
    y = y0 + 120 + lg.height
    for line, f in [("Une question comme ça", mont(58)), ("chaque matin, en BD", mont(58))]:
        d.text(((W - d.textlength(line, font=f)) // 2, y), line, font=f, fill=INK)
        y += 78
    sub = post.get("end") or "Gratuit, en 2 minutes."
    f = mont(40, "SemiBold")
    d.text(((W - d.textlength(sub, font=f)) // 2, y + 14), sub, font=f, fill=(95, 90, 82))
    site, f2 = "lesachoir.fr · lien en bio", mont(44)
    tw = d.textlength(site, font=f2)
    d.rounded_rectangle([(W - tw) // 2 - 40, y + 100, (W + tw) // 2 + 40, y + 196], radius=48, fill=YELLOW)
    d.text(((W - tw) // 2, y + 120), site, font=f2, fill=INK)
    return img


def render(post, out: Path):
    """Instagram (1080 x 1350, `slide-XX.jpg`) puis TikTok en photo mode (1080 x 1920, `tiktok-XX.jpg`)."""
    global H, PLATFORM
    info = _render(post, out, "slide")
    H, PLATFORM = 1920, "tiktok"
    try:
        info["tiktok_files"] = _render(post, out, "tiktok")["files"]
    finally:
        H, PLATFORM = 1350, "instagram"
    return info


def _render(post, out: Path, prefix):
    slides = [s for s in post.get("slides", []) if s.get("text")][: MAX_SLIDES - 1]
    if len(slides) < 3:
        raise ValueError("carrousel v2 : au moins 3 diapositives avec du texte")
    tone = post.get("tone", "archive")
    bd = reel_v2.story_images(post)
    tmp = Path(tempfile.mkdtemp())
    used, prev, files, credits = set(), None, [], set()
    total = len(slides) + 1
    variant = 0
    for i, s in enumerate(slides):
        spec = s.get("image") or {}
        p = pick_image(spec, i, post, bd, used, tmp, prev)
        variant = variant + 1 if (spec.get("same") and prev) else 0
        if p and str(p).find("commons-") >= 0:
            credits.add("Wikimedia Commons")
        elif p and str(p).find("pixabay-") >= 0:
            credits.add("Pixabay")
        img = background(p, s.get("tone", tone), variant)
        draw_text(img, s["text"], cover=(i == 0))
        brand(img, i + 1, total)
        name = f"{prefix}-{i + 1:02d}.jpg"
        img.save(out / name, quality=90)
        files.append(name)
        prev = p
    first_bd = next(iter(bd.values()), None)
    name = f"{prefix}-{total:02d}.jpg"
    end_slide(post, first_bd).save(out / name, quality=90)
    files.append(name)
    for old in out.glob(f"{prefix}-*.jpg"):
        if old.name not in files:
            old.unlink()
    return {"files": files, "version": 2, "credits": sorted(credits)}
