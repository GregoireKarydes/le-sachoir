# Instagram : le Reel du jour (consigne de la tâche « Le Sachoir – Instagram »)

Version 2, depuis le 17 novembre 2026 (étude et choix : doc projet `claude/reel-v2.md`). Chaque matin, après la
publication de 5 h, tu prépares UN Reel « La question du jour ». GitHub Actions le fabrique (`pipeline/reel_v2.py` :
vraies vidéos, voix Kokoro, sous-titres, musique) et l'envoie à Buffer (`pipeline/social_publish.py`). Tu n'écris que
`social/instagram/<date>/post.json`.

**Le but : un maximum de vues.** Instagram pousse un Reel quand on le regarde jusqu'au bout et quand on l'envoie à
quelqu'un en message privé. Tout ce qui suit sert ces deux choses. Le Reel ne reprend pas forcément une BD : il amène
du monde sur lesachoir.fr, et le lien en bio (`lesachoir.fr/insta`) ouvre l'histoire liée au Reel.

## 1. Avant d'écrire

- Date de Paris : `TZ=Europe/Paris date +%F`. Si `social/instagram/<date>/post.json` existe déjà, ne fais rien.
- Lis les 10 derniers `social/instagram/*/post.json` (formats et sujets déjà faits : jamais deux fois le même sujet,
  pas le même format que les 2 derniers jours si un autre convient).
- Lis `editions/index.json` et l'édition du jour (`editions/<date>/edition.json`).
- `number` = nombre de posts `"version": 2` déjà présents + 1.

## 2. Choisir le sujet (le plus important)

Le test : **« à qui on l'enverrait ? »** Si la réponse n'est pas immédiate (« à mon frère qui dit toujours ça », « à
ma mère qui croit ça »), change de sujet. Un inconnu doit comprendre en 1 seconde de quoi on parle.

Les 5 formats (`format`), en rotation :
1. **`menti`, « On vous a menti »** : une idée reçue très répandue, démontée (« Non, le chewing-gum avalé ne reste pas
   7 ans dans l'estomac »).
2. **`pourquoi`, « Pourquoi dit-on… ? »** : une expression ou un mot que tout le monde emploie (très connus seulement,
   comme dans la rubrique D'où ça vient ?).
3. **`commentca`, « Comment ça marche, en vrai ? »** : un objet ou un geste du quotidien (esprit La Notice).
4. **`quiz`, « 3 questions, 3 secondes »** : 3 questions faciles à comprendre mais pas évidentes, réponses après un
   compte à rebours, « Dis ton score en commentaire ». Au plus 2 fois par semaine.
5. **`actu`, « L'actu en 30 s »** : un sujet léger dont on parle aujourd'hui (sport, météo, record, découverte, film,
   fête, date du calendrier), expliqué par la culture G. Jamais de politique partisane, jamais une personne réelle
   vivante au centre, jamais un drame.

**Coller au calendrier** : la veille et le jour d'une date qui fait parler, le sujet en parle (Beaujolais nouveau le
3e jeudi de novembre, Black Friday, Saint-Nicolas, Noël, Nouvel An, Chandeleur, Saint-Valentin, changement d'heure,
bac, rentrée…).

**Les faits** : de préférence un sujet qu'une histoire publiée du Sachoir explique déjà (elle a été vérifiée) ; mets-la
dans `story`. L'édition du jour en priorité (lisible gratuitement), sinon les archives. Pour un sujet sans histoire du
Sachoir (formats `actu`, `quiz`, calendrier), vérifie chaque fait sur 2 sources sérieuses (encyclopédie, média,
institution) et liste-les dans `sources`. Dans le doute, n'affirme pas.

## 3. Écrire les temps (`beats`)

Un temps = une phrase dite = un plan à l'écran. 7 à 10 temps, **55 à 80 mots dits au total** (compte-les), soit 20 à
30 secondes.

| `role` | Rôle | Règle |
|---|---|---|
| `hook` | Accroche, 1er temps | 6 à 12 mots. Contredit, pique ou intrigue. Jamais une définition, une date ou « Le saviez-vous ». |
| `tension` | Relance | « Et pourtant… », « Alors pourquoi… ? » Une phrase. |
| `explain` | Explication | 2 à 4 temps, une idée chacun, phrases de 6 à 14 mots. |
| `question` | Quiz | La question, courte. Suivie d'un `countdown`. |
| `countdown` | Compte à rebours | Pas de texte : `{"role": "countdown", "secs": 3}`. |
| `reveal` | Réponse du quiz | La réponse en une phrase, avec le petit détail qui fait sourire. |
| `answer` | Réponse | La réponse claire, avec un détail surprenant en bonus. |
| `end` | Fin | Facultatif. Par défaut : « Une question comme ça chaque matin, sur lesachoir point f r. » |

- **Écris pour l'oreille** : phrases courtes, mots simples, chiffres en lettres quand ils sont dits (« treize
  chiffres »), questions qui finissent par « ? ». Ton du Sachoir (`prompts/CHARTE.md`) : drôle, bienveillant, complice.
  Vouvoiement ou tutoiement : tutoiement pour les Reels (« Tu fais ça tous les jours… »). Aucun mot creux d'IA
  (« plongez », « découvrez », « fascinant », « incontournable », « véritable »), pas de tiret long.
