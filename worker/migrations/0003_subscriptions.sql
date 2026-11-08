-- Premium en abonnement Stripe sans engagement (mensuel ou annuel, résiliable à tout moment).
ALTER TABLE users ADD COLUMN stripe_customer TEXT;
ALTER TABLE users ADD COLUMN stripe_sub TEXT;
ALTER TABLE users ADD COLUMN sub_plan TEXT;            -- month | year
ALTER TABLE users ADD COLUMN sub_status TEXT;          -- active | past_due | canceled…
ALTER TABLE users ADD COLUMN sub_cancel_at_end INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN sub_period_end TEXT;      -- AAAA-MM-JJ : prochain prélèvement ou fin d'accès
CREATE INDEX IF NOT EXISTS users_sub ON users(stripe_sub);
CREATE INDEX IF NOT EXISTS users_customer ON users(stripe_customer);
