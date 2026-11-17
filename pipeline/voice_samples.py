"""Échantillons de voix pour le Prof du Reel sitcom (Microsoft Edge TTS + vieillissement de pipeline/voice_fx.py).
Lancé par .github/workflows/voix-test.yml quand social/voix-test/request.txt change ; écrit social/voix-test/prof-*.mp3."""
import asyncio
import subprocess
import tempfile
from pathlib import Path

import edge_tts

from voice_fx import age

OUT = Path(__file__).resolve().parent.parent / "social" / "voix-test"
TEXT = ("Pire. Ils avaient un avocat. Autun, en Bourgogne : des rats dévorent les récoltes, on les convoque au tribunal. "
        "Zéro condamnation.")
TRIES = [  # (voix, débit %, hauteur Hz, style)
    ("fr-FR-HenriNeural", -8, -6, "vieux"), ("fr-FR-HenriNeural", 4, -4, "savant"),
    ("fr-BE-GerardNeural", -8, -4, "vieux"), ("fr-BE-GerardNeural", 4, -2, "savant"),
    ("de-DE-FlorianMultilingualNeural", -6, -4, "vieux"), ("de-DE-FlorianMultilingualNeural", 6, -2, "savant"),
    ("en-US-AndrewMultilingualNeural", 6, -2, "savant"), ("fr-CA-ThierryNeural", -6, -4, "vieux"),
]


async def main():
    with tempfile.TemporaryDirectory() as td:
        for i, (v, rate, pitch, style) in enumerate(TRIES, 1):
            try:
                src = Path(td) / f"{i}.mp3"
                await edge_tts.Communicate(TEXT, v, rate=f"{rate:+d}%", pitch=f"{pitch:+d}Hz").save(str(src))
                wav = Path(td) / f"{i}.wav"
                age(src, wav, style)
                name = v.split("-")[2].replace("MultilingualNeural", "").replace("Neural", "")
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-b:a", "128k",
                                str(OUT / f"prof-{i:02d}-{name}-{style}.mp3")], check=True)
                print("ok", v, style)
            except Exception as e:  # noqa
                print("échec", v, style, e)

asyncio.run(main())
