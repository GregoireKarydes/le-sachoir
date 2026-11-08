// Petits outils partagés par l'API du Sachoir.

export const nowIso = () => new Date().toISOString();
export const parisDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
export const parisHour = (d = new Date()) => +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(d);
export const shiftDay = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const addSeconds = s => new Date(Date.now() + s * 1000).toISOString();

export const esc = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function randomCode() {
  const a = crypto.getRandomValues(new Uint32Array(1));
  return String(a[0] % 1000000).padStart(6, "0");
}
export async function sha256(text) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export const EMAIL_RE = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,190}\.[a-z]{2,24}$/i;
export const normEmail = e => String(e || "").trim().toLowerCase();

// Série : jours consécutifs jusqu'à aujourd'hui (ou hier) — même règle que l'appli.
export function streakOf(visited = [], today = parisDay()) {
  const v = new Set(visited); let d = v.has(today) ? today : shiftDay(today, -1), n = 0;
  while (v.has(d)) { n++; d = shiftDay(d, -1); }
  return n;
}

/* Fusion des données de deux appareils (ou appareil + compte).
   - jours lus, dossiers : union ;
   - lectures : la case la plus loin ;
   - favoris : ajout et retrait datés (favsOff), le plus récent gagne ;
   - jeu du jour : une partie finie l'emporte, sinon celle qui a le plus de réponses. */
const favKey = x => `${x.date}|${x.fid}|${x.type || "bd"}`;
const answered = q => (q?.a || []).filter(x => x !== null && x !== undefined).length;
export function mergeState(a = {}, b = {}) {
  a = a || {}; b = b || {};
  const uni = (x, y) => [...new Set([...(Array.isArray(x) ? x : []), ...(Array.isArray(y) ? y : [])])].filter(s => typeof s === "string").sort();
  const reads = new Map();
  for (const r of [...(a.reads || []), ...(b.reads || [])]) {
    if (!r || !r.date || !r.fid) continue;
    const k = `${r.date}|${r.fid}`, o = reads.get(k);
    reads.set(k, o ? { ...o, ...r, max: Math.max(+o.max || 0, +r.max || 0), theme: r.theme || o.theme || "" } : { date: r.date, fid: r.fid, theme: r.theme || "", max: +r.max || 0 });
  }
  const off = { ...(a.favsOff || {}) };
  for (const [k, t] of Object.entries(b.favsOff || {})) off[k] = Math.max(+off[k] || 0, +t || 0);
  const favs = new Map();
  for (const f of [...(a.favs || []), ...(b.favs || [])]) {
    if (!f || !f.date || !f.fid) continue;
    const k = favKey(f), o = favs.get(k);
    if (!o || (+f.t || 0) > (+o.t || 0)) favs.set(k, f);
  }
  const quiz = { ...(a.quiz || {}) };
  for (const [d, q] of Object.entries(b.quiz || {})) {
    const o = quiz[d];
    const done = x => !!x && (x.done ?? ("s" in x));
    if (!o) quiz[d] = q;
    else if (done(q) && !done(o)) quiz[d] = q;
    else if (done(q) === done(o) && answered(q) > answered(o)) quiz[d] = q;
  }
  return {
    visited: uni(a.visited, b.visited),
    dossiers: uni(a.dossiers, b.dossiers),
    reads: [...reads.values()].sort((x, y) => (x.date + x.fid).localeCompare(y.date + y.fid)),
    favs: [...favs.values()].filter(f => !((+off[favKey(f)] || 0) >= (+f.t || 0) && off[favKey(f)])).sort((x, y) => (+x.t || 0) - (+y.t || 0)),
    favsOff: off,
    quiz,
    name: (b.name || a.name || "").slice(0, 24),
    installDone: !!(a.installDone || b.installDone),
  };
}
