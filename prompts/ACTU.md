# Tâche de nuit : l'Actu du jour

Objectif : ajouter le format `actu` (8 cases) à l'édition du jour, avant 3 h 30 (heure de Paris), puis pousser sur GitHub.
Lire d'abord : `prompts/CHARTE.md` et `prompts/SCHEMA.md`.

## Étapes
1. `git pull`. Date du jour = date de Paris (`TZ=Europe/Paris date +%F`).
2. Lire `data/rss/<date>.json` (titres des dernières 30 h, collectés à minuit, dont la dernière vidéo HugoDécrypte). S'il manque, faire la veille directement par recherche web.
3. **Choisir 4 sujets à partir de HugoDécrypte** (sélection de référence) :
   - prendre la dernière vidéo « Actus du jour » de moins de 30 h : les entrées `"role": "selection"` du fichier RSS (titre = liste des sujets, `summary` = description). Si le fichier ne l'a pas, la chercher sur le web (chaîne YouTube « HugoDécrypte - Actus du jour », podcast ou newsletter du même nom) ;
   - y choisir 4 sujets, en suivant en priorité son ordre d'importance ;
   - garder les règles du Sachoir : rubriques variées (pas deux de la même), **exclure** drames (attentat, catastrophe, décès), faits divers, sujets non confirmés ; alterner les bords et les personnalités d'un jour à l'autre (regarder les 3 dernières éditions dans `editions/`) ;
   - s'il reste moins de 4 sujets valables, compléter avec les sujets repris par au moins deux médias de la liste ;
   - pas de vidéo HugoDécrypte (week-end, jours fériés) : choisir comme avant, parmi les sujets repris par au moins deux médias de la liste ;
   - HugoDécrypte sert **uniquement à choisir les sujets** : ne jamais reprendre ses formulations, ses angles ni ses blagues, ne jamais le citer dans les BD, et ne pas le compter parmi les deux sources de vérification.
4. **Vérifier chaque sujet** par recherche web dans au moins deux sources de lignes éditoriales différentes. Un fait non confirmé deux fois est écarté. Ne jamais recopier un article : tout est réécrit.
5. **Écrire les 8 cases** selon la charte : pour chaque sujet, case `fact` (récitatif = le fait, sobre, 15 mots max) puis case `react` (gag + chute). Personnalités vivantes jamais nommées en entier, reconnaissables par leur fonction.
6. Écrire le casting (2 à 5 fiches pour tout le format), les prompts d'images en anglais, la couverture, la carte `final` (le fait le plus marquant du jour, 25 mots max) et `sources` (une URL par sujet au moins).
7. **Seconde passe de fact-check** : relire chaque récitatif contre les sources. Corriger ou retirer.
8. Ajouter le format au fichier `editions/<date>/edition.json` (le créer avec `"status": "draft"` s'il n'existe pas ; remplacer un `actu` existant). Valider le JSON (`python -m json.tool`).
9. `git add`, commit « Actu du <date> », `git push`. Le push déclenche la génération des images.

## Contrôle qualité (à 3 h 30, même tâche relancée ou suite de celle-ci)
Voir `prompts/QA.md`.

## Si quelque chose bloque
Ne jamais pousser une Actu incomplète ou non vérifiée. Mieux vaut une édition sans Actu (elle sort quand même avec le stock) qu'une erreur.
