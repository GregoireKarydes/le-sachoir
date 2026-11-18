"""Statistiques des posts Instagram et TikTok du Sachoir (18 novembre 2026).

Lancé par le workflow « Statistiques réseaux » (`.github/workflows/insights.yml`), au plus une fois par 20 h :
1. pour chaque `social/instagram/<dossier>/` qui a un `buffer.json`, `buffer-reel.json` ou `buffer-tiktok.json`
   envoyé depuis plus de 20 h et depuis moins de 45 jours, lit les métriques du post via l'API GraphQL de Buffer
   (`post { metrics { type value } }`, clé personnelle BUFFER_API_KEY, rafraîchies une fois par jour chez Buffer) ;
2. écrit `insights.json` dans le dossier du post (dernières valeurs par réseau) ;
3. reconstruit `social/instagram/stats.json` (une ligne par post et par réseau, avec ses caractéristiques : format,
   rubrique, heure, durée, accroche, formule, test) et `social/instagram/stats.md` (tableau lisible et classements),
   que lisent les tâches Claude « Instagram », « Reel sitcom » et « Stratège Instagram ».

Aucune métrique n'est inventée : un type absent chez Buffer reste absent (le réseau ne l'a pas fourni).
`--force` ignore la limite des 20 h.
"""
import json
import os
import statistics
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

ROOT = Path(__file__).resolve().parent.parent
IG = ROOT / "social" / "instagram"
API = "https://api.buffer.com"
NETWORKS = {"buffer.json": "instagram", "buffer-reel.json": "instagram-reel", "buffer-tiktok.json": "tiktok"}
MIN_AGE = timedelta(hours=20)
MAX_AGE = timedelta(days=45)
NOW = datetime.now(timezone.utc)

QUERY = "query { post(input: {id: %s}) { id status sentAt metrics { type name value unit } metricsUpdatedAt } }"


def gql(key, query):
    r = requests.post(API, json={"query": query},
                      headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, timeout=60)
    r.raise_for_status()
    data = r.json()
    if data.get("errors"):
        raise RuntimeError("; ".join(e.get("message", "?") for e in data["errors"]))
    return data["data"]


def fetch(key, post_id):
    return gql(key, QUERY % json.dumps(post_id))["post"]


