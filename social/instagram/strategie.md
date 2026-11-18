# Stratégie Instagram du Sachoir (document vivant)

Tenu à jour chaque dimanche par la tâche « Le Sachoir – Stratège Instagram » (méthode des skills
`social/instagram/ig-skills/` : ig-audit, ig-viral, ig-plan, ig-reel, ig-carousel, ig-caption, ig-profile).
Les tâches « Instagram » et « Reel sitcom » le lisent avant chaque post (partie 0 de `prompts/INSTAGRAM.md`).
Historique des bilans : `social/instagram/rapports/`.

## Objectif

Le plus de **partages** et d'**enregistrements** par personne touchée (puis de vues hors abonnés), et des visites sur
lesachoir.fr. Les vues brutes ne servent qu'à repérer les posts « hors norme » (× médiane du compte).

## Les trois rendez-vous quotidiens (fixes)

Depuis le 19 novembre 2026 (décision de Greg) : trois Reels sitcom Max et le Prof, plus aucun carrousel.

| créneau | format | heure | tâche |
|---|---|---|---|
| origine | Reel sitcom « D'où ça vient ? », 40 à 55 s | 07:45 | Le Sachoir – Reels sitcom |
| cultureg | Reel sitcom « Pilule de Culture G », 40 à 55 s | 12:30 | Le Sachoir – Reels sitcom |
| insolite | Reel sitcom « Insolite historique », 40 à 55 s | 21:00 | Le Sachoir – Reels sitcom |

Demande de la légende par créneau (partie C7 de `prompts/INSTAGRAM.md`) : origine → commentaire (« Quelle expression on
décortique demain ? ») ; cultureg → commentaire (question sur l'expérience du spectateur) ; insolite → envoi
(« Envoie-le à celui qui… »). Premier commentaire avec un bonus et une question sur chaque Reel.

## Règles en vigueur

- **Ouverture à froid obligatoire** (Greg, 18 novembre 2026 : « la plupart des gens scrollent instantanément ») : chaque Reel démarre dans le monde du sujet, sur son fait le plus fou, 10 mots au plus en moins de 3 s, image forte + bandeau dès l'image 1 (partie C4b de `prompts/INSTAGRAM.md`). Le bilan du dimanche peut comparer les 6 types d'ouverture, jamais revenir à une ouverture au labo.
- **Style d'animation figé** sur le Reel du 18 novembre 2026 (moteur tel qu'au commit `2ddeb90`, partie C1 de `prompts/INSTAGRAM.md`) : jamais modifié par le bilan du dimanche ; seuls sujets, accroches, mondes, durée, légendes et heures peuvent bouger.

Aucune pour l'instant : les valeurs par défaut de `prompts/INSTAGRAM.md` s'appliquent. Le premier bilan
(dimanche 22 novembre 2026) n'aura que quelques jours de données : il ne change rien sans signal net.

## Tests de la semaine

Aucun.

## Journal des décisions

- 2026-11-18 : mise en place (statistiques Buffer quotidiennes, bilan et ajustements chaque dimanche).
- 2026-11-18 (soir) : décision de Greg, carrousels arrêtés, trois Reels sitcom par jour (origine 07:45, cultureg 12:30, insolite 21:00), demandes de légende par créneau, premier commentaire.
- 2026-11-18 (soir) : style d'animation figé sur le Reel du jour (décision de Greg).
- 2026-11-18 (21 h) : ouverture à froid sur tous les Reels (moteur : scène 0 `world` + `cold`, bandeau dès l'image 1, coupe vers 1,5 s).
