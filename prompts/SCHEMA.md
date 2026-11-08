# Format d'une édition : `editions/AAAA-MM-JJ/edition.json`

Une édition par jour : l'Actu de la nuit et le jeu du jour y sont écrits directement. Les Culture G, Insolites et Grands Dossiers sont écrits dans la **file d'attente** `stock/<type>/<AAAAMMJJ-HHMM>-<mot-cle>/item.json` (`{"added": …, "formats": [une seule BD]}`, même format que ci-dessous) ; la publication du matin les place dans l'édition une fois finis à 100 % (voir `prompts/STOCK.md`).
Le pipeline d'images ne touche qu'aux champs `status`, `attempts`, `file`, `redo`. Tout le reste est écrit par Claude. `"redo": true` sur une image faite = le contrôle qualité en veut une nouvelle version ; l'ancienne reste publiée en attendant.

```json
{
  "date": "2026-11-07",
  "status": "draft",                 // "draft" → "published" (posé par pipeline/publish.py à 5 h)
  "formats": [
    {
      "id": "cultureg",              // "actu" | "cultureg" | "insolite" | "dossier" — un seul de chaque
      "label": "La Pilule de Culture G",
      "title": "Le Chat de Schrödinger expliqué à mon chat",
      "tagline": "Un chat à la fois mort, vivant et probablement en train de juger votre vie",
      "minutes": 2,
      "theme": "Sciences physiques",  // OBLIGATOIRE pour cultureg, insolite et dossier : une des 32 thématiques, écrite exactement comme dans prompts/STOCK.md ; vide pour actu
      "cast": [
        { "id": "schro", "look": "Erwin, a 1930s physicist, slick dark hair, round glasses, grey three-piece suit, dark red tie",
          "file": "cast/cultureg-schro.png", "status": "pending" }
      ],
      "cover": { "prompt": "<scène de couverture, en anglais>", "cast": ["schro","cat"],
                 "file": "images/cultureg-cover.webp", "status": "pending", "attempts": 0 },
      "cases": [
        {
          "n": 1,
          "kind": "chap",            // "" | "fact" | "react" | "chap" | "conf" (face caméra)
          "tag": "1935",             // étiquette du récitatif (facultatif)
          "caption": "Erwin Schrödinger veut montrer qu’une idée de la physique quantique est absurde.",
          "bubbles": [
            { "text": "Il me faut un exemple qui parle à tout le monde.", "side": "l" },
            { "text": "Évitez les chats.", "side": "r" }
          ],
          "image": {
            "prompt": "<description de la scène en anglais : décor, qui est où (left/right), expressions, gestes, accessoires>",
            "cast": ["schro","cat"],  // ids de la fiche casting présents dans la case (3 max)
            "file": "images/cultureg-01.webp",
            "status": "pending",       // "pending" | "retry" | "done" | "failed"
            "attempts": 0
          }
        }
      ],
      "final": { "text": "Phrase « Pour briller en société », 25 mots max, exacte.", "source": "Source principale" },
      "story": "L’histoire complète : 150 à 250 mots, 2 à 4 paragraphes séparés par \n (voir plus bas).",
      "sources": [ { "title": "…", "url": "https://…" } ]
    }
  ]
}
```

## « Pour mieux comprendre » : case de texte sans image (`"kind": "explain"`)
Une case de texte glissée dans la BD, entre deux cases dessinées, là où le lecteur risque de décrocher (un mécanisme, une notion, un ordre de grandeur). Elle ne coûte aucune image.

