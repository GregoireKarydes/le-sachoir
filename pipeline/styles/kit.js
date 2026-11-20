// kit.js — the director's toolbox for the hand-directed Reels (« réalisation par vidéo », 20 November 2026).
// A Reel with `film.scene` brings its own `scene.js`, written for that video only: its shots, its camera, its text.
// This file gives the scene the timing (one beat = one spoken line), a 2D camera, transitions and kinetic type.
// Nothing here draws a set: sets are the scene's job. Style primitives (brush, sprites, puppets, pencil, flat discs)
// come from each style module's `KIT` export (ink.js, pixel.js, comic.js, sketch.js, zoom.js).
import { TL, g, W, H, lineAt, envAt } from './core.js';
import { clamp, lerp, seg, eio, eo, ei, back, spring, hash, mulberry, vnoise, TAU } from './lib.js';

export { TL, g, W, H, clamp, lerp, seg, eio, eo, ei, back, spring, hash, mulberry, vnoise, TAU };
export const EASE = { lin: x => clamp(x), io: eio, out: eo, in: ei, back: x => back(x), spring: x => spring(x) };

// ───────── timing: beats come from the voice (film_render.py), so the scene never hard-codes seconds
export const N = TL.beats.length;
export const DUR = TL.dur;
/** beat i: {t0, t1, d} ; negative i counts from the end (-1 = last beat) */
export const B = i => { const b = TL.beats[(i + N) % N]; return { t0: b.t0, t1: b.t1, d: b.t1 - b.t0, i: b.i, text: b.text, who: b.who }; };
/** the time at fraction f (0..1) of beat i */
export const at = (i, f = 0) => { const b = B(i); return b.t0 + b.d * f; };
/** progress 0..1 of t inside [a, b] seconds, eased */
export const prog = (t, a, b, ease = 'lin') => EASE[ease](seg(t, a, b));
/** progress 0..1 of t across beat i (or from fraction f0 to f1 of it) */
export const ub = (t, i, f0 = 0, f1 = 1, ease = 'lin') => prog(t, at(i, f0), at(i, f1), ease);
/** the beat playing at t */
export const beatIndex = t => { for (let i = N - 1; i >= 0; i--) if (t >= TL.beats[i].t0) return i; return 0; };
/** mouth opening 0..1 of whoever speaks at t (for lip-flaps), and who it is */
export const talk = t => { const l = lineAt(t); return l ? envAt(l, t) : 0; };
export const speaker = t => { const l = lineAt(t); return l ? (l.who === 'perso' ? (l.name || 'perso') : 'narr') : null; };
/** drawings on twos (12 fps) for a hand-made feel; the camera stays on ones */
export const twos = t => Math.floor(t * 12 + 1e-6) / 12;

// ───────── shots: a list of {from, to, draw(lt, u, t)} with from/to in seconds (use at()); returns the active one
export function shot(t, list) {
  for (let k = list.length - 1; k >= 0; k--) if (t >= list[k].from) { const s = list[k]; const lt = t - s.from; return { ...s, k, lt, u: clamp(lt / Math.max(.01, (s.to ?? DUR) - s.from)) }; }
  return { ...list[0], k: 0, lt: 0, u: 0 };
}

// ───────── 2D camera: keys [[t, {x, y, z, r}], ...] in world units, the world point (x, y) at the frame centre
// each key may carry `e` (ease into it: 'io' default, 'out', 'in', 'lin', 'back', 'cut' = jump).
export function camera(keys) {
  return t => {
    if (t <= keys[0][0]) return { ...keys[0][1] };
    for (let k = 1; k < keys.length; k++) if (t <= keys[k][0]) {
      const [ta, A] = keys[k - 1], [tb, Bk] = keys[k];
      if (Bk.e === 'cut') return { ...A };
      const u = EASE[Bk.e || 'io']((t - ta) / (tb - ta)), z0 = A.z ?? 1, z1 = Bk.z ?? 1;
      return { x: lerp(A.x, Bk.x, u), y: lerp(A.y, Bk.y, u), z: Math.exp(lerp(Math.log(z0), Math.log(z1), u)), r: lerp(A.r || 0, Bk.r || 0, u) };
    }
    return { ...keys[keys.length - 1][1] };
  };
}
/** set g (or another 2D context) so that world (c.x, c.y) sits at screen (sx, sy), zoomed and turned */
export function look(c, ctx = g, sx = W / 2, sy = H / 2) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(sx, sy); ctx.rotate(c.r || 0); ctx.scale(c.z ?? 1, c.z ?? 1); ctx.translate(-c.x, -c.y);
}
/** handheld drift and impact shake, deterministic */
export function shake(t, amp = 8, freq = 7, seed = 1) { return [amp * (vnoise(t * freq + seed) - .5) * 2, amp * (vnoise(t * freq + seed + 17) - .5) * 2]; }
export const reset = (ctx = g) => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; };

