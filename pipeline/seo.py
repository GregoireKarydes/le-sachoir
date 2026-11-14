"""Pages statiques pour le référencement naturel.

Pour chaque histoire publiée (un format d'une édition) : une page HTML complète et indexable
(texte des cases, images, métadonnées, Open Graph, données structurées), plus des pages par thème,
une page d'archives, sitemap.xml et robots.txt. Appelé par publish.py après la construction de _site/.
"""
import html
import json
import re
import unicodedata
from datetime import datetime
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import share_card  # noqa: E402
SITE_CFG = json.loads((Path(__file__).parent / "site.json").read_text())
BASE = SITE_CFG["base_url"].rstrip("/") + "/"
COLOR = {"dossier": "#1f8f5f", "actu": "#2f4fa2", "cultureg": "#f2a33a", "insolite": "#d9473a", "notice": "#7a4fb8", "origine": "#8a5a24"}
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
POLES = {
    "Histoire": ["Histoire ancienne", "Histoire moderne", "Histoire de France", "Grandes personnalités", "Mythologies et religions"],
    "Géopolitique & éco": ["Géopolitique", "Économie", "Politique française", "Entreprises et marques"],
    "Société & idées": ["Psychologie", "Sociologie", "Philosophie", "Démographie", "Société", "Droit", "Géographie"],
    "Sciences": ["Sciences physiques", "L’univers", "Sciences du vivant", "Médecine et santé", "Grandes découvertes", "Écologie et climat", "Informatique et numérique"],
    "Art & Culture": ["Histoire de l’art", "Arts plastiques", "Architecture", "Littérature", "Expression française"],
    "Culture pop": ["Musique", "Mode et luxe", "Sports", "Jeux vidéo"],
}

e = lambda t: html.escape(str(t or ""), quote=True)


def slugify(text: str, n: int = 70) -> str:
    t = unicodedata.normalize("NFKD", re.sub(r"[’'`]", "-", text or "")).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:n].rstrip("-") or "histoire"


def story_slug(date: str, fmt: dict) -> str:
    return f"{date}-{slugify(fmt.get('title') or fmt['id'])}"


def date_fr(iso: str) -> str:
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MOIS[m - 1]} {y}"


def clip(text: str, n: int = 158) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


