// Scène réalisée pour « Pourquoi le stéthoscope a-t-il été inventé ? » — Tablet Sketch (22 novembre 2026).
// Fil visuel : un carnet de médecin crème, en colonne, que la caméra descend ; un cœur au crayon qui bat en haut de la
// page, et en bas une feuille du carnet qui s'enroule pour devenir le premier stéthoscope (plan signature).
//  0 accroche   le cœur corail bat déjà, le stylet finit le stéthoscope ; poussée tournante depuis un cadre large
//  1 curiosité  travelling latéral vers la case 1 redessinée (1816, Laennec hésite)
//  2 verrou     insert penché sur une porte « Cabinet médical » croquée, poussée lente
//  3 POINT      coupe, zoom brutal avec rebond sur le visage de Laennec qui rougit
//  4 raison     panoramique vertical sur la case 2 (l'oreille collée) jusqu'à la frise 1816
//  5 raison     plan fixe en très gros plan : il détourne les yeux, gouttes de sueur ; tampon
//  6 signature  la feuille du carnet s'enroule en tube, pivote et se pose entre la poitrine et l'oreille
//  7 réplique   contre-plongée penchée, caméra à l'épaule, sur la case 6 (la surprise) ; bulle tapée
//  8 exemple    recul : à l'oreille, les ondes s'éparpillent ; dans le tube, elles filent droit
//  9 boucle     longue remontée jusqu'au cœur du début, même cadre que le plan 0
import { g, W, H, TL, at, ub, prog, camera, look, reset, shake, TXT, lerp, clamp, hash } from '../kit.js';
import { IMG, bulb, YELLOW } from '../core.js';
import { KIT } from '../sketch.js';
const { pline, wobblyRect, circlePts, block, hand, stylus, sketchOf, PAPER, GRAPH, LIGHT, CORAL, pats } = KIT;

const SX = 450, SY = 860;
const src = i => { const b = TL.beats[i]; return b && b.img && IMG[b.img] ? b.img : null; };
const HEART = { x: 480, y: 760 };
const R1 = { x: 950, y: 520, w: 720, h: 500 };     // case 1 (plan 1)
const DOOR = { x: 2100, y: 760 };                   // la porte du cabinet (plan 2)
const FACE = { x: 520, y: 1640 };                   // Laennec (plans 3 et 5)
const R4 = { x: 1050, y: 1350, w: 720, h: 500 };    // case 2 (plan 4)
const FRISE = 1960;
const R7 = { x: 1300, y: 2250, w: 700, h: 480 };    // case 6 (plan 7)

const HP = (() => { const P = []; for (let k = 0; k <= 80; k++) { const a = Math.PI + k / 80 * Math.PI * 2; P.push([16 * Math.pow(Math.sin(a), 3), -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]); } return P; })();
const beat = t => Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.4)), 6);

