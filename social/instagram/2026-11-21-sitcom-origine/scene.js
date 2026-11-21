// Scène réalisée pour « Pourquoi « faire grève » vient d'une plage ? » — Tablet Sketch (21 novembre 2026).
// Fil visuel : une seule grande page crème, que la caméra parcourt comme deux doigts sur la tablette ;
// le mot GRÈVE, écrit au crayon, devient la pente de sable de la rive (plan signature).
//  0 question   très gros plan sur le stylet qui croque le métro fermé, puis recul (suivi + recul)
//  1 réponse    filé latéral vers le mot GRÈVE ; son soulignement descend et devient la berge de la Seine (signature)
//  2 la rive    poussée brutale dans une loupe : les grains de sable de la berge
//  3 la Seine   coupe, panoramique vertical de l'eau jusqu'à l'Hôtel de Ville (case 2 redessinée)
//  4 les bras   travelling latéral qui suit une péniche chargée de bois le long du fleuve
//  5 Gustave    contre-plongée penchée sur les journaliers qui attendent (case 3), bulle tapée au crayon
//  6 le sens    plan fixe qui casse le rythme : « FAIRE GRÈVE = » puis le tampon « CHERCHER DU TRAVAIL »
//  7 l'inverse  caméra à l'épaule, recul sur la foule des ouvriers (case 5) : « CHERCHER » barré, « ARRÊTER » claque
//  8 boucle     long retour à la première page : le métro fermé, un petit tas de sable au pied ; même cadre qu'au début
import { g, W, H, TL, B, at, ub, prog, camera, look, reset, shake, whip, TXT, lerp, clamp, hash } from '../kit.js';
import { IMG, bulb } from '../core.js';
import { KIT } from '../sketch.js';
const { pline, wobblyRect, circlePts, block, hand, stylus, sketchOf, PAPER, GRAPH, LIGHT, CORAL, pats } = KIT;

const SX = 450, SY = 860;   // le point du monde que regarde la caméra arrive ici (hors zone Instagram de droite)
const YEL = '#f5b62a';
const src = i => { const b = TL.beats[i]; return b && b.img && IMG[b.img] ? b.img : null; };

// les stations de la page (unités de la page)
const A = { x: 140, y: 550, w: 720, h: 500 };      // le métro fermé (case 1), plans 0 et 8
const D = { x: 2540, y: 550, w: 720, h: 500 };     // la rive et l'Hôtel de Ville (case 2), plan 3
const FJ = { x: 3480, y: 1320, w: 640, h: 460 };   // les journaliers (case 3), plan 5
const Hh = { x: 2250, y: 2160, w: 700, h: 480 };   // les ouvriers rassemblés (case 5), plan 7
const WORD = { x: 1500, y: 640, s: 190 };

// la berge : le soulignement du mot qui plonge vers l'eau
const SLOPE = (() => { const P = []; for (let k = 0; k <= 40; k++) { const u = k / 40; const x = lerp(1230, 2200, u); const y = u < .55 ? 712 + u * 30 : 728 + Math.pow((u - .55) / .45, 1.6) * 360; P.push([x, y + (hash(k * 3.1) - .5) * 4]); } return P; })();
const GRAINS = Array.from({ length: 260 }, (_, k) => { const u = hash(k * 1.7); const x = lerp(1260, 2150, u); const top = u < .55 ? 730 + u * 30 : 745 + Math.pow((u - .55) / .45, 1.6) * 360; return [x, top + hash(k * 4.3) * (1120 - top) * .8, 1.5 + hash(k * 9.1) * 3]; });
const LOUPE = { x: 1700, y: 930, r: 180 };

