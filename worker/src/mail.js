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

/* ---------- Newsletter quotidienne ---------- */
const INTROS = [
  "Bonjour. Pendant que vous dormiez, on a dessiné l'actualité. Vous pouvez nous remercier en lisant jusqu'au bout.",
  "Votre café refroidit. Profitez-en pour devenir plus cultivé que votre collègue de bureau.",
  "Nouvelle édition. Statistiquement, vous allez apprendre au moins une chose. Au pire, vous aurez vu des dessins.",
  "Ceci n'est pas un spam. C'est de la culture générale déguisée en BD. Nuance importante.",
  "On a lu les journaux pour vous. On a aussi lu des livres d'histoire. On est fatigués, mais fiers.",
  "Rappel : la culture, c'est comme la confiture. Sauf que celle-ci ne fait pas grossir.",
  "Édition du jour : vérifiée deux fois, dessinée une fois, relue par un humain qui a bu trop de café.",
  "Si vous lisez ceci dans le métro, regardez autour de vous : vous êtes la personne la plus cultivée du wagon.",
  "Bonne nouvelle : le monde tourne encore. Moins bonne nouvelle : il s'est passé des choses. On vous explique.",
  "Cinq minutes de lecture. C'est moins long qu'une réunion qui aurait pu être un e-mail. Comme celui-ci.",
  "Petit rappel de notre service juridique : briller en société n'est pas garanti, mais c'est fortement probable.",
  "On ne vous demande pas de partager cette newsletter. On vous le suggère avec insistance, mais poliment.",
  "Voici votre dose quotidienne. Effets secondaires connus : anecdotes au dîner, regards admiratifs, soupirs de vos proches.",
  "Aujourd'hui encore, aucun algorithme ne vous a enfermé dans une bulle. Juste dans une case de BD.",
];
const SUBJECTS = ["☕ %s", "🗞️ %s", "📚 %s", "💡 %s", "🖍️ %s"];
const PS = [
  "P.-S. Si cette newsletter atterrit dans vos promotions, glissez-la dans la boîte principale. Elle le vivra très bien.",
  "P.-S. Vous connaissez quelqu'un qui dit « en fait, techniquement » à chaque phrase ? Transférez-lui ce mail. Il a besoin de munitions.",
  "P.-S. Le jeu du jour se joue une seule fois. Comme la vie. En plus court.",
  "P.-S. Une erreur dans une BD ? Répondez à ce mail. Un humain lit tout, généralement avant son deuxième café.",
  "P.-S. Aucune IA n'a été maltraitée pendant la fabrication de cette édition. Quelques stylos, peut-être.",
];
const pick = (list, day) => list[Math.floor(Date.parse(day + "T12:00:00Z") / 86400000) % list.length];
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
  const formats = entry.formats.map(f => ({ ...f, final: full[f.id]?.final, kind: full[f.id]?.kind || f.kind }));
  return { day, formats, stories: formats.filter(f => f.id !== "quiz") };
}

