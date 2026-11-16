"""Vrais posts (13 novembre 2026) : lecture du HTML d'intégration officiel, post supprimé, erreur réseau."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "pipeline"))
import embeds  # noqa: E402

X_HTML = ('<blockquote class="twitter-tweet"><p lang="fr" dir="ltr">La chocolatine a gagné.<br>Fin du débat. '
          '<a href="https://t.co/abc">pic.twitter.com/abc123</a></p>&mdash; Boulangerie Dupain (@dupain) '
          '<a href="https://twitter.com/dupain/status/1?ref_src=twsrc%5Etfw">November 13, 2026</a></blockquote>')
BSKY_HTML = ('<blockquote class="bluesky-post" data-bluesky-uri="at://x"><p lang="fr">Il gèle à Lille, '
             'les Lillois sortent en t-shirt.</p>&mdash; Météo pour rire (<a href="https://bsky.app/profile/x">@meteo.bsky.social</a>) '
             '<a href="https://bsky.app/profile/x/post/abc">13 novembre 2026</a></blockquote>')


def test_lecture_d_un_tweet_integre():
    p = embeds.parse_blockquote(X_HTML)
    assert p["text"] == "La chocolatine a gagné.\nFin du débat."
    assert p["author"] == "Boulangerie Dupain" and p["handle"] == "@dupain" and p["date"] == "November 13, 2026"


def test_lecture_d_un_post_bluesky_integre():
    p = embeds.parse_blockquote(BSKY_HTML)
    assert p["text"].startswith("Il gèle à Lille") and p["date"] == "13 novembre 2026"


def test_reseaux_reconnus():
    assert embeds.provider("https://x.com/dupain/status/1856") == "x"
    assert embeds.provider("https://twitter.com/dupain/status/1856?s=20") == "x"
    assert embeds.provider("https://bsky.app/profile/a.bsky.social/post/3kabc") == "bluesky"
    assert embeds.provider("https://www.tiktok.com/@chef.toto/video/7212") == "tiktok"
    assert embeds.provider("https://www.instagram.com/p/abc/") is None


def fmt(post):
    return {"id": "actu", "cases": [{"n": 9, "kind": "buzz", "text": "Notre vanne.", "post": post}]}


def test_post_recupere_puis_supprime(monkeypatch, tmp_path):
    f = fmt({"url": "https://x.com/dupain/status/1"})
    monkeypatch.setattr(embeds, "resolve", lambda u: {"platform": "x", "label": "X", "url": u, "text": "Salut", "author": "A", "handle": "@a", "date": ""})
    assert embeds.refresh(f, tmp_path) and f["cases"][0]["post"]["status"] == "ok"
    assert not embeds.refresh(f, tmp_path)  # déjà récupéré : rien à refaire hors publication

    def gone(u):
        raise embeds.Gone("X : 404")
    monkeypatch.setattr(embeds, "resolve", gone)
    assert embeds.refresh(f, tmp_path, recheck=True)
    assert f["cases"][0]["post"]["status"] == "gone" and "embed" not in f["cases"][0]["post"]


def test_erreur_reseau_rien_ne_change(monkeypatch, tmp_path):
    f = fmt({"url": "https://x.com/dupain/status/1"})

    def boom(u):
        raise ConnectionError("réseau")
    monkeypatch.setattr(embeds, "resolve", boom)
    assert not embeds.refresh(f, tmp_path) and "status" not in f["cases"][0]["post"]


# ---------- Vraies images de « Sur Internet » (16 novembre 2026) ----------
def test_videos_reconnues():
    for u in ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ",
              "https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ"):
        assert embeds.provider(u) == "youtube" and embeds.youtube_id(u) == "dQw4w9WgXcQ"
    assert embeds.provider("https://www.youtube.com/@chaine") is None
    thumbs = embeds.youtube_thumbs("https://youtu.be/dQw4w9WgXcQ", "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg")
    assert thumbs[0].endswith("/dQw4w9WgXcQ/maxresdefault.jpg") and thumbs[-1].endswith("hqdefault.jpg")


def video_fmt(video):
    return {"id": "actu", "cases": [{"n": 14, "kind": "buzz", "title": "Un buzz", "text": "Notre vanne.", "video": video}]}


def test_vignette_de_la_video_copiee(monkeypatch, tmp_path):
    f = video_fmt({"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"})
    monkeypatch.setattr(embeds, "resolve", lambda u: {"platform": "youtube", "label": "YouTube", "url": u, "text": "Le clip", "author": "Une chaîne",
                                                      "handle": "", "date": "", "thumb_urls": ["https://i.ytimg.com/a.jpg", "https://i.ytimg.com/b.jpg"]})
    tried = []

    class R:
        def __init__(self, ok): self.ok_, self.content = ok, b"x" * 5000
        def raise_for_status(self):
            if not self.ok_:
                raise ConnectionError("404")
    monkeypatch.setattr(embeds.requests, "get", lambda u, **k: (tried.append(u), R(u.endswith("b.jpg")))[1])
    assert embeds.buzz_media(f["cases"][0]) == ""
    assert embeds.refresh(f, tmp_path)
    v = f["cases"][0]["video"]
    assert tried == ["https://i.ytimg.com/a.jpg", "https://i.ytimg.com/b.jpg"]  # la grande taille manque : on prend la suivante
    assert v["status"] == "ok" and v["embed"]["thumb"] == "images/buzz-14.jpg" and (tmp_path / "images/buzz-14.jpg").exists()
    assert "thumb_urls" not in v["embed"] and embeds.buzz_media(f["cases"][0]) == "video"
    # à la publication : revérifiée sans retélécharger la vignette
    tried.clear()
    assert not embeds.refresh(f, tmp_path, recheck=True) and tried == []


def test_video_sans_vignette_reste_en_attente(monkeypatch, tmp_path):
    f = video_fmt({"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"})
    monkeypatch.setattr(embeds, "resolve", lambda u: {"platform": "youtube", "label": "YouTube", "url": u, "text": "T", "author": "A", "handle": "", "date": "", "thumb_urls": []})
    assert not embeds.refresh(f, tmp_path) and "status" not in f["cases"][0]["video"]
    assert embeds.buzz_media(f["cases"][0]) == ""


def test_image_prete_photo_ou_post():
    assert embeds.buzz_media({"photo": {"status": "done", "file": "images/photo-1.webp"}}) == "photo"
    assert embeds.buzz_media({"photo": {"commons": "File:X.jpg"}}) == ""
    assert embeds.buzz_media({"post": {"status": "ok", "embed": {"text": "t"}}}) == "post"
