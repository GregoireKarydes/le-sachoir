// Scène réalisée pour « Pourquoi il y avait un éléphant en plâtre place de la Bastille ? » — 2.5D Pixel (23 novembre 2026).
// Fil visuel : la place de la Bastille la nuit, en miniature éclairée aux réverbères ; un éléphant de plâtre de quinze
// mètres, son gardien et sa lanterne à ses pieds. La caméra monte le long de l'éléphant, le rêve en or de 1810, les
// échafaudages, la lumière qui baisse en 1815, puis plonge dans une fissure d'où sortent les rats (plan signature),
// entre dans le ventre où dort Gavroche, et revient à l'éléphant du début.
//  0 accroche   très gros plan sur la lanterne du gardien au pied de l'éléphant, grue qui monte et recule ; compteur 0 → 15 m
//  1 curiosité  travelling latéral le long du flanc fissuré ; « 32 ANS. EN PLÂTRE. » claque
//  2 verrou     coupe sur un livre ouvert à la bougie (un petit éléphant dessiné dans la marge), poussée lente
//  3 POINT      coupe large et zoom avec rebond : l'éléphant entier, une étiquette « MAQUETTE » épinglée ; tampon
//  4 raison     contre-plongée penchée qui recule : l'éléphant devient or, l'eau jaillit de sa trompe (le rêve de 1810)
//  5 raison     panoramique vertical : les échafaudages montent, des ouvriers portent des planches
//  6 raison     plan fixe qui casse le rythme : les réverbères baissent, l'eau s'arrête ; « 177 TONNES DE BRONZE » barré
//  7 signature  zoom brutal dans une fissure du ventre, caméra à l'épaule : les rats en sortent comme un butin de jeu
//  8 Gavroche   coupe dans le ventre, contre-plongée : un gamin dort à la bougie, des yeux de rats autour
//  9 boucle     retour au cadre de la fin du plan 0 ; tampon « JAMAIS DE BRONZE »
import { g, W, H, at, ub, prog, camera, reset, shake, flash, TXT, lerp, clamp, hash } from '../kit.js';
import { KIT } from '../pixel.js';
const { LW, LH, lx, R, lamp, sprite, shadowFrom, begin, present, PAPERW, HERO } = KIT;

const SX = 450, YEL = '#f5b62a', RED = '#e04a3a', BOX = 'rgba(8,10,20,.86)';
const PLATRE = { base: '#a8a49c', shade: '#7c7870', dark: '#55525a', hi: '#d0ccc2' };
const OR = { base: '#c99a4a', shade: '#8a5a2c', dark: '#5c3a1e', hi: '#f0d08a' };
const CRACK = { x: 92, y: 226 };

const ell = (cx, cy, rx, ry, col) => { lx.fillStyle = col; lx.beginPath(); lx.ellipse(cx, cy, rx, ry, 0, 0, 7); lx.fill(); };
function floor(y0, a, b) { for (let k = 0, y = y0; y < LH; k++) { const h = 6 + k * 2.2; R(0, y, LW, h, k % 2 ? a : b); for (let x = (k % 2) * 12; x < LW; x += 24) R(x, y, 1, h, '#151a22'); y += h; } }

