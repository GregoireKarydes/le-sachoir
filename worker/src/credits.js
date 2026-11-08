// Dossiers débloqués : crédits (newsletter confirmée, parrainage), déblocage, contenu Premium servi aux ayants droit.
import { nowIso, parisDay, randomToken } from "./util.js";

const FREE_CASES = 4;
const REF_CAP_30D = 30; // plafond de dossiers gagnés par parrainage sur 30 jours (anti-abus)
export const DEVICE_RE = /^[a-z0-9]{8,40}$/i;

export const ownerOf = (user, device) => user ? `u:${user.id}` : (DEVICE_RE.test(device || "") ? `d:${device}` : null);
const owners = (user, device) => [user && `u:${user.id}`, DEVICE_RE.test(device || "") && `d:${device}`].filter(Boolean);
export const premiumOn = (u, today = parisDay()) => !!u && !!u.premium && (!u.premium_until || u.premium_until >= today);

export async function refCode(env, owner) {
  const row = await env.DB.prepare("SELECT code FROM refcodes WHERE owner = ? ORDER BY created_at LIMIT 1").bind(owner).first();
  if (row) return row.code;
  const code = randomToken(6).replace(/[-_]/g, "x").slice(0, 8).toLowerCase();
  await env.DB.prepare("INSERT INTO refcodes (code, owner, created_at) VALUES (?, ?, ?)").bind(code, owner, nowIso()).run();
  return code;
}

