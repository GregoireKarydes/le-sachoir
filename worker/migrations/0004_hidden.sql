-- BD masquées par l'admin (retirées de l'appli, des pages publiques et de la newsletter).
CREATE TABLE IF NOT EXISTS hidden (
  ed TEXT NOT NULL,          -- date de l'édition
  fid TEXT NOT NULL,         -- format (dossier, actu, cultureg, insolite, quiz)
  created_at TEXT NOT NULL,
  by_email TEXT,
  PRIMARY KEY (ed, fid)
);
