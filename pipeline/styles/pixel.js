// pixel.js — « 2.5D Pixel Art » for Le Sachoir: a lit, fogged miniature set seen from a high three-quarter camera through a
// tilt-shift band; flat stepped pixel sprites inside it; light is the subject (practicals, shafts, bloom, vignette); a small
// RPG UI on top (chapter cards, a framed dialogue box typed with the voice). Grammar from Lemo-Opuscar hd-2d (MIT code).
// No name, logo or UI of any existing game, and never the trademarked name of the look on screen.
import { TL, g, W, H, IMG, imgOf, imgUpTo, canvas, fit, quantize, beatAt, lineAt, envAt, subAt, subtitleLines, subChunk, drawChunk, wrap,
  bulb, YELLOW, clamp, hash, seg, q, rgb } from './core.js';
import { eio, eo, lerp } from './lib.js';

export const FONTS = ['700 60px Cinzel', 'italic 600 50px "Cormorant Garamond"', '700 50px "Cormorant Garamond"'];
const LW = 270, LH = 480, S = 4;   // low-res buffer, upscaled ×4 to 1080 × 1920
const lo = canvas(LW, LH), lx = lo.getContext('2d'), light = canvas(LW, LH), ll = light.getContext('2d');
const big = canvas(W, H), bx = big.getContext('2d');
const GOLD = '#d9b45a', PAPERW = '#f3ead6';
export const THEME = { bg: '#0f1424', ink: PAPERW, logo: '700 120px Cinzel', small: 'italic 600 54px "Cormorant Garamond"', band: '700 64px Cinzel', bandLh: 80 };
const SETS = {
  musee: { amb: ['#0d1426', '#16223b', '#223354', '#33496e', '#4d6890'], warm: '#ffb85a', fog: 'rgba(70,100,160,', key: 'moon' },
  ruelle: { amb: ['#0f1218', '#1b2029', '#2b323e', '#3f4756', '#5a6474'], warm: '#ff9a3c', fog: 'rgba(90,100,130,', key: 'rain' },
  port: { amb: ['#08161a', '#0f2a30', '#1a3f46', '#2b5a5c', '#3f7a70'], warm: '#ffc070', fog: 'rgba(80,140,110,', key: 'mist' },
  trone: { amb: ['#1a1016', '#2c1a1e', '#46282a', '#6a3c32', '#8f5a40'], warm: '#ffd27a', fog: 'rgba(160,120,70,', key: 'dust' },
  bureau: { amb: ['#10140f', '#1c2419', '#2c3826', '#425236', '#5c6e48'], warm: '#b8ff9a', fog: 'rgba(120,130,110,', key: 'smoke' },
};
const HERO = TL.hero || '#e0483e';
const PICS = {};

function pal(set) { const P = SETS[set] || SETS.musee; return [...P.amb, P.warm, '#ffe9b8', '#fff6e0', '#8a5a2c', '#5c3a1e', '#c99a4a', GOLD, '#7a2a22', '#b23a2a', HERO, '#0a0a0e']; }
function picOf(src) { if (PICS[src]) return PICS[src]; const c = fit(IMG[src], 96, 64); return (PICS[src] = quantize(c, ['#0a0a0e', '#2b2b3a', '#4a4a5e', '#7a7a8a', '#b0aca4', '#e8e2d4', '#7a2a22', '#c0503a', '#e09a5a', '#f0d08a', '#3a5a3a', '#6a8a4a', '#2a3a6a', '#4a6aaa', '#8ab0d8', '#5a3a2a', '#9a6a4a'], .5)); }