export async function wallet(env, user, device) {
  const os = owners(user, device);
  if (!os.length) return { credits: 0, unlocked: [], ref: null, referrals: 0 };
  const ph = os.map(() => "?").join(",");
  const [g, u, r] = await env.DB.batch([
    env.DB.prepare(`SELECT reason, COUNT(*) AS n FROM grants WHERE owner IN (${ph}) GROUP BY reason`).bind(...os),
    env.DB.prepare(`SELECT DISTINCT ed FROM unlocks WHERE owner IN (${ph}) ORDER BY ed`).bind(...os),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM grants WHERE owner IN (${ph}) AND reason = 'referral'`).bind(...os),
  ]);
  const earned = g.results.reduce((t, x) => t + x.n, 0);
  const unlocked = u.results.map(x => x.ed);
  return { credits: Math.max(0, earned - unlocked.length), unlocked, ref: await refCode(env, os[0]), referrals: r.results[0]?.n || 0,
           newsletterGift: g.results.some(x => x.reason === "newsletter") };
}

/* Donne un crédit, une seule fois par clé. */
export async function grant(env, key, owner, reason) {
  if (!owner) return false;
  const r = await env.DB.prepare("INSERT OR IGNORE INTO grants (key, owner, reason, created_at) VALUES (?, ?, ?, ?)").bind(key, owner, reason, nowIso()).run();
  return !!r.meta.changes;
}

/* Newsletter confirmée : un dossier offert, une fois par adresse et une fois par appareil ou compte. */
export async function grantNewsletter(env, email, owner) {
  if (!owner) return false;
  const had = await env.DB.prepare("SELECT 1 FROM grants WHERE owner = ? AND reason = 'newsletter' LIMIT 1").bind(owner).first();
  return had ? false : grant(env, `nl:${email}`, owner, "newsletter");
}

/* Parrainage : le filleul (e-mail vérifié) rapporte un dossier au parrain, sauf à lui-même. */
export async function rewardReferral(env, code, email, newOwners = []) {
  if (!code) return false;
  const ref = await env.DB.prepare("SELECT owner FROM refcodes WHERE code = ?").bind(String(code).slice(0, 16)).first();
  if (!ref || newOwners.includes(ref.owner) || ref.owner === `e:${email}`) return false;
  if (ref.owner.startsWith("u:")) {
    const u = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(ref.owner.slice(2)).first();
    if (u?.email === email) return false;
    // Un appareil déjà lié au compte du parrain ne peut pas être son propre filleul.
    for (const o of newOwners.filter(x => x.startsWith("d:"))) {
      const d = await env.DB.prepare("SELECT user_id FROM devices WHERE device = ?").bind(o.slice(2)).first();
      if (d?.user_id === ref.owner.slice(2)) return false;
    }
  }
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const n = (await env.DB.prepare("SELECT COUNT(*) AS n FROM grants WHERE owner = ? AND reason = 'referral' AND created_at > ?").bind(ref.owner, since).first()).n;
  if (n >= REF_CAP_30D) return false;
  return grant(env, `ref:${email}`, ref.owner, "referral");
}

/* À la connexion : tout ce qui appartenait à l'appareil ou à l'adresse rejoint le compte. */
export async function mergeOwners(env, user, device) {
  const u = `u:${user.id}`, from = [`e:${user.email}`, DEVICE_RE.test(device || "") && `d:${device}`].filter(Boolean);
  const st = [];
  for (const o of from) {
    st.push(env.DB.prepare("UPDATE grants SET owner = ? WHERE owner = ?").bind(u, o));
    st.push(env.DB.prepare("INSERT OR IGNORE INTO unlocks (owner, ed, created_at) SELECT ?, ed, created_at FROM unlocks WHERE owner = ?").bind(u, o));
    st.push(env.DB.prepare("DELETE FROM unlocks WHERE owner = ?").bind(o));
    st.push(env.DB.prepare("UPDATE refcodes SET owner = ? WHERE owner = ?").bind(u, o));
    st.push(env.DB.prepare("UPDATE subscribers SET owner = ? WHERE owner = ?").bind(u, o));
  }
  if (st.length) await env.DB.batch(st);
}

export async function unlock(env, user, device, ed) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ed || "")) return { error: "Date invalide." };
  const owner = ownerOf(user, device);
  if (!owner) return { error: "Appareil inconnu." };
  const w = await wallet(env, user, device);
  if (premiumOn(user) || w.unlocked.includes(ed)) return { ok: true, credits: w.credits };
  if (w.credits < 1) return { error: "Plus de dossier à débloquer. Invitez un ami pour en gagner un !", code: "no_credit" };
  await env.DB.prepare("INSERT OR IGNORE INTO unlocks (owner, ed, created_at) VALUES (?, ?, ?)").bind(owner, ed, nowIso()).run();
  return { ok: true, credits: w.credits - 1 };
}

/* ---------- Contenu Premium : la suite du Grand Dossier ---------- */
async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SIGNING_KEY || "dev-signing-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "").slice(0, 32);
}
const contentBase = env => (env.CONTENT_URL || "https://raw.githubusercontent.com/GregoireKarydes/le-sachoir/main/").replace(/\/?$/, "/");
const ghHeaders = env => env.GITHUB_TOKEN ? { authorization: `token ${env.GITHUB_TOKEN}`, accept: "application/vnd.github.raw" } : {};

async function signedImg(env, ed, file) {
  const p = `${ed}/${file}`, e = Math.floor(Date.now() / 1000) + 86400;
  return `${env.API_URL}/premium/img?p=${encodeURIComponent(p)}&e=${e}&s=${await hmac(env, `${p}|${e}`)}`;
}

export async function premiumDossier(env, user, device, ed) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ed || "")) return { status: 400, body: { error: "Date invalide." } };
  const w = await wallet(env, user, device);
  if (!premiumOn(user) && !w.unlocked.includes(ed)) return { status: 402, body: { error: "Dossier verrouillé.", credits: w.credits } };
  const r = await fetch(`${contentBase(env)}editions/${ed}/edition.json`, { headers: ghHeaders(env), cf: { cacheTtl: 300 } });
  if (!r.ok) return { status: 404, body: { error: "Dossier introuvable." } };
  const f = ((await r.json()).formats || []).find(x => x.id === "dossier");
  if (!f) return { status: 404, body: { error: "Dossier introuvable." } };
  const rest = (f.cases || []).slice(FREE_CASES);
  for (const c of rest) {
    if (c.image?.file && c.image.status === "done") c.image.src = await signedImg(env, ed, c.image.file);
    if (c.photo?.file && c.photo.status === "done") c.photo.src = await signedImg(env, ed, c.photo.file);
    if (c.image) delete c.image.prompt;
  }
  return { status: 200, body: { ed, cases: rest, total: (f.cases || []).length } };
}

export async function premiumImg(env, url, ctx) {
  const p = url.searchParams.get("p") || "", e = +url.searchParams.get("e") || 0, s = url.searchParams.get("s") || "";
  if (!/^\d{4}-\d{2}-\d{2}\/images\/[\w.-]+\.(webp|png|jpe?g)$/.test(p) || e < Date.now() / 1000 || s !== await hmac(env, `${p}|${e}`))
    return new Response("Lien expiré", { status: 403 });
  const cache = caches.default, key = new Request(`https://sachoir-cache/${p}`);
  let res = await cache.match(key);
  if (!res) {
    const r = await fetch(`${contentBase(env)}editions/${p}`, { headers: ghHeaders(env) });
    if (!r.ok) return new Response("Introuvable", { status: 404 });
    res = new Response(r.body, { headers: { "content-type": p.endsWith(".webp") ? "image/webp" : p.endsWith(".png") ? "image/png" : "image/jpeg", "cache-control": "public, max-age=604800" } });
    ctx?.waitUntil(cache.put(key, res.clone()));
  }
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "private, max-age=86400");
  return out;
}
