# Format d'une édition : `editions/AAAA-MM-JJ/edition.json`

Une édition par jour. Les formats produits à l'avance (stock) et l'Actu de la nuit vivent dans le même fichier.
Le pipeline d'images ne touche qu'aux champs `status`, `attempts`, `file`. Tout le reste est écrit par Claude.

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
      "sources": [ { "title": "…", "url": "https://…" } ]
    }
  ]
}
```

## Le Quiz du jour (`"id": "quiz"`, sans image)
Le dessert de l'édition : 5 questions de culture générale **indépendantes des BD du jour**, 1 à 2 minutes. Aucune image, aucun casting.

```json
{
  "id": "quiz",
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

## Règles pour les prompts d'images (champ `image.prompt`)
- En **anglais**, 40 à 90 mots. Décrire : le décor, chaque personnage par son nom de fiche + position (on the left / on the right / in the foreground), expression, geste, accessoires, cadrage (wide shot, medium shot, close-up, low angle…).
- Le style et l'interdiction de texte sont ajoutés automatiquement par `pipeline/style.json` : ne pas les répéter.
- Jamais de texte, de lettres, de logos ou de marques à dessiner. Pas de nom de dessinateur ou de série existante.
- Laisser le haut de l'image calme : les bulles s'y posent.
- Penser en dessinateur de strip minimaliste : le jeu d'acteur fait le gag. Décor réduit à un ou deux objets utiles au sujet (un bureau, un canapé, un télescope), le reste vide. Exagérer les postures (dos voûté, épaules tombantes, bras ballants, personnage qui s'affale ou « fond » sur place), les sourcils et la bouche ; gouttes de sueur et joues roses pour la gêne. Rythme : cases calmes et assez statiques, puis explosion d'expression sur la chute (changement de posture radical ou gros plan sur la réaction). Varier quand même les cadrages (plan moyen, gros plan, plan large).
- Dans les fiches casting (`look`), garder pour chaque personnage un trait fort lisible en gros trait noir : coiffure (souvent en bataille), silhouette, accessoire, une couleur d'accent au plus.
- Nos personnages sont à nous : ne jamais reprendre le personnage-type de l'autrice qui inspire le style (jeune femme à frange noire en t-shirt rayé noir et blanc). Pas de t-shirt rayé par défaut ; varier coiffures, âges et vêtements.
- Le prompt d'image commence par la scène : l'écrire en une ou deux phrases concrètes (qui, quelle posture, quel objet), sans répéter le style.
- Personnalités vivantes : décrire la fonction et la caricature cartoon (silhouette, coiffure, accessoire), **jamais le nom** dans le prompt d'image, même quand la BD les nomme (formats hors Actu).
- **Coller au style** : décrire les vêtements et les objets surtout en noir, blanc ou gris, avec une seule couleur d'accent par case (« a black suit », « a white lab coat », « a red scarf as the only colour »). Pas de décor détaillé, pas d'adjectifs qui poussent vers le réalisme ou la peinture (realistic, detailed, painterly, watercolor, cinematic, lighting). Préférer des actions corporelles exagérées : « slumped on the desk », « melting into a puddle of despair », « frozen with a tiny sweat drop », « tiny pink blush marks ».
- Chemins : `images/<format>-NN.webp` (NN sur 2 chiffres), `images/<format>-cover.webp`, `cast/<format>-<id>.png`.

## Demander une nouvelle image
Mettre `"status": "retry"` sur l'image (et corriger son `prompt` si besoin), puis pousser. Le pipeline la régénère au prochain passage (3 tentatives max).
