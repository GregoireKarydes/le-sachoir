"""Reel v2 « La question du jour » (17 novembre 2026, voir le doc projet `claude/reel-v2.md`).

Un Reel court (20 à 30 s), fait pour être vu jusqu'au bout et envoyé à un ami : de vraies images (vidéos Pexels,
archives du domaine public de Wikimedia Commons, cases du Sachoir en secours), une voix Kokoro réglée phrase par phrase,
des sous-titres mot à mot, un bandeau titre jaune, de la musique sous la voix et des bruitages.

Entrée : `social/instagram/<date>/post.json` avec `"version": 2` et une liste `beats` (un temps = une phrase dite =
un plan), écrit par la tâche « Le Sachoir – Instagram » (`prompts/INSTAGRAM.md`).
Sortie : `reel.mp4` (1080 x 1920, 30 i/s) et `reel-cover.jpg`.

Images, dans l'ordre d'essai pour chaque plan (`show`) :
1. `{"video": "mots-clés en anglais"}` : vidéo libre de droits, Pexels (secret `PEXELS_API_KEY`) ou Pixabay (secret
   `PIXABAY_API_KEY`) ; sans clé, on passe (l'ancien nom `pexels` marche aussi) ;
2. `{"commons": "search terms"}` : image du domaine public ou CC0 sur Wikimedia Commons (sans clé), animée ;
3. `{"bd": 3}` : la case n° 3 de l'histoire liée (`story`) ;
4. `{"card": "TEXTE"}` : carte aux couleurs du Sachoir.
Un plan qui échoue retombe sur Commons (mêmes mots-clés), puis sur une case de l'histoire, puis sur une carte.

Musique : un fichier de `stock/music/` (mp3, wav ou m4a libre de droits, choisi selon la date) ; s'il n'y en a pas,
une boucle douce est synthétisée. Bruitages synthétisés (whoosh aux changements de plan, « ding » sur la réponse,
tic-tac du quiz)."""
import hashlib
import json
import math
import os
import random
import re
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "pipeline" / "fonts"
MUSIC = ROOT / "stock" / "music"
PRONUNCIATION = ROOT / "pipeline" / "prononciation.json"
W, H, FPS, SR = 1080, 1920, 30, 24000
UA = {"User-Agent": "LeSachoir/1.0 (https://lesachoir.fr; bonjour@lesachoir.fr)"}

# Réglages de la voix (Kokoro ff_siwis) par rôle : vitesse, silence après la phrase (s).
ROLE = {
    "hook": (1.15, 0.05), "tension": (1.10, 0.12), "explain": (1.05, 0.12), "question": (1.08, 0.15),
    "reveal": (1.05, 0.15), "answer": (1.00, 0.20), "end": (1.08, 0.10),
}
PAUSE_BEFORE = {"answer": 0.30, "reveal": 0.10}
MIN_BEAT, SPLIT_OVER = 1.2, 3.4  # un plan dure au moins 1,2 s ; au-delà de 3,4 s, il est coupé en deux plans

INK_ASS, YELLOW_ASS, WHITE_ASS = "&H000F1417", "&H002AB6F5", "&H00FFFFFF"  # couleurs ASS (BGR)
CREAM, INK, YELLOW = (250, 246, 238), (23, 20, 15), (245, 182, 42)


# ---------- voix ----------

_KOKORO = None


def clean(text):
    text = re.sub(r"[«»“”\"]", "", str(text))
    text = re.sub(r"[\U0001F300-\U0001FAFF☀-➿]", "", text)
    return " ".join(text.split())


def pronounce(text):
    """Applique pipeline/prononciation.json (mot ou expression → graphie lue correctement par la voix)."""
    try:
        table = json.loads(PRONUNCIATION.read_text())
    except (OSError, ValueError):
        table = {}
    for k, v in table.items():
        if k.startswith("_"):
            continue
        text = re.sub(rf"(?<!\w){re.escape(k)}(?!\w)", v, text, flags=re.IGNORECASE)
    text = re.sub(r"\s*%", " pour cent", text)
    return re.sub(r"\s*°C", " degrés", text)


def _trim(audio, thr=0.012, keep=0.04):
    import numpy as np
    idx = np.where(np.abs(audio) > thr)[0]
    if not len(idx):
        return audio
    a, b = max(0, idx[0] - int(SR * keep)), min(len(audio), idx[-1] + int(SR * keep))
    return audio[a:b]


