# Skills Instagram (copie dans le dépôt)

Copie des 13 skills « instagram-agent » de Jake Schincariol (licence MIT, voir `LICENSE`), prise le 17 novembre 2026 au
commit `d03c56b` de https://github.com/Jakeschincariol/instagram-agent-skill. Les tâches automatiques du Sachoir lisent
ces consignes ici, sans rien installer.

- Là où une consigne dit `~/.claude/instagram/voice.md`, lis `social/instagram/voice.md`.
- Là où elle dit `~/.claude/instagram/swipe.md`, lis `social/instagram/swipe.md`.
- Les scripts Python (`hookscore.py`, `beats.py`, `detect.py`, `humanize.py`, `caption.py`) tournent en local, sans
  Internet. Ils sont réglés sur l'anglais : pour un texte français, leurs notes sont indicatives (longueur, préambule,
  rythme), pas un verdict.
- `ig-viral` exige un navigateur connecté au compte de Greg et interdit la collecte automatique : il ne tourne pas dans les
  tâches planifiées. Le fichier de référence est `social/instagram/swipe.md`, mis à jour avec Greg.
