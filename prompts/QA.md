# Contrôle qualité des images

À faire après chaque génération (au moins à 3 h 30 pour l'Actu, et sur le stock dans la journée).

**Règle d'or (8 novembre 2026) : le contrôle qualité ne retire jamais une image.** Une image ratée reste publiée telle quelle jusqu'à ce que sa nouvelle version soit prête. On la signale seulement avec `"redo": true` ; son `status` reste `"done"`. Les images à refaire passent **après** les BD à finir : mieux vaut une BD finie avec une case moyenne qu'une BD à 90 % qui ne sort pas.

1. `git pull`. Ordre : l'édition du jour (`editions/<date>/`), puis les BD finies de la file d'attente (`stock/<type>/<nom>/item.json`, dont toutes les images sont `done`), la plus ancienne d'abord. Ouvrir les images `status: "done"` qui n'ont ni `"qa": "ok"` ni `"redo": true`.
2. Regarder chaque image et vérifier :
   - les bons personnages, reconnaissables d'une case à l'autre (comparer aux fiches `cast/…png`) ;
   - le bon nombre de personnages et les bonnes positions (gauche / droite comme les bulles) ;
   - **aucune lettre, aucun mot, aucun logo** dessiné ;
   - le haut de l'image assez calme pour les bulles ;
   - mains, visages et objets corrects ; cohérence avec la case précédente ;
   - style respecté : gros trait noir, aplats noirs, décor presque vide, surtout noir et blanc avec de petites touches de couleur sur les émotions (joues roses, larmes et gouttes de sueur bleues, rougeur, cœurs) et une couleur d'accent au plus sur les vêtements ou objets (pas de dégradés, pas de décor chargé).
3. Image correcte → ajouter `"qa": "ok"`. Image ratée → corriger `prompt` si utile et ajouter `"redo": true` **sans toucher à `status`** (ne jamais mettre `"retry"` ni `"pending"` sur une image déjà faite). Réserver `redo` aux vrais défauts (texte dessiné, mauvais personnage, visage ou mains ratés, case incompréhensible) ; un détail de style ne suffit pas. Au plus **6** `redo` par passage, l'édition du jour d'abord.
4. Une image `failed` (jamais réussie) dans l'Actu : réécrire la case pour une scène plus simple et remettre `"status": "pending"`, `"attempts": 0`, ou retirer le sujet et renuméroter. Dans la file : la débloquer comme dit dans `prompts/STOCK.md`.
5. Ne modifier que `editions/` et `stock/`. Commit « Contrôle qualité <date> », `git push`.
