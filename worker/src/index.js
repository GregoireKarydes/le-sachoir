/* API du Sachoir (Cloudflare Worker + D1).
   Comptes par lien magique ou code à 6 chiffres, synchro des données de l'appli, Premium donné à la main,
   newsletter quotidienne (Brevo), mesure d'audience anonyme et indicateurs de l'écran admin. */
import { nowIso, parisDay, parisHour, shiftDay, addSeconds, randomToken, randomCode, sha256, EMAIL_RE, normEmail, mergeState, streakOf, esc } from "./util.js";
import { brevoSend, loginMail, welcomeMail, confirmMail, newsletterMail, loadEdition, page, btn, h1, mailLimit } from "./mail.js";
import { adminQueue, adminItem } from "./credits.js";
import { ownerOf, wallet, grant, grantNewsletter, rewardReferral, mergeOwners, unlock, premiumDossier, premiumImg, refCode, DEVICE_RE } from "./credits.js";
import { PLANS, stripeOn, checkout, confirm as payConfirm, checkPending, webhook, setCancel, portal, cancelNow } from "./pay.js";

const SESSION_DAYS = 365;
const EVENT_TYPES = new Set(["open", "read", "done", "depth", "game", "share", "fav", "install", "paywall"]);
const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), c => c.charCodeAt(0));