// ── la place de la Bastille, la nuit (tampon 270 × 480)
function plaza(t, k = 1) {
  R(0, 0, LW, LH, '#0b1020');
  ['#0d1428', '#111a33', '#16223b', '#1b2a46', '#213252'].forEach((c, i) => R(0, 40 + i * 24, LW, 24, c));
  for (let i = 0; i < 6; i++) { const x = i * 48 - 6, h = 110 + Math.floor(hash(i * 3.1) * 50), top = 296 - h;
    R(x, top, 46, h, '#171c26'); R(x, top, 46, 3, '#232a36');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const lit = hash(i * 17 + r * 5 + c) < .35; R(x + 6 + c * 13, top + 14 + r * 22, 7, 10, lit ? '#ffb060' : '#202634'); } }
  floor(296, '#2b323e', '#1f252f');
  for (const px of [12, 214]) { R(px, 222, 3, 76, '#14141a'); R(px - 3, 214, 9, 9, k > .5 ? '#ffd890' : '#7a6a50'); lamp(px + 1, 218, 74, '#ff9a3c', k); }
}
function elephant(t, P, cracks = 0) {
  R(8, 292, 196, 10, '#4a4a5e'); R(8, 292, 196, 2, '#7a7a8a'); R(16, 302, 180, 8, '#33333f');   // le socle et son bassin
  R(18, 198, 3, 30, P.shade);                                                                     // la queue
  for (const x0 of [36, 62, 112, 136]) { R(x0, 228, 17, 64, P.base); R(x0, 228, 4, 64, P.shade); R(x0 - 1, 288, 19, 4, P.dark); }
  ell(90, 205, 72, 40, P.shade); ell(88, 200, 68, 34, P.base); ell(80, 188, 40, 13, P.hi);
  R(72, 152, 32, 20, P.shade); R(70, 148, 36, 5, P.dark); R(84, 140, 8, 8, P.dark);              // la tour sur le dos
  lx.strokeStyle = P.base; lx.lineWidth = 9; lx.lineCap = 'butt'; lx.beginPath(); lx.moveTo(174, 198); lx.quadraticCurveTo(190, 232, 184, 262); lx.quadraticCurveTo(182, 276, 192, 276); lx.stroke();
  ell(160, 186, 26, 28, P.base); ell(156, 176, 14, 9, P.hi); ell(146, 192, 16, 24, P.shade);
  R(166, 180, 2, 2, '#1a1418'); R(170, 204, 10, 3, '#e8e2d4');
  const n = Math.floor(cracks * 16);
  for (let k = 0; k < n; k++) { let x = 40 + Math.floor(hash(k * 1.7) * 110), y = 176 + Math.floor(hash(k * 2.9 + 3) * 50); for (let s = 0; s < 7; s++) { R(x, y, 1, 2, P.dark); x += hash(k * 9 + s) < .5 ? -1 : 1; y += 2; } }
}
function guardian(t, x, y, frame, face) {   // Levasseur, le gardien : manteau rouge, lanterne
  sprite(x, y, HERO, frame, face, { z: 1, hair: '#2a2018', skin: '#f0c8a0' });
  R(x + 5 * face, y - 12, 3, 4, '#ffe0a0'); lamp(x + 6 * face, y - 10, 26, '#ffd27a');
}
const RATS = Array.from({ length: 56 }, (_, k) => ({ d: k * .018, dir: hash(k * 3.3) < .5 ? -1 : 1, gy: 300 + Math.floor(hash(k * 5.1) * 34), sp: 70 + hash(k * 7.7) * 90, a: hash(k * 2.2) }));
function rat(x, y, dir) { R(x, y, 5, 2, '#2a2a2a'); R(x + (dir > 0 ? 4 : -1), y - 1, 2, 2, '#2a2a2a'); R(x + (dir > 0 ? -3 : 5), y + 1, 3, 1, '#4a3a3a'); R(x + (dir > 0 ? 5 : -1), y - 1, 1, 1, '#ff5a3a'); }
function rats(t) {
  const t0 = at(7, .22); if (t < t0) return;
  for (const r of RATS) {
    const u = t - t0 - r.d; if (u < 0) continue;
    const f = clamp(u / .35);                                            // la chute, de la fissure au pavé
    let x = lerp(CRACK.x, CRACK.x + r.dir * (6 + r.a * 14), f), y = lerp(CRACK.y, r.gy, f * f);
    if (f >= 1) { x += r.dir * (u - .35) * r.sp; x = ((x % (LW + 40)) + LW + 40) % (LW + 40) - 20; }
    rat(Math.round(x), Math.round(y), r.dir);
  }
}
function fountain(t) {   // le rêve de 1810 : l'eau jaillit de la trompe
  for (let k = 0; k < 36; k++) { const p = (t * 1.4 + k / 36) % 1, x = 192 + p * 46, y = 274 - Math.sin(p * Math.PI) * 44 + p * 20; R(x, y, 2, 2, 'rgba(170,215,255,.85)'); }
  lamp(110, 205, 120, '#ffd27a', .55);
}
function scaffold(t) {
  const u = ub(t, 5, 0, .85, 'out'), top = 296 - u * 160;
  for (let x = 24; x <= 196; x += 22) R(x, top, 2, 296 - top, '#6a4a2c');
  for (let y = 286; y > top; y -= 26) R(20, y, 180, 3, '#8a5a2c');
  for (let k = 0; k < 3; k++) { const wy = Math.max(top + 12, 286 - k * 52), wx = 40 + ((t * 30 + k * 60) % 140); sprite(Math.round(wx), Math.round(wy), ['#4a5a7a', '#7a4a3a', '#5a6a3a'][k], Math.floor(t * 8 + k), k % 2 ? 1 : -1, { z: 1, carry: true, hair: '#1a1a1a' }); }
}
function book(t) {
  R(0, 0, LW, LH, '#120c0a'); floor(320, '#2a1a12', '#22150e');
  R(40, 180, 190, 130, '#3a2618'); R(44, 184, 90, 120, '#e8e2d4'); R(136, 184, 90, 120, '#ddd6c6'); R(134, 184, 2, 120, '#8a5a2c');
  for (let l = 0; l < 12; l++) { R(140, 192 + l * 9, 70 - (l % 4) * 8, 3, '#4a4a5e'); if (l < 5) R(52, 270 + l * 6, 70 - l * 9, 2, '#4a4a5e'); }
  ell(78, 230, 20, 12, '#7c7870'); R(64, 238, 4, 12, '#7c7870'); R(84, 238, 4, 12, '#7c7870'); ell(100, 226, 9, 10, '#7c7870'); R(104, 230, 3, 14, '#7c7870');   // le petit éléphant dans la marge
  R(206, 150, 6, 30, '#e8e2d4'); R(207, 144, 4, 6, '#ffd27a'); lamp(209, 146, 90, '#ffc070');
}
function belly(t) {
  R(0, 0, LW, LH, '#0e0a08');
  for (let k = 0; k < 6; k++) { const x = 20 + k * 46; lx.strokeStyle = '#3a2618'; lx.lineWidth = 6; lx.beginPath(); lx.arc(x, 330, 120, Math.PI * 1.12, Math.PI * 1.45); lx.stroke(); }
  floor(300, '#2a1e14', '#1e150e');
  R(60, 288, 34, 10, '#6a5a4a'); R(94, 286, 12, 10, '#f0c8a0'); R(94, 284, 12, 4, '#3a2a20'); R(58, 284, 30, 6, '#8a6a4a');   // Gavroche endormi, sous une couverture
  for (let k = 0; k < 3; k++) { const p = (t * .8 + k / 3) % 1; R(108 + p * 14, 276 - p * 26, 3, 3, `rgba(220,220,230,${.7 * (1 - p)})`); }   // des « z »
  R(150, 268, 2, 20, '#2a2a2a'); R(146, 258, 10, 11, '#ffe070'); R(148, 269, 6, 3, '#5a5a5a'); lamp(151, 263, 80, '#ffe070');   // l'ampoule du Sachoir, en guise de bougie
  for (let k = 0; k < 7; k++) { const x = 30 + Math.floor(hash(k * 4.1) * 210), y = 230 + Math.floor(hash(k * 6.3) * 60), blink = Math.floor(t * 3 + k) % 5 === 0; if (!blink) { R(x, y, 1, 1, '#ff5a3a'); R(x + 3, y, 1, 1, '#ff5a3a'); } }
}

