"""Écrans d'ouverture de l'appli installée sur iPhone (13 novembre 2026) : sans eux, iOS montre un écran blanc
au lancement. Fond crème, logo et promesse, une image par taille d'écran (balises dans app/index.html).
Lancer après un changement de logo : python3 pipeline/splash.py"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "assets" / "splash"
# (largeur CSS, hauteur CSS, densité) des iPhone portrait courants, du SE au 16 Pro Max.
SIZES = [(440, 956, 3), (402, 874, 3), (430, 932, 3), (393, 852, 3), (428, 926, 3), (390, 844, 3),
         (375, 812, 3), (414, 896, 3), (414, 896, 2), (375, 667, 2)]


def make(w, h, r):
    W, H = w * r, h * r
    im = Image.new("RGB", (W, H), (250, 246, 238))
    logo = Image.open(ROOT / "app" / "assets" / "logo.png").convert("RGBA")
    lw = int(W * 0.62)
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    y = int(H * 0.43) - logo.height // 2
    im.paste(logo, ((W - lw) // 2, y), logo)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(str(ROOT / "pipeline" / "fonts" / "Roboto-Medium.ttf"), int(17 * r))
    d.text((W // 2, y + logo.height + int(26 * r)), "L’actu et la culture G en BD", font=f, fill=(95, 90, 82), anchor="mt")
    return im


def tags() -> str:
    return "\n".join(f'<link rel="apple-touch-startup-image" media="(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait)" href="assets/splash/splash-{w*r}x{h*r}.png">' for w, h, r in SIZES)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for w, h, r in SIZES:
        make(w, h, r).save(OUT / f"splash-{w*r}x{h*r}.png", optimize=True)
    print(tags())