function heart(x, y, s, p, t) {
  if (p <= 0) return null;
  const P = pats(), k = s * (1 + .07 * beat(t)), pts = HP.map(([a, b]) => [x + a * k, y + b * k]);
  g.save(); g.globalAlpha = clamp(p * 1.4 - .3); g.globalCompositeOperation = 'multiply'; g.fillStyle = CORAL;
  g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a + 10, b + 9) : g.moveTo(a + 10, b + 9)); g.closePath(); g.fill(); g.restore();
  pline(pts, 7, P.graphite, p);
  if (p >= 1) return null;
  const n = Math.min(pts.length - 1, Math.floor(p * pts.length)); return pts[n];
}
function stetho(x, y, p) {
  if (p <= 0) return;
  const P = pats(), cp = [x + 90, y + 110], fork = [x, y - 230];
  const tube = []; for (let k = 0; k <= 24; k++) { const u = k / 24; tube.push([lerp(cp[0], fork[0], u) + Math.sin(u * Math.PI) * 150, lerp(cp[1], fork[1], u)]); }
  pline(tube, 10, P.graphite, clamp(p * 1.6));
  const q = clamp(p * 1.6 - .6);
  pline([fork, [x - 70, y - 270], [x - 80, y - 300]], 9, P.graphite, q);
  pline([fork, [x + 70, y - 270], [x + 80, y - 300]], 9, P.graphite, q);
  if (q > .9) { g.fillStyle = GRAPH; for (const ex of [-80, 80]) { g.beginPath(); g.arc(x + ex, y - 304, 12, 0, 7); g.fill(); } }
  g.fillStyle = '#e4e0da'; g.beginPath(); g.arc(cp[0], cp[1], 46, 0, 7); g.fill();
  pline(circlePts(cp[0], cp[1], 46, 5), 7, P.graphite, clamp(p * 2));
}
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
function door(x, y, t) {
  const P = pats();
  block(x - 300, y - 420, 600, 840, '#d8b48c', 1, 71); wobblyRect(x - 300, y - 420, 600, 840, 72, 1, 6, P.graphite);
  for (const [dy, h] of [[-380, 300], [-40, 420]]) wobblyRect(x - 240, y + dy, 480, h, 74 + dy, 1, 3, P.graphite);
  g.fillStyle = '#fbf6ee'; g.fillRect(x - 210, y - 300, 420, 140); wobblyRect(x - 210, y - 300, 420, 140, 73, 1, 4, P.graphite);
  hand('Cabinet médical', x, y - 230, 62, t >= at(2, 0) ? ub(t, 2, .05, .5) : 0, P.graphite, 700);
  g.fillStyle = GRAPH; g.beginPath(); g.arc(x + 220, y + 60, 20, 0, 7); g.fill();
}
function face(x, y, s, t, o) {
  const P = pats();
  g.save(); g.translate(x, y); g.scale(s, s);
  block(-150, 150, 300, 120, '#8fa0bf', 1, 3);
  pline([[-160, 270], [-120, 150], [120, 150], [160, 270]], 5, P.graphite);
  g.fillStyle = '#fbf6ee'; g.beginPath(); g.moveTo(0, 135); g.lineTo(-55, 105); g.lineTo(-55, 165); g.closePath(); g.moveTo(0, 135); g.lineTo(55, 105); g.lineTo(55, 165); g.closePath(); g.fill();
  pline([[0, 135], [-55, 105], [-55, 165], [0, 135], [55, 105], [55, 165], [0, 135]], 4, P.graphite);
  g.fillStyle = '#fbf0e2'; g.beginPath(); g.arc(0, 0, 110, 0, 7); g.fill();
  pline(circlePts(0, 0, 110, 9), 6, P.graphite);
  pline([[-106, -26], [-84, -92], [-24, -120], [40, -114], [94, -64], [108, -22]], 10, P.graphite);
  for (let k = 0; k < 5; k++) pline(circlePts(-70 + k * 36, -100 + Math.abs(k - 2) * 6, 16, k * 3, -3, .7), 5, P.graphite);
  const lk = o.away ? 26 : 0;
  for (const ex of [-40, 40]) { g.fillStyle = GRAPH; g.beginPath(); g.arc(ex + lk, -10 + (o.away ? 8 : 0), 9, 0, 7); g.fill(); pline([[ex - 22, -42 + (o.away ? -8 : 0)], [ex + 22, -36]], 4, P.graphite); }
  pline([[0, -4], [-10, 30], [6, 34]], 4, P.graphite);
  pline([[-30, 62], [-10, 56], [10, 64], [30, 58]], 4, P.graphite);
  g.save(); g.globalAlpha = o.blush; block(-90, 18, 52, 28, CORAL, 1, 5); block(38, 18, 52, 28, CORAL, 1, 6); g.restore();
  if (o.sweat) for (let k = 0; k < 3; k++) {
    const dy = ((t * 110 + k * 45) % 140), dx = 112 + k * 18;
    g.fillStyle = '#a9c6d8'; g.beginPath(); g.ellipse(dx, -70 + dy, 9, 14, 0, 0, 7); g.fill(); g.strokeStyle = GRAPH; g.lineWidth = 3; g.stroke();
  }
  g.restore();
}
function torso(x, y, p) {
  const P = pats();
  pline([[x, y - 180], [x + 70, y - 120], [x + 100, y], [x + 70, y + 120], [x, y + 180]], 6, P.graphite, p);
  if (p > .6) { g.save(); g.globalAlpha = clamp(p * 2 - 1.2); g.globalCompositeOperation = 'multiply'; g.fillStyle = CORAL; g.beginPath(); HP.forEach(([a, b], i) => i ? g.lineTo(x + 40 + a * 2.6, y + b * 2.6) : g.moveTo(x + 40 + a * 2.6, y + b * 2.6)); g.closePath(); g.fill(); g.restore(); }
}
function ear(x, y, p) {
  const P = pats(), E = []; for (let k = 0; k <= 30; k++) { const a = -2.2 + k / 30 * 4.4; E.push([x + 30 + Math.cos(a) * 60, y + Math.sin(a) * 90]); }
  pline(E, 6, P.graphite, p); pline(circlePts(x + 34, y + 6, 18, 41, -2, .6), 4, P.graphite, p);
}
function roll(t) {   // plan 6 : la feuille du carnet devient un tube
  const P = pats(), r = ub(t, 6, .05, .55, 'io'), m = ub(t, 6, .55, .85, 'io');
  const L = lerp(640, 470, r), flat = 430 * (1 - r), cx = lerp(600, 665, m), cy = lerp(2550, 2600, m);
  g.save(); g.translate(cx, cy); g.rotate(lerp(0, -Math.PI / 2, m));
  const x0 = -(flat + 90) / 2;
  if (flat > 1) {
    g.fillStyle = '#fbf6ee'; g.fillRect(x0, -L / 2, flat, L); wobblyRect(x0, -L / 2, flat, L, 61, 1, 4, P.graphite);
    for (let k = 1; k < 12; k++) pline([[x0 + 16, -L / 2 + k * L / 12], [x0 + Math.max(20, flat - 6), -L / 2 + k * L / 12]], 2, P.coral);
  }
  const rx = x0 + flat; block(rx, -L / 2, 90, L, '#e9dcc8', 1, 7); wobblyRect(rx, -L / 2, 90, L, 62, 1, 5, P.graphite);
  for (let k = 1; k < 4; k++) pline([[rx + k * 22, -L / 2 + 6], [rx + k * 22, L / 2 - 6]], 2, P.graphite);
  g.restore();
  const q = ub(t, 6, .6, .9);
  if (q > 0) { torso(330, 2600, q); ear(900, 2600, q); }
}
function compare(t) {   // plan 8 : à l'oreille, les ondes s'éparpillent ; dans le tube, elles filent droit
  if (t < at(8, 0)) return;
  const P = pats(), a = ub(t, 8, 0, .3), lt = t - at(8, 0);
  torso(220, 3100, a); ear(700, 3100, a);
  for (let k = 0; k < 6; k++) {
    const r = (lt * 260 + k * 60) % 360; const A = []; for (let j = 0; j <= 24; j++) { const an = -.8 + j / 24 * 1.6; A.push([320 + Math.cos(an) * r, 3100 + Math.sin(an) * r]); }
    g.save(); g.globalAlpha = (1 - r / 360) * a; pline(A, 4, P.coral); g.restore();
  }
  hand('oreille seule', 480, 3300, 54, a, P.graphite, 700);
  torso(220, 3500, a); ear(700, 3500, a);
  block(330, 3455, 360, 90, '#e9dcc8', a, 9); wobblyRect(330, 3455, 360, 90, 63, a, 5, P.graphite);
  for (let k = 0; k < 5; k++) { const x = 340 + (lt * 300 + k * 70) % 340; g.save(); g.globalAlpha = a; pline([[x, 3470], [x, 3530]], 5, P.coral); g.restore(); }
  hand('avec le tube', 480, 3640, 54, a, P.graphite, 700);
  if (t >= at(8, .6)) { g.save(); g.globalAlpha = ub(t, 8, .6, .75); bulb(860, 3500, .6, { ink: GRAPH, fill: 'rgba(0,0,0,0)' }); g.restore(); }
}