// un dessin de case : trait crayon en diagonale, puis la couleur décalée dessous ; renvoie la pointe du stylet
function sk(i, R, pl, pc, seed) {
  const s = src(i), P = pats();
  if (pc > 0 && s) {
    const S = sketchOf(s, R.w, R.h); g.save(); g.globalCompositeOperation = 'multiply'; g.beginPath();
    const rows = 7, dn = pc * rows; for (let k = 0; k < rows; k++) { const f = clamp(dn - k); if (f <= 0) break; const ww = R.w * f; g.rect(k % 2 ? R.x + R.w - ww : R.x, R.y + k * R.h / rows, ww, R.h / rows + 1); }
    g.clip(); g.drawImage(S.col, R.x + 10, R.y + 9, R.w, R.h); g.restore();
  }
  if (pl > 0) {
    const L = pl * (R.w + R.h); g.save(); g.beginPath(); g.moveTo(R.x, R.y); g.lineTo(R.x + L, R.y); g.lineTo(R.x, R.y + L); g.closePath(); g.clip();
    if (s) g.drawImage(sketchOf(s, R.w, R.h).line, R.x, R.y, R.w, R.h);
    else for (let k = 0; k < 16; k++) pline([[R.x + k * R.w / 16, R.y + R.h], [R.x + k * R.w / 16 + 70, R.y + R.h * .35]], 3, P.graphite);
    g.restore();
    wobblyRect(R.x, R.y, R.w, R.h, seed, clamp(pl * 1.3), 5, P.graphite);
  }
  if (pl <= 0 || pl >= 1) return null;
  const L = pl * (R.w + R.h) * .5; return [Math.min(R.x + R.w, R.x + L), Math.min(R.y + R.h, R.y + L)];
}

function boat(x, y, p, seed) {
  const P = pats();
  block(x - 120, y - 34, 240, 34, '#d8b48c', p, seed);
  pline([[x - 140, y - 36], [x + 140, y - 36], [x + 100, y + 4], [x - 110, y + 4], [x - 140, y - 36]], 5, P.graphite, p);
  for (let k = 0; k < 5; k++) { const lx = x - 80 + k * 38, ly = y - 52 - (k % 2) * 16; if (p > .5) { g.strokeStyle = P.graphite; g.lineWidth = 4; g.beginPath(); g.arc(lx, ly, 15, 0, 7); g.stroke(); } }
}
function worker(x, y, s, t, seed) {   // un journalier au crayon (silhouette simple)
  const P = pats(), bob = Math.sin(t * 6 + seed) * 4;
  g.strokeStyle = P.graphite; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 92 * s + bob, 16 * s, 0, 7); g.stroke();
  pline([[x, y - 74 * s + bob], [x, y - 30 * s], [x - 16 * s, y], [x, y - 30 * s], [x + 16 * s, y]], 5, P.graphite);
  pline([[x, y - 60 * s + bob], [x + 26 * s, y - 78 * s + bob]], 5, P.graphite);
  block(x - 50 * s, y - 104 * s + bob, 70 * s, 18 * s, '#d8b48c', 1, seed);   // la bûche sur l'épaule
}

const cam = camera([
  [0, { x: 420, y: 730, z: 2.3, r: -.05 }],
  [at(0, .8), { x: 500, y: 800, z: 1.12, r: 0, e: 'out' }],
  [at(1, 0), { x: 520, y: 800, z: 1.08 }],
  [at(1, .14), { x: 1500, y: 800, z: 1.0, r: .02 }],
  [at(1, .98), { x: 1580, y: 830, z: 1.18, r: .02, e: 'lin' }],
  [at(2, .1), { x: 1700, y: 880, z: 1.25 }],
  [at(2, .4), { x: 1700, y: 880, z: 1.7, e: 'back' }],
  [at(2, .98), { x: 1715, y: 885, z: 1.78, e: 'lin' }],
  [at(3, 0), { x: 2900, y: 1080, z: 1.15, r: 0, e: 'cut' }],
  [at(3, .98), { x: 2900, y: 770, z: 1.05 }],
  [at(4, 0), { x: 1250, y: 1400, z: 1.3, e: 'cut' }],
  [at(4, .98), { x: 3000, y: 1400, z: 1.3, e: 'lin' }],
  [at(5, 0), { x: 3800, y: 1480, z: 1.42, r: .08, e: 'cut' }],
  [at(5, .98), { x: 3800, y: 1470, z: 1.6, r: .06, e: 'lin' }],
  [at(6, 0), { x: 3800, y: 2350, z: 1.1, r: 0, e: 'cut' }],
  [at(6, .98), { x: 3800, y: 2350, z: 1.12, e: 'lin' }],
  [at(7, 0), { x: 2600, y: 2330, z: 1.42, r: -.02, e: 'cut' }],
  [at(7, .98), { x: 2600, y: 2330, z: 1.0, r: -.05, e: 'out' }],
  [at(8, .05), { x: 2600, y: 2330, z: 1.0, r: -.05 }],
  [at(8, .55), { x: 500, y: 800, z: 1.12, r: 0 }],
  [at(8, 1) + 4, { x: 500, y: 800, z: 1.04, r: 0, e: 'lin' }],
]);

