/* Notifications push du Sachoir (Web Push : arrivent même quand l'appli est fermée).
   - Clé VAPID (P-256) tirée au hasard au premier besoin et gardée dans D1 (table settings) : rien à configurer.
   - Messages chiffrés selon RFC 8291 (aes128gcm) et signés selon RFC 8292 (VAPID), avec la WebCrypto du Worker.
   - Une notification par jour, quand l'édition est publiée, jamais avant PUSH_FROM (7 h 30 par défaut, heure de Paris).
   - Offre gratuite Cloudflare (50 sous-requêtes et ~10 ms de CPU par passage) : l'envoi est découpé en lots
     de PUSH_BATCH appareils, chacun traité par un passage séparé du Worker (liaison SELF vers lui-même). */
import { nowIso, parisDay } from "./util.js";

const enc = new TextEncoder();
export const PUSH_BATCH = 20;
const MAX_LOTS = 30; // + newsletter et lecture de l'édition : on reste sous les 50 sous-requêtes du passage
// Services push connus : on n'envoie rien ailleurs (pas de requête vers une adresse choisie par un inconnu).
const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)(:\d+)?\//i;

export const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = s => { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(s + "=".repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0)); };
const cat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

/* ---------- Clé VAPID ---------- */
export async function newVapid() {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { pub: b64u(await crypto.subtle.exportKey("raw", k.publicKey)), jwk: await crypto.subtle.exportKey("jwk", k.privateKey) };
}
let VAPID = null;
export async function vapid(env) {
  if (VAPID) return VAPID;
  let row = await env.DB.prepare("SELECT v FROM settings WHERE k = 'vapid'").first();
  if (!row) {
    await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES ('vapid', ?)").bind(JSON.stringify(await newVapid())).run();
    row = await env.DB.prepare("SELECT v FROM settings WHERE k = 'vapid'").first();
  }
  const v = JSON.parse(row.v);
  VAPID = { pub: v.pub, key: await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]) };
  return VAPID;
}
export async function vapidJwt(v, endpoint, subject) {
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, v.key, enc.encode(`${head}.${claims}`));
  return `${head}.${claims}.${b64u(sig)}`;
}

/* ---------- Chiffrement du message (RFC 8291) ---------- */
async function hkdf(salt, ikm, info, bytes) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bytes * 8));
}
// Clé éphémère du serveur : une par lot (le sel, lui, change à chaque message).
export async function ephemeral() {
  const k = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  return { priv: k.privateKey, pub: new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey)) };
}
export async function encrypt(sub, payload, eph) {
  eph = eph || await ephemeral();
  const ua = unb64u(sub.p256dh), auth = unb64u(sub.auth);
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.priv, 256));
  const ikm = await hkdf(auth, shared, cat(enc.encode("WebPush: info\0"), ua, eph.pub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const data = cat(enc.encode(typeof payload === "string" ? payload : JSON.stringify(payload)), new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, data));
  const head = new Uint8Array(21); head.set(salt); new DataView(head.buffer).setUint32(16, 4096); head[20] = eph.pub.length;
  return cat(head, eph.pub, ct);
}

/* ---------- Envoi ---------- */
const subject = env => env.APP_URL || "https://gregoirekarydes.github.io/le-sachoir/";
async function sendOne(env, v, sub, payload, eph, jwts = {}) {
  const origin = new URL(sub.endpoint).origin;
  jwts[origin] = jwts[origin] || await vapidJwt(v, sub.endpoint, subject(env));
  try {
    const r = await fetch(sub.endpoint, {
      method: "POST", body: await encrypt(sub, payload, eph),
      headers: { authorization: `vapid t=${jwts[origin]}, k=${v.pub}`, ttl: "43200", urgency: "normal", topic: payload.tag || "sachoir", "content-encoding": "aes128gcm", "content-type": "application/octet-stream" },
    });
    return r.status;
  } catch (e) { return 0; }
}
// Résultat : envoyé, adresse morte (appareil désabonné : on l'efface) ou échec passager (on réessaiera).
async function settle(env, sub, status, day) {
  if (status >= 200 && status < 300) { await env.DB.prepare("UPDATE push_subs SET last_ok = ?, fails = 0 WHERE id = ?").bind(nowIso(), sub.id).run(); return "sent"; }
  if ([400, 403, 404, 410].includes(status) || sub.fails >= 20) { await env.DB.prepare("DELETE FROM push_subs WHERE id = ?").bind(sub.id).run(); return "gone"; }
  // Échec passager (service saturé, réseau) : l'appareil repasse dans la file du jour.
  await env.DB.prepare(day ? "UPDATE push_subs SET fails = fails + 1, last_day = NULL WHERE id = ?" : "UPDATE push_subs SET fails = fails + 1 WHERE id = ?").bind(sub.id).run();
  return "failed";
}

