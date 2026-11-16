"""Vrais posts dans « Pendant ce temps, sur Internet » (13 novembre 2026).

On ne lit pas les réseaux (l'API de X est payante) : la tâche Actu donne l'adresse d'un post public et viral,
et on la passe à l'outil d'intégration officiel du réseau (oEmbed, gratuit, celui qu'utilisent les journaux).
On en garde l'auteur, le pseudo, le texte, la date et le lien, que l'appli affiche elle-même : aucun script ni
traceur du réseau n'est chargé chez le lecteur. Un post supprimé ou devenu privé n'est plus renvoyé :
la case reprend alors sa version réécrite par le Sachoir.

Réseaux pris en charge : X (Twitter), Bluesky, TikTok (vignette téléchargée, les liens expirent).

Vraies images (16 novembre 2026, demande de Greg : « les faux posts de réseau, c'est pas terrible ») : une case
« Sur Internet » montre désormais une vraie image. Soit la vignette officielle de la vidéo du buzz (`video.url`,
YouTube ou TikTok : l'image que la plateforme fournit elle-même pour les aperçus de liens), copiée à côté de
l'édition, avec un lien vers la vidéo ; soit une photo libre de Wikimedia Commons (`photo.commons`, voir photos.py)."""
import html
import re
from pathlib import Path
from urllib.parse import quote

import requests

UA = {"user-agent": "LeSachoirBot/1.0 (+https://github.com/GregoireKarydes/le-sachoir)"}
PROVIDERS = [
    ("x", re.compile(r"^https://(www\.|mobile\.)?(twitter|x)\.com/[A-Za-z0-9_]{1,15}/status/\d+"),
     "https://publish.twitter.com/oembed?omit_script=1&dnt=true&url={u}"),
    ("bluesky", re.compile(r"^https://bsky\.app/profile/[^/]+/post/[a-z0-9]+"),
     "https://embed.bsky.app/oembed?url={u}"),
    ("tiktok", re.compile(r"^https://(www\.)?tiktok\.com/@[\w.]+/video/\d+"),
     "https://www.tiktok.com/oembed?url={u}"),
    ("youtube", re.compile(r"^https://((www\.|m\.)?youtube\.com/(watch\?(.*&)?v=|shorts/)|youtu\.be/)[A-Za-z0-9_-]{11}"),
     "https://www.youtube.com/oembed?format=json&url={u}"),
]
LABEL = {"x": "X", "bluesky": "Bluesky", "tiktok": "TikTok", "youtube": "YouTube"}
VIDEO = ("youtube", "tiktok")  # réseaux dont la vignette officielle peut illustrer une case « Sur Internet »


def youtube_id(url: str) -> str:
    m = re.search(r"(?:v=|shorts/|youtu\.be/)([A-Za-z0-9_-]{11})", url or "")
    return m.group(1) if m else ""


def youtube_thumbs(url: str, fallback: str = "") -> list:
    """Vignettes d'une vidéo YouTube, de la plus grande (16:9, sans bandes noires) à celle que donne oEmbed."""
    vid = youtube_id(url)
    out = [f"https://i.ytimg.com/vi/{vid}/{n}.jpg" for n in ("maxresdefault", "hq720", "mqdefault")] if vid else []
    return out + ([fallback] if fallback else [])


class Gone(Exception):
    """Le post n'existe plus, est privé ou masqué : ne plus l'afficher."""


def provider(url: str) -> str | None:
    for name, rx, _ in PROVIDERS:
        if rx.match(url or ""):
            return name
    return None


