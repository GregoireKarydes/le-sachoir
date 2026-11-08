-- Le Sachoir : comptes, synchro, newsletter et mesures d'audience (Cloudflare D1).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_seen TEXT,
  premium INTEGER NOT NULL DEFAULT 0,      -- 1 = Premium (donné à la main en attendant Stripe)
  premium_until TEXT,                      -- AAAA-MM-JJ, vide = sans fin
  source TEXT NOT NULL DEFAULT ''
);

-- Lien magique + code à 6 chiffres (on ne garde que les empreintes).
CREATE TABLE IF NOT EXISTS logins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  newsletter INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS logins_email ON logins(email, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- Données de l'appli (série, dossiers, lectures, favoris, jeu) en JSON.
CREATE TABLE IF NOT EXISTS user_state (
  user_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Abonnés à la newsletter, avec ou sans compte.
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',   -- active | unsub | bounce
  token TEXT NOT NULL UNIQUE,              -- lien de désinscription
  source TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  unsub_at TEXT
);

-- Une ligne par e-mail envoyé (newsletter et connexion) : quota Brevo, ouvertures, clics.
CREATE TABLE IF NOT EXISTS mails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,                      -- newsletter | login | welcome
  day TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT,
  sent_at TEXT NOT NULL,
  opened_at TEXT,
  clicked_at TEXT
);
CREATE INDEX IF NOT EXISTS mails_day ON mails(day, kind);
CREATE UNIQUE INDEX IF NOT EXISTS mails_token ON mails(token);

CREATE TABLE IF NOT EXISTS nl_runs (
  day TEXT PRIMARY KEY,
  status TEXT NOT NULL,                    -- sending | sent | failed
  recipients INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error TEXT
);

-- Audience anonyme : un identifiant tiré au hasard par téléphone, aucune adresse IP gardée.
CREATE TABLE IF NOT EXISTS devices (
  device TEXT PRIMARY KEY,
  first_day TEXT NOT NULL,
  last_day TEXT NOT NULL,
  standalone INTEGER NOT NULL DEFAULT 0,
  desktop INTEGER NOT NULL DEFAULT 0,
  user_id TEXT
);
CREATE TABLE IF NOT EXISTS device_days (
  device TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (device, day)
);
CREATE INDEX IF NOT EXISTS device_days_day ON device_days(day);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  ts TEXT NOT NULL,
  device TEXT NOT NULL,
  type TEXT NOT NULL,                      -- open | read | done | game | share | fav | install | paywall
  ed TEXT NOT NULL DEFAULT '',             -- date de l'édition
  fid TEXT NOT NULL DEFAULT '',            -- format
  val INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS events_day ON events(day, type);
