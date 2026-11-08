// Webhook Stripe : signature vérifiée, Premium prolongé une seule fois. Lancer : npm test
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { webhook } from "../src/pay.js";

function fakeDB(user) {
  const paid = new Set(), log = [];
  const stmt = (sql) => ({
    _a: [], bind(...a) { this._a = a; return this; },
    async run() {
      log.push(sql);
      if (sql.startsWith("UPDATE payments SET status = 'paid'")) { const id = this._a[2]; if (paid.has(id)) return { meta: { changes: 0 } }; paid.add(id); return { meta: { changes: 1 } }; }
      if (sql.startsWith("UPDATE users SET premium = 1")) { user.premium = 1; user.premium_until = this._a[0]; }
      return { meta: { changes: 1 } };
    },
    async first() { return sql.startsWith("SELECT premium") ? user : null; },
  });
  return { prepare: stmt, log };
}
const sign = (secret, body, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
const event = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", amount_total: 1999, client_reference_id: "u1", metadata: { plan: "year", user_id: "u1" } } } });

test("signature invalide refusée", async () => {
  const env = { STRIPE_WEBHOOK_SECRET: "whsec_x", DB: fakeDB({}) };
  const r = await webhook(new Request("https://x/pay/webhook", { method: "POST", body: event, headers: { "stripe-signature": sign("autre", event) } }), env);
  assert.equal(r.status, 400);
});

test("paiement annuel : Premium d'un an, une seule fois", async () => {
  const user = { premium: 0, premium_until: null };
  const env = { STRIPE_WEBHOOK_SECRET: "whsec_x", DB: fakeDB(user) };
  const req = () => new Request("https://x/pay/webhook", { method: "POST", body: event, headers: { "stripe-signature": sign("whsec_x", event) } });
  assert.equal((await webhook(req(), env)).status, 200);
  assert.equal(user.premium, 1);
  const first = user.premium_until;
  assert.ok(first > new Date(Date.now() + 360 * 86400e3).toISOString().slice(0, 10));
  await webhook(req(), env);
  assert.equal(user.premium_until, first, "le même paiement ne prolonge pas deux fois");
});

test("sans secret de webhook : route désactivée", async () => {
  const r = await webhook(new Request("https://x/pay/webhook", { method: "POST", body: "{}" }), { DB: fakeDB({}) });
  assert.equal(r.status, 404);
});
