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


def test_looks_like_page_detects_comic_grid():
    """15/11/2026 : l'Actu du jour avait des planches de 4 à 6 vignettes au lieu d'une image par sujet."""
    import images
    from PIL import Image, ImageDraw
    page = Image.new("RGB", (512, 896), (240, 240, 250))
    d = ImageDraw.Draw(page)
    for box in [(10, 10, 250, 440), (262, 10, 502, 440), (10, 452, 250, 886), (262, 452, 502, 886)]:
        d.rectangle(box, fill=(180, 200, 230), outline=(0, 0, 0), width=4)
    assert images.looks_like_page(page)
    single = Image.new("RGB", (512, 896), (240, 240, 250))
    ImageDraw.Draw(single).ellipse((150, 300, 360, 800), fill=(200, 120, 90), outline=(0, 0, 0), width=6)
    assert not images.looks_like_page(single)


def test_actu_context_has_no_other_subjects():
    import images
    fmt = {"id": "actu", "art": {"subject": "four news stories", "setting": "a stadium, a control room", "era": "2026"}}
    ctx = images.story_context(fmt)
    assert "stadium" not in ctx and "four news" not in ctx and "2026" in ctx
