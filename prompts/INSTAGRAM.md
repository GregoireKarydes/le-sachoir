# Instagram et TikTok : les posts du jour

Version 3, depuis le 19 novembre 2026 (décision de Greg du 18 novembre au soir : « le Reel sitcom a beaucoup plus de
potentiel de buzz »). **Les carrousels sont arrêtés.** Chaque jour partent **trois Reels « sitcom » Max et le Prof**
(partie C), sur Instagram (Reel) et TikTok (vidéo), un par rubrique :

| créneau (`slot`) | rubrique | heure (`time`) | dossier |
|---|---|---|---|
| `origine` | D'où ça vient ? | 07:45 | `social/instagram/<date>-sitcom-origine/` |
| `cultureg` | La Pilule de Culture G | 12:30 | `social/instagram/<date>-sitcom-cultureg/` |
| `insolite` | L'Insolite historique | 21:00 | `social/instagram/<date>-sitcom-insolite/` |

Pourquoi ces heures : 7 h 45, le petit-déjeuner et les transports (le rendez-vous « chaque matin » du Sachoir) ; 12 h 30,
la pause déjeuner ; 21 h, après le dîner, le créneau où les Reels sont le plus regardés et partagés. Plus de 4 h entre deux
Reels pour qu'ils ne se volent pas leur public. La tâche « Le Sachoir – Stratège Instagram » peut déplacer ces heures
(entre 7 h et 22 h, dans le même ordre) d'après les statistiques.

Ils sont écrits par la tâche « Le Sachoir – Reels sitcom ». Tu n'écris que les `post.json` ; GitHub Actions fabrique les
vidéos (`pipeline/sitcom_render.py`) et les envoie à Buffer. Les parties A (carrousels) et B (Reel « question du jour »)
sont **en pause** : n'en fais pas tant que Greg ne l'a pas demandé (la grille de viralité de la partie A2 sert encore à
choisir les sujets).

