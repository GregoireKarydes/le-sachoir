"""Les sujets les plus repris (13 novembre 2026, demande de Greg : « moins se baser sur Hugo »).

Regroupe les titres collectés qui parlent du même sujet (au moins deux mots rares en commun) et compte
combien de médias différents en parlent. Plus un sujet est repris, plus il pèse : c'est le signal
principal pour choisir les sujets de l'Actu et repérer les « sujets majeurs » à creuser.
Indicatif seulement : la tâche Actu juge, vérifie et écarte ce qui ne convient pas.

Usage seul (pour tester) : python pipeline/hot.py data/rss/AAAA-MM-JJ.json
"""
import json
import re
import sys
import unicodedata

STOP = set("""
avec dans pour plus mais sans sous entre vers chez apres avant depuis pendant contre selon comme dont elle elles
ils nous vous leur leurs cette ceux celle celles tout tous toute toutes etre avoir sont sera seront fait faire
font quoi quand comment pourquoi encore deja aussi tres trop peut veut doit ainsi alors donc enfin moins bien
notre votre quel quelle quels quelles autre autres meme memes premier premiere nouveau nouvelle nouveaux
nouvelles grand grande grands grandes petit petite jour jours semaine annee annees heure heures mois soir matin
hier demain aujourd lundi mardi mercredi jeudi vendredi samedi dimanche france francais francaise ans
selon video direct live suivez infos info actu actualite article exclusif interview analyse ainsi
voici voila part fois deux trois quatre cinq cent mille millions milliards euros pres face coup lors
with from that this have will been were what when where which their about after over says said into more
than they them would could first last year years news report world
""".split())


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def tokens(item: dict) -> set:
    text = norm(f"{item.get('title', '')} {(item.get('summary') or '')[:160]}")
    out = set()
    for w in re.findall(r"[a-z0-9]+", text):
        if len(w) < 4 or w in STOP or w.isdigit():
            continue
        out.add(w[:-1] if len(w) > 4 and w.endswith("s") else w)
    return out


def hot_topics(items: list[dict], top: int = 15, min_sources: int = 2) -> list[dict]:
    items = [i for i in items if i.get("title")]
    toks = [tokens(i) for i in items]
    df = {}
    for t in toks:
        for w in t:
            df[w] = df.get(w, 0) + 1
    rare_max = max(4, len(items) // 10)  # un mot présent partout ne relie rien
    rare = [{w for w in t if df[w] <= rare_max} for t in toks]
    # Groupes « en étoile » : le titre le plus relié devient le centre, son groupe = les titres reliés
    # directement à lui. Évite qu'une chaîne de titres vaguement liés ne fasse un énorme groupe.
    links = [set() for _ in items]
    for a in range(len(items)):
        for b in range(a + 1, len(items)):
            shared = len(rare[a] & rare[b])
            if shared >= 3 or (shared == 2 and 2 / (min(len(rare[a]), len(rare[b])) or 1) >= 0.34):
                links[a].add(b)
                links[b].add(a)
    free = set(range(len(items)))
    groups = {}
    while free:
        c = max(free, key=lambda k: (len(links[k] & free), -k))
        members = [c] + sorted(links[c] & free)
        free -= set(members)
        groups[c] = members
    out = []
    for ks in groups.values():
        sources = sorted({items[k].get("source", "") for k in ks})
        if len(sources) < min_sources:
            continue
        common = {}
        for k in ks:
            for w in rare[k]:
                common[w] = common.get(w, 0) + 1
        keywords = [w for w, n in sorted(common.items(), key=lambda x: -x[1]) if n >= 2][:6]
        dates = sorted(items[k]["published"] for k in ks if items[k].get("published"))
        seen, titles = set(), []
        for k in ks:
            if items[k]["source"] not in seen:
                seen.add(items[k]["source"])
                titles.append({"source": items[k]["source"], "title": items[k]["title"][:160], "link": items[k].get("link", "")})
        out.append({"sources": len(sources), "articles": len(ks), "keywords": keywords,
                    "first_seen": dates[0] if dates else None, "last_seen": dates[-1] if dates else None,
                    "titles": titles[:6]})
    out.sort(key=lambda g: (-g["sources"], -g["articles"]))
    return out[:top]


if __name__ == "__main__":
    data = json.loads(open(sys.argv[1]).read())
    for g in hot_topics(data["items"]):
        print(g["sources"], g["articles"], g["keywords"], "|", g["titles"][0]["title"][:90])
