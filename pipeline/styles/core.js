// core.js — shared engine for the alternating-style Reels (20 November 2026).
// Reads ep/timeline.json (written by pipeline/film_render.py). Every style module draws a beat; the core supplies the
// timeline, the subject images, image filters, the yellow question band, subtitle paging, the hidden bulb and the end card.
import { clamp, hash, mulberry, seg } from './lib.js';

export const W = 1080, H = 1920;
export const cv = document.getElementById('c');
export const g = cv.getContext('2d');
const qs = new URLSearchParams(location.search);
export const EP = qs.get('ep') || 'ep';
export const TL = await (await fetch(`${EP}/timeline.json`)).json();
export const YELLOW = '#f5b62a', INK = '#17140f';

// ---- images (loaded once, filtered once per style and cached) ----
export const IMG = {};
await Promise.all([...new Set(TL.beats.filter(b => b.img).map(b => b.img))].map(src => new Promise(res => {
  const im = new Image(); im.onload = () => { IMG[src] = im; res(); }; im.onerror = () => res(); im.src = `${EP}/${src}`;
})));
export const imgOf = b => (b && b.img && IMG[b.img]) || null;
/** last image shown at or before beat i (a beat without its own image keeps the previous subject on screen) */
export function imgUpTo(i) { for (let k = i; k >= 0; k--) if (imgOf(TL.beats[k])) return TL.beats[k].img; return null; }

