// Scène réalisée pour « Pourquoi on dit « mettre les points sur les i » ? » — Tablet Sketch (28 novembre 2026).
// Fil visuel : une palissade de quinze bâtons de plume, le mot « minimum » écrit à la gothique, que personne ne sait
// lire ; la caméra la longe comme un œil qui lit, s'en échappe (un point qui tombe, un mail agacé, la table des
// lettres, un moine vexé, une presse) et y revient : deux traits corail, puis deux points, et le mot se lit enfin.
//  0 accroche   très gros plan penché sur le stylet qui aligne les bâtons ; travelling latéral qui suit, puis recul
//  1 curiosité  filé vers un bâton géant ; un point corail tombe dessus avec un rebond, « ? » ; poussée lente
//  2 verrou     coupe, insert penché vu du dessus sur l'écran d'un portable : « Je mets les points sur les i. »
//  3 POINT      coupe large sur la palissade, zoom brutal avec rebond dans une loupe : un seul bâton, c'est le i
//  4 raison     coupe, panoramique vertical sur la table des lettres : i = 1 bâton, n = 2, u = 2, m = 3
//  5 raison     très gros plan à l'épaule, travelling latéral à ras des bâtons ; tampon « ILLISIBLE »
//  6 signature  rotation qui se redresse : le stylet coiffe chaque i d'un trait corail, puis les lettres se colorent
//               une à une et « m i n i m u m » s'écrit dessous — la palissade devient un mot
//  7 réplique   contre-plongée penchée, caméra à l'épaule, sur Frère Odon ; sa bulle
//  8 exemple    panoramique vertical qui accélère sur une presse : la platine tombe, et le trait devient un point
//  9 boucle     longue remontée jusqu'à la palissade, même cadre que la fin du plan 0 : les points sont là
import { g, W, H, TL, at, ub, prog, camera, look, reset, shake, whip, flash, talk, TXT, lerp, clamp, hash } from '../kit.js';
import { bulb, YELLOW } from '../core.js';
import { KIT } from '../sketch.js';
const { pline, wobblyRect, circlePts, block, hand, stylus, PAPER, GRAPH, CORAL, pats } = KIT;

const SX = 450, SY = 860;          // le point regardé arrive ici (à gauche des 230 px couverts par Instagram)
const F = { x: 730, y: 800 };      // la palissade « minimum »
const Q = { x: 2150, y: 800 };     // le bâton géant et son point
const M = { x: 730, y: 2300 };     // le mail agacé
const T = { x: 2150, y: 2300 };    // la table des lettres
const O = { x: 730, y: 3700 };     // Frère Odon
const P = { x: 2150, y: 3700 };    // la presse

// ── le mot « minimum » en jambages : 15 bâtons
const WORD = ['m', 'i', 'n', 'i', 'm', 'u', 'm'], NB = { m: 3, n: 2, u: 2, i: 1 };
const STEP = 64, GAP = 104, HS = 110;
const MIN = [], LET = [];
(() => {
  let x = 0;
  WORD.forEach(c => { const x0 = x; for (let j = 0; j < NB[c]; j++) { MIN.push({ x, i: c === 'i' }); if (j < NB[c] - 1) x += STEP; } LET.push({ c, x0, x1: x }); x += GAP; });
  const off = F.x - (x - GAP) / 2;
  MIN.forEach(m => { m.x += off; }); LET.forEach(l => { l.x0 += off; l.x1 += off; });
})();
const I = MIN.filter(m => m.i);

