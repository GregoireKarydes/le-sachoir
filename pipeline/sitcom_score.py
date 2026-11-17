"""Musique et bruitages synthétisés du Reel sitcom (aucun échantillon, aucun fichier externe).

Grammaire (sitcom de science-fiction pour adultes) : un thème « théremine » sur basse analogique, arpège en carré et boîte à
rythmes pour le labo ; un style par monde, dont le premier temps tombe sur la coupe ; la musique se coupe net (réverbération
comprise) pour le silence avant la chute ; un accord final sur la carte de fin.

score(timeline) -> np.ndarray stéréo 48 kHz ; foley(timeline, events) -> np.ndarray stéréo.
"""
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


def _sos(kind, f, o=2):
    return butter(o, f, kind, fs=SR, output="sos")


def lp(x, f, o=2):
    return sosfilt(_sos("low", f, o), x, axis=0)


def hp(x, f, o=2):
    return sosfilt(_sos("high", f, o), x, axis=0)


def bp(x, lo, hi, o=2):
    return sosfilt(_sos("band", [lo, hi], o), x, axis=0)


def ts(n):
    return np.arange(n) / SR


def env(n, a=.005, r=.08, hold=None):
    t = ts(n)
    e = np.minimum(1, t / max(a, 1e-4))
    if hold is not None:
        e *= np.where(t < hold, 1, np.exp(-(t - hold) / r))
    else:
        e *= np.exp(-t / r)
    return e


def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(sig) <= 0:
        return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        sig = np.stack([sig * l, sig * r], 1)
    a, b = max(0, i), min(len(buf), i + len(sig))
    buf[a:b] += sig[a - i:b - i] * gain


# ---------- instruments ----------
def theremin(notes, n):
    """notes: [(t, dur, midi)] — sinus + harmoniques 2 et 3, portamento ~70 ms, vibrato qui arrive après l'attaque."""
    out = np.zeros(n)
    if not notes:
        return out
    pitch = np.full(n, float(notes[0][2])); gate = np.zeros(n); vib = np.zeros(n)
    for (s, d, m) in notes:
        i0, i1 = int(s * SR), min(n, int((s + d) * SR))
        if i0 >= n:
            continue
        pitch[i0:] = m; gate[i0:max(i0 + 1, i1 - int(.03 * SR))] = 1
        k = ts(i1 - i0); vib[i0:i1] = np.clip((k - .15) / .25, 0, 1)
    al = np.exp(-1 / (.07 * SR))
    from scipy.signal import lfilter
    pitch = lfilter([1 - al], [1, -al], pitch, zi=[pitch[0] * al])[0]
    t = ts(n)
    f = mtof(pitch + .25 * vib * np.sin(2 * np.pi * 5.8 * t))
    ph = np.cumsum(f / SR) * 2 * np.pi
    g = lfilter([1 - np.exp(-1 / (.02 * SR))], [1, -np.exp(-1 / (.02 * SR))], gate)
    return (np.sin(ph) + .18 * np.sin(2 * ph) + .08 * np.sin(3 * ph)) * g


def bass(m, d, v=.8):
    n = int(d * SR); t = ts(n); f = mtof(m)
    x = 2 * ((t * f) % 1) - 1
    x = lp(x, 900, 2) + .3 * np.sin(2 * np.pi * f * t)
    return x * env(n, .004, .12, hold=d * .8) * v


def square(m, d, v=.5):
    n = int(d * SR); t = ts(n)
    return lp(np.sign(np.sin(2 * np.pi * mtof(m) * t)), 3500) * env(n, .002, .07) * v


def kick(v=1.0):
    n = int(.35 * SR); t = ts(n)
    return np.sin(2 * np.pi * (45 + 90 * np.exp(-t / .03)) * t) * np.exp(-t / .12) * v


def snare(v=1.0):
    n = int(.25 * SR); t = ts(n)
    return (bp(rng.standard_normal(n), 1500, 7000) * .7 + np.sin(2 * np.pi * 190 * t) * .5) * np.exp(-t / .07) * v


def hat(v=1.0):
    n = int(.06 * SR)
    return hp(rng.standard_normal(n), 7000) * np.exp(-ts(n) / .018) * v


def pad(ms, d, v=.3):
    n = int(d * SR); t = ts(n); x = np.zeros(n)
    for m in ms:
        for det in (-.08, .08):
            x += 2 * ((t * mtof(m + det)) % 1) - 1
    x = lp(x, 1400)
    return x * np.minimum(1, t / .3) * np.minimum(1, (d - t) / .3).clip(0) * v / len(ms)


