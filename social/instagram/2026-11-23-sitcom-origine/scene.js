// Scène réalisée pour « Pourquoi on dit « quarantaine » ? » — Tablet Sketch (23 novembre 2026).
// Fil visuel : une grande page crème où le stylet écrit le mot « quarantaine » ; la caméra quitte le mot pour un port
// croqué au crayon (un bateau à l'ancre devant une ville), puis une frise de 1377 où des bâtons de prisonnier comptent
// les jours : 30 au crayon, puis 10 de plus au corail (plan signature), avant de revenir au mot du début.
//  0 accroche   très gros plan sur le stylet qui finit d'écrire « quarantaine », recul ; « QUARANT » surligné en jaune
//  1 curiosité  filé latéral vers un « 40 » géant au crayon et un « ? » corail ; poussée lente
//  2 verrou     insert penché vu du dessus : le collègue enrhumé, sa boîte de mouchoirs ; poussée
//  3 POINT      coupe large sur le port, zoom avec rebond : le bateau à l'ancre, la ville interdite
//  4 raison     travelling latéral du bateau vers la ville : une flèche corail, la peste qui suit la mer
//  5 raison     coupe, panoramique vertical de la frise (1377, Raguse) jusqu'aux bâtons : 30 traits au crayon
//  6 signature  très gros plan penché : 10 traits corail s'ajoutent, 30 devient 40, tampon « QUARANTA = 40 »
//  7 réplique   contre-plongée penchée, caméra à l'épaule, sur le pont du bateau ; la bulle du marin
//  8 boucle     longue remontée jusqu'au mot du début, même cadre que la fin du plan 0
import { g, W, H, TL, at, ub, prog, camera, look, reset, shake, whip, TXT, lerp, clamp, hash } from '../kit.js';
import { bulb, YELLOW } from '../core.js';
import { KIT } from '../sketch.js';
const { pline, wobblyRect, circlePts, block, hand, stylus, PAPER, GRAPH, CORAL, pats } = KIT;

const SX = 450, SY = 860;          // le point regardé arrive ici (hors de la zone couverte à droite)
const A = { x: 540, y: 700 };      // le mot
const D = { x: 1700, y: 700 };     // « 40 ? »
const E = { x: 540, y: 3000 };     // le collègue enrhumé
const P = { x: 540, y: 1900 };     // le port
const C = { x: 1700, y: 1900 };    // la frise et les bâtons
const WORD = 'quarantaine', WS = 150;

