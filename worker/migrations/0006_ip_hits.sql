-- Limite d'e-mails demandés par adresse IP et par jour (connexion, inscription à la newsletter).
-- L'IP n'est jamais gardée : seulement une empreinte liée au jour, effacée au bout de deux jours.
CREATE TABLE IF NOT EXISTS ip_hits (
  key TEXT NOT NULL,         -- empreinte (IP + jour), illisible
  day TEXT NOT NULL,         -- jour (heure de Paris)
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, day)
);
