# Tâche quotidienne : le stock (Culture G, Insolite, Grand Dossier)

Objectif : qu'il y ait toujours **7 jours d'avance** de `cultureg`, `insolite`, `dossier` et `quiz` dans `editions/`.
Lire d'abord : `prompts/CHARTE.md` et `prompts/SCHEMA.md`.

## Étapes
1. `git pull`. Pour chaque date de demain à J+7 (heure de Paris), regarder si `editions/<date>/edition.json` contient les trois formats. Produire **au plus 2 formats par passage** (le quota d'images gratuit est d'environ 60 à 80 images par jour), en commençant par la date la plus proche.
2. **Choisir le sujet** :
   - thématique dans le catalogue ci-dessous ;
   - jamais deux jours de suite le même pôle ; une thématique pas avant 20 jours ;
   - aucun fait déjà utilisé (chercher dans `editions/` avec `grep`) ; un sujet de Grand Dossier pas avant 12 mois ;
   - **environ 3 sujets sur 4 liés à la France** (histoire, personnages, lieux, inventions, langue françaises), 1 sur 4 international ;
   - **Grand Dossier** : un **grand sujet connu et important**, qui « refait la culture » du lecteur, vu dans son ensemble (environ 3 sur 4 de ces sujets sont des classiques). Partir de la thématique et viser large : Histoire → « La guerre froide », « Les rois de France » ; Sciences physiques → « Les atomes » ; Économie → « Les grandes crises » ; Littérature → « Les Misérables ». Varier les thèmes ;
   - **Culture G et Insolite** : plutôt des sujets **méconnus** (environ 3 sur 4), qui donnent envie de les raconter en société ;
   - sujets graves (guerres, épidémies, catastrophes) : possibles en Grand Dossier seulement, selon les garde-fous de la charte.
3. **Rechercher** les faits par recherche web (sources fiables : encyclopédies, institutions, ouvrages, presse de référence). Noter les URL dans `sources`.
4. **Écrire** selon la charte : personnages humains (ou animaux réels), jamais d'objets ou de cellules qui parlent ; personnage lucide seulement s'il est utile ; au moins deux leviers ; titre drôle ; la durée de lecture compte plus que le nombre de cases.
   - Culture G : un concept expliqué et vulgarisé, avec une touche d'humour (1 à 2 min).
   - Insolite : un fait ahurissant ou une idée reçue démontée (1 min).
   - Grand Dossier : 30 à 45 cases (4 à 6 min), découpées en chapitres adaptés au sujet (pas forcément « conséquences modernes » à la fin), compréhension d'abord, humour dosé, cliffhanger en case 4. Cases « pause » permises quand c'est utile (chiffre clé, frise, carte), le contenu dans le récitatif.
5. **Fact-check** en seconde passe. Retirer tout ce qui n'est pas sourcé.
6. Écrire dans `editions/<date>/edition.json` (créer avec `"status": "draft"` si besoin, sans toucher aux autres formats). Valider le JSON.
7. Commit « Stock <date> : <format> », `git push`.
8. **Le Quiz du jour** : à chaque passage, écrire aussi le `quiz` de **toutes** les dates de demain à J+7 qui n'en ont pas (il n'a pas d'image : il ne compte pas dans la limite de 2 formats). Suivre les règles du quiz de `prompts/SCHEMA.md` ; vérifier chaque réponse par recherche web ; commit « Stock <date> : quiz ».

## Les 32 thématiques, par pôle
- **Histoire** : Histoire ancienne, Histoire moderne, Histoire de France, Grandes personnalités, Mythologies et religions
- **Géopolitique & éco** : Géopolitique, Économie, Politique française, Entreprises et marques
- **Société & idées** : Psychologie, Sociologie, Philosophie, Démographie, Société, Droit, Géographie
- **Sciences** : Sciences physiques, L’univers, Sciences du vivant, Médecine et santé, Grandes découvertes, Écologie et climat, Informatique et numérique
- **Art & Culture** : Histoire de l’art, Arts plastiques, Architecture, Littérature, Expression française
- **Culture pop** : Musique, Mode et luxe, Sports, Jeux vidéo

Chaque format (`cultureg`, `insolite`, `dossier`) a **obligatoirement** un champ `theme`, écrit exactement comme ci-dessus (apostrophe typographique ’ comprise). C'est lui qui range l'histoire dans les filtres de l'écran Découvrir et qui sert aux règles d'alternance.
