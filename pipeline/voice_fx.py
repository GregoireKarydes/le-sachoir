"""Traitements de voix du Reel sitcom (ffmpeg + numpy) : vieillir une voix de synthèse pour le Prof.

age(in_path, out_wav, style) — style « vieux » (grave, chevrotant, un peu voilé) ou « savant » (vieux savant de dessin
animé : grave, rauque, nasillard, débit nerveux). Aucun échantillon, aucune imitation d'un personnage existant."""
import subprocess

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
STYLES = {
    #          facteur de hauteur+formants, vibrato (Hz, profondeur), trémolo (Hz, profondeur), raucité, nasal, saturation
    "vieux": dict(k=.90, vib=(5.2, .045), trem=(5.2, .18), rasp=.22, nasal=.35, drive=1.4),
    "savant": dict(k=.88, vib=(6.5, .02), trem=(9.0, .10), rasp=.45, nasal=.6, drive=2.0),
}


def _sos(kind, f, o=2):
    return butter(o, f, kind, fs=SR, output="sos")


def age(in_path, out_wav, style="vieux"):
    p = STYLES[style]
    k = p["k"]
    af = (f"asetrate={int(SR * k)},aresample={SR},atempo={1 / k:.4f},"
          f"vibrato=f={p['vib'][0]}:d={p['vib'][1]},tremolo=f={p['trem'][0]}:d={p['trem'][1]}")
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(in_path), "-ac", "1", "-ar", str(SR), "-af", af,
                          "-f", "f32le", "-"], check=True, capture_output=True).stdout
    y = np.frombuffer(raw, np.float32).astype(np.float64)
    y /= np.abs(y).max() + 1e-9
    rng = np.random.default_rng(3)
    # raucité : modulation d'amplitude par un bruit grave (voix « graveleuse »), plus un peu de souffle
    n = rng.standard_normal(len(y))
    am = sosfilt(_sos("low", 90), n); am /= am.std() + 1e-9
    env = np.abs(sosfilt(_sos("low", 30), np.abs(y)))
    y = y * (1 + p["rasp"] * .35 * am) + p["rasp"] * .08 * sosfilt(_sos("band", [1500, 6000]), n) * env / (env.max() + 1e-9)
    # timbre nasillard (bosse vers 1,2 kHz), voix de vieil homme : un peu moins de graves profonds et d'aigus
    y = y + p["nasal"] * sosfilt(_sos("band", [900, 1700]), y)
    y = sosfilt(_sos("high", 110), y); y = sosfilt(_sos("low", 6500), y)
    y = np.tanh(y / (np.abs(y).max() + 1e-9) * p["drive"]) / np.tanh(p["drive"])
    y = y / (np.abs(y).max() + 1e-9) * .9
    import soundfile as sf
    sf.write(str(out_wav), y.astype(np.float32), SR)
    return out_wav
