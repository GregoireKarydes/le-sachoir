// Scène réalisée pour « Pourquoi les talons hauts ont-ils été inventés pour des hommes ? » — Ink Wash (22 novembre 2026).
// Fil visuel : une chaussure d'homme à talon, peinte à l'encre, ouvre et ferme la vidéo ; entre les deux, un cavalier
// perse au galop, un étrier, des nobles dans la brume et un champ boueux. Tout est noir d'encre ; le seul rouge du film
// est celui du talon de Louis XIV, qui se peint au plan 7 (plan signature), puis le sceau du Sachoir.
//  0 accroche   la chaussure déjà peinte en très gros plan, spirale qui recule et se redresse (rotation + recul)
//  1 curiosité  coupe sur la case 1 en encre (la cour, années 1670), travelling latéral
//  2 verrou     plan fixe qui casse le rythme : trois chaussures se peignent l'une après l'autre
//  3 POINT      travelling latéral qui accélère : le cavalier perse traverse les monts au galop
//  4 raison     zoom brutal sur l'étrier : le pied glisse, le talon le cale (choc)
//  5 raison     travelling avant dans la brume vers la case 3 (les nobles, vers 1600) ; compteur 1500 → 1600
//  6 exemple    caméra à l'épaule sur un noble qui titube dans un champ boueux ; « travailler aux champs » barré
//  7 signature  la case 4 (Louis XIV) puis coupe en plongée très serrée sur le talon : le rouge s'y peint, seule couleur
//  8 boucle     retour à la chaussure entière du plan 0, talon rouge ; le sceau se pose
import { g, W, H, TL, B, at, ub, prog, camera, look, reset, shake, TXT, lerp, clamp, hash } from '../kit.js';
import { IMG } from '../core.js';
import { KIT } from '../ink.js';
const { brush, ridge, mountain, seal, inkPic, TONE, INKC, VERM, paper } = KIT;

export const FONTS = ['700 120px "Cormorant Garamond"', 'italic 600 70px "Cormorant Garamond"'];
const SX = 450, SY = 860;
const INK = `rgba(${INKC},.95)`;
const src = i => { const b = TL.beats[i]; return b && b.img && IMG[b.img] ? b.img : null; };
const SHOE = { x: 480, y: 880 };
const R1 = { x: 1100, y: 620 }, R5 = { x: 1100, y: 2900 }, R7 = { x: 1100, y: 3800 };   // cases en encre (640 × 470)
const FAR = ridge(-300, 3400, 1880, 300, 31, 26), MID = ridge(-300, 3400, 2040, 180, 32, 22);
const GROUND = (() => { const P = []; for (let x = -300; x <= 3400; x += 40) P.push([x, 2165 + Math.sin(x * .01) * 6]); return P; })();
const STIR = { x: 500, y: 3100 }, FIELD = { x: 500, y: 4000 };
const inP = (t, i) => t >= at(i, 0) && t < at(i + 1, 0);

