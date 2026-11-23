// Scène réalisée pour « Pourquoi on parle de la gauche et de la droite en politique ? » — Comic History (23 novembre 2026).
// Fil visuel : une grande feuille posée sur une table, avec au centre le plan des places de l'Assemblée de 1789 en
// demi-cercle (le président au premier plan, vu de dos : sa droite est à droite de l'écran). Deux marionnettes de papier,
// LA GAUCHE et LA DROITE, vont chacune de leur côté ; le plan se déchire en deux (plan signature) et les côtés restent.
//  0 accroche   gros plan penché sur les deux marionnettes qui se disputent devant le bureau, recul jusqu'au plan entier
//  1 curiosité  filé latéral vers la case 1 de la BD (l'huissier et son plan) ; un plan des places se déplie ; poussée
//  2 verrou     insert vu du dessus, penché : une table de repas de famille, deux convives qui s'écharpent ; poussée
//  3 POINT      coupe très large, zoom avec rebond : les places du demi-cercle s'allument une à une
//  4 raison     travelling latéral sur la case 2 (le débat) puis une loi de papier, une couronne, le sceau « VETO ? »
//  5 raison     coupe sur la moitié droite, légère rotation : LA DROITE s'y installe, les sièges prennent sa couleur
//  6 signature  filé vers la moitié gauche : LA GAUCHE s'y installe, puis recul et le plan se déchire en deux
//  7 le vote    plan moyen sur les marionnettes, caméra à l'épaule : deux compteurs, 673 contre 325
//  8 boucle     retour au plan entier du plan 0, une étiquette épinglée sur chaque moitié ; tampon final
import { g, W, H, TL, at, ub, prog, camera, look, reset, shake, whip, TXT, lerp, clamp, hash } from '../kit.js';
import { IMG, YELLOW, bulb } from '../core.js';
import { KIT } from '../comic.js';
const { pin, puppet, patchOf, PAPER, INK, RED, BRASS, tex } = KIT;

const SX = 450, SY = 860;
const HX = 1500, HY = 1100, RADII = [250, 350, 450];
const GA = { name: 'LA GAUCHE', color: '#C98A4B' }, DR = { name: 'LA DROITE', color: '#5D6672' };
const R0 = { x: 520, y: 600 };     // la case 1 et le plan des places
const DIN = { x: 500, y: 1700 };   // le repas de famille
const V = { x: 2450, y: 760 };     // le débat sur le veto
const CREAM = '#f4ead2';
const src = i => { const b = TL.beats[i]; return b && b.img && IMG[b.img] ? b.img : null; };

