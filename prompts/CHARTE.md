# Charte de l'humour du Sachoir

Ce fichier est la référence à jour (révisée le 6 novembre 2026 d'après le questionnaire de Greg).
L'ancienne charte publiée (https://claude.ai/artifact/X1ntQuLVCbehitA1mLZP5d) n'est plus à jour : en cas de différence, ce fichier gagne.

## Promesse
On apprend en riant. Chaque BD explique et vulgarise un sujet exact, avec une vraie touche d'humour, et laisse au lecteur au moins un fait qu'il répétera le soir même.
Inspirations (techniques, jamais leurs répliques) : **Jonathan Cohen**, **The Office**, **Kaamelott**, et pour l'image et le jeu d'acteur **le strip minimaliste façon Sarah's Scribbles**.

## Le casting : adapté à l'histoire
- Les personnages sont **des humains** (figures historiques, témoins, scientifiques, gens ordinaires de l'époque) et, quand le sujet s'y prête vraiment, des animaux réels de l'histoire.
- **Pas d'objets, de cellules, de molécules ni de billets qui parlent.** Pour expliquer un phénomène invisible, on le fait expliquer par un humain (un scientifique, un prof, un témoin), avec un objet ou un schéma dessiné à côté si besoin.
- 2 à 4 personnages par BD, chacun résumé par un trait fort, reconnaissable dès sa première case.
- **Personnage lucide** pince-sans-rire qui dégonfle les légendes : seulement quand il est pertinent pour le sujet, pas systématique.
- Figures historiques : sûres d'elles, décalées ; leurs répliques inventées sont visiblement des blagues ; une vraie citation est signalée dans le récitatif.
- Personnes vivantes : voir « Garde-fous ».
- Fiche casting obligatoire : `id`, `look` (description visuelle précise en anglais, constante), utilisée comme référence pour toutes les images de l'histoire.

## Les leviers de l'humour (au moins deux par BD)
1. **Anachronisme** : le monde moderne dans le passé (SMS, LinkedIn, jargon de bureau). César envoie « Veni, vidi, vici » par SMS : « le premier tweet de l'histoire ».
2. **Absurde** : situations improbables traitées très sérieusement.
3. **Second degré / ironie** : un personnage commente avec détachement. « Jolie histoire. Aucune preuve. »
4. **Jeux de mots** : avec modération (un par BD au plus, et seulement s'il est bon).

### Ce qu'on prend à chaque inspiration
- **Jonathan Cohen** : assurance totale d'un personnage qui ne maîtrise rien, mythomanie qui s'enfonce, mauvaise foi, répliques lunaires dites sérieusement.
- **The Office** : face caméra dans un encart (`kind: "conf"`), regard caméra muet après une énormité (case sans bulle), le chef qui veut être aimé, le silence qui dure une case de trop.
- **Kaamelott** : le décalage entre un cadre historique solennel et des dialogues de tous les jours ; le chef dépassé par une équipe d'incompétents ; les répliques sèches et les engueulades qui tournent en rond ; le vocabulaire moderne dans la bouche de personnages d'époque.
- **Sarah's Scribbles** : le gag porté par le corps et le visage plus que par les mots ; personnages avachis, gênés, angoissés ; une réaction muette en gros plan vaut souvent mieux qu'une réplique.

**Règle du gag porteur** : l'humour sert le fait. Retirez le fait ; si la blague tient encore et n'apprend rien, réécrire.

## Rythme et chute
- Pas de structure imposée : l'accroche en case 1 et la chute à chaque fait sont **possibles, pas obligatoires**. Ce qui compte : que ce soit clair, drôle et que ça se lise vite.
- Une chute finale est bienvenue, souvent en écho au début. On ne l'explique jamais.
- Grand Dossier : cliffhanger en case 4 (dernière case gratuite et publiée sur Instagram) ; ensuite, une chute par chapitre quand elle vient naturellement.

## Titres
Libres mais **toujours humoristiques** (jeu de mots, promesse décalée, question absurde). Exemple : « Le Chat de Schrödinger expliqué à mon chat ».

## Dosage, durée et longueurs
**Ce qui compte, c'est la durée de lecture**, pas un nombre de cases fixe. Les fourchettes ci-dessous sont des repères.

| Format | Durée visée | Cases (repère) | Humour |
|---|---|---|---|
| Actu du jour (`actu`) | 1 à 2 min | 1 à 2 cases par sujet, 3 à 5 sujets | L'actu racontée de façon détournée et drôle, sans case « réaction » obligatoire |
| Pilule de culture G (`cultureg`) | 1 à 2 min | 6 à 10 | Concept expliqué et vulgarisé, avec une touche d'humour |
| Insolite historique (`insolite`) | 1 min | 5 à 7 | Un fait ahurissant ou une idée reçue démontée, gag à chaque étape |
| Grand Dossier (`dossier`) | environ 4 min | 30 au plus (quota d'images) | Humour dosé : la compréhension d'abord |
| Jeu du jour (`quiz`), Quiz culture G | 1 à 2 min | 5 questions, sans image | Mauvaises réponses drôles mais plausibles, explication courte et drôle |
| Jeu du jour (`quiz`), Quiz géo | 1 min | 3 questions : où c'est (carte), capitales, joker | Pièges crédibles, explication courte et drôle |
| Jeu du jour (`quiz`) : Frise, Dico menteur, Plus ou moins, Swipe, Chiffre, Qui a dit ça ? | 1 à 2 min | voir `prompts/SCHEMA.md` | Un jeu par jour, en rotation sur 8 jours |
| Carte « Pour briller » (`final`) | — | 1 | Aucun humour : 25 mots max, exacte |

- Le récitatif (`caption`) porte les faits. Toute énormité qui ressemble à un fait est démentie dans la même case ou la suivante. Les anachronismes sont des blagues évidentes.
- Grand Dossier : des **cases « pause »** sont permises quand c'est utile (chiffre clé, frise, carte du monde) ; le contenu est dans le récitatif, l'image reste un dessin sans texte (ex. un personnage qui déroule une longue frise vierge).
- Chaque chiffre et chaque date ont une source dans `sources` (affichées en fin d'histoire dans l'appli).
- Récitatif : 15 mots max. Bulle : 12 mots max. 2 bulles par case (3 si la dernière fait 3 mots ou moins). 3 personnages max par case. Une bulle ne répète jamais le récitatif.

## Garde-fous
- Humour bienveillant : on se moque des légendes, des situations et de ce que font les personnalités publiques, jamais des gens pour ce qu'ils sont.
- **Personnalités vivantes** :
  - Actu : parodiées dans leur rôle public, jamais nommées en entier, reconnaissables par leur fonction et une caricature de presse ; même traitement pour tous les camps.
  - Autres formats (patrons, sportifs, artistes, scientifiques) : **autorisées** pour des faits publics vérifiés et sourcés. Répliques inventées visiblement parodiques, jamais de fausse citation crédible, rien sur la vie privée, rien qui puisse passer pour une accusation. À l'image, une caricature cartoon, pas un portrait ressemblant.
- Aucune politique partisane. Aucun contenu blessant (origine, religion, handicap, physique au-delà de la caricature de presse, vulgarité sexuelle, moquerie de victimes réelles).
- **Sujets graves** (guerres, épidémies, catastrophes, génocides) : exclus de l'Actu ; possibles dans les **Grands Dossiers**, avec un humour qui vise les puissants, l'absurdité des décisions ou les légendes, **jamais les victimes ni la souffrance**. Les cases sur les morts et les victimes restent sobres, sans gag.
- Tout public : un « zut » passe, un gros mot au plus par édition. Pas d'emoji dans les bulles.

## Checklist avant de pousser une BD
- [ ] Personnages humains (ou animaux réels), chacun avec une fiche casting ; aucun objet, cellule ou molécule qui parle.
- [ ] Au moins deux leviers, et chaque gag sert un fait.
- [ ] Titre drôle.
- [ ] Durée de lecture dans la cible du format.
- [ ] Faits dans les récitatifs, aucune énormité sans démenti, sources renseignées.
- [ ] Longueurs respectées.
- [ ] Grand Dossier : compréhension d'abord, cliffhanger en case 4 ; sujets graves traités sans moquer les victimes.
- [ ] Personnalités vivantes : règles ci-dessus respectées ; pas de politique partisane ; rien de blessant.
- [ ] Carte « Pour briller » exacte, 25 mots max.
- [ ] Lu à voix haute : une blague qu'il faut expliquer est coupée.
