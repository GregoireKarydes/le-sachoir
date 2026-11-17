# Instagram : le post du jour (consigne de la tâche « Le Sachoir – Instagram »)

Version 2, depuis le 17 novembre 2026 (étude et choix : doc projet `claude/reel-v2.md`). Chaque matin, après la
publication de 5 h, tu prépares UN post. Tu n'écris que `social/instagram/<date>/post.json` ; GitHub Actions fabrique
les images (`pipeline/carousel_v2.py`) ou la vidéo (`pipeline/reel_v2.py`) et les envoie à Buffer.

**Décision de Greg (17 novembre 2026) : mieux vaut un bon carrousel qu'un mauvais Reel.** Le post du jour est donc un
**carrousel « récit en diapositives »** (partie A). Les Reels (partie B) sont **en pause** : n'en fais pas tant que Greg
ne l'a pas demandé.

**Le but : un maximum de vues et de partages**, puis amener du monde sur lesachoir.fr (lien en bio `lesachoir.fr/insta`,
qui ouvre l'histoire liée au post).

# A. Le carrousel « récit en diapositives » (format par défaut)

Modèle de mécanique : les carrousels d'histoire qui font des centaines de milliers de j'aime (Le Coq Savant : « Ils
étaient tellement incapables… qu'on en fit un verbe. » → l'origine de « limoger », 142 k j'aime, 2 500 partages).
On reprend la **mécanique**, jamais les textes ni la formulation d'un autre compte. Notre touche : l'humour du Sachoir.

## A1. Avant d'écrire

- Date de Paris : `TZ=Europe/Paris date +%F`. Si `social/instagram/<date>/post.json` existe déjà, ne fais rien.
- Lis les 10 derniers `social/instagram/*/post.json` : jamais deux fois le même sujet.
- Lis `editions/index.json` et l'édition du jour.

## A2. Le sujet

- **Une histoire avec une révélation** : l'origine d'un mot ou d'une expression que tout le monde emploie, une idée
  reçue démontée, l'histoire cachée d'un objet du quotidien, un fait historique surprenant. Le test : « à qui on
  l'enverrait ? » (« à mon père qui dit toujours ça »). Si la réponse n'est pas immédiate, change de sujet.
- De préférence un sujet qu'une histoire publiée du Sachoir explique déjà (faits vérifiés) : mets-la dans `story`
  (édition du jour en priorité, sinon les archives). Sinon, vérifie chaque fait sur 2 sources sérieuses (CNRTL, Académie
  française, Larousse, encyclopédies, institutions, grands médias) et liste-les dans `sources`. Dans le doute, une
  nuance (« serait née », « selon la version la plus répandue ») vaut mieux qu'une affirmation fausse.
- Coller au calendrier quand une date fait parler (Beaujolais nouveau, Black Friday, Noël, Chandeleur…).
- Jamais de politique partisane, jamais une personne réelle vivante au centre, jamais un drame récent.

## A3. Les diapositives (`slides`) : écrire une énigme, pas une explication

6 à 9 diapositives de récit (la carte finale du Sachoir est ajoutée automatiquement, 10 images au plus).

**Règle d'or : on raconte une enquête, pas une leçon.** Le lecteur doit glisser parce qu'il VEUT savoir. On retient la
réponse le plus longtemps possible, on dramatise, on crée du mystère même pour un sujet banal (un code-barres se raconte
comme un polar). Exagère : trop de suspense vaut mieux que pas assez.

**La couverture (diapositive 1) : une énigme qui cache tout.**
- Elle ne nomme JAMAIS le sujet, le mot, l'objet ou la personne : elle les remplace par « il », « ils », « ce mot »,
  « cet objet », « cette ville », « un geste ».
- Elle pose un paradoxe, une menace, un mystère ou une conséquence énorme : on doit se dire « hein ? ».
- 8 à 16 mots, 2 ou 3 lignes, souvent coupée par des points de suspension.
- Formules qui marchent (à varier, jamais à recopier telles quelles) :
  - « Ils étaient si [défaut]… qu'on en a fait un [mot / verbe / expression]. »
  - « On se moquait de lui. Aujourd'hui, vous [utilisez / portez / dites] son nom. »
  - « Avant d'être une expression, c'était [un geste / une punition / un métier] qui pouvait [coûter la vie]. »
  - « Vous le dites chaque semaine. Vous ne savez pas que c'est une [insulte / menace / blague] de [époque]. »
  - « Cet objet est dans votre poche. Il a été inventé [sur une plage / par erreur / pour la guerre]. »
  - « Personne ne l'a jamais remarqué. Pourtant, il est partout autour de vous. »
  - « Il a changé votre quotidien. Personne ne connaît son nom. »

**Le récit (diapositives 2 à avant-dernière) : du suspense à chaque glissement.**
- On commence loin de la réponse : une date, un lieu, une scène. « Floride, 1948. Un homme est assis sur une plage. »
- Phrases de 2 à 8 mots. Fragments permis. Présent dramatique. Un retour à la ligne par phrase.
- **Chaque diapositive finit sur un crochet** qui rend la suivante obligatoire : une question (« Mais pourquoi
  lui ? »), un « Sauf que… », un « Et là, tout bascule. », un indice incomplet (« Une ville bien précise. »), une
  menace (« Il ne le sait pas encore, mais… »).
- **On retarde la révélation** : indices de plus en plus précis, fausses pistes possibles (« On pense aux soldats. Raté. »).
  Le mot-réponse n'apparaît qu'à l'avant-dernière ou à la dernière diapositive de récit, seul sur sa ligne, en jaune :
  « On dit qu'il s'est fait… **LIMOGER**. »
- 8 à 25 mots par diapositive, en 1 à 3 blocs séparés par une ligne vide. Une seule idée.
- **La touche Sachoir** : une ou deux phrases drôles au plus (ironie pince-sans-rire, anachronisme, aparté), placées
  pour relâcher la tension, jamais à la place de la révélation. Le reste se raconte avec le sérieux d'un documentaire.
- **La dernière diapositive de récit referme la boucle** avec une phrase qui claque : « Une bataille a disparu. Son
  expression, elle, est restée. »

**Exemple** (code-barres, sujet du quotidien raconté en énigme) :
1. « Ce petit dessin\nest sur tout ce que vous achetez.\n\nIl est né… **dans le sable**. »
2. « Philadelphie, 1948.\n\nUn patron de supermarché\nen a assez.\nSes caisses sont trop lentes. »
3. « Il demande de l'aide\nà une université.\n\nPersonne ne le prend au sérieux.\n\nSauf un étudiant. »
4. « Des mois de recherche.\nRien ne marche.\n\nAlors il part\nen Floride. »
5. « Sur une plage,\nil trace du **morse** dans le sable.\n\nPoints. Traits.\nEt il les étire vers le bas. »
6. « Des traits fins.\nDes traits épais.\n\nIl vient d'inventer\nquelque chose. »
7. « Le **code-barres**.\n\n(Le premier produit scanné, en 1974 ?\nUn paquet de chewing-gums. On a connu plus solennel.) »
8. « Aujourd'hui, il est bipé\ndes milliards de fois par jour.\n\nEt il ne contient même pas le prix. »
(Faits à vérifier et à sourcer comme les autres : ceci montre le ton, pas des faits à reprendre sans vérification.)

- `**mot**` met un ou deux mots-clés en jaune par diapositive, pas plus. Retours à la ligne voulus avec `\n`.
- Vouvoiement, comme dans l'appli. Aucun mot creux d'IA (« plongez », « découvrez », « fascinant », « incontournable »,
  « véritable »), pas de tiret long, pas d'émoji sur les images, jamais « Le saviez-vous ? ».

**Images (`image` de chaque diapositive)** : elles servent le récit, pas la BD.
- Histoire, origines, expressions : `{"commons": "termes de recherche"}` (gravure, tableau, photo ancienne du domaine
  public), avec `"tone": "archive"` (noir et blanc) au niveau du post. Termes précis : « Joffre 1914 », « château fort
  créneaux gravure », « Limoges 1900 ».
- Sujet moderne (objet, science, quotidien) : `{"photo": "english keywords"}` (photo Pixabay), avec `"tone": "couleur"`.
- `{"bd": n}` : une case de l'histoire du Sachoir (au plus 2 diapositives, pour montrer d'où vient la BD).
- `{"same": true}` : la même image recadrée, pour faire durer une scène sur 2 diapositives.
- Une image différente au moins toutes les 2 diapositives. La couverture a l'image la plus forte (un visage, une scène).

## A4. Le reste du post

- **`end`** (facultatif) : la petite phrase sous « Une question comme ça chaque matin, en BD » sur la carte finale
  (par défaut « Gratuit, en 2 minutes. »).
- **`caption`** : ligne 1 = la phrase de couverture (l'énigme, sans la réponse : la réponse se découvre en glissant).
  Puis, après une ligne vide, l'histoire racontée en entier en 4 à 8 paragraphes courts
  (personne ne doit se sentir piégé), une nuance si l'origine est discutée, puis UNE demande : en priorité « Envoyez-le
  à celui qui… », un jour sur trois « L'histoire en BD : lien en bio. » Puis « Sources : » et les sources en une ligne.
  Dernière ligne : « Une question comme ça chaque matin, en BD : lesachoir.fr ». 1 500 caractères au plus, aucun lien
  cliquable, au plus 2 émojis.
- **`hashtags`** : 3 à 5, en français, sans « # » : `lesachoir`, `culturegenerale`, plus 1 à 3 du sujet (`histoire`,
  `etymologie`, `expressionfrancaise`…). Jamais `viral`, `fyp`, `explore`.
- **`alt`** : 1 phrase qui décrit la couverture.
- `time` facultatif (12:15 par défaut), `"skip": true` retire le post.

## A5. Le fichier

```json
{
  "date": "2026-11-18",
  "kind": "carousel",
  "version": 2,
  "tone": "archive",
  "story": {"edition": "2026-11-18", "format": "origine"},
  "slides": [
    {"text": "Avant d'être une expression,\nc'était un geste\nqui pouvait **coûter la vie**.", "image": {"commons": "château fort créneaux gravure"}},
    {"text": "Moyen Âge.\n\nEn haut des remparts,\nune rangée de petits murs.", "image": {"commons": "remparts château médiéval"}},
    {"text": "…"}
  ],
  "end": "Gratuit, en 2 minutes.",
  "caption": "Avant d'être une expression, c'était un geste qui pouvait coûter la vie.\n\n…",
  "hashtags": ["lesachoir", "culturegenerale", "expressionfrancaise"],
  "alt": "Gravure ancienne de remparts de château fort.",
  "sources": ["https://www.cnrtl.fr/…", "https://www.dictionnaire-academie.fr/…"]
}
```

Avant de finir : relis chaque diapositive seule (elle doit donner envie de voir la suivante), vérifie que la couverture
ne donne pas la réponse et que chaque fait est sourcé. Valide le JSON (`python3 -m json.tool`), commit « Instagram
<date> : <sujet> », `git pull --rebase`, `git push origin main`. Le push déclenche le rendu ; ne touche à rien d'autre.

# B. Le Reel « La question du jour » (EN PAUSE, seulement si Greg le demande)


Version 2, depuis le 17 novembre 2026 (étude et choix : doc projet `claude/reel-v2.md`). Chaque matin, après la
publication de 5 h, tu prépares UN Reel « La question du jour ». GitHub Actions le fabrique (`pipeline/reel_v2.py` :
vraies vidéos Pixabay ou Pexels, voix Kokoro, sous-titres, musique) et l'envoie à Buffer (`pipeline/social_publish.py`). Tu n'écris que
`social/instagram/<date>/post.json`.

**Le but : un maximum de vues.** Instagram pousse un Reel quand on le regarde jusqu'au bout et quand on l'envoie à
quelqu'un en message privé. Tout ce qui suit sert ces deux choses. Le Reel ne reprend pas forcément une BD : il amène
du monde sur lesachoir.fr, et le lien en bio (`lesachoir.fr/insta`) ouvre l'histoire liée au Reel.

### 1. Avant d'écrire

- Date de Paris : `TZ=Europe/Paris date +%F`. Si `social/instagram/<date>/post.json` existe déjà, ne fais rien.
- Lis les 10 derniers `social/instagram/*/post.json` (formats et sujets déjà faits : jamais deux fois le même sujet,
  pas le même format que les 2 derniers jours si un autre convient).
- Lis `editions/index.json` et l'édition du jour (`editions/<date>/edition.json`).
- `number` = nombre de posts `"version": 2` déjà présents + 1.

### 2. Choisir le sujet (le plus important)

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

### 3. Écrire les temps (`beats`)

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
  - `{"video": "barcode scanner supermarket"}` : vidéo libre de droits (Pixabay ou Pexels) ; 2 à 5 mots-clés **en anglais**, concrets et
    filmables (un objet, un geste, un lieu), jamais abstraits (« truth », « history ») ;
  - `{"commons": "Louis XIV portrait"}` : archive du domaine public (gravure, tableau ancien, vieille photo), pour
    l'histoire et les origines ;
  - `{"bd": 4}` : la case n° 4 de l'histoire `story` (utile pour montrer « la BD du Sachoir », au plus 2 temps) ;
  - `{"card": "13 CHIFFRES"}` : une carte texte aux couleurs du Sachoir (pour un chiffre, une liste, une question de
    quiz). Pas de `big` sur un temps `card`.
  On peut combiner un essai et un secours : `{"video": "...", "bd": 2}`. Le 1er temps doit avoir l'image la plus forte.

### 4. Le reste du post

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

### 5. Le fichier

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
    {"role": "hook", "say": "Pourquoi tout le monde boit du vin pas fini ce jeudi ?", "show": {"video": "red wine glass pouring"}},
    {"role": "tension", "say": "Et surtout, pourquoi ce jeudi-là, et pas un autre ?", "show": {"video": "vineyard autumn"}},
    {"role": "explain", "say": "…", "show": {"commons": "Beaujolais vendanges ancienne photo"}, "big": "3e JEUDI"},
    {"role": "answer", "say": "…", "show": {"video": "wine bottles cellar"}}
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
