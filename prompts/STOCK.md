# Tâche quotidienne : la file d'attente (Culture G, Insolite, Comment ça marche ?) et le jeu du jour

**Depuis le 8 novembre 2026, les BD hors Actu ne sont plus écrites pour une date.** Elles entrent dans une **file d'attente** par type ; GitHub Actions les dessine **une par une, jusqu'à 100 %**, et chaque matin la publication **pioche** pour l'édition du jour une BD finie de chaque type (la plus ancienne, en évitant le pôle de la veille). Une BD pas finie n'est jamais perdue : elle reste (ou retourne) dans la file avec ses images.
Lire d'abord : `prompts/CHARTE.md` et `prompts/SCHEMA.md`.

## Où écrire
- Une BD = un dossier `stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json`, où `<type>` est `cultureg`, `insolite`, `ccm` ou `dossier`, `AAAAMMJJ-HHMM` la date et l'heure d'écriture (heure de Paris : `TZ=Europe/Paris date +%Y%m%d-%H%M`) et `<mot-cle>` quelques mots du titre en minuscules, sans accents, reliés par des tirets. L'ordre des noms est l'ordre de la file.
- Contenu de `item.json` : `{"added": "<AAAAMMJJ-HHMM>", "formats": [ <la BD, exactement comme un format d'édition> ]}` (voir `prompts/SCHEMA.md`). Les chemins `cast/…png` et `images/…webp` sont relatifs à ce dossier ; ne crée pas les dossiers `images/` et `cast/`, le pipeline s'en charge.
- Ne jamais toucher aux BD déjà dans la file, sauf pour débloquer une BD (voir plus bas). Ne jamais écrire de `cultureg`, `insolite`, `ccm` ou `dossier` dans `editions/`.
- Le **jeu du jour** (`quiz`), lui, reste écrit **par date** dans `editions/<date>/edition.json`.

## Rattrapage du jour (lancement par l'orchestrateur)
Si le message de lancement commence par « Rattrapage <date> » : écrire d'abord le `quiz` de **cette date-là** (même si c'est aujourd'hui) dans `editions/<date>/edition.json`, commit et push aussitôt ; puis continuer normalement (la publication pioche dans la file dès qu'une BD est finie).

## Rattrapage : noms au-dessus des bulles (à faire tant qu'il en reste)
Avant d'écrire de nouvelles BD, pour chaque BD de la file (`stock/*/*/item.json`) et chaque édition à venir (`editions/<date ≥ aujourd'hui>/edition.json`) dont des bulles n'ont pas de `who` : ajouter le `name` de chaque personnage du casting et le `who` de chaque bulle, en relisant le texte pour attribuer chaque réplique à la bonne personne (`side` et prompt de l'image aident). Ne rien changer d'autre. Commit « Noms des bulles : <titre> », un par BD, poussé aussitôt. `python3 pipeline/validate.py` signale les bulles sans `who`.

## Rattrapage : vraies photos (9 novembre 2026, à faire tant qu'il en reste)
Greg : « C'est vraiment important d'avoir souvent des vraies images dans les BD, ça fait prendre conscience que c'est réel. » Avant d'écrire de nouvelles BD, pour chaque BD de la file et chaque édition à venir sans assez de photos (au moins 1 par Culture G ou Insolite, 2 par Grand Dossier) : chercher par WebSearch un fichier Wikimedia Commons libre et pertinent (le vrai lieu, le portrait d'époque, le document, le tableau, l'objet) et insérer une case `kind: "photo"` (voir `prompts/SCHEMA.md`) entre deux cases dessinées, puis renuméroter les `n`. Jamais en case 1, jamais à côté d'une case sans dessin, et dans un Grand Dossier jamais avant le cliffhanger de la case 4 (il doit rester en case 4). Ne rien changer d'autre. Commit « Vraies photos : <titre> », un par BD, poussé aussitôt. `python3 pipeline/validate.py` signale les BD sans photo.

## Rattrapage : jeux plus accessibles (13 novembre 2026, décision de Greg)
Avant d'écrire de nouvelles BD, pour chaque jeu à venir (`editions/<date ≥ aujourd'hui>/edition.json`, format `quiz`) que `python3 pipeline/validate.py` signale (« sans indice ») : ajouter à chaque question un `hint` (15 mots max, met sur la voie sans donner la réponse), remettre les questions dans l'ordre croissant de difficulté, et remplacer une question vraiment pointue par une plus grand public si le jeu en a plus d'une. Règles complètes : « Accessible avant tout » dans `prompts/SCHEMA.md`. Commit « Jeu accessible : <date> », un par jeu, poussé aussitôt.

