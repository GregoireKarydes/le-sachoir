// zoom.js — « Scale Zoom Explainer » for Le Sachoir: flat opaque shapes on a night-blue ground, one shade step, glow as two hard
// rings, one continuous change of scale from stop to stop. The guide is the Sachoir bulb with a lens for an eye.
// Grammar from Lemo-Opuscar flat-space-explainer (MIT code). No gradients, no blur, no transparency, no grain in video.
import { TL, g, W, H, IMG, imgOf, imgUpTo, canvas, fit, pixels, beatAt, lineAt, envAt, subAt, subtitleLines, subChunk, drawChunk, hasDigit,
  clamp, hash, seg, YELLOW } from './core.js';
import { eio, eo, back, lerp, spring } from './lib.js';

export const FONTS = ['700 100px Jost', '600 30px Jost'];
const NIGHT = '#1D2052', R1 = '#252A63', R2 = '#30367C';
const C = { blue: ['#4D7CFE', '#3A5FD9'], mint: ['#3FD8AE', '#22B38C'], coral: ['#FF6B5E', '#E14B45'], sun: ['#FFC84A', '#F2A12F'], cream: ['#FFF4E2', '#F0DCC0'] };
const MIST = '#9298D4';
export const THEME = { bg: NIGHT, ink: '#FFF4E2', logo: '700 150px Jost', small: '600 52px Jost', band: '700 72px Jost', bandLh: 84 };
const N = TL.beats.length, ZK = 9, TR = .7;   // zoom factor between stops, transition length (s)
const CACHE = {};
const RING = i => [540 + (hash(i * 5.1) - .5) * 300, 700 + (hash(i * 2.7) - .5) * 160];   // where the next stop is, in the current stop

function flatImage(src, r) {   // the subject as a two-tone poster disc: luminance → cream / sun / coral / blue / night steps
  const key = src + r; if (CACHE[key]) return CACHE[key];
  const c = fit(IMG[src], 2 * r, 2 * r), id = pixels(c), d = id.data;
  const steps = [[0x1d, 0x20, 0x52], [0x3a, 0x5f, 0xd9], [0x4d, 0x7c, 0xfe], [0xff, 0x6b, 0x5e], [0xff, 0xc8, 0x4a], [0xff, 0xf4, 0xe2]];
  for (let i = 0; i < d.length; i += 4) {
    const L = (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) / 255, k = Math.min(steps.length - 1, Math.floor(Math.pow(L, .9) * steps.length));
    d.set(steps[k], i);
  }
  c.getContext('2d').putImageData(id, 0, 0);
  return (CACHE[key] = c);
}

