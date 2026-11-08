// Abonnement Stripe : signature du webhook, Premium suivi sur la période payée, résiliation. Lancer : npm test
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { webhook, applySubscription } from "../src/pay.js";

function fakeDB(user) {
  const stmt = sql => ({
    _a: [], bind(...a) { this._a = a; return this; },
    async run() {
      if (sql.startsWith("UPDATE users SET stripe_customer")) {
        const [customer, sub, plan, status, cancel, end, ...rest] = this._a;
        Object.assign(user, { stripe_customer: customer, stripe_sub: sub, sub_plan: plan, sub_status: status, sub_cancel_at_end: cancel, sub_period_end: end });
        if (rest.length === 2) Object.assign(user, { premium: 1, premium_until: rest[0] });
      }
      return { meta: { changes: 1 } };
    },
    async first() { return sql.startsWith("SELECT * FROM users") ? user : null; },
    async all() { return { results: [] }; },
  });
  return { prepare: stmt };
}
const ts = d => Math.floor(Date.parse(d + "T12:00:00Z") / 1000);
const sign = (secret, body, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
const sub = (o = {}) => ({ id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false, metadata: { user_id: "u1", plan: "year" },
  items: { data: [{ current_period_end: ts("2027-11-08"), price: { recurring: { interval: "year" } } }] }, ...o });

test("abonnement actif : Premium jusqu'à la fin de la période + 1 jour", async () => {
  const user = { id: "u1", premium: 0 };
  await applySubscription({ DB: fakeDB(user) }, sub());
  assert.equal(user.premium, 1);
  assert.equal(user.premium_until, "2027-11-09");
  assert.equal(user.sub_plan, "year");
});

test("résiliation : l'accès reste jusqu'à la date payée, puis s'arrête", async () => {
  const user = { id: "u1", premium: 0 };
  await applySubscription({ DB: fakeDB(user) }, sub({ cancel_at_period_end: true }));
  assert.equal(user.sub_cancel_at_end, 1);
  assert.equal(user.premium_until, "2027-11-09");
  await applySubscription({ DB: fakeDB(user) }, sub({ status: "canceled", ended_at: ts("2027-11-08") }));
  assert.equal(user.premium_until, "2027-11-08");
});

test("webhook : signature invalide refusée, valide acceptée", async () => {
  const user = { id: "u1", premium: 0 };
  const env = { STRIPE_WEBHOOK_SECRET: "whsec_x", DB: fakeDB(user) };
  const body = JSON.stringify({ type: "customer.subscription.updated", data: { object: sub({ metadata: { user_id: "u1", plan: "month" } }) } });
  const bad = await webhook(new Request("https://x/pay/webhook", { method: "POST", body, headers: { "stripe-signature": sign("autre", body) } }), env);
  assert.equal(bad.status, 400);
  const ok = await webhook(new Request("https://x/pay/webhook", { method: "POST", body, headers: { "stripe-signature": sign("whsec_x", body) } }), env);
  assert.equal(ok.status, 200);
  assert.equal(user.premium, 1);
});

test("Premium donné à la main sans fin : l'abonnement n'y touche pas", async () => {
  const user = { id: "u1", premium: 1, premium_until: null, stripe_sub: null };
  await applySubscription({ DB: fakeDB(user) }, sub({ status: "canceled", ended_at: ts("2026-01-01") }));
  assert.equal(user.premium_until, null);
});