/** une chaussure d'homme à talon haut ; p : avancée de la peinture, red : remplissage rouge du talon (0 → 1) */
function shoe(x, y, s, p, seed, red = 0) {
  const T = (a, b) => [x + a * s, y + b * s];
  const upper = [T(280, 150), T(200, 70), T(80, -20), T(20, -110), T(-70, -100), T(-160, -80), T(-215, 25)];
  const sole = [T(-215, 30), T(-140, 32), T(-40, 90), T(100, 150), T(280, 152)];
  const heel = [T(-218, 32), T(-205, 172), T(-150, 172), T(-140, 32)];
  if (p > .3) {
    g.save(); g.globalAlpha = clamp((p - .3) / .5); g.fillStyle = `rgba(${INKC},${TONE.dan * .5})`;
    g.beginPath(); [...upper, ...sole.slice().reverse()].forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); g.restore();
  }
  if (red > 0) {
    g.save(); g.beginPath(); heel.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.clip();
    g.fillStyle = VERM; g.fillRect(x - 230 * s, y + (172 - 150 * red) * s, 100 * s, 150 * red * s); g.restore();
  }
  brush(g, upper, 16 * s, TONE.jiao, { prog: clamp(p * 1.6), dry: .3, seed, bristles: 12 });
  brush(g, sole, 12 * s, TONE.nong, { prog: clamp(p * 1.6 - .3), dry: .25, seed: seed + 1, bristles: 10 });
  const hp = clamp(p * 1.6 - .6);
  if (hp > 0) brush(g, heel, 12 * s, TONE.jiao, { prog: hp, dry: .2, seed: seed + 2, bristles: 10 });
  if (p > .85) { const [rx, ry] = T(40, -100), P = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * 6.4; P.push([rx + Math.cos(a) * 26 * s, ry + Math.sin(a) * 16 * s]); } brush(g, P, 8 * s, TONE.nong, { dry: .3, seed: seed + 3, bristles: 6 }); }
}
function rider(x, y, t, seed) {
  const ph = t * 9, bob = Math.sin(ph * 2) * 8;
  brush(g, [[x - 150, y - 140 + bob], [x - 60, y - 165 + bob], [x + 60, y - 165 + bob], [x + 140, y - 140 + bob]], 74, TONE.nong, { dry: .2, seed, bristles: 16, loaded: 1 });
  brush(g, [[x + 130, y - 150 + bob], [x + 180, y - 230 + bob], [x + 230, y - 252 + bob], [x + 262, y - 222 + bob]], 34, TONE.jiao, { dry: .15, seed: seed + 1, bristles: 10 });
  brush(g, [[x - 150, y - 150 + bob], [x - 210, y - 122], [x - 250, y - 72]], 16, TONE.zhong, { dry: .5, seed: seed + 2, bristles: 8 });
  for (const [lx, o] of [[-120, 0], [-90, 1.6], [90, 3.1], [120, 4.7]]) {
    const a = Math.sin(ph + o) * .55;
    brush(g, [[x + lx, y - 120 + bob], [x + lx + Math.sin(a) * 50, y - 55], [x + lx + Math.sin(a) * 75, y + 5]], 12, TONE.jiao, { dry: .2, seed: seed + lx, bristles: 6 });
  }
  brush(g, [[x - 6, y - 185 + bob], [x + 10, y - 300 + bob]], 36, TONE.jiao, { dry: .2, seed: seed + 3, bristles: 10, loaded: 1 });
  g.fillStyle = `rgba(${INKC},.88)`; g.beginPath(); g.arc(x + 18, y - 330 + bob, 22, 0, 7); g.fill();
  brush(g, [[x - 10, y - 350 + bob], [x + 20, y - 362 + bob], [x + 44, y - 352 + bob]], 14, TONE.jiao, { dry: .1, seed: seed + 4, bristles: 6 });
  brush(g, [[x + 14, y - 290 + bob], [x + 70, y - 260 + bob], [x + 110, y - 250 + bob]], 10, TONE.nong, { dry: .2, seed: seed + 5, bristles: 5 });
  brush(g, [[x + 2, y - 190 + bob], [x + 34, y - 130 + bob], [x + 24, y - 82 + bob]], 14, TONE.jiao, { dry: .2, seed: seed + 6, bristles: 6 });
  brush(g, [[x + 6, y - 80 + bob], [x + 56, y - 80 + bob]], 10, TONE.jiao, { dry: 0, seed: seed + 7, bristles: 5 });
  g.fillStyle = `rgba(${INKC},.9)`; g.fillRect(x + 4, y - 80 + bob, 12, 20);
  const S = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; S.push([x + 30 - 26 * Math.cos(a), y - 92 + bob + 24 * Math.sin(a)]); } brush(g, S, 5, TONE.nong, { dry: 0, seed: seed + 8, bristles: 4 });
}
function stirrup(t) {
  const { x, y } = STIR, u = ub(t, 4, .1, .55, 'out');
  brush(g, [[x, y - 420], [x, y - 120]], 22, TONE.nong, { dry: .3, seed: 51, bristles: 10 });
  const U = []; for (let k = 0; k <= 30; k++) { const a = Math.PI * k / 30; U.push([x - 130 * Math.cos(a), y - 120 + 200 * Math.sin(a)]); }
  brush(g, U, 18, TONE.jiao, { dry: .25, seed: 52, bristles: 10 });
  brush(g, [[x - 112, y + 68], [x + 112, y + 68]], 22, TONE.jiao, { dry: .2, seed: 53, bristles: 10 });
  shoe(lerp(x - 560, x - 40, u), y - 82, .9, 1, 54);
}
function noble(x, y, t) {
  const w = Math.sin(t * 7) * .18;
  g.save(); g.translate(x, y); g.rotate(w);
  for (const s of [-1, 1]) { brush(g, [[s * 20, 0], [s * 30, -120]], 14, TONE.jiao, { dry: .2, seed: 70 + s, bristles: 6 }); g.fillStyle = `rgba(${INKC},.9)`; g.fillRect(s * 20 - 8, -4, 14, 26); }
  brush(g, [[0, -120], [0, -280]], 84, TONE.nong, { dry: .2, seed: 72, bristles: 18, loaded: 1 });
  g.fillStyle = `rgba(${INKC},.85)`; g.beginPath(); g.arc(0, -322, 32, 0, 7); g.fill();
  brush(g, [[-56, -348], [56, -354]], 16, TONE.jiao, { dry: .1, seed: 73, bristles: 6 });
  brush(g, [[30, -356], [70, -400], [110, -410]], 8, TONE.zhong, { dry: .5, seed: 74, bristles: 5 });
  for (const s of [-1, 1]) brush(g, [[s * 40, -250], [s * 100, -290 + Math.sin(t * 9 + s) * 30], [s * 140, -270]], 12, TONE.nong, { dry: .2, seed: 75 + s, bristles: 6 });
  g.restore();
}

