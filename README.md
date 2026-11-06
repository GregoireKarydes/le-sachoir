# Le Sachoir

Chaque jour, l'actu et la culture G en BD. Pour briller en société (ou au moins faire semblant).

**Appli :** https://gregoirekarydes.github.io/le-sachoir/

## Comment ça marche (V1 gratuite, 100 % automatique)

| Heure (Paris) | Qui | Quoi |
|---|---|---|
| Chaque jour | Tâche planifiée Claude « Stock » | Écrit à l'avance Culture G, Insolite et Grand Dossier (7 jours d'avance) → `editions/` |
| 0 h 05 | GitHub Actions `rss.yml` | Collecte les titres de la veille → `data/rss/` |
| 1 h | Tâche planifiée Claude « Actu » | Choisit et vérifie 3 à 5 sujets, écrit 1 ou 2 cases par sujet → `editions/<date>/edition.json` |
| À chaque push + toutes les heures la nuit | GitHub Actions `images.yml` | Génère les images manquantes avec Cloudflare Workers AI (FLUX.2 klein 4B, quota gratuit) |
| 3 h 30 | Tâche planifiée Claude « Contrôle » | Relit les images, demande les régénérations |
| 5 h | GitHub Actions `publish.yml` | Publie l'édition du jour et déploie l'appli sur GitHub Pages |

Les bulles et les récitatifs ne sont jamais dessinés dans les images : l'appli les pose par-dessus.

## Référencement (SEO)
À chaque publication, `pipeline/seo.py` génère pour chaque histoire une page statique indexable (`/histoires/<date>-<titre>/`) avec le texte complet des cases, les images, la description, Open Graph et les données structurées (Article, fil d'Ariane). Il génère aussi les pages `/themes/`, `/archives/`, `sitemap.xml` et `robots.txt`. L'édition de démonstration est en `noindex`.

L'adresse du site se règle dans `pipeline/site.json` (`base_url`), avec le code de vérification Google Search Console (`google_site_verification`).

## Dossiers
- `app/` : l'appli PWA (un seul `index.html`, service worker, manifeste, images de l'interface).
- `editions/` : une édition par jour (`edition.json` + `images/` + `cast/`), et `index.json` (éditions publiées).
- `pipeline/` : scripts Python (RSS, images, publication) et `style.json` (style des images).
- `prompts/` : la charte de l'humour et les consignes des tâches Claude.
- `data/rss/` : titres collectés (3 derniers jours).

## Secrets nécessaires (Settings › Secrets and variables › Actions)
- `CF_ACCOUNT_ID` : identifiant du compte Cloudflare.
- `CF_API_TOKEN` : jeton Cloudflare avec le modèle « Workers AI ».

## Lancer à la main
- Régénérer les images : onglet *Actions* › *Images* › *Run workflow*.
- Republier le site : *Actions* › *Publication* › *Run workflow*.
- Refaire une image : mettre `"status": "retry"` sur l'image dans `edition.json` et pousser.
