"""Reels du Sachoir en styles alternés (20 novembre 2026, go de Greg) : cinq styles de la bibliothèque Lemo-Opuscar,
choisis selon le sujet et tournés en rotation (voir `claude/reels-styles.md` dans le projet et `prompts/INSTAGRAM.md`, partie D).

  ipad-sketch           Tablet Sketch : une page crème qui se remplit pendant qu'on dessine et qu'on explique
  flat-space-explainer  Scale Zoom : une plongée continue dans les échelles, un guide-ampoule
  comic-history         Comic History : des pays en marionnettes de papier sur une carte gravée, une planche de BD
  hd-2d                 2.5D Pixel : une quête de jeu vidéo dans un diorama éclairé
  ink-wash              Chinese Ink Wash : une peinture à l'encre qui se peint devant toi, un seul rouge, le sceau

Entrée : `social/instagram/<date>-sitcom-<slot>/post.json` (nom de dossier historique) avec `"kind": "film"`, `"style"` et
`"film"` (des `beats`, un plan par phrase). Format de la bible v3 (Greg, 20 novembre 2026) : 30 à 35 s, aucun plan de plus
de 4 s, pas de carte de fin (lesachoir.fr sous le bandeau sur les 3 dernières secondes), la dernière phrase reprend un mot
de la question et la vidéo repart sur l'image 1. Sortie : `reel.mp4` (1080 x 1920, 24 i/s, −14 LUFS) et `reel-cover.jpg`.

Chaîne : voix Microsoft Edge brutes (Rémy pour le narrateur, Fabrice pour le personnage ; secours Kokoro) → minutage (un plan
par réplique) → images du sujet (Wikimedia Commons ou cases de la BD liée), redessinées par la page du style
(`pipeline/styles/`) → capture image par image avec Playwright → musique et bruitages du style (`film_score.py`) → mixage →
ffmpeg (loudnorm en deux passes)."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "pipeline" / "styles"
SR = 48000
FPS = 24
sys.path.insert(0, str(ROOT / "pipeline"))

STYLES = {
    "ipad-sketch": {"sets": {"page", "plan-de-travail", "coupe", "loupe", "frise", "nuancier"}, "label": "Tablet Sketch"},
    "flat-space-explainer": {"sets": {"nuit", "terre", "systeme-solaire", "corps", "comptoir", "compte-a-rebours"}, "label": "Scale Zoom"},
    "comic-history": {"sets": {"manche", "europe", "explorateurs", "traite", "sombre"}, "label": "Comic History"},
    "hd-2d": {"sets": {"musee", "ruelle", "port", "trone", "bureau"}, "label": "2.5D Pixel"},
    "ink-wash": {"sets": {"montagnes", "muraille", "bambou-lune", "palais", "etang"}, "label": "Ink Wash"},
}
VOICES = {   # voix brutes, sans traitement (choix de Greg, 17 novembre 2026)
    "narr": {"voice": "fr-FR-RemyMultilingualNeural", "rate": 0},
    "perso": {"voice": "fr-CH-FabriceNeural", "rate": 0},
}
SLOW = {"ink-wash": -8}
# La fin de chaque vidéo (Greg, 20 novembre 2026 : « il manque à la fin un petit truc pour dire aux gens de nous rejoindre
# sur le site ») : un écran « lesachoir.fr » et une phrase dite par le narrateur, après la dernière réplique.
CTA_LINES = [
    "Une BD comme ça chaque matin ? C'est gratuit, sur lesachoir.fr.",
    "D'autres réponses en BD, chaque matin, sur lesachoir.fr.",
    "La suite en BD, chaque matin, sur lesachoir.fr.",
]
CTA_HOLD = .9   # l'écran de fin reste encore un peu après la phrase   # le lavis se raconte plus lentement (immobilité avant l'action)
FX = {"cross", "arrow", "count", "foule", "slap", "zoom"}


# ---------- validation ----------
def validate(post):
    errs = []
    style = post.get("style")
    if style not in STYLES:
        return [f"style inconnu ({style}) ; choix : {', '.join(STYLES)}"]
    F = post.get("film") or {}
    beats = F.get("beats") or []
    scene = bool(F.get("scene"))
    if not 6 <= len(beats) <= (16 if scene else 14):
        errs.append(f"il faut 6 à {16 if scene else 14} plans (`beats`), il y en a {len(beats)}")
    sets = STYLES[style]["sets"]
    for i, b in enumerate(beats):
        if not (b.get("text") or "").strip():
            errs.append(f"plan {i} : `text` manquant")
        if b.get("who", "narr") not in VOICES:
            errs.append(f"plan {i} : who doit être narr ou perso")
        if b.get("who") == "perso" and not b.get("name"):
            errs.append(f"plan {i} : un personnage qui parle a besoin d'un `name`")
        if b.get("set") and b["set"] not in sets and not scene:
            errs.append(f"plan {i} : set inconnu pour {style} ({b['set']}) ; choix : {', '.join(sorted(sets))}")
        b["fx"] = [x for x in (b.get("fx") or []) if x in FX]
    if beats and not beats[0].get("text", "").strip().endswith("?"):
        errs.append("le premier plan doit être la question du Reel (il se termine par « ? »)")
    if style == "comic-history" and len(F.get("cast") or []) < 1 and not scene:
        errs.append("comic-history : `film.cast` (1 à 3 pays-marionnettes) est obligatoire")
    return errs


# ---------- voix ----------
def voices(beats, tmp, style):
    from sitcom_render import _edge, _kokoro, ffmpeg, process_voice, read_wav, tts_text
    out, used = {}, set()
    mode = os.environ.get("FILM_TTS", "edge")
    for i, b in enumerate(beats):
        who = b.get("who", "narr"); v = VOICES[who]; rate = v["rate"] + SLOW.get(style, 0)
        text = tts_text(b.get("say") or b["text"])
        mp3, wav = tmp / f"b{i}.mp3", tmp / f"b{i}.wav"
        if mode == "silent":   # essais hors ligne : un silence de la durée parlée estimée
            out[i] = np.zeros(int(SR * max(1.2, len(text.split()) / 2.7))); used.add("silent"); continue
        ok = False
        if mode == "edge":
            for _ in range(3):
                try:
                    import asyncio
                    asyncio.run(_edge(text, v["voice"], rate, 0, mp3))
                    ffmpeg("-i", str(mp3), "-ac", "1", "-ar", str(SR), str(wav)); ok = True; used.add("edge"); break
                except Exception as e:  # noqa
                    print(f"Edge TTS (plan {i}) : {e}")
        if not ok:
            _kokoro(text, wav); used.add("kokoro")
        out[i] = process_voice(read_wav(wav), who)
    return out, used


def cta_text(post):
    """La phrase de fin : `film.cta` si le post en donne une, sinon une des phrases de CTA_LINES (selon la date et le créneau)."""
    F = post.get("film") or {}
    if F.get("cta"):
        return F["cta"]
    import hashlib
    k = int(hashlib.sha1(f"{post.get('date', '')}{post.get('slot', '')}".encode()).hexdigest(), 16)
    return CTA_LINES[k % len(CTA_LINES)]


def cta_voice(post, tmp, style):
    """La voix de la phrase de fin (le narrateur)."""
    beat = {"who": "narr", "text": cta_text(post)}
    a, _ = voices([beat], tmp, style)
    return a[0]


def envelope(a):
    hop = SR // FPS
    n = int(np.ceil(len(a) / hop))
    r = np.array([np.sqrt((a[i * hop:(i + 1) * hop] ** 2).mean() + 1e-12) for i in range(n)]) if n else np.zeros(1)
    p = np.percentile(r, 95) or 1
    return [round(float(min(1, x / p)), 3) for x in r]


# ---------- minutage : un plan par réplique ----------
def build_timeline(post, audio):
    """Un plan par phrase, les plans s'enchaînent sans temps mort (0,12 s ; `pause` pour un silence voulu, par exemple
    0,3 s avant la réponse). Pas de carte de fin : la vidéo s'arrête 0,35 s après la dernière phrase et repart sur l'image 1."""
    F = post["film"]; beats = F["beats"]; style = post["style"]
    T, lines, out = 0.0, [], []
    for i, b in enumerate(beats):
        a = audio[i]; d = len(a) / SR
        lead = (.06 if i == 0 else (.2 if style == "ink-wash" else .12)) + float(b.get("pause", 0))
        tail = .35 if i == len(beats) - 1 else .1
        t0 = T; t_line = t0 + lead; t1 = round(max(t0 + 1.0, t_line + d + tail), 3)
        lines.append({"id": f"b{i}", "beat": i, "t": round(t_line, 3), "dur": round(d, 3), "text": b["text"], "who": b.get("who", "narr"),
                      "name": b.get("name"), "env": envelope(a)})
        nb = {"i": i, "t0": round(t0, 3), "t1": t1}
        for k in ("set", "big", "small", "tag", "who", "name", "text", "fx", "face", "emo", "speaker", "cold", "scale", "hero", "chapter", "react"):
            if b.get(k) is not None:
                nb[k] = b[k]
        out.append(nb)
        T = t1
    # la fin : l'écran « lesachoir.fr » et la phrase dite, après la dernière réplique
    cta = None
    if "cta" in audio:
        d = len(audio["cta"]) / SR
        cta = {"t0": round(T, 3), "t": round(T + .25, 3), "dur": round(d, 3), "text": cta_text(post)}
        T = round(T + .25 + d + CTA_HOLD, 3)
        cta["t1"] = T
    # l'ampoule cachée : sur l'avant-dernier plan (ou celui que le post désigne)
    bi = F.get("bulb_beat", max(0, len(out) - 2))
    out[min(bi, len(out) - 1)]["bulb"] = True
    dur = round(T, 3)
    for k, l in enumerate(lines):
        nxt = lines[k + 1]["t"] - .02 if k + 1 < len(lines) else (cta["t0"] if cta else dur)
        l["sub_t1"] = round(min(max(l["t"] + l["dur"] + .25, l["t"] + .8), nxt), 3)
    band_t1 = round(min(max(2.4, out[0]["t1"] + (out[1]["t1"] - out[1]["t0"] if len(out) > 1 else 0)), 6.0), 3)
    again = None if cta else round(max(band_t1, dur - 3.0), 3)
    return {"style": style, "dur": dur, "fps": FPS, "beats": out, "lines": lines, "end_t0": dur + 99, "cta": cta,
            "band": {"text": post.get("band", ""), "t0": 0.0, "t1": band_t1, "again": again,
                     "url": (F.get("end") or {}).get("url", "lesachoir.fr")},
            "end": F.get("end") or {}, "cast": F.get("cast") or [], "hero": F.get("hero"), "scene": bool(F.get("scene"))}


# ---------- images du sujet ----------
def fetch_images(post, folder):
    from reel_v2 import commons_image, story_images
    bd = story_images(post) if post.get("story") else {}
    used, out = set(), {}
    for i, b in enumerate(post["film"]["beats"]):
        im = b.get("image") or {}
        src = None
        if im.get("file"):
            p = (ROOT / im["file"]) if not Path(im["file"]).is_absolute() else Path(im["file"])
            src = p if p.exists() else None
        elif im.get("bd") is not None and bd.get(im["bd"]):
            src = bd[im["bd"]]
        elif im.get("commons"):
            try:
                r = commons_image(im["commons"], used, folder)
                src = r["path"] if r else None
            except Exception as e:  # noqa
                print(f"Commons ({im['commons']}) : {e}")
        if src:
            from PIL import Image
            name = f"img{i}.jpg"
            Image.open(src).convert("RGB").save(folder / name, quality=90)
            out[i] = name
    return out


# ---------- capture ----------
def _serve():
    import http.server
    import socketserver
    import threading
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = lambda *a, **k: Quiet(*a, directory=str(PAGE), **k)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def _browser(p):
    exe = os.environ.get("SITCOM_CHROME")
    return p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()


def _capture(args):
    port, t_list, frames_dir = args
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = _browser(p)
        pg = b.new_page(viewport={"width": 1080, "height": 1920})
        pg.goto(f"http://127.0.0.1:{port}/index.html?ep=ep&t=0")
        pg.wait_for_function("window.READY === true", timeout=120000)
        for i, t in t_list:
            pg.evaluate(f"window.render({t})")
            pg.screenshot(path=str(Path(frames_dir) / f"{i:05d}.jpg"), type="jpeg", quality=92)
        b.close()
    return len(t_list)


def capture(dur, frames_dir, workers=4, times=None):
    srv = _serve()
    n = int(round(dur * FPS))
    todo = times if times is not None else [(i, i / FPS) for i in range(n)]
    jobs = [todo[k::workers] for k in range(workers)]
    with ProcessPoolExecutor(workers) as ex:
        list(ex.map(_capture, [(srv.server_address[1], j, str(frames_dir)) for j in jobs if j]))
    srv.shutdown()
    return n


def page_events():
    srv = _serve()
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = _browser(p)
        pg = b.new_page(viewport={"width": 1080, "height": 1920})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
        pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/index.html?ep=ep&t=0")
        try:
            for _ in range(240):
                if errors or pg.evaluate("window.READY === true"):
                    break
                pg.wait_for_timeout(500)
            if not pg.evaluate("window.READY === true"):
                raise TimeoutError
        except Exception:
            raise RuntimeError("page des styles : " + "; ".join(errors or ["pas prête"]))
        ev = pg.evaluate("window.EV")
        b.close()
    srv.shutdown()
    if errors:
        raise RuntimeError("page des styles : " + "; ".join(errors))
    return ev


# ---------- mixage ----------
def mix(tl, audio):
    import film_score as S
    from sitcom_score import place
    n = int(tl["dur"] * SR)
    mus = S.score(tl)[:n]
    fol = S.foley(tl, tl["events"])[:n]
    vo = np.zeros((n, 2))
    for l in tl["lines"]:
        place(vo, audio[l["beat"]], l["t"], 1.0, .12 if l["who"] == "perso" else 0)
    if tl.get("cta") and "cta" in audio:
        place(vo, audio["cta"], tl["cta"]["t"], 1.0, 0)
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    act = (np.abs(vo).max(1) > .004).astype(float)
    duck = 1 - .55 * np.clip(uniform_filter1d(maximum_filter1d(act, int(.25 * SR)), int(.2 * SR)), 0, 1)
    rms = lambda x: np.sqrt((x ** 2).mean() + 1e-12)
    ref = rms(vo) if rms(vo) > 1e-5 else .05
    mus = mus / (rms(mus) + 1e-9) * ref * .45
    out = mus * duck[:, None] + fol * .8 + vo
    out /= np.percentile(np.abs(out), 99.99) / .95 + 1e-9
    return np.clip(out, -.99, .99)


def _prepare(post, folder, ep_dir, tmp):
    """voix, minutage, images, page : renvoie (tl, audio, engines). Avec `film.scene`, copie le scene.js de la vidéo."""
    audio, engines = voices(post["film"]["beats"], tmp, post["style"])
    audio["cta"] = cta_voice(post, tmp, post["style"])
    tl = build_timeline(post, audio)
    imgs = fetch_images(post, ep_dir)
    for i, name in imgs.items():
        tl["beats"][i]["img"] = name
    if tl.get("scene"):
        src = Path(folder) / post["film"]["scene"]
        if not src.exists():
            raise FileNotFoundError(f"scène introuvable : {src}")
        shutil.copy(src, ep_dir / "scene.js")
    (ep_dir / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False))
    tl["events"] = page_events()
    return tl, audio, engines


# ---------- contrôle d'une vidéo réalisée (film.scene) ----------
def check_scene(tl, folder: Path, workers=2):
    """Rendu d'une image au début, au milieu et à la fin de chaque plan, puis quatre contrôles :
    1) aucune image vide (presque unie) ; 2) chaque plan bouge (début ≠ fin) ; 3) les plans changent vraiment
    (milieu d'un plan ≠ milieu du suivant) ; 4) le bandeau et le premier plan existent dès 0,1 s.
    Écrit `scene-check.jpg` (planche contact) dans le dossier du post. Renvoie (ok, problèmes)."""
    from PIL import Image, ImageChops, ImageStat
    times, keys = [], []
    for b in tl["beats"]:
        d = b["t1"] - b["t0"]
        for tag, f in (("a", .12), ("m", .5), ("z", .9)):
            times.append((len(times), round(b["t0"] + d * f, 3))); keys.append((b["i"], tag))
    times.append((len(times), .1)); keys.append((-1, "open"))
    with tempfile.TemporaryDirectory() as td:
        capture(tl["dur"], Path(td), min(workers, 4), times)
        ims = [Image.open(Path(td) / f"{i:05d}.jpg").convert("L").resize((108, 192)) for i, _ in times]
        thumbs = [Image.open(Path(td) / f"{i:05d}.jpg").convert("RGB").resize((180, 320)) for i, _ in times if keys[i][1] == "m"]
    probs = []
    by = {k: im for k, im in zip(keys, ims)}
    diff = lambda a, b: ImageStat.Stat(ImageChops.difference(a, b)).mean[0]
    blank = [k for k, im in by.items() if ImageStat.Stat(im).stddev[0] < 6]
    if blank:
        probs.append(f"images vides : {', '.join(f'plan {i} ({t})' for i, t in blank[:5])}")
    n = len(tl["beats"])
    still = [i for i in range(n) if diff(by[(i, "a")], by[(i, "z")]) < 2.0]
    if len(still) > max(1, n // 4):
        probs.append(f"plans figés (rien ne bouge) : {still}")
    same = [i for i in range(n - 1) if diff(by[(i, "m")], by[(i + 1, "m")]) < 5.0]
    if len(same) > max(1, n // 3):
        probs.append(f"plans qui se ressemblent trop (pas de changement de plan) : {same}")
    # planche contact pour la relecture
    cols = 6
    sheet = Image.new("RGB", (cols * 180, ((len(thumbs) + cols - 1) // cols) * 320), "white")
    for k, th in enumerate(thumbs):
        sheet.paste(th, ((k % cols) * 180, (k // cols) * 320))
    sheet.save(folder / "scene-check.jpg", quality=85)
    return (not probs), probs


def render(post, out: Path, workers=None):
    post = json.loads(json.dumps(post))
    errs = validate(post)
    if errs:
        raise ValueError("film invalide : " + " ; ".join(errs))
    from sitcom_render import loudnorm, write_wav
    workers = workers or int(os.environ.get("SITCOM_WORKERS", os.cpu_count() or 2))
    ep_dir = PAGE / "ep"
    scene_note = None
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        tl = None
        if (post.get("film") or {}).get("scene"):
            # vidéo réalisée à la main : on la contrôle ; si elle ne passe pas, on retombe sur le moteur classique
            try:
                shutil.rmtree(ep_dir, ignore_errors=True); ep_dir.mkdir(parents=True)
                tl, audio, engines = _prepare(post, out, ep_dir, tmp)
                ok, probs = check_scene(tl, out, workers)
                if not ok:
                    raise RuntimeError(" ; ".join(probs))
                scene_note = "ok"
            except Exception as e:  # noqa
                print(f"::warning::scène refusée, rendu classique à la place : {e}")
                scene_note = f"refusée : {e}"[:400]
                post["film"].pop("scene", None)
                for b in post["film"]["beats"]:
                    if b.get("set") not in STYLES[post["style"]]["sets"]:
                        b.pop("set", None)
                if post["style"] == "comic-history" and not post["film"].get("cast"):
                    post["film"]["cast"] = [{"name": "FRANCE", "color": "#6E93D6"}]
                tl = None
        if tl is None:
            shutil.rmtree(ep_dir, ignore_errors=True); ep_dir.mkdir(parents=True)
            tl, audio, engines = _prepare(post, out, ep_dir, tmp)
        st = mix(tl, audio)
        wav = tmp / "mix.wav"; write_wav(wav, st)
        frames = tmp / "frames"; frames.mkdir()
        capture(tl["dur"], frames, workers)
        mp4 = out / "reel.mp4"
        loudnorm(frames, wav, mp4, tl["dur"])
        shutil.copy(frames / f"{int(.8 * FPS):05d}.jpg", out / "reel-cover.jpg")
    shutil.rmtree(ep_dir, ignore_errors=True)
    info = {"files": ["reel.mp4"], "tiktok_files": ["reel.mp4"], "cover": "reel-cover.jpg", "seconds": round(tl["dur"], 1),
            "voice": sorted(engines), "style": post["style"],
            "credits": "Voix : Microsoft Edge TTS (Rémy, Fabrice) ; images : Wikimedia Commons ou cases du Sachoir ; "
                       "styles adaptés de Lemo-Opuscar (code MIT)"}
    if scene_note:
        info["scene"] = scene_note
    return info


def stills(post, out: Path, at=(0.5, 3, 7, 11, 16, 21, 26, -1.0), folder=None, check=False):
    """Aperçu sans vidéo : quelques images fixes (pour vérifier un style ou une scène). FILM_TTS=silent conseillé hors ligne.
    check=True lance aussi le contrôle des vidéos réalisées (scene-check.jpg)."""
    post = json.loads(json.dumps(post))
    errs = validate(post)
    if errs:
        raise ValueError("film invalide : " + " ; ".join(errs))
    ep_dir = PAGE / "ep"
    shutil.rmtree(ep_dir, ignore_errors=True); ep_dir.mkdir(parents=True)
    with tempfile.TemporaryDirectory() as td:
        tl, _, _ = _prepare(post, folder or out.parent, ep_dir, Path(td))
    times = [(k, (t if t >= 0 else tl["dur"] + t)) for k, t in enumerate(at)]
    out.mkdir(parents=True, exist_ok=True)
    capture(tl["dur"], out, min(len(times), 4), times)
    if check and tl.get("scene"):
        ok, probs = check_scene(tl, folder or out.parent)
        print("contrôle :", "ok" if ok else " ; ".join(probs))
    shutil.rmtree(ep_dir, ignore_errors=True)
    return tl


if __name__ == "__main__":
    # python pipeline/film_render.py social/instagram/<dossier> [--stills]
    p = Path(sys.argv[1]); d = p if p.is_dir() else p.parent
    post = json.loads((d / "post.json").read_text())
    if "--stills" in sys.argv:
        tl = stills(post, d / "stills", folder=d, check=True)
        print(f"{len(tl['beats'])} plans, {tl['dur']} s")
    else:
        print(json.dumps(render(post, d), ensure_ascii=False, indent=1))