// ───────── transitions (drawn over the frame, in screen space)
/** whip pan: returns a horizontal offset to add to the camera and draws motion streaks; peak at `at` */
export function whip(t, at0, d = .3, dir = 1) {
  const u = seg(t, at0 - d / 2, at0 + d / 2); if (u <= 0 || u >= 1) return 0;
  const k = Math.sin(u * Math.PI);
  reset(); g.globalAlpha = .55 * k; g.fillStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 26; i++) { const y = hash(i * 7.3) * H, h = 4 + hash(i) * 30; g.fillRect(0, y, W, h); }
  g.globalAlpha = 1;
  return dir * (u < .5 ? 1 : -1) * k * W * .6;
}
/** iris: a circle that closes to (x, y) then opens on the next shot (k: 0 open … 1 closed) */
export function iris(x, y, k, col = '#0b0b0b') {
  if (k <= 0) return; reset(); const r = (1 - clamp(k)) * Math.hypot(W, H);
  g.fillStyle = col; g.beginPath(); g.rect(0, 0, W, H); g.arc(x, y, Math.max(0, r), 0, TAU, true); g.fill('evenodd');
}
/** flash frame (a hit) */
export function flash(t, at0, d = .12, col = '#fff') { const u = seg(t, at0, at0 + d); if (u <= 0 || u >= 1) return; reset(); g.globalAlpha = 1 - u; g.fillStyle = col; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
/** wipe with a soft edge in the medium's own colour (k 0..1, angle in radians) */
export function wipe(k, col, angle = -.3) {
  if (k <= 0) return; reset(); g.save(); g.translate(W / 2, H / 2); g.rotate(angle);
  const D = Math.hypot(W, H); g.fillStyle = col; g.fillRect(-D / 2, -D / 2, D * clamp(k), D); g.restore();
}
/** letterbox bars (cinema moment) */
export function bars(k, h = 150, col = '#0b0b0b') { if (k <= 0) return; reset(); g.fillStyle = col; g.fillRect(0, 0, W, h * k); g.fillRect(0, H - h * k, W, h * k); }

// ───────── kinetic type: every function draws at screen (or current) coordinates from a start time t0
// o: {font, color, align, stroke, strokeColor, shadow, box, boxColor, pad, rot, max}
function prep(o) { g.font = o.font || '800 80px "Baloo 2"'; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; }
function paint(text, x, y, o) {
  if (o.box) { const w = g.measureText(text).width, fs = parseInt((g.font.match(/(\d+)px/) || [0, 80])[1]), p = o.pad ?? 18, ax = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2;
    g.fillStyle = o.boxShadow || 'rgba(0,0,0,0)'; if (o.boxShadow) g.fillRect(x + ax - p + 9, y - fs * .62 + 9, w + 2 * p, fs * 1.24);
    g.fillStyle = o.boxColor || '#f5b62a'; g.fillRect(x + ax - p, y - fs * .62, w + 2 * p, fs * 1.24); }
  if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.stroke; g.strokeStyle = o.strokeColor || '#17140f'; g.strokeText(text, x, y); }
  g.fillStyle = o.color || '#17140f'; g.fillText(text, x, y);
}
export const TXT = {
  /** scale pop with a spring, slight overshoot */
  pop(text, x, y, t, t0, o = {}) { const u = t - t0; if (u < 0) return; const s = spring(u * 1.3, 9, .42); prep(o); g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.scale(s, s); g.globalAlpha = clamp(u * 8); paint(text, 0, 0, o); g.restore(); },
  /** slammed in from big, with a 2-frame shake */
  slam(text, x, y, t, t0, o = {}) { const u = t - t0; if (u < 0) return; const s = 1 + 1.6 * Math.pow(1 - clamp(u / .16), 3); const [sx, sy] = u < .25 ? shake(u, 10, 40) : [0, 0]; prep(o); g.save(); g.translate(x + sx, y + sy); g.rotate(o.rot || 0); g.scale(s, s); g.globalAlpha = clamp(u * 10); paint(text, 0, 0, o); g.restore(); },
  /** typed letter by letter (cps letters per second) with a caret */
  type(text, x, y, t, t0, o = {}) { const u = t - t0; if (u < 0) return; const n = Math.min(text.length, Math.floor(u * (o.cps || 26))); prep(o); const s = text.slice(0, n); paint(s, x, y, { ...o, box: n ? o.box : false }); if (n < text.length && Math.floor(u * 4) % 2 === 0) { const w = g.measureText(s).width, ax = o.align === 'center' ? w / 2 : o.align === 'right' ? 0 : w; g.fillStyle = o.color || '#17140f'; g.fillRect(x + ax + 6, y - 30, 6, 60); } },
  /** words rise one by one (stagger seconds between words) */
  rise(text, x, y, t, t0, o = {}) { prep(o); const words = text.split(' '), sp = g.measureText(' ').width, ws = words.map(w => g.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1); let px = o.align === 'left' ? x : x - tot / 2; g.textAlign = 'left'; words.forEach((w, k) => { const u = clamp((t - t0 - k * (o.stagger ?? .09)) / .3); if (u > 0) { g.save(); g.globalAlpha = u; g.translate(0, (1 - eo(u)) * (o.dy ?? 60)); paint(w, px, y, { ...o, align: 'left' }); g.restore(); } px += ws[k] + sp; }); },
  /** a marker sweep highlights the text from left to right */
  highlight(text, x, y, t, t0, o = {}) { prep(o); const w = g.measureText(text).width, fs = parseInt((g.font.match(/(\d+)px/) || [0, 80])[1]), u = eo(clamp((t - t0) / (o.d || .45))), ax = o.align === 'left' ? 0 : -w / 2; g.fillStyle = o.mark || 'rgba(245,182,42,.85)'; g.fillRect(x + ax - 10, y - fs * .1, (w + 20) * u, fs * .5); paint(text, x, y, o); },
  /** a counter rolling from a to b (format: n => string) */
  count(a, b, x, y, t, t0, d, o = {}) { const u = eo(clamp((t - t0) / d)); const v = lerp(a, b, u); prep(o); paint((o.fmt || (n => Math.round(n).toLocaleString('fr-FR')))(v), x, y, o); },
  /** a stamp: rotated, thudded down, inked edge */
  stamp(text, x, y, t, t0, o = {}) { const u = t - t0; if (u < 0) return; const s = 1 + 2.2 * Math.pow(1 - clamp(u / .12), 2); prep(o); g.save(); g.translate(x, y); g.rotate(o.rot ?? -.12); g.scale(s, s); g.globalAlpha = clamp(u * 9) * (o.alpha ?? .92); const w = g.measureText(text).width, fs = parseInt((g.font.match(/(\d+)px/) || [0, 80])[1]); g.strokeStyle = o.color || '#c0392b'; g.lineWidth = 8; g.strokeRect(-w / 2 - 26, -fs * .7, w + 52, fs * 1.4); paint(text, 0, 0, { ...o, color: o.color || '#c0392b' }); g.restore(); },
  /** a strike-through drawn across text already on screen */
  strike(x0, y0, x1, y1, t, t0, o = {}) { const u = eo(clamp((t - t0) / (o.d || .25))); if (u <= 0) return; g.strokeStyle = o.color || '#c0392b'; g.lineWidth = o.w || 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, u), lerp(y0, y1, u)); g.stroke(); },
  /** fade + blur in (a reveal for calm styles) */
  focus(text, x, y, t, t0, o = {}) { const u = clamp((t - t0) / (o.d || .5)); if (u <= 0) return; prep(o); g.save(); g.globalAlpha = u; g.filter = u < 1 ? `blur(${(1 - u) * 8}px)` : 'none'; paint(text, x, y, o); g.restore(); },
};
/** hide a text again: multiply alpha by this (fade out from t1 over d) */
export const out = (t, t1, d = .2) => 1 - clamp((t - t1) / d);
