// E-mails du Sachoir : envoi par Brevo, lien de connexion, bienvenue et newsletter quotidienne.
import { esc, parisDay } from "./util.js";

const C = { cream: "#faf6ee", ink: "#17140f", muted: "#5f5a52", line: "#e7e1d4", yellow: "#f5b62a",
  dossier: "#1f8f5f", actu: "#2f4fa2", cultureg: "#f2a33a", insolite: "#d9473a", quiz: "#14275c" };
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
<p style="margin:0 0 12px;font-size:16px;line-height:1.5">Chaque matin, l'édition du jour arrive ici : l'actu, une pilule de culture G, une histoire insolite, le Grand Dossier et le jeu du jour. Une minute pour survoler, cinq pour briller.</p>
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
    "Bonjour. Pendant que vous dormiez, on a dessiné l'actualité. Vous pouvez nous remercier en lisant jusqu'au bout.",
    "Votre café refroidit. Profitez-en pour devenir plus cultivé que votre collègue de bureau.",
    "Nouvelle édition. Statistiquement, vous allez apprendre au moins une chose. Au pire, vous aurez vu des dessins.",
    "Ceci n'est pas un spam. C'est de la culture générale déguisée en BD. Nuance importante.",
    "On a lu les journaux pour vous. Et des livres d'histoire. On est fatigués, mais fiers.",
    "Édition du jour : vérifiée deux fois, dessinée une fois, relue par quelqu'un qui a trop bu de café.",
    "Si vous lisez ceci dans le métro, regardez autour de vous : vous êtes la personne la plus cultivée du wagon.",
    "Bonne nouvelle : le monde tourne encore. Moins bonne nouvelle : il s'est passé des choses. On vous explique.",
    "Cinq minutes de lecture. C'est moins long qu'une réunion qui aurait pu être un e-mail. Comme celui-ci.",
    "Aujourd'hui encore, aucun algorithme ne vous a enfermé dans une bulle. Juste dans une case de BD.",
    "Réveil difficile ? Votre cerveau, lui, est prêt. Il attendait juste qu'on lui raconte quelque chose.",
    "Le Sachoir est arrivé. Il ne fait pas le café, mais il donne de quoi parler en le buvant.",
    "Notre stagiaire voulait écrire « Bonjour à tous ». On l'a laissé faire, puis on a tout réécrit.",
    "Une édition toute fraîche, sortie du crayon. Attention, l'encre est peut-être encore humide.",
    "Vous avez ouvert cet e-mail. C'est déjà plus que la moitié de vos newsletters. Merci.",
    "Le matin, certains font du yoga. Vous, vous allez faire de la culture G. Chacun ses étirements.",
    "On ne sait pas quel temps il fait chez vous, mais ici il pleut des anecdotes.",
  ],
  hero: ["Le plat de résistance", "Le gros morceau du jour", "À lire avec un deuxième café", "Le dossier qui fait briller", "L'histoire du jour, en grand", "Le feuilleton du matin", "Notre coup de cœur (et de crayon)"],
  more: ["Et pour accompagner", "Aussi au menu", "Les petites douceurs", "Pendant que vous y êtes", "Le reste de l'édition (tout aussi bon)", "En entrée et en dessert", "Trois minutes de plus ?"],
  cta: ["Lire la BD", "Je veux savoir", "Montrez-moi", "Allez, j'y vais", "Raconte !", "Dérouler les cases"],
  ctaBig: ["Lire le dossier", "Plonger dans le dossier", "Je prends le dossier", "Ouvrir le dossier", "C'est parti pour le dossier"],
  spoilerT: ["🙈 La phrase « Pour briller en société » du jour", "🤫 Le secret du jour (à répéter au dîner)", "✨ La phrase qui fait briller, cachée ici", "🎁 Votre réplique du jour, sous le papier cadeau"],
  spoilerS: ["Spoiler caché. Touchez ici pour la découvrir (ou lisez le dossier d'abord, comme une personne raisonnable).",
    "On l'a planquée pour ne rien vous gâcher. Touchez si vous êtes pressé.",
    "Réservé aux impatients. Les autres, lisez d'abord la BD.",
    "Une phrase, un dîner sauvé. Touchez pour la révéler."],
  game: ["Une seule partie. Pas de seconde chance. Votre honneur est en jeu.", "Trois minutes, zéro triche, une grille à partager pour frimer.",
    "Votre score sera jugé par vos amis. Aucune pression.", "Le seul jeu où perdre rend quand même plus cultivé."],
  refT: ["Un ami, un dossier", "Parrainez, dévorez", "Partagez, c'est gagné", "Le bouche-à-oreille, ça paie"],
  refS: ["Chaque ami qui s'inscrit avec votre lien vous offre un Grand Dossier en entier. Vos amis deviennent cultivés, vous aussi : tout le monde y gagne.",
    "Envoyez votre lien à quelqu'un qui aime avoir raison au dîner. S'il s'inscrit, un Grand Dossier est pour vous.",
    "Un lien, un ami inscrit, un dossier débloqué. C'est la seule pyramide qu'on recommande (après Khéops)."],
  ps: [
    "P.-S. Si cette newsletter atterrit dans vos promotions, glissez-la dans la boîte principale. Elle le vivra très bien.",
    "P.-S. Vous connaissez quelqu'un qui dit « en fait, techniquement » à chaque phrase ? Transférez-lui ce mail. Il a besoin de munitions.",
    "P.-S. Une erreur dans une BD ? Répondez à ce mail. Un humain lit tout, généralement avant son deuxième café.",
    "P.-S. Aucun crayon n'a été maltraité pendant la fabrication de cette édition. Enfin, presque aucun.",
    "P.-S. Demain, même heure, même endroit. On apporte les anecdotes, vous apportez le café.",
    "P.-S. Si vous avez lu jusqu'ici, vous méritez une médaille. On n'en a pas. Voici un dossier à la place.",
  ],
  subject: ["☕ %s", "🗞️ %s", "📚 %s", "💡 %s", "🖍️ %s", "%s (et trois autres histoires)", "Ce matin : %s", "%s, en BD"],
};
const dayNum = day => Math.floor(Date.parse(day + "T12:00:00Z") / 86400000);
const pick = (key, day, k = 0) => { const l = POOLS[key]; return l[(dayNum(day) * (k + 3) + k * 7) % l.length]; };
const QUIZ_NAMES = { culture: "Quiz culture G", geo: "Quiz géo", frise: "La Frise", dico: "Le Dico menteur", plusmoins: "Plus ou moins", swipe: "Le Swipe", chiffre: "Le Chiffre", citation: "Qui a dit ça ?" };

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