const cam = camera([
  [0, { x: 500, y: 800, z: .85, r: .15 }],
  [at(0, .95), { x: 480, y: 770, z: 1.3, r: 0, e: 'io' }],
  [at(1, 0), { x: 480, y: 770, z: 1.3 }],
  [at(1, .35), { x: 1310, y: 800, z: 1.1, e: 'io' }],
  [at(1, 1), { x: 1340, y: 790, z: 1.16, e: 'lin' }],
  [at(2, 0), { x: 2100, y: 760, z: 1.8, r: -.1, e: 'cut' }],
  [at(2, 1), { x: 2120, y: 740, z: 2.0, r: -.13, e: 'lin' }],
  [at(3, 0), { x: 520, y: 1600, z: .7, r: 0, e: 'cut' }],
  [at(3, .3), { x: 520, y: 1620, z: 1.5, e: 'back' }],
  [at(3, 1), { x: 520, y: 1620, z: 1.55, e: 'lin' }],
  [at(4, 0), { x: 1410, y: 1500, z: 1.1, e: 'cut' }],
  [at(4, 1), { x: 1410, y: 1800, z: 1.1, e: 'io' }],
  [at(5, 0), { x: 520, y: 1640, z: 2.4, r: .06, e: 'cut' }],
  [at(5, 1), { x: 520, y: 1640, z: 2.45, r: .06, e: 'lin' }],
  [at(6, 0), { x: 600, y: 2550, z: 1.2, r: 0, e: 'cut' }],
  [at(6, .5), { x: 600, y: 2550, z: 1.25 }],
  [at(6, 1), { x: 640, y: 2600, z: 1.0, r: -.04, e: 'io' }],
  [at(7, 0), { x: 1650, y: 2440, z: 1.45, r: .08, e: 'cut' }],
  [at(7, 1), { x: 1650, y: 2430, z: 1.6, r: .07, e: 'lin' }],
  [at(8, 0), { x: 480, y: 3300, z: 2.0, r: 0, e: 'cut' }],
  [at(8, .6), { x: 480, y: 3300, z: 1.0, e: 'out' }],
  [at(8, 1), { x: 480, y: 3300, z: .98, e: 'lin' }],
  [at(9, .05), { x: 480, y: 3300, z: .98 }],
  [at(9, .5), { x: 480, y: 770, z: 1.3, e: 'io' }],
  [at(9, 1) + 4, { x: 480, y: 770, z: 1.22, e: 'lin' }],
]);