```json
{
  "n": 4,
  "kind": "explain",
  "tag": "Pour mieux comprendre",          // facultatif : « Pour mieux comprendre » par défaut ; ou « En clair », « Le mécanisme »…
  "title": "Comment l’info passait de Paris à Bordeaux",   // 10 mots max, clair
  "text": "Une ou deux phrases qui posent le principe.",   // facultatif si steps ; \n pour un nouveau paragraphe
  "steps": ["Paris : un complice note la tendance de la Bourse", "Il l’envoie par colis à Tours", "…"],  // facultatif : une chaîne d’étapes, 3 à 5, affichée avec des flèches
  "joke": "Une petite phrase drôle pour finir (facultatif)."
}
```
- **Pas d’image** (pas de champ `image`), pas de bulles. 70 mots au plus en tout (`text` + `steps` + `joke`).
- Combien : 1 ou 2 par Culture G ou Insolite, 2 à 4 par Grand Dossier, jamais en case 1 ni deux de suite. **Actu : une après chaque case dessinée**, avec `"tag": "Ce qui se passe vraiment"` et `text` en trois lignes « Quoi : … \n Pourquoi ça compte : … \n Et maintenant : … » (50 mots max, sans `joke`) ; un libellé court suivi de « : » en début de ligne est affiché en gras. Dans un Grand Dossier, au moins une avant la case 5 si elle aide (les cases 1 à 4 sont la partie gratuite).
- La numérotation `n` suit l’ordre de lecture (les cases dessinées et les cases texte se suivent : 1, 2, 3…).
- Même ton que le Sachoir : simple, concret, une touche d’humour, mais la clarté d’abord.

## « L’histoire complète » (champ `story` du format)
Un texte continu, affiché replié après la carte « Pour briller » et en clair sur la page publique de l’histoire (référencement).
- 150 à 250 mots, 2 à 4 paragraphes séparés par `\n`. Pour Culture G, Insolite et Grand Dossier (pas pour l’Actu ni le jeu).
- Il raconte tout dans l’ordre, avec les « parce que » et les « donc » : le contexte, le mécanisme maillon par maillon, la suite et pourquoi ça compte aujourd’hui. Quelqu’un qui n’a pas lu la BD doit tout comprendre.
- Uniquement des faits vérifiés et présents dans `sources` (ajouter la source si un fait nouveau est utilisé). Une touche d’humour possible, jamais au détriment de l’exactitude.

## Le jeu du jour (`"id": "quiz"`, sans image)
Le jeu de fin d'édition. **Huit jeux qui tournent d'un jour à l'autre**, dans cet ordre (champ `kind`) :
`culture` → `geo` → `frise` → `dico` → `plusmoins` → `swipe` → `chiffre` → `citation` → puis on recommence.
Règle : prendre le jeu **suivant** celui de la veille dans cette liste (un jeu sans `kind` compte comme `culture`) ; s'il n'y a pas de jeu la veille, faire un Quiz géo.
Le `title` est drôle et différent chaque jour ; le `label` est le nom du jeu (« Le Quiz géo », « La Frise »…).
Le lecteur ne joue qu'une fois par jour : ses réponses sont enregistrées aussitôt, il peut ensuite seulement les revoir.

### Quiz culture G (`"kind": "culture"`)
5 questions de culture générale **indépendantes des BD du jour**, 1 à 2 minutes. Aucune image, aucun casting.

```json
{
  "id": "quiz",
  "kind": "culture",
  "label": "Le Quiz du jour",
  "title": "Cinq questions, zéro pression (ou presque)",   // titre drôle, différent chaque jour
  "minutes": 1,
  "theme": "",
  "questions": [
    {
      "theme": "Grandes découvertes",                       // une des 32 thématiques
      "q": "Le Post-it est né d’un « échec ». Lequel ?",     // 20 mots max
      "choices": ["…", "…", "Une colle trop faible pour coller vraiment", "…"],  // 3 ou 4 réponses, 10 mots max chacune
      "answer": 2,                                          // index de la bonne réponse (0 = la première)
      "explain": "En 1968, Spencer Silver… Un échec très réussi.",  // 40 mots max : le fait + une touche d'humour
      "source": { "title": "Wikipédia — Post-it", "url": "https://fr.wikipedia.org/wiki/Post-it" }
    }
  ],
  "sources": [ /* les sources des 5 questions */ ]
}
```