const fmtDay = day => new Date(day + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/* HTML de la newsletter. {{params.t}} = jeton de suivi de l'envoi, {{params.u}} = jeton de désinscription. */
export function newsletterMail(env, ed) {
  const app = env.APP_URL, api = env.API_URL, day = ed.day;
  const click = target => `${api}/nl/c/{{params.t}}?u=${encodeURIComponent(target)}`;
  const deep = id => `${app}?d=${day}&f=${id}`;
  const lead = ed.formats.find(f => f.id === "dossier") || ed.stories[0];
  const shine = (lead?.final?.text ? lead : ed.stories.find(f => f.final?.text))?.final?.text || "";
  const block = f => {
    const col = C[f.id] || C.dossier, img = f.cover ? `${app}editions/${day}/${f.cover}` : "";
    return `<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${col};border-radius:18px"><tr><td style="padding:16px 16px 6px">
<span style="display:inline-block;background:rgba(255,255,255,.9);color:${C.ink};font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px">${esc(f.label)}${f.theme ? " · " + esc(f.theme) : ""}</span>
<h2 style="font-family:${SERIF};font-size:${f.id === "dossier" ? 26 : 22}px;line-height:1.1;margin:10px 0 6px;color:#fff"><a href="${click(deep(f.id))}" style="color:#fff;text-decoration:none">${esc(f.title)}</a></h2>
${f.tagline ? `<p style="margin:0 0 10px;color:#fff;opacity:.92;font-size:15px;line-height:1.4">${esc(f.tagline)}</p>` : ""}
</td></tr>${img ? `<tr><td style="padding:0 16px"><a href="${click(deep(f.id))}"><img src="${img}" alt="${esc(f.title)}" width="100%" style="display:block;width:100%;max-height:420px;object-fit:cover;object-position:top;border-radius:12px;border:0;background:#fff"></a></td></tr>` : ""}
<tr><td style="padding:12px 16px 16px"><a href="${click(deep(f.id))}" style="display:inline-block;background:${C.yellow};color:${C.ink};font-weight:700;font-size:16px;text-decoration:none;padding:11px 20px;border-radius:999px">${f.id === "dossier" ? "Lire le dossier" : "Lire la BD"} (${f.minutes || 2} min) →</a></td></tr></table></td></tr>`;
  };
  const quiz = ed.formats.find(f => f.id === "quiz");
  const inner = `<tr><td style="padding:0 4px 4px;font-size:13px;color:${C.muted};text-transform:capitalize">${esc(fmtDay(day))}</td></tr>
<tr><td style="padding:0 4px 16px;font-size:17px;line-height:1.5">${esc(pick(INTROS, day))}</td></tr>
${lead ? block(lead) : ""}
${shine ? `<tr><td style="padding:0 0 14px"><a href="${api}/nl/s/{{params.t}}" style="display:block;text-decoration:none;background:${C.ink};color:#fff;border-radius:18px;padding:16px 18px">
<span style="font-family:${SERIF};font-size:20px;font-weight:800;display:block">🙈 La phrase « Pour briller en société » du jour</span>
<span style="font-size:15px;opacity:.85">Spoiler caché. Touchez ici pour la découvrir (ou lisez le dossier d'abord, comme une personne raisonnable).</span></a></td></tr>` : ""}
${ed.stories.filter(f => f !== lead).map(block).join("")}
${quiz ? `<tr><td style="padding:0 0 14px"><a href="${click(deep("quiz"))}" style="display:block;text-decoration:none;background:#fff;border:2px solid ${C.ink};border-radius:18px;padding:16px 18px;color:${C.ink}">
<span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${C.muted}">Le jeu du jour</span>
<span style="font-family:${SERIF};font-size:22px;font-weight:800;display:block;margin:4px 0">${esc(QUIZ_NAMES[quiz.kind] || "Le jeu du jour")}</span>
<span style="font-size:15px">Une seule partie. Pas de seconde chance. Votre honneur est en jeu. →</span></a></td></tr>` : ""}
<tr><td style="padding:6px 4px 0;font-size:14px;line-height:1.5;color:${C.muted}">${esc(pick(PS, day))}</td></tr>`;
  const footer = `Vous recevez cet e-mail parce que vous avez demandé à devenir plus cultivé. C'est tout à votre honneur.<br>
<a href="${api}/nl/unsub?t={{params.u}}" style="color:${C.muted}">Se désinscrire</a> · <a href="${app}" style="color:${C.muted}">Ouvrir l'appli</a><img src="${api}/nl/o/{{params.t}}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">`;
  const subject = pick(SUBJECTS, day).replace("%s", lead?.title || "L'édition du jour");
  const text = [`Le Sachoir · ${fmtDay(day)}`, "", pick(INTROS, day), "",
    ...ed.stories.map(f => `${f.label} : ${f.title}\n${deep(f.id)}\n`),
    quiz ? `Le jeu du jour : ${deep("quiz")}` : "", "", `Se désinscrire : ${api}/nl/unsub?t={{params.u}}`].join("\n");
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
