"""Image de partage d'une BD (13 novembre 2026) : 1200 x 630, créée une fois, refaite si le titre change."""
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import share_card  # noqa: E402

SRC = Path(__file__).resolve().parent.parent / "editions" / "2026-11-13"


def test_image_de_partage_creee_puis_reutilisee(tmp_path):
    ed = tmp_path / "2026-11-13"
    (ed / "images").mkdir(parents=True)
    shutil.copy(SRC / "images" / "cultureg-cover.webp", ed / "images" / "cultureg-cover.webp")
    fmt = {"id": "cultureg", "label": "La Pilule de Culture G", "title": "Bonne année ! Oui, mais laquelle ?",
           "theme": "Histoire moderne", "minutes": 2, "cover": {"file": "images/cultureg-cover.webp", "status": "done"}, "cases": []}
    name = share_card.ensure(fmt, ed)
    assert name.startswith("images/share-cultureg-") and name.endswith(".jpg")
    from PIL import Image
    assert Image.open(ed / name).size == (1200, 630)
    assert share_card.ensure(fmt, ed) == name  # même contenu : même fichier, pas de nouveau rendu
    other = share_card.ensure({**fmt, "title": "Un tout autre titre, beaucoup plus long que le premier pour voir"}, ed)
    assert other != name and not (ed / name).exists() and (ed / other).exists()


def test_sans_image_une_carte_de_couleur():
    im = share_card.render({"id": "insolite", "title": "Titre", "cases": []}, None)
    assert im.size == (1200, 630)
