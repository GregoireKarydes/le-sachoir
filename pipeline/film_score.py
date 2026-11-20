"""Musique et bruitages synthétisés des Reels en styles alternés (aucun échantillon, aucun fichier externe).

Un habillage par style, réutilisant les instruments de `sitcom_score.py` :
  ipad-sketch           guitare nylon légère et charleston, majeur, 100 BPM ; crayon qui gratte à chaque plan
  flat-space-explainer  nappe spatiale et arpège doux, 90 BPM ; « whoosh » à chaque plongée d'échelle
  comic-history         polka tuba-accordéon, 132 BPM ; claque de papier quand une image est posée
  hd-2d                 chiptune héroïque (carré, basse, bruit), 110 BPM ; carillon de dialogue, gong de chapitre
  ink-wash              cordes pincées pentatoniques sur un bourdon, 70 BPM ; souffle de pinceau
Pas de carte de fin : la musique s'efface sur les 0,3 dernières secondes (la vidéo boucle).
"""
import numpy as np

from sitcom_score import SR, bass, bp, ding, env, hat, hp, kick, lp, mtof, nylon, pad, place, rng, snare, square, sweep, ts, tuba, accordion


def _grid(t0, t1, bpm, sub=1):
    step = 60 / bpm / sub
    return [t0 + k * step for k in range(int((t1 - t0) / step))], step


