"""Vérifie le site EN LIGNE, comme un lecteur : l'édition du jour est-elle publiée, avec ses images ?

Usage : python pipeline/health_check.py
Écrit dans $GITHUB_OUTPUT : status=ok|fail|early, ahead=<jours d'avance>, et un résumé dans health-report.md.
Ne dépend que de la bibliothèque standard.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
BASE = (os.environ.get("SACHOIR_BASE_URL") or json.loads((ROOT / "pipeline" / "site.json").read_text())["base_url"]).rstrip("/") + "/"


def get(url: str, as_json=False):
    req = urllib.request.Request(url + ("&" if "?" in url else "?") + f"t={int(datetime.now().timestamp())}",
                                 headers={"User-Agent": "sachoir-health-check", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read()
        return json.loads(body) if as_json else (r.status, len(body))


def main():
    now = datetime.now(ZoneInfo("Europe/Paris"))
    today = now.date().isoformat()
    out, lines, status = {}, [], "ok"
    if now.hour < 5 or (now.hour == 5 and now.minute < 15):
        out["status"] = "early"  # cron d'été lancé une heure trop tôt l'hiver (ou l'inverse) : rien à vérifier
        print("Trop tôt pour vérifier l'édition du jour.")
    else:
        try:
            idx = get(BASE + "editions/index.json", as_json=True)
            ed = next((e for e in idx.get("editions", []) if e["date"] == today), None)
            stories = [f for f in (ed or {}).get("formats", []) if f["id"] != "quiz"]
            if not ed:
                status = "fail"
                lines.append(f"❌ L'édition du {today} n'est pas en ligne (dernière : {idx['editions'][0]['date'] if idx.get('editions') else 'aucune'}).")
            elif not stories:
                status = "fail"
                lines.append(f"❌ L'édition du {today} est en ligne mais sans aucune BD (jeu seul).")
            else:
                lines.append(f"✅ Édition du {today} en ligne : {', '.join(f['id'] for f in stories)}.")
                # Une image réelle doit répondre : on prend la première case de la première BD.
                first = stories[0]
                story = get(BASE + f"editions/{today}/edition.json", as_json=True)
                fmt = next(x for x in story["formats"] if x["id"] == first["id"])
                img = fmt["cases"][0]["image"]["file"]
                code, size = get(BASE + f"editions/{today}/{img}")
                if code != 200 or size < 2000:
                    status = "fail"
                    lines.append(f"❌ Image {img} inaccessible ou vide ({code}, {size} octets).")
                else:
                    lines.append(f"✅ Images servies ({img}, {size // 1024} Ko).")
        except Exception as e:
            status = "fail"
            lines.append(f"❌ Site injoignable ou réponse invalide : {e!r}")
        out["status"] = status
    # État de la chaîne publié par publish.py (avance, quota, problèmes)
    try:
        h = get(BASE + "status.json", as_json=True)
        out["ahead"] = str(h.get("days_ahead_drawn", 0))
        q = h.get("quota") or {}
        lines.append(f"📦 Avance dessinée : {h.get('days_ahead_drawn', 0)} jour(s) ; écrite : {h.get('days_ahead_written', 0)} jour(s).")
        for kind, s in (h.get("stock") or {}).items():
            lines.append(f"🗂️ File {kind} : {s.get('ready', 0)} finie(s), {s.get('waiting', 0)} en cours"
                         + (f", {s['blocked']} bloquée(s)" if s.get("blocked") else "")
                         + (f" — en cours : {s['focus']}" if s.get("focus") else ""))
        lines.append(f"🎨 Quota du jour (UTC {q.get('day', '?')}) : {q.get('count', '?')} appels, ~{q.get('neurons', '?')} neurones estimés.")
        fal = h.get("fal") or {}
        if fal:
            lines.append(f"💶 Renfort fal.ai ({fal.get('month')}) : {fal.get('images', 0)} images, ~{fal.get('spent_usd', 0):.2f} $"
                         + (" — refusé aujourd'hui (crédit épuisé ?)" if fal.get("blocked") == today else ""))
        for p in h.get("problems", [])[:10]:
            lines.append(f"⚠️ {p}")
        for d in h.get("days", [])[:4]:
            lines.append(f"• {d['date']} : " + ", ".join(f"{k} {v}" for k, v in d["formats"].items()))
    except Exception as e:
        out["ahead"] = "0"
        lines.append(f"⚠️ status.json illisible : {e!r}")
    report = "\n".join(lines)
    print(report)
    (ROOT / "health-report.md").write_text(report + "\n")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            for k, v in out.items():
                f.write(f"{k}={v}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