/* ---------- Réponses et CORS ---------- */
function cors(req, env) {
  const o = req.headers.get("origin") || "";
  const allowed = (env.APP_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(o) || (env.DEV === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
  return ok ? { "access-control-allow-origin": o, "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-max-age": "86400", vary: "origin" } : {};
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const err = (msg, status = 400) => json({ error: msg }, status);
async function body(req) { try { return await req.json(); } catch (e) { return {}; } }

/* ---------- Comptes ---------- */
const isAdminEmail = (env, email) => (env.ADMIN_EMAILS || "").split(",").map(normEmail).includes(normEmail(email));
const premiumOn = (u, today = parisDay()) => !!u.premium && (!u.premium_until || u.premium_until >= today);

async function currentUser(req, env) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/);
  if (!m) return null;
  const h = await sha256(m[1]);
  const u = await env.DB.prepare("SELECT u.*, s.token_hash AS sid FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?").bind(h, nowIso()).first();
  if (u && u.last_seen?.slice(0, 10) !== nowIso().slice(0, 10)) await env.DB.prepare("UPDATE users SET last_seen = ? WHERE id = ?").bind(nowIso(), u.id).run();
  return u;
}
async function publicUser(env, u) {
  const sub = await env.DB.prepare("SELECT status FROM subscribers WHERE email = ?").bind(u.email).first();
  const subscription = u.stripe_sub && u.sub_status !== "canceled"
    ? { plan: u.sub_plan, status: u.sub_status, cancel_at_end: !!u.sub_cancel_at_end, period_end: u.sub_period_end } : null;
  return { email: u.email, name: u.name, premium: premiumOn(u), premium_until: u.premium_until || null, subscription, newsletter: sub?.status === "active", admin: isAdminEmail(env, u.email), since: u.created_at.slice(0, 10) };
}
async function mailsToday(env) {
  return (await env.DB.prepare("SELECT COUNT(*) AS n FROM mails WHERE day = ?").bind(parisDay()).first()).n;
}

async function authRequest(req, env) {
  const b = await body(req), email = normEmail(b.email);
  if (!EMAIL_RE.test(email)) return err("Adresse e-mail invalide.");
  const since = new Date(Date.now() - 3600e3).toISOString();
  const recent = (await env.DB.prepare("SELECT COUNT(*) AS n FROM logins WHERE email = ? AND created_at > ?").bind(email, since).first()).n;
  if (recent >= 5) return err("Trop de demandes. Réessayez dans une heure (ou utilisez le dernier code reçu).", 429);
  if (await mailsToday(env) >= mailLimit(env)) return err("Le facteur est débordé aujourd'hui. Réessayez demain.", 503);
  const token = randomToken(), code = randomCode(), th = await sha256(token);
  await env.DB.prepare("INSERT INTO logins (email, token_hash, code_hash, newsletter, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(email, th, await sha256(th + code), b.newsletter ? 1 : 0, nowIso(), addSeconds(900)).run();
  const link = `${env.APP_URL}?login=${token}`;
  const m = loginMail(env, { link, code });
  const sent = await brevoSend(env, { to: email, ...m, tag: "login" });
  if (!sent.ok) { console.error(sent.error); return err("L'e-mail n'a pas pu partir. Réessayez dans un instant.", 502); }
  await env.DB.prepare("INSERT INTO mails (kind, day, email, sent_at) VALUES ('login', ?, ?, ?)").bind(parisDay(), email, nowIso()).run();
  return json({ ok: true, ...(env.DEV === "1" ? { dev_code: code, dev_token: token } : {}) });
}

async function authVerify(req, env) {
  const b = await body(req);
  let login;
  if (b.token) {
    login = await env.DB.prepare("SELECT * FROM logins WHERE token_hash = ?").bind(await sha256(String(b.token))).first();
  } else {
    const email = normEmail(b.email), code = String(b.code || "").replace(/\D/g, "");
    login = await env.DB.prepare("SELECT * FROM logins WHERE email = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1").bind(email).first();
    if (login) {
      if (login.attempts >= 5) return err("Trop d'essais. Demandez un nouveau code.", 429);
      if (await sha256(login.token_hash + code) !== login.code_hash) {
        await env.DB.prepare("UPDATE logins SET attempts = attempts + 1 WHERE id = ?").bind(login.id).run();
        return err("Code incorrect. Même Champollion s'est trompé au début.", 401);
      }
    }
  }
  if (!login || login.used_at || login.expires_at < nowIso()) return err("Lien ou code expiré. Demandez-en un nouveau.", 401);
  await env.DB.prepare("UPDATE logins SET used_at = ? WHERE id = ?").bind(nowIso(), login.id).run();

  let u = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(login.email).first();
  const isNew = !u;
  if (!u) {
    u = { id: crypto.randomUUID(), email: login.email, name: String(b.name || "").slice(0, 24), created_at: nowIso(), premium: 0, premium_until: null };
    await env.DB.prepare("INSERT INTO users (id, email, name, created_at, last_seen, source) VALUES (?, ?, ?, ?, ?, ?)").bind(u.id, u.email, u.name, u.created_at, u.created_at, String(b.source || "app").slice(0, 20)).run();
  }
  const device = DEVICE_RE.test(String(b.device || "")) ? String(b.device) : "";
  await mergeOwners(env, u, device);
  if (login.newsletter) await subscribe(env, login.email, "compte", { confirmed: true, owner: `u:${u.id}`, welcome: false });
  if (isNew && b.ref) await rewardReferral(env, b.ref, login.email, [`u:${u.id}`, device && `d:${device}`].filter(Boolean));
  const session = randomToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(session), u.id, nowIso(), addSeconds(SESSION_DAYS * 86400)).run();
  // Données : on fusionne celles du téléphone avec celles du compte.
  const row = await env.DB.prepare("SELECT state FROM user_state WHERE user_id = ?").bind(u.id).first();
  const state = mergeState(row ? JSON.parse(row.state) : {}, b.state || {});
  if (!u.name && state.name) { u.name = state.name; await env.DB.prepare("UPDATE users SET name = ? WHERE id = ?").bind(u.name, u.id).run(); }
  await saveState(env, u.id, state);
  if (device) await env.DB.prepare("INSERT INTO devices (device, first_day, last_day, user_id) VALUES (?, ?, ?, ?) ON CONFLICT(device) DO UPDATE SET user_id = excluded.user_id").bind(device, parisDay(), parisDay(), u.id).run();
  return json({ session, user: await publicUser(env, u), state, created: isNew, wallet: await wallet(env, u, device) });
}

async function saveState(env, uid, state) {
  const s = JSON.stringify(state);
  if (s.length > 400000) throw new Error("state too large");
  await env.DB.prepare("INSERT INTO user_state (user_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at").bind(uid, s, nowIso()).run();
}

/* ---------- Newsletter : abonnement ---------- */
/* Abonnement. Sans compte : double validation (e-mail de confirmation), qui offre un Grand Dossier.
   Avec un compte (adresse déjà vérifiée par le code) : actif tout de suite, dossier offert aussi. */
async function subscribe(env, email, source, { confirmed = false, owner = null, ref = null, welcome = true } = {}) {
  const row = await env.DB.prepare("SELECT * FROM subscribers WHERE email = ?").bind(email).first();
  if (row?.status === "active") { if (confirmed && owner) await grantNewsletter(env, email, owner); return { already: true }; }
  const token = row?.token || randomToken(18);
  if (confirmed) {
    if (row) await env.DB.prepare("UPDATE subscribers SET status = 'active', unsub_at = NULL, source = ?, owner = COALESCE(?, owner), confirmed_at = ? WHERE email = ?").bind(source, owner, nowIso(), email).run();
    else await env.DB.prepare("INSERT INTO subscribers (email, status, token, source, created_at, owner, confirmed_at) VALUES (?, 'active', ?, ?, ?, ?, ?)").bind(email, token, source, nowIso(), owner, nowIso()).run();
    const gift = await grantNewsletter(env, email, owner || `e:${email}`);
    if (welcome) await sendWelcome(env, email, token);
    return { ok: true, active: true, gift };
  }
  if (await mailsToday(env) >= mailLimit(env)) return { error: "Le facteur est débordé aujourd'hui. Réessayez demain." };
  const ct = randomToken(18);
  if (row) await env.DB.prepare("UPDATE subscribers SET status = 'pending', source = ?, owner = COALESCE(?, owner), ref = COALESCE(?, ref), confirm_token = ? WHERE email = ?").bind(source, owner, ref, ct, email).run();
  else await env.DB.prepare("INSERT INTO subscribers (email, status, token, source, created_at, owner, ref, confirm_token) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)").bind(email, token, source, nowIso(), owner, ref, ct).run();
  const m = confirmMail(env, { url: `${env.API_URL}/nl/confirm?t=${ct}` });
  const sent = await brevoSend(env, { to: email, ...m, tag: "confirm" });
  if (!sent.ok) return { error: "L'e-mail n'a pas pu partir. Réessayez dans un instant." };
  await env.DB.prepare("INSERT INTO mails (kind, day, email, sent_at) VALUES ('confirm', ?, ?, ?)").bind(parisDay(), email, nowIso()).run();
  return { ok: true, pending: true, ...(env.DEV === "1" ? { dev_confirm: ct } : {}) };
}
async function sendWelcome(env, email, token) {
  if (await mailsToday(env) >= mailLimit(env)) return;
  const m = welcomeMail(env, { unsubUrl: `${env.API_URL}/nl/unsub?t=${token}` });
  const sent = await brevoSend(env, { to: email, ...m, tag: "welcome" });
  if (sent.ok) await env.DB.prepare("INSERT INTO mails (kind, day, email, sent_at) VALUES ('welcome', ?, ?, ?)").bind(parisDay(), email, nowIso()).run();
}
const unsubscribe = (env, email) => env.DB.prepare("UPDATE subscribers SET status = 'unsub', unsub_at = ? WHERE email = ? AND status = 'active'").bind(nowIso(), email).run();

/* ---------- Newsletter : envoi du jour ---------- */
async function sendNewsletter(env, { day = parisDay(), force = false, testTo = null } = {}) {
  const ed = await loadEdition(env, day);
  if (!ed || !ed.stories.length) return { skipped: "pas d'édition publiée" };
  if (!force && !testTo && ed.stories.length < 3 && parisHour() < 9) return { skipped: "édition incomplète, on attend" };
  const m = newsletterMail(env, ed);
  if (testTo) {
    const t = randomToken(12);
    await env.DB.prepare("INSERT INTO mails (kind, day, email, token, sent_at) VALUES ('test', ?, ?, ?, ?)").bind(day, testTo, t, nowIso()).run();
    const sub = await env.DB.prepare("SELECT token FROM subscribers WHERE email = ?").bind(testTo).first();
    const r = await brevoSend(env, { versions: [{ email: testTo, params: { t, u: sub?.token || "test", r: "test" } }], subject: "[Test] " + m.subject, html: m.html, text: m.text, tag: "newsletter-test" });
    return r.ok ? { ok: true, test: testTo } : { error: r.error };
  }
  const lock = await env.DB.prepare("INSERT OR IGNORE INTO nl_runs (day, status, started_at) VALUES (?, 'sending', ?)").bind(day, nowIso()).run();
  if (!lock.meta.changes) return { skipped: "déjà envoyée" };
  try {
    const subs = (await env.DB.prepare("SELECT email, token, owner FROM subscribers WHERE status = 'active' ORDER BY created_at").all()).results;
    const room = Math.max(0, mailLimit(env) - await mailsToday(env));
    const list = subs.slice(0, room);
    // Lien de parrainage de chaque abonné (créé si besoin), en quelques requêtes groupées.
    const codes = Object.fromEntries((await env.DB.prepare("SELECT owner, MIN(code) AS code FROM refcodes GROUP BY owner").all()).results.map(r => [r.owner, r.code]));
    const fresh = [];
    for (const sub of list) { const o = sub.owner || `e:${sub.email}`; if (!codes[o]) { codes[o] = randomToken(6).replace(/[-_]/g, "x").slice(0, 8).toLowerCase(); fresh.push([codes[o], o]); } }
    for (let i = 0; i < fresh.length; i += 30) {
      const ch = fresh.slice(i, i + 30);
      await env.DB.prepare(`INSERT OR IGNORE INTO refcodes (code, owner, created_at) VALUES ${ch.map(() => "(?, ?, ?)").join(",")}`).bind(...ch.flatMap(([c, o]) => [c, o, nowIso()])).run();
    }
    const versions = list.map(s => ({ email: s.email, params: { t: randomToken(12), u: s.token, r: codes[s.owner || `e:${s.email}`] } }));
    for (let i = 0; i < versions.length; i += 24) {
      const ch = versions.slice(i, i + 24), ts = nowIso();
      await env.DB.prepare(`INSERT INTO mails (kind, day, email, token, sent_at) VALUES ${ch.map(() => "('newsletter', ?, ?, ?, ?)").join(",")}`).bind(...ch.flatMap(v => [day, v.email, v.params.t, ts])).run();
    }
    for (let i = 0; i < versions.length; i += 100) {
      const r = await brevoSend(env, { versions: versions.slice(i, i + 100), subject: m.subject, html: m.html, text: m.text, tag: "newsletter" });
      if (!r.ok) throw new Error(r.error);
    }
    const note = subs.length > list.length ? `quota Brevo atteint : ${subs.length - list.length} abonné(s) non servi(s)` : null;
    await env.DB.prepare("UPDATE nl_runs SET status = 'sent', recipients = ?, finished_at = ?, error = ? WHERE day = ?").bind(list.length, nowIso(), note, day).run();
    return { ok: true, recipients: list.length, note };
  } catch (e) {
    await env.DB.prepare("UPDATE nl_runs SET status = 'failed', finished_at = ?, error = ? WHERE day = ?").bind(nowIso(), String(e.message || e).slice(0, 400), day).run();
    return { error: String(e.message || e) };
  }
}

/* ---------- Mesure d'audience ---------- */
async function track(req, env) {
  const b = await body(req), dev = String(b.d || "");
  if (!/^[a-z0-9]{8,40}$/i.test(dev)) return err("bad device");
  const day = parisDay(), ts = nowIso();
  const evs = (Array.isArray(b.e) ? b.e : []).slice(0, 40).filter(e => EVENT_TYPES.has(e?.t));
  const stmts = [
    env.DB.prepare("INSERT INTO devices (device, first_day, last_day, standalone, desktop) VALUES (?, ?, ?, ?, ?) ON CONFLICT(device) DO UPDATE SET last_day = excluded.last_day, standalone = MAX(devices.standalone, excluded.standalone), desktop = excluded.desktop")
      .bind(dev, day, day, b.s ? 1 : 0, b.k ? 1 : 0),
    env.DB.prepare("INSERT OR IGNORE INTO device_days (device, day) VALUES (?, ?)").bind(dev, day),
    ...evs.map(e => env.DB.prepare("INSERT INTO events (day, ts, device, type, ed, fid, val) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(day, ts, dev, e.t, String(e.ed || "").slice(0, 10), String(e.f || "").slice(0, 12), Math.max(0, Math.min(100000, Math.round(+e.v || 0))))),
  ];
  await env.DB.batch(stmts);
  return new Response(null, { status: 204 });
}

/* ---------- Indicateurs (écran admin) ---------- */
async function kpi(env, days) {
  const today = parisDay(), from = shiftDay(today, -(days - 1)), d7 = shiftDay(today, -6), d30 = shiftDay(today, -29);
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a);
  const [daily, newDev, wau, mau, devMix, ret, evDay, byFmt, top, users, usersDay, nlSubs, nlDay, runs, mailsDay, states, payPlan, payDay, payAll, grantsR, unlocksN, pendingN, subsR, churnN] = await env.DB.batch([
    q("SELECT day, COUNT(*) AS n FROM device_days WHERE day >= ? GROUP BY day", from),
    q("SELECT first_day AS day, COUNT(*) AS n FROM devices WHERE first_day >= ? GROUP BY first_day", from),
    q("SELECT COUNT(DISTINCT device) AS n FROM device_days WHERE day >= ?", d7),
    q("SELECT COUNT(DISTINCT device) AS n FROM device_days WHERE day >= ?", d30),
    q("SELECT COUNT(*) AS n, SUM(standalone) AS app, SUM(desktop) AS pc FROM devices WHERE last_day >= ?", d30),
    q(`SELECT COUNT(*) AS n,
         SUM(EXISTS(SELECT 1 FROM device_days x WHERE x.device = d.device AND x.day = date(d.first_day, '+1 day'))) AS r1,
         SUM(EXISTS(SELECT 1 FROM device_days x WHERE x.device = d.device AND x.day BETWEEN date(d.first_day, '+7 day') AND date(d.first_day, '+13 day'))) AS r7
       FROM devices d WHERE d.first_day BETWEEN ? AND ?`, shiftDay(today, -44), shiftDay(today, -14)),
    q("SELECT day, type, COUNT(*) AS n, COUNT(DISTINCT device) AS u FROM events WHERE day >= ? GROUP BY day, type", from),
    q(`SELECT fid, COUNT(DISTINCT CASE WHEN type = 'read' THEN device || ed END) AS opens,
         COUNT(DISTINCT CASE WHEN type = 'done' THEN device || ed END) AS done,
         AVG(CASE WHEN type = 'depth' THEN val END) AS depth
       FROM events WHERE day >= ? AND fid != '' AND type IN ('read', 'done', 'depth') GROUP BY fid`, from),
    q(`SELECT ed, fid, COUNT(DISTINCT CASE WHEN type = 'read' THEN device END) AS readers, COUNT(DISTINCT CASE WHEN type = 'done' THEN device END) AS done,
         SUM(type = 'share') AS shares, SUM(type = 'fav') AS favs
       FROM events WHERE day >= ? AND fid != '' AND fid != 'quiz' GROUP BY ed, fid ORDER BY readers DESC LIMIT 12`, from),
    q("SELECT COUNT(*) AS n, SUM(created_at >= ?) AS new7, SUM(last_seen >= ?) AS active7, SUM(premium = 1 AND (premium_until IS NULL OR premium_until >= ?)) AS premium FROM users", d7, d7, today),
    q("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY day", from),
    q("SELECT SUM(status = 'active') AS active, SUM(status = 'unsub') AS unsub, SUM(status = 'unsub' AND unsub_at >= ?) AS unsub30, SUM(created_at >= ?) AS new7 FROM subscribers", d30, d7),
    q("SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM subscribers WHERE created_at >= ? GROUP BY day", from),
    q(`SELECT r.day, r.status, r.recipients, r.error, COUNT(m.id) AS sent, COUNT(m.opened_at) AS opened, COUNT(m.clicked_at) AS clicked
       FROM nl_runs r LEFT JOIN mails m ON m.day = r.day AND m.kind = 'newsletter' GROUP BY r.day ORDER BY r.day DESC LIMIT 21`),
    q("SELECT kind, COUNT(*) AS n FROM mails WHERE day = ? GROUP BY kind", today),
    q("SELECT state FROM user_state"),
    q("SELECT plan, COUNT(*) AS n, SUM(amount) AS cents FROM payments WHERE status = 'paid' AND paid_at >= ? GROUP BY plan", from),
    q("SELECT substr(paid_at, 1, 10) AS day, SUM(amount) AS n FROM payments WHERE status = 'paid' AND paid_at >= ? GROUP BY day", from),
    q("SELECT SUM(amount) AS cents, COUNT(*) AS n FROM payments WHERE status = 'paid'"),
    q("SELECT reason, COUNT(*) AS n FROM grants WHERE created_at >= ? GROUP BY reason", from),
    q("SELECT COUNT(*) AS n FROM unlocks WHERE created_at >= ?", from),
    q("SELECT COUNT(*) AS n FROM subscribers WHERE status = 'pending'"),
    q("SELECT sub_plan AS plan, COUNT(*) AS n, SUM(sub_cancel_at_end) AS ending, SUM(sub_status = 'past_due') AS late FROM users WHERE stripe_sub IS NOT NULL AND sub_status IN ('active', 'trialing', 'past_due') GROUP BY sub_plan"),
    q("SELECT COUNT(*) AS n FROM users WHERE sub_status = 'canceled' AND sub_period_end >= ?", from),
  ]);
  const R = x => x.results, F = x => x.results[0] || {};
  // Séries et érudition des comptes (calculées ici, l'appli garde la même règle).
  const streaks = [], eru = [];
  for (const s of R(states)) { try { const st = JSON.parse(s.state); streaks.push(streakOf(st.visited, today)); eru.push((st.dossiers || []).length); } catch (e) {} }
  const dist = (arr, edges) => edges.map(([a, b, label]) => ({ label, n: arr.filter(v => v >= a && v <= b).length }));
  return {
    today, from, days,
    audience: {
      dau: R(daily).find(r => r.day === today)?.n || 0, wau: F(wau).n || 0, mau: F(mau).n || 0,
      devices30: F(devMix).n || 0, app30: F(devMix).app || 0, pc30: F(devMix).pc || 0,
      retention: { cohort: F(ret).n || 0, d1: F(ret).r1 || 0, d7: F(ret).r7 || 0 },
      daily: R(daily), newDevices: R(newDev),
    },
    events: R(evDay), formats: R(byFmt), top: R(top),
    accounts: { ...F(users), daily: R(usersDay),
      streaks: dist(streaks, [[0, 0, "0"], [1, 2, "1-2"], [3, 6, "3-6"], [7, 13, "7-13"], [14, 29, "14-29"], [30, 99, "30-99"], [100, 1e9, "100+"]]),
      erudition: dist(eru, [[0, 0, "0"], [1, 9, "1-9"], [10, 24, "10-24"], [25, 49, "25-49"], [50, 99, "50-99"], [100, 1e9, "100+"]]),
      bestStreak: Math.max(0, ...streaks) },
    newsletter: { ...F(nlSubs), pending: F(pendingN).n || 0, daily: R(nlDay), runs: R(runs) },
    subscriptions: { byPlan: R(subsR), churned: F(churnN).n || 0,
      mrrCents: R(subsR).reduce((t, x) => t + (x.plan === "year" ? Math.round(x.n * PLANS.year.amount / 12) : x.n * PLANS.month.amount), 0) },
    revenue: { stripe: stripeOn(env), byPlan: R(payPlan), daily: R(payDay), totalCents: F(payAll).cents || 0, totalCount: F(payAll).n || 0 },
    credits: { grants: R(grantsR), unlocks: F(unlocksN).n || 0 },
    mails: { today: R(mailsDay), limit: mailLimit(env) },
  };
}

async function adminUsers(env, url) {
  const q = `%${(url.searchParams.get("q") || "").trim().toLowerCase()}%`;
  const rows = (await env.DB.prepare(`SELECT u.email, u.name, u.created_at, u.last_seen, u.premium, u.premium_until, u.sub_plan, u.sub_status, u.sub_cancel_at_end, s.status AS nl
     FROM users u LEFT JOIN subscribers s ON s.email = u.email WHERE u.email LIKE ? OR lower(u.name) LIKE ? ORDER BY u.created_at DESC LIMIT 100`).bind(q, q).all()).results;
  return json({ users: rows.map(r => ({ ...r, premium_on: premiumOn(r) })) });
}
async function adminSetPremium(req, env) {
  const b = await body(req), email = normEmail(b.email);
  const until = b.premium_until && /^\d{4}-\d{2}-\d{2}$/.test(b.premium_until) ? b.premium_until : null;
  const r = await env.DB.prepare("UPDATE users SET premium = ?, premium_until = ? WHERE email = ?").bind(b.premium ? 1 : 0, b.premium ? until : null, email).run();
  return r.meta.changes ? json({ ok: true }) : err("Compte introuvable.", 404);
}

/* ---------- BD masquées par l'admin ---------- */
async function hiddenList(env) {
  return (await env.DB.prepare("SELECT ed, fid FROM hidden ORDER BY ed").all()).results.map(r => `${r.ed}|${r.fid}`);
}
/* Relance la publication tout de suite si un jeton GitHub (Actions : écriture) est fourni ; sinon elle passe dans l'heure. */
async function rebuildSite(env) {
  if (!env.GH_DISPATCH_TOKEN) return false;
  const r = await fetch("https://api.github.com/repos/GregoireKarydes/le-sachoir/actions/workflows/publish.yml/dispatches", {
    method: "POST", body: JSON.stringify({ ref: "main" }),
    headers: { authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`, accept: "application/vnd.github+json", "user-agent": "le-sachoir-api" },
  });
  return r.status === 204;
}
async function adminPublished(env) {
  const r = await fetch(`${env.APP_URL}editions/index.json?t=${Date.now()}`);
  const editions = r.ok ? ((await r.json()).editions || []) : [];
  const since = shiftDay(parisDay(), -120);
  const [hid, reads] = await env.DB.batch([
    env.DB.prepare("SELECT ed, fid, created_at, by_email FROM hidden"),
    env.DB.prepare("SELECT ed, fid, COUNT(DISTINCT device) AS readers, COUNT(DISTINCT CASE WHEN type = 'done' THEN device END) AS done FROM events WHERE day >= ? AND type IN ('read', 'done', 'game') AND ed != '' GROUP BY ed, fid").bind(since),
  ]);
  const H = Object.fromEntries(hid.results.map(x => [`${x.ed}|${x.fid}`, x]));
  const RD = Object.fromEntries(reads.results.map(x => [`${x.ed}|${x.fid}`, x]));
  // Les BD masquées restent listées ici (l'index publié ne les contient plus) : on les reprend depuis la table.
  const out = editions.map(e => ({ date: e.date, demo: !!e.demo, formats: e.formats.map(f => ({ ...f, hidden: !!H[`${e.date}|${f.id}`], readers: RD[`${e.date}|${f.id}`]?.readers || 0, done: RD[`${e.date}|${f.id}`]?.done || 0 })) }));
  for (const h of hid.results) {
    let e = out.find(x => x.date === h.ed);
    if (!e) { e = { date: h.ed, formats: [] }; out.push(e); }
    if (!e.formats.some(f => f.id === h.fid)) e.formats.push({ id: h.fid, title: "", hidden: true, missing: true, readers: RD[`${h.ed}|${h.fid}`]?.readers || 0 });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return { editions: out, instant: !!env.GH_DISPATCH_TOKEN };
}

/* ---------- Routeur ---------- */
async function route(req, env, url, ctx) {
  const p = url.pathname.replace(/\/+$/, "") || "/", M = req.method;
  if (p === "/") return json({ name: "Le Sachoir API", ok: true });
  // Ce qui est branché : l'appli et la publication s'adaptent (rien ne s'active sans sa clé).
  if (p === "/config") return json({
    hidden: await hiddenList(env),
    mail: !!env.BREVO_API_KEY || env.DEV === "1", stripe: stripeOn(env),
    paywall: stripeOn(env) && env.PAYWALL !== "off",
    prices: { month: PLANS.month.amount, year: PLANS.year.amount },
  });
  if (p === "/pay/webhook" && M === "POST") return webhook(req, env);
  if (p === "/premium/img") return premiumImg(env, url, ctx);
  if (p === "/auth/request" && M === "POST") return authRequest(req, env);
  if (p === "/auth/verify" && M === "POST") return authVerify(req, env);
  if (p === "/ev" && M === "POST") return track(req, env);

  if (p === "/nl/subscribe" && M === "POST") {
    const b = await body(req), email = normEmail(b.email);
    if (!EMAIL_RE.test(email)) return err("Adresse e-mail invalide.");
    const u0 = await currentUser(req, env);
    // Un appareil déjà lié à un compte : le dossier offert va au compte (une seule fois).
    const linked = !u0 && DEVICE_RE.test(String(b.d || "")) && await env.DB.prepare("SELECT user_id FROM devices WHERE device = ? AND user_id IS NOT NULL").bind(String(b.d)).first();
    const r = await subscribe(env, email, String(b.source || "appli").slice(0, 20), { owner: (linked ? `u:${linked.user_id}` : ownerOf(u0, b.d)) || `e:${email}`, ref: b.ref ? String(b.ref).slice(0, 16) : null });
    return r.error ? err(r.error, 503) : json(r);
  }
  if (p === "/nl/confirm") {
    const t = url.searchParams.get("t") || "";
    const sub = t && await env.DB.prepare("SELECT * FROM subscribers WHERE confirm_token = ?").bind(t).first();
    if (!sub) return page(env, "Lien inconnu", h1("Lien expiré ou déjà utilisé") + `<p>Votre abonnement est peut-être déjà confirmé. Sinon, réinscrivez-vous depuis l'appli.</p>${btn(env.APP_URL, "Ouvrir l'appli")}`);
    await env.DB.prepare("UPDATE subscribers SET status = 'active', confirmed_at = ?, confirm_token = NULL, unsub_at = NULL WHERE email = ?").bind(nowIso(), sub.email).run();
    const gift = await grantNewsletter(env, sub.email, sub.owner || `e:${sub.email}`);
    if (sub.ref) await rewardReferral(env, sub.ref, sub.email, [sub.owner].filter(Boolean));
    await sendWelcome(env, sub.email, sub.token);
    return page(env, "Abonnement confirmé", h1("C'est confirmé !") + `<p style="font-size:16px;line-height:1.5">La première édition arrive demain matin.${gift ? " <b>Et un Grand Dossier vous est offert</b> : ouvrez celui de votre choix dans l'appli, la suite se débloque d'un toucher." : ""}</p>${btn(env.APP_URL, gift ? "Choisir mon dossier offert" : "Ouvrir l'appli")}`);
  }
  if (p === "/nl/unsub") {
    const t = url.searchParams.get("t") || "";
    const s = await env.DB.prepare("SELECT email, status FROM subscribers WHERE token = ?").bind(t).first();
    if (!s) return page(env, "Lien inconnu", h1("Lien inconnu") + `<p>Ce lien de désinscription ne correspond à personne. Vous êtes peut-être déjà libre.</p>`);
    if (url.searchParams.get("re") === "1") { await subscribe(env, s.email, "retour", { confirmed: true, welcome: false }); return page(env, "Réabonné", h1("Re-bienvenue !") + `<p>On savait que vous reviendriez. La prochaine édition arrive demain matin.</p>${btn(env.APP_URL, "Ouvrir l'appli")}`); }
    if (M === "POST" || url.searchParams.get("ok") === "1") {
      await unsubscribe(env, s.email);
      return page(env, "Désinscrit", h1("C'est fait.") + `<p style="font-size:16px;line-height:1.5">Vous ne recevrez plus la newsletter. Votre culture G, elle, reste en libre-service dans l'appli.</p><p style="font-size:14px;color:#5f5a52">Un clic malheureux ? <a href="?t=${esc(t)}&re=1">Se réabonner</a>.</p>`);
    }
    return page(env, "Se désinscrire", h1("On se quitte ?") + `<p style="font-size:16px;line-height:1.5">Plus de newsletter pour <b>${esc(s.email)}</b>. On ne vous en voudra pas. Enfin, pas longtemps.</p><form method="post" action="?t=${esc(t)}"><button style="background:#f5b62a;border:0;border-radius:999px;padding:13px 24px;font-weight:700;font-size:17px;cursor:pointer">Me désinscrire</button></form>`);
  }
  let m;
  if ((m = p.match(/^\/nl\/o\/([\w-]+)$/))) {
    await env.DB.prepare("UPDATE mails SET opened_at = ? WHERE token = ? AND opened_at IS NULL").bind(nowIso(), m[1]).run();
    return new Response(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store" } });
  }
  if ((m = p.match(/^\/nl\/c\/([\w-]+)$/))) {
    await env.DB.prepare("UPDATE mails SET clicked_at = COALESCE(clicked_at, ?), opened_at = COALESCE(opened_at, ?) WHERE token = ?").bind(nowIso(), nowIso(), m[1]).run();
    const u = url.searchParams.get("u") || "";
    return Response.redirect(u.startsWith(env.APP_URL) ? u : env.APP_URL, 302);
  }
  if ((m = p.match(/^\/nl\/s\/([\w-]+)$/))) {
    const row = await env.DB.prepare("SELECT day FROM mails WHERE token = ?").bind(m[1]).first();
    await env.DB.prepare("UPDATE mails SET clicked_at = COALESCE(clicked_at, ?), opened_at = COALESCE(opened_at, ?) WHERE token = ?").bind(nowIso(), nowIso(), m[1]).run();
    const ed = row && await loadEdition(env, row.day);
    if (!ed) return Response.redirect(env.APP_URL, 302);
    const lead = ed.formats.find(f => f.id === "dossier") || ed.stories[0];
    return page(env, "Pour briller en société", `<p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#5f5a52;margin:0 0 6px">Pour briller en société</p>
      <p style="font-family:Georgia,serif;font-size:24px;font-weight:800;line-height:1.2;margin:0 0 14px">${esc(lead?.final?.text || "")}</p>
      <p style="font-size:14px;color:#5f5a52;margin:0 0 18px">À ressortir au prochain apéro. Effet garanti (ou presque).</p>${btn(`${env.APP_URL}?d=${ed.day}`, "Lire l'édition du jour")}`);
  }

  // Routes avec session
  const u = await currentUser(req, env);
  if (p === "/wallet") return json(await wallet(env, u, url.searchParams.get("d")));
  if (p === "/unlock" && M === "POST") { const b = await body(req); const r = await unlock(env, u, b.d, b.ed); return r.error ? json(r, r.code === "no_credit" ? 402 : 400) : json(r); }
  if (p === "/premium/dossier") { const r = await premiumDossier(env, u, url.searchParams.get("d"), url.searchParams.get("ed")); return json(r.body, r.status); }
  if (p.startsWith("/me") || p === "/auth/logout" || p.startsWith("/admin") || p.startsWith("/pay/")) { if (!u) return err("Session expirée. Reconnectez-vous.", 401); }
  if (p === "/pay/checkout" && M === "POST") {
    if (!stripeOn(env)) return err("Le paiement n'est pas encore ouvert.", 503);
    const r = await checkout(env, u, (await body(req)).plan);
    return r.error ? err(r.error) : json(r);
  }
  if ((p === "/pay/cancel" || p === "/pay/resume") && M === "POST") {
    if (!stripeOn(env)) return err("Le paiement n'est pas encore ouvert.", 503);
    const r = await setCancel(env, u, p === "/pay/cancel");
    return r.error ? err(r.error) : json({ ok: true, user: await publicUser(env, await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(u.id).first()) });
  }
  if (p === "/pay/portal" && M === "POST") {
    if (!stripeOn(env)) return err("Le paiement n'est pas encore ouvert.", 503);
    const r = await portal(env, u);
    return r.error ? err(r.error) : json(r);
  }
  if (p === "/pay/confirm" && M === "POST") {
    if (!stripeOn(env)) return err("Le paiement n'est pas encore ouvert.", 503);
    const ok = await payConfirm(env, String((await body(req)).session_id || ""));
    return json({ ok, user: await publicUser(env, await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(u.id).first()) });
  }
  if (p === "/auth/logout" && M === "POST") { await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(u.sid).run(); return json({ ok: true }); }
  if (p === "/me" && M === "GET") {
    await checkPending(env, u);
    const fresh = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(u.id).first();
    const row = await env.DB.prepare("SELECT state FROM user_state WHERE user_id = ?").bind(u.id).first();
    return json({ user: await publicUser(env, fresh), state: row ? JSON.parse(row.state) : {}, wallet: await wallet(env, fresh, url.searchParams.get("d")) });
  }
  if (p === "/me" && M === "PUT") {
    const b = await body(req);
    if (typeof b.name === "string") await env.DB.prepare("UPDATE users SET name = ? WHERE id = ?").bind(b.name.trim().slice(0, 24), u.id).run();
    if (typeof b.newsletter === "boolean") { if (b.newsletter) await subscribe(env, u.email, "compte", { confirmed: true, owner: `u:${u.id}` }); else await unsubscribe(env, u.email); }
    return json({ user: await publicUser(env, await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(u.id).first()) });
  }
  if (p === "/me/sync" && M === "POST") {
    const b = await body(req);
    const row = await env.DB.prepare("SELECT state FROM user_state WHERE user_id = ?").bind(u.id).first();
    const state = mergeState(row ? JSON.parse(row.state) : {}, b.state || {});
    await saveState(env, u.id, state);
    return json({ state, user: await publicUser(env, u) });
  }
  if (p === "/me" && M === "DELETE") {
    await cancelNow(env, u);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
      env.DB.prepare("DELETE FROM user_state WHERE user_id = ?").bind(u.id),
      env.DB.prepare("DELETE FROM subscribers WHERE email = ?").bind(u.email),
      env.DB.prepare("UPDATE devices SET user_id = NULL WHERE user_id = ?").bind(u.id),
      env.DB.prepare("UPDATE mails SET email = 'supprime' WHERE email = ?").bind(u.email),
      env.DB.prepare("DELETE FROM logins WHERE email = ?").bind(u.email),
      env.DB.prepare("DELETE FROM grants WHERE owner = ?").bind(`u:${u.id}`),
      env.DB.prepare("DELETE FROM unlocks WHERE owner = ?").bind(`u:${u.id}`),
      env.DB.prepare("DELETE FROM users WHERE id = ?").bind(u.id),
    ]);
    return json({ ok: true });
  }
  if (p.startsWith("/admin")) {
    if (!isAdminEmail(env, u.email)) return err("Réservé à l'administration.", 403);
    if (p === "/admin/kpi") return json(await kpi(env, Math.max(7, Math.min(120, +url.searchParams.get("days") || 30))));
    if (p === "/admin/users" && M === "GET") return adminUsers(env, url);
    if (p === "/admin/published") return json(await adminPublished(env));
    if (p === "/admin/hide" && M === "POST") {
      const b = await body(req);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.ed || "") || !/^(dossier|actu|cultureg|insolite|quiz)$/.test(b.fid || "")) return err("BD inconnue.");
      if (b.hidden) await env.DB.prepare("INSERT OR IGNORE INTO hidden (ed, fid, created_at, by_email) VALUES (?, ?, ?, ?)").bind(b.ed, b.fid, nowIso(), u.email).run();
      else await env.DB.prepare("DELETE FROM hidden WHERE ed = ? AND fid = ?").bind(b.ed, b.fid).run();
      const rebuilt = await rebuildSite(env);
      return json({ ok: true, hidden: await hiddenList(env), rebuilt });
    }
    if (p === "/admin/queue") { const q = await adminQueue(env); return q.error ? err(q.error, 404) : json(q); }
    if (p === "/admin/item") { const it = await adminItem(env, url.searchParams.get("dir")); return it.error ? err(it.error, 404) : json(it); }
    if (p === "/admin/users" && M === "POST") return adminSetPremium(req, env);
    if (p === "/admin/newsletter/preview") {
      const ed = await loadEdition(env, url.searchParams.get("day") || parisDay());
      if (!ed) return err("Pas d'édition publiée ce jour-là.", 404);
      const mm = newsletterMail(env, ed);
      return json({ subject: mm.subject, html: mm.html.replaceAll("{{params.t}}", "apercu").replaceAll("{{params.u}}", "apercu").replaceAll("{{params.r}}", "apercu") });
    }
    if (p === "/admin/newsletter" && M === "POST") {
      const b = await body(req);
      if (b.action === "test") return json(await sendNewsletter(env, { testTo: u.email, day: b.day || parisDay() }));
      if (b.action === "send") return json(await sendNewsletter(env, { force: true }));
      return err("Action inconnue.");
    }
  }
  return err("Introuvable.", 404);
}

/* ---------- Tâche planifiée : newsletter et ménage ---------- */
async function cron(env) {
  const h = parisHour();
  // Les crons GitHub sont souvent en retard ou sautés : la Publication de 5 h est lancée d'ici (5 h 00 et 5 h 30, sans risque : publish.py ne fait rien deux fois).
  if (h === 5) console.log("publication", await rebuildSite(env) ? "lancée" : "non lancée (DISPATCH_TOKEN manquant ou refusé)");
  const out = await sendNewsletter(env);
  console.log("newsletter", JSON.stringify(out));
  if (h === 10) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM logins WHERE created_at < ?").bind(new Date(Date.now() - 2 * 86400e3).toISOString()),
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(nowIso()),
      env.DB.prepare("DELETE FROM events WHERE day < ?").bind(shiftDay(parisDay(), -400)),
    ]);
  }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    let res;
    try { res = await route(req, env, url, ctx); }
    catch (e) { console.error(e.stack || e); res = err("Erreur du serveur. On a déjà blâmé un stagiaire.", 500); }
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    return out;
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(cron(env)); },
};
