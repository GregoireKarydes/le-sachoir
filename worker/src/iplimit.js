// Limite par adresse IP des e-mails qu'un visiteur peut déclencher (code de connexion, confirmation de newsletter).
// Sans elle, quelqu'un pouvait vider le quota du jour (290 e-mails) en changeant d'adresse e-mail à chaque demande,
// et bloquer la newsletter. L'IP n'est pas gardée : une empreinte liée au jour, effacée après deux jours.
import { parisDay, shiftDay, sha256 } from "./util.js";

export const ipDailyLimit = env => { const n = +(env.MAIL_IP_DAILY_LIMIT ?? 12); return Number.isFinite(n) && n >= 0 ? n : 12; };
export const ipKey = async (ip, day) => (await sha256(`ip|${day}|${ip}`)).slice(0, 24);

// true si cette IP a déjà déclenché trop d'e-mails aujourd'hui. Compte la demande au passage.
// En cas de doute (pas d'IP, table absente, base en panne), on laisse passer : la limite ne doit jamais bloquer un vrai lecteur.
export async function ipLimited(env, req, today = parisDay()) {
  const max = ipDailyLimit(env);
  const ip = req.headers.get("cf-connecting-ip") || "";
  if (!max || !ip) return false;
  try {
    const key = await ipKey(ip, today);
    const row = await env.DB.prepare("INSERT INTO ip_hits (key, day, n) VALUES (?, ?, 1) ON CONFLICT (key, day) DO UPDATE SET n = n + 1 RETURNING n").bind(key, today).first();
    if (row && row.n === 1) await env.DB.prepare("DELETE FROM ip_hits WHERE day < ?").bind(shiftDay(today, -1)).run();
    return !!row && row.n > max;
  } catch (e) { console.error("ip_hits", e); return false; }
}