// ---- flat primitives ----
function disc(x, y, r, [base, shade], light = [-.3, -.35]) {   // one shade step: whole disc in shade, base on a shifted copy, clipped
  g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = shade; g.fill(); g.clip();
  g.beginPath(); g.arc(x + light[0] * r * .35, y + light[1] * r * .35, r, 0, 7); g.fillStyle = base; g.fill(); g.restore();
}
function glow(x, y, r) { g.fillStyle = R2; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill(); g.fillStyle = R1; g.beginPath(); g.arc(x, y, r * 2.2, 0, 7); g.fill(); g.fillStyle = R2; g.beginPath(); g.arc(x, y, r * 1.6, 0, 7); g.fill(); }
function stars(seed, n = 90) {
  for (let k = 0; k < n; k++) { const x = hash(seed + k * 3.1) * W, y = hash(seed + k * 7.7) * H, s = hash(k * 1.3 + seed) < .1 ? 5 : 2.6; g.fillStyle = [MIST, C.cream[0], C.sun[0]][k % 3]; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
}
function blob(x, y, r, seed, col) {   // continents, cells: a smooth closed curve
  g.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * Math.PI * 2, rr = r * (.75 + .35 * hash(seed + (k % 24))); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; k ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fillStyle = col; g.fill();
}

// ---- the sets (each drawn in its own 1080 × 1920 frame) ----
function setDraw(set, i, t) {
  g.fillStyle = NIGHT; g.fillRect(-2000, -2000, W + 4000, H + 4000);
  stars(i * 31 + 7, set === 'corps' ? 0 : 80);
  if (set === 'nuit') {
    const p = clamp(t % 4 / 4); disc(190, 860, 46, C.blue); glow(900, 860, 70); disc(900, 860, 70, C.sun);
    g.fillStyle = C.cream[0]; for (let k = 0; k < 22; k++) { const x = 250 + k * 27; if (x > 820) break; g.beginPath(); g.arc(x, 860, 4, 0, 7); g.fill(); }
    g.fillStyle = YELLOW; g.beginPath(); g.arc(840 - 600 * p, 860, 12, 0, 7); g.fill();
  } else if (set === 'terre') {
    glow(540, 840, 280); disc(540, 840, 280, C.blue);
    g.save(); g.translate(0, -60); g.beginPath(); g.arc(540, 900, 280, 0, 7); g.clip();
    blob(440, 820, 120, 4, C.mint[0]); blob(660, 1010, 90, 9, C.mint[0]); blob(600, 760, 50, 14, C.mint[1]);
    g.fillStyle = 'rgba(0,0,0,0)'; g.beginPath(); g.arc(540 + 120, 900 + 120, 280, 0, 7); g.fillStyle = '#3A5FD9'; g.globalCompositeOperation = 'multiply'; g.fill(); g.restore();
    for (let k = 0; k < 4; k++) { g.fillStyle = C.cream[0]; g.beginPath(); g.ellipse(400 + k * 90, 700 + (k % 2) * 220, 60, 16, -.2, 0, 7); g.fill(); }
  } else if (set === 'systeme-solaire') {
    g.strokeStyle = MIST; g.lineWidth = 3; g.setLineDash([6, 14]);
    for (const r of [240, 360, 500]) { g.beginPath(); g.ellipse(540, 900, r, r * .42, 0, 0, 7); g.stroke(); }
    g.setLineDash([]); glow(540, 900, 110); disc(540, 900, 110, C.sun);
    [[240, C.coral, 22], [360, C.blue, 30], [500, C.mint, 26]].forEach(([r, col, s], k) => { const a = t * .25 + k * 2; disc(540 + Math.cos(a) * r, 900 + Math.sin(a) * r * .42, s, col); });
  } else if (set === 'corps') {
    g.fillStyle = '#2a1f4f'; g.fillRect(-2000, -2000, W + 4000, H + 4000);
    blob(540, 900, 380, 21, C.coral[1]); blob(540, 900, 340, 22, C.coral[0]); disc(560, 880, 130, C.blue);
    for (let k = 0; k < 6; k++) { const a = k * 1.1 + 1; g.fillStyle = C.mint[k % 2]; g.beginPath(); g.ellipse(540 + Math.cos(a) * 250, 900 + Math.sin(a) * 230, 46, 20, a, 0, 7); g.fill(); }
  } else if (set === 'comptoir') {
    g.fillStyle = R1; g.fillRect(0, 1180, W, 30);
    const H0 = [40, 170, 300, 520]; H0.forEach((h, k) => { const x = 170 + k * 250; g.fillStyle = [C.coral, C.mint, C.blue, C.cream][k][1]; g.beginPath(); g.roundRect(x - 50, 1180 - h, 100, h, 30); g.fill(); g.fillStyle = [C.coral, C.mint, C.blue, C.cream][k][0]; g.beginPath(); g.roundRect(x - 50, 1180 - h, 70, h, 30); g.fill(); });
  } else if (set === 'compte-a-rebours') {
    glow(540, 820, 250); disc(540, 820, 250, C.cream);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = NIGHT; g.beginPath(); g.arc(540 + Math.cos(a) * 205, 820 + Math.sin(a) * 205, 10, 0, 7); g.fill(); }
    const a = -Math.PI / 2 + t * 2.2; g.strokeStyle = C.sun[1]; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(540, 820); g.lineTo(540 + Math.cos(a) * 180, 820 + Math.sin(a) * 180); g.stroke();
    disc(540, 820, 26, C.sun);
  }
}