// ── les dessins (unités de la page)
function word(t, T) {
  const p = t < at(1, 0) ? lerp(.38, 1, prog(t, 0, at(0, .55), 'out')) : 1;
  g.font = `700 ${WS}px Caveat`; const w = g.measureText(WORD).width, wq = g.measureText('quarant').width, x0 = A.x - w / 2;
  block(x0 - 6, A.y + 4, wq + 12, WS * .42, YELLOW, prog(t, at(0, .55), at(0, .85)), 7);
  const h = hand(WORD, A.x, A.y, WS, p, T.graphite);
  pline([[x0, A.y + WS * .55], [x0 + w, A.y + WS * .58]], 6, T.coral, prog(t, at(0, .7), at(0, .95)));
  if (t >= at(8, .5)) hand('= 40 jours', A.x + 40, A.y + 190, 96, prog(t, at(8, .5), at(8, .8)), T.coral);
  return p < 1 ? [h.front, A.y + 10] : null;
}
function forty(t, T) {
  if (t < at(1, 0)) return null;
  wobblyRect(D.x - 420, D.y - 330, 840, 640, 31, prog(t, at(1, 0), at(1, .4)), 5, T.graphite);
  const p = prog(t, at(1, .1), at(1, .55), 'out');
  const h = hand('40', D.x - 60, D.y - 20, 380, p, T.graphite);
  hand('?', D.x + 250, D.y - 40, 300, prog(t, at(1, .55), at(1, .75)), T.coral);
  hand('quoi ?', D.x, D.y + 230, 90, prog(t, at(1, .7), at(1, .95)), T.graphite, 500);
  return p > 0 && p < 1 ? [h.front, D.y] : null;
}
function desk(t, T) {
  if (t < at(2, 0)) return;
  const r = (a, d) => clamp((t - at(2, 0) - a) / d);
  wobblyRect(E.x - 430, E.y - 300, 860, 600, 41, 1, 4, T.graphite);
  // le collègue : tête ronde, nez corail, une écharpe
  const hx = E.x - 150, hy = E.y - 40, sn = Math.sin(t * 9) > .6 ? 8 : 0;
  pline(circlePts(hx, hy - sn, 120, 5), 6, T.graphite, r(0, .3));
  block(hx - 22, hy + 10 - sn, 44, 34, CORAL, r(.2, .2), 3);
  for (const s of [-1, 1]) pline([[hx + s * 50 - 14, hy - 40 - sn], [hx + s * 50 + 14, hy - 34 - sn]], 6, T.graphite, r(.25, .2));
  block(hx - 130, hy + 120, 260, 50, '#9fb6c8', r(.3, .3), 8);
  // la boîte de mouchoirs et les mouchoirs
  wobblyRect(E.x + 20, E.y + 20, 220, 140, 43, r(.35, .3), 5, T.graphite);
  block(E.x + 20, E.y + 20, 220, 140, '#d8b48c', r(.45, .3), 9);
  pline([[E.x + 100, E.y + 20], [E.x + 120, E.y - 60], [E.x + 160, E.y - 20], [E.x + 170, E.y + 20]], 5, T.graphite, r(.5, .3));
  // l'éternuement
  for (let k = 0; k < 4; k++) { const a = -.6 + k * .35; pline([[hx + 140 + Math.cos(a) * 20, hy + Math.sin(a) * 20], [hx + 140 + Math.cos(a) * (70 + sn * 4), hy + Math.sin(a) * (70 + sn * 4)]], 5, T.coral, r(.55 + k * .05, .15)); }
}
function boat(t, T, x, y) {
  const bob = Math.sin(t * 2.1) * 8;
  y += bob;
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#c9a27a';
  g.beginPath(); g.moveTo(x - 170, y - 40); g.lineTo(x + 170, y - 40); g.lineTo(x + 120, y + 30); g.lineTo(x - 130, y + 30); g.closePath(); g.fill(); g.restore();
  pline([[x - 170, y - 40], [x + 170, y - 40], [x + 120, y + 30], [x - 130, y + 30], [x - 170, y - 40]], 6, T.graphite);
  pline([[x, y - 40], [x, y - 300]], 6, T.graphite);
  block(x + 8, y - 290, 150, 190, '#f7f1e6', 1, 12); pline([[x + 6, y - 290], [x + 160, y - 110], [x + 6, y - 100]], 5, T.graphite);
  block(x - 2, y - 330, 70, 36, CORAL, 1, 14);
  for (const dx of [-90, -40, 40]) { pline(circlePts(x + dx, y - 70, 18, dx), 5, T.graphite); pline([[x + dx, y - 52], [x + dx, y - 40]], 5, T.graphite); }
  g.setLineDash([12, 10]); pline([[x - 160, y - 20], [x - 210, y + 150]], 4, T.graphite); g.setLineDash([]);   // la chaîne de l'ancre
  return y;
}
function port(t, T) {
  if (t < at(3, 0)) return;
  const r = prog(t, at(3, 0), at(3, .5));
  // la ville interdite, sur le quai
  wobblyRect(P.x - 470, P.y - 230, 300, 300, 51, r, 5, T.graphite);
  for (let k = 0; k < 3; k++) { const hx = P.x - 450 + k * 95, hy = P.y - 170 + (k % 2) * 30;
    block(hx, hy, 80, 120, ['#e2b8a0', '#d8b48c', '#c8c8b0'][k], r, 20 + k); pline([[hx - 6, hy], [hx + 40, hy - 50], [hx + 86, hy]], 5, T.graphite, r); }
  block(P.x - 470, P.y + 70, 300, 30, '#a8998a', r, 25);
  // la mer
  for (let k = 0; k < 5; k++) { const pts = []; for (let j = 0; j <= 24; j++) { const x = P.x - 160 + j * 26; pts.push([x, P.y + 110 + k * 55 + Math.sin(j * .7 + t * 2 + k) * 8]); } pline(pts, 4, T.graphite, r); }
  const by = boat(t, T, P.x + 190, P.y + 60);
  // la peste suit la mer : une flèche corail du bateau à la ville
  if (t >= at(4, .25) && t < at(5, 0)) {
    const u = ub(t, 4, .25, .7, 'out'), pts = [];
    for (let k = 0; k <= 20; k++) { const v = k / 20; pts.push([lerp(P.x + 60, P.x - 180, v), by - 80 - Math.sin(v * Math.PI) * 120]); }
    pline(pts, 9, T.coral, u);
    for (let k = 0; k < 6; k++) { const v = ((t * .5 + k / 6) % 1) * u; g.fillStyle = GRAPH; g.beginPath(); g.arc(lerp(P.x + 60, P.x - 180, v), by - 80 - Math.sin(v * Math.PI) * 120 + 26, 9, 0, 7); g.fill(); }
  }
  if (t >= at(7, .3) && t < at(8, 0)) { g.save(); g.globalAlpha = ub(t, 7, .3, .5); bulb(P.x + 330, by - 360, .6, { ink: GRAPH, fill: YELLOW }); g.restore(); }   // l'ampoule du Sachoir, en lanterne
}
const TALLY = n => { const gi = Math.floor(n / 5), k = n % 5, row = gi < 4 ? 0 : 1, col = gi % 4, gx = C.x - 400 + col * 220, gy = C.y + 120 + row * 230;
  return k < 4 ? [[gx + k * 36, gy - 80], [gx + k * 36 + 4, gy + 80]] : [[gx - 22, gy + 50], [gx + 132, gy - 50]]; };
