# Tâche quotidienne : la file d'attente (Culture G, Insolite) et le jeu du jour

**Depuis le 8 novembre 2026, les BD hors Actu ne sont plus écrites pour une date.** Elles entrent dans une **file d'attente** par type ; GitHub Actions les dessine **une par une, jusqu'à 100 %**, et chaque matin la publication **pioche** pour l'édition du jour une BD finie de chaque type (la plus ancienne, en évitant le pôle de la veille). Une BD pas finie n'est jamais perdue : elle reste (ou retourne) dans la file avec ses images.
Lire d'abord : `prompts/CHARTE.md` et `prompts/SCHEMA.md`.

## Où écrire
- Une BD = un dossier `stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json`, où `<type>` est `cultureg`, `insolite` ou `dossier`, `AAAAMMJJ-HHMM` la date et l'heure d'écriture (heure de Paris : `TZ=Europe/Paris date +%Y%m%d-%H%M`) et `<mot-cle>` quelques mots du titre en minuscules, sans accents, reliés par des tirets. L'ordre des noms est l'ordre de la file.
- Contenu de `item.json` : `{"added": "<AAAAMMJJ-HHMM>", "formats": [ <la BD, exactement comme un format d'édition> ]}` (voir `prompts/SCHEMA.md`). Les chemins `cast/…png` et `images/…webp` sont relatifs à ce dossier ; ne crée pas les dossiers `images/` et `cast/`, le pipeline s'en charge.
- Ne jamais toucher aux BD déjà dans la file, sauf pour débloquer une BD (voir plus bas). Ne jamais écrire de `cultureg`, `insolite` ou `dossier` dans `editions/`.
- Le **jeu du jour** (`quiz`), lui, reste écrit **par date** dans `editions/<date>/edition.json`.

## Rattrapage du jour (lancement par l'orchestrateur)
Si le message de lancement commence par « Rattrapage <date> » : écrire d'abord le `quiz` de **cette date-là** (même si c'est aujourd'hui) dans `editions/<date>/edition.json`, commit et push aussitôt ; puis continuer normalement (la publication pioche dans la file dès qu'une BD est finie).