def parse_time(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def first_text(post):
    slides = post.get("slides") or []
    if slides:
        return " ".join(str(slides[0].get("text", "")).replace("**", "").split())
    if post.get("hook"):
        return post["hook"]
    ep = post.get("episode") or {}
    return " ".join(str(ep.get("band", "")).split())


def features(folder, post, render):
    kind = post.get("kind", "carousel")
    return {
        "post": folder.name,
        "date": post.get("date") or folder.name[:10],
        "kind": kind,
        "slot": "actu" if folder.name.endswith("-actu") else ("sitcom" if kind == "sitcom" else "culture"),
        "rubrique": (post.get("story") or {}).get("format"),
        "time": post.get("time"),
        "slides": len(post.get("slides") or []) or None,
        "seconds": render.get("seconds"),
        "hook": first_text(post),
        "hook_formula": post.get("hook_formula") or (post.get("episode") or {}).get("hook_formula"),
        "test": post.get("test"),
        "hashtags": len(post.get("hashtags") or []),
        "caption_words": len(str(post.get("caption", "")).split()),
    }


def derive(m):
    """Indicateurs de la méthode ig-audit, quand les chiffres existent."""
    reach = m.get("reach") or m.get("impressions") or m.get("views")
    inter = sum(m.get(k) or 0 for k in ("reactions", "likes", "comments", "shares", "saves")) or None
    out = {"interactions": inter}
    if reach:
        for k, name in (("shares", "shares_per_reach"), ("saves", "saves_per_reach"), ("follows", "follows_per_reach")):
            if m.get(k) is not None:
                out[name] = round(m[k] / reach, 4)
        if inter is not None:
            out["engagement_rate"] = round(inter / reach, 4)
    return out


def collect(key):
    changed = 0
    for folder in sorted(p for p in IG.iterdir() if p.is_dir() and p.name[:4].isdigit()):
        ins_path = folder / "insights.json"
        insights = json.loads(ins_path.read_text()) if ins_path.exists() else {}
        for fname, net in NETWORKS.items():
            bj = folder / fname
            if not bj.exists():
                continue
            b = json.loads(bj.read_text())
            sent = parse_time(b.get("sent_at")) or parse_time(b.get("due_at"))
            if not b.get("id") or not sent or NOW - sent < MIN_AGE or NOW - sent > MAX_AGE:
                continue
            try:
                p = fetch(key, b["id"])
            except Exception as e:  # un post supprimé chez Buffer ne bloque pas les autres
                insights.setdefault(net, {})["error"] = str(e)[:300]
                print(f"{folder.name} {net} : {e}")
                continue
            if not p:
                continue
            metrics = {}
            for x in p.get("metrics") or []:
                if x.get("value") is not None:
                    metrics[x["type"]] = x["value"]
            insights[net] = {"buffer_id": b["id"], "sent_at": p.get("sentAt") or b.get("sent_at"),
                             "metrics_updated_at": p.get("metricsUpdatedAt"), "metrics": metrics,
                             "checked_at": NOW.isoformat(timespec="seconds")}
            changed += 1
        if insights:
            ins_path.write_text(json.dumps(insights, ensure_ascii=False, indent=1) + "\n")
    return changed


def build_stats():
    rows = []
    for ins_path in sorted(IG.glob("*/insights.json")):
        folder = ins_path.parent
        pj, rj = folder / "post.json", folder / "render.json"
        if not pj.exists():
            continue
        post = json.loads(pj.read_text())
        render = json.loads(rj.read_text()) if rj.exists() else {}
        feat = features(folder, post, render)
        for net, data in json.loads(ins_path.read_text()).items():
            m = data.get("metrics") or {}
            if not m:
                continue
            row = dict(feat, network=net, metrics=m, **derive(m))
            if net == "instagram-reel":
                row["kind"] = "reel-copie"
            rows.append(row)
    # Multiple de l'account : vues (ou portée) / médiane des 30 derniers posts du même réseau.
    for net in {r["network"].split("-")[0] for r in rows}:
        same = [r for r in rows if r["network"].split("-")[0] == net]
        vals = [(r["metrics"].get("views") or r["metrics"].get("reach") or r["metrics"].get("impressions")) for r in same]
        base = [v for v in vals[-30:] if v]
        med = statistics.median(base) if base else None
        for r, v in zip(same, vals):
            r["outlier"] = round(v / med, 2) if (v and med) else None
    out = {"updated_at": NOW.isoformat(timespec="seconds"), "rows": rows}
    (IG / "stats.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    (IG / "stats.md").write_text(render_md(rows))
    print(f"stats.json : {len(rows)} lignes")


def fmt(v, pct=False):
    if v is None:
        return "–"
    if pct:
        return f"{v * 100:.1f} %"
    return f"{v:g}" if isinstance(v, (int, float)) else str(v)


def render_md(rows):
    paris = NOW.astimezone(ZoneInfo("Europe/Paris"))
    L = [f"# Statistiques Instagram et TikTok du Sachoir",
         "",
         f"Mis à jour automatiquement le {paris:%Y-%m-%d %H:%M} (heure de Paris) par `pipeline/social_insights.py` "
         "(métriques Buffer, rafraîchies une fois par jour ; un post n'est mesuré qu'après 20 h). "
         "Fichier brut : `social/instagram/stats.json`. « – » = chiffre non fourni par le réseau.",
         ""]
    if not rows:
        L += ["Aucune statistique pour l'instant (aucun post envoyé depuis plus de 20 h, ou clé Buffer sans accès aux "
              "métriques).", ""]
        return "\n".join(L)
    cols = ["views", "reach", "reactions", "comments", "shares", "saves", "follows"]
    for net in ("instagram", "tiktok"):
        sel = [r for r in rows if r["network"].split("-")[0] == net]
        if not sel:
            continue
        L += [f"## {net.capitalize()} : 30 derniers posts", "",
              "| post | créneau | format | rubrique | heure | durée | " + " | ".join(cols)
              + " | partages/portée | enreg./portée | × médiane | accroche |",
              "|" + "---|" * (len(cols) + 10)]
        for r in sel[-30:]:
            m = r["metrics"]
            L.append("| " + " | ".join([r["post"], r["slot"], r["kind"], fmt(r["rubrique"]), fmt(r["time"]),
                                         fmt(r["seconds"]) if r["seconds"] else fmt(r["slides"] and f"{r['slides']} diap.")]
                                        + [fmt(m.get(c)) for c in cols]
                                        + [fmt(r.get("shares_per_reach"), True), fmt(r.get("saves_per_reach"), True),
                                           fmt(r.get("outlier")), r["hook"][:70].replace("|", "/")]) + " |")
        L.append("")
        # Moyennes par créneau, format et rubrique (ce qui sert à décider).
        for key, title in (("slot", "créneau"), ("kind", "format"), ("rubrique", "rubrique"), ("hook_formula", "formule d'accroche"), ("test", "test")):
            groups = {}
            for r in sel:
                if r.get(key):
                    groups.setdefault(r[key], []).append(r)
            if len(groups) < 2 and key != "slot":
                continue
            L += [f"### {net.capitalize()} par {title}", "", f"| {title} | posts | × médiane moyen | partages/portée | enreg./portée | interactions moy. |", "|---|---|---|---|---|---|"]
            for g, rs in sorted(groups.items(), key=lambda kv: -mean([x.get("outlier") for x in kv[1]], 0)):
                L.append(f"| {g} | {len(rs)} | {fmt(mean([x.get('outlier') for x in rs]))} | "
                         f"{fmt(mean([x.get('shares_per_reach') for x in rs]), True)} | "
                         f"{fmt(mean([x.get('saves_per_reach') for x in rs]), True)} | "
                         f"{fmt(mean([x.get('interactions') for x in rs]))} |")
            L.append("")
    return "\n".join(L)


def mean(vals, default=None):
    v = [x for x in vals if isinstance(x, (int, float))]
    return round(sum(v) / len(v), 4) if v else default


def main():
    key = os.environ.get("BUFFER_API_KEY")
    if not key:
        print("Pas de BUFFER_API_KEY : rien à faire.")
        return
    sj = IG / "stats.json"
    if "--force" not in sys.argv and sj.exists():
        last = parse_time(json.loads(sj.read_text()).get("updated_at"))
        if last and NOW - last < MIN_AGE:
            print(f"Statistiques déjà à jour ({last:%Y-%m-%d %H:%M} UTC).")
            return
    n = collect(key)
    print(f"{n} post(s) mesuré(s)")
    build_stats()


if __name__ == "__main__":
    main()