function frise(t, T) {
  if (t < at(5, 0)) return null;
  const r = prog(t, at(5, 0), at(5, .35));
  const y = C.y - 190;
  pline([[C.x - 450, y], [C.x + 450, y]], 6, T.graphite, r);
  for (let k = 0; k < 5; k++) pline([[C.x - 400 + k * 200, y - 18], [C.x - 400 + k * 200, y + 18]], 5, T.graphite, r);
  g.fillStyle = CORAL; g.beginPath(); g.arc(C.x - 200, y, 16 * r, 0, 7); g.fill();
  hand('1377', C.x - 200, y - 70, 70, r, T.graphite);
  hand('Raguse', C.x - 200, y + 70, 64, prog(t, at(5, .2), at(5, .45)), T.coral);
  hand('(Dubrovnik)', C.x + 150, y + 70, 50, prog(t, at(5, .35), at(5, .55)), T.graphite, 500);
  const n = t < at(6, 0) ? 30 * prog(t, at(5, .25), at(5, .9)) : 30 + 10 * prog(t, at(6, .08), at(6, .5));
  let front = null;
  for (let k = 0; k < 40 && k < n; k++) { const f = clamp(n - k); pline(TALLY(k), k < 30 ? 7 : 9, k < 30 ? T.graphite : T.coral, f); if (f < 1) { const s = TALLY(k); front = [lerp(s[0][0], s[1][0], f), lerp(s[0][1], s[1][1], f)]; } }
  if (t >= at(6, .5)) pline(circlePts(C.x + 216, C.y + 350, 230, 9), 8, T.coral, prog(t, at(6, .5), at(6, .7)));   // les 10 jours de plus, entourés
  return front;
}

const cam = camera([
  [0, { x: A.x - 120, y: A.y - 10, z: 2.3, r: -.06 }],
  [at(0, .8), { x: A.x, y: A.y + 20, z: 1.05, r: 0, e: 'out' }],
  [at(1, .02), { x: A.x, y: A.y + 20, z: 1.05 }],
  [at(1, .2), { x: D.x, y: D.y + 20, z: 1.08, e: 'io' }],
  [at(1, 1), { x: D.x + 40, y: D.y + 20, z: 1.22, e: 'lin' }],
  [at(2, 0), { x: E.x - 30, y: E.y, z: 1.45, r: .12, e: 'cut' }],
  [at(2, 1), { x: E.x - 20, y: E.y - 10, z: 1.6, r: .16, e: 'lin' }],
  [at(3, 0), { x: P.x, y: P.y, z: .72, r: 0, e: 'cut' }],
  [at(3, .4), { x: P.x, y: P.y, z: 1.12, e: 'back' }],
  [at(3, 1), { x: P.x + 20, y: P.y, z: 1.16, e: 'lin' }],
  [at(4, 0), { x: P.x + 190, y: P.y - 20, z: 1.45, e: 'cut' }],
  [at(4, 1), { x: P.x - 260, y: P.y - 90, z: 1.45, e: 'lin' }],
  [at(5, 0), { x: C.x - 20, y: C.y - 260, z: 1.2, e: 'cut' }],
  [at(5, 1), { x: C.x - 20, y: C.y + 120, z: 1.12, e: 'io' }],
  [at(6, 0), { x: C.x + 180, y: C.y + 280, z: 1.6, r: -.06, e: 'cut' }],
  [at(6, 1), { x: C.x + 190, y: C.y + 290, z: 1.68, r: -.05, e: 'lin' }],
  [at(7, 0), { x: P.x + 200, y: P.y - 60, z: 2.4, r: .14, e: 'cut' }],
  [at(7, 1), { x: P.x + 210, y: P.y - 80, z: 2.55, r: .1, e: 'lin' }],
  [at(8, 0), { x: P.x + 100, y: P.y - 40, z: 1.1, r: 0, e: 'cut' }],
  [at(8, .45), { x: A.x, y: A.y + 20, z: 1.05, e: 'io' }],
  [at(8, 1) + 4, { x: A.x, y: A.y + 20, z: .98, e: 'lin' }],
]);