// ---- the miniature set (in low-res pixels) ----
const R = (x, y, w, h, c) => { lx.fillStyle = c; lx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function lamp(x, y, r, col, k = 1) { const f = (.85 + .15 * Math.sin(T * 9 + x) * Math.sin(T * 5.3 + y)) * k; const gr = ll.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ll.globalAlpha = .9 * f; ll.fillStyle = gr; ll.fillRect(x - r, y - r, 2 * r, 2 * r); ll.globalAlpha = 1; LIGHTS.push([x, y]); }
let T = 0, LIGHTS = [];
function setDraw(set, t, b) {
  const P = SETS[set] || SETS.musee, A = P.amb; LIGHTS = [];
  R(0, 0, LW, LH, A[0]);
  const wallTop = 80, floorY = 250;
  // back wall
  R(0, wallTop, LW, floorY - wallTop, A[1]);
  for (let y = wallTop; y < floorY; y += 8) for (let x = (y / 8 % 2) * 8; x < LW; x += 16) R(x, y, 15, 7, A[2]);
  // floor in perspective (rows widen towards the camera)
  for (let k = 0, y = floorY; y < LH; k++) { const h = 6 + k * 2.2; R(0, y, LW, h, k % 2 ? A[2] : A[1]); for (let x = (k % 2) * 12; x < LW; x += 24) R(x, y, 1, h, A[0]); y += h; }
  R(0, floorY, LW, 2, A[3]);
  if (set === 'musee') {
    for (const wx of [20, 210]) { R(wx, wallTop + 14, 40, 86, A[3]); R(wx + 4, wallTop + 18, 32, 80, '#6f8fc0'); R(wx + 19, wallTop + 18, 2, 80, A[2]); lx.fillStyle = A[3]; lx.beginPath(); lx.arc(wx + 20, wallTop + 18, 16, Math.PI, 0); lx.fill();
      ll.globalAlpha = .22; ll.fillStyle = '#9fc0ff'; ll.beginPath(); ll.moveTo(wx + 4, wallTop + 18); ll.lineTo(wx + 36, wallTop + 18); ll.lineTo(wx + 80 + (wx > 100 ? -120 : 0), LH - 60); ll.lineTo(wx + 30 + (wx > 100 ? -120 : 0), LH - 60); ll.fill(); ll.globalAlpha = 1; }
    R(214, 300, 14, 40, '#3a2a1e'); lamp(221, 296, 70, P.warm); R(217, 290, 8, 8, '#ffe9b8');
  } else if (set === 'ruelle') {
    for (const [x0, dir] of [[0, 1], [LW, -1]]) { lx.fillStyle = A[2]; lx.beginPath(); lx.moveTo(x0, 40); lx.lineTo(x0 + dir * 70, 120); lx.lineTo(x0 + dir * 70, 300); lx.lineTo(x0, LH); lx.fill();
      for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { const wx = x0 + dir * (14 + j * 26), wy = 90 + k * 50 + j * 12; R(dir > 0 ? wx : wx - 12, wy, 12, 16, k % 2 ? '#ffb060' : A[1]); if (k % 2) lamp(wx, wy + 8, 22, P.warm, .5); } }
    for (const lxp of [92, 178]) { R(lxp, 170, 3, 90, '#1a1a1a'); R(lxp - 4, 162, 11, 10, '#ffd890'); lamp(lxp + 1, 167, 60, P.warm); }
    for (let k = 0; k < 60; k++) { const x = (hash(k) * LW + t * 40) % LW, y = (hash(k + 9) * LH + t * 260) % LH; R(x, y, 1, 4, 'rgba(160,180,220,.55)'); }
  } else if (set === 'port') {
    R(0, 300, LW, LH - 300, '#0e2a33');
    for (let k = 0; k < 40; k++) { const y = 306 + (k * 37 % 170), x = (hash(k) * LW + Math.sin(t + k) * 6); R(x, y, 6 + (k % 3) * 4, 1, A[4]); }
    R(0, 250, LW, 50, '#3a3026'); for (let x = 0; x < LW; x += 18) R(x, 296, 2, 10, '#2a2018');
    R(30, 230, 30, 22, '#6a4a2c'); R(66, 236, 22, 16, '#5a3c22');
    lx.fillStyle = '#1a1410'; lx.beginPath(); lx.moveTo(150, 330); lx.lineTo(250, 330); lx.lineTo(236, 352); lx.lineTo(164, 352); lx.fill(); R(198, 250, 3, 80, '#1a1410');
    for (const [x, y] of [[40, 210], [200, 245], [120, 240]]) { R(x - 2, y - 4, 5, 6, '#ffe0a0'); lamp(x, y, 46, P.warm); for (let k = 0; k < 6; k++) R(x - 1, 312 + k * 12, 3, 6, 'rgba(255,200,120,.5)'); }
  } else if (set === 'trone') {
    for (const bxp of [40, 210]) { R(bxp, wallTop + 6, 22, 110, '#8a2020'); R(bxp + 8, wallTop + 30, 6, 6, GOLD); }
    R(112, 150, 46, 100, '#7a5a20'); R(118, 140, 34, 20, GOLD); R(116, 196, 38, 12, '#a02828');
    R(105, 250, 60, LH - 250, '#6a1a1a');
    ll.globalAlpha = .3; ll.fillStyle = '#ffd890'; ll.beginPath(); ll.moveTo(30, wallTop); ll.lineTo(70, wallTop); ll.lineTo(170, LH - 80); ll.lineTo(110, LH - 80); ll.fill(); ll.globalAlpha = 1;
    for (let k = 0; k < 30; k++) { const x = 60 + hash(k) * 100 + Math.sin(t * .5 + k) * 6, y = 120 + (hash(k + 3) * 260 + t * 8) % 260; R(x, y, 1, 1, '#ffe9b8'); }
    lamp(135, 160, 80, P.warm, .6);
  } else if (set === 'bureau') {
    R(0, wallTop, LW, floorY - wallTop, '#3a2a1e'); for (let x = 0; x < LW; x += 30) R(x, wallTop, 2, floorY - wallTop, '#2a1e14');
    R(20, 150, 50, 100, '#4a5a4a'); for (let k = 0; k < 3; k++) R(24, 156 + k * 32, 42, 26, '#5a6a5a');
    R(90, 250, 150, 60, '#5c3a1e'); R(90, 250, 150, 6, '#7a5030'); R(110, 236, 34, 14, '#e8e2d4'); R(150, 232, 30, 18, '#d8d0c0');
    R(196, 214, 4, 36, '#1a2a1a'); R(186, 206, 24, 10, '#2f7a3a'); lamp(198, 218, 70, P.warm);
    for (let k = 0; k < 12; k++) { const y = 200 - ((t * 14 + k * 9) % 80), x = 150 + Math.sin(t + k) * 6; R(x, y, 2, 2, 'rgba(200,200,190,.5)'); }
  }
}
// ---- sprites (flat, stepped, 1 px darker outline) ----
function sprite(x, y, col, frame, face = 1, o = {}) {
  const Z = o.z || 2, c = (dx, dy, w, h, k) => { lx.fillStyle = k; lx.fillRect(Math.round(x + (face > 0 ? dx : -dx - w) * Z), Math.round(y + dy * Z), w * Z, h * Z); };
  c(-6, -2, 13, 3, 'rgba(0,0,0,.45)');                                                  // contact shadow
  const leg = frame % 4, l1 = [0, 2, 0, -2][leg], l2 = -l1;
  c(-3, -7 + Math.min(0, l1), 3, 7, '#2a2230'); c(1, -7 + Math.min(0, l2), 3, 7, '#2a2230');
  c(-5, -18, 10, 12, '#1a1418'); c(-4, -17, 8, 11, col); c(-4, -12, 8, 2, '#00000040');   // coat
  c(-3, -24, 7, 7, '#1a1418'); c(-2, -23, 5, 5, o.skin || '#f0c8a0'); c(1, -22, 1, 1, '#1a1418');
  c(-3, -25, 7, 2, o.hair || '#3a2a20');
  if (o.carry) { c(4, -16, 10, 8, '#1a1418'); c(5, -15, 8, 6, GOLD); }
}
function shadowFrom(x, y) {   // the hero's shadow thrown away from the nearest practical
  let best = null, bd = 1e9; for (const L of LIGHTS) { const d = (L[0] - x) ** 2 + (L[1] - y) ** 2; if (d < bd) { bd = d; best = L; } }
  if (!best) return; const dx = x - best[0], dy = y - best[1], n = Math.hypot(dx, dy) || 1;
  lx.fillStyle = 'rgba(0,0,0,.4)'; lx.beginPath(); lx.ellipse(x + dx / n * 10, y + dy / n * 3, 10, 3, Math.atan2(dy, dx) * .2, 0, 7); lx.fill();
}

function scene(b, t) {
  const lt = t - b.t0, set = b.set || 'musee'; T = t;
  lx.setTransform(1, 0, 0, 1, 0, 0); ll.setTransform(1, 0, 0, 1, 0, 0); ll.clearRect(0, 0, LW, LH);
  setDraw(set, t, b);
  // the subject: a framed picture on the back wall
  const src = imgOf(b) ? b.img : imgUpTo(b.i);
  const pic = () => { if (!src) return; const p = picOf(src), w = 112, h = 76, x = (LW - w) / 2, y = 132; R(x - 5, y - 5, w + 10, h + 10, '#5a3c14'); R(x - 3, y - 3, w + 6, h + 6, GOLD); lx.drawImage(p, 0, 0, 96, 64, x, y, w, h); };
  if (src) lamp(LW / 2, 124, 46, '#fff0c8', .35);
  // NPC crowd
  if ((b.fx || []).includes('foule')) for (let k = 0; k < 7; k++) sprite(30 + k * 32 + Math.sin(t * 2 + k) * 2, 268 + (k % 2) * 8, ['#4a5a7a', '#7a4a3a', '#5a6a3a', '#6a3a6a'][k % 4], Math.floor(t * 4 + k) % 2 ? 0 : 2, k % 2 ? 1 : -1, { hair: '#1a1a1a' });
  // the hero walks across the floor during each beat (on twos: 8 fps)
  const x0 = 60 + (b.i * 47) % 130, x1 = x0 + ((b.i % 2) ? -30 : 40), u = clamp((lt - .2) / 1.6), hx = lerp(x0, x1, eio(u)), hy = 318 + (b.i % 3) * 8;
  shadowFrom(hx, hy);
  sprite(hx, hy, HERO, u > 0 && u < 1 ? Math.floor(t * 8) : (Math.floor(t * 1.5) % 2 ? 0 : 0), x1 >= x0 ? 1 : -1, { carry: (b.fx || []).includes('slap') });
  if (b.bulb) { R(hx + 16, hy - 66, 2, 14, '#2a2a2a'); R(hx + 12, hy - 54, 10, 11, '#ffe070'); R(hx + 14, hy - 43, 6, 3, '#5a5a5a'); lamp(hx + 17, hy - 48, 34, '#ffe070'); }
  // fog of the set
  const P = SETS[set] || SETS.musee, fg = lx.createLinearGradient(0, 60, 0, 260); fg.addColorStop(0, P.fog + '.55)'); fg.addColorStop(1, P.fog + '0)'); lx.fillStyle = fg; lx.fillRect(0, 0, LW, 260);
  // lights onto the set
  lx.globalCompositeOperation = 'lighter'; lx.drawImage(light, 0, 0); lx.globalCompositeOperation = 'source-over';
  pic();
}

export function draw(t) {
  const b = beatAt(t), lt = t - b.t0;
  scene(b, t);
  // upscale, nearest neighbour, camera gliding in sub-pixels
  const z = 1 + .04 * clamp(lt / (b.t1 - b.t0)), ox = Math.sin(t * .23) * 10, oy = Math.cos(t * .17) * 6;
  bx.imageSmoothingEnabled = false; bx.setTransform(1, 0, 0, 1, 0, 0); bx.fillStyle = '#000'; bx.fillRect(0, 0, W, H);
  bx.translate(W / 2 + ox, H / 2 + oy - 60); bx.scale(S * z, S * z); bx.translate(-LW / 2, -LH / 2); bx.drawImage(lo, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(big, 0, 0);
  // bloom: the lights, blurred, added
  g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(26px)'; g.globalAlpha = .7; g.imageSmoothingEnabled = true;
  g.translate(W / 2 + ox, H / 2 + oy - 60); g.scale(S * z, S * z); g.translate(-LW / 2, -LH / 2); g.drawImage(light, 0, 0); g.restore();
  // tilt-shift: the top and bottom of the frame go soft, the band in the middle stays sharp
  for (const [y0, y1, dir] of [[0, 620, 1], [1350, H, -1]]) {
    g.save(); g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip(); g.filter = 'blur(7px)'; g.drawImage(big, 0, 0); g.restore();
  }
  // vignette and grade
  const v = g.createRadialGradient(W / 2, H / 2 - 80, 380, W / 2, H / 2, 1150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  // cut between sets: four stepped frames through black
  if (b.i > 0 && TL.beats[b.i - 1].set !== b.set && lt < .17) { g.fillStyle = `rgba(0,0,0,${1 - Math.floor(lt * 24) / 4})`; g.fillRect(0, 0, W, H); }
  ui(b, t, lt);
}

// ---- RPG UI ----
function plate(x, y, w, h) { g.fillStyle = 'rgba(8,10,20,.82)'; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.strokeStyle = GOLD; g.lineWidth = 3; g.stroke(); g.strokeStyle = 'rgba(217,180,90,.45)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x + 8, y + 8, w - 16, h - 16, 6); g.stroke();
  g.fillStyle = GOLD; for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillRect(-7, -7, 14, 14); g.restore(); } }
function ui(b, t, lt) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none';
  // chapter card
  if (b.chapter && lt < 1.8) {
    const k = clamp(lt / .25) * clamp((1.8 - lt) / .25);
    g.globalAlpha = k; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 760, W, 300);
    g.fillStyle = GOLD; g.fillRect(180, 820, 720, 2); g.fillRect(180, 1000, 720, 2);
    g.font = '700 64px Cinzel'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = PAPERW; g.fillText(b.chapter.toUpperCase(), W / 2, 912);
    g.globalAlpha = 1;
  }
  // the key word, as a found-item notice (or a gain floating up when it starts with "+")
  const word = b.big || '';
  if (word && lt > .3 && !(b.chapter && lt < 1.8)) {
    const k = clamp((lt - .3) / .2);
    if (word.startsWith('+')) { g.font = '700 70px Cinzel'; g.textAlign = 'center'; g.fillStyle = YELLOW; g.globalAlpha = clamp(2 - (lt - .3)); g.fillText(word.toUpperCase(), W / 2, 960 - 120 * eo(clamp((lt - .3) / 1.2))); g.globalAlpha = 1; }
    else { g.font = '700 54px Cinzel'; let s = 54; while (g.measureText(word.toUpperCase()).width > 860 && s > 34) { s -= 4; g.font = `700 ${s}px Cinzel`; }
      const w = g.measureText(word.toUpperCase()).width + 80; g.save(); g.translate(W / 2, 870); g.scale(1, k); plate(-w / 2, -48, w, 96); g.fillStyle = YELLOW; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(word.toUpperCase(), 0, 4); g.restore(); }
    if ((b.fx || []).includes('cross')) { const c = clamp((lt - .8) / .2); g.strokeStyle = '#e04a3a'; g.lineWidth = 12; g.beginPath(); g.moveTo(200, 830); g.lineTo(200 + 680 * c, 910); g.stroke(); }
  }
  if (b.tag) { g.font = '700 34px Cinzel'; g.textAlign = 'left'; g.fillStyle = 'rgba(243,234,214,.85)'; g.fillText('◆ ' + b.tag.toUpperCase(), 60, 1290); }
}
function dialog(l, t) {
  const x = 50, y = 1165, w = W - 100, h = 270;
  plate(x, y, w, h);
  g.font = '700 40px Cinzel'; const nm = (l.name || '').toUpperCase(), nw = g.measureText(nm).width + 50;
  plate(x + 40, y - 34, nw, 62); g.fillStyle = YELLOW; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(nm, x + 65, y - 2);
  const typed = Math.floor(l.text.length * clamp((t - l.t) / Math.max(.3, l.dur * .9)));
  g.font = '700 50px "Cormorant Garamond"'; g.fillStyle = PAPERW; const L = wrap(l.text.slice(0, typed), w - 90);
  L.slice(-3).forEach((s, i) => g.fillText(s, x + 45, y + 75 + i * 60));
  if (typed >= l.text.length && Math.floor(t * 3) % 2) { g.fillStyle = YELLOW; g.beginPath(); g.moveTo(x + w - 60, y + h - 50); g.lineTo(x + w - 36, y + h - 50); g.lineTo(x + w - 48, y + h - 34); g.fill(); }
}
export function subtitles(t) {
  const l = subAt(t); if (!l) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (l.who === 'perso') { dialog(l, t); return; }
  const F = 'italic 600 66px "Cormorant Garamond"'; g.textBaseline = 'middle';
  const c = subChunk(l, t, 900, F), y = 1380; g.font = F;
  const gr = g.createLinearGradient(0, y - 130, 0, 1470); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.4, 'rgba(0,0,0,.66)'); gr.addColorStop(1, 'rgba(0,0,0,.66)'); g.fillStyle = gr; g.fillRect(0, y - 130, W, 1470 - y + 130);
  g.shadowColor = '#000'; g.shadowBlur = 8; drawChunk(c, W / 2, y, PAPERW, YELLOW); g.shadowBlur = 0;
}
export function events(add) { for (const l of TL.lines) if (l.who === 'perso') add('chime', l.t - .05); for (const b of TL.beats) if (b.chapter) add('chapter', b.t0); }