function patchAt(s, cx, cy, w, h, rot, k = 1) {
  if (!s || k <= 0) return;
  const lift = 1 - k;
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(1 + .2 * lift, 1 + .2 * lift);
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(-w / 2 + 10 + 30 * lift, -h / 2 + 10 + 30 * lift, w + 28, h + 28);
  g.fillStyle = CREAM; g.fillRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28);
  g.drawImage(patchOf(s), -w / 2, -h / 2, w, h);
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28);
  if (k >= 1) pin(0, -h / 2 - 2);
  g.restore();
}
// les sièges du demi-cercle (le président en bas, vu de dos : sa droite = la droite de l'écran)
const SEATS = [];
RADII.forEach((R, r) => { const n = 7 + r * 2; for (let k = 0; k < n; k++) { const a = Math.PI + .18 + (Math.PI - .36) * k / (n - 1); SEATS.push({ x: HX + Math.cos(a) * R, y: HY + Math.sin(a) * R, a, side: Math.cos(a) < -.02 ? -1 : Math.cos(a) > .02 ? 1 : 0, k: SEATS.length }); } });
function hemicycle(t) {
  const on = t < at(3, 0) ? 1 : prog(t, at(3, .1), at(3, .8));
  const tear = prog(t, at(6, .45), at(6, .75), 'out') * 34;
  const fillR = prog(t, at(5, .3), at(5, .9)), fillL = prog(t, at(6, .2), at(6, .6));
  for (const s of SEATS) {
    const order = (s.k % 7) / 7, vis = t < at(3, 0) ? 1 : clamp((on - order * .7) / .3);
    if (vis <= 0) continue;
    const dx = s.side * tear, col = s.side > 0 && fillR > (s.a - Math.PI * 1.5) / (Math.PI * .5) ? DR.color : s.side < 0 && fillL > (Math.PI * 1.5 - s.a) / (Math.PI * .5) ? GA.color : '#e9dfc6';
    g.save(); g.translate(s.x + dx, s.y); g.rotate(s.a + Math.PI / 2); g.scale(vis, vis);
    g.fillStyle = 'rgba(43,34,25,.25)'; g.fillRect(-26 + 5, -18 + 5, 52, 36);
    g.fillStyle = col; g.fillRect(-26, -18, 52, 36); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-26, -18, 52, 36);
    g.restore();
  }
  // le bureau du président, vu de dos
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(HX - 110 + 8, HY + 28, 220, 80);
  g.fillStyle = '#8a5a3c'; g.fillRect(HX - 110, HY + 20, 220, 80); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(HX - 110, HY + 20, 220, 80);
  g.fillStyle = '#2b2219'; g.beginPath(); g.arc(HX, HY + 4, 34, 0, 7); g.fill();
  g.font = '700 30px "Old Standard TT"'; g.fillStyle = CREAM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LE PRÉSIDENT', HX, HY + 62);
  if (t >= at(7, .5) && t < at(8, 0)) bulb(HX + 80, HY - 6, .45, { ink: INK, fill: YELLOW });   // l'ampoule du Sachoir, sur le bureau
  // la déchirure du plan (signature)
  if (tear > 0) {
    g.fillStyle = '#7B6A57'; g.beginPath(); g.moveTo(HX - tear * .5, HY - 520);
    for (let k = 0; k <= 16; k++) g.lineTo(HX - tear * .5 + (hash(k * 3.3) - .5) * 26, HY - 520 + k * 40);
    for (let k = 16; k >= 0; k--) g.lineTo(HX + tear * .5 + (hash(k * 3.3) - .5) * 26, HY - 520 + k * 40);
    g.closePath(); g.fill();
  }
  // les étiquettes épinglées (boucle)
  if (t >= at(8, .25)) for (const [side, txt] of [[-1, 'GAUCHE'], [1, 'DROITE']]) {
    const k = ub(t, 8, .25 + (side > 0 ? .1 : 0), .4 + (side > 0 ? .1 : 0), 'out'); if (k <= 0) continue;
    const x = HX + side * (300 + tear), y = HY - 540;
    g.save(); g.translate(x, y); g.rotate(side * .05); g.scale(1 + .4 * (1 - k), 1 + .4 * (1 - k)); g.globalAlpha = k;
    g.font = '400 58px "Lilita One"'; const w = g.measureText(txt).width + 50;
    g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(-w / 2 + 8, -34 + 8, w, 68); g.fillStyle = YELLOW; g.fillRect(-w / 2, -34, w, 68);
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-w / 2, -34, w, 68); g.fillStyle = INK; g.textAlign = 'center'; g.fillText(txt, 0, 4);
    if (k >= 1) pin(0, -34);
    g.restore();
  }
}
function camps(t) {
  const tear = prog(t, at(6, .45), at(6, .75), 'out') * 34;
  const xr = t < at(5, 0) ? HX + 150 : lerp(HX + 150, HX + 330, ub(t, 5, .1, .6, 'io'));
  const xl = t < at(6, 0) ? HX - 150 : lerp(HX - 150, HX - 330, ub(t, 6, .05, .45, 'io'));
  const argue = t < at(1, 0);
  const sp = Math.floor(t * 2) % 2;
  const emoL = t >= at(7, .3) ? 'fier' : argue ? 'fache' : 'content', emoR = t >= at(7, .3) ? 'vexe' : argue ? 'fache' : 'content';
  const actL = (argue && sp === 0) || (t >= at(6, 0) && t < at(6, .5)) || (t >= at(7, .3) && t < at(8, 0));
  const actR = (argue && sp === 1) || (t >= at(5, 0) && t < at(5, .6));
  puppet(GA, xl - tear, 1480, .7, t, { emo: emoL, active: actL, talk: actL ? Math.abs(Math.sin(t * 9)) * .6 : 0, face: 1 });
  puppet(DR, xr + tear, 1480, .7, t + .37, { emo: emoR, active: actR, talk: actR ? Math.abs(Math.sin(t * 9 + 1)) * .6 : 0, face: -1 });
}
function plan(t) {   // la case 1 (l'huissier et son plan), puis un plan des places qui se déplie
  patchAt(src(1), R0.x, R0.y - 80, 520, 380, -.04, ub(t, 1, .1, .35, 'out'));
  const u = ub(t, 1, .35, .8, 'out'); if (u <= 0) return;
  g.save(); g.translate(R0.x + 40, R0.y + 300); g.rotate(.05); g.scale(1, u);
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(-250 + 8, -110 + 8, 500, 220); g.fillStyle = '#fbf3df'; g.fillRect(-250, -110, 500, 220);
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-250, -110, 500, 220);
  g.font = 'italic 400 32px "IM Fell English"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('Plan des places, Versailles', 0, -76);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) { g.strokeStyle = 'rgba(43,34,25,.6)'; g.lineWidth = 2; g.strokeRect(-200 + k * 46, -40 + r * 44, 34, 28); }
  g.restore();
}
function dinner(t) {
  const { x, y } = DIN, agit = t >= at(2, 0) && t < at(3, 0) ? 1 : 0;
  g.fillStyle = 'rgba(43,34,25,.3)'; g.beginPath(); g.ellipse(x + 14, y + 14, 270, 230, 0, 0, 7); g.fill();
  g.fillStyle = '#b07a4f'; g.beginPath(); g.ellipse(x, y, 270, 230, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .3, px = x + Math.cos(a) * 180, py = y + Math.sin(a) * 150;
    g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(px, py, 44, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke(); g.beginPath(); g.arc(px, py, 28, 0, 7); g.stroke(); }
  g.fillStyle = '#8a4a2c'; g.beginPath(); g.ellipse(x, y, 80, 52, .2, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();   // le rôti
  for (const s of [-1, 1]) {   // deux convives, vus du dessus, qui s'écharpent
    const j = agit ? Math.sin(t * 16 + s) * 8 : 0, hx = x + s * 330 + j, hy = y - 20;
    g.fillStyle = s < 0 ? GA.color : DR.color; g.beginPath(); g.arc(hx, hy, 70, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#f0d6b8'; g.beginPath(); g.arc(hx, hy, 40, 0, 7); g.fill(); g.stroke();
    if (agit) { const k = ub(t, 2, .2 + (s > 0 ? .15 : 0), .35 + (s > 0 ? .15 : 0), 'back'); g.save(); g.translate(hx - s * 40, hy - 130); g.scale(k, k); g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(0, 0, 60, 50, 0, 0, 7); g.fill(); g.stroke();
      g.font = '400 70px "Lilita One"'; g.fillStyle = RED; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 0, 4); g.restore(); }
  }
}
function veto(t) {
  patchAt(src(4), V.x, V.y - 120, 520, 380, .03, ub(t, 4, 0, .25, 'out'));
  if (t < at(4, .2)) return;
  g.save(); g.translate(V.x + 40, V.y + 300); g.rotate(-.06);
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(-170 + 8, -120 + 8, 340, 240); g.fillStyle = '#fbf3df'; g.fillRect(-170, -120, 340, 240);
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-170, -120, 340, 240);
  g.font = '700 54px "Old Standard TT"'; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LOI', 0, -70);
  for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(43,34,25,.35)'; g.fillRect(-120, -20 + k * 30, 240 - (k === 3 ? 90 : 0), 8); }
  const ck = ub(t, 4, .3, .55, 'out'), cy = lerp(-420, -170, ck);   // la couronne descend sur la loi
  g.fillStyle = BRASS; g.beginPath(); g.moveTo(-90, cy + 40); g.lineTo(-90, cy - 20); g.lineTo(-45, cy + 10); g.lineTo(0, cy - 40); g.lineTo(45, cy + 10); g.lineTo(90, cy - 20); g.lineTo(90, cy + 40); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  if (t >= at(4, .6)) { const s = 1 + 1.4 * Math.pow(1 - ub(t, 4, .6, .7), 2); g.save(); g.translate(60, 40); g.rotate(-.2); g.scale(s, s); g.strokeStyle = RED; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 80, 0, 7); g.stroke();
    g.font = '400 50px "Lilita One"'; g.fillStyle = RED; g.fillText('VETO ?', 0, 4); g.restore(); }
  g.restore();
}