def nylon(m, d, v=.6):
    """Karplus-Strong simplifié (guitare nylon de la bossa)."""
    n = int(d * SR); P = max(2, int(SR / mtof(m)))
    buf = rng.uniform(-1, 1, P); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % P]
        buf[i % P] = .996 * .5 * (buf[i % P] + buf[(i + 1) % P])
    return lp(out, 3000) * v


def tuba(m, d, v=.7):
    n = int(d * SR); t = ts(n); f = mtof(m)
    x = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.2 for k in range(1, 6))
    return x * env(n, .03, .1, hold=d * .7) * v


def accordion(ms, d, v=.4):
    n = int(d * SR); t = ts(n); x = np.zeros(n)
    for m in ms:
        for det in (0, .12):
            x += 2 * ((t * mtof(m + det)) % 1) - 1
    return lp(x, 2600) * env(n, .02, .06, hold=d * .7) * v / len(ms)


# ---------- cues ----------
D_MIN = [62, 64, 65, 67, 69, 70, 72, 74]
THEME = [(0, 1, 62), (1, .5, 69), (1.5, .5, 70), (2, 1, 69), (3, .5, 64), (3.5, .5, 65), (4, 1, 64), (5, .5, 63), (5.5, 2.5, 62)]
CHORDS_HOME = [(38, [50, 53, 57]), (34, [46, 50, 53]), (36, [48, 52, 55]), (33, [45, 49, 52])]   # Dm, Bb, C, A


