# Contrôle qualité des images

À faire après chaque génération (au moins à 3 h 30 pour l'Actu, et sur le stock dans la journée).

**Règle d'or (8 novembre 2026) : le contrôle qualité ne retire jamais une image.** Une image ratée reste publiée telle quelle jusqu'à ce que sa nouvelle version soit prête. On la signale seulement avec `"redo": true` ; son `status` reste `"done"`. Les images à refaire passent **après** les BD à finir : mieux vaut une BD finie avec une case moyenne qu'une BD à 90 % qui ne sort pas.

1. `git pull`. **Se concentrer sur ce qui sort ensuite**, dans cet ordre, et s'arrêter là :
   1. l'édition du jour (`editions/<date de Paris>/`), surtout l'Actu, publiée à 5 h ;
   2. pour chaque type, **la prochaine BD à sortir** : son nom est dans `data/health.json`, rubrique `stock.<type>.next` (la plus ancienne BD finie de `stock/<type>/`) ;
   3. s'il reste du temps, la BD finie suivante de chaque type.
   Ne pas relire les BD encore en cours de dessin ni le stock lointain : elles seront relues quand elles arriveront en tête. Ouvrir les images `status: "done"` qui n'ont ni `"qa": "ok"` ni `"redo": true`.
2. Regarder chaque image et vérifier :
   - les bons personnages, reconnaissables d'une case à l'autre (comparer aux fiches `cast/…png`) ;
   - le bon nombre de personnages et les bonnes positions (gauche / droite comme les bulles) ;
   - **aucune lettre, aucun mot, aucun logo** dessiné ;
   - le haut de l'image assez calme pour les bulles ;
   - mains, visages et objets corrects ; **cohérence avec la case précédente** (mêmes personnages, même décor et mêmes objets si on est au même endroit) et **logique avec le texte de la case** (celui qui parle est là, le bon objet dans les bonnes mains, le bon lieu, l'époque de `art.era`) ;
   - **les personnages se distinguent** : on ne confond pas deux personnages de la même BD (silhouette, coiffure, couleur dominante) ; si deux se ressemblent, c'est un vrai défaut ;
   - pas de touches d'émotion hors de propos : cœurs, sueur, larmes, joues roses ou étincelles seulement si la case raconte cette émotion (sinon défaut, retirer la touche du prompt) ;
   - style respecté : gros trait noir, **image en couleur** (aplats vifs sur la peau, les cheveux et les vêtements, fond pastel), décor presque vide, pas de dégradés ni de décor chargé. Une case en noir et blanc ou en gris (dessinée après le 9 novembre 2026) est à refaire.
3. Image correcte → ajouter `"qa": "ok"`. Image ratée → corriger `prompt` si utile et ajouter `"redo": true` **sans toucher à `status`** (ne jamais mettre `"retry"` ni `"pending"` sur une image déjà faite). Réserver `redo` aux vrais défauts (texte dessiné, mauvais personnage ou personnages qu'on confond, visage ou mains ratés, touche d'émotion hors de propos et voyante, case incompréhensible) ; un petit détail de style ne suffit pas. Au plus **6** `redo` par passage, l'édition du jour d'abord. Ces images sont refaites en priorité (juste après l'Actu) ; l'ancienne reste publiée si la nouvelle n'est pas prête.
   Si deux personnages se ressemblent dans toute la BD, corriger aussi leurs fiches `look` dans le même fichier (silhouette, coiffure, couleur dominante différentes) pour les BD pas encore dessinées.
4. **Photos réelles** (`kind: "photo"`, `photo.status: "done"`), avant les dessins, l'Actu d'abord. Les filtres automatiques de `pipeline/photos.py` refusent déjà les licences non libres, le droit à l'image signalé par Commons, les catégories choquantes et les personnes vivantes connues de Wikidata ; ils ne voient pas l'image elle-même. **Une photo marquée `"review": true` reste cachée aux lecteurs tant qu'elle n'a pas `"qa": "ok"`.** Ouvrir chaque photo sans `qa` et vérifier :
   - **aucune personne vivante reconnaissable** au premier plan (personnalité ou anonyme) ; dans l'Actu, aucune personne du tout : un lieu, un bâtiment, une institution, un objet, une carte ;
   - rien de choquant ni d'intime (victimes, blessés, violence, nudité, enfants identifiables) ;
   - la photo correspond vraiment au sujet et le `text` dit vrai sur ce qu'on voit (pas une photo d'un autre lieu ou d'une autre époque présentée comme celle du sujet) ;
   - aucune marque, aucun logo au centre de l'image, rien qui puisse passer pour une publicité.
   Photo correcte → `"qa": "ok"`. Problème → `"status": "rejected"` et `"reason": "<pourquoi>"` (la case est alors sautée partout) ; dans l'Actu, le sujet s'en passe. Ces contrôles ne comptent pas dans la limite de 6 `redo`.
5. Une image `failed` (jamais réussie) dans l'Actu : réécrire la case pour une scène plus simple et remettre `"status": "pending"`, `"attempts": 0`, ou retirer le sujet et renuméroter. Dans la file : la débloquer comme dit dans `prompts/STOCK.md`.
6. Ne modifier que `editions/` et `stock/`. Commit « Contrôle qualité <date> », `git push`.
