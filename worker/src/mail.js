// E-mails du Sachoir : envoi par Brevo, lien de connexion, bienvenue et newsletter quotidienne.
import { esc, parisDay } from "./util.js";

const C = { cream: "#faf6ee", ink: "#17140f", muted: "#5f5a52", line: "#e7e1d4", yellow: "#f5b62a",
  dossier: "#1f8f5f", actu: "#2f4fa2", cultureg: "#f2a33a", insolite: "#d9473a", ccm: "#7a4fb8", quiz: "#14275c" };
const SERIF = "Georgia,'Times New Roman',serif", SANS = "Roboto,Helvetica,Arial,sans-serif";

export const mailLimit = env => +(env.MAIL_DAILY_LIMIT || 290);

/* Envoi Brevo. `versions` = [{ email, params }] pour un envoi groupé personnalisé ({{params.x}} dans le HTML).
   Sans clé Brevo (développement), l'e-mail est seulement écrit dans la console. */
export async function brevoSend(env, { to, versions, subject, html, text, tag }) {
  if (!env.BREVO_API_KEY) {
    console.log(`[mail:dev] ${tag} → ${to || versions.map(v => v.email).join(", ")} : ${subject}`);
    return { ok: true, dev: true };
  }
  const body = {
    sender: { name: env.SENDER_NAME || "Le Sachoir", email: env.SENDER_EMAIL },
    subject, htmlContent: html, textContent: text, tags: [tag],
  };
  if (versions) body.messageVersions = versions.map(v => ({ to: [{ email: v.email }], params: v.params }));
  else body.to = [{ email: to }];
  if (env.REPLY_TO) body.replyTo = { email: env.REPLY_TO };
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) return { ok: false, error: `Brevo ${r.status} ${(await r.text()).slice(0, 300)}` };
  return { ok: true };
}