## Rattrapage : casting resserré (13 novembre 2026, décision de Greg)
Avant d'écrire de nouvelles BD, pour chaque BD de la file pas encore entièrement dessinée que `python3 pipeline/validate.py` signale (« personnages au casting ») : ramener le casting à 2 personnages (Culture G, Insolite) ou 4 (Grand Dossier) en fusionnant les rôles (le curieux et le témoin deviennent une seule personne, les figurants passent sans fiche, de dos ou de loin), puis mettre à jour `who` des bulles, les `cast` des images et les prompts. Ne pas toucher aux images déjà faites d'un personnage qu'on garde ; remettre en `"status": "pending"` les images pas encore faites qui montraient un personnage retiré. Ajouter dans au moins une case sur trois un gag visuel décrit dans le prompt (voir `prompts/CHARTE.md`). Commit « Casting resserré : <titre> », un par BD, poussé aussitôt.

## Étapes
1. `git pull`. Compter les BD en file : `ls stock/cultureg stock/insolite stock/ccm stock/dossier`. Lire `data/health.json`, rubrique `stock` (BD finies `ready`, en cours `waiting`, bloquées `blocked`).
   - **Objectif : 6 BD en file** pour `cultureg`, pour `insolite` et pour `ccm` (finies et en cours comptées ensemble). Écrire celles qui manquent, **au plus 4 par passage**, en alternant les types (le type qui en a le moins d'abord ; `ccm` coûte moins d'images, il ne compte que pour une demie).
   - **Ne pas dépasser 8** BD en file par type : les images ne suivraient pas, inutile d'écrire trop loin.
   - `dossier` : écrit par une tâche à part (`prompts/DOSSIERS.md`). N'en écrire un ici qu'**en secours**, si la file `dossier` est vide (il compte pour 2).
   - **Débloquer** d'abord toute BD bloquée (`"blocked"` dans son `item.json`) : simplifier le `prompt` des images `failed`, leur remettre `"status": "pending"` et `"attempts": 0`, supprimer le champ `blocked`. Commit « File : débloque <nom> ».
2. **Choisir le sujet** :
   - thématique dans le catalogue ci-dessous ;
   - jamais le même pôle que la BD du même type écrite juste avant dans la file (la plus récente de `stock/<type>/`) ; une thématique pas avant les 20 dernières BD de ce type (file et éditions) ; **sauf `ccm`** : seulement pas la même thématique que la `ccm` précédente, et jamais le même objet ou phénomène ;
   - aucun fait déjà utilisé (chercher dans `editions/` **et** `stock/` avec `grep -r`) ; un sujet de Grand Dossier pas avant 12 mois ;
   - **environ 3 sujets sur 4 liés à la France** (histoire, personnages, lieux, inventions, langue françaises), 1 sur 4 international ;
   - **Grand Dossier** : un **grand sujet connu et important**, qui « refait la culture » du lecteur, vu dans son ensemble (environ 3 sur 4 de ces sujets sont des classiques). Partir de la thématique et viser large : Histoire → « La guerre froide », « Les rois de France » ; Sciences physiques → « Les atomes » ; Économie → « Les grandes crises » ; Littérature → « Les Misérables ». Varier les thèmes ;
   - **Culture G et Insolite** : plutôt des sujets **méconnus** (environ 3 sur 4), qui donnent envie de les raconter en société ;
   - sujets graves (guerres, épidémies, catastrophes) : possibles en Grand Dossier seulement, selon les garde-fous de la charte.
