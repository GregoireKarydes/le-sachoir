"""Image de partage d'une BD (13 novembre 2026) : 1200 x 630, ce qui s'affiche quand on partage le lien
d'une histoire (WhatsApp, iMessage, réseaux sociaux, Slack).

À gauche, le format en pastille de sa couleur, le titre en grand (serif de l'appli), la thématique, le logo ;
à droite, la couverture de la BD (ou sa première case), bordée de noir comme dans l'appli.
Générée une fois par BD dans `editions/<date>/images/share-<format>-<empreinte>.jpg` : l'empreinte change
avec le titre ou la couverture, une ancienne image est alors remplacée."""
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "pipeline" / "fonts"
LOGO = ROOT / "app" / "assets" / "logo.png"
W, H = 1200, 630
CREAM, INK, MUTED = (250, 246, 238), (23, 20, 15), (95, 90, 82)
COLOR = {"dossier": (31, 143, 95), "actu": (47, 79, 162), "cultureg": (242, 163, 58), "insolite": (217, 71, 58), "ccm": (122, 79, 184)}
LABEL = {"dossier": "Le Grand Dossier", "actu": "L’Actu du jour", "cultureg": "La Pilule de Culture G", "insolite": "L’Insolite historique", "ccm": "Comment ça marche ?"}


def _font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def _wrap(draw, text, font, width, max_lines):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while lines[-1] and draw.textlength(lines[-1] + "…", font=font) > width:
            lines[-1] = lines[-1].rsplit(" ", 1)[0] if " " in lines[-1] else lines[-1][:-1]
        lines[-1] += "…"
    return lines


def picture_of(fmt: dict, ed_dir: Path) -> Path | None:
    cover = fmt.get("cover") or {}
    if cover.get("status") == "done" and (ed_dir / cover.get("file", "")).exists():
        return ed_dir / cover["file"]
    for c in fmt.get("cases", []):
        img = c.get("image") or {}
        if img.get("status") == "done" and (ed_dir / img.get("file", "")).exists():
            return ed_dir / img["file"]
    return None


def render(fmt: dict, picture: Path | None) -> Image.Image:
    fid = fmt.get("id", "")
    color = COLOR.get(fid, COLOR["dossier"])
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    # Couverture à droite, bordée de noir avec une ombre décalée (le style des cartes de l'appli).
    px, py, pw, ph = 600, 48, 552, 534
    if picture:
        pic = ImageOps.fit(Image.open(picture).convert("RGB"), (pw, ph), Image.LANCZOS, centering=(0.5, 0.4))
        d.rounded_rectangle([px + 12, py + 12, px + pw + 12, py + ph + 12], 28, fill=INK)
        mask = Image.new("L", (pw, ph), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], 26, fill=255)
        im.paste(pic, (px, py), mask)
        d.rounded_rectangle([px, py, px + pw, py + ph], 28, outline=INK, width=6)
    else:
        d.rounded_rectangle([px, py, px + pw, py + ph], 28, fill=color, outline=INK, width=6)
    # Texte à gauche
    x, maxw = 64, 500
    lab = (fmt.get("label") or LABEL.get(fid, "")).upper()
    f_lab = _font("Roboto-Bold.ttf", 22)
    lw = d.textlength(lab, font=f_lab)
    d.rounded_rectangle([x, 70, x + lw + 32, 112], 21, fill=color)
    d.text((x + 16, 91), lab, font=f_lab, fill=INK if fid == "cultureg" else (255, 255, 255), anchor="lm")
    title = " ".join(str(fmt.get("title", "")).split())
    # Le plus grand corps dont le titre tient entre la pastille et la ligne du bas (thème, durée).
    for size in (64, 58, 52, 46, 40):
        f_t = _font("SourceSerif4-ExtraBold.ttf", size)
        lines = _wrap(d, title, f_t, maxw, 8)
        if 140 + len(lines) * int(size * 1.12) <= 440:
            break
    lines = _wrap(d, title, f_t, maxw, max(1, (440 - 140) // int(size * 1.12)))
    y = 140
    for ln in lines:
        d.text((x, y), ln, font=f_t, fill=INK)
        y += int(size * 1.12)
    theme = fmt.get("theme") or ""
    minutes = fmt.get("minutes")
    meta = " · ".join(t for t in (theme, f"{minutes} min de lecture" if minutes else "") if t)
    if meta:
        d.text((x, y + 14), meta, font=_font("Roboto-Medium.ttf", 26), fill=MUTED)
    # Signature
    if LOGO.exists():
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((230, 60))
        im.paste(logo, (x, 532 - logo.height // 2), logo)
        d.text((x + logo.width + 18, 532), "L’actu et la culture G en BD", font=_font("Roboto-Medium.ttf", 22), fill=MUTED, anchor="lm")
    return im


def ensure(fmt: dict, ed_dir: Path) -> str | None:
    """Crée l'image de partage si elle manque ; renvoie son chemin relatif à l'édition (ou None)."""
    pic = picture_of(fmt, ed_dir)
    key = f"{fmt.get('title')}|{fmt.get('label')}|{fmt.get('theme')}|{fmt.get('minutes')}|{pic.name if pic else ''}|v1"
    name = f"images/share-{fmt.get('id')}-{hashlib.sha1(key.encode()).hexdigest()[:8]}.jpg"
    dest = ed_dir / name
    if not dest.exists():
        for old in (ed_dir / "images").glob(f"share-{fmt.get('id')}-*.jpg"):
            old.unlink()
        dest.parent.mkdir(parents=True, exist_ok=True)
        render(fmt, pic).save(dest, "JPEG", quality=86, optimize=True, progressive=True)
    return name