const cam = camera([
  [0, { x: HX, y: 1310, z: 2.1, r: -.08 }],
  [at(0, .85), { x: 1460, y: 1000, z: .8, r: 0, e: 'out' }],
  [at(1, .02), { x: 1460, y: 1000, z: .8 }],
  [at(1, .2), { x: R0.x, y: R0.y + 40, z: 1.05, e: 'io' }],
  [at(1, 1), { x: R0.x + 20, y: R0.y + 60, z: 1.18, e: 'lin' }],
  [at(2, 0), { x: DIN.x - 10, y: DIN.y - 20, z: 1.2, r: .15, e: 'cut' }],
  [at(2, 1), { x: DIN.x, y: DIN.y - 30, z: 1.45, r: .2, e: 'lin' }],
  [at(3, 0), { x: 1460, y: 1000, z: .5, r: 0, e: 'cut' }],
  [at(3, .4), { x: 1460, y: 950, z: .9, e: 'back' }],
  [at(3, 1), { x: 1460, y: 940, z: .88, e: 'lin' }],
  [at(4, 0), { x: V.x - 120, y: V.y - 20, z: 1.12, e: 'cut' }],
  [at(4, 1), { x: V.x + 60, y: V.y + 140, z: 1.12, e: 'lin' }],
  [at(5, 0), { x: 1700, y: 1060, z: 1.22, r: .06, e: 'cut' }],
  [at(5, 1), { x: 1760, y: 1020, z: 1.28, r: .03, e: 'lin' }],
  [at(6, 0), { x: 1240, y: 1060, z: 1.22, r: -.06, e: 'cut' }],
  [at(6, .4), { x: 1220, y: 1030, z: 1.28, r: -.04, e: 'lin' }],
  [at(6, .75), { x: 1460, y: 1000, z: .74, r: 0, e: 'out' }],
  [at(6, 1), { x: 1460, y: 1000, z: .73, e: 'lin' }],
  [at(7, 0), { x: 1460, y: 1240, z: 1.05, e: 'cut' }],
  [at(7, 1), { x: 1460, y: 1220, z: 1.12, e: 'lin' }],
  [at(8, 0), { x: 1460, y: 1220, z: 1.1 }],
  [at(8, .4), { x: 1460, y: 1000, z: .8, e: 'io' }],
  [at(8, 1) + 4, { x: 1460, y: 1000, z: .77, e: 'lin' }],
]);

