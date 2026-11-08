// Premium payé par Stripe Checkout : paiement unique (pas d'abonnement), 1 mois ou 1 an d'accès.
// Actif seulement si le secret STRIPE_SECRET_KEY est en place. Le webhook (STRIPE_WEBHOOK_SECRET) est facultatif :
// le paiement est aussi vérifié au retour sur l'appli et à chaque ouverture tant qu'un paiement est en attente.
import { nowIso, parisDay, shiftDay } from "./util.js";

export const PLANS = {
  month: { amount: 299, days: 31, name: "Le Sachoir Premium · 1 mois" },
  year: { amount: 1999, days: 366, name: "Le Sachoir Premium · 1 an" },
};
export const stripeOn = env => !!env.STRIPE_SECRET_KEY;

async function stripe(env, path, params, method = "POST") {
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method, body,
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || `Stripe ${r.status}`);
  return d;
}

export async function checkout(env, user, planId) {
  const plan = PLANS[planId];
  if (!plan) return { error: "Formule inconnue." };
  const s = await stripe(env, "checkout/sessions", {
    mode: "payment", locale: "fr",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(plan.amount),
    "line_items[0][price_data][product_data][name]": plan.name,
    "line_items[0][price_data][product_data][description]": "Paiement unique, sans abonnement ni renouvellement automatique.",
    client_reference_id: user.id, customer_email: user.email,
    "metadata[plan]": planId, "metadata[user_id]": user.id,
    success_url: `${env.APP_URL}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}?paid=cancel`,
  });
  await env.DB.prepare("INSERT INTO payments (session_id, user_id, plan, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)")
    .bind(s.id, user.id, planId, plan.amount, nowIso()).run();
  return { url: s.url };
}

/* Prolonge le Premium (une seule fois par paiement). */
async function grantPaid(env, session) {
  const userId = session.client_reference_id || session.metadata?.user_id, planId = session.metadata?.plan;
  const plan = PLANS[planId];
  if (!userId || !plan) return false;
  await env.DB.prepare("INSERT OR IGNORE INTO payments (session_id, user_id, plan, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)")
    .bind(session.id, userId, planId, session.amount_total || plan.amount, nowIso()).run();
  const r = await env.DB.prepare("UPDATE payments SET status = 'paid', paid_at = ?, amount = ? WHERE session_id = ? AND status != 'paid'")
    .bind(nowIso(), session.amount_total || plan.amount, session.id).run();
  if (!r.meta.changes) return false;
  const u = await env.DB.prepare("SELECT premium, premium_until FROM users WHERE id = ?").bind(userId).first();
  if (!u) return false;
  const today = parisDay();
  const from = u.premium && u.premium_until && u.premium_until > today ? u.premium_until : today;
  await env.DB.prepare("UPDATE users SET premium = 1, premium_until = ? WHERE id = ?").bind(shiftDay(from, plan.days), userId).run();
  return true;
}

export async function confirm(env, sessionId) {
  if (!/^cs_[\w]+$/.test(sessionId || "")) return false;
  const s = await stripe(env, `checkout/sessions/${sessionId}`, null, "GET");
  if (s.payment_status === "paid") return grantPaid(env, s);
  if (s.status === "expired") await env.DB.prepare("UPDATE payments SET status = 'expired' WHERE session_id = ?").bind(sessionId).run();
  return false;
}

/* Paiements en attente de moins de 2 jours : vérifiés à l'ouverture (si l'onglet a été fermé avant le retour). */
export async function checkPending(env, userId) {
  if (!stripeOn(env)) return;
  const since = new Date(Date.now() - 2 * 86400e3).toISOString();
  const rows = (await env.DB.prepare("SELECT session_id FROM payments WHERE user_id = ? AND status = 'pending' AND created_at > ? LIMIT 3").bind(userId, since).all()).results;
  for (const r of rows) { try { await confirm(env, r.session_id); } catch (e) { console.error(e); } }
}

export async function webhook(req, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response("webhook non configuré", { status: 404 });
  const raw = await req.text(), sig = req.headers.get("stripe-signature") || "";
  const t = (sig.match(/t=(\d+)/) || [])[1], v1s = [...sig.matchAll(/v1=([a-f0-9]+)/g)].map(m => m[1]);
  if (!t || Math.abs(Date.now() / 1000 - +t) > 600) return new Response("signature expirée", { status: 400 });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)))].map(b => b.toString(16).padStart(2, "0")).join("");
  if (!v1s.includes(mac)) return new Response("signature invalide", { status: 400 });
  const ev = JSON.parse(raw);
  if ((ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") && ev.data.object.payment_status === "paid")
    await grantPaid(env, ev.data.object);
  return new Response("ok");
}
