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


def test_creneau_des_reels_sitcom(tmp_path):
    # 18 novembre 2026 (soir) : trois Reels sitcom par jour, le créneau vient du champ `slot` du post.json.
    import social_insights
    d = tmp_path / "2026-11-19-sitcom-origine"
    d.mkdir()
    f = social_insights.features(d, {"kind": "sitcom", "slot": "origine", "time": "07:45"}, {})
    assert f["slot"] == "origine"
    assert social_insights.features(tmp_path / "2026-11-18-sitcom", {"kind": "sitcom"}, {})["slot"] == "sitcom"
    assert social_insights.features(tmp_path / "2026-11-18-actu", {}, {})["slot"] == "actu"