def cue_sketch(n, t0, t1):
    out = np.zeros((n, 2)); prog = [(48, [60, 64, 67, 72]), (45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (43, [55, 59, 62, 67])]
    beats, B = _grid(t0, t1, 100)
    for k, t in enumerate(beats):
        root, ch = prog[(k // 4) % 4]
        if k % 2 == 0:
            place(out, bass(root - 12, B * 1.2, .5), t, .35)
        m = ch[[0, 2, 1, 3][k % 4]]
        place(out, nylon(m, .6, .5), t, .2, -.25 + .5 * (k % 2))
        if k % 4 == 3:
            place(out, nylon(ch[3] + 12, .5, .35), t + B / 2, .12, .3)
        place(out, hat(.5), t + B / 2, .08, .4)
    return out


def cue_zoom(n, t0, t1):
    out = np.zeros((n, 2)); prog = [[50, 57, 62, 66], [47, 54, 59, 62], [45, 52, 57, 61], [43, 50, 55, 59]]
    beats, B = _grid(t0, t1, 90)
    for k in range(0, len(beats), 4):
        t = beats[k]; place(out, pad(prog[(k // 4) % 4], min(4 * B, t1 - t), .9), t, .45)
    sixt, b16 = _grid(t0, t1, 90, 4)
    for k, t in enumerate(sixt):
        ch = prog[(k // 16) % 4]
        place(out, square(ch[k % 4] + 24, b16 * .7, .2) * np.hanning(int(b16 * .7 * SR)), t, .05, np.sin(k * .6) * .7)
    return out


def cue_comic(n, t0, t1):
    out = np.zeros((n, 2)); prog = [(41, [65, 69, 72]), (36, [64, 67, 70]), (36, [64, 67, 70]), (41, [65, 69, 72])]
    halves, h = _grid(t0, t1, 132, 2)
    for b, t in enumerate(halves):
        root, ch = prog[(b // 8) % 4]
        if b % 2 == 0:
            place(out, tuba(root - 12 + (7 if b % 4 == 2 else 0), h * .8, .8), t, .45)
        else:
            place(out, accordion(ch, h * .7), t, .4, .2)
    return out


def chip(m, d, v=.5, duty=.25):
    k = int(d * SR); t = ts(k); ph = (t * mtof(m)) % 1
    return np.where(ph < duty, 1.0, -1.0) * env(k, .002, .04, hold=d * .8) * v


def cue_pixel(n, t0, t1):
    out = np.zeros((n, 2))
    prog = [(45, [57, 60, 64]), (41, [53, 57, 60]), (43, [55, 59, 62]), (40, [52, 56, 59])]   # Am F G E
    lead = [69, 72, 76, 74, 72, 71, 69, 67, 69, 72, 74, 76, 77, 76, 74, 72]
    eighths, e = _grid(t0, t1, 110, 2)
    for k, t in enumerate(eighths):
        root, ch = prog[(k // 8) % 4]
        place(out, chip(root - 12, e * .9, .5, .5), t, .22)
        place(out, chip(ch[k % 3] + 12, e * .5, .3, .125), t, .07, .4 if k % 2 else -.4)
        if k % 2 == 0:
            place(out, chip(lead[(k // 2) % 16], e * 1.7, .4, .25), t, .1)
        if k % 4 == 0:
            place(out, kick(.7), t, .3)
        if k % 4 == 2:
            place(out, snare(.5), t, .15)
    return out


def cue_ink(n, t0, t1):
    out = np.zeros((n, 2))
    penta = [62, 64, 67, 69, 71, 74, 76, 79]
    place(out, pad([38, 45, 50], t1 - t0, .7), t0, .35)
    beats, B = _grid(t0, t1, 70)
    for k, t in enumerate(beats):
        if k % 3 == 2:
            continue   # silences: stillness before the stroke
        m = penta[int(rng.integers(0, len(penta)))] if k % 4 else penta[0]
        place(out, nylon(m, 1.4, .55), t, .2, np.sin(k) * .5)
        if k % 8 == 0:
            place(out, nylon(m + 12, 1.0, .35), t + B * .5, .1, -.3)
    return out


CUES = {"ipad-sketch": cue_sketch, "flat-space-explainer": cue_zoom, "comic-history": cue_comic, "hd-2d": cue_pixel, "ink-wash": cue_ink}
END_CHORD = {"ipad-sketch": [60, 64, 67, 72], "flat-space-explainer": [62, 66, 69, 74], "comic-history": [65, 69, 72, 77],
             "hd-2d": [57, 60, 64, 69], "ink-wash": [62, 67, 69, 74]}


def score(tl):
    """Pas de carte de fin (bible v3) : la musique court jusqu'au bout et s'efface sur les 0,3 dernières secondes, pour
    que la boucle reparte proprement sur l'image 1."""
    dur = tl["dur"]; n = int(dur * SR) + SR
    out = CUES.get(tl["style"], cue_sketch)(n, 0.0, dur + 1)
    m = int(dur * SR); f = int(.3 * SR)
    out[max(0, m - f):m] *= np.linspace(1, 0, min(f, m))[:, None]
    return out[:m]


def scribble(d, v=1.0):
    k = int(d * SR); x = bp(rng.standard_normal(k), 2500, 9000)
    am = (np.abs(np.sin(2 * np.pi * 7 * ts(k))) ** 3) * np.minimum(1, ts(k) / .05)
    return x * am * v * .5


def slap(v=1.0):
    k = int(.18 * SR); t = ts(k)
    return (bp(rng.standard_normal(k), 300, 3000) * np.exp(-t / .025) + np.sin(2 * np.pi * 90 * t) * np.exp(-t / .05) * .6) * v


def brushsnd(d, v=1.0):
    k = int(d * SR); x = lp(rng.standard_normal(k), 1800)
    return x * np.sin(np.pi * ts(k) / d) ** 2 * v * .6


def chime(v=1.0):
    k = int(.5 * SR); t = ts(k)
    return (np.sin(2 * np.pi * 1760 * t) + .5 * np.sin(2 * np.pi * 2640 * t)) * np.exp(-t / .12) * v * .5


def gong(v=1.0):
    k = int(2.0 * SR); t = ts(k)
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / dcy) for f, dcy in ((110, .9), (166, .6), (247, .4), (330, .3))) * v * .4


def foley(tl, events):
    dur = tl["dur"]; n = int(dur * SR) + SR
    out = np.zeros((n, 2)); st = tl["style"]
    for e in events:
        ty, t = e["type"], e["t"]
        if ty == "open":
            place(out, kick(.8), t, .35); place(out, sweep(.4, 300, 4000), t, .2)
        elif ty == "cut" and st in ("flat-space-explainer", "hd-2d"):
            pass
        elif ty == "cut":
            place(out, sweep(.25, 600, 5000), t, .12, .2)
        elif ty == "scribble":
            place(out, scribble(e.get("d", .5)), t, .5, -.1)
        elif ty == "zoom":
            place(out, sweep(e.get("d", .7), 200, 7000), t, .35)
        elif ty == "slap":
            place(out, slap(), t, .7)
        elif ty == "brush":
            place(out, brushsnd(e.get("d", 1.2)), t, .35)
        elif ty == "chime":
            place(out, chime(), t, .35)
        elif ty == "chapter":
            place(out, gong(), t, .4)
        elif ty == "cross":
            place(out, scribble(.25), t, .6, .2)
        elif ty == "bulb":
            place(out, ding(.6), t, .12, .3)
    return out[:int(dur * SR)]
