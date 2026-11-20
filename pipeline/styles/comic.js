// comic.js — « Comic History Cartoon » for Le Sachoir: the film is one comic page on a table, a panel per beat. Countries are
// paper puppets joined with brass split pins standing on an engraved printed map; a picture is a paper patch slapped down and
// pinned. Grammar from Lemo-Opuscar comic-history (MIT code). Nothing translucent: patches, bubbles, captions are opaque paper.
import { TL, g, W, H, IMG, imgOf, canvas, fit, noiseTile, beatAt, lineAt, envAt, subAt, subtitleLines, subChunk, drawChunk, wrap, hasDigit,
  bulb, YELLOW, clamp, hash, seg, q } from './core.js';
import { eio, eo, back, lerp } from './lib.js';

export const FONTS = ['400 60px "IM Fell English SC"', '700 60px "Old Standard TT"', '400 60px "Lilita One"', 'italic 400 40px "IM Fell English"'];
const PAPER = '#F1E8D2', INK = '#2B2219', SEA = '#A6CCD3', RED = '#C8463A', BRASS = '#D9B158', TABLE = '#7B6A57';
const LAND = ['#d9c79e', '#b9c4a0', '#c99a7e', '#d3b46c', '#c6b8a4'];   // sand, sage, brick, ochre, stone
export const THEME = { bg: PAPER, ink: INK, logo: '400 140px "IM Fell English SC"', small: 'italic 400 54px "IM Fell English"', band: '400 70px "Lilita One"', bandLh: 80 };
const N = TL.beats.length, PW_ = 1000, PH_ = 780, GUT = 44;
const CAST = (TL.cast.length ? TL.cast : [{ name: 'FRANCE', color: '#6E93D6' }]).slice(0, 3);
const DEF_COL = ['#6E93D6', '#5D6672', '#C98A4B'];
const panel = i => ({ x: GUT + (i % 2) * (PW_ + GUT), y: GUT + Math.floor(i / 2) * (PH_ + GUT), w: PW_, h: PH_ });
const PAGE_W = GUT * 3 + PW_ * 2, PAGE_H = GUT + Math.ceil(N / 2) * (PH_ + GUT);
let paperTex, tableTex; const PATCH = {};

export async function init() {
  paperTex = g.createPattern(noiseTile(256, 21, v => [90, 70, 40, v < .55 ? 0 : Math.floor((v - .55) * 50)]), 'repeat');
  tableTex = g.createPattern(noiseTile(256, 22, v => [40, 30, 20, Math.floor(v * 40)]), 'repeat');
}

// ---- printed map ----
function coast(cx, cy, rx, ry, seed) { const P = []; for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; const r = .78 + .3 * hash(seed + k) + .1 * Math.sin(a * 3 + seed); P.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); } return P; }
function path(P) { g.beginPath(); P.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
function land(P, col, name, nx, ny) {
  // engraved ripples outside the coast: about six thin ink lines, further and fainter
  const [cx, cy] = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
  for (let k = 1; k <= 6; k++) { const s = 1 + k * .04; g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); path(P); g.lineWidth = 1.8 / s; g.strokeStyle = `rgba(43,34,25,${.34 - k * .045})`; g.stroke(); g.restore(); }
  path(P); g.fillStyle = col; g.fill();
  g.save(); path(P); g.clip(); g.lineWidth = 34; g.strokeStyle = 'rgba(255,250,235,.35)'; path(P); g.stroke(); g.restore();   // plate inked thin at the edge
  path(P); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  if (name) { g.font = '400 40px "IM Fell English SC"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText(name.split('').join(' '), nx, ny); }
}
function graticule(p) { g.strokeStyle = 'rgba(43,34,25,.22)'; g.lineWidth = 1.5; g.setLineDash([8, 10]); for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(p.x + k * p.w / 5, p.y); g.lineTo(p.x + k * p.w / 5, p.y + p.h); g.stroke(); g.beginPath(); g.moveTo(p.x, p.y + k * p.h / 4); g.lineTo(p.x + p.w, p.y + k * p.h / 4); g.stroke(); } g.setLineDash([]); }
function compass(x, y, r) { g.save(); g.translate(x, y); g.fillStyle = PAPER; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = k % 2 ? INK : RED; g.beginPath(); g.moveTo(0, -r * .95); g.lineTo(r * .18, 0); g.lineTo(-r * .18, 0); g.fill(); } g.font = '400 26px "IM Fell English SC"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('N', 0, -r - 10); g.restore(); }
function scaleBar(x, y) { g.fillStyle = INK; for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? PAPER : INK; g.fillRect(x + k * 40, y, 40, 10); } g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, y, 160, 10); g.font = '700 22px "Old Standard TT"'; g.fillStyle = INK; g.textAlign = 'left'; g.fillText('0      100 km', x, y + 34); }