export function draw(t) {
  const T = pats();
  reset(); g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const wx = whip(t, at(1, .1), .34, 1);
  const c = cam(t);
  let hx = 0, hy = 0;
  if (t >= at(7, 0) && t < at(8, 0)) [hx, hy] = shake(t, 7, 5, 3);
  else if (t >= at(6, .55) && t < at(6, .75)) [hx, hy] = shake(t, 10, 30, 4);
  look({ ...c, x: c.x - wx / c.z + hx / c.z, y: c.y + hy / c.z }, g, SX, SY);
  g.fillStyle = T.grain; g.fillRect(-600, -400, 3200, 4200);
  // les lignes de construction de la page
  g.strokeStyle = 'rgba(168,153,138,.35)'; g.lineWidth = 2; g.setLineDash([10, 14]);
  for (const R of [A, D, E, P, C]) g.strokeRect(R.x - 500, R.y - 420, 1000, 860);
  g.setLineDash([]);
  let front = word(t, T);
  const f1 = forty(t, T); if (t >= at(1, 0) && t < at(2, 0)) front = f1;
  desk(t, T);
  port(t, T);
  const f5 = frise(t, T); if (t >= at(5, 0) && t < at(7, 0)) front = f5;
  if (t >= at(2, 0) && t < at(5, 0)) front = null;
  if (t >= at(7, 0)) front = null;
  if (front) stylus(front[0], front[1]);

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  const F = (s, px, wt = 700, max = 760) => { g.font = `${wt} ${px}px Caveat`; while (g.measureText(s).width > max && px > 40) { px -= 4; g.font = `${wt} ${px}px Caveat`; } return `${wt} ${px}px Caveat`; };
  const card = { color: GRAPH, box: true, boxColor: '#fbf7f0', boxShadow: 'rgba(67,54,46,.25)' };
  if (t >= at(0, .3) && t < at(1, .1)) TXT.slam('« QUARANTAINE » = 40 ?', SX, 1180, t, at(0, .3), { ...card, font: F('« QUARANTAINE » = 40 ?', 104) });
  if (t >= at(1, .3) && t < at(2, 0)) TXT.type('40 quoi ?', SX, 1180, t, at(1, .3), { ...card, font: F('40 quoi ?', 110), cps: 18 });
  if (t >= at(2, .15) && t < at(3, 0)) TXT.pop('Pour le collègue enrhumé', SX, 560, t, at(2, .15), { ...card, font: F('Pour le collègue enrhumé', 96), rot: -.03 });
  if (t >= at(3, .3) && t < at(4, 0)) TXT.highlight('40 jours à l\'écart', SX, 1180, t, at(3, .3), { color: GRAPH, font: F('40 jours à l\'écart', 120), mark: 'rgba(245,182,42,.85)' });
  if (t >= at(4, .2) && t < at(5, 0)) TXT.rise('La peste vient par la mer', SX, 1180, t, at(4, .2), { ...card, font: F('La peste vient par la mer', 96), stagger: .1 });
  if (t >= at(5, .25) && t < at(6, 0)) TXT.count(0, 30, SX, 1180, t, at(5, .25), at(5, .9) - at(5, .25), { ...card, font: F('30 jours d\'abord', 110), fmt: n => `${Math.round(n)} jours d'abord` });
  if (t >= at(6, .55) && t < at(7, 0)) TXT.stamp('QUARANTA = 40', SX, 1170, t, at(6, .55), { font: F('QUARANTA = 40', 120, 700, 640), color: '#c0392b', rot: -.08 });
  if (t >= at(7, .05) && t < at(8, 0)) {   // la bulle du marin (le moteur ne met pas de sous-titre sous une bulle)
    const k = ub(t, 7, .05, .18, 'out');
    g.save(); g.translate(SX, 600); g.scale(k, k);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 0, 400, 150, 0, 0, 7); g.fill(); g.strokeStyle = GRAPH; g.lineWidth = 6; g.stroke();
    g.beginPath(); g.moveTo(60, 140); g.lineTo(120, 260); g.lineTo(150, 130); g.fill(); g.stroke();
    g.fillStyle = CORAL; g.font = '700 44px Caveat'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LE MARIN', 0, -92);
    g.fillStyle = GRAPH; g.font = '700 62px Caveat'; g.fillText('Quarante jours à fixer le port', 0, -18); g.fillText('sans y entrer !', 0, 52);
    g.restore();
  }
  if (t >= at(8, .55)) TXT.focus('40 jours au port', SX, 560, t, at(8, .55), { ...card, font: F('40 jours au port', 110), d: .45 });
}

export function events(add) {
  add('brush', 0, { d: 1.2 }); add('zoom', at(1, .05), { d: .4 }); add('brush', at(1, .1), { d: .8 });
  add('slap', at(2, .15)); add('zoom', at(3, 0), { d: at(3, .4) - at(3, 0) }); add('brush', at(4, .25), { d: .8 });
  add('brush', at(5, .25), { d: B5() }); add('slap', at(6, .55)); add('chime', at(7, .05)); add('bulb', at(7, .3)); add('zoom', at(8, .05), { d: .8 });
}
const B5 = () => at(5, .9) - at(5, .25);
