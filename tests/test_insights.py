import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import social_insights as si  # noqa: E402


def test_derive_ratios():
    d = si.derive({"reach": 1000, "reactions": 50, "comments": 5, "shares": 20, "saves": 10, "follows": 3})
    assert d["interactions"] == 85
    assert d["shares_per_reach"] == 0.02
    assert d["follows_per_reach"] == 0.003


def test_derive_sans_portee():
    d = si.derive({"reactions": 4})
    assert d == {"interactions": 4}


def test_markdown_vide():
    assert "Aucune statistique" in si.render_md([])