## Étapes
1. `git pull`. Compter les BD en file : `ls stock/cultureg stock/insolite stock/dossier`. Lire `data/health.json`, rubrique `stock` (BD finies `ready`, en cours `waiting`, bloquées `blocked`).
   - **Objectif : 6 BD en file** pour `cultureg` et pour `insolite` (finies et en cours comptées ensemble). Écrire celles qui manquent, **au plus 4 par passage**, en alternant les types (le type qui en a le moins d'abord).
   - **Ne pas dépasser 8** BD en file par type : les images ne suivraient pas, inutile d'écrire trop loin.
   - `dossier` : écrit par une tâche à part (`prompts/DOSSIERS.md`). N'en écrire un ici qu'**en secours**, si la file `dossier` est vide (il compte pour 2).
   - **Débloquer** d'abord toute BD bloquée (`"blocked"` dans son `item.json`) : simplifier le `prompt` des images `failed`, leur remettre `"status": "pending"` et `"attempts": 0`, supprimer le champ `blocked`. Commit « File : débloque <nom> ».
2. **Choisir le sujet** :
   - thématique dans le catalogue ci-dessous ;
   - jamais le même pôle que la BD du même type écrite juste avant dans la file (la plus récente de `stock/<type>/`) ; une thématique pas avant les 20 dernières BD de ce type (file et éditions) ;
   - aucun fait déjà utilisé (chercher dans `editions/` **et** `stock/` avec `grep -r`) ; un sujet de Grand Dossier pas avant 12 mois ;
   - **environ 3 sujets sur 4 liés à la France** (histoire, personnages, lieux, inventions, langue françaises), 1 sur 4 international ;
   - **Grand Dossier** : un **grand sujet connu et important**, qui « refait la culture » du lecteur, vu dans son ensemble (environ 3 sur 4 de ces sujets sont des classiques). Partir de la thématique et viser large : Histoire → « La guerre froide », « Les rois de France » ; Sciences physiques → « Les atomes » ; Économie → « Les grandes crises » ; Littérature → « Les Misérables ». Varier les thèmes ;
   - **Culture G et Insolite** : plutôt des sujets **méconnus** (environ 3 sur 4), qui donnent envie de les raconter en société ;
   - sujets graves (guerres, épidémies, catastrophes) : possibles en Grand Dossier seulement, selon les garde-fous de la charte.
3. **Rechercher** les faits par recherche web (sources fiables : encyclopédies, institutions, ouvrages, presse de référence). Noter les URL dans `sources`.
4. **Écrire** selon la charte : personnages humains (ou animaux réels), jamais d'objets ou de cellules qui parlent ; personnage lucide seulement s'il est utile ; au moins deux leviers ; titre drôle ; la durée de lecture compte plus que le nombre de cases.
   - **Clarté d'abord** (section « Clarté d'abord » de la charte) : la case 1 pose la question du titre, chaque case fait avancer la réponse avec son pourquoi, aucun mot technique sans explication, un gag toutes les 2 ou 3 cases, résumé à la fin.
   - **Ajouter** 1 ou 2 cases « Pour mieux comprendre » (`kind: "explain"`, texte seul, aucune image) et le champ `story` « L’histoire complète » (150 à 250 mots), voir `prompts/SCHEMA.md`.
   - Culture G : un concept expliqué et vulgarisé par un duo (un curieux qui pose les questions du lecteur, un personnage qui sait et répond simplement), avec une touche d'humour (1 à 2 min).
   - Insolite : un fait ahurissant ou une idée reçue démontée, raconté pas à pas pour qu'on comprenne comment c'est arrivé (1 min).
   - Grand Dossier : **24 cases dessinées au plus** (environ 3 min, depuis le 8 novembre 2026 ; avant 30), quota d'images oblige, découpées en chapitres adaptés au sujet (pas forcément « conséquences modernes » à la fin), compréhension d'abord, humour dosé, cliffhanger en case 4. Cases « pause » permises quand c'est utile (chiffre clé, frise, carte), le contenu dans le récitatif.
   - **Cohérence visuelle** (section « Cohérence visuelle d'une BD » de `prompts/SCHEMA.md`) : remplir `art` (sujet, lieux, époque, objets récurrents) et le `role` de chaque personnage ; choisir chaque personnage comme un caricaturiste (son look dit son métier, son époque, son caractère) ; chaque prompt de case colle au texte de la case (qui parle, quel objet, quel lieu) ; `"same_place": false` sur une case qui change de lieu.
5. **Fact-check** en seconde passe. Retirer tout ce qui n'est pas sourcé.
6. Écrire `stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json` (voir « Où écrire »). Valider le JSON (`python3 -m json.tool`).
7. Commit « File <type> : <titre> », `git pull --rebase`, `git push origin main` (un commit par BD, poussé aussitôt : si la tâche s'arrête en route, le travail déjà fait est gardé).
8. **Le jeu du jour** : à chaque passage, écrire aussi le `quiz` de **toutes** les dates de demain à J+7 qui n'en ont pas, dans `editions/<date>/edition.json` (créer avec `"date"` et `"status": "draft"` si besoin, sans toucher aux autres formats). Il n'a pas d'image : il ne compte pas dans la limite de 4 BD. Il **tourne** entre huit jeux (culture, géo, Frise, Dico menteur, Plus ou moins, Swipe, Chiffre, Qui a dit ça ?) : prendre le jeu suivant celui de la veille, selon `prompts/SCHEMA.md`. Vérifier chaque réponse par recherche web, et pour le Quiz géo chaque coordonnée et chaque code (départements, ISO alpha-3) ; commit « Stock <date> : quiz ».

## Les 32 thématiques, par pôle
- **Histoire** : Histoire ancienne, Histoire moderne, Histoire de France, Grandes personnalités, Mythologies et religions
- **Géopolitique & éco** : Géopolitique, Économie, Politique française, Entreprises et marques
- **Société & idées** : Psychologie, Sociologie, Philosophie, Démographie, Société, Droit, Géographie
- **Sciences** : Sciences physiques, L’univers, Sciences du vivant, Médecine et santé, Grandes découvertes, Écologie et climat, Informatique et numérique
- **Art & Culture** : Histoire de l’art, Arts plastiques, Architecture, Littérature, Expression française
- **Culture pop** : Musique, Mode et luxe, Sports, Jeux vidéo

Chaque format (`cultureg`, `insolite`, `dossier`) a **obligatoirement** un champ `theme`, écrit exactement comme ci-dessus (apostrophe typographique ’ comprise). C'est lui qui range l'histoire dans les filtres de l'écran Découvrir et qui sert aux règles d'alternance.
