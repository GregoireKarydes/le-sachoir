"""Reel « sitcom » du Sachoir (17 novembre 2026) : un dessin animé de 25 à 40 s, style sitcom de science-fiction,
aux couleurs du Sachoir. Duo récurrent : MAX (curieux, inquiet) pose la question ; LE PROF (pince-sans-rire) ouvre la Machine à
Savoir, un portail jaune, et les emmène dans un ou deux mondes ; retour au labo, chute, carte de fin lesachoir.fr.

Entrée : `social/instagram/<date>-sitcom/post.json` avec `"kind": "sitcom"` et un `episode` (voir `prompts/INSTAGRAM.md`, partie C),
écrit chaque jour par la tâche « Le Sachoir – Reel sitcom ».
Sortie : `reel.mp4` (1080 x 1920, 24 i/s, −14 LUFS) et `reel-cover.jpg`.

Chaîne : voix Microsoft Edge brutes (Rémy pour le Prof, Fabrice pour Max ; secours Kokoro) → minutage des scènes et des plans →
images du sujet (Wikimedia Commons ou cases de la BD liée) → page `pipeline/sitcom/` (Canvas, trait qui « bout ») filmée image par
image avec Playwright → musique et bruitages synthétisés (`sitcom_score.py`) → mixage → ffmpeg (loudnorm en deux passes).
Moteur de dessin adapté de Lemo-Opuscar (style Sci-Fi Sitcom Toon, code MIT)."""
import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "pipeline" / "sitcom"
SR = 48000
FPS = 24
sys.path.insert(0, str(ROOT / "pipeline"))

VOICES = {   # Microsoft Edge (neural, gratuit, sans clé). Choix de Greg (17 nov.) : voix brutes, sans traitement ni réglage.
    "prof": {"voice": "fr-FR-RemyMultilingualNeural", "rate": 0, "pitch": 0},
    "max": {"voice": "fr-CH-FabriceNeural", "rate": 0, "pitch": 0},
}
EMO_TTS = {}   # pas de débit ni de hauteur selon l'émotion : ça sonnait faux
MAX_EMO = {"curious", "panic", "shock", "happy", "proud", "bored", "think", "wow"}
PROF_EMO = {"deadpan", "smug", "tired", "alarmed", "explain", "happy"}
SETS = {"paris-ancien", "ville", "ciel", "espace", "mer", "nature", "antiquite", "moyen-age", "desert", "neige", "cuisine", "usine", "corps", "bureau", "musee", "futur"}


# ---------- voix ----------
def tts_text(text):
    from reel_v2 import clean, pronounce
    return pronounce(clean(text))


async def _edge(text, voice, rate, pitch, out):
    import edge_tts
    c = edge_tts.Communicate(text, voice, rate=f"{rate:+d}%", pitch=f"{pitch:+d}Hz")
    await c.save(str(out))


def _kokoro(text, out_wav):
    """Secours sans réseau : Kokoro (seule voix française ff_siwis)."""
    d = os.environ.get("KOKORO_ONNX_DIR")
    if d:
        from kokoro_onnx import Kokoro
        k = Kokoro(f"{d}/kokoro-v1.0.onnx", f"{d}/voices-v1.0.bin")
        a, sr = k.create(text, voice="ff_siwis", speed=1.05, lang="fr-fr")
    else:
        from kokoro import KPipeline
        pipe = KPipeline(lang_code="f")
        a = np.concatenate([np.asarray(x[2]) for x in pipe(text, voice="ff_siwis", speed=1.05)]); sr = 24000
    import soundfile as sf
    sf.write(str(out_wav), a, sr)


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def read_wav(path):
    import soundfile as sf
    a, sr = sf.read(str(path), always_2d=False)
    if a.ndim > 1:
        a = a.mean(1)
    if sr != SR:
        from scipy.signal import resample_poly
        a = resample_poly(a, SR, sr)
    return a.astype(np.float64)


def process_voice(a, who):
    """Voix brute (choix de Greg) : on coupe seulement les silences du début et de la fin et on règle le volume."""
    e = np.abs(a); thr = max(1e-4, e.max() * .02); idx = np.where(e > thr)[0]
    if len(idx):
        a = a[max(0, idx[0] - int(.02 * SR)):idx[-1] + int(.06 * SR)]
    return a / (np.sqrt((a ** 2).mean()) + 1e-9) * .1


def envelope(a):
    hop = SR // FPS
    n = int(np.ceil(len(a) / hop))
    r = np.array([np.sqrt((a[i * hop:(i + 1) * hop] ** 2).mean() + 1e-12) for i in range(n)])
    p = np.percentile(r, 95) or 1
    return [round(float(min(1, x / p)), 3) for x in r]


