"""Instagram (17 novembre 2026) : fabrique le carrousel ou le Reel d'un post préparé par la tâche « Le Sachoir – Instagram ».

Entrée : `social/instagram/<date>/post.json` (écrit par la tâche, voir `prompts/INSTAGRAM.md`).
Sortie, dans le même dossier :
- carrousel : `slide-01.jpg`, `slide-02.jpg`… en 1080 x 1350 (couverture avec l'accroche, cases choisies, carte finale
  « la suite dans l'appli ») ;
- Reel : `reel.mp4` en 1080 x 1920 (couverture + accroche, puis chaque case avec son récitatif et ses bulles, zoom lent,
  voix Kokoro qui lit le texte, carte finale) et `reel-cover.jpg` ;
- `render.json` : la liste des fichiers, la durée du Reel et l'empreinte du post (un post modifié est refait).

Les cases gardent le look de l'appli : récitatif jaune en haut, bulles blanches en bas, lettrage Comic Neue.

Usage : python pipeline/social_render.py [date ...]   (sans date : tous les posts pas encore rendus)
Voix : Kokoro (`pip install kokoro soundfile`, `espeak-ng`), voix française `ff_siwis`. Sans Kokoro, espeak-ng, et sans
espeak-ng, un silence de la bonne durée (pour tester la mise en page)."""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOCIAL = ROOT / "social" / "instagram"
FONTS = ROOT / "pipeline" / "fonts"
LOGO = ROOT / "app" / "assets" / "logo.png"

CREAM, INK, MUTED = (250, 246, 238), (23, 20, 15), (95, 90, 82)
CAPTION_BG, WHITE = (255, 241, 201), (255, 255, 255)
GREEN, NAVY, RED, YELLOW = (31, 143, 95), (47, 79, 162), (217, 71, 58), (245, 182, 42)
COLOR = {"dossier": (31, 143, 95), "actu": (47, 79, 162), "cultureg": (242, 163, 58), "insolite": (217, 71, 58),
         "notice": (122, 79, 184), "origine": (138, 90, 36)}
LABEL = {"dossier": "Le Grand Dossier", "actu": "L’Actu du jour", "cultureg": "La Pilule de Culture G",
         "insolite": "L’Insolite historique", "notice": "La Notice", "origine": "D’où ça vient ?"}
VOICE = "ff_siwis"
SITE_LABEL = "lesachoir.fr"


# ---------- outils de dessin ----------

def font(name, size):
    files = {"letter": "ComicNeue-Bold.ttf", "letter-r": "ComicNeue-Regular.ttf", "serif": "SourceSerif4-ExtraBold.ttf",
             "sans": "Roboto-Bold.ttf", "sans-m": "Roboto-Medium.ttf"}
    return ImageFont.truetype(str(FONTS / files[name]), size)


def wrap(draw, text, fnt, width):
    lines = []
    for para in str(text).split("\n"):
        cur = ""
        for w in para.split():
            test = (cur + " " + w).strip()
            if draw.textlength(test, font=fnt) <= width or not cur:
                cur = test
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


def text_h(fnt, n, spacing):
    asc, desc = fnt.getmetrics()
    return n * (asc + desc) + (n - 1) * spacing


def fit_text(draw, text, name, width, max_h, start, minimum, spacing_ratio=0.18):
    """Plus grande taille de police (entre start et minimum) qui tient dans width x max_h."""
    size = start
    while True:
        fnt = font(name, size)
        sp = int(size * spacing_ratio)
        lines = wrap(draw, text, fnt, width)
        if text_h(fnt, len(lines), sp) <= max_h or size <= minimum:
            return fnt, lines, sp
        size -= 2