function setDraw(set, p, i) {
  const dark = set === 'sombre';
  g.fillStyle = dark ? '#7f9aa0' : SEA; g.fillRect(p.x, p.y, p.w, p.h);
  if (set === 'traite') {
    g.fillStyle = '#d9c9a8'; g.fillRect(p.x, p.y, p.w, p.h);
    for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? 'rgba(160,120,80,.12)' : 'rgba(255,255,255,.08)'; g.fillRect(p.x + k * p.w / 14, p.y, p.w / 14, p.h * .62); }
    g.fillStyle = '#8a5a3c'; g.fillRect(p.x, p.y + p.h * .62, p.w, p.h * .38); g.fillStyle = '#6e4630'; g.fillRect(p.x, p.y + p.h * .62, p.w, 16);
    g.save(); g.translate(p.x + p.w * .5, p.y + p.h * .7); g.rotate(-.06); g.fillStyle = '#f2e6c8'; g.fillRect(-170, -40, 340, 120); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(-170, -40, 340, 120);
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-140, -18 + k * 18); g.lineTo(130 - (k === 4 ? 120 : 0), -18 + k * 18); g.strokeStyle = 'rgba(43,34,25,.4)'; g.stroke(); }
    g.restore(); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(p.x + p.w * .62, p.y + p.h * .72); g.quadraticCurveTo(p.x + p.w * .7, p.y + p.h * .55, p.x + p.w * .78, p.y + p.h * .48); g.stroke();
    return;
  }
  graticule(p);
  if (set === 'manche') {
    land(coast(p.x + p.w * .28, p.y + p.h * .28, p.w * .26, p.h * .26, 3), dark ? '#8f8a7c' : LAND[1], CAST[1]?.name || '', p.x + p.w * .3, p.y + p.h * .3);
    land(coast(p.x + p.w * .74, p.y + p.h * .78, p.w * .36, p.h * .3, 7), dark ? '#8f8a7c' : LAND[0], CAST[0]?.name || '', p.x + p.w * .8, p.y + p.h * .58);
    g.font = 'italic 400 34px "IM Fell English"'; g.fillStyle = 'rgba(43,34,25,.7)'; g.textAlign = 'center'; g.fillText('La Manche', p.x + p.w * .55, p.y + p.h * .5);
  } else if (set === 'europe' || set === 'sombre') {
    const P = coast(p.x + p.w * .5, p.y + p.h * .55, p.w * .45, p.h * .42, 11);
    land(P, dark ? '#9a978c' : LAND[0], '', 0, 0);
    g.save(); path(P); g.clip();
    for (let k = 0; k < 7; k++) { const x = p.x + hash(k * 3.1 + i) * p.w, y = p.y + hash(k * 5.7 + i) * p.h; g.fillStyle = dark ? ['#8d8b80', '#7f8580', '#8a7f78'][k % 3] : LAND[k % 5]; g.beginPath(); for (let j = 0; j < 9; j++) { const a = j / 9 * 6.283, r = 120 + 80 * hash(k * 9 + j); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); }
    g.restore(); path(P); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  } else if (set === 'explorateurs') {
    land(coast(p.x + p.w * .05, p.y + p.h * .4, p.w * .2, p.h * .5, 13), LAND[3], '', 0, 0);
    land(coast(p.x + p.w * .98, p.y + p.h * .6, p.w * .2, p.h * .45, 17), LAND[2], '', 0, 0);
    for (let k = 0; k < 3; k++) { const x = p.x + p.w * (.35 + k * .15), y = p.y + p.h * (.3 + .2 * hash(k + i)); g.fillStyle = PAPER; g.beginPath(); g.moveTo(x - 30, y); g.lineTo(x + 30, y); g.lineTo(x + 20, y + 14); g.lineTo(x - 20, y + 14); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 40); g.lineTo(x + 22, y - 10); g.closePath(); g.fill(); g.stroke(); }
  }
  compass(p.x + p.w - 90, p.y + 90, 46); scaleBar(p.x + 40, p.y + p.h - 70);
}