export const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
/** cover-fit an image into a w×h canvas (optionally focused on fx, fy in 0..1) */
export function fit(im, w, h, fx = .5, fy = .45) {
  const c = canvas(w, h), x = c.getContext('2d'), s = Math.max(w / im.width, h / im.height);
  const dw = im.width * s, dh = im.height * s;
  x.drawImage(im, (w - dw) * fx, (h - dh) * fy, dw, dh);
  return c;
}
export function pixels(c) { return c.getContext('2d').getImageData(0, 0, c.width, c.height); }
export function lum(d, i) { return (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) / 255; }
/** Sobel edge magnitude (0..1) on a small copy, returns Float32Array + size */
export function edgeMap(c) {
  const { width: w, height: h, data: d } = pixels(c), L = new Float32Array(w * h), E = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = lum(d, i * 4);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    const gx = -L[p - w - 1] - 2 * L[p - 1] - L[p + w - 1] + L[p - w + 1] + 2 * L[p + 1] + L[p + w + 1];
    const gy = -L[p - w - 1] - 2 * L[p - w] - L[p - w + 1] + L[p + w - 1] + 2 * L[p + w] + L[p + w + 1];
    E[p] = Math.min(1, Math.hypot(gx, gy));
  }
  return { w, h, L, E };
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const rgb = hex;
/** map each pixel to the nearest colour of a palette, with an optional 4x4 Bayer dither (pixel styles) */
export function quantize(c, pal, dither = 0) {
  const P = pal.map(hex), id = pixels(c), d = id.data, w = c.width;
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % w, py = Math.floor(i / 4 / w), o = dither ? (B[(py % 4) * 4 + (px % 4)] / 16 - .5) * dither * 255 : 0;
    let best = 0, bd = 1e9;
    for (let k = 0; k < P.length; k++) { const e = (d[i] + o - P[k][0]) ** 2 * .3 + (d[i + 1] + o - P[k][1]) ** 2 * .59 + (d[i + 2] + o - P[k][2]) ** 2 * .11; if (e < bd) { bd = e; best = k; } }
    d[i] = P[best][0]; d[i + 1] = P[best][1]; d[i + 2] = P[best][2];
  }
  c.getContext('2d').putImageData(id, 0, 0); return c;
}
/** the dominant soft colours of a picture (for swatches and colour blocks) */
export function swatches(c, n = 5) {
  const s = canvas(24, 24); s.getContext('2d').drawImage(c, 0, 0, 24, 24);
  const d = pixels(s).data, out = [];
  for (let k = 0; k < n; k++) { const i = (Math.floor(hash(k * 7 + 1) * 24) * 24 + Math.floor(hash(k * 13 + 5) * 24)) * 4; out.push(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`); }
  return out;
}

// ---- tiles and textures (deterministic) ----
export function noiseTile(size, seed, fn) {
  const c = canvas(size, size), x = c.getContext('2d'), id = x.createImageData(size, size), r = mulberry(seed);
  for (let i = 0; i < size * size; i++) { const [R, G, B, A] = fn(r(), i % size, Math.floor(i / size)); id.data.set([R, G, B, A], i * 4); }
  x.putImageData(id, 0, 0); return c;
}

// ---- timeline lookups ----
export const beatAt = t => { const B = TL.beats; for (let i = B.length - 1; i >= 0; i--) if (t >= B[i].t0) return B[i]; return B[0]; };
export const lineAt = t => TL.lines.find(l => t >= l.t && t < l.t + l.dur);
export const isEnd = t => t >= TL.end_t0;
export function envAt(l, t) { if (!l || !l.env) return 0; const i = Math.floor((t - l.t) * 24); return l.env[clamp(i, 0, l.env.length - 1)] || 0; }
export const speaking = (b, t) => { const l = lineAt(t); return l && b && l.beat === b.i ? l : null; };

// ---- text helpers ----
export function wrap(text, maxW) {
  const out = []; for (const para of String(text).split('\n')) { let cur = ''; for (const w of para.split(' ')) { const s = cur ? cur + ' ' + w : w; if (g.measureText(s).width > maxW && cur) { out.push(cur); cur = w; } else cur = s; } if (cur) out.push(cur); } return out;
}
/** two lines at a time, paged with the voice */
export function subtitleLines(l, t, maxW) {
  const all = wrap(l.text, maxW), pages = [];
  for (let i = 0; i < all.length; i += 2) pages.push(all.slice(i, i + 2));
  let lines = pages[0] || [];
  if (pages.length > 1) {
    const tot = all.join(' ').length, f = clamp((t - l.t) / Math.max(.1, l.dur || 1)) * tot;
    let acc = 0; for (const P of pages) { lines = P; acc += P.join(' ').length + 1; if (f < acc) break; }
  }
  return lines;
}
export const subAt = t => TL.lines.find(x => t >= x.t - .05 && t < x.sub_t1);
/** sous-titres mot à mot (bible v3) : un groupe de 2 à 5 mots, le mot en cours repéré par `cur` */
export function subChunk(l, t, maxW, font) {
  if (font) g.font = font;
  const words = String(l.text).split(/\s+/).filter(Boolean), tot = words.join(' ').length || 1;
  const starts = []; let acc = 0; for (const w of words) { starts.push(l.t + (acc / tot) * l.dur); acc += w.length + 1; }
  let cur = 0; for (let k = 0; k < words.length; k++) if (t >= starts[k]) cur = k;
  // groupes : on coupe après une ponctuation (2 mots au moins) ou à 5 mots, jamais plus large que maxW
  const groups = []; let gcur = [];
  words.forEach((w, k) => { const tryS = [...gcur.map(j => words[j]), w].join(' ');
    if (gcur.length && (gcur.length >= 5 || g.measureText(tryS).width > maxW)) { groups.push(gcur); gcur = []; }
    gcur.push(k); if (/[.,;:!?…]$/.test(w) && gcur.length >= 2) { groups.push(gcur); gcur = []; } });
  if (gcur.length) groups.push(gcur);
  const G = groups.find(x => x.includes(cur)) || groups[0] || [];
  return { words: G.map(j => words[j]), cur: G.indexOf(cur) };
}
/** dessine un groupe de mots centré en x (ou aligné à gauche), le mot en cours dans la couleur `hi` */
export function drawChunk(c, x, y, col, hi, o = {}) {
  const sp = g.measureText(' ').width, ws = c.words.map(w => g.measureText(w).width), W0 = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  let px = o.align === 'left' ? x : x - W0 / 2; g.textAlign = 'left';
  if (o.mark && c.cur >= 0) { let mx = px; for (let k = 0; k < c.cur; k++) mx += ws[k] + sp; const fs = parseInt(g.font.match(/(\d+)px/)[1]); g.fillStyle = o.mark; g.fillRect(mx - 6, y - fs * .42, ws[c.cur] + 12, fs * .86); }
  if (o.under && c.cur >= 0) { let mx = px; for (let k = 0; k < c.cur; k++) mx += ws[k] + sp; const fs = parseInt(g.font.match(/(\d+)px/)[1]); g.fillStyle = o.under; g.fillRect(mx, y + fs * .42, ws[c.cur], Math.max(4, fs * .08)); }
  c.words.forEach((w, k) => { if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeCol || INK; g.lineJoin = 'round'; g.strokeText(w, px, y); } g.fillStyle = k === c.cur ? hi : col; g.fillText(w, px, y); px += ws[k] + sp; });
  return W0;
}
export const hasDigit = s => /\d/.test(s || '');

// ---- the yellow question band (same in every style; only the font changes) ----
export function band(t, font = '800 74px "Baloo 2"', lh = 86) {
  const B = TL.band; if (!B || !B.text) return;
  const first = t >= B.t0 && t < B.t1, last = B.again != null && t >= B.again;
  if (!first && !last) return;
  const lines = B.text.split('\n'), k = first ? clamp((B.t1 - t) / .2) : clamp((t - B.again) / .15);
  g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.translate(W / 2, 340); g.rotate(-.025); g.scale(1, Math.min(1, k));
  g.font = font; const wmax = Math.max(...lines.map(L => g.measureText(L).width)) + 90, w = Math.min(980, Math.max(640, wmax)), h = lh * lines.length + 46;
  g.fillStyle = INK; g.fillRect(-w / 2 + 10, -h / 2 + 10, w, h); g.fillStyle = YELLOW; g.fillRect(-w / 2, -h / 2, w, h);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((L, i) => g.fillText(L, 0, (i - (lines.length - 1) / 2) * lh + 4));
  if (last) {   // pas de carte de fin : l'adresse en petit sous le bandeau, les 3 dernières secondes
    g.font = '800 40px "Baloo 2"'; const u = B.url || 'lesachoir.fr', uw = g.measureText(u).width + 44;
    g.fillStyle = INK; g.fillRect(-uw / 2, h / 2 + 14, uw, 58); g.fillStyle = YELLOW; g.fillText(u, 0, h / 2 + 45);
  }
  g.restore();
}

// ---- the hidden Sachoir bulb (one appearance per Reel: the beat marked `bulb`) ----
export function bulb(x, y, s, o = {}) {
  const ink = o.ink || INK, fill = o.fill || YELLOW, lw = (o.lw || 6) * s;
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round';
  if (o.glow) { g.fillStyle = o.glow; g.beginPath(); g.arc(0, -10, 62, 0, 7); g.fill(); }
  g.beginPath(); g.arc(0, -16, 34, Math.PI * .78, Math.PI * 2.22); g.lineTo(13, 26); g.lineTo(-13, 26); g.closePath();
  g.fillStyle = fill; g.fill(); if (!o.noStroke) { g.strokeStyle = ink; g.lineWidth = lw / s; g.stroke(); }
  g.fillStyle = o.base || ink; g.fillRect(-14, 28, 28, 7); g.fillRect(-11, 37, 22, 6); g.fillRect(-6, 45, 12, 5);
  g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(-7, 18); g.lineTo(-7, -2); g.lineTo(7, -10); g.lineTo(7, 18); g.stroke();
  g.restore();
}

// ---- end card (logo + lesachoir.fr) in the style's own colours and fonts ----
export function endCard(t, th) {
  const lt = t - TL.end_t0, k = clamp(lt / .25);
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  if (th.tex) { g.globalAlpha = .9; g.fillStyle = g.createPattern(th.tex, 'repeat'); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  g.save(); g.translate(W / 2, 760); g.scale(.85 + .15 * k, .85 + .15 * k);
  bulb(0, -230, 2.1, { ink: th.ink, fill: YELLOW, base: th.ink });
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = th.logo; g.fillStyle = th.ink; g.fillText('LE SACHOIR', 0, 0);
  g.restore();
  if (lt > .2) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = YELLOW; g.fillRect(150, 880, 780, 110); g.fillStyle = INK; g.font = '800 70px "Baloo 2"'; g.fillText(TL.end?.url || 'lesachoir.fr', W / 2, 938);
  }
  if (lt > .4) { g.fillStyle = th.ink; g.font = th.small; for (const [i, L] of (TL.end?.lines || ['L’actu et la culture G', 'en BD, chaque matin.']).entries()) g.fillText(L, W / 2, 1070 + i * 62); }
}

// ---- small drawing helpers ----
export function roundRect(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
export const reveal = (t, b, a = 0, d = .6) => clamp((t - b.t0 - a) / d);
export const q = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
export { clamp, hash, mulberry, seg };