/* HTML de la newsletter. {{params.t}} = jeton de suivi, {{params.u}} = désinscription, {{params.r}} = code de parrainage. */
export function newsletterMail(env, ed) {
  const app = env.APP_URL, api = env.API_URL, day = ed.day, nl = ed.nl || {};
  const click = target => `${api}/nl/c/{{params.t}}?u=${encodeURIComponent(target)}`;
  const deep = id => `${app}?d=${day}&f=${id}`;
  const img = f => f.cover ? `${app}editions/${day}/${f.cover}` : "";
  const blurb = f => f.teaser || f.tagline || "";
  const lead = ed.formats.find(f => f.id === "dossier") || ed.stories[0];
  const others = ed.stories.filter(f => f !== lead);
  const shine = (lead?.final?.text ? lead : ed.stories.find(f => f.final?.text))?.final?.text || "";
  const label = t => `<p style="margin:0 0 8px;padding:0 4px;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:${C.muted}">${esc(t)}</p>`;
  const hero = f => `<tr><td style="padding:0 0 18px">${label(nl.hero || pick("hero", day, 1))}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C[f.id] || C.dossier};border-radius:20px"><tr><td style="padding:18px 18px 8px">
<span style="display:inline-block;background:rgba(255,255,255,.92);color:${C.ink};font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px">${esc(f.label)}${f.theme ? " · " + esc(f.theme) : ""} · ${f.minutes || 3} min</span>
<h2 style="font-family:${SERIF};font-size:28px;line-height:1.08;margin:10px 0 8px;color:#fff"><a href="${click(deep(f.id))}" style="color:#fff;text-decoration:none">${esc(f.title)}</a></h2>
${blurb(f) ? `<p style="margin:0 0 12px;color:#fff;opacity:.95;font-size:16px;line-height:1.45">${esc(blurb(f))}</p>` : ""}</td></tr>
${img(f) ? `<tr><td style="padding:0 18px"><a href="${click(deep(f.id))}"><img src="${img(f)}" alt="${esc(f.title)}" width="100%" style="display:block;width:100%;max-height:440px;object-fit:cover;object-position:top;border-radius:14px;border:0;background:#fff"></a></td></tr>` : ""}
<tr><td style="padding:14px 18px 18px"><a href="${click(deep(f.id))}" style="display:inline-block;background:${C.yellow};color:${C.ink};font-weight:700;font-size:17px;text-decoration:none;padding:12px 22px;border-radius:999px">${esc(pick("ctaBig", day, 2))} →</a></td></tr></table></td></tr>`;
  const small = (f, k) => `<tr><td style="padding:0 0 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border-left:6px solid ${C[f.id] || C.dossier}"><tr>
${img(f) ? `<td width="112" valign="top" style="padding:12px 0 12px 12px"><a href="${click(deep(f.id))}"><img src="${img(f)}" alt="" width="100" height="130" style="display:block;width:100px;height:130px;object-fit:cover;object-position:top;border-radius:10px;border:0"></a></td>` : ""}
<td valign="top" style="padding:12px 14px">
<span style="font-size:12px;font-weight:700;color:${C[f.id] || C.muted}">${esc(f.label)} · ${f.minutes || 2} min</span>
<h3 style="font-family:${SERIF};font-size:19px;line-height:1.15;margin:4px 0 6px"><a href="${click(deep(f.id))}" style="color:${C.ink};text-decoration:none">${esc(f.title)}</a></h3>
${blurb(f) ? `<p style="margin:0 0 8px;font-size:14.5px;line-height:1.4;color:${C.ink}">${esc(blurb(f))}</p>` : ""}
<a href="${click(deep(f.id))}" style="font-size:14.5px;font-weight:700;color:${C.ink}">${esc(POOLS.cta[(dayNum(day) + k * 2) % POOLS.cta.length])} →</a></td></tr></table></td></tr>`;
  const quiz = ed.formats.find(f => f.id === "quiz");
  const inner = `<tr><td style="padding:0 4px 4px;font-size:13px;color:${C.muted};text-transform:capitalize">${esc(fmtDay(day))}</td></tr>
<tr><td style="padding:0 4px 18px;font-size:17px;line-height:1.5">${esc(nl.intro || pick("intro", day))}</td></tr>
${lead ? hero(lead) : ""}
${others.length ? `<tr><td>${label(pick("more", day, 4))}</td></tr>${others.map(small).join("")}` : ""}
${shine ? `<tr><td style="padding:8px 0 12px"><a href="${api}/nl/s/{{params.t}}" style="display:block;text-decoration:none;background:${C.ink};color:#fff;border-radius:18px;padding:16px 18px">
<span style="font-family:${SERIF};font-size:20px;font-weight:800;display:block">${esc(pick("spoilerT", day, 5))}</span>
<span style="font-size:15px;opacity:.85">${esc(pick("spoilerS", day, 6))}</span></a></td></tr>` : ""}
${quiz ? `<tr><td style="padding:0 0 12px"><a href="${click(deep("quiz"))}" style="display:block;text-decoration:none;background:#fff;border:2px solid ${C.ink};border-radius:18px;padding:16px 18px;color:${C.ink}">
<span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${C.muted}">Le jeu du jour</span>
<span style="font-family:${SERIF};font-size:22px;font-weight:800;display:block;margin:4px 0">${esc(QUIZ_NAMES[quiz.kind] || "Le jeu du jour")}</span>
<span style="font-size:15px">${esc(nl.game || pick("game", day, 7))} →</span></a></td></tr>` : ""}
<tr><td style="padding:0 0 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff4d6;border-radius:18px"><tr><td style="padding:16px 18px">
<span style="font-family:${SERIF};font-size:20px;font-weight:800;display:block;margin:0 0 4px">🎁 ${esc(pick("refT", day, 8))}</span>
<span style="font-size:15px;line-height:1.45;display:block;margin:0 0 10px">${esc(pick("refS", day, 9))}</span>
<a href="${app}?ref={{params.r}}" style="font-size:14px;font-weight:700;color:${C.ink};word-break:break-all">${app}?ref={{params.r}}</a></td></tr></table></td></tr>
<tr><td style="padding:6px 4px 0;font-size:14px;line-height:1.5;color:${C.muted}">${esc(nl.ps || pick("ps", day, 10))}</td></tr>`;
  const footer = `Vous recevez cet e-mail parce que vous avez demandé à devenir plus cultivé. C'est tout à votre honneur.<br>
<a href="${api}/nl/unsub?t={{params.u}}" style="color:${C.muted}">Se désinscrire</a> · <a href="${app}" style="color:${C.muted}">Ouvrir l'appli</a><img src="${api}/nl/o/{{params.t}}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">`;
  const subject = (nl.subject || pick("subject", day, 11).replace("%s", lead?.title || "L'édition du jour")).slice(0, 120);
  const text = [`Le Sachoir · ${fmtDay(day)}`, "", nl.intro || pick("intro", day), "",
    ...ed.stories.map(f => `${f.label} : ${f.title}\n${blurb(f)}\n${deep(f.id)}\n`),
    quiz ? `Le jeu du jour : ${deep("quiz")}` : "", "", `Un ami, un dossier : ${app}?ref={{params.r}}`, "", `Se désinscrire : ${api}/nl/unsub?t={{params.u}}`].join("\n");
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