// ---- paper puppets (2D forward kinematics about brass split pins, poses stepped on twos) ----
const EMO = { content: { brow: 0, mouth: .6 }, fache: { brow: -.5, mouth: -.6 }, vexe: { brow: .3, mouth: -.3, side: 1 }, fier: { brow: -.15, mouth: .8, chin: 1 }, surpris: { brow: .6, mouth: 0, o: 1 } };
function pin(x, y) { g.fillStyle = BRASS; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.strokeStyle = '#8a6a2c'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x - 2, y - 2, 2.5, 0, 7); g.fill(); }
function card(fn, col) { g.save(); g.lineJoin = 'round'; fn(); g.lineWidth = 12; g.strokeStyle = '#f4ead2'; g.stroke(); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.restore(); }
function puppet(c, x, y, s, t, o) {
  const tq = q(t), e = EMO[o.emo] || EMO.content, talk = o.talk || 0, act = o.active ? 1 : 0;
  const armA = o.active ? -1.9 + Math.sin(tq * 5) * .35 : -.25 + Math.sin(tq * 1.3 + x) * .05, armB = o.active ? .3 + Math.sin(tq * 3) * .2 : .25;
  g.save(); g.translate(x, y); g.scale(s * (o.face || 1), s);
  // cast shadow on the map
  g.fillStyle = 'rgba(43,34,25,.28)'; g.beginPath(); g.ellipse(16, 8, 110, 22, 0, 0, 7); g.fill();
  g.save(); g.translate(5, 5); g.fillStyle = 'rgba(43,34,25,.25)'; g.beginPath(); g.roundRect(-80, -250, 160, 250, 30); g.fill(); g.restore();
  // legs
  for (const lx of [-40, 40]) card(() => { g.beginPath(); g.roundRect(lx - 22, -70, 44, 74, 12); }, '#3a3128');
  // body
  card(() => { g.beginPath(); g.moveTo(-70, -240); g.lineTo(70, -240); g.lineTo(90, -60); g.lineTo(-90, -60); g.closePath(); }, c.color);
  g.save(); g.scale(o.face || 1, 1); g.font = '400 30px "IM Fell English SC"'; g.fillStyle = '#f4ead2'; g.textAlign = 'center'; g.fillText((c.name || '').slice(0, 11), 0, -140); g.restore();
  // arms about the shoulder pins
  for (const [sx, a] of [[-70, -armB - .1], [70, act ? armA : .2]]) {
    g.save(); g.translate(sx, -220); g.rotate(sx > 0 ? -a : a);
    card(() => { g.beginPath(); g.roundRect(-16, 0, 32, 130, 14); }, c.color); card(() => { g.beginPath(); g.arc(0, 136, 20, 0, 7); }, '#f0d6b8');
    g.restore(); pin(sx, -220);
  }
  // head: an oversized round card, swapped expression heads
  const bob = -talk * 10 + (act ? Math.sin(tq * 6) * 4 : 0);
  g.save(); g.translate(0, -300 + bob); g.rotate((e.side || 0) * .18 + (e.chin ? -.08 : 0));
  card(() => { g.beginPath(); g.arc(0, 0, 95, 0, 7); }, '#f0d6b8');
  g.fillStyle = c.color; g.beginPath(); g.arc(0, -40, 92, Math.PI * 1.05, Math.PI * 1.95); g.fill();   // the country's cap
  for (const ex of [-34, 34]) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, 8, 18, e.o ? 24 : 20, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(ex + 4 * (o.face || 1), 12, 8, 0, 7); g.fill();
    g.lineWidth = 6; g.beginPath(); g.moveTo(ex - 20, -22 - e.brow * 10 * Math.sign(ex)); g.lineTo(ex + 20, -22 + e.brow * 10 * Math.sign(ex)); g.stroke(); }
  g.fillStyle = '#7a2a22'; g.beginPath(); if (e.o || talk > .15) g.ellipse(0, 52, 18, 8 + 18 * Math.max(talk, e.o ? .6 : 0), 0, 0, 7); else { g.ellipse(0, 50, 26, 6 + Math.abs(e.mouth) * 6, 0, e.mouth > 0 ? 0 : Math.PI, e.mouth > 0 ? Math.PI : Math.PI * 2); } g.fill();
  g.fillStyle = 'rgba(200,70,58,.35)'; g.beginPath(); g.arc(-56, 34, 14, 0, 7); g.arc(56, 34, 14, 0, 7); g.fill();
  g.restore(); pin(0, -220);
  g.restore();
}

