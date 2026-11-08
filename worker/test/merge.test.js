// Tests de la fusion des données entre appareils. Lancer : npm test (dans worker/).
import test from "node:test";
import assert from "node:assert/strict";
import { mergeState, streakOf } from "../src/util.js";

test("union des jours et des dossiers, lecture la plus avancée", () => {
  const a = { visited: ["2026-11-06", "2026-11-07"], dossiers: ["2026-11-06"], reads: [{ date: "2026-11-07", fid: "dossier", max: 3 }] };
  const b = { visited: ["2026-11-08"], dossiers: ["2026-11-08"], reads: [{ date: "2026-11-07", fid: "dossier", max: 9, theme: "Littérature" }] };
  const m = mergeState(a, b);
  assert.deepEqual(m.visited, ["2026-11-06", "2026-11-07", "2026-11-08"]);
  assert.deepEqual(m.dossiers, ["2026-11-06", "2026-11-08"]);
  assert.equal(m.reads[0].max, 9);
  assert.equal(m.reads[0].theme, "Littérature");
});

test("un favori retiré ne revient pas, un favori remis après le retrait reste", () => {
  const fav = { date: "2026-11-07", fid: "insolite", type: "bd", title: "T", t: 100 };
  const removed = mergeState({ favs: [fav] }, { favs: [], favsOff: { "2026-11-07|insolite|bd": 200 } });
  assert.equal(removed.favs.length, 0);
  const again = mergeState(removed, { favs: [{ ...fav, t: 300 }] });
  assert.equal(again.favs.length, 1);
  const old = mergeState({ favs: [{ date: "2026-11-01", fid: "actu", type: "bd" }] }, {});
  assert.equal(old.favs.length, 1, "un ancien favori sans date est gardé");
});

test("jeu : la partie finie l'emporte, sinon la plus avancée", () => {
  const m = mergeState({ quiz: { d1: { a: [1, null], done: false }, d2: { a: [1], done: false } } },
                       { quiz: { d1: { a: [1, 2, 0], s: 2, done: true }, d2: { a: [1, 0, 2], done: false } } });
  assert.equal(m.quiz.d1.done, true);
  assert.equal(m.quiz.d2.a.length, 3);
});

test("série", () => {
  assert.equal(streakOf(["2026-11-06", "2026-11-07", "2026-11-08"], "2026-11-08"), 3);
  assert.equal(streakOf(["2026-11-06", "2026-11-07"], "2026-11-08"), 2);
  assert.equal(streakOf(["2026-11-05"], "2026-11-08"), 0);
});