def voices(lines, tmp):
    """Une voix par réplique : Edge TTS, sinon Kokoro. Renvoie {id: tableau 48 kHz}."""
    out, used = {}, set()
    for L in lines:
        who = L["who"]; v = VOICES[who]; dr, dp = EMO_TTS.get(L.get("emo"), (0, 0))
        mp3, wav = tmp / f"{L['id']}.mp3", tmp / f"{L['id']}.wav"
        text = tts_text(L.get("say") or L["text"])
        ok = False
        if os.environ.get("SITCOM_TTS", "edge") == "edge":
            for _ in range(3):
                try:
                    asyncio.run(_edge(text, v["voice"], v["rate"] + dr, v["pitch"] + dp, mp3))
                    ffmpeg("-i", str(mp3), "-ac", "1", "-ar", str(SR), str(wav)); ok = True; used.add("edge"); break
                except Exception as e:  # noqa
                    print(f"Edge TTS ({L['id']}) : {e}")
        if not ok:
            _kokoro(text, wav); used.add("kokoro")
        out[L["id"]] = process_voice(read_wav(wav), who)
    return out, used


# ---------- minutage ----------
def build_timeline(ep, audio):
    """Scènes, répliques et plans. Chaque début de scène est calé sur la grille de la musique (demi-temps à 120 BPM)."""
    grid = .25
    snap = lambda t: round(np.ceil(t / grid - 1e-6) * grid, 3)
    scenes, lines, shots, silences = [], [], [], []
    t = 0.0
    raw = ep["scenes"]
    n_scenes = len(raw)
    for si, S in enumerate(raw):
        kind = S["kind"]
        s = {"kind": kind, "t0": round(float(t), 3)}
        if kind == "world":
            s.update({k: S.get(k) for k in ("set", "palette", "tag", "big", "small", "bidule") if S.get(k) is not None})
            s["enter"] = True
        if kind == "home" and si > 0:
            s["back"] = True; s["enter"] = True
        nxt = raw[si + 1]["kind"] if si + 1 < n_scenes else "end"
        leaves = nxt == "world" or (kind == "world" and nxt == "home")
        cur = t + (.75 if s.get("enter") else .2)
        if kind == "world":
            shots.append({"t0": s["t0"], "cam": "two", "push": .02})   # landing shot
        first = True
        for li, L in enumerate(S.get("lines", [])):
            a = audio[L["id"]]; d = len(a) / SR
            pause = float(L.get("pause", 0))
            if pause:
                silences.append([round(cur, 3), round(cur + pause, 3)])
            cur += pause
            line = {"id": L["id"], "who": L["who"], "t": round(cur, 3), "dur": round(d, 3), "text": L["text"], "emo": L.get("emo"),
                    "env": envelope(a)}
            for k in ("react", "shake", "arm"):
                if L.get(k):
                    line[k] = L[k]
            lines.append(line)
            # shots: the director's rules (hook close-up, reaction close-ups, screen insert on the first explanation in a world)
            cam = L.get("cam")
            if not cam:
                if kind == "world" and first:
                    cam = "screen"
                elif L.get("shake") or L.get("emo") in ("shock", "panic"):
                    cam = "cu_max" if L["who"] == "max" else "cu_prof"
                elif si == 0 and li == 0:
                    cam = "cu_max" if L["who"] == "max" else "cu_prof"
                elif L.get("pause"):
                    cam = "cu_" + L["who"]
                else:
                    cam = "two" if li % 2 == 0 else ("cu_" + L["who"])
            if shots and shots[-1]["cam"] == cam:
                pass
            else:
                if shots:
                    shots[-1]["t1"] = round(cur - .08, 3)
                shots.append({"t0": round(cur - .08 if len(shots) else 0, 3), "cam": cam})
            first = False
            cur += d + .18
        if kind == "home" and leaves:
            s["portal"] = [round(cur + .35, 3), 99]
            s["press"] = [round(cur, 3), round(cur + .6, 3)]
            if shots:
                shots[-1]["t1"] = round(cur, 3)
            shots.append({"t0": round(cur, 3), "cam": "wide", "push": .08})
            cur += 1.6
        elif kind == "world" and leaves:
            if shots:
                shots[-1]["t1"] = round(cur, 3)
            shots.append({"t0": round(cur, 3), "cam": "wide", "push": .05})
            cur += 1.2
        else:
            cur += .5
        if leaves:
            s["exit"] = True
        s["t1"] = float(snap(cur))
        scenes.append(s)
        t = s["t1"]
    scenes.append({"kind": "end", "t0": t, "t1": round(t + 2.4, 3)})
    dur = scenes[-1]["t1"]
    # punchline silence lasts until the end card
    if silences:
        silences[-1][1] = max(silences[-1][1], max(l["t"] + l["dur"] for l in lines) + .2)
        silences[-1][1] = min(silences[-1][1], scenes[-1]["t0"])
    # tidy shots: sort, close intervals, fill gaps
    shots.sort(key=lambda x: x["t0"])
    clean = []
    for sh in shots:
        if clean and abs(clean[-1]["t0"] - sh["t0"]) < .05:
            clean[-1] = sh; continue
        clean.append(sh)
    for i, sh in enumerate(clean):
        sh["t1"] = clean[i + 1]["t0"] if i + 1 < len(clean) else dur
        sh["t0"] = round(sh["t0"], 3); sh["t1"] = round(sh["t1"], 3)
    # subtitles hold: max(dur + .35, .9 + chars/17), cut at the next line / scene change
    for i, l in enumerate(lines):
        hold = max(l["dur"] + .35, .9 + len(l["text"]) / 17)
        end = l["t"] + hold
        nxt = lines[i + 1]["t"] - .05 if i + 1 < len(lines) else dur
        sc_end = next(s["t1"] for s in scenes if s["t0"] <= l["t"] < s["t1"])
        l["sub_t1"] = round(min(end, nxt, sc_end - .25 if sc_end - .25 > l["t"] + l["dur"] else sc_end), 3)
    return {"dur": dur, "fps": FPS, "scenes": scenes, "lines": lines, "shots": clean, "silences": silences,
            "band": {"text": ep.get("band", ""), "t0": .15, "t1": round(scenes[0]["t1"] - 1.0, 3)},
            "board": ep.get("board") or ["QUESTION DU JOUR", ""], "end": ep.get("end") or {}}