const cam = camera([
  [0, { x: 32, y: 284, z: 3.2 }],
  [at(0, .85), { x: 108, y: 236, z: 1.15, e: 'out' }],
  [at(1, 0), { x: 60, y: 214, z: 1.6, e: 'cut' }],
  [at(1, .98), { x: 150, y: 204, z: 1.6, e: 'lin' }],
  [at(2, 0), { x: 135, y: 242, z: 1.3, r: -.05, e: 'cut' }],
  [at(2, .98), { x: 135, y: 240, z: 1.6, r: -.03, e: 'lin' }],
  [at(3, 0), { x: 112, y: 240, z: .82, r: 0, e: 'cut' }],
  [at(3, .3), { x: 112, y: 236, z: 1.2, e: 'back' }],
  [at(3, .98), { x: 112, y: 236, z: 1.24, e: 'lin' }],
  [at(4, 0), { x: 150, y: 190, z: 1.9, r: .08, e: 'cut' }],
  [at(4, .98), { x: 128, y: 205, z: 1.45, r: .05, e: 'io' }],
  [at(5, 0), { x: 100, y: 280, z: 1.7, r: 0, e: 'cut' }],
  [at(5, .98), { x: 100, y: 172, z: 1.7, e: 'io' }],
  [at(6, 0), { x: 112, y: 240, z: 1.02, e: 'cut' }],
  [at(6, .98), { x: 112, y: 240, z: 1.04, e: 'lin' }],
  [at(7, 0), { x: 100, y: 228, z: 1.1, e: 'cut' }],
  [at(7, .22), { x: CRACK.x, y: CRACK.y, z: 3.0, e: 'in' }],
  [at(7, .98), { x: 100, y: 280, z: 1.9, e: 'out' }],
  [at(8, 0), { x: 130, y: 262, z: 1.6, r: .1, e: 'cut' }],
  [at(8, .98), { x: 128, y: 258, z: 1.85, r: .06, e: 'lin' }],
  [at(9, 0), { x: 110, y: 240, z: 1.6, r: 0, e: 'cut' }],
  [at(9, .55), { x: 108, y: 236, z: 1.15, e: 'io' }],
  [at(9, 1) + 4, { x: 108, y: 236, z: 1.1, e: 'lin' }],
]);
const beat = t => { for (let i = 9; i >= 0; i--) if (t >= at(i, 0)) return i; return 0; };

