# Contrôle qualité des images

À faire après chaque génération (au moins à 3 h 30 pour l'Actu, et sur le stock dans la journée).

1. `git pull`. Pour chaque format en cours (édition du jour et stock), ouvrir les images `status: "done"` qui n'ont pas encore `"qa": "ok"`.
2. Regarder chaque image et vérifier :
   - les bons personnages, reconnaissables d'une case à l'autre (comparer aux fiches `cast/…png`) ;
   - le bon nombre de personnages et les bonnes positions (gauche / droite comme les bulles) ;
   - **aucune lettre, aucun mot, aucun logo** dessiné ;
   - le haut de l'image assez calme pour les bulles ;
   - mains, visages et objets corrects ; cohérence avec la case précédente ;
   - style ligne claire respecté.
3. Image correcte → ajouter `"qa": "ok"`. Image ratée → corriger `prompt` si utile, mettre `"status": "retry"` (le pipeline refait l'image, 3 essais max).
4. Une image `failed` après 3 essais dans l'Actu : réécrire la case pour une scène plus simple, ou retirer le sujet (la case fait + la case réaction) et renuméroter.
5. Commit « Contrôle qualité <date> », `git push`.