# ---------- images du sujet ----------
def fetch_images(post, ep, folder):
    from reel_v2 import commons_image, story_images
    bd = story_images(post)
    used, out = set(), {}
    for i, S in enumerate(ep["scenes"]):
        im = S.get("image") or {}
        src = None
        if im.get("bd") is not None and bd.get(im["bd"]):
            src = bd[im["bd"]]
        elif im.get("commons"):
            r = commons_image(im["commons"], used, folder)
            src = r["path"] if r else None
        if src:
            name = f"img{i}.jpg"
            from PIL import Image
            Image.open(src).convert("RGB").save(folder / name, quality=90)
            out[i] = name
    return out


# ---------- capture des images ----------
def _capture(args):
    ep_dir, t_list, frames_dir = args
    from playwright.sync_api import sync_playwright
    exe = os.environ.get("SITCOM_CHROME")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
        pg = b.new_page(viewport={"width": 1080, "height": 1920})
        pg.goto(f"http://127.0.0.1:{os.environ['SITCOM_PORT']}/index.html?ep={ep_dir}&t=0")
        pg.wait_for_function("window.READY === true", timeout=60000)
        for i, t in t_list:
            pg.evaluate(f"window.render({t})")
            pg.screenshot(path=str(Path(frames_dir) / f"{i:05d}.jpg"), type="jpeg", quality=92)
        b.close()
    return len(t_list)


def capture(dur, frames_dir, workers=4, ep_dir="ep"):
    import http.server
    import socketserver
    import threading
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=str(PAGE), **k)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    os.environ["SITCOM_PORT"] = str(srv.server_address[1])
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    n = int(round(dur * FPS))
    jobs = [[(i, i / FPS) for i in range(k, n, workers)] for k in range(workers)]
    with ProcessPoolExecutor(workers) as ex:
        list(ex.map(_capture, [(ep_dir, j, str(frames_dir)) for j in jobs]))
    srv.shutdown()
    return n


def events_of(ep_dir="ep"):
    import http.server
    import socketserver
    import threading
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=str(PAGE), **k)
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    from playwright.sync_api import sync_playwright
    exe = os.environ.get("SITCOM_CHROME")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
        pg = b.new_page(viewport={"width": 1080, "height": 1920})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/index.html?ep={ep_dir}&t=0")
        pg.wait_for_function("window.READY === true || false", timeout=60000)
        ev = pg.evaluate("window.EV")
        b.close()
    srv.shutdown()
    if errors:
        raise RuntimeError("page sitcom : " + "; ".join(errors))
    return ev