export function draw(t) {
  const i = beat(t);
  begin(t);
  if (i === 2) book(t);
  else if (i === 8) belly(t);
  else {
    const dim = i === 6 ? lerp(1, .25, ub(t, 6, .1, .6, 'io')) : 1;
    plaza(t, dim);
    const cracks = i <= 3 ? .45 : i === 4 || i === 5 ? 0 : i === 6 ? .45 : 1;
    if (i === 5) scaffold(t);
    elephant(t, i === 4 ? OR : PLATRE, cracks);
    if (i === 5) { for (let y = 286; y > 296 - ub(t, 5, 0, .85, 'out') * 160; y -= 26) R(20, y, 180, 2, '#a07040'); }
    if (i === 4) fountain(t);
    if (i === 6 && t < at(6, .45)) fountain(t);
    if (i === 3) { const k = ub(t, 3, .35, .5, 'out'); if (k > 0) { R(118, 238 - 6 * (1 - k), 40, 14, '#e8e2d4'); R(118, 238 - 6 * (1 - k), 40, 2, '#fff6e0'); R(136, 234 - 6 * (1 - k), 3, 4, '#d9b45a'); } }   // l'étiquette « maquette » épinglée
    const gx = i === 0 || i === 9 ? 30 : i === 1 ? lerp(30, 150, ub(t, 1, .1, .9, 'io')) : 30;
    if (i !== 7) { shadowFrom(gx, 300); guardian(t, Math.round(gx), 300, i === 1 ? Math.floor(t * 8) : 0, 1); }
    rats(t);
    if (i === 9) for (let k = 0; k < 6; k++) { const x = ((t * 60 + k * 50) % (LW + 40)) - 20; rat(Math.round(x), 318 + (k % 3) * 8, 1); }
  }
  let c = cam(t);
  if (i === 7) { const [a, b] = shake(t, 7, 9, 2); c = { ...c, x: c.x + a / 4, y: c.y + b / 4 }; }
  const z = c.z ?? 1;
  present({ x: c.x + (540 - SX) / (4 * z), y: c.y, z, r: c.r || 0, vig: i === 6 ? 1.3 : 1, bloom: i === 4 ? 1.3 : 1, tilt: i === 2 || i === 8 ? [560, 1300] : undefined });
  if (i === 4) flash(t, at(4, 0), .14, '#fff3c4');

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  const F = (s, px, max = 700, fam = 'Cinzel') => { g.font = `700 ${px}px ${fam}`; while (g.measureText(s).width > max && px > 30) { px -= 4; g.font = `700 ${px}px ${fam}`; } return `700 ${px}px ${fam}`; };
  const T1 = { color: YEL, box: true, boxColor: BOX, pad: 24 };
  if (i === 0 && t >= at(0, .15)) TXT.count(0, 15, SX, 1180, t, at(0, .15), Math.max(.6, at(0, .8) - at(0, .15)), { ...T1, font: F('15 MÈTRES DE PLÂTRE', 66), fmt: n => `${Math.round(n)} MÈTRES DE PLÂTRE` });
  if (i === 1 && t >= at(1, .3)) TXT.slam('32 ANS. EN PLÂTRE.', SX, 1180, t, at(1, .3), { ...T1, font: F('32 ANS. EN PLÂTRE.', 74) });
  if (i === 2 && t >= at(2, .2)) TXT.type('LES MISÉRABLES', SX, 560, t, at(2, .2), { ...T1, color: '#2b2b3a', boxColor: 'rgba(243,234,214,.92)', font: F('LES MISÉRABLES', 78), cps: 16 });
  if (i === 3 && t >= at(3, .5)) TXT.stamp('UNE MAQUETTE', SX, 560, t, at(3, .5), { font: F('UNE MAQUETTE', 90, 620), color: YEL, rot: -.07, box: true, boxColor: BOX });
  if (i === 4 && t >= at(4, .25)) TXT.rise('1810 : LE RÊVE EN BRONZE', SX, 1180, t, at(4, .25), { ...T1, font: F('1810 : LE RÊVE EN BRONZE', 64), stagger: .12 });
  if (i === 5 && t >= at(5, .3)) TXT.pop('GRANDEUR NATURE', SX, 560, t, at(5, .3), { ...T1, font: F('GRANDEUR NATURE', 76), rot: -.03 });
  if (i === 6 && t >= at(6, .15)) {
    TXT.focus('177 TONNES DE BRONZE', SX, 560, t, at(6, .15), { ...T1, font: F('177 TONNES DE BRONZE', 66), d: .5 });
    TXT.strike(SX - 340, 590, SX + 340, 530, t, at(6, .55), { color: RED, w: 12, d: .25 });
    if (t >= at(6, .7)) TXT.rise('1815 : PLUS PERSONNE NE PAIE', SX, 680, t, at(6, .7), { color: PAPERW, font: F('1815 : PLUS PERSONNE NE PAIE', 50, 680, '"Cormorant Garamond"'), stagger: .07 });
  }
  if (i === 7 && t >= at(7, .3)) {
    const late = t >= at(7, .6);
    TXT.pop(late ? '+ DES LOCATAIRES' : '+1 RAT', SX, 780, t, late ? at(7, .6) : at(7, .3), { font: F('+ DES LOCATAIRES', 84), color: YEL, stroke: 10, strokeColor: '#0a0a0e' });
  }
  if (i === 8 && t >= at(8, .25)) TXT.rise('GAVROCHE Y DORT', SX, 560, t, at(8, .25), { ...T1, font: F('GAVROCHE Y DORT', 76), stagger: .14 });
  if (i === 9 && t >= at(9, .5)) TXT.stamp('JAMAIS DE BRONZE', SX, 1170, t, at(9, .5), { font: F('JAMAIS DE BRONZE', 80, 620), color: YEL, rot: -.06, box: true, boxColor: BOX });
}

export function events(add) {
  add('zoom', .05, { d: Math.max(.5, at(0, .85)) }); add('slap', at(1, .3)); add('chime', at(2, .05)); add('zoom', at(3, 0), { d: at(3, .3) - at(3, 0) });
  add('slap', at(3, .5)); add('bulb', at(4, 0)); add('slap', at(5, .3)); add('cross', at(6, .55)); add('zoom', at(7, 0), { d: at(7, .22) - at(7, 0) });
  add('slap', at(7, .3)); add('slap', at(7, .6)); add('chime', at(8, .05)); add('bulb', at(8, .3)); add('slap', at(9, .5));
}