**Le but : le buzz.** Un maximum de vues, de partages (envois en message privé), de commentaires et d'enregistrements,
puis des visites sur lesachoir.fr (lien en bio `lesachoir.fr/insta`, qui ouvre l'histoire liée au post).

# 0. La stratégie en cours (tous les posts : les trois Reels sitcom)

Depuis le 18 novembre 2026, la tâche « Le Sachoir – Stratège Instagram » analyse chaque dimanche les statistiques
(`social/instagram/stats.md`, mis à jour chaque jour par le workflow « Statistiques réseaux ») et tient à jour
**`social/instagram/strategie.md`**. Avant d'écrire un post, lis-le s'il existe :
- ses **règles en vigueur** priment sur les valeurs par défaut des parties A et C (heures de publication, nombre de
  diapositives, durée et rythme du Reel, formules d'accroche à privilégier ou à éviter, rubriques, légende, hashtags) ;
- ses **tests de la semaine** s'appliquent aux posts qu'ils désignent : ajoute alors `"test": "<id du test>"` au
  `post.json` ;
- elle ne prime **jamais** sur `prompts/CHARTE.md`, les faits sourcés, les interdits, ni le format JSON.
Dans chaque `post.json`, ajoute aussi `"hook_formula"` : l'`id` de la formule de
`social/instagram/ig-skills/skills/ig-reel/hooks.json` utilisée pour l'accroche ou la couverture (un nombre), pour que
l'analyse sache quelles formules marchent.

# A. Le carrousel « récit en diapositives » (EN PAUSE depuis le 19 novembre 2026, seulement si Greg le demande)

Modèle de mécanique : les carrousels d'histoire qui font des centaines de milliers de j'aime (Le Coq Savant : « Ils
étaient tellement incapables… qu'on en fit un verbe. » → l'origine de « limoger », 142 k j'aime, 2 500 partages).
On reprend la **mécanique**, jamais les textes ni la formulation d'un autre compte. Notre touche : l'humour du Sachoir.

## A1. Avant d'écrire

- Date de Paris : `TZ=Europe/Paris date +%F`. L'édition du jour doit être publiée (date dans `editions/index.json`),
  sinon n'écris rien et dis-le.
- Les deux fichiers du jour :
  - **l'actu** : `social/instagram/<date>-actu/post.json`, publié à **12:15** (`"time": "12:15"`) ;
  - **la culture** : `social/instagram/<date>/post.json`, publié à **18:30** (`"time": "18:30"`).
  Si un des deux existe déjà, ne refais que l'autre.
- Lis `editions/<date>/edition.json` et les 14 derniers `social/instagram/*/post.json` : jamais deux fois le même
  sujet, et l'alternance des rubriques ci-dessous.

## A2. Choisir les deux sujets dans l'édition du jour

Les deux carrousels racontent chacun **une BD de l'édition du jour** (`story` = `{"edition": "<date>", "format": "<id>"}`) :
le lien en bio ouvre alors cette BD dans l'appli, lisible gratuitement. Les faits viennent de la BD (déjà vérifiée) ;
pour tout ajout, 2 sources sérieuses dans `sources`.

**1. Le carrousel culture (18:30) : le sujet le plus viral, expliqué à fond.** C'est le post qui doit faire le plus de
partages : on prend LE meilleur sujet, pas le suivant d'une rotation.
- **Candidats** : les BD de l'édition du jour parmi La Notice (`notice`), D'où ça vient ? (`origine`), la Pilule de
  Culture G (`cultureg`), l'Insolite historique (`insolite`) et le Grand Dossier (`dossier`). Si aucune ne marque au
  moins 9 points ci-dessous, élargis aux BD publiées ces 30 derniers jours (`editions/index.json`) jamais postées.
- **Note chaque candidat sur 12** (0, 1 ou 2 par critère) et prends la meilleure note :
  1. **Connu de tous** : un mot, une expression, un objet, un lieu ou un personnage que 9 Français sur 10 connaissent.
  2. **Révélation** : la réponse surprend vraiment (« je n'aurais jamais deviné »), pas un simple détail.
  3. **Émotion** : étonnement, rire, indignation légère, fierté (« c'est français ! »), frisson historique.
  4. **Envoyable** : on pense tout de suite à quelqu'un à qui l'envoyer.
  5. **Racontable en scènes** : il y a des personnages, un lieu, une date, un enchaînement de causes.
  6. **Images** : on trouvera de vraies images d'archives ou des photos fortes pour le raconter.
  Départage : la rubrique la moins postée des 7 derniers jours. Jamais un sujet déjà posté.

**2. Le carrousel actu (12:15)** : un sujet de l'Actu du jour (`actu`), raconté en énigme comme le reste.
- Prends **le sujet dont tout le monde parle ou dont on a envie de parler** : un record, une découverte, une première,
  un chiffre fou, un événement sportif, spatial, scientifique, une décision qui change le quotidien (prix, règles,
  calendrier). Le test « à qui on l'enverrait ? » compte double.
- L'angle : ce que la BD explique (le pourquoi, le comment), pas une simple dépêche. « Pourquoi tout le monde parle
  de… », « Ce chiffre va changer votre… », « Il a fallu 30 ans pour… ».
- **Neutre et factuel** : jamais de politique partisane ni d'avis, aucun parti ni candidat au centre, pas de drame avec
  des victimes (attentat, catastrophe, fait divers). Une personne réelle peut être nommée pour ce qu'elle a fait, sans
  moquerie ni caricature, et jamais en photo (images d'objets, de lieux, d'archives).
- Si aucun sujet de l'Actu ne convient, fais le carrousel actu sur une date du jour (anniversaire d'un événement,
  fête du calendrier) racontée par une autre BD de l'édition, ou n'en fais pas et dis-le.

## A3. Les diapositives (`slides`) : écrire une énigme, pas une explication

Culture (18:30) : 8 ou 9 diapositives de récit ; actu (12:15) : 6 à 8. La carte finale du Sachoir est ajoutée
automatiquement (10 images au plus).

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

**Expliquer vraiment (surtout le carrousel de 18:30).** Le suspense sert à faire glisser, mais à la fin le lecteur doit
avoir COMPRIS : le contexte, le mécanisme (le pourquoi, le comment), et ce qu'il en reste aujourd'hui. Test : après le
dernier glissement, il peut raconter l'histoire à quelqu'un en 30 secondes. Trame type en 8 à 9 diapositives :
1. l'énigme ; 2 et 3. la scène de départ (date, lieu, personnages, le problème) ; 4 à 6. l'enchaînement, une cause par
diapositive, avec un chiffre ou un détail concret à chaque fois ; 7. la révélation ; 8. la nuance ou la suite (« Tous
n'ont pas été envoyés à Limoges. Mais le mot, lui, est resté. ») ; 9. la boucle avec la couverture. Le carrousel actu
peut être plus court (6 ou 7).

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

- **`end`** (facultatif) : la petite phrase sous « L'actu et la culture G en BD, chaque matin » sur la carte finale
  (par défaut « Gratuit, en 2 minutes. »).
- **`caption`** : ligne 1 = la phrase de couverture (l'énigme, sans la réponse : la réponse se découvre en glissant).
  Puis, après une ligne vide, l'histoire racontée en entier en 4 à 8 paragraphes courts
  (personne ne doit se sentir piégé), une nuance si l'origine est discutée, puis UNE demande : en priorité « Envoyez-le
  à celui qui… », un jour sur trois « L'histoire en BD : lien en bio. » Puis « Sources : » et les sources en une ligne.
  Dernière ligne : « L'actu et la culture G en BD, chaque matin : lesachoir.fr ». 1 500 caractères au plus, aucun lien
  cliquable, au plus 2 émojis.
- **`hashtags`** : 3 à 5, en français, sans « # » : `lesachoir`, `culturegenerale`, plus 1 à 3 du sujet (`histoire`,
  `etymologie`, `expressionfrancaise`…). Jamais `viral`, `fyp`, `explore`.
- **`alt`** : 1 phrase qui décrit la couverture.
- **`time`** : `"12:15"` pour l'actu, `"18:30"` pour la culture. `"skip": true` retire le post (Greg peut le poser).
- **Version Reel (test de 2 semaines depuis le 17 novembre 2026)** : le carrousel culture est aussi publié
  automatiquement en Reel à 21 h (les mêmes images, chacune le temps de la lire, sur la musique suspense). Rien à
  écrire de plus. `"reel_copy": false` l'empêche pour un post, `"reel_time": "20:30"` change l'heure.

## A5. Le fichier

```json
{
  "date": "2026-11-18",
  "kind": "carousel",
  "version": 2,
  "tone": "archive",
  "time": "18:30",
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

Le carrousel actu suit le même modèle dans `social/instagram/<date>-actu/post.json`, avec `"time": "12:15"` et
`"story": {"edition": "<date>", "format": "actu"}`.

Avant de finir : relis chaque diapositive seule (elle doit donner envie de voir la suivante), vérifie que la couverture
ne donne pas la réponse et que chaque fait est sourcé. Valide le JSON (`python3 -m json.tool`), un seul commit pour les
deux fichiers « Instagram <date> : <sujet actu> / <sujet culture> », `git pull --rebase`, `git push origin main`. Le push déclenche le rendu ; ne touche à rien d'autre.

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
| `end` | Fin | Facultatif. Par défaut : « L'actu et la culture G en BD, chaque matin, sur lesachoir point f r. » |

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
  qui… » (adaptée au sujet) ; un jour sur trois « Toute l'histoire en BD : lien en bio. » Dernière ligne : « L'actu
  et la culture G en BD, chaque matin : lesachoir.fr ». 600 caractères au plus, au plus 2 émojis, aucun lien
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
  "caption": "Pourquoi le Beaujolais nouveau sort le 3e jeudi de novembre ?\n\n…\n\nEnvoie-le à celui qui en ouvre une ce soir.\n\nL'actu et la culture G en BD, chaque matin : lesachoir.fr",
  "hashtags": ["lesachoir", "culturegenerale", "beaujolaisnouveau"],
  "alt": "Du vin rouge versé dans un verre.",
  "sources": ["https://…", "https://…"]
}
```

Avant de finir : compte les mots dits (55 à 80), relis chaque phrase à voix haute, vérifie que l'accroche passe le test
« à qui on l'enverrait ? ». Valide le JSON (`python3 -m json.tool`), commit « Instagram <date> : <title> »,
`git pull --rebase`, `git push origin main`. Le push déclenche le rendu ; ne touche à rien d'autre.

# C. Les Reels « sitcom » : Max et le Prof (trois par jour, tâche « Le Sachoir – Reels sitcom »)

Décision de Greg (17 novembre 2026) : un Reel par jour en dessin animé façon sitcom de science-fiction, aux couleurs du
Sachoir, publié sur Instagram et TikTok. **Depuis le 19 novembre 2026 : trois par jour, à la place des carrousels**, un
par rubrique (tableau en tête de fichier). Tu n'écris que les `post.json` ; GitHub Actions fabrique les vidéos
(`pipeline/sitcom_render.py` : voix, dessin, musique, mixage) et les envoie à Buffer.

## C0. Les trois rendez-vous
Chaque Reel garde la même série (C1), la même méthode (C4, C5) et le même format (C6). Ce qui change : la rubrique,
l'heure, le tableau du labo (`board`) et la demande de la légende (C7).

| `slot` | rubrique | `time` | `board[0]` | la question type | l'esprit |
|---|---|---|---|---|---|
| `origine` | D'où ça vient ? | `07:45` | `D'OÙ ÇA VIENT ?` | « Pourquoi on dit… ? », « D'où vient le mot… ? » | l'expression qu'on va dire au bureau aujourd'hui ; le témoin d'époque, le glissement de sens |
| `cultureg` | La Pilule de Culture G | `12:30` | `PILULE CULTURE G` | « Pourquoi… ? », « Comment ça marche… ? », « C'est vrai que… ? » | le mécanisme du quotidien qu'on n'a jamais compris, l'idée reçue cassée, le chiffre fou |
| `insolite` | L'Insolite historique | `21:00` | `HISTOIRE VRAIE` | « C'est vrai qu'un jour… ? » | le fait historique ahurissant qu'on a envie de raconter au dîner : un personnage, une scène, une date |

Règles communes aux trois :
- **Trois sujets différents**, trois mondes (`set`) différents, et **trois formules d'accroche différentes** dans la journée
  (pour que l'analyse du dimanche sache lesquelles marchent).
- Une seule idée par Reel, la réponse avant la moitié, le test du copain (C5).
- Les faits viennent de la BD liée (déjà vérifiée) ; tout ajout : 2 sources sérieuses dans `sources`.

## C1. La série

**Style d'animation figé (décision de Greg, 18 novembre 2026)** : tous les Reels gardent exactement le style du Reel du
18 novembre 2026 (« L'empereur qui taxait le pipi », `social/instagram/2026-11-18-sitcom/post.json`, moteur tel qu'au
commit `3a37503` (ouverture à froid comprise)) : mêmes personnages et voix, même labo et tableau, même Machine à Savoir et portail
jaune, mêmes 16 mondes et 8 palettes du moteur, même écran flottant (case de la BD ou image Commons), mêmes sous-titres,
bandeau, musique et carte de fin. Concrètement : n'utilise que les champs, mondes (`set`), palettes et émotions listés
dans cette partie, avec la même structure que l'exemple C6 ; n'invente aucun champ ni décor ; ne demande aucun autre style.
Personne ne modifie `pipeline/sitcom/`, `pipeline/sitcom_render.py` ni `pipeline/sitcom_score.py` sans l'accord de Greg
(la tâche « Stratège » non plus : un changement de rendu va dans « Propositions pour Greg »).
Seul ajout validé par Greg depuis (18 novembre 2026, 21 h) : l'**ouverture à froid** (C4b), qui réutilise les mondes,
l'écran et le bandeau existants.

- **MAX** (sweat violet, casque vert autour du cou) : curieux, s'inquiète vite. Il pose LA question, la même que le
  spectateur. Il tutoie. Voix : Microsoft Fabrice.
- **LE PROF** (blouse verte, nœud papillon rouge, deux crayons derrière les oreilles) : pince-sans-rire, répond court,
  a un temps d'avance. Voix : Microsoft Rémy.
- **La Machine à Savoir** : une grosse ampoule dans le labo ; elle ouvre un portail jaune (le jaune Sachoir n'appartient
  qu'à elle) vers un ou deux « mondes » où se trouve la réponse. Retour au labo pour la chute.
- **Le Bidule** : une petite créature de couleur qui ne parle pas. Elle peut apparaître dans un monde (`"bidule": true`).
- Mécanique de l'humour : un tout petit problème réglé avec des moyens énormes ; le contraste entre la panique de Max et
  le calme du Prof ; une chute après un silence ; la dernière réplique fait écho à la première (le Reel boucle).

## C2. Avant d'écrire
1. Lis `social/instagram/ig-skills/README.md`, puis les skills `skills/ig-reel/SKILL.md` (et `hooks.json`),
   `skills/ig-human/SKILL.md` et `skills/ig-caption/SKILL.md`, et `social/instagram/voice.md` et `social/instagram/swipe.md`.
2. Regarde quels Reels du jour existent déjà : `social/instagram/<date>-sitcom-origine/`, `-cultureg/`, `-insolite/`.
   N'écris que ceux qui manquent (un `post.json` avec `"skip": true` est un essai : remplace-le). N'écris pas un Reel
   dont l'heure de publication est déjà passée ou à moins de 45 minutes (il partirait trop tard et trop près du
   suivant) : dis-le simplement.
3. Lis les `post.json` des 30 derniers Reels (`social/instagram/*-sitcom*/post.json`) : jamais deux fois le même sujet
   (ni la même BD, ni le même fait), jamais deux fois de suite le même monde (`set`) dans un même créneau.
4. Lis `social/instagram/strategie.md` (partie 0) et, s'il existe, `social/instagram/stats.md` (bilan des vues et
   partages) : garde les formules qui marchent, abandonne celle qui fait le moins.

## C3. Les sujets (un par créneau)
Pour chaque créneau, prends la BD la plus « envoyable » parmi ses candidates, dans cet ordre (note la grille de la partie
A2 sur 12 ; en dessous de 9, passe à la candidate suivante) :
- `origine` (07:45) : 1) la BD `origine` de l'édition du jour ; 2) une BD `origine` publiée ces 30 derniers jours et jamais
  mise en Reel ; 3) la BD `notice` du jour si elle raconte l'origine d'un objet ou d'un mot (« D'où vient le
  code-barres ? ») ; 4) sinon une expression que **tout le monde a déjà dite** (règles de `prompts/STOCK.md`, section
  D'où ça vient ? : jamais d'expression rare ou littéraire), origine vérifiée dans deux sources sérieuses (CNRTL, Littré,
  Rey, Larousse), images Wikimedia Commons, `story` d'une BD proche ou omis. Ce Reel peut sortir **avant** l'édition du
  jour : si elle n'est pas encore publiée, prends directement 2), 3) de la veille ou 4).
- `cultureg` (12:30) : 1) la BD `cultureg` du jour ; 2) la BD `notice` du jour (« comment ça marche ») ; 3) une BD
  `cultureg` ou `notice` des 30 derniers jours jamais mise en Reel.
- `insolite` (21:00) : 1) la BD `insolite` du jour ; 2) un fait ahurissant du Grand Dossier du jour (`dossier`, dans ses
  4 premières cases, gratuites) ; 3) une BD `insolite` des 30 derniers jours jamais mise en Reel.
- `cultureg` et `insolite` attendent l'édition du jour ; si elle n'est pas publiée, n'écris que `origine`.
- L'Actu n'est jamais un sujet de Reel.
- Le test : « à qui on l'enverrait ? ». Si la réponse est « à personne », change de sujet.

## C4. La question, la réponse, puis l'accroche (méthode `ig-reel`)
Retour de Greg (18 novembre 2026) : l'animation est top, mais **le texte était trop raccourci, on ne comprenait plus**.
Le Reel doit **répondre vraiment à sa question de départ et vulgariser la réponse**. Comprendre d'abord, rire ensuite :
un Reel compris est regardé jusqu'au bout et partagé, un Reel flou est zappé (le skill `ig-reel` le dit aussi : une
accroche promet quelque chose, la vidéo doit le livrer).

Avant toute réplique, écris dans le `post.json` :
1. `question` : la question de départ, comme la poserait quelqu'un au café (« Pourquoi on dit que l'argent n'a pas
   d'odeur ? »).
2. `answer` : la réponse complète en 1 ou 2 phrases, compréhensible par un enfant de 12 ans, **avec le pourquoi**.
3. `chain` : la chaîne d'explication, 3 à 5 maillons « cause → conséquence », sans trou (voir l'exemple en C6).
   **Chaque maillon sera dit à voix haute, en entier.** Si un maillon manque, le spectateur décroche.

Puis l'accroche :
- Écris **3 accroches de 3 formules différentes** de `hooks.json` (pas 3 variantes d'une même phrase), en français
  parlé, 6 à 14 mots. Celles qui marchent le mieux pour nous :
  - **#22 l'idée reçue retournée** : « Non, le chewing-gum avalé ne reste pas sept ans dans ton ventre. »
  - **#16 la question telle qu'on la pose** : « Prof… pourquoi on dit que l'argent n'a pas d'odeur ? »
  - **#3 « personne ne te dit que… »** : « Personne ne te dit que les urinoirs de Paris portent le nom d'un empereur. »
  - **#23 le chiffre qu'on répète au dîner** : « Huit araignées avalées par an pendant ton sommeil ? Faux. »
  - **#2 l'interdit** : « Ne dis jamais à un Romain que l'argent n'a pas d'odeur. »
  - **#21 en pleine scène** : « … et c'est là que l'empereur lui a fait sentir la pièce. » (la mise en place doit
    arriver avant 8 s)
- Note-les avec `python3 social/instagram/ig-skills/skills/ig-reel/hookscore.py --hook "<accroche>"` (indicatif : réglé
  sur l'anglais) et garde la meilleure à ton jugement : **concrète, une vraie tension, une promesse que le Reel tient**.
  Une accroche qui pourrait servir à n'importe quel compte de culture G n'est pas la bonne : mets-y le détail du sujet
  (le pipi, l'empereur, l'avocat des rats).
- L'accroche devient **la réplique de l'ouverture à froid** (C4b) et, raccourcie en 2 lignes de 18 caractères au plus,
  le bandeau jaune `band` (affiché dès la première image ; c'est aussi la couverture). Le bandeau n'est pas la phrase
  dite : il est plus court et plus brutal (6 mots au plus).
- Jamais de définition, de date, d'intro ni de « Le saviez-vous ? ». Indique la formule retenue dans `hook_formula`.

## C4b. L'ouverture à froid : les 2 premières secondes (obligatoire)
Retour de Greg (18 novembre 2026, 21 h) : **la plupart des gens scrollent la vidéo instantanément.** Un Reel qui s'ouvre
sur le labo et « Prof… c'est vrai que… » ressemble à celui de la veille : le pouce part. Chaque Reel s'ouvre donc
**directement dans le monde du sujet, sur ce qu'il a de plus fou**, comme le pré-générique d'une série. On explique ensuite.

Comment c'est fait : la scène 0 est un `world` avec `"cold": true` (pas de portail, pas d'arrivée : l'image 1 est déjà
l'image du sujet sur l'écran flottant, avec le bandeau jaune et un « boing »). Le moteur fait un zoom rapide sur l'écran,
puis coupe sur Max et le Prof vers 1,5 s, puis un portail ramène au labo (scène 1 `home`).
- **Une seule réplique** (deux au plus), **10 mots au plus, dite en moins de 3 s**, avec `"shake": true` et
  `"react": {"max": "shock"}` (ou l'inverse : Max qui découvre, le Prof impassible). Le **premier mot porte déjà le choc** :
  jamais « Prof… », « Alors », « Tu savais que », « Aujourd'hui », « Le saviez-vous ».
- **L'image** (`image`) : la plus forte du sujet (la case de la BD la plus spectaculaire ou drôle, ou une archive
  Commons saisissante). `big` : le mot ou le nombre choc (14 caractères au plus : « TAXE PIPI », « 33 ANS », « INTERDIT »).
- **Ce qui arrête le pouce** (choisis-en un, le plus fort pour ce sujet) :
  1. l'absurde vrai, dit platement : « En l'an 70, un empereur a taxé le pipi. » ;
  2. le nombre impossible : « Ce procès contre des rats a duré cinq ans. » ;
  3. l'évidence contredite : « Les Gaulois ne portaient pas de casque à ailes. » ;
  4. l'interdit, le danger : « Pendant 200 ans, ce mot pouvait t'envoyer en prison. » ;
  5. en pleine scène, au pire moment : « … et là, l'empereur lui met la pièce sous le nez. » ;
  6. le lien inattendu avec ton quotidien : « Ta poubelle porte le nom d'un préfet. »
- **Le bandeau** (`band`) n'est pas la réponse : c'est la question que la réplique fait naître (« UNE TAXE / SUR LE PIPI ?! »),
  6 mots au plus, en capitales, lisible en une demi-seconde. C'est aussi la couverture.
- **Ne grille pas la réponse** : l'ouverture montre le « quoi » le plus fou, jamais le « pourquoi » (le Reel est là pour
  ça). Il faut qu'on se dise « attends, quoi ?! ».
- Puis scène 1 `home` : Max dit exactement ce que pense le spectateur (« Attends… une taxe sur le pipi ?! Pourquoi ? ») ;
  le Prof donne l'enjeu ; le portail s'ouvre ; la suite comme en C5.

Choisir l'ouverture : écris **5 ouvertures** de 5 types différents ci-dessus, note-les avec `hookscore.py` (indicatif) et
le **test du pouce** : « Sur un écran qui défile, avec le son coupé, l'image + le bandeau me font-ils arrêter de scroller ?
Et avec le son, la première phrase me donne-t-elle besoin de la suite ? ». Garde la plus forte ; mets son numéro de
formule `hooks.json` dans `hook_formula` (#21 en pleine scène, #22 idée reçue retournée, #23 chiffre, #2 interdit…).
Tant qu'aucune ne te fait dire « waouh », change d'angle ou de sujet.

## C5. Le script : 40 à 55 s, 12 à 16 répliques, 100 à 150 mots
**Le test du copain** (obligatoire) : quelqu'un qui ne connaît rien au sujet regarde le Reel une seule fois, sans lire la
légende. Peut-il réexpliquer la réponse en deux phrases, avec le pourquoi, au dîner du soir ? Si non, réécris.
Mieux vaut un Reel de 50 s compris qu'un Reel de 30 s que personne ne suit : **on coupe un gag, jamais un maillon.**

Le déroulé (calé sur `ig-reel` : accroche, enjeu, corps, réponse, boucle) :
- Scène 0 `world` avec `"cold": true` (1 réplique, 0 à 3 s) : l'ouverture à froid (C4b).
- Scène 1 `home` (2 ou 3 répliques, jusqu'à 9 s environ) : Max réagit et pose la question (celle du spectateur). Le Prof donne **l'enjeu** en une phrase
  qui intrigue sans tout dire (« Oui. Et c'est à cause de lui qu'on dit “l'argent n'a pas d'odeur”. »). Max relance avec
  la question que se pose le spectateur (« Attends… quel rapport ? »). Le Prof ouvre ensuite le portail tout seul
  (automatique, pas de réplique à écrire).
- Scène 2 `world` (3 à 5 répliques) : les premiers maillons de `chain`. Le Prof explique, Max pose le « pourquoi ? »
  dès qu'un trou apparaît. **La réponse à la question de départ arrive avant la moitié du Reel**, ou au plus tard au
  début de la scène 3.
- Scène 3 `world` facultative (2 à 4 répliques) : le dernier maillon, le détail qui surprend, ou la mise en scène du fait
  (Max qui joue un rôle, la fausse piste prise au pied de la lettre).
- Scène 4 `home` (2 ou 3 répliques) : Max pose la question de la fin ; le Prof donne la chute après un silence
  (`"pause": 0.8`), un fait vrai et surprenant ; Max conclut d'une réplique courte qui fait écho à l'accroche (le
  Reel boucle).

Écrire pour qu'on comprenne :
- **Max est le spectateur.** Chaque fois qu'une explication laisse un « mais pourquoi ? » ou un « c'est qui ? », c'est
  Max qui le dit. C'est à la fois la vulgarisation et le rythme. Une réaction de Max qui n'apporte ni question ni rire
  (« Moi ?! » sans suite) est supprimée.
- **Le Prof est pince-sans-rire dans le ton, pas dans le contenu.** Ses répliques d'explication sont des phrases
  complètes (sujet, verbe, complément), 8 à 20 mots, deux phrases courtes au plus. Ses répliques très courtes
  (« Pire. », « Voilà. ») sont réservées aux réactions et à la chute.
- **Interdit, le style télégraphique** : phrase sans verbe qui porte une information, pronom dont on ne sait pas qui il
  désigne, cause sous-entendue. À ne plus faire (Reel du 18 novembre) : « Son fils râle. » (contre quoi ?) ;
  « Et ils l'achètent ?! » (qui, et pourquoi ?) ; « Oui. Donc Vespasien la taxe. » (qui est Vespasien ?).
- **Chaque nom a son rôle** à la première mention (« l'empereur Vespasien », « son fils Titus », « les blanchisseurs,
  ceux qui lavent les vêtements »). **Chaque mot rare est traduit** dans la même réplique (« l'ammoniaque, ça détache »).
- **Du concret et des comparaisons du quotidien** (« comme notre eau de Javel »), des nombres plutôt que des adjectifs.
- **Une seule idée par Reel.** Si deux sujets se battent, garde le meilleur.
- L'humour vient des faits (le contraste, Max qui prend tout au pied de la lettre, l'énorme pour le minuscule) ; il ne
  remplace jamais une explication. Un gag pur au plus par scène.
- Du français oral naturel, tutoiement ; ponctuation pour l'intonation (« ? », « … »). Écris les nombres en lettres dans
  `say` si la voix risque de mal les lire (`text` garde les chiffres pour les sous-titres). Les longues répliques
  s'affichent en sous-titres deux lignes par deux lignes, au rythme de la voix.

Relecture avant d'écrire le fichier (dans cet ordre) :
1. Lis **seulement les répliques**, à voix haute, sans les images : chaque phrase se comprend-elle seule ?
2. Coche chaque maillon de `chain` : est-il dit en entier ? La réponse (`answer`) est-elle dite avant la moitié ?
3. Passe le texte parlé dans `python3 social/instagram/ig-skills/skills/ig-human/detect.py <fichier>` (tournures d'IA,
   triades, « ce n'est pas X, c'est Y ») et réécris à la main ce qui est signalé.
4. Compte les mots : 100 à 150. Au-delà, coupe d'abord les gags et les réactions vides, jamais un maillon.

Le reste :
- Mondes (`set`) : `paris-ancien`, `ville`, `ciel`, `espace`, `mer`, `nature`, `antiquite`, `moyen-age`, `desert`, `neige`,
  `cuisine`, `usine`, `corps`, `bureau`, `musee`, `futur`. Palette facultative (`palette`) : `violet`, `marine`, `vert`,
  `rouge`, `orange`, `beige`, `nuit`, `menthe` ; deux mondes successifs de palettes très différentes.
- Dans chaque monde, l'écran flottant montre le sujet : `image` = `{"bd": <n° de case de la BD liée>}` (de préférence) ou
  `{"commons": "<mots-clés anglais>"}` (Wikimedia Commons, domaine public) ; sans image, il affiche `big` (14 caractères
  au plus : un mot, un nombre, un lieu) et `small` (20 caractères au plus). Avec une image, `big` s'affiche sur une
  plaque dessous. `big` et `small` servent la compréhension : le mot clé de l'explication (« AMMONIAQUE »,
  « ça détache »). `tag` (22 caractères au plus, en capitales) s'écrit en haut comme un terminal.
- Émotions (`emo`) — Max : `curious`, `panic`, `shock`, `happy`, `proud`, `bored`, `think`, `wow` ; le Prof : `deadpan`,
  `smug`, `tired`, `alarmed`, `explain`, `happy`. `"shake": true` sur une réplique de choc (secousse et gros plan).
  `react` facultatif : `{"max": "shock"}` pour la réaction de l'autre pendant la réplique.
- Interdits : politique partisane, personne réelle vivante nommée, moquerie blessante, marques, personnages ou répliques
  d'une série existante.

## C6. Le fichier
Un fichier par créneau : `social/instagram/<date>-sitcom-<slot>/post.json`, avec `"slot"` et `"time"` du tableau C0,
`board[0]` du tableau C0, et `first_comment` (C7). Exemple complet pour le créneau `insolite` (avec son ouverture à froid) (le Reel du 18 novembre 2026 réécrit selon C4 et C5 : 14 répliques, environ 145 mots) :
```json
{
  "date": "<AAAA-MM-JJ>",
  "kind": "sitcom",
  "slot": "insolite",
  "time": "21:00",
  "story": {
    "edition": "<AAAA-MM-JJ>",
    "format": "<id>"
  },
  "question": "Pourquoi on dit que l'argent n'a pas d'odeur ?",
  "answer": "Les Romains lavaient leurs toges avec de l'urine, qui détache ; l'empereur Vespasien a taxé ce commerce et, quand son fils s'en est plaint, lui a fait sentir une pièce de la taxe : elle ne sentait rien.",
  "chain": [
    "l'urine vieillie donne de l'ammoniaque, qui détache",
    "les blanchisseurs achètent l'urine pour laver les toges",
    "Vespasien taxe ce commerce",
    "Titus trouve ça dégoûtant ; la pièce de la taxe ne sent rien",
    "d'où « l'argent n'a pas d'odeur » ; à Paris, les urinoirs s'appellent des vespasiennes"
  ],
  "hook_formula": 16,
  "episode": {
    "band": "UNE TAXE\nSUR LE PIPI ?!",
    "board": [
      "HISTOIRE VRAIE",
      "le pipi taxé ?"
    ],
    "scenes": [
      {
        "kind": "world",
        "cold": true,
        "set": "antiquite",
        "palette": "nuit",
        "tag": "ROME, AN 70",
        "big": "TAXE PIPI",
        "image": {
          "bd": 1
        },
        "lines": [
          {
            "who": "prof",
            "emo": "deadpan",
            "shake": true,
            "react": {
              "max": "shock"
            },
            "text": "En l'an 70, un empereur romain a taxé… le pipi."
          }
        ]
      },
      {
        "kind": "home",
        "lines": [
          {
            "who": "max",
            "emo": "shock",
            "text": "Attends… une taxe sur le pipi ?! Mais pourquoi ?"
          },
          {
            "who": "prof",
            "emo": "deadpan",
            "text": "Parce que le pipi rapportait de l'argent. Et c'est de là qu'on dit « l'argent n'a pas d'odeur »."
          },
          {
            "who": "max",
            "emo": "think",
            "text": "Du pipi qui rapporte de l'argent ? Explique."
          }
        ]
      },
      {
        "kind": "world",
        "set": "antiquite",
        "palette": "beige",
        "tag": "ROME, VERS L'AN 70",
        "big": "AMMONIAQUE",
        "small": "ça détache",
        "image": {
          "bd": 3
        },
        "bidule": true,
        "lines": [
          {
            "who": "prof",
            "emo": "explain",
            "text": "À Rome, les blanchisseurs lavent les toges avec de l'urine."
          },
          {
            "who": "max",
            "emo": "panic",
            "text": "Pourquoi du pipi ?!"
          },
          {
            "who": "prof",
            "emo": "explain",
            "text": "En vieillissant, l'urine donne de l'ammoniaque. Et l'ammoniaque, ça détache très bien."
          },
          {
            "who": "prof",
            "emo": "smug",
            "react": {
              "max": "shock"
            },
            "text": "Ils achètent donc l'urine des toilettes publiques. Et l'empereur Vespasien taxe ce commerce."
          }
        ]
      },
      {
        "kind": "world",
        "set": "antiquite",
        "palette": "nuit",
        "tag": "SELON SUÉTONE",
        "big": "ÇA SENT ?",
        "small": "une pièce de la taxe",
        "image": {
          "bd": 7
        },
        "lines": [
          {
            "who": "prof",
            "emo": "explain",
            "text": "Son fils Titus trouve ça dégoûtant. Vespasien lui met sous le nez une pièce de la taxe."
          },
          {
            "who": "prof",
            "emo": "deadpan",
            "text": "Et il demande : « Elle sent mauvais ? »"
          },
          {
            "who": "max",
            "emo": "think",
            "text": "Euh… non ?"
          },
          {
            "who": "prof",
            "emo": "smug",
            "text": "Voilà. Elle vient du pipi et elle ne sent rien. L'argent n'a pas d'odeur."
          }
        ]
      },
      {
        "kind": "home",
        "lines": [
          {
            "who": "max",
            "emo": "curious",
            "text": "Et aujourd'hui, il reste quoi de lui ?"
          },
          {
            "who": "prof",
            "emo": "smug",
            "pause": 0.8,
            "text": "À Paris, les urinoirs de rue s'appellent des vespasiennes."
          },
          {
            "who": "max",
            "emo": "proud",
            "text": "Il a taxé le pipi… et le pipi porte son nom."
          }
        ]
      }
    ],
    "end": {
      "url": "lesachoir.fr",
      "lines": [
        "L'actu et la culture G",
        "en BD, chaque matin."
      ]
    }
  },
  "caption": "<1re ligne : l'accroche ou la question>\n\n<2 lignes de réponse>\n\n<la demande du créneau (C7)>",
  "first_comment": "<un bonus vrai et sourcé + une vraie question (C7)>",
  "hashtags": [
    "lesachoir",
    "culturegenerale",
    "..."
  ],
  "sources": [
    "<url>"
  ]
}
```
Légende (méthode `ig-caption`) : voir C7. Valide avec `python3 -m json.tool`.

## C7. Faire réagir : partages, commentaires, enregistrements (méthodes `ig-reel`, `ig-caption`, `ig-reply`)
Ce qui fait voyager un Reel, dans l'ordre (déclarations d'Adam Mosseri, voir le doc `reel-v2`) : le temps de visionnage
et la complétion, puis les **envois en message privé**, puis les commentaires et j'aime. Donc :

Dans la vidéo (sans jamais d'appel à l'action) :
- **Un crochet à commentaire** par Reel, tiré du sujet : une idée reçue cassée (« moi on m'avait dit que… »), un détail
  qui fait dire « attends, quoi ? », une variante que les gens connaissent (« et en Belgique ? »), un chiffre qu'on a envie
  de vérifier. Il est vrai et sourcé ; c'est souvent la chute.
- La dernière réplique de Max fait écho à l'accroche (boucle) : un Reel revu compte double.

Dans la légende (`caption`, méthode `ig-caption`) :
- Ligne 1 : l'accroche ou la question (c'est ce qu'on lit avant « … plus ») ; puis 2 lignes de réponse ; puis
  **une seule demande**, celle du créneau :
  - `origine` : une vraie question ouverte qui appelle des commentaires : « Quelle expression on décortique demain ? Écris-la en
    commentaire. » (ou une variante tirée du sujet : « Et chez toi, on dit comment ? ») ;
  - `cultureg` : une question sur l'expérience du spectateur, précise et liée au sujet (« Toi, tu croyais que ça marchait
    comment ? ») ;
  - `insolite` : l'envoi, le levier du buzz : « Envoie-le à celui qui… » (le pote qui adore l'histoire, le collègue qui
    râle contre les impôts…).
- **Interdit, l'appât à réactions** (Instagram et TikTok le pénalisent) : « Tape 1 si… », « Commente OUI », « Like si… »,
  « Tague 3 amis », concours.
- 4 à 6 hashtags : `lesachoir`, `culturegenerale`, le hashtag de la rubrique (`expressionsfrancaises`, `histoire`, `anecdote`…),
  1 ou 2 hashtags du sujet. Pas de lien (il ne marche pas en légende) : « lien en bio » seulement si la place le permet.
- Ton de `social/instagram/voice.md` ; passe la légende dans `ig-human/detect.py`.

Le premier commentaire (`first_comment`, publié par le compte au moment du post si Buffer le permet) : 1 ou 2 phrases,
**un bonus vrai et sourcé qui n'est pas dans le Reel** + une vraie question qui donne envie de répondre (« Bonus : les
vespasiennes ont presque toutes disparu, il en reste une seule à Paris, boulevard Arago. Tu en avais déjà vu une ? »).
Jamais de lien, jamais d'emoji en premier caractère.

Répondre aux commentaires dans la première heure fait beaucoup pour la portée, mais **aucune tâche ne commente ni ne
répond automatiquement** (interdit par Instagram, et par les skills `ig-comment` et `ig-reply`). Greg répond lui-même ;
la question la plus aimée en commentaire peut devenir le sujet d'un Reel (méthode `ig-reply`).