export function draw(t) {
  const P = pats();
  reset(); g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const c = cam(t);
  let hx = 0, hy = 0;
  if (t >= at(7, 0) && t < at(8, 0)) [hx, hy] = shake(t, 7, 4, 8);
  look({ ...c, x: c.x + hx / c.z, y: c.y + hy / c.z }, g, SX, SY);
  g.fillStyle = P.grain; g.fillRect(-600, -200, 3600, 4400);
  g.strokeStyle = 'rgba(168,153,138,.35)'; g.lineWidth = 2; g.setLineDash([10, 14]);
  for (const R of [R1, R4, R7]) g.strokeRect(R.x - 40, R.y - 40, R.w + 80, R.h + 80);
  g.beginPath(); g.moveTo(-200, 1240); g.lineTo(2600, 1240); g.moveTo(-200, 2160); g.lineTo(2600, 2160); g.moveTo(-200, 2900); g.lineTo(2600, 2900); g.stroke();
  g.setLineDash([]);
  let front = null;

  // 0 · le cœur qui bat et le stéthoscope (déjà à moitié tracés à l'image 1)
  const hp = lerp(.45, 1, prog(t, 0, at(0, .55), 'out'));
  const hf = heart(HEART.x, HEART.y, 13, hp, t); if (t < at(1, 0) && hf) front = hf;
  stetho(HEART.x, HEART.y, prog(t, at(0, .25), at(0, .95)));
  if (t < at(1, 0) && !hf && t < at(0, .95)) front = [HEART.x + 90, HEART.y + 110];
  // 1 · la case 1 (1816)
  if (t >= at(1, 0)) { const f = sk(1, R1, lerp(.2, 1, ub(t, 1, 0, .6, 'out')), ub(t, 1, .3, .9), 11); if (t < at(2, 0)) front = f; }
  // 2 · la porte du cabinet
  door(DOOR.x, DOOR.y, t);
  // 3 et 5 · Laennec qui rougit
  if (t >= at(3, 0)) face(FACE.x, FACE.y, 1, t, { blush: t >= at(5, 0) ? 1 : ub(t, 3, .35, .8), away: t >= at(5, 0), sweat: t >= at(5, .15) && t < at(6, 0) });
  // 4 · la case 2 et la frise
  if (t >= at(4, 0)) {
    const f = sk(4, R4, lerp(.2, 1, ub(t, 4, 0, .5, 'out')), ub(t, 4, .25, .8), 23); if (t < at(5, 0)) front = f;
    pline([[R4.x, FRISE], [R4.x + R4.w, FRISE]], 6, P.graphite, ub(t, 4, .4, .7));
    for (let k = 0; k < 5; k++) pline([[R4.x + 60 + k * 150, FRISE - 18], [R4.x + 60 + k * 150, FRISE + 18]], 5, P.graphite, ub(t, 4, .5 + k * .05, .6 + k * .05));
    if (t >= at(4, .6)) { g.fillStyle = CORAL; g.beginPath(); g.arc(R4.x + 510, FRISE, 16, 0, 7); g.fill(); }
  }
  // 6 · la feuille qui s'enroule (plan signature)
  if (t >= at(6, 0)) roll(t);
  // 7 · la case 6 (la surprise)
  if (t >= at(7, 0)) { const f = sk(7, R7, lerp(.3, 1, ub(t, 7, 0, .45, 'out')), ub(t, 7, .2, .7), 37); if (t < at(8, 0)) front = f; }
  // 8 · la comparaison
  compare(t);

  if (front) stylus(front[0], front[1]);

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  const F = (s, px, max = 740) => { g.font = `700 ${px}px Caveat`; while (g.measureText(s).width > max && px > 40) { px -= 4; g.font = `700 ${px}px Caveat`; } return `700 ${px}px Caveat`; };
  const card = { box: true, boxColor: '#fbf6ee', color: GRAPH };
  if (t >= at(0, .3) && t < at(1, .1)) TXT.pop('STÉTHOSCOPE', SX, 1200, t, at(0, .3), { ...card, font: F('STÉTHOSCOPE', 110), rot: -.03 });
  if (t >= at(1, .3) && t < at(2, 0)) TXT.type('un docteur trop timide', SX, 1200, t, at(1, .3), { ...card, font: F('un docteur trop timide', 92), cps: 30 });
  if (t >= at(2, .15) && t < at(3, 0)) TXT.rise('chez ton médecin', SX, 1190, t, at(2, .15), { ...card, font: F('chez ton médecin', 100), stagger: .1 });
  if (t >= at(3, .3) && t < at(4, 0)) TXT.slam('LAENNEC ÉTAIT GÊNÉ', SX, 520, t, at(3, .3), { ...card, boxColor: YELLOW, font: F('LAENNEC ÉTAIT GÊNÉ', 104) });
  if (t >= at(4, .35) && t < at(5, 0)) TXT.count(1790, 1816, SX, 1200, t, at(4, .35), at(4, .8) - at(4, .35), { ...card, font: '700 100px Caveat', fmt: n => `${Math.round(n)} : l'oreille collée` });
  if (t >= at(5, .35) && t < at(6, 0)) TXT.stamp('INDÉCENT !', SX, 1170, t, at(5, .35), { font: F('INDÉCENT !', 110, 600), color: CORAL, rot: -.08 });
  if (t >= at(6, .25) && t < at(7, 0)) TXT.highlight('un cahier roulé', SX, 520, t, at(6, .25), { font: F('un cahier roulé', 110), color: GRAPH, mark: 'rgba(245,182,42,.8)' });
  if (t >= at(7, .05) && t < at(8, 0)) {   // la bulle de Laennec, tapée au crayon
    const k = ub(t, 7, .05, .18, 'out');
    g.save(); g.translate(SX, 580); g.scale(k, k);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 0, 400, 125, 0, 0, 7); g.fill(); g.strokeStyle = GRAPH; g.lineWidth = 5; g.stroke();
    g.beginPath(); g.moveTo(40, 112); g.lineTo(90, 200); g.lineTo(110, 104); g.fillStyle = '#fffaf0'; g.fill(); g.stroke();
    g.restore();
    if (k > .95) {
      g.font = '700 38px Caveat'; g.fillStyle = CORAL; g.textAlign = 'center'; g.fillText('LE DOCTEUR LAENNEC', SX, 498);
      const L1 = 'Je vous entends comme', L2 = "si j'étais dedans !", t1 = at(7, .18), t2 = t1 + L1.length / 28;
      TXT.type(L1, SX, 565, t, t1, { font: '700 60px Caveat', color: GRAPH, cps: 28 });
      TXT.type(L2, SX, 632, t, t2, { font: '700 60px Caveat', color: GRAPH, cps: 28 });
    }
  }
  if (t >= at(8, .35) && t < at(9, .1)) TXT.focus('guidé, pas dispersé', SX, 500, t, at(8, .35), { ...card, boxColor: YELLOW, font: F('guidé, pas dispersé', 100), d: .45 });
  if (t >= at(9, .55)) TXT.rise('un docteur trop gêné', SX, 1200, t, at(9, .55), { ...card, font: F('un docteur trop gêné', 100), stagger: .1 });
  const v = g.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1250); v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(60,40,20,.18)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}

export function events(add) {
  add('scribble', 0, { d: 1.2 }); add('zoom', at(1, .05), { d: .5 }); add('scribble', at(1, .1), { d: .8 }); add('scribble', at(2, .05), { d: .5 });
  add('zoom', at(3, .02), { d: .3 }); add('slap', at(3, .3)); add('scribble', at(4, 0), { d: .8 }); add('slap', at(5, .35));
  add('scribble', at(6, .05), { d: 1.0 }); add('scribble', at(7, 0), { d: .6 }); add('zoom', at(8, .02), { d: .6 }); add('bulb', at(8, .6)); add('zoom', at(9, .1), { d: .7 });
}
