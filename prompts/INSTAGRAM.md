# Instagram : le post du jour (consigne de la tâche « Le Sachoir – Instagram »)

Depuis le 17 novembre 2026. Chaque matin, après la publication de 5 h, tu prépares UN post Instagram qui donne envie
d'ouvrir l'appli : une BD de l'édition du jour, coupée avant la chute. GitHub Actions fabrique ensuite les images ou la
vidéo (`pipeline/social_render.py`) et les envoie à Buffer, qui publie à 12 h 15 (`pipeline/social_publish.py`, actif
seulement quand le secret `BUFFER_API_KEY` existe). Tu n'écris que `social/instagram/<date>/post.json`.

Le but : faire connaître Le Sachoir par la culture G et l'humour (pas les séries ni le score), à des gens qui ne le
connaissent pas. Un inconnu doit comprendre en 2 secondes de quoi on parle, sourire, et vouloir la suite.

## 1. Avant d'écrire

- Date de Paris : `TZ=Europe/Paris date +%F`. Si `social/instagram/<date>/post.json` existe déjà, ne fais rien.
- L'édition du jour doit être publiée : la date figure dans `editions/index.json`. Sinon, n'écris rien et dis-le.
- Lis `editions/<date>/edition.json` et les 6 derniers `social/instagram/*/post.json` (pour l'alternance).

## 2. Choisir le format et la BD

- **Format** : alterne. Si le dernier post était un `carousel`, fais un `reel`, et inversement (premier post : `reel`).
- **Rubrique** : par ordre de préférence La Notice (`notice`), D'où ça vient ? (`origine`), la Pilule de Culture G
  (`cultureg`), l'Insolite historique (`insolite`) ; le Grand Dossier (`dossier`) au plus une fois par semaine, en
  carrousel seulement. Pas la même rubrique que les 2 posts précédents si une autre convient.
- **L'Actu (`actu`)** : au plus une fois par semaine, seulement un sujet léger et non politique (science, espace, sport,
  insolite), et jamais un sujet où apparaît une personne réelle vivante.
- La BD choisie doit avoir toutes ses images dessinées (`"status": "done"` et le fichier présent dans
  `editions/<date>/images/`). Choisis celle dont le sujet parle au plus grand nombre (objet du quotidien, expression
  connue, idée reçue) et dont la première case accroche sans contexte.

## 3. Choisir les cases (`cases` = numéros `n`)

- Seulement des cases dessinées (avec `image`) et au plus UNE case `explain` courte. Jamais de case `photo`.
- Garde l'ordre de la BD. Coupe AVANT la chute : jamais la dernière case ni le « En résumé » ; la carte finale dit que
  la suite est dans l'appli.
- **Carrousel** : 4 à 7 cases (le carrousel fait au plus 10 images avec la couverture et la carte finale).
- **Reel** : 2 ou 3 cases. La voix lit le récitatif puis les bulles de chaque case : au plus 110 mots lus au total
  (compte-les), soit moins de 50 secondes avec l'accroche et la fin.

## 4. Écrire

- **`hook`** (couverture, et première phrase dite dans le Reel) : 10 mots au plus, concret, qui ouvre une question que
  la BD referme. Familles qui marchent : la question que tout le monde se pose (« Pourquoi le micro-ondes ne chauffe pas
  l'assiette ? »), l'idée reçue retournée, le chiffre ou la date qui surprend, le « vous faites ça tous les jours sans
  savoir que… », l'anachronisme drôle. Jamais de promesse que la BD ne tient pas, pas de « Vous n'allez pas y croire ».
- **`end`** (carte finale) : une phrase de 20 mots au plus qui taquine la chute sans la donner.
- **`voice`** (Reel seulement, facultatif) : `{"hook": "...", "end": "..."}` si la version dite doit différer de
  l'écrite (par exemple chiffres écrits en lettres). Par défaut, la fin dite est « La suite, et la chute, dans l'appli
  du Sachoir. Lien en bio. »
- **`caption`** :
  - Ligne 1 (les 125 caractères visibles avant « … plus ») : en carrousel, l'accroche, coupée sur une question ; en Reel,
    la vidéo accroche déjà, donc la ligne 1 donne le contexte en une phrase.
  - Puis 2 à 4 paragraphes courts, séparés par une ligne vide, avec les mots qu'on taperait dans la recherche (« origine
    de l'expression … », « comment marche un code-barres »), écrits dans des phrases normales.
  - UNE seule demande, à la fin : « Toute la BD, et la chute, dans l'appli (lien en bio). » ou « Enregistrez-le pour
    briller au prochain dîner. » Pas deux.
  - Une ligne finale : « Une BD d'actu et de culture G chaque matin, gratuite. »
  - 900 caractères au plus. Aucun lien (il ne serait pas cliquable). Vouvoiement, comme dans l'appli.
- **`hashtags`** : 3 à 5, précis et en français, sans « # » ni doublon : `lesachoir`, `culturegenerale`, plus 1 à 3 du
  sujet (`expressionfrancaise`, `histoiredefrance`, `lesaviezvous`…). Jamais `viral`, `fyp`, `explore`.
- **`alt`** : 1 ou 2 phrases qui décrivent la couverture pour les malvoyants.
- **Ton** : l'humour bienveillant du Sachoir (`prompts/CHARTE.md`). Aucun fait qui n'est pas dans la BD (elle est déjà
  vérifiée). Pas de tiret long (—), au plus 2 émojis et jamais en premier caractère, et aucun mot creux d'IA :
  « plongez », « découvrez », « fascinant », « incontournable », « véritable », « dans un monde où », « embarquez ».
  Relis à voix haute : si une phrase sonne comme une pub, réécris-la.

## 5. Le fichier

`social/instagram/<date>/post.json` :

```json
{
  "date": "2026-11-18",
  "kind": "carousel",
  "story": {"edition": "2026-11-18", "format": "notice"},
  "hook": "Ce code-barres ne connaît même pas le prix de vos pâtes",
  "cases": [1, 2, 3, 4, 6],
  "end": "Et le tout premier produit scanné de l'histoire, c'était… un truc à mâcher.",
  "caption": "Ce code-barres ne connaît même pas le prix de vos pâtes. Alors comment la caisse le trouve ?\n\n…",
  "hashtags": ["lesachoir", "culturegenerale", "lesaviezvous"],
  "alt": "Un caissier moustachu regarde, incrédule, un homme en chemise hawaïenne tracer des traits dans du sable posé sur le tapis de caisse.",
  "time": "12:15"
}
```

`kind` vaut `carousel` ou `reel`. `time` est facultatif (12:15 par défaut, heure de Paris). `"skip": true` empêche
l'envoi (Greg peut le poser pour retirer un post).

Valide le JSON (`python3 -m json.tool`), commit « Instagram <date> : <hook> », `git pull --rebase`, `git push origin main`.
Le push déclenche le rendu ; ne touche à rien d'autre.