- **La fin boucle sur le début** : la réponse ou la dernière phrase rappelle l'image ou le mot de l'accroche, pour qu'on
  relance la vidéo sans s'en rendre compte.
- **`big`** (facultatif) : 1 à 3 mots en très gros à l'écran pendant le temps (« 13 CHIFFRES », « 7 ANS ? », « FAUX »).
  Sur 2 ou 3 temps au plus.
- **`show`** : l'image du temps, une de ces formes :
  - `{"pexels": "barcode scanner supermarket"}` : vidéo libre de droits ; 2 à 5 mots-clés **en anglais**, concrets et
    filmables (un objet, un geste, un lieu), jamais abstraits (« truth », « history ») ;
  - `{"commons": "Louis XIV portrait"}` : archive du domaine public (gravure, tableau ancien, vieille photo), pour
    l'histoire et les origines ;
  - `{"bd": 4}` : la case n° 4 de l'histoire `story` (utile pour montrer « la BD du Sachoir », au plus 2 temps) ;
  - `{"card": "13 CHIFFRES"}` : une carte texte aux couleurs du Sachoir (pour un chiffre, une liste, une question de
    quiz). Pas de `big` sur un temps `card`.
  On peut combiner un essai et un secours : `{"pexels": "...", "bd": 2}`. Le 1er temps doit avoir l'image la plus forte.

## 4. Le reste du post

- **`title`** : le bandeau jaune des 4 premières secondes, 2 à 5 mots en capitales (« LE CODE-BARRES », « POURQUOI
  “BLACK” FRIDAY ? »).
- **`caption`** : ligne 1 = la question, telle qu'on la taperait dans la recherche. Puis 2 ou 3 lignes courtes qui
  donnent la réponse en entier (personne ne doit se sentir piégé). UNE seule demande, en priorité « Envoie-le à celui
  qui… » (adaptée au sujet) ; un jour sur trois « Toute l'histoire en BD : lien en bio. » Dernière ligne : « Une
  question comme ça chaque matin, en BD : lesachoir.fr ». 600 caractères au plus, au plus 2 émojis, aucun lien
  cliquable.
- **`hashtags`** : 3 à 5, en français, sans « # » : `lesachoir`, `culturegenerale`, plus 1 à 3 du sujet. Jamais
  `viral`, `fyp`, `explore`.
- **`alt`** : 1 phrase qui décrit la première image.
- **`time`** : facultatif (12:15 par défaut, heure de Paris). `"skip": true` retire le post.

## 5. Le fichier

`social/instagram/<date>/post.json` :

```json
{
  "date": "2026-11-19",
  "kind": "reel",
  "version": 2,
  "format": "pourquoi",
  "number": 2,
  "title": "BEAUJOLAIS NOUVEAU",
  "story": {"edition": "2026-11-19", "format": "cultureg"},
  "beats": [
    {"role": "hook", "say": "Pourquoi tout le monde boit du vin pas fini ce jeudi ?", "show": {"pexels": "red wine glass pouring"}},
    {"role": "tension", "say": "Et surtout, pourquoi ce jeudi-là, et pas un autre ?", "show": {"pexels": "vineyard autumn"}},
    {"role": "explain", "say": "…", "show": {"commons": "Beaujolais vendanges ancienne photo"}, "big": "3e JEUDI"},
    {"role": "answer", "say": "…", "show": {"pexels": "wine bottles cellar"}}
  ],
  "caption": "Pourquoi le Beaujolais nouveau sort le 3e jeudi de novembre ?\n\n…\n\nEnvoie-le à celui qui en ouvre une ce soir.\n\nUne question comme ça chaque matin, en BD : lesachoir.fr",
  "hashtags": ["lesachoir", "culturegenerale", "beaujolaisnouveau"],
  "alt": "Du vin rouge versé dans un verre.",
  "sources": ["https://…", "https://…"]
}
```

Avant de finir : compte les mots dits (55 à 80), relis chaque phrase à voix haute, vérifie que l'accroche passe le test
« à qui on l'enverrait ? ». Valide le JSON (`python3 -m json.tool`), commit « Instagram <date> : <title> »,
`git pull --rebase`, `git push origin main`. Le push déclenche le rendu ; ne touche à rien d'autre.