// ---- one stop: set + subject disc + label + the next-stop ring ----
function stop(b, t, lt, k = 1) {
  setDraw(b.set || 'nuit', b.i, t);
  const src = imgOf(b) ? b.img : null;
  if (src) {
    const r = b.set && b.set !== 'nuit' ? 170 : 300, x = b.set && b.set !== 'nuit' ? 800 : 540, y = b.set && b.set !== 'nuit' ? 560 : 860;
    glow(x, y, r * .72); g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip(); g.drawImage(flatImage(src, r), x - r, y - r); g.restore();
    g.strokeStyle = C.cream[0]; g.lineWidth = 8; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }
  // label: small-caps tag above, one big word or number below (rises from its baseline through a clip)
  const big = (b.big || '').toUpperCase(), u = spring(clamp((lt - .25) / .5)), y0 = 1215;
  if (b.tag) { g.font = '600 30px Jost'; g.fillStyle = YELLOW; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.save(); g.beginPath(); g.rect(90, y0 - 150, 900 * clamp((lt - .2) / .35), 60); g.clip(); g.fillText(b.tag.toUpperCase().split('').join(' '), 96, y0 - 110); g.restore(); }
  if (big) {
    let s = big.length > 12 ? 96 : 128; g.font = `700 ${s}px Jost`; while (g.measureText(big).width > 900 && s > 60) { s -= 6; g.font = `700 ${s}px Jost`; }
    g.save(); g.beginPath(); g.rect(60, y0 - s - 10, 960, s + 30); g.clip(); g.fillStyle = C.cream[0]; g.textAlign = 'left'; g.fillText(big, 96, y0 + (1 - u) * (s + 20)); g.restore();
    g.fillStyle = YELLOW; g.fillRect(96, y0 + 22, 120 * clamp((lt - .5) / .3), 8);
  }
  if ((b.fx || []).includes('cross') && big) { const p = clamp((lt - .8) / .25); g.strokeStyle = C.coral[0]; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, y0 - 100); g.lineTo(80 + 900 * p, y0 - 100 + 90 * p); g.stroke(); }
}
function nextRing(b, t) {   // sun-yellow ring, dashed outer ring, leader: where the camera dives
  if (b.i >= N - 1) return; const lt = t - b.t0, d = b.t1 - b.t0, p = clamp((lt - (d - TR - 1.1)) / .4); if (p <= 0) return;
  const [x, y] = RING(b.i), r = 70 * eo(p);
  g.strokeStyle = YELLOW; g.lineWidth = 8; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  g.setLineDash([10, 12]); g.lineWidth = 4; g.beginPath(); g.arc(x, y, r + 26, 0, 7); g.stroke(); g.setLineDash([]);
}
function guide(t, look) {   // the Sachoir bulb, lens for an eye
  const b = beatAt(t), l = lineAt(t), talk = l ? envAt(l, t) : 0, bob = Math.sin(t * 2.4) * 10, x = 170, y = 1520 + bob;
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 1.3) * .05);
  disc(0, -40, 80, C.sun); g.fillStyle = C.cream[1]; g.beginPath(); g.roundRect(-38, 30, 76, 44, 12); g.fill(); g.fillStyle = C.cream[0]; g.beginPath(); g.roundRect(-38, 30, 56, 18, 9); g.fill();
  g.fillStyle = C.cream[0]; g.beginPath(); g.arc(0, -46, 38, 0, 7); g.fill(); g.fillStyle = C.blue[1]; g.beginPath(); g.arc(look[0] * 10, -46 + look[1] * 10, 24, 0, 7); g.fill();
  g.fillStyle = C.blue[0]; g.beginPath(); g.arc(look[0] * 10 - 6, -52 + look[1] * 10, 8, 0, 7); g.fill();
  g.fillStyle = C.coral[0]; g.beginPath(); g.arc(-52, -10, 12, 0, 7); g.arc(52, -10, 12, 0, 7); g.fill();
  g.fillStyle = NIGHT; g.beginPath(); g.ellipse(0, 4, 16, 3 + 12 * talk, 0, 0, 7); g.fill();
  g.restore();
  // dotted sight line from the lens to the next stop
  if (b.i < N - 1) { const lt = t - b.t0, d = b.t1 - b.t0, p = clamp((lt - (d - TR - 1.2)) / .5); if (p > 0) { const [rx, ry] = RING(b.i); g.fillStyle = YELLOW; for (let k = 0; k < 18 * p; k++) { const u = k / 18; g.beginPath(); g.arc(lerp(x, rx, u), lerp(y - 46, ry, u), 6, 0, 7); g.fill(); } } }
}
function ribbon(t) {   // scale readout: a log track with one stop per beat
  const b = beatAt(t), x0 = 940, y0 = 560, h = 520;
  g.strokeStyle = MIST; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y0 + h); g.stroke();
  for (let k = 0; k < N; k++) { const y = y0 + k / Math.max(1, N - 1) * h; g.fillStyle = k <= b.i ? YELLOW : MIST; g.beginPath(); g.arc(x0, y, k === b.i ? 11 : 6, 0, 7); g.fill(); }
  if (b.scale) { g.font = '600 26px Jost'; g.fillStyle = MIST; g.textAlign = 'right'; g.fillText(String(b.scale).toUpperCase(), x0 - 22, y0 + b.i / Math.max(1, N - 1) * h + 9); }
}