# ---------- mixage ----------
def mix(tl, audio, events):
    import sitcom_score as S
    n = int(tl["dur"] * SR)
    mus = S.score(tl)[:n]
    fol = S.foley(tl, events)[:n]
    vo = np.zeros((n, 2))
    for l in tl["lines"]:
        S.place(vo, audio[l["id"]], l["t"], 1.0, -.15 if l["who"] == "max" else .15)
    act = (np.abs(vo).max(1) > .004).astype(float)
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    duck = 1 - .55 * np.clip(uniform_filter1d(maximum_filter1d(act, int(.25 * SR)), int(.2 * SR)), 0, 1)   # ~ −7 dB
    rms = lambda x: np.sqrt((x ** 2).mean() + 1e-12)
    mus = mus / (rms(mus) + 1e-9) * rms(vo) * .45          # musique ~7 dB sous les voix avant ducking
    out = mus * duck[:, None] + fol * .9 + vo * 1.0
    out /= np.percentile(np.abs(out), 99.99) / .95
    return np.clip(out, -.99, .99)


def write_wav(path, st):
    a = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(a.tobytes())


def loudnorm(frames_dir, wav, out, dur):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rfind("{"):r.stderr.rfind("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    ffmpeg("-framerate", str(FPS), "-i", str(Path(frames_dir) / "%05d.jpg"), "-i", str(wav), "-af", af, "-ar", "48000",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
           "-t", f"{dur:.3f}", "-movflags", "+faststart", str(out))


# ---------- validation ----------
def validate(ep):
    errs = []
    sc = ep.get("scenes") or []
    if not sc or sc[0].get("kind") != "home":
        errs.append("la première scène doit être `home`")
    ids = set()
    for i, S in enumerate(sc):
        if S.get("kind") not in ("home", "world"):
            errs.append(f"scène {i} : kind inconnu")
        if S.get("kind") == "world" and S.get("set") not in SETS:
            errs.append(f"scène {i} : set inconnu ({S.get('set')}) ; choix : {', '.join(sorted(SETS))}")
        for j, L in enumerate(S.get("lines", [])):
            L.setdefault("id", f"l{i}{j}")
            if L["id"] in ids:
                L["id"] = f"l{i}{j}"
            ids.add(L["id"])
            if L.get("who") not in ("max", "prof"):
                errs.append(f"scène {i} réplique {j} : who doit être max ou prof")
            emos = MAX_EMO if L.get("who") == "max" else PROF_EMO
            if L.get("emo") and L["emo"] not in emos:
                L["emo"] = None
    return errs


def render(post, out: Path, workers=None):
    ep = json.loads(json.dumps(post["episode"]))
    errs = validate(ep)
    if errs:
        raise ValueError("épisode invalide : " + " ; ".join(errs))
    workers = workers or int(os.environ.get("SITCOM_WORKERS", os.cpu_count() or 2))
    ep_dir = PAGE / "ep"
    shutil.rmtree(ep_dir, ignore_errors=True); ep_dir.mkdir(parents=True)
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        lines = [L | {"emo": L.get("emo")} for S in ep["scenes"] for L in S.get("lines", [])]
        audio, engines = voices(lines, tmp)
        tl = build_timeline(ep, audio)
        imgs = fetch_images(post, ep, ep_dir)
        wi = 0
        for i, S in enumerate(ep["scenes"]):
            sc = tl["scenes"][i]
            if i in imgs:
                sc["img"] = imgs[i]
        (ep_dir / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False))
        events = events_of()
        st = mix(tl, audio, events)
        wav = tmp / "mix.wav"; write_wav(wav, st)
        frames = tmp / "frames"; frames.mkdir()
        capture(tl["dur"], frames, workers)
        mp4 = out / "reel.mp4"
        loudnorm(frames, wav, mp4, tl["dur"])
        cover_i = int(1.0 * FPS)
        shutil.copy(frames / f"{cover_i:05d}.jpg", out / "reel-cover.jpg")
    shutil.rmtree(ep_dir, ignore_errors=True)
    return {"files": ["reel.mp4"], "tiktok_files": ["reel.mp4"], "cover": "reel-cover.jpg", "seconds": round(tl["dur"], 1), "voice": sorted(engines),
            "credits": "Voix : Microsoft Edge TTS (Rémy, Fabrice) ; images : Wikimedia Commons (domaine public / CC0) ou cases du Sachoir"}


if __name__ == "__main__":
    # python pipeline/sitcom_render.py social/instagram/<dossier>   (ou un post.json)
    p = Path(sys.argv[1])
    d = p if p.is_dir() else p.parent
    post = json.loads((d / "post.json").read_text())
    info = render(post, d)
    print(json.dumps(info, ensure_ascii=False, indent=1))
