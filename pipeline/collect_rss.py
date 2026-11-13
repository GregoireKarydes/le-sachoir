"""Collecte les titres de la veille dans une liste fixe de flux RSS.

Sortie : data/rss/AAAA-MM-JJ.json (date de Paris). Les fichiers de plus de 3 jours sont supprimés.
Le contenu sert uniquement à choisir et vérifier les sujets : il n'est jamais recopié dans les BD.
"""
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import feedparser
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "rss"
FEEDS = json.loads((Path(__file__).parent / "feeds.json").read_text())
PARIS = ZoneInfo("Europe/Paris")


def clean(html: str, n: int = 280) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:n]


def trends() -> list[dict]:
    """Ce qui buzze (13 novembre 2026) pour la rubrique « Pendant ce temps, sur Internet » de l'Actu :
    les recherches qui montent en France (flux RSS public de Google Trends) et les sujets tendance de
    Bluesky (API publique, sans compte ; tendances mondiales). Seulement des sujets à vérifier :
    aucun post n'est recopié."""
    out = []
    try:
        g = feedparser.parse("https://trends.google.com/trending/rss?geo=FR", agent="LeSachoirBot/1.0 (+https://github.com)")
        for e in g.entries[:20]:
            news = []
            for k in ("ht_news_item_title", "ht_news_item_source", "ht_news_item_url"):
                if e.get(k):
                    news.append(clean(e.get(k), 200))
            out.append({"source": "Google Trends FR", "title": clean(e.get("title", ""), 120),
                        "traffic": clean(e.get("ht_approx_traffic", ""), 20), "news": news})
        print(f"Google Trends FR : {len(g.entries[:20])} tendances")
    except Exception as ex:
        print(f"! Google Trends : {ex}")
    for path in ("app.bsky.unspecced.getTrends", "app.bsky.unspecced.getTrendingTopics"):
        try:
            r = requests.get(f"https://public.api.bsky.app/xrpc/{path}", params={"limit": 15}, timeout=20,
                             headers={"user-agent": "LeSachoirBot/1.0"})
            r.raise_for_status()
            d = r.json()
            items = d.get("trends") or d.get("topics") or []
            for t in items[:15]:
                out.append({"source": "Bluesky (mondial)", "title": clean(t.get("displayName") or t.get("topic", ""), 120),
                            "posts": t.get("postCount"), "status": t.get("status", ""), "link": "https://bsky.app" + t.get("link", "") if str(t.get("link", "")).startswith("/") else t.get("link", "")})
            print(f"Bluesky : {len(items[:15])} tendances")
            break
        except Exception as ex:
            print(f"! Bluesky {path} : {ex}")
    return out


def main():
    now = datetime.now(PARIS)
    since = now - timedelta(hours=30)
    items = []
    for feed in FEEDS:
        try:
            parsed = feedparser.parse(feed["url"], agent="LeSachoirBot/1.0 (+https://github.com)")
        except Exception as e:
            print(f"! {feed['name']} : {e}")
            continue
        n = 0
        for e in parsed.entries:
            when = None
            for key in ("published_parsed", "updated_parsed"):
                if getattr(e, key, None):
                    when = datetime(*getattr(e, key)[:6], tzinfo=ZoneInfo("UTC")).astimezone(PARIS)
                    break
            if when and when < since:
                continue
            items.append({
                "source": feed["name"],
                "rubrique": feed.get("rubrique", ""),
                "role": feed.get("role", "veille"),  # "selection" = liste de sujets de référence (HugoDécrypte)
                "title": clean(e.get("title", ""), 300),
                "summary": clean(e.get("summary", ""), 900 if feed.get("role") == "selection" else 280),
                "link": e.get("link", ""),
                "published": when.isoformat() if when else None,
            })
            n += 1
        print(f"{feed['name']} : {n} titres")
    OUT.mkdir(parents=True, exist_ok=True)
    day = now.date().isoformat()
    (OUT / f"{day}.json").write_text(json.dumps({"collected_at": now.isoformat(), "items": items, "trends": trends()}, ensure_ascii=False, indent=1))
    for old in OUT.glob("*.json"):
        if old.stem < (now.date() - timedelta(days=3)).isoformat():
            old.unlink()
    print(f"{len(items)} titres enregistrés dans data/rss/{day}.json")


if __name__ == "__main__":
    main()
