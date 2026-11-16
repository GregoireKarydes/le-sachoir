// Limite par IP des e-mails déclenchés par un visiteur. Lancer : npm test
import test from "node:test";
import assert from "node:assert/strict";
import { ipLimited, ipDailyLimit, ipKey } from "../src/iplimit.js";

// Fausse base : juste ce que ipLimited utilise.
function fakeDB() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      let args = [];
      const st = {
        bind(...a) { args = a; return st; },
        async first() { const k = args[0] + "|" + args[1]; rows.set(k, (rows.get(k) || 0) + 1); return { n: rows.get(k) }; },
        async run() { for (const k of [...rows.keys()]) if (k.split("|")[1] < args[0]) rows.delete(k); },
      };
      if (!/ip_hits/.test(sql)) throw new Error("requête inattendue");
      return st;
    },
  };
}
const req = ip => ({ headers: { get: h => (h === "cf-connecting-ip" ? ip : null) } });

test("réglage par défaut : 12 e-mails par IP et par jour, 0 coupe la limite", () => {
  assert.equal(ipDailyLimit({}), 12);
  assert.equal(ipDailyLimit({ MAIL_IP_DAILY_LIMIT: "3" }), 3);
  assert.equal(ipDailyLimit({ MAIL_IP_DAILY_LIMIT: "0" }), 0);
  assert.equal(ipDailyLimit({ MAIL_IP_DAILY_LIMIT: "abc" }), 12);
});

test("une IP est bloquée après la limite, les autres IP ne sont pas touchées", async () => {
  const env = { DB: fakeDB(), MAIL_IP_DAILY_LIMIT: "3" };
  for (let i = 0; i < 3; i++) assert.equal(await ipLimited(env, req("1.2.3.4"), "2026-11-16"), false);
  assert.equal(await ipLimited(env, req("1.2.3.4"), "2026-11-16"), true);
  assert.equal(await ipLimited(env, req("5.6.7.8"), "2026-11-16"), false);
});

test("le compteur repart le lendemain et les vieilles empreintes sont effacées", async () => {
  const env = { DB: fakeDB(), MAIL_IP_DAILY_LIMIT: "1" };
  await ipLimited(env, req("1.2.3.4"), "2026-11-14");
  assert.equal(await ipLimited(env, req("1.2.3.4"), "2026-11-14"), true);
  assert.equal(await ipLimited(env, req("1.2.3.4"), "2026-11-16"), false);
  assert.equal(env.DB.rows.size, 1);
});

test("jamais bloquant en cas de doute : pas d'IP, limite coupée, base en panne", async () => {
  assert.equal(await ipLimited({ DB: fakeDB() }, req("")), false);
  assert.equal(await ipLimited({ DB: fakeDB(), MAIL_IP_DAILY_LIMIT: "0" }, req("1.2.3.4")), false);
  assert.equal(await ipLimited({ DB: { prepare() { throw new Error("panne"); } } }, req("1.2.3.4")), false);
});

test("l'empreinte change chaque jour et ne contient pas l'IP", async () => {
  const a = await ipKey("1.2.3.4", "2026-11-16"), b = await ipKey("1.2.3.4", "2026-11-17");
  assert.notEqual(a, b);
  assert.ok(!a.includes("1.2.3.4"));
});
