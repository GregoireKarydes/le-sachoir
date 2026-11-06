# Tâche quotidienne : le stock (Culture G, Insolite, Grand Dossier)

Objectif : qu'il y ait toujours **7 jours d'avance** de `cultureg`, `insolite` et `dossier` dans `editions/`.
Lire d'abord : `prompts/CHARTE.md` et `prompts/SCHEMA.md`.

## Étapes
1. `git pull`. Pour chaque date de demain à J+7 (heure de Paris), regarder si `editions/<date>/edition.json` contient les trois formats. Produire **au plus 2 formats par passage** (le quota d'images gratuit est d'environ 60 à 80 images par jour), en commençant par la date la plus proche.
2. **Choisir le sujet** :
   - thématique dans le catalogue ci-dessous ;
   - jamais deux jours de suite le même pôle ; une thématique pas avant 20 jours ;
   - aucun fait déjà utilisé (chercher dans `editions/` avec `grep`) ; un sujet de Grand Dossier pas avant 12 mois ;
   - un sujet qui donne envie de le raconter en société.
3. **Rechercher** les faits par recherche web (sources fiables : encyclopédies, institutions, ouvrages, presse de référence). Noter les URL dans `sources`.
4. **Écrire** selon la charte : casting adapté au sujet (humains, animaux, objets, cellules…), un personnage lucide, au moins deux leviers, gag porteur, chute en écho. Grand Dossier : 30 à 45 cases en 4 chapitres (contexte, péripéties, analyse, conséquences modernes), humour dosé, cliffhanger en case 4.
5. **Fact-check** en seconde passe. Retirer tout ce qui n'est pas sourcé.
6. Écrire dans `editions/<date>/edition.json` (créer avec `"status": "draft"` si besoin, sans toucher aux autres formats). Valider le JSON.
7. Commit « Stock <date> : <format> », `git push`.

## Les 32 thématiques, par pôle
- **Histoire** : Histoire ancienne, Histoire moderne, Histoire de France, Grandes personnalités, Mythologies et religions
- **Géopolitique & éco** : Géopolitique, Économie, Politique française, Entreprises et marques
- **Société & idées** : Psychologie, Sociologie, Philosophie, Démographie, Société, Droit, Géographie
- **Sciences** : Sciences physiques, L’univers, Sciences du vivant, Médecine et santé, Grandes découvertes, Écologie et climat, Informatique et numérique
- **Art & Culture** : Histoire de l’art, Arts plastiques, Architecture, Littérature, Expression française
- **Culture pop** : Musique, Mode et luxe, Sports, Jeux vidéo

Chaque format (`cultureg`, `insolite`, `dossier`) a **obligatoirement** un champ `theme`, écrit exactement comme ci-dessus (apostrophe typographique ’ comprise). C'est lui qui range l'histoire dans les filtres de l'écran Découvrir et qui sert aux règles d'alternance.
