"""Vrais posts dans « Pendant ce temps, sur Internet » (13 novembre 2026).

On ne lit pas les réseaux (l'API de X est payante) : la tâche Actu donne l'adresse d'un post public et viral,
et on la passe à l'outil d'intégration officiel du réseau (oEmbed, gratuit, celui qu'utilisent les journaux).
On en garde l'auteur, le pseudo, le texte, la date et le lien, que l'appli affiche elle-même : aucun script ni
traceur du réseau n'est chargé chez le lecteur. Un post supprimé ou devenu privé n'est plus renvoyé :
la case reprend alors sa version réécrite par le Sachoir.

Réseaux pris en charge : X (Twitter), Bluesky, TikTok (vignette téléchargée, les liens expirent)."""
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
]
LABEL = {"x": "X", "bluesky": "Bluesky", "tiktok": "TikTok"}


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
    else:
        post = parse_blockquote(d.get("html", ""))
        post["author"] = post["author"] or d.get("author_name", "")
    if not post["text"] and not post.get("thumb_url"):
        raise Gone(f"{LABEL[name]} : post vide")
    return {"platform": name, "label": LABEL[name], "url": url, **post}


def refresh(fmt: dict, ed_dir: Path, recheck: bool = False) -> bool:
    """Pour chaque case « Sur Internet » qui cite un vrai post (`post.url`) : va chercher le post si ce n'est
    pas fait (ou le revérifie si `recheck`, au moment de la publication). Renvoie True si l'édition a changé.
    Une erreur réseau ne change rien : on réessaiera au passage suivant."""
    changed = False
    for c in fmt.get("cases", []) or []:
        post = c.get("post") if isinstance(c, dict) and c.get("kind") == "buzz" else None
        if not isinstance(post, dict) or not post.get("url"):
            continue
        if post.get("status") == "gone" or (post.get("status") == "ok" and not recheck):
            continue
        try:
            emb = resolve(post["url"])
        except Gone as e:
            post.update(status="gone", error=str(e)[:200])
            post.pop("embed", None)
            changed = True
            print(f"  post retiré ({e}) : {post['url']}")
            continue
        except Exception as e:  # réseau, quota : on garde l'état et on réessaiera
            print(f"  ! post {post['url']} : {e}")
            continue
        thumb = emb.pop("thumb_url", "")
        if thumb:
            try:
                img = requests.get(thumb, headers=UA, timeout=20)
                img.raise_for_status()
                rel = f"images/post-{c.get('n', 'x')}.jpg"
                (ed_dir / "images").mkdir(parents=True, exist_ok=True)
                (ed_dir / rel).write_bytes(img.content)
                emb["thumb"] = rel
            except Exception as e:
                print(f"  ! vignette {post['url']} : {e}")
        if post.get("embed") != emb or post.get("status") != "ok":
            post.update(status="ok", embed=emb)
            post.pop("error", None)
            changed = True
    return changed