// ---- toolbox for hand-directed scenes (film.scene): primitives only, no sets ----
/** start a frame: clear the light buffer, reset the practicals list */
function begin(t) { T = t; LIGHTS = []; lx.setTransform(1, 0, 0, 1, 0, 0); ll.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, LW, LH); ll.clearRect(0, 0, LW, LH); }
/** finish a frame: lights added, upscaled ×4 nearest-neighbour with the camera, bloom, tilt-shift, vignette.
 *  cam: {x, y} = low-res point at the frame centre (default the buffer centre), z (zoom, 1 = ×4), r (turn),
 *  tilt: [y0, y1] screen band kept sharp (false = none), vig: vignette strength 0..1, bloom: 0..1 */
function present(cam = {}) {
  const z = cam.z ?? 1, cx = cam.x ?? LW / 2, cy = cam.y ?? LH / 2;
  lx.globalCompositeOperation = 'lighter'; lx.drawImage(light, 0, 0); lx.globalCompositeOperation = 'source-over';
  const place = c => { c.translate(W / 2, H / 2); c.rotate(cam.r || 0); c.scale(S * z, S * z); c.translate(-cx, -cy); };
  bx.imageSmoothingEnabled = false; bx.setTransform(1, 0, 0, 1, 0, 0); bx.fillStyle = '#000'; bx.fillRect(0, 0, W, H); place(bx); bx.drawImage(lo, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(big, 0, 0);
  g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(26px)'; g.globalAlpha = .7 * (cam.bloom ?? 1); g.imageSmoothingEnabled = true; place(g); g.drawImage(light, 0, 0); g.restore();
  const tilt = cam.tilt === undefined ? [620, 1350] : cam.tilt;
  if (tilt) for (const [y0, y1] of [[0, tilt[0]], [tilt[1], H]]) { g.save(); g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip(); g.filter = 'blur(7px)'; g.drawImage(big, 0, 0); g.restore(); }
  const v = g.createRadialGradient(W / 2, H / 2 - 80, 380, W / 2, H / 2, 1150); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${.72 * (cam.vig ?? 1)})`); g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = true;
}
export const KIT = { LW, LH, lo, lx, light, ll, R, lamp, sprite, shadowFrom, picOf, pal, plate, begin, present, GOLD, PAPERW, HERO, quantize };