def cue_home(n, t0, t1, lead=True, drums=True):
    out = np.zeros((n, 2))
    beats = int((t1 - t0) / BEAT)
    for b in range(beats):
        t = t0 + b * BEAT
        root, ch = CHORDS_HOME[(b // 4) % 4]
        place(out, bass(root, BEAT * .9, .7), t, .5)
        for k in range(2):
            place(out, square(ch[(b * 2 + k) % 3] + 12, BEAT * .4, .3), t + k * BEAT / 2, .1, (-.4, .4)[k])
        if drums:
            place(out, kick(), t, .45) if b % 2 == 0 else place(out, snare(), t, .3)
            place(out, hat(), t + BEAT / 2, .12, .3)
    if lead:
        notes = []
        for rep in range(int((t1 - t0) / (8 * BEAT)) + 1):
            for s, d, m in THEME:
                ts_ = t0 + rep * 8 * BEAT + s * BEAT
                if ts_ + d * BEAT <= t1:
                    notes.append((ts_, d * BEAT, m + 12))
        th = theremin(notes, n)
        out += np.stack([th, th], 1) * .16
    return out


def cue_bossa(n, t0, t1):
    out = np.zeros((n, 2)); prog = [(45, [57, 60, 64, 67]), (50, [57, 60, 65, 69]), (43, [55, 59, 62, 65]), (48, [55, 59, 64, 67])]
    for b in range(int((t1 - t0) / BEAT)):
        t = t0 + b * BEAT; root, ch = prog[(b // 4) % 4]
        if b % 2 == 0:
            place(out, bass(root, BEAT * 1.4, .6), t, .45)
        for k, off in enumerate((0, .75)):
            for i, m in enumerate(ch):
                place(out, nylon(m, .5, .4), t + off * BEAT + i * .008, .18, -.2 + .1 * i)
        place(out, hat(.6), t + BEAT * .5, .1, .4)
    return out


def cue_polka(n, t0, t1):
    out = np.zeros((n, 2)); prog = [(41, [65, 69, 72]), (36, [64, 67, 70]), (36, [64, 67, 70]), (41, [65, 69, 72])]
    for b in range(int((t1 - t0) / (BEAT / 2))):
        t = t0 + b * BEAT / 2; root, ch = prog[(b // 8) % 4]
        if b % 2 == 0:
            place(out, tuba(root - 12 + (7 if b % 4 == 2 else 0), BEAT * .4, .8), t, .5)
        else:
            place(out, accordion(ch, BEAT * .35), t, .5, .2)
    return out


def cue_space(n, t0, t1):
    out = np.zeros((n, 2)); prog = [[50, 57, 62, 65], [46, 53, 58, 62]]
    for k in range(int((t1 - t0) / (4 * BEAT)) + 1):
        t = t0 + k * 4 * BEAT
        if t < t1:
            place(out, pad(prog[k % 2], min(4 * BEAT, t1 - t), .9), t, .5)
    for b in range(int((t1 - t0) / (BEAT / 4))):
        m = [62, 65, 69, 74, 77, 74, 69, 65][b % 8]
        place(out, square(m + 12, BEAT / 4 * .8, .25), t0 + b * BEAT / 4, .06, np.sin(b * .7) * .6)
    return out


CUE_OF_SET = {"paris-ancien": cue_polka, "moyen-age": cue_polka, "antiquite": cue_polka, "musee": cue_bossa, "bureau": cue_bossa,
              "cuisine": cue_bossa, "mer": cue_bossa, "nature": cue_bossa, "desert": cue_polka, "neige": cue_space, "ciel": cue_space,
              "espace": cue_space, "futur": cue_space, "corps": cue_space, "usine": cue_polka, "ville": cue_bossa}


def score(tl):
    dur = tl["dur"]; n = int(dur * SR) + SR
    out = np.zeros((n, 2))
    for s in tl["scenes"]:
        t0, t1 = s["t0"], s["t1"]
        if s["kind"] == "home":
            out += cue_home(n, t0, t1, lead=not s.get("back"), drums=True)
        elif s["kind"] == "world":
            out += CUE_OF_SET.get(s.get("set"), cue_bossa)(n, t0, t1)
        elif s["kind"] == "end":
            ch = [62, 65, 69, 74]
            for i, m in enumerate(ch):
                place(out, square(m, 1.6, .5) * np.linspace(1, .3, int(1.6 * SR)), t0 + i * .06, .14, -.3 + .2 * i)
            place(out, bass(38, 1.8, .9), t0, .5)
            notes = [(t0, .25, 74), (t0 + .25, 1.4, 81)]
            th = theremin([(a - t0, d, m) for a, d, m in notes], int(2 * SR))
            place(out, np.stack([th, th], 1) * .2, t0)
    # silence before the punchline: music hard-cut (tails included)
    for c0, c1 in tl.get("silences", []):
        a, b = int(c0 * SR), int(c1 * SR)
        f = int(.01 * SR)
        out[max(0, a - f):a] *= np.linspace(1, 0, min(f, a))[:, None]
        out[a:b] = 0
    return out[:int(dur * SR)]


# ---------- foley ----------
def sweep(d, f0, f1, v=1.0):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); step = 512
    for i in range(0, n, step):
        u = i / n; f = f0 * (f1 / f0) ** u
        seg = bp(x[max(0, i - 2048):i + step], f * .7, min(f * 1.4, 20000))[-step:]
        seg = seg[:n - i]; out[i:i + len(seg)] = seg
    return out / (np.abs(out).max() + 1e-9) * np.sin(np.pi * ts(n) / d) ** 1.5 * v


def boing(v=1.0):
    n = int(.4 * SR); t = ts(n)
    return np.sin(2 * np.pi * (180 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / .2)) * t) * np.exp(-t / .15) * v


def blip(v=1.0):
    n = int(.12 * SR); t = ts(n)
    return np.sign(np.sin(2 * np.pi * (900 + 900 * t / .12) * t)) * np.exp(-t / .05) * .5 * v


def glorp(v=1.0):
    n = int(.5 * SR); t = ts(n)
    return lp(np.sin(2 * np.pi * (120 + 300 * np.abs(np.sin(2 * np.pi * 6 * t))) * t), 1200) * np.exp(-t / .2) * v


def ding(v=1.0):
    n = int(1.4 * SR); t = ts(n); f = 1318.5
    return (np.sin(2 * np.pi * f * t + 2 * np.exp(-t / .2) * np.sin(2 * np.pi * f * 3.5 * t))) * np.exp(-t / .45) * v


def foley(tl, events):
    dur = tl["dur"]; n = int(dur * SR) + SR
    out = np.zeros((n, 2))
    for e in events:
        ty, t = e["type"], e["t"]
        if ty == "machine":
            place(out, blip(), t, .35); place(out, blip(.8), t + .12, .3)
        elif ty == "portal_open":
            m = int(1.2 * SR); tt = ts(m)
            sub = np.sin(2 * np.pi * (40 + 60 * np.exp(-tt / .1)) * tt) * np.exp(-tt / .35)
            place(out, sub, t, .7); place(out, sweep(1.0, 4000, 300), t, .35, -.2); place(out, sweep(1.2, 300, 3000), t + .2, .25, .2)
        elif ty == "swirl":
            place(out, sweep(.7, 400, 6000), t, .45, .3)
        elif ty == "land":
            place(out, boing(), t, .4); place(out, kick(.8), t, .4)
        elif ty == "blip":
            place(out, blip(), t, .25)
        elif ty == "glorp":
            place(out, glorp(), t, .4, -.4)
        elif ty == "boing":
            place(out, boing(.8), t, .3)
        elif ty == "ding":
            place(out, ding(), t, .3)
    # fluorescent hum in the lab (room tone), stays during the silences
    tt = ts(n); room = (np.sin(2 * np.pi * 100 * tt) * .5 + np.sin(2 * np.pi * 200 * tt) * .2) * .006
    for s in tl["scenes"]:
        if s["kind"] == "home":
            a, b = int(s["t0"] * SR), int(s["t1"] * SR)
            out[a:b] += room[a:b, None]
    return out[:int(dur * SR)]