3. **Rechercher** les faits par recherche web (sources fiables : encyclopédies, institutions, ouvrages, presse de référence). Noter les URL dans `sources`.
4. **Écrire** selon la charte : personnages humains (ou animaux réels), jamais d'objets ou de cellules qui parlent ; personnage lucide seulement s'il est utile ; au moins deux leviers ; titre drôle ; la durée de lecture compte plus que le nombre de cases.
   - **Clarté d'abord** (section « Clarté d'abord » de la charte) : la case 1 pose la question du titre, chaque case fait avancer la réponse avec son pourquoi, aucun mot technique sans explication, un gag toutes les 2 ou 3 cases, résumé à la fin.
   - **Ajouter** 1 ou 2 cases « Pour mieux comprendre » (`kind: "explain"`, texte seul, aucune image) et le champ `story` « L’histoire complète » (150 à 250 mots), voir `prompts/SCHEMA.md`.
   - **Cases photo** (`kind: "photo"`) dans chaque BD dès qu'une vraie image est pertinente (9 novembre 2026) : 1 ou 2 par Culture G ou Insolite, 2 à 4 par Grand Dossier. Le vrai personnage historique, le vrai lieu, l'objet, un document d'époque, un tableau, une carte ; chercher systématiquement avant d'y renoncer. Fichier Wikimedia Commons sous licence libre uniquement (`photo.commons` = « File:… »), voir `prompts/SCHEMA.md`.
   - **`teaser`** : une accroche drôle de 25 mots max pour la newsletter (voir `prompts/SCHEMA.md`, « Newsletter »).
   - **Qui parle ?** Un `name` pour chaque personnage du casting et un `who` sur chaque bulle (voir `prompts/SCHEMA.md`, « Qui parle ? »).
   - Culture G : un concept expliqué et vulgarisé par un duo (un curieux qui pose les questions du lecteur, un personnage qui sait et répond simplement), avec une touche d'humour (1 à 2 min).
   - Insolite : un fait ahurissant ou une idée reçue démontée, raconté pas à pas pour qu'on comprenne comment c'est arrivé (1 min).
   - **Comment ça marche ?** (`ccm`, label « Comment ça marche ? ») : voir la section dédiée plus bas (2 min, micro-BD).
   - Grand Dossier : **24 cases dessinées au plus** (environ 3 min, depuis le 8 novembre 2026 ; avant 30), quota d'images oblige, découpées en chapitres adaptés au sujet (pas forcément « conséquences modernes » à la fin), compréhension d'abord, humour dosé, cliffhanger en case 4. Cases « pause » permises quand c'est utile (chiffre clé, frise, carte), le contenu dans le récitatif.
   - **Cohérence visuelle** (section « Cohérence visuelle d'une BD » de `prompts/SCHEMA.md`) : remplir `art` (sujet, lieux, époque, objets récurrents) et le `role` de chaque personnage ; choisir chaque personnage comme un caricaturiste (son look dit son métier, son époque, son caractère) ; chaque prompt de case colle au texte de la case (qui parle, quel objet, quel lieu) ; deux cases à la suite changent franchement de cadrage ou de pose (la case précédente n'est pas donnée au modèle).