// un bâton de plume (jambage) : petit attaque en haut, petit pied en bas
const mPts = (x, y, s = 1) => [[x - 18 * s, y - (HS - 14) * s], [x, y - HS * s], [x, y + (HS - 12) * s], [x + 20 * s, y + HS * s]];
// le début d'une ligne brisée, jusqu'à la fraction p de sa longueur
function part(pts, p) {
  if (p >= 1) return pts;
  const d = []; let L = 0;
  for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); d.push(l); L += l; }
  let r = L * clamp(p); const out = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    if (r >= d[k - 1]) { out.push(pts[k]); r -= d[k - 1]; }
    else { const u = r / Math.max(1e-6, d[k - 1]); out.push([lerp(pts[k - 1][0], pts[k][0], u), lerp(pts[k - 1][1], pts[k][1], u)]); break; }
  }
  return out;
}
function pl(pts, p, w, pat) { if (p <= 0) return null; const q = part(pts, p); if (q.length > 1) pline(q, w, pat, 1); return q[q.length - 1]; }
function dot(x, y, r, col) { if (r <= 0) return; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

// ── les dessins (unités de la page)
function fence(t, Tp) {
  const n = t < at(1, 0) ? lerp(4, 15, prog(t, 0, at(0, .75), 'io')) : 15;
  let front = null;
  // plan 6 et après : chaque lettre prend sa couleur (sous le trait)
  if (t >= at(6, .5)) LET.forEach((l, k) => block(l.x0 - 32, F.y - HS - 12, l.x1 - l.x0 + 64, 2 * HS + 24,
    ['rgba(245,182,42,.85)', '#f2c3ae', '#bcd0dc'][k % 3], prog(t, at(6, .5 + k * .05), at(6, .62 + k * .05)), 40 + k));
  // plan 3 : le premier i, surligné sous la loupe
  const inLoupe = t >= at(3, 0) && t < at(4, 0);
  if (inLoupe) block(I[0].x - 30, F.y - HS - 10, 60, 2 * HS + 20, YELLOW, prog(t, at(3, .3), at(3, .55)), 5);
  MIN.forEach((m, k) => { const f = clamp(n - k); if (f <= 0) return; const e = pl(mPts(m.x, F.y), f, 15, Tp.graphite); if (f < 1) front = e; });
  if (inLoupe) {
    pline(circlePts(I[0].x, F.y, 175, 4), 7, Tp.graphite, prog(t, at(3, .1), at(3, .4)));
    pline([[I[0].x + 124, F.y + 124], [I[0].x + 215, F.y + 220]], 24, Tp.graphite, prog(t, at(3, .3), at(3, .45)));
    hand('le i', I[0].x, F.y - HS - 110, 80, prog(t, at(3, .45), at(3, .7)), Tp.coral);
  }
  // le trait des copistes, puis (après l'imprimerie) le point
  I.forEach((m, j) => {
    if (t >= at(8, 0)) { dot(m.x + 4, F.y - HS - 62, 17, GRAPH); return; }
    if (t < at(6, .08)) return;
    const p = prog(t, at(6, .08 + j * .2), at(6, .24 + j * .2));
    const e = pl([[m.x - 10, F.y - HS - 38], [m.x + 22, F.y - HS - 98]], p, 13, Tp.coral);
    if (e && p < 1 && t < at(7, 0)) front = e;
  });
  if (t >= at(6, .3)) hand('XIe siècle', I[1].x + 250, F.y - HS - 150, 64, prog(t, at(6, .3), at(6, .5)), Tp.coral);
  if (t >= at(6, .6)) LET.forEach((l, k) => hand(l.c, (l.x0 + l.x1) / 2, F.y + HS + 95, 120, prog(t, at(6, .6 + k * .05), at(6, .72 + k * .05)), Tp.coral));
  return front;
}
function why(t, Tp) {
  if (t < at(1, 0)) return null;
  wobblyRect(Q.x - 430, Q.y - 330, 860, 640, 33, prog(t, at(1, 0), at(1, .3)), 5, Tp.graphite);
  const p = prog(t, at(1, .08), at(1, .38), 'out');
  const e = pl(mPts(Q.x - 120, Q.y + 60, 1.5), p, 24, Tp.graphite);
  const d = prog(t, at(1, .38), at(1, .62), 'back');
  if (d > 0) dot(Q.x - 112, lerp(Q.y - 430, Q.y - 170, d), 32, CORAL);
  hand('?', Q.x + 190, Q.y - 10, 380, prog(t, at(1, .55), at(1, .8)), Tp.coral);
  return p > 0 && p < 1 ? e : null;
}
function mail(t, Tp) {
  if (t < at(2, 0)) return;
  const r = (a, d) => clamp((t - at(2, 0) - a) / d), x = M.x, y = M.y;
  block(x - 380, y - 280, 760, 470, '#dfe7ec', r(0, .25), 21);
  wobblyRect(x - 380, y - 280, 760, 470, 22, r(0, .25), 6, Tp.graphite);
  pline([[x - 460, y + 250], [x + 460, y + 250], [x + 390, y + 190], [x - 390, y + 190], [x - 460, y + 250]], 6, Tp.graphite, r(.05, .25));
  hand('RE : RE : RE : le dossier', x - 340, y - 200, 54, r(.1, .3), Tp.graphite, 500, 'left');
  hand('Je mets les points sur les i.', x - 340, y - 70, 64, r(.25, .45), Tp.graphite, 700, 'left');
  pline([[x - 340, y - 25], [x + 320, y - 20]], 7, Tp.coral, r(.6, .2));
  for (let k = 0; k < 3; k++) hand('!', x + 180 + k * 55, y + 70 - (k % 2) * 24, 96, r(.7 + k * .06, .1), Tp.coral);
}
function table(t, Tp) {
  if (t < at(4, 0)) return;
  const rows = [['i', 1], ['n', 2], ['u', 2], ['m', 3]];
  rows.forEach(([c, n], k) => {
    const y = T.y - 300 + k * 200, p = prog(t, at(4, .05 + k * .18), at(4, .22 + k * .18));
    hand(c, T.x - 300, y, 150, p, Tp.graphite);
    hand('=', T.x - 160, y + 10, 100, p, Tp.coral);
    for (let j = 0; j < n; j++) pl(mPts(T.x + j * 70, y + 10, .62), clamp(p * n - j), 13, Tp.graphite);
  });
}
function odon(t, Tp) {
  if (t < at(7, 0)) return;
  const r = (a, d) => clamp((t - at(7, 0) - a) / d), x = O.x, y = O.y, bob = Math.sin(t * 3) * 4, tk = talk(t);
  // la robe bleu ardoise, la corde
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#8796ad';
  g.beginPath(); g.moveTo(x - 120, y - 30); g.lineTo(x + 120, y - 30); g.lineTo(x + 210, y + 380); g.lineTo(x - 210, y + 380); g.closePath(); g.fill(); g.restore();
  pline([[x - 120, y - 30], [x - 210, y + 380], [x + 210, y + 380], [x + 120, y - 30]], 6, Tp.graphite, r(0, .3));
  g.setLineDash([16, 10]); pline([[x - 150, y + 120], [x + 150, y + 120]], 8, Tp.graphite, r(.1, .2)); g.setLineDash([]);
  // la tête, la tonsure, les sourcils qui se rejoignent, le nez levé
  const hy = y - 150 + bob;
  dot(x, hy, 102, '#ecd2b4');
  pline(circlePts(x, hy, 105, 7), 6, Tp.graphite, r(0, .3));
  g.strokeStyle = Tp.graphite; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.arc(x, hy, 98, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  pline([[x - 62, hy - 22], [x, hy - 8], [x + 62, hy - 22]], 12, Tp.graphite);
  pline([[x - 48, hy + 10], [x - 18, hy + 8]], 7, Tp.graphite); pline([[x + 18, hy + 8], [x + 48, hy + 10]], 7, Tp.graphite);
  pline([[x + 4, hy + 12], [x + 26, hy + 44], [x + 4, hy + 50]], 5, Tp.graphite);
  g.fillStyle = GRAPH; g.beginPath(); g.ellipse(x, hy + 76, 24, 4 + 18 * tk, 0, 0, 7); g.fill();
  // la plume d'oie, brandie à gauche
  const qx = x - 210, qy = y + 30 - 18 * Math.sin(t * 2.4);
  pline([[x - 110, y + 60], [qx, qy]], 9, Tp.graphite);
  g.save(); g.translate(qx, qy); g.rotate(-.35);
  g.fillStyle = '#fbf7f0'; g.beginPath(); g.ellipse(0, -150, 34, 150, 0, 0, 7); g.fill(); g.restore();
  pline([[qx, qy], [qx - 100, qy - 280]], 5, Tp.graphite);
  for (let k = 1; k < 8; k++) { const u = k / 8, bx = lerp(qx, qx - 100, u), by = lerp(qy, qy - 280, u); pline([[bx, by], [bx + 34, by - 8]], 3, Tp.graphite); pline([[bx, by], [bx - 30, by + 14]], 3, Tp.graphite); }
}
function press(t, Tp) {
  if (t < at(8, 0)) return;
  const x = P.x, y = P.y, r = (a, d) => clamp((t - at(8, 0) - a) / d);
  // la feuille et la grande lettre i
  block(x - 240, y - 120, 480, 520, '#fbf7f0', 1, 3); wobblyRect(x - 240, y - 120, 480, 520, 64, 1, 4, Tp.graphite);
  pline(mPts(x, y + 170, 1.2), 24, Tp.graphite, 1);
  // le trait se ramasse en point
  const m = prog(t, at(8, .42), at(8, .75), 'io'), cx = x + 6, cy = y - 60;
  if (m < 1) pline([[lerp(x - 14, cx, m), lerp(y - 18, cy, m)], [lerp(x + 26, cx, m), lerp(y - 102, cy, m)]], 15, Tp.coral, 1);
  dot(cx, cy, 26 * m, GRAPH);
  // la presse en bois
  for (const sx of [-340, 290]) { block(x + sx, y - 640, 50, 900, '#c9a27a', r(0, .2), 5 + sx); wobblyRect(x + sx, y - 640, 50, 900, 61 + sx, 1, 5, Tp.graphite); }
  block(x - 380, y - 720, 760, 80, '#b88d62', 1, 7); wobblyRect(x - 380, y - 720, 760, 80, 66, 1, 5, Tp.graphite);
  const down = prog(t, at(8, 0), at(8, .3), 'in'), up = prog(t, at(8, .38), at(8, .6), 'out');
  const py = y - 420 + 560 * down - 560 * up;
  pline([[x, y - 640], [x, py - 60]], 16, Tp.graphite);
  pline([[x - 90, y - 560], [x + 90, y - 560]], 12, Tp.graphite);
  block(x - 260, py - 60, 520, 60, '#a8998a', 1, 9); wobblyRect(x - 260, py - 60, 520, 60, 67, 1, 5, Tp.graphite);
  // l'ampoule du Sachoir, en lampe d'atelier
  if (t >= at(8, .55)) { g.save(); g.globalAlpha = ub(t, 8, .55, .75); pline([[x + 200, y - 640], [x + 200, y - 560]], 4, Tp.graphite); bulb(x + 200, y - 500, .6, { ink: GRAPH, fill: YELLOW }); g.restore(); }
}

const cam = camera([
  [0, { x: MIN[2].x, y: F.y - 20, z: 2.0, r: -.1 }],
  [at(0, .55), { x: MIN[12].x, y: F.y, z: 1.6, r: -.05, e: 'lin' }],
  [at(0, 1), { x: F.x, y: F.y + 40, z: .72, r: 0, e: 'out' }],
  [at(1, .02), { x: F.x, y: F.y + 40, z: .72 }],
  [at(1, .25), { x: Q.x, y: Q.y, z: 1.0, e: 'io' }],
  [at(1, 1), { x: Q.x + 20, y: Q.y, z: 1.15, e: 'lin' }],
  [at(2, 0), { x: M.x, y: M.y, z: 1.35, r: .1, e: 'cut' }],
  [at(2, 1), { x: M.x, y: M.y - 30, z: 1.55, r: .14, e: 'lin' }],
  [at(3, 0), { x: I[0].x, y: F.y, z: .9, r: 0, e: 'cut' }],
  [at(3, .35), { x: I[0].x, y: F.y, z: 1.9, e: 'back' }],
  [at(3, 1), { x: I[0].x + 20, y: F.y, z: 2.0, e: 'lin' }],
  [at(4, 0), { x: T.x, y: T.y - 280, z: 1.15, e: 'cut' }],
  [at(4, 1), { x: T.x, y: T.y + 280, z: 1.15, e: 'io' }],
  [at(5, 0), { x: MIN[0].x, y: F.y, z: 2.7, r: .08, e: 'cut' }],
  [at(5, 1), { x: MIN[14].x, y: F.y, z: 2.7, r: .08, e: 'lin' }],
  [at(6, 0), { x: F.x, y: F.y + 30, z: .8, r: -.12, e: 'cut' }],
  [at(6, .5), { x: F.x - 100, y: F.y - 20, z: 1.05, r: 0, e: 'out' }],
  [at(6, 1), { x: F.x, y: F.y + 60, z: .78, r: 0, e: 'io' }],
  [at(7, 0), { x: O.x, y: O.y - 250, z: 1.7, r: .15, e: 'cut' }],
  [at(7, 1), { x: O.x + 10, y: O.y - 280, z: 1.9, r: .1, e: 'lin' }],
  [at(8, 0), { x: P.x, y: P.y - 380, z: 1.2, r: 0, e: 'cut' }],
  [at(8, .35), { x: P.x, y: P.y + 20, z: 1.3, e: 'in' }],
  [at(8, 1), { x: P.x, y: P.y + 40, z: 1.35, e: 'lin' }],
  [at(9, 0), { x: P.x, y: P.y, z: 1.0, e: 'cut' }],
  [at(9, .4), { x: F.x, y: F.y + 40, z: .72, e: 'io' }],
  [at(9, 1) + 4, { x: F.x, y: F.y + 40, z: .68, e: 'lin' }],
]);

export function draw(t) {
  const Tp = pats();
  reset(); g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const wx = whip(t, at(1, .12), .34, 1) + whip(t, at(9, .18), .4, -1);
  const c = cam(t);
  let hx = 0, hy = 0;
  if (t >= at(5, 0) && t < at(6, 0)) [hx, hy] = shake(t, 9, 5, 2);
  else if (t >= at(7, 0) && t < at(8, 0)) [hx, hy] = shake(t, 7, 5, 3);
  else if (t >= at(8, .3) && t < at(8, .42)) [hx, hy] = shake(t, 14, 30, 4);
  look({ ...c, x: c.x - wx / c.z + hx / c.z, y: c.y + hy / c.z }, g, SX, SY);
  g.fillStyle = Tp.grain; g.fillRect(-600, -400, 3600, 4800);
  // les lignes de construction de la page
  g.strokeStyle = 'rgba(168,153,138,.35)'; g.lineWidth = 2; g.setLineDash([10, 14]);
  for (const R of [F, Q, M, T, O, P]) g.strokeRect(R.x - 640, R.y - 460, 1280, 920);
  g.setLineDash([]);
  let front = fence(t, Tp);
  const f1 = why(t, Tp);
  if (t >= at(1, 0) && t < at(2, 0)) front = f1;
  else if (t >= at(2, 0) && t < at(6, 0)) front = null;
  else if (t >= at(7, 0)) front = null;
  mail(t, Tp);
  table(t, Tp);
  odon(t, Tp);
  press(t, Tp);
  if (front) stylus(front[0], front[1]);
  flash(t, at(8, .3), .12, '#fffaf0');

  // ── écran : le texte animé (une animation différente d'un plan à l'autre)
  reset();
  const FT = (s, px, wt = 700, max = 760) => { g.font = `${wt} ${px}px Caveat`; while (g.measureText(s).width > max && px > 40) { px -= 4; g.font = `${wt} ${px}px Caveat`; } return `${wt} ${px}px Caveat`; };
  const card = { color: GRAPH, box: true, boxColor: '#fbf7f0', boxShadow: 'rgba(67,54,46,.25)' };
  if (t >= at(0, .25) && t < at(1, .1)) TXT.slam('« MINIMUM » ?', SX, 1180, t, at(0, .25), { ...card, font: FT('« MINIMUM » ?', 120) });
  if (t >= at(1, .3) && t < at(2, 0)) TXT.type('Pourquoi le i ?', SX, 1180, t, at(1, .3), { ...card, font: FT('Pourquoi le i ?', 110), cps: 18 });
  if (t >= at(2, .15) && t < at(3, 0)) TXT.pop('1000 ans dans ton mail', SX, 560, t, at(2, .15), { ...card, font: FT('1000 ans dans ton mail', 100), rot: -.03 });
  if (t >= at(3, .3) && t < at(4, 0)) TXT.highlight('Pour reconnaître le i', SX, 1180, t, at(3, .3), { color: GRAPH, font: FT('Pour reconnaître le i', 112), mark: 'rgba(245,182,42,.85)' });
  if (t >= at(4, .1) && t < at(5, 0)) TXT.rise('i, n, u, m : des bâtons', SX, 1180, t, at(4, .1), { ...card, font: FT('i, n, u, m : des bâtons', 100), stagger: .1 });
  if (t >= at(5, .3) && t < at(6, 0)) TXT.stamp('ILLISIBLE', SX, 1170, t, at(5, .3), { font: FT('ILLISIBLE', 130, 700, 620), color: '#c0392b', rot: -.08 });
  if (t >= at(6, .2) && t < at(7, 0)) TXT.slam('Un trait sur le i', SX, 1180, t, at(6, .2), { ...card, font: FT('Un trait sur le i', 110) });
  if (t >= at(7, .05) && t < at(8, 0)) {   // la bulle de Frère Odon (le moteur ne met pas de sous-titre sous une bulle)
    const k = ub(t, 7, .05, .18, 'out');
    g.save(); g.translate(SX, 560); g.scale(k, k);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 0, 400, 150, 0, 0, 7); g.fill(); g.strokeStyle = GRAPH; g.lineWidth = 6; g.stroke();
    g.beginPath(); g.moveTo(-40, 140); g.lineTo(-10, 270); g.lineTo(60, 135); g.fill(); g.stroke();
    g.fillStyle = CORAL; g.font = '700 44px Caveat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FRÈRE ODON', 0, -92);
    g.fillStyle = GRAPH; g.font = '700 62px Caveat'; g.fillText('Un trait par i.', 0, -18); g.fillText('Pour les gens qui lisent mal.', 0, 52);
    g.restore();
  }
  if (t >= at(8, .1) && t < at(9, 0)) TXT.count(1000, 1500, SX, 520, t, at(8, .1), at(8, .55) - at(8, .1), { ...card, font: FT('Vers 1500 : un point', 100), fmt: v => `Vers ${Math.round(v)} : un point` });
  if (t >= at(9, .5)) TXT.focus('Aucun doute', SX, 560, t, at(9, .5), { ...card, font: FT('Aucun doute', 120), d: .45 });
}

export function events(add) {
  add('brush', 0, { d: 1.2 }); add('zoom', at(1, .1), { d: .4 }); add('slap', at(1, .5));
  add('slap', at(2, .15)); add('zoom', at(3, 0), { d: .4 }); add('brush', at(4, .1), { d: .9 });
  add('slap', at(5, .3)); add('brush', at(6, .08), { d: .8 }); add('chime', at(6, .6));
  add('slap', at(8, .3)); add('bulb', at(8, .55)); add('zoom', at(9, .1), { d: .8 });
}