const cam = camera([
  [0, { x: 420, y: 960, z: 2.6, r: .35 }],
  [at(0, .9), { x: 480, y: 880, z: 1.1, r: 0, e: 'out' }],
  [at(1, 0), { x: 480, y: 880, z: 1.1 }],
  [at(1, .02), { x: 1300, y: 860, z: 1.05, e: 'cut' }],
  [at(1, 1), { x: 1540, y: 850, z: 1.1, e: 'lin' }],
  [at(2, 0), { x: 2280, y: 880, z: 1.25, e: 'cut' }],
  [at(2, 1), { x: 2280, y: 880, z: 1.25 }],
  [at(3, 0), { x: 300, y: 2000, z: 1.0, e: 'cut' }],
  [at(3, 1), { x: 1700, y: 2000, z: 1.0, e: 'in' }],
  [at(4, 0), { x: 520, y: 3060, z: .9, e: 'cut' }],
  [at(4, .3), { x: 520, y: 3080, z: 1.9, e: 'out' }],
  [at(4, 1), { x: 540, y: 3080, z: 2.0, e: 'lin' }],
  [at(5, 0), { x: 1420, y: 3140, z: .9, e: 'cut' }],
  [at(5, 1), { x: 1420, y: 3130, z: 1.25, e: 'io' }],
  [at(6, 0), { x: 500, y: 3900, z: 1.1, r: -.06, e: 'cut' }],
  [at(6, 1), { x: 520, y: 3900, z: 1.15, r: .04, e: 'lin' }],
  [at(7, 0), { x: 1420, y: 4035, z: 1.15, r: 0, e: 'cut' }],
  [at(7, .4), { x: 1420, y: 4020, z: 1.3, e: 'io' }],
  [at(7, .42), { x: 330, y: 990, z: 2.8, r: -.2, e: 'cut' }],
  [at(7, 1), { x: 330, y: 985, z: 3.0, r: -.22, e: 'lin' }],
  [at(8, .02), { x: 330, y: 985, z: 3.0, r: -.22 }],
  [at(8, .45), { x: 480, y: 880, z: 1.1, r: 0, e: 'io' }],
  [at(8, 1) + 4, { x: 480, y: 880, z: 1.04, r: 0, e: 'lin' }],
]);