5. **Fact-check** en seconde passe. Retirer tout ce qui n'est pas sourcé.
6. Écrire `stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json` (voir « Où écrire »). Valider le JSON (`python3 -m json.tool`).
7. Commit « File <type> : <titre> », `git pull --rebase`, `git push origin main` (un commit par BD, poussé aussitôt : si la tâche s'arrête en route, le travail déjà fait est gardé).
8. **Le jeu du jour** : à chaque passage, écrire aussi le `quiz` de **toutes** les dates de demain à J+7 qui n'en ont pas, dans `editions/<date>/edition.json` (créer avec `"date"` et `"status": "draft"` si besoin, sans toucher aux autres formats). Il n'a pas d'image : il ne compte pas dans la limite de 4 BD. Il **tourne** entre huit jeux (culture, géo, Frise, Dico menteur, Plus ou moins, Swipe, Chiffre, Qui a dit ça ?) : prendre le jeu suivant celui de la veille, selon `prompts/SCHEMA.md`. Vérifier chaque réponse par recherche web, et pour le Quiz géo chaque coordonnée et chaque code (départements, ISO alpha-3) ; commit « Stock <date> : quiz ».

## « Comment ça marche ? » (`ccm`, 14 novembre 2026, décision de Greg)
Une **micro-BD de 2 minutes par jour** qui explique une chose que tout le monde trouve normale aujourd'hui sans savoir comment elle marche. **Offerte dans l'édition gratuite du jour** (aucun paywall), écrite **à l'avance** dans la file `stock/ccm/` comme les autres.
- **Sujets** : objets, machines et phénomènes du quotidien. Exemples : le frigo, le micro-ondes, l'avion qui vole, le GPS, l'écran tactile, le Wi-Fi, la carte bancaire sans contact, l'ascenseur, la chasse d'eau, l'arc-en-ciel, les vaccins, le four à induction, la pile, l'appareil photo, la climatisation, le code-barres, internet, l'éolienne, le moteur de voiture, la fibre optique, le savon, la bouilloire, le thermomètre, l'IRM, le lave-linge, le téléphone portable, le parachute, le radar, les marées, la cocotte-minute. Un sujet par BD, jamais deux fois (chercher avec `grep -r` dans `editions/` et `stock/`). Titre en question ou promesse drôle (« Le frigo ne fabrique pas du froid, il déménage la chaleur »).
- **Forme** : un duo, 2 personnages au plus (un curieux qui pose les questions du lecteur, quelqu'un qui sait : inventeur d'époque, technicien, ingénieure, physicienne…), humains ou animaux réels, jamais l'objet qui parle. **4 ou 5 cases dessinées au plus** (le validateur le signale au-delà), + 1 ou 2 cases « Pour mieux comprendre » (`kind: "explain"`, souvent la chaîne des étapes du mécanisme : 1 → 2 → 3), + 1 case photo réelle (l'objet, son inventeur, le premier modèle, un schéma libre), + la carte « Pour briller » (`final`), `story` (150 à 250 mots), `teaser`, `sources`.
- **Déroulé** : case 1 = la question naïve du quotidien (« Pourquoi mon frigo est froid alors qu'il est branché sur une prise qui chauffe ? ») ; puis le principe en une idée simple ; puis le mécanisme pas à pas ; puis une petite surprise (l'idée reçue fausse, l'invention due au hasard, le chiffre étonnant) ; chute en écho à la case 1. Aucun mot technique sans explication. Exact avant tout : vérifier le mécanisme dans au moins deux sources fiables (vulgarisation scientifique reconnue, encyclopédie, constructeur, organisme public).
- **`theme`** : une des 32 thématiques (souvent Sciences physiques, Informatique et numérique, Médecine et santé, Grandes découvertes, Écologie et climat, L’univers) ; pour ce type, l'alternance se fait sur la **thématique** (pas deux fois de suite la même), pas sur le pôle.

## Les 32 thématiques, par pôle
- **Histoire** : Histoire ancienne, Histoire moderne, Histoire de France, Grandes personnalités, Mythologies et religions
- **Géopolitique & éco** : Géopolitique, Économie, Politique française, Entreprises et marques
- **Société & idées** : Psychologie, Sociologie, Philosophie, Démographie, Société, Droit, Géographie
- **Sciences** : Sciences physiques, L’univers, Sciences du vivant, Médecine et santé, Grandes découvertes, Écologie et climat, Informatique et numérique
- **Art & Culture** : Histoire de l’art, Arts plastiques, Architecture, Littérature, Expression française
- **Culture pop** : Musique, Mode et luxe, Sports, Jeux vidéo

Chaque format (`cultureg`, `insolite`, `ccm`, `dossier`) a **obligatoirement** un champ `theme`, écrit exactement comme ci-dessus (apostrophe typographique ’ comprise). C'est lui qui range l'histoire dans les filtres de l'écran Découvrir et qui sert aux règles d'alternance.
