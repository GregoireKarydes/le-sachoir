"""Régénère les 12 avatars mythologiques en haute définition (FLUX.2 klein, style du Sachoir).

Portrait buste centré, tête entière avec de la marge, fond uni : le recadrage en cercle tombe juste.
Sortie : app/assets/avatars/av<i>.webp (512x512). Un avatar déjà fait n'est pas refait,
sauf si son nom figure dans la variable d'environnement REDO (ex. REDO="3,7").
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from images import STYLE, QuotaExhausted, generate, paper  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "app" / "assets" / "avatars"
BG = ["pale sky blue", "soft olive green", "warm peach", "pale pink", "light ochre", "pale mint green",
      "light lavender", "warm sand", "soft wine red", "pale forest green", "light terracotta", "pale turquoise"]
WHO = [
    "Julius Caesar as a lazy procrastinator: laurel wreath askew, toga, slumped and yawning, holding a half-eaten bunch of grapes, heavy-lidded sleepy eyes",
    "the goddess Athena as an eternally dissatisfied perfectionist: crested Greek helmet pushed back, owl perched on her shoulder, one eyebrow raised, arms crossed, sceptical pout",
    "the god Zeus as a tired ageing seducer: big white curly beard, receding hair combed over, open toga showing a hairy chest, a small lightning bolt held like a cigarette, weary charming wink",
    "the goddess Venus as an influencer: flowing golden hair with a seashell hair clip, duck-face pout, holding a small hand mirror like a phone for a selfie",
    "Hercules tired of crossfit: huge muscles, lion-skin hood, sweaty forehead with sweat drops, towel around the neck, exhausted puffed cheeks",
    "Medusa having a bad day: small green snakes for hair all tangled and grumpy, dark circles under her eyes, holding a steaming coffee mug, deadpan annoyed look",
    "the god Mercury as a stressed delivery courier: winged helmet, carrying a cardboard parcel, wide panicked eyes, sweat drops, little motion lines",
    "Cleopatra as a drama queen: black bob with straight fringe, golden snake diadem, heavy eyeliner, back of the hand on her forehead in a theatrical swoon",
    "Bacchus the Tuesday-night partier: ivy and grape crown, rosy red cheeks and nose, raising a wine cup, big goofy grin, a party streamer around his neck",
    "the goddess Artemis as a rebel: bow over her shoulder, messy short hair with a crescent-moon hairpin, tiny rebellious smirk, a leaf chewed in the corner of her mouth",
    "Achilles and his sensitive heel: bronze crested helmet, proud chin, but grimacing in pain while holding up one bandaged foot",
    "Ulysses the lost tourist: curly beard, sailor cap, a big unfolded map in his hands, a little compass, confused frown, question-mark sweat drop",
]


def prompt(i: int) -> str:
    return (f"{STYLE['style']} Character portrait of {WHO[i]}. Head-and-shoulders bust, facing the viewer, "
            "the face exactly in the centre of the picture, the whole head and hair fully visible with generous "
            f"empty margin all around, plain flat {BG[i]} background with no decor. One character only, "
            "no frame, no circle, no border, no text, no letters, no logo.")


def main():
    redo = {int(x) for x in os.environ.get("REDO", "").replace(" ", "").split(",") if x}
    OUT.mkdir(parents=True, exist_ok=True)
    made = 0
    for i in range(len(WHO)):
        dest = OUT / f"av{i}.webp"
        if dest.exists() and i not in redo:
            continue
        try:
            im = generate(prompt(i), (512, 512), [])
        except QuotaExhausted as e:
            print(f"Quota atteint ({e})"); break
        except Exception as e:
            print(f"! avatar {i} : {e}"); continue
        im = im.filter(ImageFilter.UnsharpMask(1.2, 60, 2))
        im = paper(im, STYLE.get("paper_texture", 0) * 0.6)
        im.save(dest, "WEBP", quality=86, method=6)
        made += 1
        print(f"avatar {i} ok")
    print(f"{made} avatar(s) générés")


if __name__ == "__main__":
    main()
