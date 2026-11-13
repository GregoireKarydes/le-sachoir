// Notifications push : le message chiffré se déchiffre côté téléphone (RFC 8291) et la signature VAPID est valide. Lancer : npm test
import test from "node:test";
import assert from "node:assert/strict";
import { b64u, unb64u, newVapid, vapidJwt, encrypt, ephemeral, editionPayload } from "../src/push.js";

const enc = new TextEncoder();
async function hkdf(salt, ikm, info, n) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, n * 8));
}
const cat = (...p) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };

// Ce que fait le navigateur à la réception.
async function decrypt(body, ua, auth) {
  const salt = body.slice(0, 16), rs = new DataView(body.buffer, body.byteOffset).getUint32(16), idlen = body[20];
  const asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  assert.equal(rs, 4096);
  const asKey = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256));
  const uaPub = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
  const ikm = await hkdf(auth, shared, cat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct));
  assert.equal(pt.at(-1), 2, "délimiteur de dernier enregistrement");
  return new TextDecoder().decode(pt.slice(0, -1));
}

test("le message chiffré se déchiffre avec les clés du téléphone", async () => {
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const sub = { p256dh: b64u(await crypto.subtle.exportKey("raw", ua.publicKey)), auth: b64u(auth) };
  const payload = { title: "☕ L’édition du jour est servie", body: "Au menu : Les atomes.", url: "https://x/?d=2026-11-13" };
  const eph = await ephemeral();
  const a = await encrypt(sub, payload, eph), b = await encrypt(sub, payload, eph);
  assert.deepEqual(JSON.parse(await decrypt(a, ua, auth)), payload);
  assert.notDeepEqual(a.slice(0, 16), b.slice(0, 16), "un sel neuf par message");
});

test("le jeton VAPID est signé par la clé publique annoncée", async () => {
  const v0 = await newVapid();
  const key = await crypto.subtle.importKey("jwk", v0.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const jwt = await vapidJwt({ pub: v0.pub, key }, "https://fcm.googleapis.com/fcm/send/abc", "https://app/");
  const [h, c, s] = jwt.split(".");
  const claims = JSON.parse(new TextDecoder().decode(unb64u(c)));
  assert.equal(claims.aud, "https://fcm.googleapis.com");
  assert.ok(claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 24 * 3600);
  const pub = await crypto.subtle.importKey("raw", unb64u(v0.pub), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, unb64u(s), enc.encode(`${h}.${c}`)));
  assert.equal(unb64u(v0.pub).length, 65);
});

test("la notification du jour annonce les BD et le jeu", () => {
  const ed = { day: "2026-11-13", formats: [{ id: "dossier", title: "La guerre froide" }, { id: "cultureg", title: "Pourquoi le ciel est bleu" }, { id: "quiz", title: "Quiz" }] };
  ed.stories = ed.formats.filter(f => f.id !== "quiz");
  const p = editionPayload({ APP_URL: "https://app/" }, ed);
  assert.equal(p.body, "Au menu : La guerre froide et Pourquoi le ciel est bleu. Plus le jeu du jour.");
  assert.equal(p.url, "https://app/?d=2026-11-13&from=push");
  assert.ok(p.title.length > 5);
});
