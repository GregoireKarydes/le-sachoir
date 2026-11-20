# Stratégie Instagram du Sachoir (document vivant)

Tenu à jour chaque dimanche par la tâche « Le Sachoir – Stratège Instagram » (méthode des skills
`social/instagram/ig-skills/` : ig-audit, ig-viral, ig-plan, ig-reel, ig-carousel, ig-caption, ig-profile).
Les tâches « Instagram » et « Reel sitcom » le lisent avant chaque post (partie 0 de `prompts/INSTAGRAM.md`).
Historique des bilans : `social/instagram/rapports/`.

## Objectif

Le plus de **partages** et d'**enregistrements** par personne touchée (puis de vues hors abonnés), et des visites sur
lesachoir.fr. Les vues brutes ne servent qu'à repérer les posts « hors norme » (× médiane du compte).

## Les trois rendez-vous quotidiens (fixes)

Depuis le 20 novembre 2026 (décisions de Greg) : trois Reels de 30 à 35 s par jour, chacun dans l'un des cinq styles alternés (partie D de `prompts/INSTAGRAM.md`), plus aucun carrousel. Le Reel sitcom Max et le Prof est en pause.

| créneau | format | heure | tâche |
|---|---|---|---|
| origine | Reel « D'où ça vient ? », 30 à 35 s, style selon D0 | 07:45 | Le Sachoir – Reels sitcom |
| cultureg | Reel « Pilule de Culture G », 30 à 35 s, style selon D0 | 12:30 | Le Sachoir – Reels sitcom |
| insolite | Reel « Insolite historique », 30 à 35 s, style selon D0 | 21:00 | Le Sachoir – Reels sitcom |

Demande de la légende par créneau (partie C7 de `prompts/INSTAGRAM.md`) : origine → commentaire (« Quelle expression on
décortique demain ? ») ; cultureg → commentaire (question sur l'expérience du spectateur) ; insolite → envoi
(« Envoie-le à celui qui… »). Premier commentaire avec un bonus et une question sur chaque Reel.

## Règles en vigueur

- **Ouverture à froid obligatoire** (Greg, 18 novembre 2026 : « la plupart des gens scrollent instantanément ») : chaque Reel démarre dans le monde du sujet, sur son fait le plus fou, 10 mots au plus en moins de 3 s, image forte + bandeau dès l'image 1 (partie C4b de `prompts/INSTAGRAM.md`). Le bilan du dimanche peut comparer les 6 types d'ouverture, jamais revenir à une ouverture au labo.
- **Toujours une question, et le Reel y répond** (Greg, 19 novembre 2026) : la première réplique (ouverture à froid) et le bandeau sont la question du Reel, précise, 12 mots au plus ; la réponse arrive avant la moitié, le Prof la reprend en une phrase avant la chute (« Voilà pourquoi… »). **Le texte seul doit suffire** : sous-titres, bandeau et mots-clés à l'écran se lisent sans le son et racontent question, réponse et pourquoi. Modèle : la chaîne Épicurieux de Jamy. Le bilan du dimanche peut comparer les types de questions, jamais supprimer la question d'ouverture.
- **Styles alternés** (Greg, 20 novembre 2026 ; remplace le « style figé » du 18 novembre) : cinq styles (`ipad-sketch`, `flat-space-explainer`, `comic-history`, `hd-2d`, `ink-wash`), choisis selon le sujet, jamais deux fois le même le même jour, chacun 2 à 6 fois par semaine (partie D0 de `prompts/INSTAGRAM.md`). Le bilan du dimanche compare les styles (champ `style` de `stats.md`) : il peut changer la grille par défaut et la matrice, mais ne retire ni n'ajoute un style sans l'accord de Greg, et ne conclut rien sur un style avant 6 Reels publiés. Les moteurs (`pipeline/styles/`, `pipeline/film_render.py`, `pipeline/film_score.py`) ne bougent pas sans l'accord de Greg : une idée de rendu va dans « Propositions pour Greg ».
- **Format court et boucle** (Greg, 20 novembre 2026, bible v3) : 30 à 35 s, aucun plan de plus de 4 s, la dernière phrase commence par « Voilà pourquoi… » et reprend un mot de la question, pas de carte de fin ; « Et ça, maintenant, tu le sais. » dans la légende.

Aucune pour l'instant : les valeurs par défaut de `prompts/INSTAGRAM.md` s'appliquent. Le premier bilan
(dimanche 22 novembre 2026) n'aura que quelques jours de données : il ne change rien sans signal net.

## Tests de la semaine

Aucun.

## Journal des décisions

- 2026-11-18 : mise en place (statistiques Buffer quotidiennes, bilan et ajustements chaque dimanche).
- 2026-11-18 (soir) : décision de Greg, carrousels arrêtés, trois Reels sitcom par jour (origine 07:45, cultureg 12:30, insolite 21:00), demandes de légende par créneau, premier commentaire.
- 2026-11-18 (soir) : style d'animation figé sur le Reel du jour (décision de Greg).
- 2026-11-18 (21 h) : ouverture à froid sur tous les Reels (moteur : scène 0 `world` + `cold`, bandeau dès l'image 1, coupe vers 1,5 s).
- 2026-11-19 : décision de Greg, chaque Reel s'ouvre par une question à laquelle il répond (modèle Épicurieux), le texte seul suffit à tout comprendre (partie C4, C4b, C5 de `prompts/INSTAGRAM.md`).
- 2026-11-20 : décision de Greg, les Reels passent à 30 à 35 s (partie C5 de `prompts/INSTAGRAM.md`) et, à terme, à 5 styles animés en rotation (bible `reels-styles.md` v3, partie D de `prompts/INSTAGRAM.md`). Pilote Tablet Sketch d'une semaine sur `cultureg` dès que son moteur existe.
- 2026-11-20 : go de Greg pour l'alternance des styles : les cinq styles tournent dès maintenant (moteurs `pipeline/film_render.py` et `pipeline/styles/`, partie D de `prompts/INSTAGRAM.md`), sitcom en pause.
