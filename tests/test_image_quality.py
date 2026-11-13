"""Qualité des BD (13 novembre 2026) : fond harmonisé par format, coût du modèle premium, consignes de peau."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
import images  # noqa: E402


def scene(bg=(200, 225, 250)):
    """Fond bleu pastel, ligne de sol, un personnage au contour noir avec un œil blanc fermé par le trait."""
    im = Image.new("RGB", (256, 448), bg)
    d = ImageDraw.Draw(im)
    d.line([(0, 330), (256, 330)], fill=(0, 0, 0), width=3)
    d.ellipse([90, 180, 170, 260], fill=(250, 210, 180), outline=(0, 0, 0), width=4)
    d.ellipse([110, 200, 130, 220], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
    return im


def test_fond_pris_par_la_teinte_du_format_au_dessus_et_sous_le_sol():
    out = images.harmonize(scene(), "cultureg")
    want = tuple(images.HARM["bg"]["cultureg"])
    assert out.getpixel((10, 10)) == want
    assert out.getpixel((10, 420)) == want          # sous la ligne du sol aussi
    assert out.getpixel((130, 240)) == (250, 210, 180)  # le visage ne bouge pas
    assert out.getpixel((120, 210)) == (255, 255, 255)  # l'œil blanc, fermé par le trait, non plus


def test_fond_sombre_ou_introuvable_laisse_intact():
    dark = scene(bg=(30, 30, 40))
    assert images.harmonize(dark, "insolite").tobytes() == dark.tobytes()
    noisy = Image.effect_noise((256, 448), 120).convert("RGB")
    assert images.harmonize(noisy, "insolite").tobytes() == noisy.tobytes()


def test_cout_premium_arrondi_au_megapixel():
    ref = ROOT / "pipeline" / "style_ref.png"
    assert images.premium_cost((512, 896), []) == 0.03
    assert images.premium_cost((512, 896), [ref] * 4) == 0.045
    assert images.premium_cost((896, 512), [ref]) == 0.03


def test_peau_jamais_en_aplat_noir_dans_les_consignes_imperatives():
    style = json.loads((ROOT / "pipeline" / "style.json").read_text())
    assert "never filled in black" in style["constraints"]
    prompt, _ = images.build("A king waves.", [])
    assert prompt.index("never filled in black") < prompt.index(style["style"][:40])
