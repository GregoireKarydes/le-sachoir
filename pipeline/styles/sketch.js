// sketch.js — « Tablet Sketch » for Le Sachoir: one cream page that fills up while it is drawn and explained.
// Grammar (Lemo-Opuscar ipad-sketch, MIT code): graphite line first, colour block second and shifted off the line,
// the canvas moves (pan, pinch, a few degrees of turn), the marks never boil, a clean stylus rides the mark being made.
import { TL, g, W, H, IMG, imgOf, canvas, fit, edgeMap, swatches, noiseTile, beatAt, lineAt, envAt, subAt, subtitleLines, subChunk, drawChunk, wrap,
  bulb, YELLOW, clamp, hash, seg, q } from './core.js';
import { eio, eo, lerp } from './lib.js';

export const FONTS = ['700 80px Caveat', '500 50px Caveat'];
const PAPER = '#F3EADB', GRAPH = '#43362E', LIGHT = '#A8998A', CORAL = '#DC6A4C';
export const THEME = { bg: PAPER, ink: GRAPH, logo: '700 160px Caveat', small: '500 58px Caveat', band: '700 86px Caveat', bandLh: 82 };

const N = TL.beats.length, COLS = 2, RX = 1120, RY = 1240;
const center = i => [560 + (i % COLS) * RX + (Math.floor(i / 2) % 2 ? 60 : 0), 640 + Math.floor(i / COLS) * RY];
const PW = 560 + RX + 560 + 60, PH = 640 + Math.ceil(N / COLS) * RY;
let grain, paperTex, GRAPHITE, CORALP, CACHE = {};

export async function init() {
  // paper tooth and mottle, anchored to the page
  paperTex = noiseTile(256, 11, (v) => { return [120, 100, 80, v < .5 ? 0 : Math.floor((v - .5) * 34)]; });
  // pencil = colour × grain: light pressure is eaten by the paper
  const pencil = (col, seed) => { const [R, G, B] = col.match(/\w\w/g).map(h => parseInt(h, 16)); return noiseTile(128, seed, v => { return [R, G, B, v < .18 ? 60 : 200 + Math.floor(v * 55)]; }); };
  GRAPHITE = g.createPattern(pencil(GRAPH, 3), 'repeat'); CORALP = g.createPattern(pencil(CORAL, 5), 'repeat');
  grain = g.createPattern(paperTex, 'repeat');
}

// ---- the subject, drawn as a sketch: graphite lines from the picture's edges, flat chalky colour blocks under them ----
function sketchOf(src, w, h) {
  const key = `${src}|${w}|${h}`; if (CACHE[key]) return CACHE[key];
  const im = IMG[src], sw = Math.round(w / 2), sh = Math.round(h / 2), small = fit(im, sw, sh);
  const { L, E } = edgeMap(small);
  const line = canvas(sw, sh), lx = line.getContext('2d'), li = lx.createImageData(sw, sh);
  const [R, G, B] = [0x43, 0x36, 0x2e];
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const p = y * sw + x; let a = clamp((E[p] - .16) * 3.2);
    if (L[p] < .32 && (x + y) % 7 === 0) a = Math.max(a, .55);       // hatching in the darks
    if (L[p] < .18 && (x - y + 999) % 7 === 0) a = Math.max(a, .5);  // cross-hatching in the deepest darks
    if (hash(p * .37) < .22) a *= .35;                                // paper tooth
    li.data.set([R, G, B, Math.round(a * 235)], p * 4);
  }
  lx.putImageData(li, 0, 0);
  // colour: posterised, pushed towards the cream (soft, chalky), ragged edge
  const col = canvas(sw, sh), cx = col.getContext('2d'); cx.drawImage(small, 0, 0);
  const ci = cx.getImageData(0, 0, sw, sh), d = ci.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let k = 0; k < 3; k++) { const v = Math.round(d[i + k] / 64) * 64; d[i + k] = Math.min(255, v * .7 + [243, 234, 219][k] * .3); }
    const x = (i / 4) % sw, y = Math.floor(i / 4 / sw), m = 6 + 5 * Math.sin(y * .09 + hash(y) * 2) + 4 * hash(x * 3.1 + y);
    d[i + 3] = (x < m || y < m || x > sw - m || y > sh - m) ? 0 : 255;
  }
  cx.putImageData(ci, 0, 0);
  return (CACHE[key] = { line, col, sw: swatches(small, 5) });
}

