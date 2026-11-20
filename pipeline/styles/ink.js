// ink.js — « Chinese Ink Wash » for Le Sachoir: xieyi ink painting on rice paper, painted into existence. Five ink tones,
// loaded strokes whose dark edge is the contour, dry strokes with flying white, most of the frame left as empty paper, and one
// vermilion: the seal (here the Sachoir bulb, knocked out in white). Grammar from Lemo-Opuscar ink-wash (MIT code).
import { TL, g, W, H, IMG, imgOf, canvas, fit, edgeMap, beatAt, lineAt, envAt, subAt, subtitleLines, subChunk, drawChunk, clamp, hash, seg, mulberry, YELLOW } from './core.js';
import { eio, eo, lerp, vnoise } from './lib.js';

export const FONTS = ['italic 600 56px "Cormorant Garamond"', '700 80px "Cormorant Garamond"'];
const PAPER = '#F2ECDE', INKC = '30,26,24', VERM = '#B02E22';
const TONE = { jiao: .96, nong: .82, zhong: .6, dan: .34, qing: .16 };
export const THEME = { bg: PAPER, ink: '#2a2420', logo: '700 140px "Cormorant Garamond"', small: 'italic 600 56px "Cormorant Garamond"', band: '700 76px "Cormorant Garamond"', bandLh: 82 };
let paper; const DONE = {}, PIC = {};