def synth(text, speed):
    """Renvoie un tableau numpy float32 à 24 kHz. Kokoro, sinon espeak-ng, sinon silence de la bonne durée."""
    import numpy as np
    global _KOKORO
    said = pronounce(clean(text))
    if not said:
        return np.zeros(int(SR * 0.3), dtype=np.float32)
    if _KOKORO is not False:
        try:
            if _KOKORO is None:
                from kokoro import KPipeline  # noqa
                _KOKORO = KPipeline(lang_code="f")
            chunks = [np.asarray(a, dtype=np.float32) for _, _, a in _KOKORO(said, voice="ff_siwis", speed=speed)]
            if chunks:
                return _trim(np.concatenate(chunks))
        except Exception as e:  # noqa
            print(f"Kokoro indisponible ({e}), repli espeak-ng.")
            _KOKORO = False
    if shutil.which("espeak-ng"):
        with tempfile.NamedTemporaryFile(suffix=".wav") as f:
            subprocess.run(["espeak-ng", "-v", "fr", "-s", str(int(160 * speed)), "-w", f.name, said],
                           check=True, capture_output=True)
            return _trim(_read_wav(f.name))
    secs = max(0.8, syllables(said) * 0.16 / speed)
    return np.zeros(int(SR * secs), dtype=np.float32)


def _read_wav(path):
    import numpy as np
    with wave.open(str(path)) as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1:
        data = data.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        data = np.interp(np.linspace(0, len(data) - 1, int(len(data) * SR / sr)), np.arange(len(data)), data)
    return data.astype(np.float32)


def write_wav(path, audio):
    import numpy as np
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def syllables(word):
    return max(1, len(re.findall(r"[aeiouyàâäéèêëîïôöùûüœæ]+", word.lower())))


def word_times(text, start, secs):
    """Minutage estimé de chaque mot dans une phrase (au prorata des syllabes et de la ponctuation)."""
    words = clean(text).split()
    weights = []
    for w in words:
        wt = syllables(w)
        if w[-1:] in ",;:":
            wt += 1.2
        elif w[-1:] in ".?!…":
            wt += 1.6
        weights.append(wt)
    total = sum(weights) or 1
    t, out = start, []
    for w, wt in zip(words, weights):
        d = secs * wt / total
        out.append((w, t, t + d))
        t += d
    return out


# ---------- images ----------

def pexels_clip(query, used, folder, min_secs):
    key = os.environ.get("PEXELS_API_KEY", "").strip()
    if not key or not query:
        return None
    try:
        r = requests.get("https://api.pexels.com/videos/search", headers={"Authorization": key}, timeout=30,
                         params={"query": query, "orientation": "portrait", "size": "medium", "per_page": 15})
        r.raise_for_status()
        videos = r.json().get("videos", [])
    except Exception as e:  # noqa
        print(f"Pexels « {query} » : {e}")
        return None
    for v in videos:
        if v["id"] in used or v.get("duration", 0) < min_secs:
            continue
        files = [f for f in v.get("video_files", []) if f.get("width") and f.get("height")
                 and f["height"] > f["width"] and f["height"] >= 1280 and f.get("file_type") == "video/mp4"]
        if not files:
            continue
        f = min(files, key=lambda x: abs(x["height"] - 1920))
        dst = folder / f"pexels-{v['id']}.mp4"
        try:
            with requests.get(f["link"], stream=True, timeout=120) as resp:
                resp.raise_for_status()
                with open(dst, "wb") as out:
                    for chunk in resp.iter_content(1 << 16):
                        out.write(chunk)
        except Exception as e:  # noqa
            print(f"Pexels : téléchargement raté ({e})")
            continue
        used.add(v["id"])
        return {"kind": "video", "path": dst, "duration": v.get("duration", 0), "credit": f"Pexels / {v.get('user', {}).get('name', '')}"}
    return None


