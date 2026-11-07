# Tâche du soir : les Grands Dossiers

Objectif : un Grand Dossier **chaque jour**, écrit d'avance de demain à J+7, pour que ses images soient dessinées au fil du quota.
Lire d'abord : `prompts/CHARTE.md`, `prompts/SCHEMA.md` et `prompts/STOCK.md` (catalogue des thématiques, règles d'alternance, règles d'écriture du Grand Dossier).

## Étapes
1. `git pull`. Dates visées : de demain à J+7 (heure de Paris ; `TZ=Europe/Paris date -d "+1 day" +%F`, etc.). Ne rien faire pour une date qui a déjà un `dossier`.
2. Écrire les dossiers manquants **en commençant par la date la plus proche**, **au plus 2 par passage** (un Grand Dossier demande beaucoup de recherche : mieux vaut deux dossiers soignés que trois bâclés).
3. **Choisir les sujets ensemble** pour bien les varier : jamais le même pôle que le dossier de la veille ni du lendemain ; une thématique pas avant 20 jours ; un sujet de Grand Dossier pas avant 12 mois (chercher dans `editions/` avec `grep`) ; environ 3 sur 4 liés à la France ; de grands sujets connus et importants, vus dans leur ensemble (« La guerre froide », « Les rois de France », « Les atomes »). Le pôle du dossier doit aussi différer de celui de la Culture G et de l'Insolite du même jour quand c'est possible.
4. Pour chaque dossier, dans l'ordre des dates : recherche web et sources fiables, écriture selon la charte et `prompts/STOCK.md` (**30 cases au plus**, environ 4 min, quota d'images oblige, chapitres adaptés au sujet, compréhension d'abord, humour dosé, cliffhanger en case 4, `theme` exact), fact-check en seconde passe.
5. Écrire le format `dossier` dans `editions/<date>/edition.json` (créer avec `"status": "draft"` et le bon champ `date` si besoin, sans toucher aux autres formats). Valider le JSON. Commit « Grand Dossier <date> : <titre> », `git pull --rebase`, `git push origin main` **aussitôt**, avant de passer au dossier suivant.