CSS = """
:root{--cream:#faf6ee;--ink:#17140f;--muted:#5f5a52;--line:#e7e1d4;--grey:#efebe3;--yellow:#f5b62a;--green:#1f8f5f;
--serif:"Source Serif 4",Georgia,serif;--sans:Roboto,system-ui,-apple-system,"Segoe UI",sans-serif;--letter:"Patrick Hand SC","Comic Sans MS",cursive}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}html,body{margin:0;overflow-x:hidden;background:var(--cream);color:var(--ink);font-family:var(--sans);line-height:1.5}
a{color:inherit}img{max-width:100%;display:block}
.top{display:flex;align-items:center;gap:20px;padding:12px max(20px,calc((100vw - 1180px)/2));border-bottom:1px solid var(--line);flex-wrap:wrap}
.top img{height:36px}.top nav{display:flex;gap:6px;flex-wrap:wrap}.top nav a{text-decoration:none;padding:7px 12px;border-radius:999px;font-weight:500}
.top nav a:hover{background:var(--grey)}.top .cta{margin-left:auto}
.wrap{max-width:1180px;margin:0 auto;padding:20px 20px 60px}
.intro{max-width:780px}
.crumbs{font-size:13.5px;color:var(--muted);display:flex;gap:6px;flex-wrap:wrap}.crumbs a{color:var(--muted)}
h1{font-family:var(--serif);font-weight:800;font-size:clamp(30px,5vw,48px);line-height:1.05;margin:10px 0 8px;text-wrap:balance}
.meta{display:flex;gap:10px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:14.5px}
.tag{display:inline-block;background:var(--fc,#1f8f5f);color:#fff;border-radius:8px;padding:3px 10px;font-weight:700;font-size:12.5px;letter-spacing:.4px;text-transform:uppercase}
.lead{font-size:18px;max-width:70ch;margin:14px 0}
.cta{display:inline-block;background:var(--yellow);color:var(--ink);text-decoration:none;font-weight:700;border-radius:999px;padding:11px 20px}
.cover{border-radius:18px;overflow:hidden;margin:18px 0;aspect-ratio:16/9;background:var(--grey)}.cover img{width:100%;height:100%;object-fit:cover}
.strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:24px 0}
@media (max-width:860px){.strip{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.strip{grid-template-columns:1fr;max-width:440px;margin-inline:auto}.cap{font-size:17px}.bub{font-size:17.5px}.lead{font-size:16.5px}.brille p{font-size:21px}.cover{border-radius:12px;margin:14px -4px}}
.panel{position:relative;margin:0;aspect-ratio:9/16;border:4px solid var(--ink);border-radius:6px;overflow:hidden;background:#f1e9d6}
.panel img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.panel figcaption{position:absolute;top:10px;left:10px;right:10px;display:flex;flex-direction:column;gap:8px}
.cap{background:#fff1c9;border:3px solid var(--ink);padding:7px 10px;font-family:var(--letter);font-size:16px;line-height:1.25;box-shadow:3px 3px 0 var(--ink)}
.cap b{display:block;font-family:var(--sans);font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--green)}
.bub{max-width:82%;background:#fff;border:3px solid var(--ink);border-radius:18px;padding:7px 12px;font-family:var(--letter);font-size:16.5px;line-height:1.2;align-self:flex-start}
.bub.r{align-self:flex-end}
.panel.explain{background:#fff;aspect-ratio:auto;min-height:100%;display:flex}
.panel.explain figcaption{position:static;padding:16px;gap:9px;font-size:15.5px;line-height:1.4}
.panel.explain p{margin:0}.panel.explain strong{font-family:var(--serif);font-size:21px;line-height:1.15}
.panel.explain ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}
.panel.explain .ex-tag{align-self:flex-start;background:var(--yellow);border:2px solid var(--ink);border-radius:999px;padding:2px 9px;font-size:11px;letter-spacing:.5px;text-transform:uppercase}
.panel.explain .ex-joke{font-family:var(--letter);border-top:2px dashed var(--line);padding-top:8px}
.panel.cine{background:var(--ink)}.panel.cine::after{content:"";position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(180deg,rgba(23,20,15,0),rgba(23,20,15,.9) 30%,var(--ink) 55%)}
.panel.cine figcaption{top:auto;bottom:9%;left:7%;right:7%;z-index:1}.panel.cine p{margin:0;color:#fff;font-family:var(--sans);font-weight:700;font-size:20px;line-height:1.28}.panel.cine em{font-style:normal;color:var(--yellow)}
.panel.photo{flex-direction:column}.panel.photo img{width:100%;height:auto;aspect-ratio:auto;object-fit:contain;background:#efebe3}
.panel.photo .credit{font-size:12px;color:#5f5a52}.panel.photo .credit a{color:inherit}
.locked{background:#fff;border-radius:18px;padding:16px 18px;margin:18px 0;display:flex;flex-direction:column;gap:10px}
.locked p{margin:0}.locked .outline{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.story{max-width:72ch}.story p{font-size:17px;line-height:1.6;margin:0 0 12px}
.brille{background:var(--cream);border:3px solid var(--ink);border-radius:20px;overflow:hidden;max-width:720px;margin:30px 0;box-shadow:6px 6px 0 var(--ink)}
.brille h2{margin:0;background:var(--yellow);border-bottom:3px solid var(--ink);padding:10px 16px;font-size:14px;letter-spacing:.5px;text-transform:uppercase}
.brille p{margin:0;padding:18px 18px 20px;font-family:var(--serif);font-weight:800;font-size:24px;line-height:1.2}
h2.sec{font-family:var(--serif);font-weight:800;font-size:26px;margin:36px 0 12px}
.sources li{margin:4px 0;font-size:14.5px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.card{display:flex;flex-direction:column;gap:8px;text-decoration:none;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.card img{aspect-ratio:16/9;object-fit:cover;width:100%;background:var(--grey)}.card div{padding:4px 14px 14px}
.card strong{font-family:var(--serif);font-weight:800;font-size:19px;line-height:1.15;display:block}.card span{font-size:13px;color:var(--muted)}
@media (max-width:640px){.top{gap:8px;padding:10px 16px}.top img{height:30px}.top nav{width:100%;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.top nav a{white-space:nowrap;padding:6px 10px;font-size:14px}.top .cta{display:none}.wrap{padding:14px 16px 90px}
.sticky{position:fixed;left:16px;right:16px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:10;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.22)}}
@media (min-width:641px){.sticky{display:none}}
@media (min-width:1000px){.head{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:36px;align-items:center}.head .cover{margin:0}}
footer{border-top:1px solid var(--line);padding:24px max(20px,calc((100vw - 1180px)/2));color:var(--muted);font-size:14px}
"""