export async function init() {
  // procedural rice paper: warm ground, cloud mottling, long fibres, pulp flecks (never a texture file)
  paper = canvas(W, H); const x = paper.getContext('2d'); x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  const m = canvas(27, 48), mx = m.getContext('2d'), id = mx.createImageData(27, 48), r = mulberry(5);
  for (let i = 0; i < 27 * 48; i++) id.data.set([150, 130, 100, Math.floor(r() * 26)], i * 4);
  mx.putImageData(id, 0, 0); x.imageSmoothingEnabled = true; x.drawImage(m, 0, 0, W, H);
  for (let k = 0; k < 420; k++) { x.strokeStyle = `rgba(120,100,70,${.04 + r() * .06})`; x.lineWidth = .8; x.beginPath(); let px = r() * W, py = r() * H; x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (r() - .5) * 60; py += (r() - .5) * 60; x.lineTo(px, py); } x.stroke(); }
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(90,70,50,${r() * .12})`; x.fillRect(r() * W, r() * H, 1.5, 1.5); }
  const v = x.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1200); v.addColorStop(0, 'rgba(120,90,60,0)'); v.addColorStop(1, 'rgba(120,90,60,.12)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
}

// ---- the brush ----
/** a bristle stroke along a polyline: pressure taper, ink load dropping along it, flying white when dry */
function brush(c, pts, w, tone, o = {}) {
  const prog = o.prog ?? 1; if (prog <= 0 || pts.length < 2) return;
  const n = o.bristles || Math.max(6, Math.min(26, Math.round(w / 3))), dry = o.dry ?? .2, seed = o.seed || 1, loaded = o.loaded ?? 0;
  const len = []; let L = 0; for (let k = 0; k < pts.length; k++) { if (k) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); len.push(L); }
  const end = L * prog; c.lineCap = 'round';
  for (let j = 0; j < n; j++) {
    const off = (j / (n - 1) - .5), side = loaded ? clamp(.5 + off * loaded) : 1, bw = w / n * 2.2;
    for (let k = 1; k < pts.length; k++) {
      if (len[k] > end) break;
      const u = len[k] / L, press = Math.sin(Math.PI * clamp(u * 1.08 + .04)) ** .6, load = 1 - u * (.5 + dry * .5);
      if (dry > .05 && vnoise(len[k] * .025 + j * 7.3 + seed) < dry * (.3 + u)) continue;   // flying white
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], nx = -(y1 - y0), ny = x1 - x0, nn = Math.hypot(nx, ny) || 1, d = off * w * press;
      c.strokeStyle = `rgba(${INKC},${tone * load * side * (.75 + .25 * hash(j + seed))})`; c.lineWidth = bw * (.6 + .4 * press);
      c.beginPath(); c.moveTo(x0 + nx / nn * d, y0 + ny / nn * d); c.lineTo(x1 + nx / nn * d, y1 + ny / nn * d); c.stroke();
    }
  }
}
function ridge(x0, x1, y, amp, seed, step = 18) { const P = []; for (let x = x0; x <= x1; x += step) P.push([x, y - amp * (vnoise(x * .004 + seed) * .8 + vnoise(x * .013 + seed * 3) * .35) + amp * .5]); return P; }
/** a mountain: wash body that dissolves downwards into mist, dark loaded edge on the ridge, a few texture strokes */
function mountain(c, P, depth, tone, prog, seed, moss = false) {
  const top = Math.min(...P.map(p => p[1])), bot = top + depth;
  c.save(); c.beginPath(); c.moveTo(P[0][0], bot); P.forEach(p => c.lineTo(p[0], p[1])); c.lineTo(P[P.length - 1][0], bot); c.closePath(); c.clip();
  const gr = c.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, `rgba(${INKC},${tone * .9 * prog})`); gr.addColorStop(.55, `rgba(${INKC},${tone * .35 * prog})`); gr.addColorStop(1, `rgba(${INKC},0)`);
  c.fillStyle = gr; c.fillRect(P[0][0], top, P[P.length - 1][0] - P[0][0], depth);
  c.restore();
  // the loaded edge: a band under the ridge, darkest on top, ragged thickness, slightly bled
  const n = Math.max(2, Math.ceil(P.length * prog)), Q = P.slice(0, n);
  c.save(); c.filter = 'blur(1.6px)'; c.beginPath(); Q.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y));
  for (let k = Q.length - 1; k >= 0; k--) { const [x, y] = Q[k]; c.lineTo(x, y + 6 + 14 * vnoise(x * .02 + seed)); }
  c.closePath(); c.fillStyle = `rgba(${INKC},${Math.min(.9, tone * 2.4)})`; c.fill(); c.restore();
  brush(c, Q, 7, Math.min(.96, tone * 2.6), { dry: .55, seed, bristles: 5 });
  for (let k = 0; k < 5; k++) { const i = Math.floor(hash(seed + k) * (P.length - 3)) + 1, [x, y] = P[i]; brush(c, [[x, y + 10], [x - 14, y + 60], [x - 10, y + 110]], 8, tone * 1.4, { prog: clamp(prog * 1.5 - .5), dry: .6, seed: seed + k }); }
  if (moss) for (let k = 0; k < 12; k++) { const i = Math.floor(hash(seed * 3 + k) * P.length), [x, y] = P[i]; c.fillStyle = `rgba(${INKC},${.9 * clamp(prog * 2 - 1)})`; c.beginPath(); c.ellipse(x, y - 4, 5, 3, hash(k) * 3, 0, 7); c.fill(); }
}

// ---- the sets: compositions that leave the lower third as empty paper ----
function setDraw(c, set, p, seed) {
  const s = k => clamp(p * 1.6 - k * .25);   // painted in order
  if (set === 'montagnes' || set === 'muraille') {
    mountain(c, ridge(-40, W + 40, 640, 260, seed + 1), 420, TONE.qing, s(0), seed + 1);
    mountain(c, ridge(-40, W + 40, 820, 300, seed + 2), 460, TONE.dan, s(1), seed + 2);
    const near = ridge(-40, W + 40, 1000, 240, seed + 3, 14);
    mountain(c, near, 360, TONE.zhong, s(2), seed + 3, true);
    if (set === 'muraille') {   // one stroke crosses the frame: the wall along the near ridge
      const wall = near.map(([x, y]) => [x, y - 18]);
      brush(c, wall, 22, TONE.jiao, { prog: s(2.6), dry: .45, seed: 9, bristles: 18 });
      for (let k = 2; k < wall.length - 2; k += 3) { const [x, y] = wall[k]; if (x / W > s(2.8)) break; brush(c, [[x, y - 4], [x, y - 22]], 6, TONE.nong, { dry: .2, seed: k }); }
      for (const f of [.22, .58, .84]) { const [x, y] = wall[Math.floor(f * (wall.length - 1))]; if (f < s(3)) { c.fillStyle = `rgba(${INKC},.85)`; c.fillRect(x - 14, y - 46, 28, 36); } }
    }
  } else if (set === 'bambou-lune') {
    c.strokeStyle = `rgba(${INKC},${.25 * s(0)})`; c.lineWidth = 3; c.beginPath(); c.arc(760, 640, 170, 0, 7); c.stroke();
    for (const [x, h, k] of [[170, 900, 0], [250, 760, 1], [330, 980, 2]]) {
      for (let j = 0; j < 6; j++) { const y0 = 1180 - j * h / 6, y1 = y0 - h / 6 + 14; brush(c, [[x + j * 3, y0], [x + j * 3 + 2, y1]], 26, TONE.zhong, { prog: clamp(s(1 + k * .3) * 6 - j), dry: .25, seed: x + j, loaded: 1 }); }
      for (let j = 0; j < 4; j++) { const y = 1180 - (j + 1.4) * h / 5, a = hash(x + j) > .5 ? 1 : -1; brush(c, [[x, y], [x + a * 70, y - 30], [x + a * 150, y + 10]], 22, TONE.nong, { prog: clamp(s(2 + k * .2) * 2 - j * .3), dry: .1, seed: x * j, loaded: 1.6 }); }
    }
  } else if (set === 'palais') {
    mountain(c, ridge(-40, W + 40, 600, 160, seed), 300, TONE.qing, s(0), seed);
    const roof = []; for (let k = 0; k <= 30; k++) { const u = k / 30, x = 180 + u * 720; roof.push([x, 780 - Math.sin(u * Math.PI) * 40 - (u < .08 || u > .92 ? 40 * (1 - Math.min(u, 1 - u) / .08) : 0)]); }
    brush(c, roof, 34, TONE.jiao, { prog: s(1), dry: .2, seed: 4, loaded: 1.5 });
    for (const x of [280, 440, 640, 800]) brush(c, [[x, 800], [x + 2, 1020]], 14, TONE.zhong, { prog: s(1.6), dry: .3, seed: x });
    for (let k = 0; k < 3; k++) brush(c, [[200 - k * 30, 1030 + k * 22], [880 + k * 30, 1030 + k * 22]], 10, TONE.dan, { prog: s(2 + k * .2), dry: .5, seed: k });
  } else if (set === 'etang') {
    for (let k = 0; k < 4; k++) { const r = 60 + k * 70, P = []; for (let j = 0; j <= 40; j++) { const a = j / 40 * 6.0 + .3; P.push([600 + Math.cos(a) * r, 860 + Math.sin(a) * r * .35]); } brush(c, P, 6, TONE.dan, { prog: s(k * .3), dry: .55, seed: k }); }
    const carp = []; for (let j = 0; j <= 20; j++) { const u = j / 20; carp.push([480 + u * 240, 820 + Math.sin(u * 3.4) * 50]); } brush(c, carp, 46, TONE.nong, { prog: s(1.5), dry: .15, seed: 7, loaded: 1.6 });
    for (let k = 0; k < 7; k++) brush(c, [[100 + k * 22, 1150], [110 + k * 20 + Math.sin(k) * 30, 700 + hash(k) * 160]], 8, TONE.zhong, { prog: s(2 + k * .1), dry: .3, seed: k + 20 });
  }
}

// ---- the subject, in ink: edges as loaded lines, darks as washes, a soft bleeding edge ----
function inkPic(src) {
  if (PIC[src]) return PIC[src];
  const w = 640, h = 470, small = fit(IMG[src], w / 2, h / 2), { L, E, w: sw, h: sh } = edgeMap(small);
  const c = canvas(sw, sh), x = c.getContext('2d'), id = x.createImageData(sw, sh);
  for (let y = 0; y < sh; y++) for (let k = 0; k < sw; k++) {
    const p = y * sw + k, dark = 1 - L[p], tone = dark > .8 ? .82 : dark > .6 ? .6 : dark > .42 ? .34 : dark > .25 ? .16 : 0;
    const a = Math.max(tone * .8, clamp((E[p] - .2) * 2.4) * .96), fx = Math.min(k, sw - k, y, sh - y) / 30, edge = clamp(fx + (vnoise(k * .2 + y * .07) - .5) * .8);
    id.data.set([30, 26, 24, Math.round(a * edge * 255)], p * 4);
  }
  x.putImageData(id, 0, 0);
  const out = canvas(w, h), o = out.getContext('2d'); o.filter = 'blur(1.2px)'; o.drawImage(c, 0, 0, w, h); o.filter = 'none'; o.globalAlpha = .9; o.drawImage(c, 0, 0, w, h);
  return (PIC[src] = out);
}
function seal(c, x, y, s, k = 1) {   // the vermilion seal: the Sachoir bulb knocked out in white, ink-paste speckles
  c.save(); c.translate(x, y); c.rotate(-.04); c.globalAlpha = k; c.fillStyle = VERM; c.beginPath(); c.roundRect(-s / 2, -s / 2, s, s, s * .06); c.fill();
  c.globalCompositeOperation = 'destination-out'; c.lineWidth = s * .07; c.strokeStyle = '#000'; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(0, -s * .1, s * .22, Math.PI * .78, Math.PI * 2.22); c.lineTo(s * .08, s * .17); c.lineTo(-s * .08, s * .17); c.closePath(); c.stroke();
  c.beginPath(); c.moveTo(-s * .09, s * .26); c.lineTo(s * .09, s * .26); c.stroke(); c.beginPath(); c.moveTo(-s * .05, s * .33); c.lineTo(s * .05, s * .33); c.stroke();
  for (let k2 = 0; k2 < 14; k2++) { c.beginPath(); c.arc((hash(k2) - .5) * s * .9, (hash(k2 + 5) - .5) * s * .9, s * .015, 0, 7); c.fill(); }
  c.restore();
}
function crane(c, x, y, p, talk) {
  brush(c, [[x - 60, y - 40], [x, y - 70], [x + 70, y - 50], [x + 90, y - 20]], 70, TONE.qing, { prog: p, dry: .1, seed: 31, loaded: 1 });
  brush(c, [[x + 70, y - 60], [x + 90, y - 140], [x + 80, y - 220], [x + 100, y - 250]], 12, TONE.jiao, { prog: clamp(p * 1.5 - .3), dry: .1, seed: 32 });
  brush(c, [[x + 100, y - 250], [x + 150, y - 245 + talk * 10]], 7, TONE.jiao, { prog: clamp(p * 2 - 1), seed: 33 });
  for (const lx of [x - 6, x + 20]) brush(c, [[lx, y - 30], [lx + 4, y + 120]], 4, TONE.nong, { prog: clamp(p * 2 - .8), seed: lx });
  brush(c, [[x - 70, y - 50], [x - 120, y - 30]], 30, TONE.jiao, { prog: clamp(p * 2 - .6), dry: .3, seed: 34 });
  if (p > .7) { c.fillStyle = VERM; c.beginPath(); c.arc(x + 98, y - 262, 8, 0, 7); c.fill(); }   // the one tiny red accent
}

function painting(b, t) {
  const lt = t - b.t0, p = t >= b.t1 ? 1 : b.cold ? clamp(.45 + lt / 1.1) : clamp((lt - .1) / 1.6);
  const key = `${b.i}`; if (p >= 1 && DONE[key]) return DONE[key];
  const c = canvas(W, H), x = c.getContext('2d');
  const src = imgOf(b) ? b.img : null;
  setDraw(x, b.set || 'montagnes', src ? p * .8 : p, b.i * 13 + 3);
  if (src) { const k = clamp((lt - .5) / .9); x.globalAlpha = t >= b.t1 ? 1 : eo(k); x.drawImage(inkPic(src), (W - 640) / 2, 500); x.globalAlpha = 1; }
  if (p >= 1) DONE[key] = c;
  return c;
}

export function draw(t) {
  const b = beatAt(t), lt = t - b.t0, prev = b.i > 0 ? TL.beats[b.i - 1] : null;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(paper, 0, 0);
  const z = 1 + .05 * clamp(lt / (b.t1 - b.t0));
  g.save(); g.translate(W / 2, 900); g.scale(z, z); g.translate(-W / 2, -900);
  if (prev && lt < .45) { g.globalAlpha = 1 - eio(lt / .45); g.drawImage(painting(prev, b.t0 + 99), 0, 0); g.globalAlpha = 1; }   // dissolves into mist
  g.globalCompositeOperation = 'multiply'; g.drawImage(painting(b, t), 0, 0); g.globalCompositeOperation = 'source-over';
  // the talking animal (a crane, lucid and deadpan)
  if (b.who === 'perso') { const l = lineAt(t), talk = l && l.beat === b.i ? envAt(l, t) : 0; crane(g, 820, 1080, clamp(lt / 1), talk); }
  g.restore();
  // title written on the painting, wet then dry
  const word = b.big || '';
  if (word) {
    const k = clamp((lt - .25) / .35); let s = 84; g.font = `700 ${s}px "Cormorant Garamond"`; while (g.measureText(word).width > 820 && s > 50) { s -= 4; g.font = `700 ${s}px "Cormorant Garamond"`; }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = `rgba(${INKC},${.9 * k})`; if (k < 1) g.filter = `blur(${(1 - k) * 3}px)`; g.fillText(word, 110, 560); g.filter = 'none';
    g.fillStyle = VERM; g.globalAlpha = k; g.fillRect(70, 520, 18, 18); g.globalAlpha = 1;
    if ((b.fx || []).includes('cross')) brush(g, [[90, 560], [130 + g.measureText(word).width, 500]], 18, TONE.jiao, { prog: clamp((lt - .8) / .25), dry: .4, seed: 5 });
  }
  if (b.tag) { g.font = 'italic 600 42px "Cormorant Garamond"'; g.fillStyle = `rgba(${INKC},.7)`; g.textAlign = 'left'; g.fillText(b.tag, 112, 620); }
  // the seal: on the bulb beat, and it stays to the end
  const sb = TL.beats.find(x => x.bulb); if (sb && b.i >= sb.i) seal(g, 930, 1150, 92, b.i > sb.i ? 1 : clamp((lt - 1) / .2));
}
export function subtitles(t) {
  const l = subAt(t); if (!l) return;
  g.setTransform(1, 0, 0, 1, 0, 0); const F = 'italic 600 68px "Cormorant Garamond"'; g.textBaseline = 'middle';
  const c = subChunk(l, t, 860, F), y = 1370; g.font = F;
  const wash = g.createLinearGradient(0, y - 140, 0, 1470); wash.addColorStop(0, 'rgba(242,236,222,0)'); wash.addColorStop(.35, 'rgba(242,236,222,.93)'); wash.addColorStop(1, 'rgba(242,236,222,.93)'); g.fillStyle = wash; g.fillRect(0, y - 140, W, 1470 - y + 140);
  if (l.who === 'perso' && l.name) { g.font = '700 38px "Cormorant Garamond"'; g.fillStyle = VERM; g.textAlign = 'center'; g.fillText(l.name.toUpperCase().split('').join('\u2009'), W / 2, y - 76); g.font = F; }
  const w = drawChunk(c, W / 2, y, `rgba(${INKC},.95)`, `rgba(${INKC},1)`, { under: YELLOW });
  g.fillStyle = VERM; g.fillRect(W / 2 - w / 2 - 34, y - 8, 14, 14);
}

export function events(add) { for (const b of TL.beats) add('brush', b.t0 + .1, { d: 1.4 }); }