function shell(env, inner, footer) {
  const app = env.APP_URL;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Le Sachoir</title></head>
<body style="margin:0;padding:0;background:${C.cream};color:${C.ink};font-family:${SANS}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:18px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:4px 4px 14px"><a href="${app}" style="text-decoration:none"><img src="${app}assets/logo.png" alt="Le Sachoir" height="34" style="height:34px;border:0;display:block"></a></td></tr>
${inner}
<tr><td style="padding:22px 6px 8px;font-size:12px;line-height:1.5;color:${C.muted};border-top:1px solid ${C.line}">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function loginMail(env, { link, code }) {
  const inner = `<tr><td style="background:#fff;border-radius:18px;padding:22px 20px">
<h1 style="font-family:${SERIF};font-size:26px;line-height:1.1;margin:0 0 10px">Votre code de connexion</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.45">Tapez ce code dans l'appli. Il est valable 15 minutes, comme la concentration d'un lundi matin.</p>
<p style="margin:0 0 18px;font-family:${SERIF};font-size:38px;font-weight:800;letter-spacing:8px;text-align:center;background:${C.cream};border-radius:14px;padding:12px 0">${code}</p>
<p style="margin:0 0 6px;text-align:center"><a href="${link}" style="display:inline-block;background:${C.yellow};color:${C.ink};font-weight:700;font-size:17px;text-decoration:none;padding:13px 26px;border-radius:999px">Ou me connecter en un clic</a></p>
</td></tr>`;
  return {
    subject: `${code} : votre code Le Sachoir`,
    html: shell(env, inner, "Vous n'avez rien demandé ? Ignorez ce message : sans le code, personne ne peut entrer. Pas même nous."),
    text: `Votre code de connexion Le Sachoir : ${code}\nOu cliquez sur ce lien : ${link}\nValable 15 minutes.`,
  };
}

export function welcomeMail(env, { unsubUrl }) {
  const inner = `<tr><td style="background:#fff;border-radius:18px;padding:22px 20px">
<h1 style="font-family:${SERIF};font-size:26px;line-height:1.1;margin:0 0 10px">Bienvenue dans la newsletter</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5">Chaque matin, l'édition du jour arrive ici : l'actu, une pilule de culture G, une histoire insolite, un « Comment ça marche ? », le Grand Dossier et le jeu du jour. Une minute pour survoler, cinq pour briller.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">Promis : pas de « Vous ne devinerez jamais… », pas de pub pour des matelas. Juste de quoi impressionner la machine à café.</p>
<p style="margin:0;text-align:center"><a href="${env.APP_URL}" style="display:inline-block;background:${C.yellow};color:${C.ink};font-weight:700;font-size:17px;text-decoration:none;padding:13px 26px;border-radius:999px">Lire l'édition du jour</a></p>
</td></tr>`;
  return {
    subject: "C'est noté. Votre cerveau vous remercie d'avance.",
    html: shell(env, inner, `Changé d'avis ? <a href="${unsubUrl}" style="color:${C.muted}">Se désinscrire</a> en un clic, sans questionnaire de départ.`),
    text: `Bienvenue dans la newsletter du Sachoir. Chaque matin, l'édition du jour.\nLire : ${env.APP_URL}\nSe désinscrire : ${unsubUrl}`,
  };
}

/* ---------- Confirmation d'abonnement (double validation) ---------- */
export function confirmMail(env, { url }) {
  const inner = `<tr><td style="background:#fff;border-radius:18px;padding:22px 20px">
<h1 style="font-family:${SERIF};font-size:26px;line-height:1.1;margin:0 0 10px">Un clic et c'est parti</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">Confirmez votre adresse pour recevoir l'édition du jour chaque matin. En prime, <b>un Grand Dossier vous est offert</b> : celui de votre choix, en entier.</p>
<p style="margin:0;text-align:center"><a href="${url}" style="display:inline-block;background:${C.yellow};color:${C.ink};font-weight:700;font-size:17px;text-decoration:none;padding:13px 26px;border-radius:999px">Je confirme (et je prends mon dossier)</a></p>
</td></tr>`;
  return {
    subject: "Confirmez, et un Grand Dossier est pour vous",
    html: shell(env, inner, "Vous n'avez rien demandé ? Ignorez ce message : sans clic, pas d'abonnement. Promis, on ne vous relancera pas."),
    text: `Confirmez votre abonnement à la newsletter du Sachoir (et recevez un Grand Dossier offert) : ${url}`,
  };
}

/* ---------- Newsletter quotidienne ----------
   Les textes du jour viennent de l'édition (champ « newsletter » écrit par la tâche Actu, « teaser » de chaque BD).
   À défaut, chaque morceau est tiré de sa propre réserve avec un décalage différent : la combinaison change tous les jours. */
const POOLS = {
  intro: [
    "Salut. L'édition du jour est prête. Elle est courte, elle est drôle, et elle est vraie. Choisissez deux adjectifs sur trois, c'est déjà bien.",
    "Bonjour. On a lu les journaux pour vous, puis on les a dessinés. Vous n'avez plus qu'à faire semblant de les avoir lus.",
    "Petit rappel : être cultivé, c'est 5 minutes par jour. Être insupportable avec, c'est un talent qu'on ne peut pas vous apprendre.",
    "Votre café refroidit. C'est le moment idéal pour devenir plus cultivé que votre collègue de bureau.",
    "Nouvelle édition. Aucun algorithme ne vous a enfermé dans une bulle aujourd'hui. Juste dans des cases de BD.",
    "Cette newsletter tient en un scroll. Promis, on a compté. Deux fois.",
    "On vous épargne le blabla d'introduction. Sauf cette phrase. Et celle-là.",
    "Bonjour. Si vous lisez ceci dans les transports, vous êtes officiellement la personne la plus cultivée du wagon.",
    "Le matin, certains font du yoga. Vous, vous faites de la culture G. Chacun ses étirements.",
    "Édition fraîche, encre encore humide. Évitez de lécher l'écran.",
    "On a vérifié chaque fait deux fois. Les blagues, une seule. Ça se voit peut-être.",
    "Vous avez ouvert cet e-mail. C'est déjà plus que la moitié de vos newsletters. Merci, sincèrement.",
  ],
  menu: ["Au menu aujourd'hui", "Dans l'édition du jour", "Ce qui vous attend", "Ce matin, on vous raconte"],
  cta: ["Lire l'édition du jour", "Ouvrir l'édition", "J'y vais", "Voir l'édition (5 min)"],
  shine: ["🤫 La phrase pour briller en société, cachée ici", "✨ Votre réplique du jour (spoiler)", "🎁 La phrase à ressortir au dîner"],
  game: ["Le jeu du jour vous attend à la fin. Une seule partie, pas de seconde chance.", "Le jeu du jour : trois minutes, zéro triche, une grille à partager pour frimer.", "En fin d'édition, le jeu du jour. Perdre rend quand même plus cultivé."],
  ref: ["Un ami s'inscrit avec votre lien, vous gagnez un Grand Dossier. La seule pyramide qu'on recommande, après Khéops.", "Transférez à quelqu'un qui dit « en fait, techniquement ». S'il s'inscrit, un Grand Dossier est pour vous.", "Chaque ami inscrit avec votre lien = un Grand Dossier offert. Vos amis deviennent cultivés, vous aussi."],
  ps: [
    "P.-S. Une erreur dans une BD ? Répondez à ce mail. Un humain lit tout, généralement avant son deuxième café.",
    "P.-S. Si on atterrit dans vos promotions, glissez-nous dans la boîte principale. On le vivra très bien.",
    "P.-S. Demain, même heure, même endroit. On apporte les anecdotes, vous apportez le café.",
    "P.-S. Aucun crayon n'a été maltraité pendant la fabrication de cette édition. Enfin, presque aucun.",
    "P.-S. Vous avez lu jusqu'ici. On n'a pas de médaille, mais on est fiers de vous.",
  ],
  subject: ["☕ %s", "%s (et 3 autres histoires)", "Ce matin : %s", "📚 %s", "%s, en BD"],
};
const dayNum = day => Math.floor(Date.parse(day + "T12:00:00Z") / 86400000);
const pick = (key, day, k = 0) => { const l = POOLS[key]; return l[(dayNum(day) * (k + 3) + k * 7) % l.length]; };
const QUIZ_NAMES = { culture: "Quiz culture G", geo: "Quiz géo", frise: "La Frise", dico: "Le Dico menteur", plusmoins: "Plus ou moins", swipe: "Le Swipe", chiffre: "Le Chiffre", citation: "Qui a dit ça ?" };
const EMOJI = { dossier: "📚", actu: "🗞️", cultureg: "💊", insolite: "🤯", ccm: "⚙️" };

export async function loadEdition(env, day) {
  const r = await fetch(`${env.APP_URL}editions/index.json`, { cf: { cacheTtl: 60 } });
  if (!r.ok) return null;
  const entry = ((await r.json()).editions || []).find(e => e.date === day);
  if (!entry) return null;
  const r2 = await fetch(`${env.APP_URL}editions/${day}/edition.json`, { cf: { cacheTtl: 60 } });
  if (!r2.ok) return null;
  const ed = await r2.json();
  const full = Object.fromEntries((ed.formats || []).map(f => [f.id, f]));
  const hidden = new Set(env.DB ? (await env.DB.prepare("SELECT fid FROM hidden WHERE ed = ?").bind(day).all()).results.map(r => r.fid) : []);
  const formats = entry.formats.filter(f => !hidden.has(f.id)).map(f => ({ ...f, final: full[f.id]?.final, kind: full[f.id]?.kind || f.kind, teaser: full[f.id]?.teaser || "" }));
  return { day, formats, stories: formats.filter(f => f.id !== "quiz"), nl: ed.newsletter || {} };
}

const fmtDay = day => new Date(day + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/* Newsletter façon PostHog : courte, une seule colonne, beaucoup de texte et peu de décor, un ton complice.
   Tous les liens mènent à l'édition du jour (jamais directement à une BD).
   {{params.t}} = jeton de suivi, {{params.u}} = désinscription, {{params.r}} = code de parrainage. */
export function newsletterMail(env, ed) {
  const app = env.APP_URL, api = env.API_URL, day = ed.day, nl = ed.nl || {};
  const edition = `${api}/nl/c/{{params.t}}?u=${encodeURIComponent(`${app}?d=${day}`)}`;
  const lead = ed.formats.find(f => f.id === "dossier") || ed.stories[0];
  const order = [lead, ...ed.stories.filter(f => f !== lead)].filter(Boolean);
  const shine = (lead?.final?.text ? lead : ed.stories.find(f => f.final?.text))?.final?.text || "";
  const blurb = f => f.teaser || f.tagline || "";
  const P = (html, extra = "") => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;${extra}">${html}</p>`;
  const img = lead?.cover ? `${app}editions/${day}/${lead.cover}` : "";
  const quiz = ed.formats.find(f => f.id === "quiz");
  const inner = `<tr><td style="background:#fff;border-radius:16px;padding:22px 22px 8px">
${P(`<span style="color:${C.muted};font-size:13px;text-transform:capitalize">${esc(fmtDay(day))}</span>`, "margin-bottom:8px")}
${P(esc(nl.intro || pick("intro", day)))}
${img ? `<a href="${edition}"><img src="${img}" alt="" width="100%" style="display:block;width:100%;max-height:300px;object-fit:cover;object-position:top;border-radius:12px;border:0;margin:0 0 16px;background:${C.cream}"></a>` : ""}
<h2 style="font-family:${SERIF};font-size:20px;margin:0 0 10px">${esc(pick("menu", day, 1))}</h2>
${order.map(f => P(`${EMOJI[f.id] || "•"} <b>${esc(f.title)}</b>${blurb(f) ? `<br><span style="color:${C.muted}">${esc(blurb(f))}</span>` : ""}`, "margin-bottom:12px")).join("")}
${quiz ? P(`🎮 ${esc(nl.game || pick("game", day, 2))}`, "margin-bottom:18px") : ""}
<p style="margin:0 0 20px"><a href="${edition}" style="display:inline-block;background:${C.yellow};color:${C.ink};font-weight:700;font-size:16px;text-decoration:none;padding:12px 22px;border-radius:999px">${esc(pick("cta", day, 3))} →</a></p>
${shine ? P(`<a href="${api}/nl/s/{{params.t}}" style="color:${C.ink};font-weight:700">${esc(pick("shine", day, 4))}</a>`) : ""}
${P(`👋 ${esc(pick("ref", day, 5))} <a href="${app}?ref={{params.r}}" style="color:${C.ink}">Votre lien</a>.`)}
${P(esc(nl.ps || pick("ps", day, 6)), `color:${C.muted};font-size:14.5px`)}
</td></tr>`;
  const footer = `Vous recevez cet e-mail parce que vous avez demandé à devenir plus cultivé. C'est tout à votre honneur.<br>
<a href="${api}/nl/unsub?t={{params.u}}" style="color:${C.muted}">Se désinscrire</a><img src="${api}/nl/o/{{params.t}}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">`;
  const subject = (nl.subject || pick("subject", day, 7).replace("%s", lead?.title || "L'édition du jour")).slice(0, 120);
  const text = [`Le Sachoir · ${fmtDay(day)}`, "", nl.intro || pick("intro", day), "", pick("menu", day, 1), ...order.map(f => `- ${f.title}${blurb(f) ? " : " + blurb(f) : ""}`),
    "", `Lire l'édition du jour : ${app}?d=${day}`, "", `Un ami, un dossier : ${app}?ref={{params.r}}`, "", nl.ps || pick("ps", day, 6), "", `Se désinscrire : ${api}/nl/unsub?t={{params.u}}`].join("\n");
  return { subject, html: shell(env, inner, footer), text, shine };
}

/* Petite page HTML (désinscription, spoiler…). */
export function page(env, title, body) {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · Le Sachoir</title></head>
<body style="margin:0;background:${C.cream};color:${C.ink};font-family:${SANS};display:flex;min-height:100vh;align-items:center;justify-content:center">
<main style="max-width:460px;margin:24px;background:#fff;border-radius:22px;padding:26px 22px;box-shadow:0 6px 24px rgba(0,0,0,.08)">
<a href="${env.APP_URL}"><img src="${env.APP_URL}assets/logo.png" alt="Le Sachoir" height="32" style="height:32px;display:block;margin-bottom:16px"></a>
${body}</main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
export const btn = (href, label) => `<a href="${href}" style="display:inline-block;background:${C.yellow};color:${C.ink};font-weight:700;font-size:17px;text-decoration:none;padding:13px 24px;border-radius:999px">${esc(label)}</a>`;
export const h1 = t => `<h1 style="font-family:${SERIF};font-size:27px;line-height:1.1;margin:0 0 10px">${esc(t)}</h1>`;
export { parisDay };
