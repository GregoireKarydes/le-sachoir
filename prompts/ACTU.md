# Tâche de nuit : l'Actu du jour

Objectif : ajouter le format `actu` (4 à 6 sujets, chacun en **1 case dessinée + 1 case « Ce qui se passe vraiment »**) à l'édition du jour, avant 3 h 30 (heure de Paris), puis pousser sur GitHub.
Lire d'abord : `prompts/CHARTE.md` et `prompts/SCHEMA.md`.

## Étapes
1. `git pull`. Date du jour = date de Paris (`TZ=Europe/Paris date +%F`).
2. Lire `data/rss/<date>.json` (titres des dernières 30 h, collectés à minuit, dont la dernière vidéo HugoDécrypte). S'il manque, faire la veille directement par recherche web.
3. **Choisir 4 à 6 sujets à partir de HugoDécrypte** (sélection de référence) :
   - prendre la dernière vidéo « Actus du jour » de moins de 30 h : les entrées `"role": "selection"` du fichier RSS (titre = liste des sujets, `summary` = description). Si le fichier ne l'a pas, la chercher sur le web (chaîne YouTube « HugoDécrypte - Actus du jour », podcast ou newsletter du même nom) ;
   - y choisir 4 à 6 sujets, en suivant en priorité son ordre d'importance, environ 3 sur 4 concernant la France ;
   - garder les règles du Sachoir : rubriques variées (pas deux de la même), **exclure** drames (attentat, catastrophe, décès), faits divers, sujets non confirmés ; alterner les bords et les personnalités d'un jour à l'autre (regarder les 3 dernières éditions dans `editions/`) ;
   - s'il reste moins de 4 sujets valables, compléter avec les sujets repris par au moins deux médias de la liste ;
   - pas de vidéo HugoDécrypte (week-end, jours fériés) : choisir comme avant, parmi les sujets repris par au moins deux médias de la liste ;
   - HugoDécrypte sert **uniquement à choisir les sujets** : ne jamais reprendre ses formulations, ses angles ni ses blagues, ne jamais le citer dans les BD, et ne pas le compter parmi les deux sources de vérification.
4. **Vérifier chaque sujet** par recherche web dans au moins deux sources de lignes éditoriales différentes. Un fait non confirmé deux fois est écarté. Ne jamais recopier un article : tout est réécrit.
5. **Écrire les cases** selon la charte (section « L'Actu : une case drôle, une case vraie ») : 4 à 6 sujets, environ 2 minutes de lecture en tout. **Pour chaque sujet, trois cases qui se suivent** (dessin → photo réelle → explication) :
   - **une case dessinée** (`"kind": "fact"`, `tag` = la rubrique : « Politique », « Économie », « Sciences »…). Le **récitatif est bien rempli** (30 mots max) : qui, quoi, où, et le détail précis sur lequel repose le gag, pour qu'on comprenne la blague sans connaître le sujet. **Une seule bulle**, la blague (15 mots max), qui détourne ce que dit le récitatif. Pas de bulle « sérieuse » qui répète l'info ;
   - **une case photo réelle** (`"kind": "photo"`, `"tag": "En vrai"`, 9 novembre 2026) : le vrai lieu, le bâtiment, l'institution, l'objet ou la carte du sujet, fichier Wikimedia Commons sous licence libre trouvé par WebSearch (`photo.commons` = « File:… », nom exact vérifié sur sa page Commons, licence libre). `title` 10 mots max, `text` 25 mots max sur ce qu'on voit. Jamais une personne vivante, même une personnalité ; jamais d'image choquante. Si rien de libre et pertinent n'existe, ce sujet s'en passe ;
   - **une case « Ce qui se passe vraiment »** (`"kind": "explain"`, `"tag": "Ce qui se passe vraiment"`, sans image) : un `title` clair (10 mots max) puis `text` en trois lignes séparées par `\n`, qui commencent par « Quoi : », « Pourquoi ça compte : », « Et maintenant : ». 50 mots au plus, ton neutre et factuel, pas de blague, aucun fait absent des sources.
   Personnalités publiques appelées par leur **vrai nom** (fonction rappelée à la première mention, « le Premier ministre, Sébastien Lecornu »), répliques visiblement parodiques, jamais de fausse citation crédible ; leur nom n'apparaît jamais dans les prompts d'images (caricature décrite). Chaque bulle a un `who` et chaque personnage un `name` (le nom usuel pour une personnalité, le rôle pour un anonyme : « Une syndicaliste »), voir « Qui parle ? » dans `prompts/SCHEMA.md`.
6. Écrire le casting (2 à 6 fiches pour tout le format ; fiche `skipped` d'office pour un personnage qui n'apparaît que dans une case), les prompts d'images en anglais, la couverture, la carte `final` (le fait le plus marquant du jour, 25 mots max) et `sources` (une URL par sujet au moins).
7. **Seconde passe de fact-check** : relire chaque récitatif et chaque case « Ce qui se passe vraiment » contre les sources. Corriger ou retirer.
8. **Écrire le bloc `newsletter`** de l'édition (objet, mot d'accueil, phrase du jeu, P.-S.), drôle et différent de tous les jours précédents, selon la section « Newsletter » de `prompts/SCHEMA.md`, et le `teaser` du format `actu`. Ajouter aussi un `teaser` aux BD de l'édition du jour qui n'en ont pas.
9. Ajouter le format au fichier `editions/<date>/edition.json` (le créer avec `"status": "draft"` s'il n'existe pas ; remplacer un `actu` existant). Valider le JSON (`python -m json.tool`).
10. `git add`, commit « Actu du <date> », `git push`. Le push déclenche la génération des images.

## Contrôle qualité (à 3 h 30, même tâche relancée ou suite de celle-ci)
Voir `prompts/QA.md`.

## Si quelque chose bloque
Ne jamais pousser une Actu incomplète ou non vérifiée. Mieux vaut une édition sans Actu (elle sort quand même avec le stock) qu'une erreur.
