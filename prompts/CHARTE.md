# Charte de l'humour du Sachoir

Référence complète et à jour : https://claude.ai/artifact/X1ntQuLVCbehitA1mLZP5d
Ce fichier en est la version de travail pour les tâches automatiques.

## Promesse
Chaque BD fait rire d'abord, puis laisse un fait exact que le lecteur répétera le soir même.
On apprend en riant : l'humour vient de trois leviers (l'anachronisme, l'absurde, l'ironie), s'inspire de Jonathan Cohen et de The Office, et **chaque gag porte un fait**. Chaque fait se termine sur une chute.

## Le casting : adapté à l'histoire
Pas de troupe fixe ni de genre imposé. Les personnages sont les acteurs du sujet, quels qu'ils soient : figures historiques, témoins, animaux, plantes, objets, cellules, molécules. Pollinisation → des abeilles et des fleurs. Immunité → des globules blancs. Inflation → un billet de 10 euros qui maigrit.
- 2 à 4 personnages par BD, chacun résumé par un trait fort, reconnaissable dès sa première case.
- **Un personnage lucide** par BD, pince-sans-rire, qui dégonfle les légendes (humain, animal ou objet).
- Les autres y croient à fond et vivent l'absurde le plus sérieusement du monde.
- Figures historiques : leurs répliques inventées sont visiblement des blagues ; une vraie citation est signalée dans le récitatif.
- Fiche casting obligatoire : `id`, `look` (description visuelle précise en anglais, constante), utilisée comme référence pour toutes les images de l'histoire.

## Les trois leviers (au moins deux par BD)
1. **Anachronisme** : le monde moderne dans le passé (SMS, LinkedIn, jargon de bureau). César envoie « Veni, vidi, vici » par SMS : « le premier tweet de l'histoire ».
2. **Absurde** : situations improbables traitées sérieusement, objets et animaux qui répondent. Le poussin de flamant : « Raté. Moi, je suis né tout gris. »
3. **Second degré / ironie** : le lucide commente avec détachement. « Jolie histoire. Aucune preuve. » ; « C'est un ruisseau, chef. »

## Inspirations : Jonathan Cohen et The Office (techniques, jamais leurs répliques)
- Cohen : assurance totale d'un personnage qui ne maîtrise rien, mythomanie qui s'enfonce, mauvaise foi, répliques lunaires dites sérieusement.
- The Office : face caméra dans un encart (`kind: "conf"`), regard caméra muet du lucide après une énormité (case sans bulle), le chef qui veut être aimé, le silence qui dure une case de trop.

**Règle du gag porteur** : retirez le fait ; si la blague tient encore, elle n'apprend rien → réécrire.

## La chute
Chaque fait du jour se termine sur un gag, souvent en écho à la première case. La chute est le dernier mot de la dernière bulle. On ne l'explique jamais. Grand Dossier : une chute par chapitre, cliffhanger en case 4 (dernière case gratuite et publiée sur Instagram).

## Dosage, faits et longueurs
| Format | Cases | Humour |
|---|---|---|
| Actu du jour (`actu`) | 8 = 4 sujets × 2 | Case 1 : le fait. Case 2 : un gag et sa chute |
| Pilule de culture G (`cultureg`) | 6 à 10 | Un gag par case, chute finale en écho |
| Insolite historique (`insolite`) | 6 | Un gag par case, chute finale en écho |
| Grand Dossier (`dossier`) | 30 à 45, 4 chapitres | Un gag toutes les 3-4 cases, une chute par chapitre |
| Carte « Pour briller » (`final`) | 1 | Aucun humour : 25 mots max, exacte |

- Le récitatif (`caption`), sobre et documentaire, porte les faits ; le lucide peut compléter. Toute énormité qui ressemble à un fait est démentie dans la même case ou la suivante. Les anachronismes sont des blagues évidentes.
- Chaque chiffre et chaque date ont une source dans `sources`.
- Récitatif : 15 mots max. Bulle : 12 mots max. 2 bulles par case (3 si la dernière fait 3 mots ou moins). 3 personnages max par case. Une bulle ne répète jamais le récitatif.

## Garde-fous
- Humour bienveillant : on se moque des légendes, des situations et de ce que font les personnalités publiques, jamais des gens pour ce qu'ils sont.
- Personnalités vivantes : dans l'Actu seulement, parodiées dans leur rôle public, **jamais nommées en entier**. Reconnaissables par leur fonction (« le Président », « la ministre du Budget ») et une caricature de presse classique (silhouette, coiffure, tic, accessoire). Répliques visiblement parodiques, jamais de fausses citations crédibles. Rien sur la vie privée. Même traitement pour tous les camps.
- Aucune politique partisane. Aucun contenu blessant (origine, religion, handicap, physique au-delà de la caricature de presse, vulgarité sexuelle, moquerie de victimes réelles).
- Pas d'humour sur un drame (attentat, catastrophe, décès) : ces sujets sont exclus de l'Actu.
- Tout public : un « zut » passe, un gros mot au plus par édition. Ni jeu de mots facile, ni emoji dans les bulles.

## Checklist avant de pousser une BD
- [ ] Personnages tirés du monde de l'histoire, chacun avec une fiche casting.
- [ ] Un personnage lucide.
- [ ] Au moins deux leviers, et chaque gag porte un fait.
- [ ] Chaque fait finit sur une chute, si possible en écho.
- [ ] Faits dans les récitatifs, aucune énormité sans démenti, sources renseignées.
- [ ] Longueurs respectées.
- [ ] Grand Dossier : humour dosé, cliffhanger en case 4.
- [ ] Personnalités vivantes uniquement dans l'Actu, jamais nommées en entier ; pas de politique partisane ; rien de blessant.
- [ ] Carte « Pour briller » exacte, 25 mots max.
- [ ] Lu à voix haute : une blague qu'il faut expliquer est coupée.
