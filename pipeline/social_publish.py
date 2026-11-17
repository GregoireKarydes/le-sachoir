"""Instagram (17 novembre 2026) : envoie le post du jour à Buffer, qui le publie sur Instagram à l'heure prévue.

Ne fait rien tant que le secret GitHub `BUFFER_API_KEY` n'est pas posé (la fonction s'active avec sa clé).
`BUFFER_CHANNEL_ID` est facultatif : sans lui, le premier canal Instagram du compte Buffer est pris.

Pour chaque `social/instagram/<date>/` du jour qui a son `render.json` et pas encore de `buffer.json` :
1. vérifie que les fichiers sont bien en ligne sur le site (GitHub Pages, `pipeline/site.json` → base_url) ;
2. appelle `createPost` (API GraphQL de Buffer, https://api.buffer.com) en publication programmée à l'heure du post
   (`time`, 12:15 heure de Paris par défaut ; si l'heure est passée, dans 10 minutes) ;
3. écrit `buffer.json` (identifiant Buffer, heure prévue) ou `buffer-error.json` (le message d'erreur).

Usage : python pipeline/social_publish.py [--dry-run]"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

ROOT = Path(__file__).resolve().parent.parent
SOCIAL = ROOT / "social" / "instagram"
PARIS = ZoneInfo("Europe/Paris")
API = "https://api.buffer.com"
BASE = json.loads((ROOT / "pipeline" / "site.json").read_text())["base_url"].rstrip("/") + "/"
DEFAULT_TIME = "12:15"


def gql(key, query, variables=None):
    r = requests.post(API, json={"query": query, "variables": variables or {}},
                      headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, timeout=60)
    r.raise_for_status()
    data = r.json()
    if data.get("errors"):
        raise RuntimeError("; ".join(e.get("message", "?") for e in data["errors"]))
    return data["data"]


def instagram_channel(key):
    if os.environ.get("BUFFER_CHANNEL_ID"):
        return os.environ["BUFFER_CHANNEL_ID"]
    orgs = gql(key, "query { account { organizations { id name } } }")["account"]["organizations"]
    for org in orgs:
        chans = gql(key, 'query { channels(input: {organizationId: %s}) { id name service isQueuePaused } }'
                    % json.dumps(org["id"]))["channels"]
        for c in chans:
            if c.get("service") == "instagram":
                print(f"Canal Instagram Buffer : {c['name']} ({c['id']})")
                return c["id"]
    raise RuntimeError("aucun canal Instagram dans le compte Buffer (connecte le compte pro Instagram dans Buffer)")


def online(url):
    try:
        return requests.head(url, timeout=30, allow_redirects=True).status_code == 200
    except requests.RequestException:
        return False


def caption_of(post):
    text = post.get("caption", "").strip()
    tags = " ".join(t if t.startswith("#") else "#" + t for t in post.get("hashtags", []))
    return (text + ("\n\n" + tags if tags and tags not in text else "")).strip()


def due_at(post, now):
    hh, mm = (post.get("time") or DEFAULT_TIME).split(":")
    day = datetime.fromisoformat(post["date"]).date()
    due = datetime(day.year, day.month, day.day, int(hh), int(mm), tzinfo=PARIS)
    soon = now + timedelta(minutes=10)
    return max(due, soon)


def build_input(folder, post, render, channel, due):
    url = f"{BASE}social/instagram/{folder}/"
    alt = (post.get("alt") or post.get("hook") or "Le Sachoir")[:400]
    if render.get("kind") == "reel":
        assets = [{"video": {"url": url + render["files"][0], "metadata": {"thumbnailOffset": 500}}}]
        ig_type = "reel"
    else:
        assets = [{"image": {"url": url + f, "metadata": {"altText": alt}}} for f in render["files"]]
        ig_type = "post"
    return {
        "text": caption_of(post),
        "channelId": channel,
        "schedulingType": "automatic",
        "mode": "customScheduled",
        "dueAt": due.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        "assets": assets,
        "metadata": {"instagram": {"type": ig_type, "shouldShareToFeed": True}},
    }


CREATE = """mutation($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id dueAt } }
    ... on MutationError { message }
  }
}"""


def main(args):
    dry = "--dry-run" in args
    key = os.environ.get("BUFFER_API_KEY", "").strip()
    if not key and not dry:
        print("Instagram : secret BUFFER_API_KEY absent, rien n'est envoyé (les posts restent prêts dans social/instagram/).")
        return
    now = datetime.now(PARIS)
    today = now.date().isoformat()
    todo = []
    for pj in sorted(SOCIAL.glob("*/post.json")):
        d = pj.parent
        post = json.loads(pj.read_text())
        if post.get("date") != today or post.get("skip") or (d / "buffer.json").exists():
            continue
        if not (d / "render.json").exists():
            print(f"::warning::Instagram {d.name} : pas encore rendu.")
            continue
        todo.append((d, post, json.loads((d / "render.json").read_text())))
    if not todo:
        print(f"Instagram : rien à envoyer pour le {today}.")
        return
    channel = None if dry else instagram_channel(key)
    for d, post, render in todo:
        missing = [f for f in render["files"] if not online(f"{BASE}social/instagram/{d.name}/{f}")]
        if missing and not dry:
            print(f"::warning::Instagram {d.name} : fichiers pas encore en ligne ({', '.join(missing)}), nouvel essai au prochain passage.")
            continue
        inp = build_input(d.name, post, render, channel or "DRY", due_at(post, now))
        if dry:
            print(json.dumps(inp, ensure_ascii=False, indent=1))
            continue
        try:
            res = gql(key, CREATE, {"input": inp})["createPost"]
        except Exception as e:  # noqa
            res = {"message": str(e)}
        if res.get("post"):
            (d / "buffer.json").write_text(json.dumps({"id": res["post"]["id"], "due_at": res["post"].get("dueAt") or inp["dueAt"],
                                                       "sent_at": now.isoformat(timespec="seconds")}, indent=1) + "\n")
            (d / "buffer-error.json").unlink(missing_ok=True)
            print(f"Instagram {d.name} : envoyé à Buffer, publication prévue {inp['dueAt']}.")
        else:
            (d / "buffer-error.json").write_text(json.dumps({"at": now.isoformat(timespec="seconds"), "message": res.get("message")},
                                                            ensure_ascii=False, indent=1) + "\n")
            print(f"::warning::Instagram {d.name} : Buffer a refusé le post ({res.get('message')}).")


if __name__ == "__main__":
    main(sys.argv[1:])