/* ---------- Abonnement ---------- */
export const pushOn = env => !!env.DB;
export async function pushSubscribe(env, b, user, ctx) {
  const s = b.sub || {}, endpoint = String(s.endpoint || ""), p256dh = String(s.keys?.p256dh || ""), auth = String(s.keys?.auth || "");
  if (!PUSH_HOSTS.test(endpoint) || endpoint.length > 1000) return { error: "Service de notification inconnu." };
  if (!/^[\w-]{80,100}$/.test(p256dh) || !/^[\w-]{16,32}$/.test(auth)) return { error: "Abonnement illisible." };
  const device = /^[a-z0-9]{8,40}$/i.test(String(b.d || "")) ? String(b.d) : null, day = parisDay();
  // Si la notification du jour est déjà partie, le nouvel abonné attend celle de demain.
  const done = await env.DB.prepare("SELECT 1 FROM push_runs WHERE day = ?").bind(day).first();
  const old = await env.DB.prepare("SELECT id FROM push_subs WHERE endpoint = ?").bind(endpoint).first();
  await env.DB.prepare(`INSERT INTO push_subs (endpoint, p256dh, auth, device, user_id, created_at, last_day) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, device = COALESCE(excluded.device, push_subs.device), user_id = COALESCE(excluded.user_id, push_subs.user_id), fails = 0`)
    .bind(endpoint, p256dh, auth, device, user?.id || null, nowIso(), done ? day : null).run();
  // Premier abonnement de cet appareil : une notification tout de suite, pour prouver que ça marche.
  if (!old && b.hello !== false) {
    const v = await vapid(env), sub = { endpoint, p256dh, auth };
    const p = sendOne(env, v, sub, { title: "C’est branché 🔔", body: "On toquera une fois par jour, quand l’édition sort. Jamais à 3 h du matin, juré sur la tête de Napoléon.", url: subject(env), tag: "hello" });
    ctx?.waitUntil ? ctx.waitUntil(p) : await p;
  }
  return { ok: true };
}
export async function pushUnsubscribe(env, b) {
  const endpoint = String(b.endpoint || "");
  if (endpoint) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(endpoint).run();
  return { ok: true };
}

/* ---------- La notification du jour ---------- */
const TITLES = [
  "☕ L’édition du jour est servie",
  "🔔 Toc toc. C’est la culture G.",
  "✏️ Fraîchement sortie du crayon",
  "🥐 Plus croustillant qu’un croissant",
  "🧠 Votre cerveau a demandé du rab",
  "💡 Votre dose de « en fait, techniquement… »",
  "📰 L’édition du jour vient d’atterrir",
  "🦉 Minerve vous attend (elle s’impatiente)",
];
export function editionPayload(env, ed) {
  const n = Math.round(Date.parse(ed.day + "T12:00:00Z") / 86400e3);
  const names = ed.stories.map(f => (f.title || "").trim()).filter(Boolean).slice(0, 3);
  let body = names.length ? `Au menu : ${names.length > 1 ? names.slice(0, -1).join(", ") + " et " + names.at(-1) : names[0]}.` : "Une nouvelle édition vous attend.";
  if (ed.formats.some(f => f.id === "quiz")) body += " Plus le jeu du jour.";
  if (body.length > 170) body = body.slice(0, 167).replace(/\s+\S*$/, "") + "…";
  return { title: TITLES[((n % TITLES.length) + TITLES.length) % TITLES.length], body, url: `${subject(env)}?d=${ed.day}&from=push`, tag: "edition", day: ed.day };
}
// Heure de Paris en minutes depuis minuit.
const parisMinutes = (d = new Date()) => { const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d).split(":").map(Number); return h * 60 + m; };
const fromMinutes = env => { const m = String(env.PUSH_FROM || "07:30").match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : 450; };

