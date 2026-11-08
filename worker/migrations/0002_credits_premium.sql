-- Dossiers débloqués (newsletter, parrainage), paiements Stripe, newsletter confirmée.
-- « owner » : "u:<id utilisateur>", "d:<appareil>" ou "e:<e-mail>" (abonné sans compte) ; regroupés sur le compte à la connexion.

ALTER TABLE subscribers ADD COLUMN owner TEXT;
ALTER TABLE subscribers ADD COLUMN ref TEXT;
ALTER TABLE subscribers ADD COLUMN confirm_token TEXT;
ALTER TABLE subscribers ADD COLUMN confirmed_at TEXT;

CREATE TABLE IF NOT EXISTS refcodes (
  code TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS refcodes_owner ON refcodes(owner);

-- Un crédit = un Grand Dossier à débloquer. « key » empêche les doublons (nl:<email>, ref:<email>…).
CREATE TABLE IF NOT EXISTS grants (
  key TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  reason TEXT NOT NULL,                    -- newsletter | referral | admin
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS grants_owner ON grants(owner);

CREATE TABLE IF NOT EXISTS unlocks (
  owner TEXT NOT NULL,
  ed TEXT NOT NULL,                        -- date de l'édition du Grand Dossier débloqué
  created_at TEXT NOT NULL,
  PRIMARY KEY (owner, ed)
);

CREATE TABLE IF NOT EXISTS payments (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,                      -- month | year
  amount INTEGER NOT NULL,                 -- centimes
  status TEXT NOT NULL,                    -- pending | paid | expired
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS payments_user ON payments(user_id, status);
