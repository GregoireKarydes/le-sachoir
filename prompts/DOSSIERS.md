# Tâche du dimanche soir : les Grands Dossiers de la semaine

Objectif : les Grands Dossiers du **lundi, mercredi et vendredi** de la semaine qui commence sont écrits d'avance, pour que leurs images soient dessinées au fil du quota pendant la semaine.
Lire d'abord : `prompts/CHARTE.md`, `prompts/SCHEMA.md` et `prompts/STOCK.md` (catalogue des thématiques, règles d'alternance, règles d'écriture du Grand Dossier).

## Étapes
1. `git pull`. Dates visées : le lundi, le mercredi et le vendredi suivants (heure de Paris ; `TZ=Europe/Paris date -d "next monday" +%F`, etc.). Ne rien faire pour une date qui a déjà un `dossier`.
2. **Choisir les trois sujets d'un coup**, pour bien les varier : trois pôles différents ; une thématique pas avant 20 jours ; un sujet de Grand Dossier pas avant 12 mois (chercher dans `editions/` avec `grep`) ; environ 3 sur 4 liés à la France ; de grands sujets connus et importants, vus dans leur ensemble (« La guerre froide », « Les rois de France », « Les atomes »). Vérifier aussi que le pôle de chaque dossier diffère de celui du dossier précédent.
3. Pour chaque dossier, dans l'ordre des dates : recherche web et sources fiables, écriture selon la charte et `prompts/STOCK.md` (30 à 45 cases, 4 à 6 min, chapitres adaptés au sujet, compréhension d'abord, humour dosé, cliffhanger en case 4, `theme` exact), fact-check en seconde passe.
4. Écrire le format `dossier` dans `editions/<date>/edition.json` (créer avec `"status": "draft"` et le bon champ `date` si besoin, sans toucher aux autres formats). Valider le JSON. Commit « Grand Dossier <date> : <titre> », `git pull --rebase`, `git push origin main` **aussitôt**, avant de passer au dossier suivant.