// Appelée par la tâche planifiée : prépare les lots et les fait partir (chacun dans son propre passage du Worker).
export async function pushDaily(env, ed, { force = false } = {}) {
  if (!ed || !ed.stories.length) return { skipped: "pas d'édition publiée" };
  if (!force && parisMinutes() < fromMinutes(env)) return { skipped: "trop tôt pour réveiller les lecteurs" };
  const day = ed.day, payload = editionPayload(env, ed);
  await env.DB.prepare("INSERT OR IGNORE INTO push_runs (day, started_at, title) VALUES (?, ?, ?)").bind(day, nowIso(), payload.title).run();
  const ids = (await env.DB.prepare("SELECT id FROM push_subs WHERE last_day IS NULL OR last_day < ? ORDER BY id LIMIT ?").bind(day, PUSH_BATCH * MAX_LOTS).all()).results.map(r => r.id);
  if (!ids.length) return { ok: true, pending: 0 };
  const lots = [];
  for (let i = 0; i < ids.length; i += PUSH_BATCH) lots.push(ids.slice(i, i + PUSH_BATCH));
  if (!env.SELF || !env.SIGNING_KEY) return { ok: true, inline: await pushBatch(env, day, lots[0], payload), lots: 1 };
  const key = await internalKey(env, day);
  const res = await Promise.all(lots.map(l => env.SELF.fetch("https://self/push/run", { method: "POST", headers: { "content-type": "application/json", "x-sachoir-key": key }, body: JSON.stringify({ day, ids: l, payload }) })
    .then(r => r.json()).catch(e => ({ error: String(e) }))));
  return { ok: true, lots: lots.length, res };
}
export async function internalKey(env, day) {
  const k = await crypto.subtle.importKey("raw", enc.encode(env.SIGNING_KEY || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", k, enc.encode("push:" + day)));
}
// Un lot : on « réserve » les appareils (last_day = jour) pour ne jamais envoyer deux fois, puis on envoie.
export async function pushBatch(env, day, ids, payload) {
  ids = (ids || []).map(Number).filter(Number.isInteger).slice(0, PUSH_BATCH);
  if (!ids.length) return { sent: 0 };
  const marks = ids.map(() => "?").join(",");
  const subs = (await env.DB.prepare(`UPDATE push_subs SET last_day = ? WHERE id IN (${marks}) AND (last_day IS NULL OR last_day < ?) RETURNING id, endpoint, p256dh, auth, fails`).bind(day, ...ids, day).all()).results;
  const v = await vapid(env), eph = await ephemeral(), jwts = {}, out = { sent: 0, failed: 0, gone: 0 };
  for (const s of subs) out[await settle(env, s, await sendOne(env, v, s, payload, eph, jwts), day)]++;
  await env.DB.prepare("UPDATE push_runs SET sent = sent + ?, failed = failed + ?, gone = gone + ? WHERE day = ?").bind(out.sent, out.failed, out.gone, day).run();
  return out;
}
// Message aux comptes admin (ADMIN_EMAILS) sur tous leurs appareils abonnés : l'Actu de demain à relire.
export async function notifyAdmins(env, payload) {
  const emails = (env.ADMIN_EMAILS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return { devices: 0 };
  const subs = (await env.DB.prepare(`SELECT p.id, p.endpoint, p.p256dh, p.auth, p.fails, p.last_day FROM push_subs p JOIN users u ON u.id = p.user_id WHERE lower(u.email) IN (${emails.map(() => "?").join(",")})`).bind(...emails).all()).results;
  const v = await vapid(env), eph = await ephemeral(), jwts = {}, out = { sent: 0, failed: 0, gone: 0, devices: subs.length };
  for (const s of subs) out[await settle(env, s, await sendOne(env, v, s, payload, eph, jwts), null)]++;
  return out;
}
// Test depuis l'écran admin : envoie la notification du jour à tous les appareils d'un compte.
export async function pushTest(env, user, payload) {
  const subs = (await env.DB.prepare("SELECT id, endpoint, p256dh, auth, fails, last_day FROM push_subs WHERE user_id = ?").bind(user.id).all()).results;
  const v = await vapid(env), eph = await ephemeral(), jwts = {}, out = { sent: 0, failed: 0, gone: 0, devices: subs.length };
  for (const s of subs) out[await settle(env, s, await sendOne(env, v, s, { ...payload, title: "[Test] " + payload.title }, eph, jwts), null)]++;
  return out;
}
