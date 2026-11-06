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

## Règles pour les prompts d'images (champ `image.prompt`)
- En **anglais**, 40 à 90 mots. Décrire : le décor, chaque personnage par son nom de fiche + position (on the left / on the right / in the foreground), expression, geste, accessoires, cadrage (wide shot, medium shot, close-up, low angle…).
- Le style et l'interdiction de texte sont ajoutés automatiquement par `pipeline/style.json` : ne pas les répéter.
- Jamais de texte, de lettres, de logos ou de marques à dessiner. Pas de nom de dessinateur ou de série existante.
- Laisser le haut de l'image calme : les bulles s'y posent.
- Penser en dessinateur de strip minimaliste : le jeu d'acteur fait le gag. Décor réduit à un ou deux objets utiles au sujet (un bureau, un canapé, un télescope), le reste vide. Exagérer les postures (dos voûté, épaules tombantes, bras ballants, personnage qui s'affale ou « fond » sur place), les sourcils et la bouche ; gouttes de sueur et joues roses pour la gêne. Rythme : cases calmes et assez statiques, puis explosion d'expression sur la chute (changement de posture radical ou gros plan sur la réaction). Varier quand même les cadrages (plan moyen, gros plan, plan large).
- Dans les fiches casting (`look`), garder pour chaque personnage un trait fort lisible en gros trait noir : coiffure (souvent en bataille), silhouette, accessoire, une couleur d'accent au plus.
- Personnalités vivantes (Actu) : décrire la fonction et la caricature (silhouette, coiffure, accessoire), jamais le nom.
- Chemins : `images/<format>-NN.webp` (NN sur 2 chiffres), `images/<format>-cover.webp`, `cast/<format>-<id>.png`.

## Demander une nouvelle image
Mettre `"status": "retry"` sur l'image (et corriger son `prompt` si besoin), puis pousser. Le pipeline la régénère au prochain passage (3 tentatives max).