def pixabay_clip(query, used, folder, min_secs):
    """Vidéo libre de droits Pixabay (secret `PIXABAY_API_KEY`), téléchargée (jamais liée directement)."""
    key = os.environ.get("PIXABAY_API_KEY", "").strip()
    if not key or not query:
        return None
    try:
        r = requests.get("https://pixabay.com/api/videos/", timeout=30, params={
            "key": key, "q": query[:100], "per_page": 20, "safesearch": "true", "video_type": "film"})
        r.raise_for_status()
        hits = r.json().get("hits", [])
    except Exception as e:  # noqa
        print(f"Pixabay « {query} » : {e}")
        return None
    def files(h):
        return [v for v in (h.get("videos") or {}).values() if v.get("url") and v.get("height", 0) >= 720]
    # Les vidéos verticales d'abord ; sinon un plan horizontal recadré au centre.
    hits = sorted(hits, key=lambda h: not any(f["height"] > f["width"] for f in files(h)))
    for h in hits:
        if ("pixabay", h["id"]) in used or h.get("duration", 0) < min_secs or not files(h):
            continue
        f = min(files(h), key=lambda x: abs(x["height"] - 1920))
        dst = folder / f"pixabay-{h['id']}.mp4"
        try:
            with requests.get(f["url"], stream=True, timeout=120) as resp:
                resp.raise_for_status()
                with open(dst, "wb") as out:
                    for chunk in resp.iter_content(1 << 16):
                        out.write(chunk)
        except Exception as e:  # noqa
            print(f"Pixabay : téléchargement raté ({e})")
            continue
        used.add(("pixabay", h["id"]))
        return {"kind": "video", "path": dst, "duration": h.get("duration", 0), "credit": "Pixabay"}
    return None


def video_clip(query, used, folder, min_secs):
    """Plan vidéo : Pexels si sa clé existe, sinon Pixabay."""
    return pexels_clip(query, used, folder, min_secs) or pixabay_clip(query, used, folder, min_secs)