export function draw(t) {
  const T = tex();
  reset(); g.fillStyle = '#7B6A57'; g.fillRect(0, 0, W, H);
  const wx = whip(t, at(1, .1), .34, -1) + whip(t, at(6, .02), .3, 1);
  const c = cam(t);
  let hx = 0, hy = 0;
  if (t >= at(7, 0) && t < at(8, 0)) [hx, hy] = shake(t, 8, 6, 2);
  else if (t < at(1, 0)) [hx, hy] = shake(t, 4, 3, 7);
  look({ ...c, x: c.x - wx / c.z + hx / c.z, y: c.y + hy / c.z }, g, SX, SY);
  g.fillStyle = T.table; g.fillRect(-1500, -1500, 7000, 6000);
  g.fillStyle = 'rgba(30,20,10,.35)'; g.fillRect(18, 168, 3000, 2000);
  g.fillStyle = PAPER; g.fillRect(0, 150, 3000, 2000);
  plan(t);
  dinner(t);
  veto(t);
  hemicycle(t);
  camps(t);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = T.paper; g.fillRect(0, 150, 3000, 2000); g.globalCompositeOperation = 'source-over';

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  const F = (s, px, fam = 'Lilita One', wt = 400, max = 740) => { let f = `${wt} ${px}px "${fam}"`; g.font = f; while (g.measureText(s).width > max && px > 36) { px -= 4; f = `${wt} ${px}px "${fam}"`; g.font = f; } return f; };
  const box = { box: true, boxColor: YELLOW, color: INK, boxShadow: 'rgba(43,34,25,.35)' };
  if (t >= at(0, .3) && t < at(1, .1)) TXT.slam('GAUCHE ? DROITE ?', SX, 1180, t, at(0, .3), { ...box, font: F('GAUCHE ? DROITE ?', 104) });
  if (t >= at(1, .35) && t < at(2, 0)) TXT.type('Un plan de table', SX, 1180, t, at(1, .35), { font: F('Un plan de table', 84, 'Old Standard TT', 700), color: INK, cps: 22, box: true, boxColor: CREAM });
  if (t >= at(2, .1) && t < at(3, 0)) TXT.pop('Pour le repas de famille', SX, 1180, t, at(2, .1), { ...box, font: F('Pour le repas de famille', 92), rot: -.04 });
  if (t >= at(3, .3) && t < at(4, 0)) TXT.highlight('Les places de 1789', SX, 520, t, at(3, .3), { font: F('Les places de 1789', 96, 'IM Fell English SC'), color: INK, mark: 'rgba(245,182,42,.9)' });
  if (t >= at(4, .25) && t < at(5, 0)) TXT.rise('Le roi peut-il dire non ?', SX, 1180, t, at(4, .25), { ...box, font: F('Le roi peut-il dire non ?', 84), stagger: .09 });
  if (t >= at(5, .3) && t < at(6, 0)) TXT.slam('À DROITE : UN ROI FORT', SX, 520, t, at(5, .3), { ...box, boxColor: '#dfe3ea', font: F('À DROITE : UN ROI FORT', 84) });
  if (t >= at(6, .1) && t < at(7, 0)) TXT.type('À GAUCHE : LE LIMITER', SX, 520, t, at(6, .1), { ...box, boxColor: '#f3dcc2', font: F('À GAUCHE : LE LIMITER', 84), cps: 26 });
  if (t >= at(7, .15) && t < at(8, 0)) {
    const d = at(7, .8) - at(7, .15);
    TXT.count(0, 673, 250, 560, t, at(7, .15), d, { ...box, boxColor: '#f3dcc2', font: '400 96px "Lilita One"', fmt: n => `${Math.round(n)}` });
    TXT.count(0, 325, 650, 560, t, at(7, .15), d, { ...box, boxColor: '#dfe3ea', font: '400 96px "Lilita One"', fmt: n => `${Math.round(n)}` });
    g.globalAlpha = ub(t, 7, .2, .4); g.font = 'italic 400 46px "IM Fell English"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('gauche', 250, 660); g.fillText('droite', 650, 660); g.globalAlpha = 1;
  }
  if (t >= at(8, .5)) TXT.stamp('LES PLACES SONT RESTÉES', SX, 1180, t, at(8, .5), { font: F('LES PLACES SONT RESTÉES', 76, 'Lilita One', 400, 640), color: RED, rot: -.06 });
}

export function events(add) {
  add('slap', at(0, .3)); add('zoom', at(1, .05), { d: .4 }); add('slap', at(1, .3)); add('chime', at(2, .2));
  add('zoom', at(3, 0), { d: at(3, .4) - at(3, 0) }); add('slap', at(4, 0)); add('slap', at(4, .6));
  add('slap', at(5, .3)); add('zoom', at(6, 0), { d: .3 }); add('cross', at(6, .45)); add('zoom', at(6, .5), { d: .4 });
  add('bulb', at(7, .9)); add('slap', at(8, .3)); add('slap', at(8, .4)); add('slap', at(8, .5));
}
