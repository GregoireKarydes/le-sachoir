# Le Sachoir

Chaque jour, l'actu et la culture G en BD. Pour briller en société (ou au moins faire semblant).

**Appli :** https://gregoirekarydes.github.io/le-sachoir/

## Comment ça marche (V1 gratuite, 100 % automatique)

| Heure (Paris) | Qui | Quoi |
|---|---|---|
| 19 h 19 et 20 h 37 | Tâches planifiées Claude « Grands Dossiers » et « Stock » | Écrivent à l'avance Grands Dossiers, Culture G et Insolite dans la **file d'attente** `stock/<type>/`, et le jeu du jour par date dans `editions/` |
| 0 h 05 | GitHub Actions `rss.yml` | Collecte les titres de la veille → `data/rss/` |
| 1 h | Tâche planifiée Claude « Actu » | Choisit et vérifie 3 à 5 sujets, écrit 1 ou 2 cases par sujet → `editions/<date>/edition.json` |
| À chaque push + toutes les heures la nuit | GitHub Actions `images.yml` | Génère les images (Cloudflare Workers AI, FLUX.2 klein 4B) : l'Actu d'abord, puis **une BD de la file à la fois, jusqu'à 100 %** |
| 3 h 17 | Tâche planifiée Claude « Contrôle » | Relit les images, marque `redo` celles à refaire (l'ancienne reste publiée) |
| 5 h | GitHub Actions `publish.yml` | Pioche dans la file une BD finie de chaque type, publie l'édition du jour et déploie l'appli |

Les bulles et les récitatifs ne sont jamais dessinés dans les images : l'appli les pose par-dessus.

## Référencement (SEO)
À chaque publication, `pipeline/seo.py` génère pour chaque histoire une page statique indexable (`/histoires/<date>-<titre>/`) avec le texte complet des cases, les images, la description, Open Graph et les données structurées (Article, fil d'Ariane). Il génère aussi les pages `/themes/`, `/archives/`, `sitemap.xml` et `robots.txt`. L'édition de démonstration est en `noindex`.

L'adresse du site se règle dans `pipeline/site.json` (`base_url`), avec le code de vérification Google Search Console (`google_site_verification`).

## Dossiers
- `app/` : l'appli PWA (un seul `index.html`, service worker, manifeste, images de l'interface).
- `stock/` : la file d'attente des BD hors Actu (`stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json` + `images/` + `cast/`), voir `pipeline/stock.py`.
- `editions/` : une édition par jour (`edition.json` + `images/` + `cast/`), et `index.json` (éditions publiées).
- `pipeline/` : scripts Python (RSS, images, publication) et `style.json` (style des images).
- `prompts/` : la charte de l'humour et les consignes des tâches Claude.
- `data/rss/` : titres collectés (3 derniers jours).

## Comptes, newsletter et écran admin (API `worker/`)
Une petite API sur Cloudflare (Worker + base D1, offre gratuite), déployée par `.github/workflows/api.yml` :
- **Comptes** facultatifs, sans mot de passe : un code à 6 chiffres et un lien magique par e-mail. Les données du téléphone (série, dossiers, lectures, favoris, jeu) sont fusionnées avec le compte et synchronisées entre appareils.
- **Newsletter** quotidienne envoyée par Brevo (300 e-mails/jour gratuits) dès que l'édition du jour est publiée (vérification toutes les 30 min de 5 h à 11 h). Abonnement avec ou sans compte, désinscription en un clic, ouvertures et clics mesurés.
- **Premium** : champ par compte, donné à la main dans l'écran admin en attendant Stripe. Les verrous (Grand Dossier après la case 4, archives, Découvrir, favoris) ne s'activent que si `"paywall": true` dans `pipeline/site.json`.
- **Mesure d'audience** anonyme : un identifiant tiré au hasard par appareil, ni cookie ni IP, « Do Not Track » respecté.
- **Écran admin** : `admin.html` (lien dans Profil › Mon compte pour les adresses de `ADMIN_EMAILS`) : chaîne de publication, audience, rétention, lecture par format, BD les plus lues, jeu, comptes, séries, newsletter (aperçu, test, envoi), gestion du Premium.

Réglages dans `worker/wrangler.toml` (`ADMIN_EMAILS`, `SENDER_EMAIL`, `MAIL_DAILY_LIMIT`). L'adresse de l'API est écrite toute seule dans `pipeline/site.json` (`api_url`) au premier déploiement ; tant qu'elle est vide, l'appli fonctionne comme avant.

Tester en local : `cd worker && npm i && npx wrangler d1 migrations apply sachoir --local && npm run dev` (avec un fichier `.dev.vars` contenant `DEV=1`, `API_URL`, `APP_URL`, `APP_ORIGINS` ; sans clé Brevo, les e-mails s'affichent dans la console et le code est renvoyé par l'API). Tests : `npm test`.

## Secrets nécessaires (Settings › Secrets and variables › Actions)
- `CF_ACCOUNT_ID` : identifiant du compte Cloudflare.
- `CF_API_TOKEN` : jeton Cloudflare avec le modèle « Workers AI ».
- `CF_DEPLOY_TOKEN` : jeton Cloudflare pour déployer l'API (modèle « Edit Cloudflare Workers » + permission « D1 : Edit »).
- `BREVO_API_KEY` : clé API Brevo (SMTP & API › Clés API), pour les e-mails de connexion et la newsletter.

## Lancer à la main
- Régénérer les images : onglet *Actions* › *Images* › *Run workflow*.
- Republier le site : *Actions* › *Publication* › *Run workflow*.
- Refaire une image : ajouter `"redo": true` sur l'image (dans `edition.json` ou `item.json`) et pousser ; l'ancienne reste en ligne en attendant.