Règles du quiz :
- 5 questions, 5 thématiques différentes (idéalement 4 ou 5 pôles différents), environ 3 sur 4 liées à la France.
- Difficulté : 2 faciles, 2 moyennes, 1 difficile. Ordre libre.
- Une seule bonne réponse, sans ambiguïté et sourcée. Les mauvaises réponses sont **drôles mais plausibles** (au moins une vraiment tentante par question).
- Varier la position de la bonne réponse d'une question à l'autre.
- L'explication apprend quelque chose de plus que la réponse, avec une touche d'humour ; si un fait est discuté, le dire (« l'explication la plus courante… »).
- Aucun fait déjà utilisé dans `editions/` (BD ou quiz) ; pas de personne vivante sauf fait public sourcé ; rien sur les drames.

### Quiz géo (`"kind": "geo"`)
3 questions, environ 1 minute, cartes dessinées par l'appli (aucune image à générer).

```json
{
  "id": "quiz",
  "kind": "geo",
  "label": "Le Quiz géo",
  "title": "Trois questions, zéro boussole",        // titre drôle, différent chaque jour
  "minutes": 1,
  "theme": "",
  "questions": [
    { "type": "map", "map": "france",                 // "france" | "europe" | "world"
      "q": "Où se trouve Carcassonne ?",
      "target": { "lat": 43.213, "lon": 2.349 },      // une ville : coordonnées vérifiées
      "name": "Carcassonne",
      "explain": "…", "source": { "title": "…", "url": "https://…" } },
    { "type": "choice", "q": "Quelle est la capitale de l’Australie ?",
      "choices": ["Sydney", "Melbourne", "Canberra", "Perth"], "answer": 2, "explain": "…", "source": { … } },
    { "type": "silhouette", "shape": { "map": "world", "id": "ITA" }, "rotate": 90,
      "q": "Quel pays se cache derrière cette silhouette ?", "choices": ["…", "…", "…", "…"], "answer": 1, "explain": "…", "source": { … } }
  ],
  "sources": [ /* les sources des 3 questions */ ]
}
```

Les 3 questions :
1. **Où c'est ?** (`"type": "map"`) : une ville, un département ou un pays à placer sur la carte. Cible au choix :
   - ville ou lieu : `"target": { "lat": …, "lon": … }` (coordonnées vérifiées, 3 décimales) ;
   - département : `"target": { "dept": "29" }` (code officiel, `2A`/`2B` pour la Corse), carte `france` ;
   - pays : `"target": { "country": "PER" }` (code ISO 3166 alpha-3), carte `europe` pour un pays d'Europe, sinon `world`.
   `name` = le nom affiché dans la correction (« le Finistère », « Carcassonne »). Points : dans la forme ou à moins de 35 km (France), 150 km (Europe), 400 km (monde) = juste ; jusqu'à 120 / 450 / 1 200 km = presque.
2. **Capitales** (`"type": "choice"`) : un pays → sa capitale, ou une capitale → son pays, en alternant ; parfois un département → sa préfecture. 4 choix, des pièges crédibles (Sydney, Istanbul, Rio, Zurich).
3. **Le joker**, qui tourne d'un Quiz géo à l'autre (ne pas reprendre le joker du Quiz géo précédent) :
   - **Silhouette** (`"type": "silhouette"`) : un pays (`"map": "world"`, code alpha-3) ou un département (`"map": "france"`, code) en ombre noire ; `rotate` 0, 90, 180 ou 270 pour corser ; le dire dans la question si c'est tourné. Choisir une forme reconnaissable (pas un petit pays carré).
   - **Vrai village ou canular ?** (`"type": "choice"`) : quatre noms de communes françaises dont **un seul inventé** (ou l'inverse : un seul vrai). Vérifier chaque vrai nom dans le Code officiel géographique de l'Insee. Les noms inventés restent crédibles et sans vulgarité.
   - **Le fromage (ou le plat) perdu** (`"type": "map"`, carte `france`) : placer l'origine d'un fromage AOP, d'une spécialité ou d'un vin ; cible = la commune ou le département d'origine.
   - **Du nord au sud** (`"type": "order"`) : 4 villes à classer du nord au sud (`"by": "nord-sud"`) ou d'ouest en est (`"by": "ouest-est"`), choisies pour piéger (Rome, New York, Madrid, Pékin). `"items": [{ "name": "Rome", "lat": 41.903, "lon": 12.496 }, …]`, coordonnées vérifiées ; l'appli calcule le bon ordre. Écarts d'au moins 0,1° entre villes.
   - **Le numéro** (`"type": "choice"`) : « 13 ? » → Bouches-du-Rhône, ou l'inverse.

Règles du Quiz géo : environ 2 questions sur 3 liées à la France ; une seule bonne réponse, sourcée ; explication drôle de 40 mots maximum qui apprend un fait de plus ; ne pas reprendre un lieu déjà utilisé dans un Quiz géo des 60 derniers jours.

### Les autres jeux
Règles communes : faits vérifiés par recherche web et sourcés (`source` dans chaque question, liste `sources` du format) ; environ 3 sur 4 liés à la France ; explications de 40 mots maximum, drôles, qui apprennent quelque chose ; aucun fait déjà utilisé dans `editions/` ; rien sur les drames ; personne vivante seulement pour un fait public sourcé.

**La Frise** (`"kind": "frise"`, 3 questions `"type": "order"`, `"by": "chrono"`) : 4 événements à remettre du plus ancien au plus récent. Chaque item : `{ "name": "Règne de Cléopâtre", "year": -51, "label": "51 av. J.-C." }` (`year` négatif avant J.-C. ; `label` facultatif, pour « vers 1096 » ou une période). Viser les surprises (Cléopâtre plus proche de l'iPhone que de Khéops, Oxford plus vieille que les Aztèques), au moins 5 ans d'écart entre deux événements.

**Le Dico menteur** (`"kind": "dico"`, 4 questions `"type": "choice"`) : un mot français rare, ancien ou régional (« Vergogne, c'est… ») et 4 définitions : une vraie, trois inventées, drôles mais crédibles. L'explication donne l'étymologie ou un exemple d'emploi.

**Plus ou moins** (`"kind": "plusmoins"`, 1 question `"type": "chain"`) : une suite de 8 à 10 éléments comparés deux à deux ; le joueur enchaîne les duels jusqu'à la première erreur.
```json
{ "type": "chain", "q": "Lequel est le plus ancien ?", "crit": "plus ancien", "pick": "min",   // "min" ou "max" (par défaut)
  "items": [ { "name": "Le Coca-Cola", "value": 1886, "label": "1886", "explain": "facultatif, 20 mots max" }, … ],
  "explain": "…", "source": { … } }
```
Une seule grandeur par jeu (date, population, hauteur, distance…), pas d'égalité entre deux éléments voisins, des duels qui piègent (le bon sens doit souvent se tromper).

**Le Swipe** (`"kind": "swipe"`, 1 question `"type": "swipe"`) : 10 affirmations vrai ou faux en 60 secondes.
`{ "type": "swipe", "seconds": 60, "items": [ { "text": "Napoléon était petit.", "ok": false, "explain": "Environ 1,69 m, dans la moyenne de son époque." }, … ], "source": { … } }`
Affirmations de 12 mots maximum, environ moitié vraies, beaucoup d'idées reçues.

**Le Chiffre** (`"kind": "chiffre"`, 3 questions `"type": "estimate"`) : estimer un nombre avec un curseur.
`{ "type": "estimate", "q": "Combien de marches jusqu'au sommet de la tour Eiffel ?", "answer": 1665, "unit": "marches", "min": 100, "max": 10000, "scale": "log" }`
`scale` : `"log"` quand la bonne réponse peut varier d'un facteur 10 et plus, sinon `"lin"`. La réponse ne doit pas être au milieu exact du curseur. Juste à 10 % près, presque à 35 % (réglables avec `"ok"` et `"mid"`).

**Qui a dit ça ?** (`"kind": "citation"`, 4 questions `"type": "choice"`) : une citation célèbre et 4 auteurs possibles, ou une citation à attribuer à « Personne de connu » quand elle est apocryphe (« Qu'ils mangent de la brioche »). Citations exactes et sourcées ; aucune citation inventée présentée comme vraie.

## Cohérence visuelle d'une BD (8 novembre 2026)
Le pipeline envoie au modèle, pour chaque case : le numéro de la case, la scène, **le cadre de toute l'histoire** (`art`), chaque personnage avec sa fiche **et son rôle**, les objets récurrents montrés dans la case, et la **case précédente** en image de référence quand elle partage un personnage (continuité). À fournir dans chaque BD :
```json
"art": {
  "subject": "how a Scottish gambler invented paper money in France and ruined it (1716-1720)",   // en anglais, une ligne : ce que raconte la BD
  "setting": "Regency Paris: a gilded palace room, the narrow rue Quincampoix, a bank counter",  // les lieux, en anglais
  "era": "1710s France",                                                                         // l'époque : costumes, objets et lieux de cette époque
  "props": { "chest": "a small wooden money chest with iron bands", "banknote": "a large blank paper banknote with a red wax seal" }  // objets qui reviennent, décrits une fois
},
"cast": [ { "id": "law", "look": "…", "role": "the smooth-talking inventor who sells the idea; always confident, leaning in", "file": "…" } ]
```
- `role` (anglais, une ligne) : qui est le personnage **dans l'histoire** et comment son caractère se voit dans le corps (posture, geste habituel). Il donne au modèle un personnage singulier plutôt qu'un bonhomme générique.
- **Choisir le style de chaque personnage comme un caricaturiste** : son look raconte son métier, son époque et son caractère d'un coup d'œil (le banquier rond et satisfait, le perfectionniste maigre et cerné, le soldat raide comme un piquet). Un trait exagéré et mémorable par personnage, toujours le même d'une case à l'autre.
- **Objets récurrents** : un objet qui revient (le coffre, l'instrument, le billet) est décrit une seule fois dans `art.props`, et nommé par son mot-clé (« the chest ») dans les prompts des cases : il est alors dessiné pareil partout.
- **Continuité** : la case précédente sert de référence quand les deux cases ont un personnage en commun. Mettre `"same_place": false` sur l'image d'une case qui change de lieu ou d'époque (pour ne pas garder l'ancien décor), `"same_place": true` pour forcer la continuité même sans personnage commun.
- **Logique** : chaque prompt de case colle au texte de la case. Celui qui parle est bien dans l'image, à la position de sa bulle ; l'objet dont parle la case est dans les mains de la bonne personne ; le lieu est celui de l'histoire à ce moment-là ; rien d'ajouté au hasard. Une case qui suit la précédente dans le même lieu garde le même décor et les mêmes objets.

## Règles pour les prompts d'images (champ `image.prompt`)
- En **anglais**, 40 à 90 mots. Décrire : le décor, chaque personnage par son nom de fiche + position (on the left / on the right / in the foreground), expression, geste, accessoires, cadrage (wide shot, medium shot, close-up, low angle…).
- Le style et l'interdiction de texte sont ajoutés automatiquement par `pipeline/style.json` : ne pas les répéter.
- Jamais de texte, de lettres, de logos ou de marques à dessiner. Pas de nom de dessinateur ou de série existante.
- Laisser le haut de l'image calme : les bulles s'y posent.
- Penser en dessinateur de strip minimaliste : le jeu d'acteur fait le gag. Décor réduit à un ou deux objets utiles au sujet (un bureau, un canapé, un télescope), le reste vide. Exagérer les postures (dos voûté, épaules tombantes, bras ballants, personnage qui s'affale ou « fond » sur place), les sourcils et la bouche ; gouttes de sueur ou joues roses seulement quand le personnage est vraiment gêné ou en difficulté dans cette case. Rythme : cases calmes et assez statiques, puis explosion d'expression sur la chute (changement de posture radical ou gros plan sur la réaction). Varier quand même les cadrages (plan moyen, gros plan, plan large).
- **Des personnages qu'on ne confond pas (8 novembre 2026).** Dans une même BD, chaque personnage se reconnaît au premier coup d'œil, même en petit et en noir et blanc. Dans sa fiche (`look`), il a :
  1. une **silhouette** à lui, écrite en toutes lettres : grand et maigre, petit et rond, costaud, voûté, enfant, très vieux… (jamais deux fois la même dans la BD) ;
  2. une **coiffure** différente par sa forme **et** sa valeur : cheveux noirs pleins, cheveux blancs, chauve, perruque, chapeau, chignon… ;
  3. **sa propre couleur d'accent**, jamais la même que celle d'un autre personnage de la BD (`… as the only colour`) ;
  4. un **accessoire signature** visible (lunettes, canne, livre, instrument).
  Interdit : deux personnages en « black coat, white shirt » qui ne diffèrent que par la moustache ; deux personnages du même métier habillés pareil (deux cyclistes, deux astronomes) sans silhouette, coiffure et couleur bien différentes. Dans chaque prompt de case, rappeler après le nom deux traits qui le distinguent : « Philippe (plump, huge black wig) ». `pipeline/validate.py` signale les fiches trop proches.
- Nos personnages sont à nous : ne jamais reprendre le personnage-type de l'autrice qui inspire le style (jeune femme à frange noire en t-shirt rayé noir et blanc). Pas de t-shirt rayé par défaut ; varier coiffures, âges et vêtements.
- Le prompt d'image commence par la scène : l'écrire en une ou deux phrases concrètes (qui, quelle posture, quel objet), sans répéter le style.
- Personnalités vivantes : décrire la fonction et la caricature cartoon (silhouette, coiffure, accessoire), **jamais le nom** dans le prompt d'image, même quand la BD les nomme (formats hors Actu).
- **Coller au style** : décrire les vêtements et les objets surtout en noir, blanc ou gris, avec une seule couleur d'accent sur les vêtements ou objets par case (« a black suit », « a white lab coat », « a red scarf »). **Touches d'émotion seulement si la case le justifie** (8 novembre 2026) : le style global ne les ajoute plus, c'est le prompt de la case qui les demande, et seulement pour une émotion forte que le texte de la case raconte : « pink blush on the cheeks » (gêne, timidité), « light-blue sweat drop » (stress, malaise), « light-blue tears » (chagrin), « red angry flush » (colère), « small red hearts » (amour, coup de cœur), « yellow sparkles » (fierté, idée lumineuse). Au plus une touche par case et pas dans la majorité des cases ; aucune pour un personnage calme, neutre ou qui explique. Pas de décor détaillé, pas d'adjectifs qui poussent vers le réalisme ou la peinture (realistic, detailed, painterly, watercolor, cinematic, lighting). Préférer des actions corporelles exagérées : « slumped on the desk », « melting into a puddle of despair », « frozen with a tiny sweat drop », « tiny pink blush marks ».
- Chemins : `images/<format>-NN.webp` (NN sur 2 chiffres), `images/<format>-cover.webp`, `cast/<format>-<id>.png`.

## Demander une nouvelle image
Mettre `"status": "retry"` sur l'image (et corriger son `prompt` si besoin), puis pousser. Le pipeline la régénère au prochain passage (3 tentatives max).
