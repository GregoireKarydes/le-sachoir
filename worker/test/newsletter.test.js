// Newsletter : Premium chaque matin, abonnés gratuits le jour gratuit seulement, réserve pour les connexions. Lancer : npm test
import test from "node:test";
import assert from "node:assert/strict";
import { nlRecipients, weekday, mailReserve, nlFreeDay, newsletterMail, welcomeMail } from "../src/mail.js";

const subs = [{ email: "a@x.fr", premium: false }, { email: "p@x.fr", premium: true }, { email: "b@x.fr", premium: false }];

test("le 15 novembre 2026 est un dimanche", () => assert.equal(weekday("2026-11-15"), 0));

test("en semaine, seuls les Premium reçoivent la newsletter", () => {
  const r = nlRecipients(subs, { day: "2026-11-16", freeDay: 0, room: 100 });
  assert.deepEqual(r.list.map(s => s.email), ["p@x.fr"]);
  assert.equal(r.isFreeDay, false);
});

test("le jour gratuit, tout le monde la reçoit, Premium en premier si la place manque", () => {
  assert.equal(nlRecipients(subs, { day: "2026-11-15", freeDay: 0, room: 100 }).list.length, 3);
  const r = nlRecipients(subs, { day: "2026-11-15", freeDay: 0, room: 2 });
  assert.deepEqual(r.list.map(s => s.email), ["p@x.fr", "a@x.fr"]);
  assert.equal(r.wanted, 3);
});

test("réglages par défaut : réserve de 40 e-mails, newsletter gratuite le dimanche", () => {
  assert.equal(mailReserve({}), 40);
  assert.equal(mailReserve({ MAIL_LOGIN_RESERVE: "0" }), 0);
  assert.equal(nlFreeDay({}), 0);
  assert.equal(nlFreeDay({ NL_FREE_DAY: "6" }), 6);
  assert.equal(nlFreeDay({ NL_FREE_DAY: "9" }), 0);
});

test("seule la version gratuite porte l'encart Premium", () => {
  const ed = { day: "2026-11-15", formats: [{ id: "actu", title: "L'Actu" }], nl: {} };
  ed.stories = ed.formats;
  const env = { APP_URL: "https://app/", API_URL: "https://api" };
  const free = newsletterMail(env, ed, { premium: false }), prem = newsletterMail(env, ed);
  assert.match(free.html, /newsletter du dimanche/);
  assert.match(free.html, /\?premium=1/);
  assert.doesNotMatch(prem.html, /\?premium=1/);
  assert.match(free.text, /Chaque matin avec Premium/);
});

test("le mail de bienvenue annonce le bon rythme", () => {
  const env = { APP_URL: "https://app/" };
  assert.match(welcomeMail(env, { unsubUrl: "u" }).text, /Chaque dimanche matin/);
  assert.match(welcomeMail(env, { unsubUrl: "u", premium: true }).text, /Chaque matin/);
});