def cover_crop(img: Image.Image, w, h, focus_y=0.42):
    img = img.convert("RGB")
    scale = max(w / img.width, h / img.height)
    nw, nh = round(img.width * scale), round(img.height * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    x = (nw - w) // 2
    y = int(min(max(0, nh * focus_y - h / 2), nh - h))
    return img.crop((x, y, x + w, y + h))


def logo(width):
    lg = Image.open(LOGO).convert("RGBA")
    return lg.resize((width, round(lg.height * width / lg.width)), Image.LANCZOS)


def caption_box(draw, case, x, y, w, k, color):
    """Récitatif de l'appli : fond jaune pâle, bord encre, ombre portée, étiquette en capitales."""
    tag = (case.get("tag") or "").upper()
    text = case.get("caption") or ""
    if not text and not tag:
        return y
    pad, bw = int(13 * k), max(3, int(3 * k))
    ftag = font("sans", int(13 * k))
    fnt, lines, sp = fit_text(draw, text, "letter", w - 2 * pad, int(260 * k), int(23 * k), int(17 * k))
    th = (text_h(ftag, 1, 0) + int(5 * k)) if tag else 0
    h = pad * 2 + th + (text_h(fnt, len(lines), sp) if text else 0)
    sh = int(5 * k)
    bg = WHITE if case.get("kind") == "fact" else CAPTION_BG
    draw.rectangle((x + sh, y + sh, x + w + sh, y + h + sh), fill=INK)
    draw.rectangle((x, y, x + w, y + h), fill=bg, outline=INK, width=bw)
    if case.get("kind") == "fact":
        draw.rectangle((x, y, x + int(12 * k), y + h), fill=GREEN)
    ty = y + pad
    tx = x + pad + (int(10 * k) if case.get("kind") == "fact" else 0)
    tag_color = NAVY if case.get("kind") == "chap" else RED if case.get("kind") == "react" else GREEN
    if tag:
        draw.text((tx, ty), tag, font=ftag, fill=tag_color)
        ty += th
    draw.multiline_text((tx, ty), "\n".join(lines), font=fnt, fill=INK, spacing=sp)
    return y + h + sh


def bubble_size(draw, b, w, k, names):
    pad = int(14 * k)
    who = (names.get(b.get("who"), "") or "").split(",")[0].upper()
    fwho = font("sans", int(12 * k))
    fnt, lines, sp = fit_text(draw, b.get("text", ""), "letter", int(w * 0.8) - 2 * pad, int(220 * k), int(25 * k), int(18 * k))
    tw = max([draw.textlength(l, font=fnt) for l in lines] + [draw.textlength(who, font=fwho) if who else 0])
    bh = pad * 2 + (text_h(fwho, 1, 0) + int(3 * k) if who else 0) + text_h(fnt, len(lines), sp)
    return int(tw + 2 * pad), bh, (fnt, lines, sp, fwho, who, pad)


def draw_bubble(draw, b, x0, y, w, k, names):
    """Bulle blanche arrondie, bord encre, queue vers le bas du côté du personnage (l ou r)."""
    bw_, bh, (fnt, lines, sp, fwho, who, pad) = bubble_size(draw, b, w, k, names)
    side = b.get("side", "l")
    x = x0 if side == "l" else x0 + w - bw_
    lw = max(3, int(3 * k))
    draw.rounded_rectangle((x, y, x + bw_, y + bh), radius=int(22 * k), fill=WHITE, outline=INK, width=lw)
    tail = int(18 * k)
    if side == "l":
        tx = x + int(30 * k)
        pts = [(tx, y + bh - lw), (tx + int(18 * k), y + bh - lw), (tx, y + bh + tail)]
    else:
        tx = x + bw_ - int(30 * k)
        pts = [(tx, y + bh - lw), (tx - int(18 * k), y + bh - lw), (tx, y + bh + tail)]
    draw.polygon(pts, fill=WHITE)
    draw.line([pts[0], pts[2], pts[1]], fill=INK, width=lw)
    if b.get("kind") == "thought" or b.get("th"):
        pass
    ty = y + pad
    if who:
        draw.text((x + pad, ty), who, font=fwho, fill=MUTED)
        ty += text_h(fwho, 1, 0) + int(3 * k)
    draw.multiline_text((x + pad, ty), "\n".join(lines), font=fnt, fill=INK, spacing=sp)
    return bh + tail


def bubbles_block(draw, bubbles, x, bottom, w, k, names):
    """Empile les bulles au-dessus de `bottom` (dans l'ordre de lecture)."""
    heights = [bubble_size(draw, b, w, k, names)[1] + int(18 * k) for b in bubbles]
    gap = int(16 * k)
    y = bottom - sum(heights) - gap * (len(bubbles) - 1)
    for b, h in zip(bubbles, heights):
        draw_bubble(draw, b, x, y, w, k, names)
        y += h + gap


def overlay_case(case, w, h, names, k):
    """Calque transparent : récitatif en haut, bulles en bas (pour la vidéo, le fond bouge dessous)."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    m = int(30 * k)
    top = int(h * 0.06) if h > 1500 else m
    caption_box(d, case, m, top, w - 2 * m, k, None)
    if case.get("bubbles"):
        bottom = h - (int(h * 0.16) if h > 1500 else m + int(10 * k))
        bubbles_block(d, case["bubbles"], m, bottom, w - 2 * m, k, names)
    return layer


def explain_card(case, w, h, color, k):
    im = Image.new("RGB", (w, h), CREAM)
    d = ImageDraw.Draw(im)
    m = int(56 * k)
    d.rectangle((0, 0, w, int(16 * k)), fill=color)
    y = int(h * 0.12)
    tag = (case.get("tag") or "Pour mieux comprendre").upper()
    d.text((m, y), tag, font=font("sans", int(20 * k)), fill=color)
    y += int(44 * k)
    ft, tl, tsp = fit_text(d, case.get("title") or "", "serif", w - 2 * m, int(240 * k), int(52 * k), int(36 * k), 0.1)
    d.multiline_text((m, y), "\n".join(tl), font=ft, fill=INK, spacing=tsp)
    y += text_h(ft, len(tl), tsp) + int(40 * k)
    body = case.get("text") or ""
    if case.get("steps"):
        body = "\n".join(f"{i}. {s}" for i, s in enumerate(case["steps"], 1))
    fb, bl, bsp = fit_text(d, body, "letter-r", w - 2 * m, h - y - int(60 * k), int(30 * k), int(19 * k), 0.32)
    d.multiline_text((m, y), "\n".join(bl), font=fb, fill=INK, spacing=bsp)
    return im


def pill(d, x, y, text, color, k):
    f = font("sans", int(22 * k))
    tw = d.textlength(text.upper(), font=f)
    ph = int(46 * k)
    d.rounded_rectangle((x, y, x + tw + int(36 * k), y + ph), radius=ph // 2, fill=color)
    d.text((x + int(18 * k), y + (ph - text_h(f, 1, 0)) // 2), text.upper(), font=f, fill=WHITE)
    return ph


def cover_slide(img_path, fid, hook, w, h, k, swipe=True):
    base = cover_crop(Image.open(img_path), w, h, 0.4) if img_path else Image.new("RGB", (w, h), COLOR.get(fid, GREEN))
    # dégradé sombre en bas pour lire l'accroche
    grad = Image.new("L", (1, h))
    for yy in range(h):
        t = max(0.0, (yy / h - 0.38) / 0.62)
        grad.putpixel((0, yy), int(235 * min(1.0, t * 1.15)))
    shade = Image.new("RGB", (w, h), INK)
    base = Image.composite(shade, base, grad.resize((w, h)))
    d = ImageDraw.Draw(base)
    m = int(56 * k)
    lg = logo(int(230 * k))
    plate = Image.new("RGBA", (lg.width + int(28 * k), lg.height + int(18 * k)), (*CREAM, 235))
    base.paste(plate, (m - int(14 * k), m - int(9 * k)), plate)
    base.paste(lg, (m, m), lg)
    fh, hl, hsp = fit_text(d, hook, "serif", w - 2 * m, int(w * 0.36), int(w * 0.085), int(w * 0.055), 0.08)
    hh = text_h(fh, len(hl), hsp)
    bottom = h - int((150 if h > 1500 else 90) * k)
    y = bottom - hh
    ph = int(46 * k)
    pill(d, m, y - ph - int(26 * k), LABEL.get(fid, "Le Sachoir"), COLOR.get(fid, GREEN), k)
    d.multiline_text((m + 3, y + 4), "\n".join(hl), font=fh, fill=INK, spacing=hsp)
    d.multiline_text((m, y), "\n".join(hl), font=fh, fill=WHITE, spacing=hsp)
    if swipe:
        fs = font("sans", int(24 * k))
        t = "Glisse"
        ah = text_h(fs, 1, 0)
        ax = w - m - int(ah * 0.8)
        ay = h - int(60 * k)
        d.text((ax - int(ah * 0.4) - d.textlength(t, font=fs), ay), t, font=fs, fill=YELLOW)
        d.polygon([(ax, ay + ah * 0.2), (ax + ah * 0.8, ay + ah * 0.55), (ax, ay + ah * 0.9)], fill=YELLOW)
    return base


def end_card(fid, end_text, w, h, k):
    """Carte finale : la suite dans l'appli. Tailles en fraction de la largeur (même rendu en 1080 x 1350 et 1080 x 1920)."""
    color = COLOR.get(fid, GREEN)
    im = Image.new("RGB", (w, h), color)
    d = ImageDraw.Draw(im)
    m = int(w * 0.07)
    inner = w - 2 * m - int(w * 0.1)
    lg = logo(int(w * 0.4))
    fh, hl, hsp = fit_text(d, "La suite (et la chute) dans l’appli", "serif", inner, int(w * 0.3), int(w * 0.075), int(w * 0.05), 0.08)
    fe, el, esp = (fit_text(d, end_text, "letter", inner, int(w * 0.22), int(w * 0.042), int(w * 0.03), 0.2)
                   if end_text else (None, [], 0))
    fs = font("sans", int(w * 0.034))
    btn = f"{SITE_LABEL}  ·  lien en bio"
    gap = int(w * 0.05)
    content_h = (lg.height + gap + text_h(fh, len(hl), hsp) + (gap // 2 + text_h(fe, len(el), esp) if el else 0)
                 + gap + int(w * 0.075))
    pad = int(w * 0.06)
    top = (h - content_h) // 2 - pad
    bot = top + content_h + 2 * pad
    sh = int(w * 0.012)
    d.rounded_rectangle((m + sh, top + sh, w - m + sh, bot + sh), radius=int(w * 0.03), fill=INK)
    d.rounded_rectangle((m, top, w - m, bot), radius=int(w * 0.03), fill=CREAM, outline=INK, width=max(3, int(w * 0.004)))
    y = top + pad
    im.paste(lg, ((w - lg.width) // 2, y), lg)
    y += lg.height + gap
    for line in hl:
        d.text(((w - d.textlength(line, font=fh)) // 2, y), line, font=fh, fill=INK)
        y += text_h(fh, 1, 0) + hsp
    if el:
        y += gap // 2 - hsp
        for line in el:
            d.text(((w - d.textlength(line, font=fe)) // 2, y), line, font=fe, fill=MUTED)
            y += text_h(fe, 1, 0) + esp
    y += gap - esp
    tw = d.textlength(btn, font=fs)
    bh = int(w * 0.075)
    d.rounded_rectangle(((w - tw) // 2 - int(w * 0.03), y, (w + tw) // 2 + int(w * 0.03), y + bh),
                        radius=bh // 2, fill=YELLOW, outline=INK, width=max(3, int(w * 0.003)))
    d.text(((w - tw) // 2, y + (bh - text_h(fs, 1, 0)) // 2), btn, font=fs, fill=INK)
    fn = font("sans-m", int(w * 0.028))
    note = "Une BD d’actu et de culture G chaque matin. Gratuit."
    d.text(((w - d.textlength(note, font=fn)) // 2, bot + sh + int(w * 0.04)), note, font=fn, fill=WHITE)
    return im


# ---------- chargement ----------

def load(post: dict):
    src = post["story"]
    ed_dir = ROOT / "editions" / src["edition"]
    ed = json.loads((ed_dir / "edition.json").read_text())
    fmt = next(f for f in ed["formats"] if f["id"] == src["format"])
    names = {c["id"]: c.get("name", "") for c in fmt.get("cast", [])}
    return ed_dir, fmt, names


def img_of(ed_dir, obj):
    obj = obj or {}
    p = ed_dir / obj.get("file", "")
    return p if obj.get("file") and p.exists() else None


def chosen_cases(fmt, post):
    by_n = {c.get("n"): c for c in fmt.get("cases", [])}
    out = []
    for n in post.get("cases", []):
        c = by_n.get(n)
        if c and c.get("kind") != "photo":
            out.append(c)
    return out


def cover_image(ed_dir, fmt):
    return img_of(ed_dir, fmt.get("cover")) or next(
        (img_of(ed_dir, c.get("image")) for c in fmt.get("cases", []) if img_of(ed_dir, c.get("image"))), None)


# ---------- carrousel ----------

def render_carousel(post, out: Path):
    W, H, k = 1080, 1350, 2.0
    ed_dir, fmt, names = load(post)
    fid = fmt["id"]
    slides = [cover_slide(cover_image(ed_dir, fmt), fid, post["hook"], W, H, k)]
    for c in chosen_cases(fmt, post):
        if c.get("kind") == "explain":
            slides.append(explain_card(c, W, H, COLOR.get(fid, GREEN), k))
            continue
        p = img_of(ed_dir, c.get("image"))
        if not p:
            continue
        base = cover_crop(Image.open(p), W, H, 0.45).convert("RGBA")
        base.alpha_composite(overlay_case(c, W, H, names, k))
        slides.append(base.convert("RGB"))
    slides.append(end_card(fid, post.get("end", ""), W, H, k))
    files = []
    for i, s in enumerate(slides[:10], 1):
        name = f"slide-{i:02d}.jpg"
        s.save(out / name, quality=88, optimize=True, progressive=True)
        files.append(name)
    return {"files": files}


# ---------- voix ----------

_KOKORO = None


def _wav_seconds(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def speak(text: str, path: Path) -> float:
    """Écrit un WAV et renvoie sa durée. Kokoro, sinon espeak-ng, sinon silence."""
    global _KOKORO
    text = " ".join(str(text).replace("«", "").replace("»", "").split())
    try:
        if _KOKORO is None:
            from kokoro import KPipeline  # noqa
            _KOKORO = KPipeline(lang_code="f")
        import numpy as np
        import soundfile as sf
        chunks = [a for _, _, a in _KOKORO(text, voice=VOICE, speed=1.08)]
        audio = np.concatenate([np.asarray(c) for c in chunks]) if chunks else np.zeros(12000)
        audio = np.concatenate([audio, np.zeros(int(24000 * 0.35))])
        sf.write(str(path), audio, 24000)
        return _wav_seconds(path)
    except Exception as e:  # noqa
        if _KOKORO is None or _KOKORO is False:
            _KOKORO = False
        else:
            print(f"Kokoro a échoué ({e}), repli espeak-ng.")
    if shutil.which("espeak-ng"):
        subprocess.run(["espeak-ng", "-v", "fr", "-s", "165", "-w", str(path), text], check=True, capture_output=True)
        return _wav_seconds(path)
    secs = max(1.5, len(text.split()) * 0.38 + 0.4)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(b"\0\0" * int(24000 * secs))
    return secs


def voice_of(case):
    parts = [case.get("caption", "")] if case.get("caption") else []
    if case.get("kind") == "explain":
        parts = [case.get("title", ""), case.get("text", "")] + list(case.get("steps", []))
    parts += [b.get("text", "") for b in case.get("bubbles", [])]
    return " ".join(p for p in parts if p)


# ---------- Reel ----------

def segment(bg: Image.Image | None, overlay: Image.Image | None, wav: Path, secs: float, out: Path, tmp: Path, zoom=True):
    W, H, fps = 1080, 1920, 30
    frames = max(1, int(secs * fps))
    bgp, ovp = tmp / (out.stem + "-bg.png"), tmp / (out.stem + "-ov.png")
    bg.save(bgp)
    inputs = ["-loop", "1", "-framerate", str(fps), "-i", str(bgp)]
    if zoom:
        vf = (f"[0:v]scale={W * 2}:{H * 2},zoompan=z='1+0.06*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
              f":d={frames}:s={W}x{H}:fps={fps}[bg]")
    else:
        vf = f"[0:v]scale={W}:{H},fps={fps}[bg]"
    if overlay is not None:
        overlay.save(ovp)
        inputs += ["-loop", "1", "-framerate", str(fps), "-i", str(ovp)]
        vf += ";[bg][1:v]overlay=0:0:format=auto,format=yuv420p[v]"
        audio_idx = 2
    else:
        vf += ";[bg]format=yuv420p[v]"
        audio_idx = 1
    inputs += ["-i", str(wav)]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", vf, "-map", "[v]", "-map", f"{audio_idx}:a",
           "-t", f"{secs:.2f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-r", str(fps),
           "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2", str(out)]
    subprocess.run(cmd, check=True)


def render_reel(post, out: Path):
    W, H, k = 1080, 1920, 2.0
    ed_dir, fmt, names = load(post)
    fid = fmt["id"]
    voice = post.get("voice") or {}
    tmp = Path(tempfile.mkdtemp())
    segs, total = [], 0.0

    def add(bg, ov, text, zoom=True, min_secs=0.0):
        nonlocal total
        i = len(segs) + 1
        wav = tmp / f"s{i:02d}.wav"
        secs = max(min_secs, speak(text, wav))
        mp4 = tmp / f"s{i:02d}.mp4"
        segment(bg, ov, wav, secs, mp4, tmp, zoom)
        segs.append(mp4)
        total += secs

    cov = cover_slide(cover_image(ed_dir, fmt), fid, post["hook"], W, H, k, swipe=False)
    cov.save(out / "reel-cover.jpg", quality=88)
    add(cov, None, voice.get("hook") or post["hook"], zoom=False, min_secs=2.2)
    for c in chosen_cases(fmt, post):
        if c.get("kind") == "explain":
            add(explain_card(c, W, H, COLOR.get(fid, GREEN), k), None, voice_of(c), zoom=False)
            continue
        p = img_of(ed_dir, c.get("image"))
        if not p:
            continue
        add(cover_crop(Image.open(p), W, H, 0.45), overlay_case(c, W, H, names, k), voice_of(c))
    add(end_card(fid, post.get("end", ""), W, H, k), None,
        voice.get("end") or "La suite, et la chute, dans l'appli du Sachoir. Lien en bio.", zoom=False, min_secs=3)
    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in segs))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-c", "copy", "-movflags", "+faststart", str(out / "reel.mp4")], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    return {"files": ["reel.mp4"], "cover": "reel-cover.jpg", "seconds": round(total, 1)}


# ---------- main ----------

def fingerprint(post, day_dir=None):
    keys = ("kind", "story", "hook", "cases", "end", "voice")
    if post.get("version") == 2:
        keys = ("kind", "version", "story", "title", "number", "series_label", "beats", "slides", "tone", "end",
                "reel_copy", "format")
    if post.get("kind") == "sitcom":
        keys = ("kind", "story", "episode")
    if post.get("kind") == "film":
        keys = ("kind", "story", "style", "band", "film")
    keep = {k: post.get(k) for k in keys}
    scene = (post.get("film") or {}).get("scene") if post.get("kind") == "film" else None
    if scene and day_dir is not None and (Path(day_dir) / scene).exists():   # une vidéo réalisée : son code compte aussi
        keep["scene_code"] = hashlib.sha1((Path(day_dir) / scene).read_bytes()).hexdigest()
    return hashlib.sha1(json.dumps(keep, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]


def render(day_dir: Path, force=False) -> bool:
    post = json.loads((day_dir / "post.json").read_text())
    rj = day_dir / "render.json"
    fp = fingerprint(post, day_dir)
    if not force and rj.exists() and json.loads(rj.read_text()).get("fingerprint") == fp:
        return False
    for old in list(day_dir.glob("slide-*.jpg")) + list(day_dir.glob("tiktok-*.jpg")) + list(day_dir.glob("reel*")):
        old.unlink()
    if post.get("kind") == "carousel" and post.get("version") == 2:
        import carousel_v2  # Carrousel v2 « récit en diapositives » (17 novembre 2026)
        info = carousel_v2.render(post, day_dir)
    elif post.get("kind") == "sitcom":
        import sitcom_render  # Reel « sitcom » Max et le Prof (17 novembre 2026)
        info = sitcom_render.render(post, day_dir)
    elif post.get("kind") == "film":
        import film_render  # Reels en styles alternés (20 novembre 2026)
        info = film_render.render(post, day_dir)
    elif post.get("kind") == "reel" and post.get("version") == 2:
        import reel_v2  # Reel v2 « La question du jour » (17 novembre 2026)
        info = reel_v2.render(post, day_dir)
    else:
        info = render_reel(post, day_dir) if post.get("kind") == "reel" else render_carousel(post, day_dir)
    info.update({"fingerprint": fp, "kind": post.get("kind", "carousel")})
    rj.write_text(json.dumps(info, ensure_ascii=False, indent=1) + "\n")
    print(f"{day_dir.name} : {info['kind']} rendu ({', '.join(info['files'])})")
    return True


def main(args):
    force = "--force" in args
    days = [a for a in args if not a.startswith("--")]
    dirs = [SOCIAL / d for d in days] if days else sorted(p.parent for p in SOCIAL.glob("*/post.json"))
    done = 0
    for d in dirs:
        try:
            done += render(d, force)
        except Exception as e:  # un post raté ne bloque pas les autres
            print(f"::warning::Instagram {d.name} : rendu impossible ({e})")
    print(f"{done} post(s) Instagram rendu(s).")


if __name__ == "__main__":
    main(sys.argv[1:])
