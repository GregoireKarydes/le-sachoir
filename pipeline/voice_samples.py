"""Échantillons de voix d'homme pour le Reel sitcom (Microsoft Edge TTS), sans aucun traitement.
Lancé par .github/workflows/voix-test.yml quand social/voix-test/request.txt change ; écrit social/voix-test/<n>-<voix>.mp3."""
import asyncio
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parent.parent / "social" / "voix-test"
TEXT = ("Prof… c'est vrai qu'on a fait un procès à des rats ? "
        "Pire. Ils avaient un avocat. Autun, en Bourgogne : des rats dévorent les récoltes, on les convoque au tribunal.")
VOICES = ["fr-FR-HenriNeural", "fr-FR-RemyMultilingualNeural", "en-US-AndrewMultilingualNeural", "en-US-BrianMultilingualNeural",
          "de-DE-FlorianMultilingualNeural", "it-IT-GiuseppeMultilingualNeural", "fr-CA-AntoineNeural", "fr-CA-JeanNeural",
          "fr-CA-ThierryNeural", "fr-CH-FabriceNeural", "fr-BE-GerardNeural"]


async def main():
    for i, v in enumerate(VOICES, 1):
        try:
            await edge_tts.Communicate(TEXT, v).save(str(OUT / f"{i:02d}-{v}.mp3"))
            print("ok", v)
        except Exception as e:  # noqa
            print("échec", v, e)

asyncio.run(main())