export function draw(t) {
  const P = pats();
  reset(); g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  let c = cam(t);
  const wx = whip(t, at(1, .07), .32, 1);
  let [hx, hy] = [0, 0];
  if (t >= at(7, 0) && t < at(8, 0)) [hx, hy] = shake(t, 10, 6, 3);
  look({ ...c, x: c.x - wx / c.z + hx / c.z, y: c.y + hy / c.z }, g, SX, SY);
  g.fillStyle = P.grain; g.fillRect(-600, -400, 5400, 3600);
  // traits de construction laissés sur la page
  g.strokeStyle = 'rgba(168,153,138,.35)'; g.lineWidth = 2; g.setLineDash([10, 14]);
  for (const R of [A, D, FJ, Hh]) g.strokeRect(R.x - 40, R.y - 40, R.w + 80, R.h + 80);
  g.setLineDash([]);
  let front = null;

  // 0 · le métro fermé, croqué pendant la question (déjà à moitié tracé à l'image 1)
  const fa = sk(0, A, t < at(1, 0) ? lerp(.3, 1, prog(t, 0, at(0, .75), 'out')) : 1, prog(t, at(0, .35), at(0, 1)), 11);
  if (t < at(1, 0)) front = fa;

  // 1 · le mot GRÈVE, et son soulignement qui devient la berge (plan signature)
  if (t >= at(1, 0)) {
    const h = hand('GRÈVE', WORD.x, WORD.y, WORD.s, ub(t, 1, .08, .5), P.graphite, 700);
    block(h.x0 + 10, WORD.y + 10, h.w * .8, 60, YEL, ub(t, 1, .4, .7), 5);
    pline(SLOPE, 9, P.graphite, ub(t, 1, .45, .95, 'io'));
    if (t < at(1, .5)) front = [h.front, WORD.y + 30];
    else if (t < at(1, .95)) { const k = Math.floor(ub(t, 1, .45, .95, 'io') * (SLOPE.length - 1)); front = SLOPE[k]; }
    const wp = ub(t, 1, .7, 1) + ub(t, 2, 0, .4);
    for (let k = 0; k < 9; k++) { const y = 1010 + k * 26, x0 = 1900 + k * 14; pline([[x0, y], [x0 + 80, y - 6], [x0 + 160, y], [x0 + 240, y - 6], [x0 + 320, y]], 4, P.coral, clamp(wp * 1.4 - k * .08)); }
  }
  // 2 · les grains de sable, puis la loupe
  if (t >= at(1, .6)) {
    const n = Math.floor(GRAINS.length * clamp(ub(t, 1, .6, 1) * .4 + ub(t, 2, 0, .4)));
    g.fillStyle = P.graphite; for (let k = 0; k < n; k++) { const [x, y, r] = GRAINS[k]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  }
  if (t >= at(2, .1)) {
    const lp = ub(t, 2, .1, .45, 'out');
    g.save(); g.beginPath(); g.arc(LOUPE.x, LOUPE.y, LOUPE.r * lp, 0, 7); g.clip();
    g.fillStyle = '#fbf6ee'; g.fillRect(LOUPE.x - LOUPE.r, LOUPE.y - LOUPE.r, 2 * LOUPE.r, 2 * LOUPE.r);
    for (let k = 0; k < 46; k++) { const a = hash(k * 2.3) * 6.28, d = Math.sqrt(hash(k * 5.9)) * LOUPE.r, r = 10 + hash(k * 7.7) * 16, x = LOUPE.x + Math.cos(a) * d, y = LOUPE.y + Math.sin(a) * d;
      g.fillStyle = k % 3 ? '#e2c79b' : '#cfae7e'; g.beginPath(); g.ellipse(x, y, r, r * .8, a, 0, 7); g.fill(); g.strokeStyle = P.graphite; g.lineWidth = 3; g.stroke(); }
    g.restore();
    pline(circlePts(LOUPE.x, LOUPE.y, LOUPE.r, 31), 7, P.graphite, lp);
    pline([[LOUPE.x + LOUPE.r * .72, LOUPE.y + LOUPE.r * .72], [LOUPE.x + LOUPE.r * 1.2, LOUPE.y + LOUPE.r * 1.2]], 22, P.graphite, ub(t, 2, .3, .5));
  }
  // 3 · la Seine sous la place de Grève, puis l'Hôtel de Ville
  if (t >= at(3, 0)) {
    for (let k = 0; k < 7; k++) { const y = 1110 + k * 30; pline([[2420, y], [2600, y - 8], [2780, y], [2960, y - 8], [3140, y], [3320, y - 8]], 4, P.coral, clamp(ub(t, 3, 0, .4) * 1.5 - k * .07)); }
    const fd = sk(3, D, lerp(.25, 1, ub(t, 3, 0, .6, 'out')), ub(t, 3, .3, .9), 23);
    if (t < at(4, 0)) front = fd;
  }
  // 4 · le fleuve, la péniche chargée de bois, les bras sur la berge
  if (t >= at(4, 0)) {
    const rp = ub(t, 4, 0, .3);
    pline([[900, 1450], [1400, 1440], [1900, 1452], [2400, 1440], [2900, 1450], [3400, 1442]], 7, P.graphite, rp);
    for (let k = 0; k < 5; k++) pline([[960 + k * 90, 1490 + k * 26], [3300 - k * 70, 1490 + k * 26]], 3, P.coral, clamp(rp * 1.3 - k * .1));
    boat(lerp(1350, 3150, ub(t, 4, 0, 1, 'lin')), 1462, 1, 41);
    boat(2200, 1466, rp, 42);
    if (t >= at(4, .3)) for (let k = 0; k < 4; k++) worker(2350 + k * 120, 1420, 1, t, k);
  }
  // 5 · les journaliers qui attendent l'embauche
  if (t >= at(5, 0)) { const ff = sk(5, FJ, lerp(.25, 1, ub(t, 5, 0, .5, 'out')), ub(t, 5, .25, .8), 37); if (t < at(6, 0)) front = ff; }
  // 6 · l'équation écrite à la main
  if (t >= at(6, 0)) { const h = hand('FAIRE GRÈVE =', 3800, 2230, 130, ub(t, 6, 0, .35), P.graphite, 700); if (t < at(6, .35)) front = [h.front, 2250]; }
  // 7 · les ouvriers rassemblés pour arrêter le travail
  if (t >= at(7, 0)) { const fh = sk(7, Hh, lerp(.25, 1, ub(t, 7, 0, .45, 'out')), ub(t, 7, .2, .7), 53); if (t < at(8, 0)) front = fh;
    if (t >= at(7, .5)) { g.save(); g.globalAlpha = ub(t, 7, .5, .7); bulb(Hh.x + Hh.w - 30, Hh.y + 40, .6, { ink: GRAPH, fill: 'rgba(0,0,0,0)' }); g.restore(); } }
  // 8 · un petit tas de sable au pied du métro fermé
  if (t >= at(8, .35)) { const sp = ub(t, 8, .35, .8, 'out'); g.fillStyle = '#d8b48c'; g.beginPath(); g.ellipse(560, 1070, 150 * sp, 34 * sp, 0, Math.PI, 0); g.fill(); g.fillStyle = P.graphite; for (let k = 0; k < 40 * sp; k++) { g.beginPath(); g.arc(430 + hash(k * 3.3) * 260, 1060 - hash(k * 6.1) * 26, 2.5, 0, 7); g.fill(); } }

  if (front) stylus(front[0], front[1]);

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  // chaque carton tient dans la zone utile (x 60 à 840) : la police se réduit si besoin
  const F = (s, px, max = 760) => { g.font = `700 ${px}px Caveat`; while (g.measureText(s).width > max && px > 40) { px -= 4; g.font = `700 ${px}px Caveat`; } return `700 ${px}px Caveat`; };
  const ink = { font: '700 96px Caveat', color: GRAPH };
  if (t < at(1, .1)) { g.save(); g.globalAlpha = 1 - ub(t, 1, 0, .1); g.translate(SX, 1190); g.rotate(-.03); hand('« GRÈVE » ?', 0, 0, 120, prog(t, at(0, .2), at(0, .7)), P.coral, 700); g.restore(); }
  if (t >= at(1, .3) && t < at(2, 0)) TXT.slam('PLACE DE GRÈVE', SX, 520, t, at(1, .3), { ...ink, font: F('PLACE DE GRÈVE', 96), box: true, boxColor: '#fbf6ee' });
  if (t >= at(2, .45) && t < at(3, 0)) TXT.highlight('rive de sable = plage', SX, 540, t, at(2, .45), { ...ink, font: F('rive de sable = plage', 88), mark: 'rgba(245,182,42,.8)' });
  if (t >= at(3, .45) && t < at(4, 0)) TXT.rise("devant l'Hôtel de Ville", SX, 560, t, at(3, .45), { ...ink, font: F("devant l'Hôtel de Ville", 84), stagger: .1 });
  if (t >= at(4, .4) && t < at(5, 0)) TXT.pop('IL FAUT DES BRAS', SX, 600, t, at(4, .4), { ...ink, font: F('IL FAUT DES BRAS', 100), box: true, boxColor: YEL, rot: -.03 });
  if (t >= at(5, .08) && t < at(6, 0)) {   // la bulle de Gustave, tapée au crayon
    const k = ub(t, 5, .08, .2, 'out'); g.save(); g.translate(SX, 560); g.scale(k, k);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 0, 400, 120, 0, 0, 7); g.fill(); g.strokeStyle = GRAPH; g.lineWidth = 5; g.stroke();
    g.beginPath(); g.moveTo(-60, 108); g.lineTo(-20, 190); g.lineTo(20, 114); g.fillStyle = '#fffaf0'; g.fill(); g.stroke();
    g.restore();
    if (k > .95) {
      g.font = '700 38px Caveat'; g.fillStyle = CORAL; g.textAlign = 'center'; g.fillText('GUSTAVE, JOURNALIER', SX, 470);
      const L1 = 'Chaque matin, on attendait là', L2 = "qu'un patron nous embauche !", t1 = at(5, .2), t2 = t1 + L1.length / 26;
      TXT.type(L1, SX, 540, t, t1, { font: '700 54px Caveat', color: GRAPH, cps: 26 });
      TXT.type(L2, SX, 605, t, t2, { font: '700 54px Caveat', color: GRAPH, cps: 26 });
    }
  }
  if (t >= at(6, .4) && t < at(7, 0)) TXT.stamp('CHERCHER DU TRAVAIL', SX, 960, t, at(6, .4), { font: F('CHERCHER DU TRAVAIL', 82, 660), color: CORAL, rot: -.06 });
  if (t >= at(7, 0) && t < at(8, 0)) {
    TXT.pop('chercher', SX, 540, t, at(7, .02), { font: '700 90px Caveat', color: GRAPH });
    g.font = '700 90px Caveat'; const cw = g.measureText('chercher').width;
    TXT.strike(SX - cw / 2 - 20, 545, SX + cw / 2 + 20, 530, t, at(7, .4), { color: CORAL, w: 12 });
    if (t >= at(7, .5)) TXT.slam('ARRÊTER LE TRAVAIL', SX, 650, t, at(7, .5), { font: F('ARRÊTER LE TRAVAIL', 92), color: CORAL, box: true, boxColor: '#fbf6ee' });
  }
  if (t >= at(8, .55)) TXT.focus('une plage parisienne', SX, 1190, t, at(8, .55), { font: F('une plage parisienne', 100), color: GRAPH, d: .45, box: true, boxColor: 'rgba(251,246,238,.9)' });
  // léger assombrissement des coins (la vitre de la tablette)
  const v = g.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1250); v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(60,40,20,.18)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}

export function events(add) {
  add('scribble', 0, { d: 1.2 }); add('scribble', at(1, .1), { d: 1.0 }); add('slap', at(1, .3));
  add('zoom', at(2, .1), { d: .5 }); add('scribble', at(3, 0), { d: .8 }); add('scribble', at(5, .05), { d: .7 });
  add('slap', at(6, .4)); add('cross', at(7, .4)); add('slap', at(7, .5)); add('zoom', at(8, .05), { d: .8 });
}