def commons_image(query, used, folder):
    """Image du domaine public ou CC0 sur Wikimedia Commons (aucune attribution exigée)."""
    if not query:
        return None
    try:
        r = requests.get("https://commons.wikimedia.org/w/api.php", headers=UA, timeout=30, params={
            "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrlimit": 20,
            "gsrsearch": f"filetype:bitmap {query}", "prop": "imageinfo", "iiprop": "url|size|extmetadata",
            "iiurlwidth": 1600})
        r.raise_for_status()
        pages = sorted(r.json().get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    except Exception as e:  # noqa
        print(f"Commons « {query} » : {e}")
        return None
    for p in pages:
        info = (p.get("imageinfo") or [{}])[0]
        lic = (info.get("extmetadata", {}).get("LicenseShortName", {}) or {}).get("value", "").lower()
        if p["title"] in used or info.get("width", 0) < 700 or not ("public domain" in lic or "cc0" in lic or lic == "pd"):
            continue
        url = info.get("thumburl") or info.get("url")
        dst = folder / ("commons-" + hashlib.sha1(p["title"].encode()).hexdigest()[:10] + ".jpg")
        try:
            resp = requests.get(url, headers=UA, timeout=60)
            resp.raise_for_status()
            dst.write_bytes(resp.content)
            Image.open(dst).convert("RGB").save(dst, quality=92)
        except Exception as e:  # noqa
            print(f"Commons : téléchargement raté ({e})")
            continue
        used.add(p["title"])
        return {"kind": "image", "path": dst, "credit": "Wikimedia Commons"}
    return None


def story_images(post):
    """Images dessinées de l'histoire liée (`story`), dans l'ordre des cases : {n: chemin}."""
    src = post.get("story") or {}
    try:
        ed_dir = ROOT / "editions" / src["edition"]
        ed = json.loads((ed_dir / "edition.json").read_text())
        fmt = next(f for f in ed["formats"] if f["id"] == src["format"])
    except Exception:  # noqa
        return {}
    out = {}
    for c in fmt.get("cases", []):
        f = (c.get("image") or {}).get("file")
        if f and (ed_dir / f).exists():
            out[c.get("n")] = ed_dir / f
    cover = (fmt.get("cover") or {}).get("file")
    if cover and (ed_dir / cover).exists():
        out.setdefault(0, ed_dir / cover)
    return out


def card_image(text, folder, name):
    """Carte texte aux couleurs du Sachoir. Le texte occupe le milieu haut (540 à 1040 px) : le bas reste aux
    sous-titres et au compte à rebours."""
    from social_render import font, wrap  # noqa
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    for i in range(0, W + H, 90):  # rayures discrètes, pour que la carte ne soit pas un aplat mort
        d.line([(i, 0), (i - H, H)], fill=(244, 238, 226), width=28)
    text, box_w, box_h = (text or "?").upper(), W - 220, 500
    size = 150
    while True:
        fnt = font("serif", size)
        lines = wrap(d, text, fnt, box_w)
        lh = sum(fnt.getmetrics())
        if (max(d.textlength(x, font=fnt) for x in lines) <= box_w and len(lines) * lh <= box_h) or size <= 48:
            break
        size -= 6
    y = 540 + (box_h - len(lines) * lh) // 2
    for line in lines:
        tw = d.textlength(line, font=fnt)
        x = (W - tw) // 2
        d.rectangle([x - 22, y + 6, x + tw + 22, y + lh - 2], fill=YELLOW)
        d.text((x, y), line, font=fnt, fill=INK)
        y += lh
    p = folder / f"card-{name}.jpg"
    img.save(p, quality=92)
    return {"kind": "image", "path": p, "credit": "", "card": True}


def end_image(post, bd, folder):
    """Carte finale : la case de BD en fond flouté, logo, promesse, adresse du site."""
    from social_render import font, logo  # noqa
    first = next(iter(bd.values()), None)
    if first:
        from social_render import cover_crop  # noqa
        bg = cover_crop(Image.open(first), W, H).filter(ImageFilter.GaussianBlur(18))
        bg = Image.blend(bg, Image.new("RGB", (W, H), INK), 0.55)
    else:
        bg = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(bg)
    card_w, card_h = 900, 760
    x0, y0 = (W - card_w) // 2, 520
    d.rounded_rectangle([x0, y0, x0 + card_w, y0 + card_h], radius=48, fill=CREAM)
    lg = logo(560)
    bg.paste(lg, ((W - lg.width) // 2, y0 + 70), lg)
    f1, f2 = font("serif", 62), font("sans", 54)
    lines = ["Une question comme ça", "chaque matin, en BD"]
    y = y0 + 110 + lg.height
    for line in lines:
        d.text(((W - d.textlength(line, font=f1)) // 2, y), line, font=f1, fill=INK)
        y += 80
    site = "lesachoir.fr"
    tw = d.textlength(site, font=f2)
    d.rounded_rectangle([(W - tw) // 2 - 40, y + 40, (W + tw) // 2 + 40, y + 140], radius=50, fill=YELLOW)
    d.text(((W - tw) // 2, y + 56), site, font=f2, fill=INK)
    p = folder / "end.jpg"
    bg.save(p, quality=92)
    return {"kind": "image", "path": p, "credit": ""}


def pick_source(beat, i, post, bd, used, folder, secs):
    show = beat.get("show") or {}
    if beat.get("role") == "end":
        return end_image(post, bd, folder)
    src = None
    words = show.get("video") or show.get("pexels")
    if words:
        src = video_clip(words, used, folder, secs)
    if not src and (show.get("commons") or words):
        src = commons_image(show.get("commons") or words, used, folder)
    if not src and show.get("bd") is not None and bd.get(show["bd"]):
        src = {"kind": "image", "path": bd[show["bd"]], "credit": ""}
    if not src and bd and not show.get("card"):
        keys = sorted(bd)
        src = {"kind": "image", "path": bd[keys[i % len(keys)]], "credit": ""}
    if not src:
        src = card_image(show.get("card") or beat.get("big") or post.get("title", ""), folder, f"{i:02d}")
    return src


# ---------- montage ----------

def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def clip(src, secs, out, motion, offset=0.0):
    """Un plan de `secs` secondes en 1080 x 1920, 30 i/s, sans son. `motion` : in, out, left, right, punch."""
    frames = max(1, round(secs * FPS))
    if src["kind"] == "video":
        z = 0.12 if motion == "punch" else 0.05
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
              f"scale=w='{W}*(1+{z}*t/{secs:.3f})':h='{H}*(1+{z}*t/{secs:.3f})':eval=frame,crop={W}:{H},"
              f"setsar=1,fps={FPS},format=yuv420p")
        start = min(offset, max(0.0, src.get("duration", 0) - secs - 0.2))
        cmd = ["ffmpeg", "-y", "-ss", f"{start:.2f}", "-i", str(src["path"]), "-vf", vf, "-an", "-frames:v", str(frames)]
    else:
        n = frames
        zexp = {"in": f"1+0.10*on/{n}", "out": f"1.10-0.10*on/{n}", "left": "1.12", "right": "1.12",
                "punch": f"1+0.16*min(on/{max(1, n // 3)}\\,1)"}[motion]
        xexp = {"left": f"(iw-iw/zoom)*(1-on/{n})", "right": f"(iw-iw/zoom)*on/{n}"}.get(motion, "iw/2-(iw/zoom/2)")
        vf = (f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,crop={W * 2}:{H * 2},"
              f"zoompan=z='{zexp}':x='{xexp}':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p")
        cmd = ["ffmpeg", "-y", "-loop", "1", "-i", str(src["path"]), "-vf", vf, "-frames:v", str(frames)]
    run(cmd + ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-r", str(FPS), str(out)])


def ass_time(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_escape(s):
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


def build_ass(post, words, bigs, counts, total, path, number):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Roboto,76,{WHITE_ASS},{WHITE_ASS},{INK_ASS},&H64000000,-1,0,0,0,100,100,0,0,1,7,2,2,90,90,520,1
Style: Title,Roboto,82,{INK_ASS},{INK_ASS},{YELLOW_ASS},{YELLOW_ASS},-1,0,0,0,100,100,0,0,3,22,0,8,80,80,300,1
Style: Series,Roboto,40,{WHITE_ASS},{WHITE_ASS},{INK_ASS},&H64000000,-1,0,0,0,100,100,2,0,1,4,1,8,80,80,200,1
Style: Big,Roboto,140,{YELLOW_ASS},{YELLOW_ASS},{INK_ASS},&H64000000,-1,0,0,0,100,100,0,0,1,10,3,5,80,80,0,1
Style: Count,Roboto,300,{WHITE_ASS},{WHITE_ASS},{INK_ASS},&H64000000,-1,0,0,0,100,100,0,0,1,12,4,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    title = ass_escape((post.get("title") or "").upper())
    end_at = total - 0.05
    if title:
        ev.append(f"Dialogue: 2,{ass_time(0.25)},{ass_time(min(4.2, end_at))},Title,,0,0,0,,"
                  f"{{\\fad(120,200)\\t(0,180,\\fscx106\\fscy106)\\t(180,320,\\fscx100\\fscy100)}}{title}")
    label = ass_escape(post.get("series_label") or f"LA QUESTION DU JOUR · N° {number}")
    ev.append(f"Dialogue: 1,{ass_time(0)},{ass_time(end_at)},Series,,0,0,0,,{label}")
    # Sous-titres mot à mot : groupes de 2 à 4 mots, coupés à la ponctuation ; le mot dit est en jaune.
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 4 or w[0][-1:] in ",.;:?!…":
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    for g in groups:
        for j, (_, s, e) in enumerate(g):
            e2 = g[j + 1][1] if j + 1 < len(g) else e
            txt = " ".join((f"{{\\c{YELLOW_ASS}&}}{ass_escape(x)}{{\\c{WHITE_ASS}&}}" if k == j else ass_escape(x))
                           for k, (x, _, _) in enumerate(g))
            ev.append(f"Dialogue: 0,{ass_time(s)},{ass_time(e2)},Sub,,0,0,0,,{txt}")
    for text, s, e, _ in bigs:
        ev.append(f"Dialogue: 3,{ass_time(s)},{ass_time(e)},Big,,0,0,0,,"
                  f"{{\\fad(80,120)\\fscx60\\fscy60\\t(0,160,\\fscx108\\fscy108)\\t(160,260,\\fscx100\\fscy100)}}{ass_escape(text)}")
    for text, s, e in counts:
        ev.append(f"Dialogue: 3,{ass_time(s)},{ass_time(e)},Count,,0,0,0,,"
                  f"{{\\pos(540,1200)\\fad(60,60)\\fscx130\\fscy130\\t(0,200,\\fscx100\\fscy100)}}{text}")
    path.write_text(head + "\n".join(ev) + "\n", encoding="utf-8")


# ---------- son ----------

def sfx_track(total, cuts, dings, ticks):
    import numpy as np
    n = int(SR * (total + 0.5))
    out = np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(7)

    def add(sig, t):
        a = int(SR * t)
        if a < n:
            b = min(n, a + len(sig))
            out[a:b] += sig[: b - a]

    L = int(SR * 0.32)
    tt = np.linspace(0, 1, L)
    noise = rng.standard_normal(L).astype(np.float32)
    smooth = np.convolve(noise, np.ones(18) / 18, mode="same")  # bruit adouci
    whoosh = (smooth * np.sin(np.pi * tt) ** 2 * 0.35).astype(np.float32)
    td = np.arange(int(SR * 0.9)) / SR
    ding = ((np.sin(2 * np.pi * 1318.5 * td) + 0.6 * np.sin(2 * np.pi * 1975.5 * td)) * np.exp(-td * 5) * 0.18).astype(np.float32)
    tk = np.arange(int(SR * 0.06)) / SR
    tick = (np.sin(2 * np.pi * 2200 * tk) * np.exp(-tk * 90) * 0.35).astype(np.float32)
    for t in cuts:
        add(whoosh, max(0.0, t - 0.16))
    for t in dings:
        add(ding, t)
    for t in ticks:
        add(tick, t)
    return out


def synth_music(secs, seed):
    """Boucle douce de secours (96 bpm, Am–F–C–G, arpèges, petite grosse caisse). Mieux : un vrai titre dans stock/music/."""
    import numpy as np
    bpm = 96
    beat = 60 / bpm
    n = int(SR * secs)
    out = np.zeros(n, dtype=np.float32)
    chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]
    rng = random.Random(seed)
    rng.shuffle(chords[1:])

    def hz(m):
        return 440 * 2 ** ((m - 69) / 12)

    step = beat / 2
    i = 0
    while i * step < secs:
        t0 = i * step
        chord = chords[int(t0 // (beat * 4)) % 4]
        note = chord[[0, 2, 1, 3, 2, 1, 3, 2][i % 8]] + 12
        L = int(SR * min(0.6, secs - t0))
        tt = np.arange(L) / SR
        f = hz(note)
        sig = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 6) * 0.12
        a = int(SR * t0)
        out[a:a + L] += sig[: n - a]
        if i % 2 == 0 and (i // 2) % 2 == 0:  # grosse caisse sur les temps 1 et 3
            Lk = int(SR * 0.18)
            tk = np.arange(Lk) / SR
            kick = np.sin(2 * np.pi * (50 + 70 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 18) * 0.35
            out[a:a + Lk] += kick[: max(0, min(Lk, n - a))]
        if i % 8 == 0:  # nappe basse à chaque mesure
            Lp = int(SR * min(beat * 4, secs - t0))
            tp = np.arange(Lp) / SR
            pad = sum(np.sin(2 * np.pi * hz(m - 12) * tp) for m in chord[:3]) * 0.03
            pad *= np.minimum(1, tp / 0.4) * np.minimum(1, (Lp / SR - tp) / 0.4)
            out[a:a + Lp] += pad[: n - a]
        i += 1
    return (out / max(1e-6, np.abs(out).max()) * 0.5).astype(np.float32)


def music_file(post, total, folder):
    tracks = sorted(p for p in MUSIC.glob("*") if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".ogg")) if MUSIC.exists() else []
    if tracks:
        h = int(hashlib.sha1(post.get("date", "").encode()).hexdigest(), 16)
        return tracks[h % len(tracks)]
    p = folder / "music.wav"
    write_wav(p, synth_music(total + 1, post.get("date", "")))
    return p


# ---------- Reel ----------

def reel_number(post):
    if post.get("number"):
        return int(post["number"])
    social = ROOT / "social" / "instagram"
    n = 0
    for pj in sorted(social.glob("*/post.json")):
        try:
            p = json.loads(pj.read_text())
        except ValueError:
            continue
        if p.get("version") == 2 and p.get("date", "") <= post.get("date", ""):
            n += 1
    return max(1, n)


def render(post, out: Path):
    import numpy as np
    tmp = Path(tempfile.mkdtemp())
    bd = story_images(post)
    beats = [b for b in post.get("beats", []) if b.get("say") or b.get("role") in ("countdown", "end")]
    if not beats:
        raise ValueError("post v2 sans « beats »")
    if beats[-1].get("role") != "end":
        beats.append({"role": "end", "say": "Une question comme ça chaque matin, sur lesachoir point f r."})

    # 1. Voix, phrase par phrase, et minutage
    voice, words, bigs, counts, plan = [], [], [], [], []
    dings, ticks = [], []
    t = 0.0
    for b in beats:
        role = b.get("role", "explain")
        if role == "countdown":
            secs = float(b.get("secs", 3))
            for k in range(int(secs)):
                counts.append((str(int(secs) - k), t + k, t + k + 0.95))
                ticks += [t + k, t + k + 0.5]
            voice.append(np.zeros(int(SR * secs), dtype=np.float32))
            plan.append((b, t, secs))
            t += secs
            continue
        speed, after = ROLE.get(role, ROLE["explain"])
        before = PAUSE_BEFORE.get(role, 0.0)
        audio = synth(b["say"], float(b.get("speed", speed)))
        said = len(audio) / SR
        secs = max(MIN_BEAT, before + said + after)
        if role == "end":
            secs = max(secs, 2.2)
        chunk = np.zeros(int(SR * secs), dtype=np.float32)
        a = int(SR * before)
        chunk[a:a + len(audio)] = audio[: len(chunk) - a]
        voice.append(chunk)
        if role != "end":
            words += word_times(b["say"], t + before, said)
        if b.get("big"):
            bigs.append((b["big"], t + before, t + secs - 0.05, len(plan)))
        if role in ("answer", "reveal"):
            dings.append(t + before)
        plan.append((b, t, secs))
        t += secs
    total = t
    voice = np.concatenate(voice)
    write_wav(tmp / "voice.wav", voice)

    # 2. Plans (un plan au plus 3,4 s : au-delà, deux plans de la même source ou de deux sources)
    used, segs, cuts, credits = set(), [], [], set()
    motions = ["in", "right", "out", "left"]
    prev_src = None
    for i, (b, start, secs) in enumerate(plan):
        if b.get("role") == "countdown" and prev_src:
            src = prev_src
        else:
            src = pick_source(b, i, post, bd, used, tmp, secs)
        parts = [secs] if (secs <= SPLIT_OVER or b.get("role") == "end") else [secs / 2, secs / 2]
        for j, part in enumerate(parts):
            s2 = src
            if j == 1 and src["kind"] == "video":
                show = b.get("show") or {}
                s2 = video_clip(show.get("video") or show.get("pexels"), used, tmp, part) or src
            motion = "punch" if (i == 0 and j == 0) else motions[(i + j) % 4]
            if b.get("role") == "end":
                motion = "in"
            seg = tmp / f"seg{len(segs):02d}.mp4"
            clip(s2, part, seg, motion, offset=0.4 + j * part)
            segs.append(seg)
            if start > 0 or j > 0:
                cuts.append(start + j * parts[0])
        prev_src = src
        if src.get("card"):  # une carte affiche déjà son texte : pas de gros mot par-dessus
            bigs = [x for x in bigs if x[3] != i]
        if src.get("credit"):
            credits.add(src["credit"])
    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in segs))
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(tmp / "video.mp4")])

    # 3. Son : voix traitée, musique qui baisse sous la voix, bruitages, volume Instagram (−14 LUFS)
    write_wav(tmp / "sfx.wav", sfx_track(total, cuts, dings, ticks))
    music = music_file(post, total, tmp)
    build_ass(post, words, bigs, counts, total, tmp / "subs.ass", reel_number(post))
    from social_render import logo  # noqa
    logo(210).save(tmp / "logo.png")
    fc = (
        "[0:v][4:v]overlay=54:96:format=auto,"
        f"ass={tmp / 'subs.ass'}:fontsdir={FONTS},format=yuv420p[v];"
        "[1:a]highpass=f=80,deesser,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=2,asplit=2[vo][key];"
        "[2:a]aformat=sample_rates=24000:channel_layouts=mono,volume=0.22[mu];"
        "[mu][key]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];"
        "[3:a]volume=0.9[fx];"
        "[vo][duck][fx]amix=inputs=3:normalize=0:duration=first,"
        "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[a]"
    )
    cmd = ["ffmpeg", "-y", "-i", str(tmp / "video.mp4"), "-i", str(tmp / "voice.wav")]
    cmd += (["-stream_loop", "-1"] if music.suffix != ".wav" or music.parent != tmp else []) + ["-i", str(music)]
    cmd += ["-i", str(tmp / "sfx.wav"), "-i", str(tmp / "logo.png"), "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
            "-t", f"{total:.2f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-movflags", "+faststart", str(out / "reel.mp4")]
    run(cmd)
    run(["ffmpeg", "-y", "-ss", "1.2", "-i", str(out / "reel.mp4"), "-frames:v", "1", "-q:v", "3", str(out / "reel-cover.jpg")])
    shutil.rmtree(tmp, ignore_errors=True)
    return {"files": ["reel.mp4"], "cover": "reel-cover.jpg", "seconds": round(total, 1), "version": 2,
            "music": music.name if music.parent == MUSIC else "synthèse", "credits": sorted(credits)}