export function draw(t) {
  reset(); g.drawImage(paper(), 0, 0);
  const c = cam(t);
  let hx = 0, hy = 0;
  if (inP(t, 6)) [hx, hy] = shake(t, 10, 5, 4);
  else if (t >= at(4, .55) && t < at(4, .7)) [hx, hy] = shake(t, 16, 30, 6);
  look({ ...c, x: c.x + hx / c.z, y: c.y + hy / c.z }, g, SX, SY);
  g.globalCompositeOperation = 'multiply';

  // 0, 7, 8 · la chaussure (peinte à moitié dès l'image 1), son talon rougit au plan 7
  if (t < at(1, .02) || t >= at(7, .42)) shoe(SHOE.x, SHOE.y, 1, lerp(.5, 1, prog(t, 0, at(0, .7), 'out')), 11, t >= at(7, .42) ? ub(t, 7, .5, .9, 'io') : 0);
  // 1 · la cour de Louis XIV (case 1)
  if (inP(t, 1) && src(1)) { g.globalAlpha = ub(t, 1, 0, .25); g.drawImage(inkPic(src(1)), R1.x, R1.y); g.globalAlpha = 1; }
  // 2 · trois chaussures, peintes l'une après l'autre
  if (inP(t, 2)) for (let k = 0; k < 3; k++) shoe(2060 + k * 220, 890, .38, ub(t, 2, .05 + k * .2, .4 + k * .2, 'out'), 20 + k * 3);
  // 3 · le cavalier perse au galop
  if (inP(t, 3)) {
    mountain(g, FAR, 380, TONE.qing, 1, 31); mountain(g, MID, 300, TONE.dan, 1, 32, true);
    brush(g, GROUND, 10, TONE.zhong, { dry: .5, seed: 33, bristles: 6 });
    rider(lerp(300, 1700, ub(t, 3, 0, 1, 'in')), 2160, t, 40);
    for (let k = 0; k < 6; k++) { const dx = lerp(300, 1700, ub(t, 3, 0, 1, 'in')) - 200 - k * 70; g.fillStyle = `rgba(${INKC},${.25 - k * .035})`; g.beginPath(); g.ellipse(dx, 2160 - hash(k) * 30, 26 - k * 3, 12, 0, 0, 7); g.fill(); }
  }
  // 4 · l'étrier
  if (inP(t, 4)) stirrup(t);
  // 5 · les nobles vers 1600 (case 3), dans la brume
  if (inP(t, 5)) {
    if (src(5)) g.drawImage(inkPic(src(5)), R5.x, R5.y);
    g.globalCompositeOperation = 'source-over';
    const m = ub(t, 5, 0, 1, 'io');
    for (let k = 0; k < 3; k++) { const y = R5.y + 80 + k * 150 + (k - 1) * m * 60, a = (.5 - k * .1) * (1 - m * .8); const gr = g.createLinearGradient(0, y - 90, 0, y + 90); gr.addColorStop(0, 'rgba(242,236,222,0)'); gr.addColorStop(.5, `rgba(242,236,222,${a})`); gr.addColorStop(1, 'rgba(242,236,222,0)'); g.fillStyle = gr; g.fillRect(R5.x - 200 - k * 60 * m, y - 90, 1040, 180); }
    g.globalCompositeOperation = 'multiply';
  }
  // 6 · le champ boueux
  if (inP(t, 6)) {
    for (let k = 0; k < 7; k++) brush(g, [[FIELD.x - 420, FIELD.y + 40 + k * 42], [FIELD.x, FIELD.y + 30 + k * 46], [FIELD.x + 420, FIELD.y + 40 + k * 50]], 8 + k, TONE.dan, { dry: .5, seed: 80 + k, bristles: 6 });
    noble(FIELD.x + lerp(-90, 90, ub(t, 6, 0, 1)), FIELD.y + 60, t);
  }
  // 7 · Louis XIV (case 4), juste avant la coupe sur le talon
  if (t >= at(7, 0) && t < at(7, .42) && src(7)) g.drawImage(inkPic(src(7)), R7.x, R7.y);
  g.globalCompositeOperation = 'source-over';

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  const F = (s, px, st = '700', max = 740) => { let f = `${st} ${px}px "Cormorant Garamond"`; g.font = f; while (g.measureText(s).width > max && px > 40) { px -= 4; f = `${st} ${px}px "Cormorant Garamond"`; g.font = f; } return f; };
  const ink = { color: INK };
  if (t >= at(0, .3) && t < at(1, .05)) TXT.focus('le talon haut', SX, 1190, t, at(0, .3), { ...ink, font: F('le talon haut', 120), d: .5 });
  if (t >= at(1, .25) && t < at(2, 0)) TXT.type('pour les hommes ?', SX, 540, t, at(1, .25), { ...ink, font: F('pour les hommes ?', 104, 'italic 600'), cps: 26 });
  if (t >= at(2, .2) && t < at(3, 0)) TXT.rise('tu les verras autrement', SX, 1190, t, at(2, .2), { ...ink, font: F('tu les verras autrement', 96, 'italic 600'), stagger: .12 });
  if (t >= at(3, .3) && t < at(4, 0)) TXT.slam('CAVALIERS PERSES', SX, 540, t, at(3, .3), { ...ink, font: F('CAVALIERS PERSES', 110) });
  if (t >= at(4, .5) && t < at(5, 0)) TXT.highlight("calé dans l'étrier", SX, 520, t, at(4, .5), { ...ink, font: F("calé dans l'étrier", 100, 'italic 600'), mark: 'rgba(30,26,24,.12)' });
  if (t >= at(5, .15) && t < at(6, 0)) TXT.count(1500, 1600, SX, 500, t, at(5, .15), B(5).d * .5, { ...ink, font: F('vers 1600', 110), fmt: n => `vers ${Math.round(n)}` });
  if (t >= at(6, .1) && t < at(7, 0)) {
    g.font = F('travailler aux champs', 92, 'italic 600'); g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.globalAlpha = ub(t, 6, .1, .25); g.fillText('travailler aux champs', SX, 1190); g.globalAlpha = 1;
    const w = g.measureText('travailler aux champs').width;
    TXT.strike(SX - w / 2 - 20, 1200, SX + w / 2 + 20, 1180, t, at(6, .5), { color: INK, w: 10 });
  }
  if (t >= at(7, .45) && t < at(8, 0)) TXT.pop('LE TALON ROUGE', SX, 520, t, at(7, .45), { font: F('LE TALON ROUGE', 116), color: VERM });
  if (t >= at(8, .5)) TXT.rise('venu du cheval', SX, 1190, t, at(8, .5), { ...ink, font: F('venu du cheval', 110), stagger: .12 });
  if (t >= at(8, .7)) seal(g, 760, 1080, 92, prog(t, at(8, .7), at(8, .8)));
}

export function events(add) {
  add('brush', 0, { d: 1.2 }); add('cut', at(1, .02)); add('brush', at(1, 0), { d: .8 });
  for (let k = 0; k < 3; k++) add('brush', at(2, .05 + k * .2), { d: .4 });
  add('zoom', at(3, 0), { d: B(3).d * .9 }); add('slap', at(3, .3)); add('zoom', at(4, 0), { d: .35 }); add('slap', at(4, .55));
  add('brush', at(5, 0), { d: .8 }); add('cross', at(6, .5)); add('brush', at(7, .5), { d: .7 }); add('chime', at(7, .45)); add('bulb', at(8, .7));
}