// ---- pencil helpers (all in page units, under the camera) ----
function pline(pts, w = 5, pat = GRAPHITE, prog = 1) {
  if (prog <= 0) return; g.strokeStyle = pat; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  const n = Math.max(2, Math.ceil(pts.length * prog)); g.beginPath();
  pts.slice(0, n).forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
}
function wobblyRect(x, y, w, h, seed, prog = 1, lw = 5, pat = GRAPHITE) {
  const P = []; const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y + 3]];
  for (let s = 0; s < 4; s++) for (let k = 0; k <= 10; k++) { const a = pts[s], b = pts[s + 1], u = k / 10; P.push([lerp(a[0], b[0], u) + (hash(seed + s * 11 + k) - .5) * 5, lerp(a[1], b[1], u) + (hash(seed + s * 17 + k * 3) - .5) * 5]); }
  pline(P, lw, pat, prog);
}
function circlePts(cx, cy, r, seed, a0 = -1.6, turns = 1.02) { const P = []; for (let k = 0; k <= 60; k++) { const a = a0 + k / 60 * Math.PI * 2 * turns, rr = r + (hash(seed + k) - .5) * 6; P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return P; }
function block(x, y, w, h, col, prog = 1, seed = 1) {   // colour block, boustrophedon reveal, ragged, multiply
  if (prog <= 0) return; g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = col;
  const rows = 6, rh = h / rows, done = prog * rows;
  for (let r = 0; r < rows; r++) {
    const f = clamp(done - r); if (f <= 0) break;
    const dir = r % 2 ? -1 : 1, ww = w * f, xx = dir > 0 ? x : x + w - ww;
    g.beginPath(); g.moveTo(xx, y + r * rh - 2 + hash(seed + r) * 4);
    g.lineTo(xx + ww, y + r * rh + hash(seed + r + 3) * 4); g.lineTo(xx + ww - 6 * dir, y + (r + 1) * rh + 3); g.lineTo(xx, y + (r + 1) * rh + 2); g.fill();
  }
  g.restore();
}
function hand(text, x, y, size, prog = 1, pat = GRAPHITE, weight = 700, align = 'center') {
  g.font = `${weight} ${size}px Caveat`; g.textAlign = align; g.textBaseline = 'middle';
  const w = g.measureText(text).width, x0 = align === 'center' ? x - w / 2 : x;
  g.save(); g.beginPath(); g.rect(x0 - 10, y - size, (w + 20) * clamp(prog), size * 2); g.clip();
  g.fillStyle = pat; g.fillText(text, x, y); g.restore();
  return { w, x0, front: x0 + (w + 20) * clamp(prog) };
}
function stylus(x, y, lift = 0) {   // the only real object in frame
  g.save(); g.translate(x + 6, y - 6 - lift * 30); g.rotate(-.65);
  g.fillStyle = 'rgba(30,24,20,.18)'; g.beginPath(); g.roundRect(14, 30, 34, 300, 16); g.fill();
  g.fillStyle = '#e9e6e1'; g.beginPath(); g.roundRect(-16, 8, 32, 300, 15); g.fill(); g.strokeStyle = '#b9b3aa'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#cfcac2'; g.beginPath(); g.moveTo(-16, 10); g.lineTo(0, -26); g.lineTo(16, 10); g.fill(); g.fillStyle = '#555'; g.beginPath(); g.arc(0, -24, 4, 0, 7); g.fill();
  g.restore();
}

// ---- one beat = one region of the page ----
function region(b, t) {
  const [cx, cy] = center(b.i), lt = t - b.t0, done = t >= b.t1, P = done ? 1 : 0;
  const r = (a, d) => done ? 1 : clamp((lt - a) / d);
  let front = null;
  // title
  const big = (b.big || '').toUpperCase(), noPic = !imgOf(b);
  const ty = noPic ? cy - 60 : cy - 470; let size = noPic ? (big.length > 12 ? 130 : 170) : (big.length > 16 ? 92 : 112);
  g.font = `700 ${size}px Caveat`; while (g.measureText(big).width > 900 && size > 60) { size -= 8; g.font = `700 ${size}px Caveat`; }
  if (big) {
    g.font = `700 ${size}px Caveat`; const tw = g.measureText(big).width;
    block(cx - tw * .34, ty + size * .05, tw * .68, size * .5, YELLOW, r(.45, .35), b.i * 7);
    const h = hand(big, cx, ty, size, r(0, .55)); if (!done && lt < .55) front = [h.front, ty + 20];
    pline([[h.x0, ty + size * .58], [h.x0 + h.w, ty + size * .6]], 6, CORALP, r(.6, .3));
    if ((b.fx || []).includes('cross')) { pline([[h.x0 - 20, ty - size * .5], [h.x0 + h.w + 20, ty + size * .5]], 14, CORALP, r(.8, .2)); pline([[h.x0 + h.w + 20, ty - size * .5], [h.x0 - 20, ty + size * .5]], 14, CORALP, r(1, .2)); }
  }
  // subject
  const src = imgOf(b) ? b.img : null, set = b.set || 'page';
  let iw = 860, ih = 560, ix = cx - iw / 2, iy = cy - 330;
  if (set === 'frise' || set === 'nuancier') { iw = 720; ih = 460; ix = cx - iw / 2; iy = cy - 330; }
  const clipCircle = set === 'loupe' || set === 'coupe', R = 290;
  if (set === 'plan-de-travail') { block(cx - 470, cy - 360, 940, 640, '#d8b48c', r(.05, .4), 91); wobblyRect(cx - 470, cy - 360, 940, 640, b.i * 5 + 1, r(0, .5), 4, GRAPHITE); }
  if (src) {
    const S = sketchOf(src, clipCircle ? 2 * R : iw, clipCircle ? 2 * R : ih);
    const x0 = clipCircle ? cx - R : ix, y0 = clipCircle ? cy - R + 20 : iy, w0 = clipCircle ? 2 * R : iw, h0 = clipCircle ? 2 * R : ih;
    g.save();
    if (clipCircle) { g.beginPath(); g.arc(cx, cy + 20, R, 0, 7); g.clip(); }
    // colour after the line, shifted down-right, under it (multiply)
    const pc = r(.55, .5);
    if (pc > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.beginPath(); const rows = 7, done2 = pc * rows; for (let k = 0; k < rows; k++) { const f = clamp(done2 - k); if (f <= 0) break; const dir = k % 2 ? -1 : 1, ww = w0 * f; g.rect(dir > 0 ? x0 : x0 + w0 - ww, y0 + k * h0 / rows, ww, h0 / rows + 1); } g.clip(); g.drawImage(S.col, x0 + 10, y0 + 9, w0, h0); g.restore(); }
    // graphite line: diagonal wipe, the stylus rides the front
    const pl = r(.05, .55);
    g.save(); g.beginPath(); const L = pl * (w0 + h0); g.moveTo(x0, y0); g.lineTo(x0 + L, y0); g.lineTo(x0, y0 + L); g.closePath(); g.clip(); g.drawImage(S.line, x0, y0, w0, h0); g.restore();
    if (!done && pl > 0 && pl < 1) front = [x0 + L * .5 + (hash(Math.floor(lt * 12)) - .5) * 60, y0 + L * .5];
    g.restore();
    if (clipCircle) { pline(circlePts(cx, cy + 20, R, b.i * 3), 6, GRAPHITE, r(0, .5)); }
    else wobblyRect(x0, y0, w0, h0, b.i * 13, r(0, .45), 5, GRAPHITE);
    if (set === 'loupe') pline([[cx + R * .72, cy + 20 + R * .72], [cx + R * 1.12, cy + 20 + R * 1.15]], 26, GRAPHITE, r(.3, .2));
    if (set === 'coupe') { g.setLineDash([22, 16]); pline([[cx - R - 30, cy + 20], [cx + R + 30, cy + 20]], 6, CORALP, r(.7, .3)); g.setLineDash([]); }
    if (set === 'nuancier') S.sw.forEach((c, k) => { block(cx - 360 + k * 150, cy + 160, 120, 80, c, r(.9 + k * .08, .2), k + b.i); wobblyRect(cx - 360 + k * 150, cy + 160, 120, 80, k * 9 + b.i, r(.85 + k * .08, .2), 3, GRAPHITE); });
    // the talking object: two pencil eyes and a mouth on the picture
    if (b.face) {
      const fx = x0 + b.face[0] * w0, fy = y0 + b.face[1] * h0, l = lineAt(t), talk = l && l.beat === b.i ? envAt(l, t) : 0, blink = (Math.floor(t * 12) % 31) === 0;
      for (const s of [-1, 1]) { g.fillStyle = '#fbf6ee'; g.beginPath(); g.ellipse(fx + s * 46, fy, 30, blink ? 4 : 36, 0, 0, 7); g.fill(); g.strokeStyle = GRAPHITE; g.lineWidth = 5; g.stroke(); if (!blink) { g.fillStyle = GRAPH; g.beginPath(); g.arc(fx + s * 46 + 6, fy + 6, 12, 0, 7); g.fill(); } }
      g.fillStyle = GRAPH; g.beginPath(); g.ellipse(fx, fy + 70, 30, 6 + 26 * talk, 0, 0, 7); g.fill();
    }
  } else if (b.small) hand(b.small, cx, cy + 120, 70, r(.4, .5), GRAPHITE, 500);
  if (set === 'frise') {
    const y = cy + 300; pline([[cx - 440, y], [cx + 440, y]], 6, GRAPHITE, r(.4, .4));
    for (let k = 0; k < 5; k++) pline([[cx - 400 + k * 200, y - 18], [cx - 400 + k * 200, y + 18]], 5, GRAPHITE, r(.6 + k * .05, .1));
    if (b.tag) { g.fillStyle = CORAL; g.beginPath(); g.arc(cx + 200, y, 16, 0, 7); g.fill(); hand(b.tag, cx + 200, y + 66, 58, r(.8, .4), CORALP, 700); }
  } else if (b.tag) {
    const ny = noPic ? cy + 160 : cy + 300, h = hand(b.tag, cx + (noPic ? -120 : 120), ny, 66, r(.9, .4), CORALP, 700, 'left');
    pline([[cx + (noPic ? -130 : 110), ny - 8], [cx + (noPic ? -200 : 40), ny - 60]], 4, GRAPHITE, r(1.1, .2));
  }
  if ((b.fx || []).includes('arrow')) { const P = []; for (let k = 0; k <= 20; k++) { const u = k / 20; P.push([cx + 420 - u * 220, cy - 380 + u * 300 + Math.sin(u * 3) * 40]); } pline(P, 9, CORALP, r(.9, .4)); }
  // the talking object's bubble
  if (b.who === 'perso' && b.text && b.text.length <= 70) {
    const k = r(.15, .2); if (k > 0) {
      g.font = '700 56px Caveat'; const lines = wrap(b.text, 560), bw = 640, bh = 70 + lines.length * 60, bx = cx - 40, by = cy - 340 - bh * .2;
      g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(bx + bw / 2, by + bh / 2, bw / 2 + 20, bh / 2 + 10, 0, 0, 7); g.fill();
      pline(circlePts(bx + bw / 2, by + bh / 2, 1, b.i).map(([x, y], j) => { const a = -1.6 + j / 60 * 6.4; return [bx + bw / 2 + Math.cos(a) * (bw / 2 + 20), by + bh / 2 + Math.sin(a) * (bh / 2 + 10)]; }), 5, GRAPHITE, k);
      g.fillStyle = CORAL; g.font = '700 40px Caveat'; g.textAlign = 'center'; g.fillText((b.name || '').toUpperCase(), bx + bw / 2, by + 24);
      g.fillStyle = GRAPHITE; g.font = '700 56px Caveat'; lines.forEach((L, j) => g.fillText(L, bx + bw / 2, by + 76 + j * 60));
    }
  }
  if (b.bulb) { block(cx + 330, cy - 560, 90, 90, YELLOW, r(1, .3), 4); g.save(); g.globalAlpha = r(.9, .3); bulb(cx + 375, cy - 510, .9, { ink: GRAPH, fill: 'rgba(0,0,0,0)' }); g.restore(); }
  return front;
}

// ---- camera: two fingers on the glass ----
function camOf(i) { const [x, y] = center(i); return { x, y: y - 120, z: .94, r: (hash(i * 3.3) - .5) * .05 }; }
function cam(t) {
  const b = beatAt(t), lt = t - b.t0, c = camOf(b.i), last = b.i === N - 1;
  let k = { ...c, z: c.z * (1 + .05 * clamp(lt / Math.max(1, b.t1 - b.t0))) };
  if (b.i > 0 && lt < .5) { const p = camOf(b.i - 1), u = eio(lt / .5); k = { x: lerp(p.x, c.x, u), y: lerp(p.y, c.y, u), z: lerp(p.z, c.z, u) * (1 - .18 * Math.sin(u * Math.PI)), r: lerp(p.r, c.r, u) }; }
  if (b.i === 0 && b.cold) k.z *= 1.12 - .12 * eo(clamp(lt / .6));   // pinch-out from a close start
  if (last && b.t1 - b.t0 > 2.2) {   // the whole page, seen at least once
    const u = eio(seg(t, b.t0 + .9, b.t0 + 2.0)), zo = Math.min(1040 / PW, 1300 / PH);
    k = { x: lerp(k.x, PW / 2, u), y: lerp(k.y, PH / 2 - 60, u), z: lerp(k.z, zo, u), r: lerp(k.r, 0, u) };
  }
  return k;
}

export function draw(t) {
  const c = cam(t), b = beatAt(t);
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  g.setTransform(1, 0, 0, 1, 0, 0); g.translate(W / 2, 900); g.rotate(c.r); g.scale(c.z, c.z); g.translate(-c.x, -c.y);
  g.fillStyle = grain; g.fillRect(-400, -400, PW + 800, PH + 800);
  // light construction lines left in (page grid of the regions)
  g.strokeStyle = 'rgba(168,153,138,.35)'; g.lineWidth = 2; g.setLineDash([10, 14]);
  for (let i = 0; i < N; i++) { const [x, y] = center(i); g.strokeRect(x - 500, y - 560, 1000, 1060); }
  g.setLineDash([]);
  let front = null;
  for (const B of TL.beats) if (t >= B.t0) { const f = region(B, t); if (B === b) front = f; }
  if (front) stylus(front[0], front[1]);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // light screen-space corner falloff
  const v = g.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1250); v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(60,40,20,.16)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

export function subtitles(t) {
  const l = subAt(t); if (!l) return;
  const b = TL.beats[l.beat]; if (b && b.who === 'perso' && b.text && b.text.length <= 70 && t > b.t0 + .3) return;   // déjà dans la bulle
  g.setTransform(1, 0, 0, 1, 0, 0); const F = '700 78px Caveat'; g.textBaseline = 'middle';
  const c = subChunk(l, t, 880, F), y = 1360; g.font = F;
  const w = Math.min(980, c.words.map(x => g.measureText(x).width).reduce((a, x) => a + x, 0) + g.measureText(' ').width * (c.words.length - 1) + 70);
  g.save(); g.translate(W / 2, y); g.rotate(-.012); g.fillStyle = 'rgba(251,247,240,.95)'; g.beginPath(); g.roundRect(-w / 2, -58, w, 116, 22); g.fill(); g.strokeStyle = LIGHT; g.lineWidth = 3; g.stroke(); g.restore();
  if (l.who === 'perso' && l.name) { g.font = '700 44px Caveat'; g.fillStyle = CORAL; g.textAlign = 'center'; g.fillText(l.name.toUpperCase(), W / 2, y - 90); g.font = F; }
  drawChunk(c, W / 2, y + 2, GRAPH, GRAPH, { mark: YELLOW });
}

export function events(add) { for (const b of TL.beats) add('scribble', b.t0 + .05, { d: .55 }); }

// ---- toolbox for hand-directed scenes (film.scene): primitives only, no sets ----
export const KIT = { pline, wobblyRect, circlePts, block, hand, stylus, sketchOf, PAPER, GRAPH, LIGHT, CORAL,
  pats: () => ({ graphite: GRAPHITE, coral: CORALP, grain }) };