def _text(fragment: str) -> str:
    t = re.sub(r"<br\s*/?>", "\n", fragment or "", flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    return html.unescape(re.sub(r"[ \t]+", " ", t)).strip()


def parse_blockquote(markup: str) -> dict:
    """X et Bluesky renvoient un <blockquote> : <p>le texte</p> &mdash; Nom (@pseudo) <a href="…">date</a>."""
    p = re.search(r"<p[^>]*>(.*?)</p>", markup or "", re.S)
    text = _text(p.group(1)) if p else ""
    text = re.sub(r"\s*(pic\.twitter\.com|pic\.x\.com)/\S+$", "", text).strip()  # lien d'image en fin de tweet
    tail = (markup or "")[p.end():] if p else (markup or "")
    who = re.search(r"&mdash;\s*(.*?)\s*\((@[^)]+)\)", tail) or re.search(r"—\s*(.*?)\s*\((@[^)]+)\)", tail)
    date = re.findall(r"<a[^>]*>([^<]+)</a>", tail)
    return {"text": text, "author": html.unescape(who.group(1)).strip() if who else "",
            "handle": who.group(2).strip() if who else "", "date": html.unescape(date[-1]).strip() if date else ""}


def resolve(url: str, timeout: int = 20) -> dict:
    """Renvoie le post tel que le réseau le publie pour intégration. Gone s'il n'est plus public."""
    name = provider(url)
    if not name:
        raise ValueError(f"réseau non pris en charge : {url}")
    endpoint = next(e for n, _, e in PROVIDERS if n == name).format(u=quote(url, safe=""))
    r = requests.get(endpoint, headers=UA, timeout=timeout)
    if r.status_code in (400, 403, 404, 410):
        raise Gone(f"{LABEL[name]} : {r.status_code}")
    r.raise_for_status()
    d = r.json()
    if name == "tiktok":
        post = {"text": (d.get("title") or "").strip(), "author": d.get("author_name", ""),
                "handle": "@" + d.get("author_unique_id", "") if d.get("author_unique_id") else "",
                "date": "", "thumb_url": d.get("thumbnail_url", "")}
    elif name == "youtube":
        post = {"text": (d.get("title") or "").strip(), "author": d.get("author_name", ""), "handle": "", "date": "",
                "thumb_urls": youtube_thumbs(url, d.get("thumbnail_url", ""))}
    else:
        post = parse_blockquote(d.get("html", ""))
        post["author"] = post["author"] or d.get("author_name", "")
    if not post["text"] and not post.get("thumb_url") and not post.get("thumb_urls"):
        raise Gone(f"{LABEL[name]} : post vide")
    return {"platform": name, "label": LABEL[name], "url": url, **post}


def _download(urls: list, dest: Path) -> bool:
    """Copie la première vignette qui répond (les liens TikTok expirent, YouTube n'a pas toujours la grande taille)."""
    for u in urls:
        try:
            img = requests.get(u, headers=UA, timeout=20)
            img.raise_for_status()
            if len(img.content) < 1500:  # image vide ou de remplacement
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(img.content)
            return True
        except Exception as e:  # noqa: BLE001
            print(f"  ! vignette {u} : {e}")
    return False


def _refresh_one(obj: dict, rel: str, ed_dir: Path, recheck: bool, need_thumb: bool) -> bool:
    """Un vrai post (`post`) ou la vidéo qui illustre la case (`video`). Renvoie True si quelque chose a changé."""
    if obj.get("status") == "gone" or (obj.get("status") == "ok" and not recheck):
        return False
    try:
        emb = resolve(obj["url"])
    except Gone as e:
        obj.update(status="gone", error=str(e)[:200])
        obj.pop("embed", None)
        print(f"  retiré ({e}) : {obj['url']}")
        return True
    except Exception as e:  # réseau, quota : on garde l'état et on réessaiera
        print(f"  ! {obj['url']} : {e}")
        return False
    urls = emb.pop("thumb_urls", None) or ([emb.pop("thumb_url")] if emb.get("thumb_url") else [])
    emb.pop("thumb_url", None)
    had = (obj.get("embed") or {}).get("thumb")
    if had and (ed_dir / had).exists():
        emb["thumb"] = had  # déjà copiée : on ne la retélécharge pas à chaque passage
    elif urls and _download(urls, ed_dir / rel):
        emb["thumb"] = rel
    if need_thumb and not emb.get("thumb"):
        print(f"  ! pas de vignette pour {obj['url']} : nouvel essai au prochain passage")
        return False
    if obj.get("embed") != emb or obj.get("status") != "ok":
        obj.update(status="ok", embed=emb)
        obj.pop("error", None)
        return True
    return False


def refresh(fmt: dict, ed_dir: Path, recheck: bool = False) -> bool:
    """Pour chaque case « Sur Internet » : va chercher le vrai post cité (`post.url`) et la vidéo qui l'illustre
    (`video.url`, YouTube ou TikTok) si ce n'est pas fait, ou les revérifie si `recheck` (au moment de la
    publication). Renvoie True si l'édition a changé. Une erreur réseau ne change rien : on réessaiera."""
    changed = False
    for c in fmt.get("cases", []) or []:
        if not isinstance(c, dict) or c.get("kind") != "buzz":
            continue
        post, video = c.get("post"), c.get("video")
        if isinstance(post, dict) and post.get("url"):
            changed = _refresh_one(post, f"images/post-{c.get('n', 'x')}.jpg", ed_dir, recheck, need_thumb=False) or changed
        if isinstance(video, dict) and video.get("url") and provider(video["url"]) in VIDEO:
            changed = _refresh_one(video, f"images/buzz-{c.get('n', 'x')}.jpg", ed_dir, recheck, need_thumb=True) or changed
    return changed


def buzz_media(c: dict) -> str:
    """La vraie image prête pour une case « Sur Internet » : "video", "photo", "post" ou "" (rien de prêt)."""
    v, ph, po = c.get("video") or {}, c.get("photo") or {}, c.get("post") or {}
    if v.get("status") == "ok" and (v.get("embed") or {}).get("thumb"):
        return "video"
    if ph.get("status") == "done" and ph.get("file"):
        return "photo"
    if po.get("status") == "ok" and po.get("embed"):
        return "post"
    return ""
