-- Notifications push (Web Push, même appli fermée).
-- Une ligne par appareil abonné ; la clé VAPID est tirée au hasard par l'API au premier besoin.
CREATE TABLE IF NOT EXISTS push_subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,  -- adresse du service push (Google, Mozilla, Apple, Microsoft)
  p256dh TEXT NOT NULL,           -- clé publique de l'appareil (chiffrement du message)
  auth TEXT NOT NULL,             -- secret d'authentification de l'appareil
  device TEXT,                    -- identifiant anonyme de l'appareil (mesure d'audience)
  user_id TEXT,                   -- compte, si connecté
  created_at TEXT NOT NULL,
  last_day TEXT,                  -- dernier jour où la notification de l'édition est partie
  last_ok TEXT,
  fails INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_subs_day ON push_subs (last_day);
CREATE INDEX IF NOT EXISTS push_subs_user ON push_subs (user_id);

CREATE TABLE IF NOT EXISTS push_runs (
  day TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  gone INTEGER NOT NULL DEFAULT 0,
  title TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
