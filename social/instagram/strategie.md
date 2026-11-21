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

- **Triple accroche** (Greg, 21 novembre 2026, d'après quatre Reels modèles ; remplace l'ouverture C4b) : les plans 0 à 2 empilent trois accroches en 6 s au plus : arrêter le pouce avec une structure qui a déjà fait des millions de vues (banque 101 à 114, partie D2a de `prompts/INSTAGRAM.md`, remplie avec le détail concret du sujet), créer la curiosité (la question du Reel, dite ou sous-entendue), verrouiller l'attention (ce que le spectateur gagne). Image forte et bandeau dès l'image 1. Le bilan du dimanche compare les structures (`hook_formula` dans `stats.md`) : il peut en privilégier ou en écarter, jamais revenir à une accroche unique.
- **Toujours une question, et le Reel y répond** (Greg, 19 novembre 2026) : la question du Reel se pose dans la triple accroche (plan 1, ou plan 0) ; la réponse tombe au plan 3, avant 7 s (PREP), et la dernière phrase la redit (« Voilà pourquoi… »). **Le texte seul doit suffire** : sous-titres, bandeau et cartons se lisent sans le son et racontent question, réponse et pourquoi. Le bilan du dimanche peut comparer les types de questions, jamais supprimer la question.
- **Styles alternés** (Greg, 20 novembre 2026 ; remplace le « style figé » du 18 novembre) : cinq styles (`ipad-sketch`, `flat-space-explainer`, `comic-history`, `hd-2d`, `ink-wash`), choisis selon le sujet, jamais deux fois le même le même jour, chacun 2 à 6 fois par semaine (partie D0 de `prompts/INSTAGRAM.md`). Le bilan du dimanche compare les styles (champ `style` de `stats.md`) : il peut changer la grille par défaut et la matrice, mais ne retire ni n'ajoute un style sans l'accord de Greg, et ne conclut rien sur un style avant 6 Reels publiés. Les moteurs (`pipeline/styles/`, `pipeline/film_render.py`, `pipeline/film_score.py`) ne bougent pas sans l'accord de Greg : une idée de rendu va dans « Propositions pour Greg ».
- **Format court et boucle** (Greg, 20 novembre 2026, bible v3) : 30 à 35 s, aucun plan de plus de 4 s, la dernière phrase commence par « Voilà pourquoi… » et reprend un mot de la question, puis la page « pub » du Sachoir que le moteur ajoute seul ; « Et ça, maintenant, tu le sais. » dans la légende.

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
- 2026-11-20 (soir) : décision de Greg, écriture PREP (Point, Raison, Explication par l'exemple, Point redit) et page « pub » lesachoir.fr à la fin de chaque Reel.
- 2026-11-21 : décision de Greg, triple accroche sur tous les Reels (arrêter, intriguer, verrouiller) avec une banque de structures virales adaptées (partie D2a de `prompts/INSTAGRAM.md`).