def head(title, desc, canonical, image, noindex=False, extra="", og_type="website", image_alt=""):
    robots = '<meta name="robots" content="noindex,follow">' if noindex else '<meta name="robots" content="index,follow,max-image-preview:large">'
    verif = f'<meta name="google-site-verification" content="{e(SITE_CFG["google_site_verification"])}">' if SITE_CFG.get("google_site_verification") else ""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{e(canonical)}">
{robots}
{verif}
<meta property="og:site_name" content="Le Sachoir">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(canonical)}">
<meta property="og:type" content="{og_type}">
<meta property="og:image" content="{e(image)}">
{'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' if "/share-" in image else ""}
<meta property="og:image:alt" content="{e(image_alt or title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{e(image)}">
<meta name="theme-color" content="#faf6ee">
<link rel="icon" href="{BASE}assets/icon-192.png">
<link rel="manifest" href="{BASE}manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,800&family=Roboto:wght@400;500;700&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
<style>{CSS}</style>
{extra}
</head>
<body>
<header class="top"><a href="{BASE}" aria-label="Le Sachoir, accueil"><img src="{BASE}assets/logo.png" alt="Le Sachoir" width="111" height="40"></a>
<nav aria-label="Navigation"><a href="{BASE}">Édition du jour</a><a href="{BASE}archives/">Toutes les histoires</a><a href="{BASE}themes/">Thèmes</a></nav>
<a class="cta" href="{BASE}">Ouvrir l’appli</a></header>
"""


FOOT = f"""<footer>Le Sachoir — l’actu et la culture G en BD, chaque jour. Les faits sont vérifiés et sourcés ; les personnages et les dialogues sont des parodies.
· <a href="{BASE}archives/">Toutes les histoires</a> · <a href="{BASE}themes/">Thèmes</a></footer>
</body></html>"""


def card(s):
    img = f'<img src="{e(s["cover_abs"])}" alt="" loading="lazy" width="640" height="360">' if s["cover_abs"] else ""
    return f'<a class="card" href="{e(s["url_abs"])}">{img}<div><strong>{e(s["title"])}</strong><span>{e(s["label"])}{" · " + e(s["theme"]) if s["theme"] else ""} · {date_fr(s["date"])}</span></div></a>'


FREE_CASES = 4  # même règle que publish.py

# Lien partagé avec un code de parrainage (?ref=) : le code est gardé et suit les liens vers l'appli,
# pour qu'un ami qui s'inscrit rapporte bien un Grand Dossier à celui qui a partagé.
REF_JS = """<script>document.addEventListener("DOMContentLoaded",function(){var r=new URLSearchParams(location.search).get("ref");if(!r)return;r=r.slice(0,16);
try{if(!localStorage.getItem("sachoir.ref"))localStorage.setItem("sachoir.ref",r)}catch(e){}
document.querySelectorAll("a[href]").forEach(function(a){var u;try{u=new URL(a.href)}catch(e){return}
if(u.origin!==location.origin||/\/(histoires|themes|archives)\//.test(u.pathname))return;u.searchParams.set("ref",r);a.href=u.href})})</script>"""


def photo_figure(c, img_base):
    """Case photo réelle (Wikimedia Commons) : image, titre, explication et source."""
    ph = c.get("photo") or {}
    if ph.get("status") != "done" or not ph.get("file"):
        return ""
    credit = " · ".join(x for x in (ph.get("credit"), ph.get("license")) if x)
    src = f'<a href="{e(ph.get("source"))}" rel="nofollow noopener">Wikimedia Commons</a>' if ph.get("source") else "Wikimedia Commons"
    return (f'<figure class="panel explain photo"><img src="{e(img_base + ph["file"])}" alt="{e(c.get("title", ""))}" loading="lazy" decoding="async">'
            f'<figcaption><b class="ex-tag">{e(c.get("tag") or "En vrai")}</b><strong>{e(c.get("title", ""))}</strong><p>{e(c.get("text", ""))}</p>'
            f'<small class="credit">Photo : {e(credit)} · {src}</small></figcaption></figure>')


def story_page(s, ed_dir: Path, related, gate=False):
    f, date = s["fmt"], s["date"]
    # Paywall actif : la page publique du Grand Dossier montre le début de la BD, le plan et le résumé, pas la suite.
    locked = gate and f["id"] == "dossier" and len(f.get("cases", [])) > FREE_CASES
    rest = f.get("cases", [])[FREE_CASES:] if locked else []
    if locked:
        f = {**f, "cases": f["cases"][:FREE_CASES]}
    img_base = f"{BASE}editions/{date}/"
    desc = clip(f.get("final", {}).get("text") or f.get("tagline") or f["title"])
    title = f'{f["title"]} — {f.get("label", "")} en BD | Le Sachoir'
    canonical = s["url_abs"]
    image = s.get("share_abs") or s["cover_abs"] or f"{BASE}assets/og.png"
    theme = f.get("theme", "")
    panels = []
    names = {x.get("id"): x.get("name") for x in f.get("cast", []) or [] if x.get("name")}
    for c in f.get("cases", []):
        if c.get("kind") == "photo":
            fig = photo_figure(c, img_base)
            if fig:
                panels.append(fig)
            continue
        if c.get("kind") == "buzz":
            src = c.get("source") or {}
            link = f' <a href="{e(src["url"])}" rel="nofollow noopener" target="_blank">{e(src.get("title") or "Source")}</a>' if str(src.get("url", "")).startswith("https://") else ""
            post = c.get("post") or {}
            emb = post.get("embed") if post.get("status") == "ok" else None
            if emb:  # vrai post : citation avec l'auteur et le lien, comme l'intégration officielle
                who = f'{e(emb.get("author", ""))} {e(emb.get("handle", ""))}'.strip()
                top = (f'<blockquote><p>{e(emb.get("text", ""))}</p>&mdash; {who} '
                        f'<a href="{e(emb["url"])}" rel="nofollow noopener" target="_blank">sur {e(emb.get("label", ""))}</a></blockquote>'
                        f'<p><b>Le Sachoir :</b> {e(c.get("text", ""))}</p>')
            else:
                top = f'<strong>{e(c.get("name") or "Internet")} {e(c.get("handle") or "")}</strong><p>{e(c.get("text", ""))}</p>'
            panels.append(f'<figure class="panel explain"><figcaption><b class="ex-tag">{e(c.get("tag") or "Sur Internet")}</b>'
                          f'{top}<p>{e(c.get("why", ""))}{link}</p></figcaption></figure>')
            continue
        if c.get("kind") == "explain":
            paras = "".join(f"<p>{e(t)}</p>" for t in str(c.get("text") or "").split("\n") if t.strip())
            steps = ("<ol>" + "".join(f"<li>{e(t)}</li>" for t in c.get("steps") or []) + "</ol>") if c.get("steps") else ""
            joke = f'<p class="ex-joke">{e(c["joke"])}</p>' if c.get("joke") else ""
            panels.append(f'<figure class="panel explain"><figcaption><b class="ex-tag">{e(c.get("tag") or "Pour mieux comprendre")}</b>'
                          f'<strong>{e(c.get("title", ""))}</strong>{paras}{steps}{joke}</figcaption></figure>')
            continue
        if c.get("kind") == "cine":  # D'où ça vient ? : texte posé sur le bas de l'image, un mot en couleur
            ref = c.get("image_of")
            img = (f["cases"][ref - 1].get("image") if isinstance(ref, int) and 0 < ref <= len(f["cases"]) else c.get("image")) or {}
            src = img_base + img["file"] if img.get("status") == "done" else ""
            plain = str(c.get("text") or "").replace("*", "")
            lines = "<br>".join(re.sub(r"\*([^*]+)\*", r'<em>\1</em>', e(t)) for t in str(c.get("text") or "").split("\n") if t.strip())
            pic = f'<img src="{e(src)}" alt="{e(clip(f["title"] + " : " + plain, 180))}" loading="lazy" decoding="async" width="1024" height="1792">' if src else ""
            panels.append(f'<figure class="panel cine">{pic}<figcaption><p>{lines}</p></figcaption></figure>')
            continue
        img = c.get("image", {})
        src = img_base + img["file"] if img.get("status") == "done" else ""
        alt = clip(f'{f["title"]}, case {c.get("n", "")} : {c.get("caption") or " ".join(b.get("text", "") for b in c.get("bubbles", []))}', 180)
        cap = ""
        if c.get("caption"):
            tag = c.get("tag") or {"fact": "Les faits", "react": "La réaction"}.get(c.get("kind", ""), "")
            cap = f'<p class="cap">{"<b>" + e(tag) + "</b>" if tag else ""}{e(c["caption"])}</p>'
        bubs = "".join(f'<p class="bub{" r" if b.get("side") == "r" else ""}">{("<b>" + e(names.get(b["who"], b["who"])) + " :</b> ") if b.get("who") else ""}{e(b.get("text"))}</p>' for b in c.get("bubbles", []))
        pic = f'<img src="{e(src)}" alt="{e(alt)}" loading="lazy" decoding="async" width="1024" height="1792">' if src else ""
        panels.append(f'<figure class="panel">{pic}<figcaption>{cap}{bubs}</figcaption></figure>')
    sources = "".join(f'<li><a href="{e(x.get("url"))}" rel="nofollow noopener">{e(x.get("title") or x.get("url"))}</a></li>' for x in f.get("sources", []) if x.get("url"))
    final_src = f.get("final", {}).get("source", "")
    published = s.get("published") or f"{date}T00:00:00+01:00"
    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "Article", "headline": f["title"][:110], "description": desc, "image": [image],
             "datePublished": published, "dateModified": published, "inLanguage": "fr",
             "articleSection": theme or f.get("label", ""), "isAccessibleForFree": not locked,
             "author": {"@type": "Organization", "name": "Le Sachoir", "url": BASE},
             "publisher": {"@type": "Organization", "name": "Le Sachoir", "logo": {"@type": "ImageObject", "url": f"{BASE}assets/icon-512.png"}},
             "mainEntityOfPage": canonical},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Le Sachoir", "item": BASE},
                {"@type": "ListItem", "position": 2, "name": theme or f.get("label", ""), "item": f"{BASE}themes/{slugify(theme)}/" if theme else f"{BASE}archives/"},
                {"@type": "ListItem", "position": 3, "name": f["title"], "item": canonical}]}]}
    extra = (f'<meta property="article:published_time" content="{published}">'
             + (f'<meta property="article:section" content="{e(theme)}">' if theme else "")
             + f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'
             + REF_JS)
    crumb_theme = f'<a href="{BASE}themes/{slugify(theme)}/">{e(theme)}</a> ›' if theme else ""
    body = f"""<main class="wrap" style="--fc:{COLOR.get(f['id'], '#1f8f5f')}">
<nav class="crumbs" aria-label="Fil d’Ariane"><a href="{BASE}">Le Sachoir</a> › {crumb_theme} <span>{e(f['title'])}</span></nav>
<div class="head"><div class="intro">
<h1>{e(f['title'])}</h1>
<div class="meta"><span class="tag">{e(f.get('label', ''))}</span>{('<span>' + e(theme) + '</span>') if theme else ''}<time datetime="{date}">{date_fr(date)}</time><span>{f.get('minutes', 2)} min de lecture</span></div>
<p class="lead">{e(f.get('tagline', ''))}</p>
<a class="cta" href="{BASE}?d={date}&amp;f={f['id']}">Lire en BD dans l’appli</a></div>
{('<div class="cover"><img src="' + e(s['cover_abs']) + '" alt="' + e(f['title']) + '" width="1792" height="1024" fetchpriority="high"></div>') if s['cover_abs'] else ''}</div>
<section class="strip" aria-label="La bande dessinée, case par case">{''.join(panels)}</section>
{locked_block(f, date, rest) if locked else ''}
{('<section class="story"><h2 class="sec">L’histoire complète</h2>' + ''.join('<p>' + e(t) + '</p>' for t in str(f.get('story')).split(chr(10)) if t.strip()) + '</section>') if f.get('story') else ''}
<aside class="brille"><h2>Pour briller en société</h2><p>{e(f.get('final', {}).get('text', ''))}</p></aside>
{('<h2 class="sec">Sources</h2><ul class="sources">' + sources + '</ul>') if sources else ('<p class="meta">Source : ' + e(final_src) + '</p>' if final_src else '')}
{('<h2 class="sec">À lire aussi</h2><div class="cards">' + ''.join(card(r) for r in related) + '</div>') if related else ''}
<a class="cta sticky" href="{BASE}?d={date}&amp;f={f['id']}">Lire en BD dans l’appli</a>
</main>"""
    return head(title, desc, canonical, image, noindex=s["demo"], extra=extra, og_type="article", image_alt=f["title"]) + body + FOOT


