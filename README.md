# Le Sachoir

Chaque jour, l'actu et la culture G en BD. Pour briller en société (ou au moins faire semblant).

**Appli :** https://gregoirekarydes.github.io/le-sachoir/

## Comment ça marche (V1 gratuite, 100 % automatique)

| Heure (Paris) | Qui | Quoi |
|---|---|---|
| 19 h 19 et 20 h 37 | Tâches planifiées Claude « Grands Dossiers » et « Stock » | Écrivent à l'avance Grands Dossiers, Culture G, Insolite et Notices dans la **file d'attente** `stock/<type>/`, et le jeu du jour par date dans `editions/` |
| 0 h 05 | GitHub Actions `rss.yml` | Collecte les titres de la veille → `data/rss/` |
| 1 h | Tâche planifiée Claude « Actu » | Choisit et vérifie 3 à 5 sujets, écrit 1 ou 2 cases par sujet → `editions/<date>/edition.json` |
| À chaque push + toutes les heures la nuit | GitHub Actions `images.yml` | Génère les images (Cloudflare Workers AI, FLUX.2 klein 4B) : l'Actu d'abord, puis **une BD de la file à la fois, jusqu'à 100 %** |
| 3 h 17 | Tâche planifiée Claude « Contrôle » | Relit les images, marque `redo` celles à refaire (l'ancienne reste publiée) |
| 5 h | GitHub Actions `publish.yml` | Pioche dans la file une BD finie de chaque type, publie l'édition du jour et déploie l'appli |

Les bulles et les récitatifs ne sont jamais dessinés dans les images : l'appli les pose par-dessus.

## La Notice (14 novembre 2026)
« La Notice, celle que personne ne lit » : une micro-BD de 2 minutes par jour (format `notice`, couleur violette) qui explique une chose du quotidien qu'on trouve normale : le frigo, le micro-ondes, l'avion qui vole… Écrite à l'avance par la tâche « Stock » dans `stock/notice/` (consignes : `prompts/STOCK.md`), dessinée par GitHub Actions comme les autres (4 ou 5 cases dessinées, environ 7 images avec la couverture et les 2 fiches), piochée chaque matin par la publication. **Offerte dans l'édition gratuite du jour**, sans paywall ; comme le reste, les jours passés sont réservés à Premium.

## D'où ça vient ? (14 novembre 2026)
L'origine d'une expression française que tout le monde utilise (« faire grève », « être limogé »…), en micro-BD de 2 minutes **au format habituel du Sachoir**, comme La Notice (format `origine`, couleur bronze). **En alternance avec La Notice** : un jour l'une, un jour l'autre, à la même place et offertes toutes les deux (si une file est vide, l'autre sort). Écrite à l'avance par la tâche « Stock » dans `stock/origine/` (consignes : `prompts/STOCK.md`), dessinée par GitHub Actions comme les autres BD.

## Référencement (SEO)
À chaque publication, `pipeline/seo.py` génère pour chaque histoire une page statique indexable (`/histoires/<date>-<titre>/`) avec le texte complet des cases, les images, la description, Open Graph et les données structurées (Article, fil d'Ariane). Il génère aussi les pages `/themes/`, `/archives/`, `sitemap.xml` et `robots.txt`. L'édition de démonstration est en `noindex`.

L'adresse du site se règle dans `pipeline/site.json` (`base_url`), avec le code de vérification Google Search Console (`google_site_verification`).

## Dossiers
- `app/` : l'appli PWA (un seul `index.html`, service worker, manifeste, images de l'interface).
- `stock/` : la file d'attente des BD hors Actu (`cultureg`, `insolite`, `notice`, `origine`, `dossier`) (`stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json` + `images/` + `cast/`), voir `pipeline/stock.py`.
- `editions/` : une édition par jour (`edition.json` + `images/` + `cast/`), et `index.json` (éditions publiées).
- `pipeline/` : scripts Python (RSS, images, publication) et `style.json` (style des images).
- `prompts/` : la charte de l'humour et les consignes des tâches Claude.
- `data/rss/` : titres collectés (3 derniers jours).

## Comptes, newsletter, Premium et écran admin (API `worker/`)
Une petite API sur Cloudflare (Worker + base D1, offre gratuite), déployée par `.github/workflows/api.yml`. **Chaque brique s'active seule quand son secret est ajouté** ; sans secret, l'appli reste comme avant.
- **Comptes** facultatifs, sans mot de passe (code à 6 chiffres ou lien magique). Données du téléphone fusionnées avec le compte et synchronisées.
- **Newsletter** Brevo, chaque matin pour les Premium et le dimanche pour les autres (`NL_FREE_DAY`, avec un encart « Passer Premium »), en gardant toujours `MAIL_LOGIN_RESERVE` e-mails (40) libres pour les connexions et confirmations du jour ; elle part dès que l'édition du jour est publiée : Grand Dossier en vedette, puis l'Actu, la Culture G, l'Insolite, le jeu. Textes du jour écrits par la tâche Actu (`newsletter` dans `edition.json`, `teaser` par BD), sinon tirés de réserves tournantes. Abonnement confirmé par e-mail.
- **Dossiers offerts** : un Grand Dossier offert à la confirmation de la newsletter, et un à chaque ami inscrit avec votre lien de parrainage (`?ref=`), 30 au plus par mois.
- **Premium** : abonnement Stripe **sans engagement**, 2,99 € par mois ou 19,99 € par an, résiliable en deux touches dans Mon compte (accès gardé jusqu'à la fin de la période payée), carte et factures via le portail client Stripe. Le webhook (renouvellements, échecs, résiliations) et la configuration du portail sont **créés automatiquement** par le workflow API dès que `STRIPE_SECRET_KEY` existe. Premium aussi donnable à la main dans l'écran admin.
- **Paywall** (actif quand `STRIPE_SECRET_KEY` est là ; `"paywall"` dans `site.json` : `"auto"`, `true` ou `false`) : le site publié ne contient que les 4 premières cases du Grand Dossier (JSON et images) ; la suite est servie par l'API aux abonnés et aux dossiers débloqués, avec des liens d'images signés. La page publique (SEO) garde le début de la BD, le plan des chapitres, le résumé « L'histoire complète », la carte « Pour briller » et les sources, avec `isAccessibleForFree: false`. **Limite** : tant que ce dépôt GitHub est public, ses fichiers restent lisibles par qui les cherche ; le rendre privé ferme cette porte (secret `CONTENT_TOKEN` = jeton GitHub en lecture pour que l'API lise le contenu).
- **Cases photo** (`kind: "photo"`) : vraie image Wikimedia Commons (licence libre seulement), téléchargée par `pipeline/photos.py` dans le workflow Images, auteur, licence et lien affichés.
- **BD publiées** (écran admin) : les éditions date par date, lecture de chaque BD, « Masquer » / « Remettre ». Une BD masquée disparaît aussitôt de l'appli et de la newsletter, et du site public (index, pages, fichiers) à la publication suivante.
- **Mesure d'audience** anonyme (identifiant tiré au hasard par appareil, ni cookie ni IP, Do Not Track respecté) et **écran admin** `admin.html` (audience, lecture, jeu, comptes, newsletter, revenus, dossiers offerts, Premium).

Réglages dans `worker/wrangler.toml` (`ADMIN_EMAILS`, `SENDER_EMAIL`, `MAIL_DAILY_LIMIT`). L'adresse de l'API est écrite toute seule dans `pipeline/site.json` (`api_url`) au premier déploiement.

Tester en local : `cd worker && npm i && npx wrangler d1 migrations apply sachoir --local && npm run dev` (fichier `.dev.vars` avec `DEV=1`, `API_URL`, `APP_URL`, `APP_ORIGINS`, `CONTENT_URL` ; sans clé Brevo, les e-mails s'affichent dans la console et les codes sont renvoyés par l'API). Tests : `npm test`.

## Secrets nécessaires (Settings › Secrets and variables › Actions)
- `CF_ACCOUNT_ID` : identifiant du compte Cloudflare.
- `CF_API_TOKEN` : jeton Cloudflare avec le modèle « Workers AI ».
- `CF_DEPLOY_TOKEN` : jeton Cloudflare pour déployer l'API (modèle « Edit Cloudflare Workers » + permission « D1 : Edit »).
- `BREVO_API_KEY` : clé API Brevo (SMTP & API › Clés API), pour les e-mails de connexion et la newsletter.
- `STRIPE_SECRET_KEY` : clé secrète Stripe (`sk_live_…` ou `sk_test_…`) : ouvre l'abonnement et active le paywall ; le webhook et le portail client sont créés tout seuls.
- `CONTENT_TOKEN` (facultatif, si le dépôt devient privé) : jeton GitHub en lecture seule sur ce dépôt.
- `DISPATCH_TOKEN` (facultatif) : jeton GitHub (fine-grained, ce dépôt, permission « Actions : Read and write ») pour que masquer une BD dans l'écran admin mette le site public à jour dans la minute ; sans lui, il suit à la prochaine publication.

## Lancer à la main
- Régénérer les images : onglet *Actions* › *Images* › *Run workflow*.
- Republier le site : *Actions* › *Publication* › *Run workflow*.
- Refaire une image : ajouter `"redo": true` sur l'image (dans `edition.json` ou `item.json`) et pousser ; l'ancienne reste en ligne en attendant.