// ---- the paper patch (the subject's picture): slapped down, then pinned ----
function patchOf(src) { if (PATCH[src]) return PATCH[src]; const c = fit(IMG[src], 520, 380); const x = c.getContext('2d'); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(241,232,210,.25)'; x.fillRect(0, 0, 520, 380); return (PATCH[src] = c); }
function patch(src, p, lt, i, done) {
  const u = done ? 1 : clamp((lt - .15) / .3), x = p.x + p.w * .5, y = p.y + p.h * .36, rot = (hash(i * 7.3) - .5) * .1;
  if (u <= 0) return; const lift = 1 - eo(u), sh = 4 + 40 * lift, s = 1 + .18 * lift;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = `rgba(43,34,25,${.25 + .1 * lift})`; g.fillRect(-276 + sh, -206 + sh, 552, 412);
  g.fillStyle = '#f4ead2'; g.fillRect(-276, -206, 552, 412); g.drawImage(patchOf(src), -260, -190, 520, 380);
  g.setLineDash([10, 8]); g.strokeStyle = 'rgba(43,34,25,.6)'; g.lineWidth = 2; g.strokeRect(-268, -198, 536, 396); g.setLineDash([]);
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(-276, -206, 552, 412);
  if (u >= 1) pin(0, -192);
  g.restore();
}
function caption(text, p, lt, done, cross) {
  if (!text) return; const k = done ? 1 : clamp((lt - .05) / .2); if (k <= 0) return;
  const num = hasDigit(text); let s = 58; g.font = num ? `700 ${s}px "Old Standard TT"` : `400 ${s}px "IM Fell English SC"`;
  while (g.measureText(text).width > p.w - 120 && s > 34) { s -= 4; g.font = num ? `700 ${s}px "Old Standard TT"` : `400 ${s}px "IM Fell English SC"`; }
  const w = g.measureText(text).width + 50, x = p.x + 24, y = p.y + 24;
  g.save(); g.translate(x, y); g.scale(1, k);
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(6, 6, w, s + 34); g.fillStyle = YELLOW; g.fillRect(0, 0, w, s + 34); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(0, 0, w, s + 34);
  g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, 25, (s + 34) / 2 + 3);
  if (cross) { const c = done ? 1 : clamp((lt - .8) / .2); g.strokeStyle = RED; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(10, 8); g.lineTo(10 + (w - 20) * c, 8 + (s + 18) * c); g.stroke(); }
  g.restore();
}
function bubble(b, p, px, py, lt, done) {
  const k = done ? 1 : clamp((lt - .2) / .15); if (k <= 0) return;
  g.font = '400 46px "Lilita One"'; const L = wrap(b.text, 520), w = Math.max(...L.map(s => g.measureText(s).width)) + 60, h = L.length * 52 + 40;
  const bx = clamp(px - w / 2, p.x + 20, p.x + p.w - w - 20), by = p.y + 30;
  g.save(); g.globalAlpha = 1; g.translate(0, (1 - k) * 20);
  g.fillStyle = '#fffaf0'; g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.roundRect(bx, by, w, h, 26); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(clamp(px - 20, bx + 30, bx + w - 70), by + h - 2); g.lineTo(px, py); g.lineTo(clamp(px + 30, bx + 60, bx + w - 30), by + h - 2); g.fill(); g.stroke();
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; L.forEach((s, j) => g.fillText(s, bx + w / 2, by + 44 + j * 52));
  g.restore();
}

function panelDraw(b, t) {
  const p = panel(b.i), lt = t - b.t0, done = t >= b.t1;
  g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip();
  setDraw(b.set || 'manche', p, b.i);
  const src = imgOf(b) ? b.img : null;
  if (src) patch(src, p, lt, b.i, done);
  // puppets
  const sp = b.speaker ?? 0, talkLine = lineAt(t), talking = talkLine && talkLine.beat === b.i && talkLine.who === 'perso' ? envAt(talkLine, t) : 0;
  const n = CAST.length, xs = n === 1 ? [.5] : n === 2 ? [.24, .76] : [.18, .5, .82];
  CAST.forEach((c, k) => { c.color = c.color || DEF_COL[k]; const active = k === sp; puppet(c, p.x + p.w * xs[k], p.y + p.h - 30, src ? .78 : 1.0, t + k * .37, { emo: active ? (b.emo || 'content') : (b.react || 'content'), active, talk: active ? talking : 0, face: xs[k] > .5 ? -1 : 1 }); });
  caption(b.big || '', p, lt, done, (b.fx || []).includes('cross'));
  if (b.tag) { g.font = '700 40px "Old Standard TT"'; g.fillStyle = INK; g.textAlign = 'right'; g.fillText(b.tag, p.x + p.w - 40, p.y + p.h - 40); g.fillRect(p.x + p.w - 40 - g.measureText(b.tag).width, p.y + p.h - 30, g.measureText(b.tag).width, 3); }
  if (b.who === 'perso' && b.text.length <= 70) { const px = p.x + p.w * xs[Math.min(sp, n - 1)], py = p.y + p.h - 30 - (src ? .78 : 1) * 400; bubble(b, p, px, py, lt, done); }
  if (b.bulb) bulb(p.x + 70, p.y + p.h - 150, .7, { ink: INK, fill: YELLOW });
  if (b.set === 'sombre') { g.fillStyle = 'rgba(20,24,40,.18)'; g.fillRect(p.x, p.y, p.w, p.h); }
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 7; g.strokeRect(p.x, p.y, p.w, p.h);
}