def locked_block(f, date, rest):
    outline = [c.get("tag") for c in rest if c.get("kind") == "chap" and c.get("tag")]
    plan = ("<ol class='outline'>" + "".join(f"<li>{e(t)}</li>" for t in outline) + "</ol>") if outline else ""
    return (f'<section class="locked"><h2 class="sec">La suite du dossier : {len(rest)} cases</h2>{plan}'
            f'<p>La suite se lit dans l’appli : abonnez-vous à la newsletter (gratuit) ou invitez un ami pour débloquer ce dossier, ou passez Premium pour tous les débloquer.</p>'
            f'<a class="cta" href="{BASE}?d={date}&amp;f={f["id"]}">Lire la suite dans l’appli</a></section>')


def list_page(title, h1, intro, stories, canonical):
    body = f"""<main class="wrap"><nav class="crumbs"><a href="{BASE}">Le Sachoir</a> › <span>{e(h1)}</span></nav>
<h1>{e(h1)}</h1><p class="lead">{e(intro)}</p><div class="cards">{''.join(card(s) for s in stories)}</div></main>"""
    return head(title, clip(intro), canonical, f"{BASE}assets/og.png") + body + FOOT


def build(site: Path, index: list, gate: bool = False):
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    stories = []
    for entry in index:
        date = entry["date"]
        ed_file = ROOT / "editions" / date / "edition.json"
        ed = json.loads(ed_file.read_text())
        published = ed.get("published_at", "")
        ready = {x["id"] for x in entry["formats"]}
        for fmt in ed.get("formats", []):
            if fmt["id"] not in ready or fmt["id"] == "quiz":  # pas de page publique pour le quiz (elle donnerait les réponses)
                continue
            slug = story_slug(date, fmt)
            cover = fmt.get("cover", {})
            # Image de partage (titre, format, couverture), gardée avec l'édition et copiée dans le site.
            share = ""
            try:
                name = share_card.ensure(fmt, ROOT / "editions" / date)
                dst = site / "editions" / date / name
                if dst.parent.exists() and not dst.exists():
                    shutil.copy(ROOT / "editions" / date / name, dst)
                share = f"{BASE}editions/{date}/{name}"
            except Exception as ex:  # une image de partage ratée ne bloque jamais la publication
                print(f"! image de partage {date}/{fmt['id']} : {ex}")
            stories.append({
                "fmt": fmt, "date": date, "demo": bool(entry.get("demo")), "slug": slug, "published": published,
                "title": fmt.get("title", ""), "label": fmt.get("label", ""), "theme": fmt.get("theme", ""),
                "url_abs": f"{BASE}histoires/{slug}/",
                "cover_abs": f"{BASE}editions/{date}/{cover['file']}" if cover.get("status") == "done" else "",
                "share_abs": share,
            })
    public = [s for s in stories if not s["demo"]]
    for s in stories:
        same = [r for r in public if r is not s and r["theme"] and r["theme"] == s["theme"]]
        recent = [r for r in public if r is not s and r not in same]
        related = (same + recent)[:6]
        out = site / "histoires" / s["slug"]
        out.mkdir(parents=True, exist_ok=True)
        (out / "index.html").write_text(story_page(s, ROOT / "editions" / s["date"], related, gate))
    # Thèmes
    themes = {}
    for s in public:
        if s["theme"]:
            themes.setdefault(s["theme"], []).append(s)
    (site / "themes").mkdir(exist_ok=True)
    blocks = []
    for pole, ths in POLES.items():
        links = "".join(f'<li><a href="{BASE}themes/{slugify(t)}/">{e(t)}</a> ({len(themes.get(t, []))})</li>' for t in ths if t in themes)
        if links:
            blocks.append(f"<h2 class='sec'>{e(pole)}</h2><ul>{links}</ul>")
    (site / "themes" / "index.html").write_text(head("Les thèmes du Sachoir : histoire, sciences, géopolitique… en BD", "Toutes les histoires du Sachoir, classées par thème : histoire, sciences, société, art, culture pop, géopolitique et économie.", f"{BASE}themes/", f"{BASE}assets/og.png")
        + f'<main class="wrap"><nav class="crumbs"><a href="{BASE}">Le Sachoir</a> › <span>Thèmes</span></nav><h1>Les thèmes</h1>{"".join(blocks) or "<p class=lead>Les premiers thèmes arrivent avec les premières éditions.</p>"}</main>' + FOOT)
    for t, lst in themes.items():
        out = site / "themes" / slugify(t)
        out.mkdir(parents=True, exist_ok=True)
        (out / "index.html").write_text(list_page(f"{t} en BD : toutes les histoires | Le Sachoir", f"{t}", f"Toutes les histoires du Sachoir sur le thème « {t} », racontées en BD humoristique et vérifiées.", lst, f"{BASE}themes/{slugify(t)}/"))
    # Archives
    (site / "archives").mkdir(exist_ok=True)
    (site / "archives" / "index.html").write_text(list_page("Toutes les histoires du Sachoir en BD", "Toutes les histoires", "L’actu, la culture G, les histoires insolites, les Notices et les grands dossiers du Sachoir, du plus récent au plus ancien.", public, f"{BASE}archives/"))
    # Sitemap et robots
    urls = [(BASE, now), (f"{BASE}archives/", now), (f"{BASE}themes/", now)]
    urls += [(f"{BASE}themes/{slugify(t)}/", now) for t in themes]
    urls += [(s["url_abs"], s["published"] or f"{s['date']}T00:00:00+01:00") for s in public]
    xml = "".join(f"<url><loc>{e(u)}</loc><lastmod>{m}</lastmod></url>" for u, m in urls)
    (site / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{xml}</urlset>\n')
    # Remarque : sur un site de projet GitHub Pages, Google ne lit robots.txt qu'à la racine du domaine.
    # Le sitemap doit donc être déclaré dans la Search Console (inutile avec un domaine personnalisé).
    (site / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n")
    # Page d'accueil de l'appli : base des URL et liens pour les robots
    app = site / "index.html"
    links = "".join(f'<a href="{e(s["url_abs"])}">{e(s["title"])} — {e(s["label"])}</a>' for s in public[:30])
    app.write_text(app.read_text().replace("__BASE__", BASE).replace("<!--SEO_LINKS-->", links))
    # Adresse de l'API (comptes, newsletter, mesures) et verrous Premium : réglés dans site.json
    api, paywall = SITE_CFG.get("api_url", "").rstrip("/"), "on" if SITE_CFG.get("paywall") else "off"
    for page in (app, site / "admin.html"):
        if page.exists():
            page.write_text(page.read_text().replace("__API__", api).replace("__PAYWALL__", paywall))
    print(f"SEO : {len(stories)} page(s) d’histoire, {len(themes)} thème(s), sitemap de {len(urls)} URL.")