export function draw(t) {
  const b = beatAt(t), lt = t - b.t0, d = b.t1 - b.t0, nx = TL.beats[b.i + 1];
  const tz = nx ? clamp((lt - (d - TR)) / TR) : 0, out = nx && (nx.fx || []).includes('zoom') && false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const push = 1 + .05 * clamp(lt / d);
  if (tz <= 0) {
    // arrive: on the first frames of a stop we are still coming out of the previous ring
    const ta = b.i > 0 ? 0 : 1;
    g.translate(540, 900); g.scale(push, push); g.translate(-540, -900); stop(b, t, lt); nextRing(b, t);
  } else {
    // dive: scale the current stop up around its ring (log space), the next stop grows inside the ring
    const z = Math.pow(ZK, eio(tz)), [rx, ry] = RING(b.i);
    g.save(); g.translate(rx, ry); g.scale(z * push, z * push); g.translate(-rx, -ry); stop(b, t, lt); nextRing(b, t); g.restore();
    const r = 70 * z * push * 1.0;
    g.save(); g.beginPath(); g.arc(rx + (540 - rx) * eio(tz), ry + (900 - ry) * eio(tz), Math.max(1, r), 0, 7); g.clip();
    const s = z / ZK; g.translate(rx + (540 - rx) * eio(tz), ry + (900 - ry) * eio(tz)); g.scale(s, s); g.translate(-540, -900); stop(nx, t, 0); g.restore();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  ribbon(t);
  const [rx, ry] = RING(b.i); guide(t, b.i < N - 1 && lt > d - TR - 1.2 ? [clamp((rx - 170) / 400, -1, 1), clamp((ry - 1470) / 400, -1, 1)] : [.4, -.4]);
  if (b.bulb) { /* the guide is the bulb: a sun sparkle answers it */ const p = clamp((lt - .6) / .3); g.fillStyle = YELLOW; g.save(); g.translate(330, 1380); g.rotate(t); g.scale(p, p); g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, rr = k % 2 ? 8 : 26; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fill(); g.restore(); }
}

export function subtitles(t) {
  const l = subAt(t); if (!l) return;
  g.setTransform(1, 0, 0, 1, 0, 0); const F = '700 60px Jost'; g.textBaseline = 'middle';
  const c = subChunk(l, t, 680, F), x = 290, y = 1390; g.font = F;
  const w = c.words.map(s => g.measureText(s).width).reduce((a, s) => a + s, 0) + g.measureText(' ').width * (c.words.length - 1) + 60;
  g.fillStyle = NIGHT; g.fillRect(x - 30, y - 50, w, 100); g.fillStyle = YELLOW; g.fillRect(x - 30, y - 50, 7, 100);
  if (l.who === 'perso' && l.name) { g.font = '600 28px Jost'; g.fillStyle = YELLOW; g.textAlign = 'left'; g.fillText(l.name.toUpperCase(), x, y - 76); g.font = F; }
  drawChunk(c, x, y + 2, C.cream[0], YELLOW, { align: 'left' });
}

export function events(add) { for (const b of TL.beats) if (b.i < N - 1) add('zoom', b.t1 - TR, { d: TR }); }
