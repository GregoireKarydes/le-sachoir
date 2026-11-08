// Premium par abonnement Stripe, sans engagement : 2,99 € par mois ou 19,99 € par an, résiliable à tout moment
// (l'accès reste ouvert jusqu'à la fin de la période payée). Actif seulement si STRIPE_SECRET_KEY est en place.
// Le webhook (STRIPE_WEBHOOK_SECRET, créé automatiquement par le workflow API) suit renouvellements, échecs et résiliations ;
// le retour sur l'appli et l'ouverture de l'appli vérifient aussi l'abonnement, au cas où un événement tarde.
import { nowIso, parisDay, shiftDay } from "./util.js";

export const PLANS = {
  month: { amount: 299, interval: "month", name: "Le Sachoir Premium · mensuel" },
  year: { amount: 1999, interval: "year", name: "Le Sachoir Premium · annuel" },
};
export const stripeOn = env => !!env.STRIPE_SECRET_KEY;
export const WEBHOOK_EVENTS = ["checkout.session.completed", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted"];

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

const day = ts => ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null;
// Fin de la période en cours (champ déplacé sur les lignes d'abonnement dans les versions récentes de l'API Stripe).
const periodEnd = sub => sub.current_period_end || sub.items?.data?.[0]?.current_period_end || null;
const planOf = sub => sub.metadata?.plan || (sub.items?.data?.[0]?.price?.recurring?.interval === "year" ? "year" : "month");

export async function checkout(env, user, planId) {
  const plan = PLANS[planId];
  if (!plan) return { error: "Formule inconnue." };
  if (user.stripe_sub && ["active", "trialing", "past_due"].includes(user.sub_status)) return { error: "Vous avez déjà un abonnement en cours. Gérez-le depuis Mon compte." };
  const s = await stripe(env, "checkout/sessions", {
    mode: "subscription", locale: "fr",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(plan.amount),
    "line_items[0][price_data][recurring][interval]": plan.interval,
    "line_items[0][price_data][product_data][name]": plan.name,
    ...(user.stripe_customer ? { customer: user.stripe_customer } : { customer_email: user.email }),
    client_reference_id: user.id,
    "metadata[plan]": planId, "metadata[user_id]": user.id,
    "subscription_data[metadata][plan]": planId, "subscription_data[metadata][user_id]": user.id,
    "subscription_data[description]": "Sans engagement : résiliable à tout moment depuis l'appli.",
    success_url: `${env.APP_URL}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}?paid=cancel`,
  });
  await env.DB.prepare("INSERT INTO payments (session_id, user_id, plan, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)")
    .bind(s.id, user.id, planId, plan.amount, nowIso()).run();
  return { url: s.url };
}

async function userFor(env, { userId, customer, subId }) {
  if (userId) { const u = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first(); if (u) return u; }
  if (subId) { const u = await env.DB.prepare("SELECT * FROM users WHERE stripe_sub = ?").bind(subId).first(); if (u) return u; }
  if (customer) return env.DB.prepare("SELECT * FROM users WHERE stripe_customer = ?").bind(customer).first();
  return null;
}

/* Recopie l'état d'un abonnement Stripe sur le compte : Premium jusqu'à la fin de la période payée (+1 jour de marge). */
export async function applySubscription(env, sub, userId = null) {
  const u = await userFor(env, { userId: userId || sub.metadata?.user_id, customer: sub.customer, subId: sub.id });
  if (!u) return false;
  const end = day(periodEnd(sub)), live = ["active", "trialing", "past_due"].includes(sub.status);
  // Résilié : accès jusqu'à la date déjà payée ; actif : jusqu'à la fin de la période + 1 jour (le prélèvement suivant peut prendre un peu de temps).
  const until = live && end ? shiftDay(end, 1) : (sub.ended_at ? day(sub.ended_at) : end) || parisDay();
  const keepManual = u.premium && !u.premium_until && !u.stripe_sub; // Premium donné à la main sans fin : on n'y touche pas
  await env.DB.prepare(`UPDATE users SET stripe_customer = ?, stripe_sub = ?, sub_plan = ?, sub_status = ?, sub_cancel_at_end = ?, sub_period_end = ?
      ${keepManual ? "" : ", premium = 1, premium_until = ?"} WHERE id = ?`)
    .bind(sub.customer, sub.id, planOf(sub), sub.status, sub.cancel_at_period_end ? 1 : 0, end, ...(keepManual ? [] : [until]), u.id).run();
  return true;
}

/* Une facture payée = un paiement compté dans les revenus (première échéance et renouvellements). */
async function recordInvoice(env, inv, userId) {
  if (!inv?.id || !(inv.amount_paid > 0)) return;
  const sub = inv.subscription || inv.parent?.subscription_details?.subscription;
  const u = await userFor(env, { userId, customer: inv.customer, subId: sub });
  if (!u) return;
  const interval = inv.lines?.data?.[0]?.price?.recurring?.interval || inv.lines?.data?.[0]?.plan?.interval || null;
  await env.DB.prepare("INSERT OR IGNORE INTO payments (session_id, user_id, plan, amount, status, created_at, paid_at) VALUES (?, ?, ?, ?, 'paid', ?, ?)")
    .bind(inv.id, u.id, interval === "year" ? "year" : (u.sub_plan || "month"), inv.amount_paid, nowIso(), nowIso()).run();
}

/* Retour sur l'appli après Stripe (ou ouverture de l'appli) : on lit la session et l'abonnement directement. */
export async function confirm(env, sessionId) {
  if (!/^cs_[\w]+$/.test(sessionId || "")) return false;
  const s = await stripe(env, `checkout/sessions/${sessionId}?expand[]=subscription&expand[]=invoice`, null, "GET");
  if (s.status === "expired") { await env.DB.prepare("UPDATE payments SET status = 'expired' WHERE session_id = ?").bind(sessionId).run(); return false; }
  if (s.status !== "complete" || !s.subscription) return false;
  await env.DB.prepare("UPDATE payments SET status = 'done' WHERE session_id = ?").bind(sessionId).run();
  const userId = s.client_reference_id || s.metadata?.user_id;
  await applySubscription(env, typeof s.subscription === "object" ? s.subscription : await stripe(env, `subscriptions/${s.subscription}`, null, "GET"), userId);
  if (s.invoice && typeof s.invoice === "object") await recordInvoice(env, s.invoice, userId);
  return true;
}

/* À l'ouverture de l'appli : sessions de paiement récentes pas encore confirmées, et rafraîchissement d'un abonnement
   dont la date est passée (au cas où le webhook d'un renouvellement aurait été manqué). */
export async function checkPending(env, user) {
  if (!stripeOn(env)) return;
  const since = new Date(Date.now() - 2 * 86400e3).toISOString();
  const rows = (await env.DB.prepare("SELECT session_id FROM payments WHERE user_id = ? AND status = 'pending' AND created_at > ? LIMIT 3").bind(user.id, since).all()).results;
  for (const r of rows) { try { await confirm(env, r.session_id); } catch (e) { console.error(e); } }
  if (user.stripe_sub && user.sub_period_end && user.sub_period_end < parisDay() && user.sub_status !== "canceled") {
    try { await applySubscription(env, await stripe(env, `subscriptions/${user.stripe_sub}`, null, "GET"), user.id); } catch (e) { console.error(e); }
  }
}

/* Résilier (à la fin de la période payée) ou reprendre un abonnement, depuis l'appli. */
export async function setCancel(env, user, cancel) {
  if (!user.stripe_sub) return { error: "Aucun abonnement en cours." };
  const sub = await stripe(env, `subscriptions/${user.stripe_sub}`, { cancel_at_period_end: cancel ? "true" : "false" });
  await applySubscription(env, sub, user.id);
  return { ok: true };
}

/* Suppression du compte : l'abonnement s'arrête tout de suite (plus aucun prélèvement). */
export async function cancelNow(env, user) {
  if (!stripeOn(env) || !user.stripe_sub || user.sub_status === "canceled") return;
  try { await stripe(env, `subscriptions/${user.stripe_sub}`, null, "DELETE"); } catch (e) { console.error(e); }
}

/* Portail Stripe : changer de carte, télécharger les factures (à activer une fois dans le tableau de bord Stripe). */
export async function portal(env, user) {
  if (!user.stripe_customer) return { error: "Aucun abonnement associé à ce compte." };
  try { return { url: (await stripe(env, "billing_portal/sessions", { customer: user.stripe_customer, return_url: env.APP_URL, ...(env.STRIPE_PORTAL_CONFIG ? { configuration: env.STRIPE_PORTAL_CONFIG } : {}) })).url }; }
  catch (e) { return { error: "La gestion de la carte arrive bientôt. En attendant, répondez à un de nos e-mails." }; }
}

export async function webhook(req, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response("webhook non configuré", { status: 404 });
  const raw = await req.text(), sig = req.headers.get("stripe-signature") || "";
  const t = (sig.match(/t=(\d+)/) || [])[1], v1s = [...sig.matchAll(/v1=([a-f0-9]+)/g)].map(m => m[1]);
  if (!t || Math.abs(Date.now() / 1000 - +t) > 600) return new Response("signature expirée", { status: 400 });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)))].map(b => b.toString(16).padStart(2, "0")).join("");
  if (!v1s.includes(mac)) return new Response("signature invalide", { status: 400 });
  const ev = JSON.parse(raw), o = ev.data.object;
  switch (ev.type) {
    case "checkout.session.completed":
      if (o.mode === "subscription" && o.subscription) {
        await env.DB.prepare("UPDATE payments SET status = 'done' WHERE session_id = ?").bind(o.id).run();
        if (env.STRIPE_SECRET_KEY) await applySubscription(env, await stripe(env, `subscriptions/${o.subscription}`, null, "GET"), o.client_reference_id || o.metadata?.user_id);
      }
      break;
    case "invoice.paid": {
      await recordInvoice(env, o);
      const subId = o.subscription || o.parent?.subscription_details?.subscription;
      if (subId && env.STRIPE_SECRET_KEY) await applySubscription(env, await stripe(env, `subscriptions/${subId}`, null, "GET"));
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(env, o);
      break;
    case "invoice.payment_failed":
      // Stripe relance la carte pendant quelques jours ; l'accès reste ouvert jusqu'à la fin de la période (statut past_due).
      break;
  }
  return new Response("ok");
}