function cam(t) {
  const b = beatAt(t), lt = t - b.t0, c = i => { const p = panel(i); return { x: p.x + p.w / 2, y: p.y + p.h / 2 + 10, z: 1.0 }; };
  let k = c(b.i); k.z *= 1 + .035 * clamp(lt / (b.t1 - b.t0));
  if (b.i > 0 && lt < .45) { const a = c(b.i - 1), u = eio(lt / .45); k = { x: lerp(a.x, k.x, u), y: lerp(a.y, k.y, u), z: lerp(a.z, k.z, u) * (1 - .12 * Math.sin(u * Math.PI)) }; }
  if (b.i === N - 1 && b.t1 - b.t0 > 2.4) { const u = eio(seg(t, b.t0 + 1.1, b.t0 + 2.2)), zo = Math.min(1040 / PAGE_W, 1350 / PAGE_H); k = { x: lerp(k.x, PAGE_W / 2, u), y: lerp(k.y, PAGE_H / 2, u), z: lerp(k.z, zo, u) }; }
  return k;
}
export function draw(t) {
  const c = cam(t);
  g.fillStyle = TABLE; g.fillRect(0, 0, W, H);
  g.setTransform(1, 0, 0, 1, 0, 0); g.translate(W / 2, 900); g.scale(c.z, c.z); g.translate(-c.x, -c.y);
  g.fillStyle = tableTex; g.fillRect(-2000, -2000, PAGE_W + 4000, PAGE_H + 4000);
  g.fillStyle = 'rgba(30,20,10,.35)'; g.fillRect(18, 18, PAGE_W, PAGE_H); g.fillStyle = PAPER; g.fillRect(0, 0, PAGE_W, PAGE_H);
  for (const B of TL.beats) if (t >= B.t0) panelDraw(B, t); else { const p = panel(B.i); g.fillStyle = '#e9dfc6'; g.fillRect(p.x, p.y, p.w, p.h); g.strokeStyle = 'rgba(43,34,25,.25)'; g.lineWidth = 3; g.strokeRect(p.x, p.y, p.w, p.h); }
  g.fillStyle = paperTex; g.globalCompositeOperation = 'multiply'; g.fillRect(0, 0, PAGE_W, PAGE_H); g.globalCompositeOperation = 'source-over';
}
export function subtitles(t) {
  const l = subAt(t); if (!l) return;
  const b = TL.beats[l.beat]; if (b && b.who === 'perso' && b.text.length <= 70) return;   // dans la bulle
  g.setTransform(1, 0, 0, 1, 0, 0); const F = '700 60px "Old Standard TT"'; g.textBaseline = 'middle';
  const c = subChunk(l, t, 880, F), y = 1395; g.font = F;
  const w = c.words.map(s => g.measureText(s).width).reduce((a, s) => a + s, 0) + g.measureText(' ').width * (c.words.length - 1) + 70;
  g.fillStyle = 'rgba(43,34,25,.35)'; g.fillRect(W / 2 - w / 2 + 7, y - 50 + 7, w, 100); g.fillStyle = '#F5E9C4'; g.fillRect(W / 2 - w / 2, y - 50, w, 100); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(W / 2 - w / 2, y - 50, w, 100);
  drawChunk(c, W / 2, y + 3, INK, INK, { mark: YELLOW });
}

export function events(add) { for (const b of TL.beats) if (imgOf(b)) add('slap', b.t0 + .44); }

// ---- toolbox for hand-directed scenes (film.scene): primitives only, no sets ----
export const KIT = { coast, path, land, graticule, compass, scaleBar, pin, card, puppet, patchOf, EMO, PAPER, INK, SEA, RED, BRASS, TABLE, LAND,
  tex: () => ({ paper: paperTex, table: tableTex }) };
