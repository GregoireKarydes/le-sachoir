// Scène réalisée pour « 300 pages sans un seul « e » : c'est possible ? » — 2.5D Pixel (21 novembre 2026).
// Fil visuel : un bureau d'écrivain de 1969 en miniature, éclairé par une lampe de bureau ; la caméra quitte la pile du
// manuscrit pour le clavier, la page, une ruelle et un salon de lecture, puis revient à la pile.
//  0 question   très gros plan sur la pile du manuscrit, des feuilles s'envolent ; recul jusqu'au bureau ; compteur 0 → 300
//  1 réponse    travelling latéral : Perec traverse le bureau avec son livre ; « 1969 : LA DISPARITION » claque
//  2 Odile      coupe en contre-plongée penchée sur la correctrice qui entre ; boîte de dialogue
//  3 interdits  plan signature : zoom brutal dans le clavier, la touche E s'allume en rouge et s'arrache comme un objet
//               de jeu, il reste un trou noir ; « LE · ET · JE · ELLE » monte, « INTERDITS » tamponné
//  4 la page    panoramique vertical sur une page qui se tape ligne après ligne ; « D'AUTRES MOTS » tapé
//  5 son nom    gros plan penché sur Perec à son bureau ; son nom s'écrit lettre à lettre et ses E se font barrer
//  6 Anton Voyl coupe dans une ruelle sous la pluie : un homme sous un réverbère s'efface pixel par pixel (poussée lente)
//  7 lecteurs   salon de lecture, zoom brutal et caméra à l'épaule sur trois lecteurs, « RIEN REMARQUÉ ? »
//  8 le lecteur plan fixe qui casse le rythme sur un lecteur qui tourne la page ; boîte de dialogue
//  9 boucle     retour au bureau et à la pile du début ; tampon « 300 PAGES, ZÉRO « E » »
import { g, W, H, at, ub, prog, camera, reset, shake, TXT, lerp, clamp, hash } from '../kit.js';
import { KIT } from '../pixel.js';
const { LW, LH, lx, R, lamp, sprite, shadowFrom, begin, present, GOLD, PAPERW, HERO } = KIT;

const SX = 460, YEL = '#f5b62a', RED = '#e04a3a', BOX = 'rgba(8,10,20,.86)';
const HAIR = '#3a2418', SKIN = '#f0c8a0';

// ── les décors (tampon basse résolution 270 × 480)
function floor(y0, a, b) { for (let k = 0, y = y0; y < LH; k++) { const h = 6 + k * 2.2; R(0, y, LW, h, k % 2 ? a : b); y += h; } }
function study(t) {
  R(0, 0, LW, LH, '#0d0f18');
  R(0, 60, LW, 190, '#2a1e16'); for (let x = 0; x < LW; x += 30) R(x, 60, 2, 190, '#1e140e');
  R(24, 90, 58, 72, '#1a1410'); R(28, 94, 50, 64, '#1f2d55'); R(58, 102, 8, 8, '#f0e6c0');
  R(28, 140, 50, 18, '#121a33'); R(34, 132, 10, 10, '#121a33'); R(60, 128, 6, 14, '#121a33'); R(52, 94, 2, 64, '#1a1410'); R(28, 124, 50, 2, '#1a1410');
  R(206, 80, 54, 170, '#3a2618');
  for (let s = 0; s < 4; s++) { R(206, 120 + s * 38, 54, 3, '#24160e'); for (let k = 0; k < 7; k++) R(210 + k * 7, 96 + s * 38 - (k % 3) * 2, 5, 22 + (k % 3) * 2, ['#7a2a22', '#2a3a6a', '#3a5a3a', '#9a6a4a', '#5a3a2a'][(k + s) % 5]); }
  floor(250, '#2c2118', '#241a12');
  R(70, 236, 130, 8, '#6a4428'); R(70, 244, 130, 3, '#4a2e18'); R(76, 247, 6, 40, '#4a2e18'); R(188, 247, 6, 40, '#4a2e18');
  R(100, 222, 40, 14, '#5a5a66'); R(102, 218, 36, 6, '#7a7a8a'); R(104, 212, 32, 6, '#e8e2d4');
  for (let k = 0; k < 8; k++) R(104 + k * 4, 228, 2, 2, k === 1 ? '#0a0a0e' : '#c8c8d0');   // la touche qui manque
  R(150, 212, 26, 24, '#e8e2d4'); for (let k = 0; k < 24; k += 2) R(150, 212 + k, 26, 1, '#cfc8b8'); R(150, 212, 26, 1, '#fff6e0'); R(161, 212, 2, 24, '#8a5a2c');
  R(186, 206, 3, 30, '#2a2a2a'); R(178, 198, 20, 9, '#2f7a3a'); lamp(188, 214, 80, '#ffd890');
  lamp(58, 118, 36, '#8ab0d8', .5);
}
function perec(x, y, frame, face, o = {}) {   // le héros : veste rouille, nuage de cheveux, barbiche
  sprite(x, y, HERO, frame, face, { hair: HAIR, skin: SKIN, ...o });
  R(x - 10, y - 60, 22, 12, HAIR); R(x - 12, y - 54, 4, 8, HAIR); R(x + 10, y - 54, 4, 8, HAIR); R(x + (face > 0 ? 0 : -2), y - 35, 4, 7, HAIR);
}
function odile(x, y, frame, face) { sprite(x, y, '#3050c0', frame, face, { hair: '#b8b8c0', skin: '#f4c8b8' }); R(x - 4, y - 44, 12, 2, '#1a1418'); }
const KB = { x: 30, y: 170, s: 21 }, EKX = KB.x + 4 + 2 * KB.s + 8, EKY = KB.y + 8;
function keyboard(t) {
  R(0, 0, LW, LH, '#1c120c'); for (let y = 0; y < LH; y += 12) R(0, y, LW, 1, '#24180f');
  R(KB.x - 6, KB.y - 14, 10 * KB.s + 12, 4 * KB.s + 28, '#2a2a34'); R(KB.x - 6, KB.y - 14, 10 * KB.s + 12, 3, '#4a4a5e');
  const lit = t >= at(3, .2), gone = t >= at(3, .5);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10 - (r === 3 ? 3 : 0); c++) {
    const x = KB.x + 4 + c * KB.s + (r % 2) * 6, y = KB.y + r * KB.s, isE = r === 0 && c === 2;
    if (isE && gone) { R(x, y, 16, 16, '#050507'); continue; }
    R(x, y, 16, 16, '#0a0a0e'); R(x + 1, y + 1, 14, 13, isE && lit ? '#b23a2a' : '#c8c8d0'); R(x + 3, y + 3, 10, 8, isE && lit ? '#e05a40' : '#e8e2d4');
  }
  if (lit) lamp(EKX, EKY, 40, '#ff5a3a', gone ? .3 : 1);
  if (gone) { const ky = EKY - 30 * ub(t, 3, .5, .8, 'out'); R(EKX - 8, ky - 8, 16, 16, '#0a0a0e'); R(EKX - 7, ky - 7, 14, 13, '#b23a2a'); R(EKX - 5, ky - 5, 10, 8, '#e05a40'); lamp(EKX, ky, 30, '#ffb060'); }
  lamp(135, 120, 120, '#ffe0a0', .5);
}
function page(t) {
  R(0, 0, LW, LH, '#141018'); R(30, 40, 210, 420, '#e8e2d4'); R(30, 40, 210, 2, '#fff6e0'); R(238, 40, 2, 420, '#b0aca4');
  const f = ub(t, 4, 0, .92) * 26, n = Math.floor(f);
  for (let l = 0; l <= Math.min(25, n); l++) {
    const y = 60 + l * 14, len = l === n ? Math.floor((f - n) * 30) : 30; let x = 44;
    for (let k = 0; k < len; k++) { const w = 2 + Math.floor(hash(l * 31 + k) * 4); if (x + w > 226) break; R(x, y, w, 5, '#2b2b3a'); x += w + (hash(l * 7 + k * 3) < .18 ? 4 : 1); }
    if (l === n && n < 26) R(x + 1, y - 1, 2, 7, RED);   // le chariot qui avance
  }
  lamp(135, 200, 140, '#ffe8b0', .35);
}
function ruelle(t) {
  R(0, 0, LW, LH, '#0f1218'); R(80, 120, 110, 180, '#151a22');
  for (const [x0, d] of [[0, 1], [LW, -1]]) { lx.fillStyle = '#1b2029'; lx.beginPath(); lx.moveTo(x0, 40); lx.lineTo(x0 + d * 80, 120); lx.lineTo(x0 + d * 80, 300); lx.lineTo(x0, LH); lx.fill();
    for (let k = 0; k < 4; k++) { const wx = d > 0 ? x0 + 18 : x0 - 30, wy = 100 + k * 46; R(wx, wy, 12, 16, k % 2 ? '#ffb060' : '#2b323e'); if (k % 2) lamp(wx + 6, wy + 8, 22, '#ff9a3c', .5); } }
  floor(300, '#2b323e', '#1b2029');
  R(134, 170, 3, 130, '#1a1a1a'); R(130, 162, 11, 10, '#ffd890'); lamp(135, 168, 90, '#ff9a3c');
  for (let k = 0; k < 70; k++) { const x = (hash(k) * LW + t * 40) % LW, y = (hash(k + 9) * LH + t * 260) % LH; R(x, y, 1, 4, 'rgba(160,180,220,.55)'); }
}
function salon(t) {
  R(0, 0, LW, LH, '#10140f'); R(0, 60, LW, 190, '#2c3826'); for (let x = 0; x < LW; x += 16) R(x, 60, 6, 190, '#33402c');
  floor(250, '#425236', '#2c3826');
  for (const [x, c] of [[60, '#7a2a22'], [135, '#5a3a6a'], [210, '#2a4a6a']]) { R(x - 18, 236, 36, 12, c); R(x - 20, 236, 6, 40, c); R(x + 14, 236, 6, 40, c); R(x - 16, 262, 32, 14, c); }
  for (const x of [98, 172]) { R(x, 170, 3, 80, '#1a1a1a'); R(x - 8, 160, 19, 12, '#d8c080'); lamp(x + 1, 172, 70, '#ffd27a'); }
}

const cam = camera([
  [0, { x: 163, y: 214, z: 2.7 }],
  [at(0, .85), { x: 135, y: 222, z: 1.25, e: 'out' }],
  [at(1, 0), { x: 120, y: 226, z: 1.5, e: 'cut' }],
  [at(1, .98), { x: 165, y: 226, z: 1.6, e: 'lin' }],
  [at(2, 0), { x: 195, y: 236, z: 2.05, r: .05, e: 'cut' }],
  [at(2, .98), { x: 190, y: 232, z: 2.2, r: .04, e: 'lin' }],
  [at(3, 0), { x: 135, y: 230, z: 1.0, r: 0, e: 'cut' }],
  [at(3, .3), { x: EKX, y: EKY + 6, z: 2.5, e: 'back' }],
  [at(3, .98), { x: EKX, y: EKY - 8, z: 2.6, e: 'lin' }],
  [at(4, 0), { x: 135, y: 150, z: 1.3, e: 'cut' }],
  [at(4, .98), { x: 135, y: 340, z: 1.3, e: 'io' }],
  [at(5, 0), { x: 128, y: 214, z: 2.3, r: -.06, e: 'cut' }],
  [at(5, .98), { x: 132, y: 210, z: 2.55, r: -.02, e: 'lin' }],
  [at(6, 0), { x: 110, y: 250, z: 1.15, r: 0, e: 'cut' }],
  [at(6, .98), { x: 138, y: 250, z: 1.7, e: 'io' }],
  [at(7, 0), { x: 135, y: 240, z: 1.0, e: 'cut' }],
  [at(7, .25), { x: 135, y: 245, z: 1.55, e: 'back' }],
  [at(7, .98), { x: 140, y: 245, z: 1.6, e: 'lin' }],
  [at(8, 0), { x: 66, y: 238, z: 2.3, e: 'cut' }],
  [at(8, .98), { x: 66, y: 238, z: 2.33, e: 'lin' }],
  [at(9, 0), { x: 150, y: 220, z: 1.7, e: 'cut' }],
  [at(9, .6), { x: 135, y: 222, z: 1.25 }],
  [at(9, 1) + 4, { x: 135, y: 222, z: 1.18, e: 'lin' }],
]);
const scr = (c, x, y) => [W / 2 + (x - c.x) * 4 * c.z, H / 2 + (y - c.y) * 4 * c.z];
const beat = t => { for (let i = 9; i >= 0; i--) if (t >= at(i, 0)) return i; return 0; };

export function draw(t) {
  const i = beat(t);
  begin(t);
  if (i === 3) keyboard(t);
  else if (i === 4) page(t);
  else if (i === 6) ruelle(t);
  else if (i === 7 || i === 8) salon(t);
  else study(t);
  // les personnages
  if (i === 0 || i === 9) {   // Perec tape ; des feuilles s'envolent de la pile
    perec(122, 262, Math.floor(t * 6) % 2 ? 0 : 2, 1); shadowFrom(122, 262);
    for (let k = 0; k < 3; k++) { const p = (t * .9 + k / 3) % 1; R(152 + p * 40 + k * 3, 208 - p * 60, 14 - p * 6, 3, '#fff6e0'); }
  } else if (i === 1) { const x = lerp(70, 160, ub(t, 1, .05, .9, 'io')); shadowFrom(x, 266); perec(x, 266, Math.floor(t * 8), 1, { carry: true }); }
  else if (i === 2) { perec(150, 266, 0, 1); const x = lerp(250, 200, ub(t, 2, 0, .5, 'out')); odile(x, 266, t < at(2, .5) ? Math.floor(t * 8) : 0, -1); shadowFrom(x, 266); }
  else if (i === 5) perec(122, 262, Math.floor(t * 2) % 2 ? 0 : 1, 1);
  else if (i === 6) {   // Anton Voyl s'efface, pixel par pixel
    sprite(140, 300, '#6a6a7a', 0, -1, { hair: '#2a2018' });
    const p = ub(t, 6, .3, .9);
    for (let y = 240; y < 304; y++) for (let x = 124; x < 158; x++) if (hash(x * 13.1 + y * 7.7) < p) R(x, y, 1, 1, y >= 300 ? '#2b323e' : '#151a22');
  } else if (i === 7 || i === 8) {
    [[60, '#4a6aaa'], [135, '#6a8a4a'], [210, '#9a6a4a']].forEach(([x, c], k) => sprite(x, 286 + Math.round(Math.sin(t * 2 + k) * 1), c, 0, k === 2 ? -1 : 1, { carry: true, hair: ['#1a1a1a', '#5a3a2a', '#c8c8c8'][k] }));
    if (i === 8) { R(78, 190, 2, 10, '#2a2a2a'); R(75, 199, 8, 9, '#ffe070'); R(77, 208, 4, 3, '#5a5a5a'); lamp(79, 203, 30, '#ffe070'); }   // l'ampoule du Sachoir, cachée une fois
  }
  let c = cam(t);
  if (i === 7) { const [a, b] = shake(t, 6, 8, 2); c = { ...c, x: c.x + a / 4, y: c.y + b / 4 }; }
  present({ x: c.x, y: c.y, z: c.z, r: c.r || 0, vig: i === 4 ? .5 : 1, bloom: i === 3 ? 1.2 : 1 });

  // ── écran : texte animé (une animation différente à chaque plan)
  reset();
  const F = (s, px, max = 700, fam = 'Cinzel') => { g.font = `700 ${px}px ${fam}`; while (g.measureText(s).width > max && px > 30) { px -= 4; g.font = `700 ${px}px ${fam}`; } return `700 ${px}px ${fam}`; };
  const T1 = { color: YEL, box: true, boxColor: BOX, pad: 24 };
  if (i === 0) TXT.count(0, 300, SX, 1180, t, .05, Math.max(.8, at(0, .8)), { ...T1, font: F('300 PAGES SANS « E » ?', 64), fmt: n => `${Math.round(n)} PAGES SANS « E » ?` });
  if (i === 1 && t >= at(1, .25)) TXT.slam('1969 : LA DISPARITION', SX, 560, t, at(1, .25), { ...T1, font: F('1969 : LA DISPARITION', 70) });
  if (i === 2 && t >= at(2, .45)) { const [ox, oy] = scr(c, 204, 196); TXT.pop('!', Math.min(800, ox), Math.max(500, oy), t, at(2, .45), { font: '700 120px Cinzel', color: RED, stroke: 10, strokeColor: '#0a0a0e' }); }
  if (i === 3) {
    const [kx, ky] = scr(c, EKX, EKY - 30 * ub(t, 3, .5, .8, 'out'));
    if (t >= at(3, .2)) { g.font = `700 ${Math.round(40 * c.z)}px Cinzel`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff6e0'; g.fillText('E', kx, ky + 2); }
    if (t >= at(3, .55)) TXT.stamp('INTERDITS', SX, 540, t, at(3, .55), { font: F('INTERDITS', 84), color: RED, rot: -.08 });
    TXT.rise('LE · ET · JE · ELLE', SX, 1180, t, at(3, .05), { ...T1, font: F('LE · ET · JE · ELLE', 72), stagger: .16 });
  }
  if (i === 4 && t >= at(4, .15)) TXT.type("D'AUTRES MOTS", SX, 560, t, at(4, .15), { ...T1, color: '#2b2b3a', boxColor: 'rgba(243,234,214,.92)', font: F("D'AUTRES MOTS", 80), cps: 18 });
  if (i === 5) {   // son nom s'écrit, et ses E se font barrer
    const NAME = 'GEORGES PEREC'; g.font = F(NAME, 84); g.textAlign = 'left'; g.textBaseline = 'middle';
    const ws = [...NAME].map(ch => g.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0); let x = SX - tot / 2, ne = 0;
    g.fillStyle = BOX; g.fillRect(x - 24, 500, tot + 48, 120);
    [...NAME].forEach((ch, k) => { const a = ub(t, 5, .05 + k * .025, .12 + k * .025); if (a > 0) { g.globalAlpha = a; g.fillStyle = ch === 'E' ? RED : PAPERW; g.fillText(ch, x, 562); g.globalAlpha = 1;
      if (ch === 'E') { TXT.strike(x - 6, 590, x + ws[k] + 6, 530, t, at(5, .45 + ne * .06), { color: YEL, w: 9, d: .15 }); ne++; } } x += ws[k]; });
    if (t >= at(5, .5)) TXT.highlight('SON PROPRE NOM', SX, 690, t, at(5, .5), { color: PAPERW, font: F('SON PROPRE NOM', 64), mark: 'rgba(224,74,58,.75)' });
  }
  if (i === 6 && t >= at(6, .2)) TXT.focus('ANTON VOYL A DISPARU', SX, 560, t, at(6, .2), { ...T1, font: F('ANTON VOYL A DISPARU', 66), d: .5 });
  if (i === 7 && t >= at(7, .3)) TXT.pop('RIEN REMARQUÉ ?', SX, 560, t, at(7, .3), { ...T1, font: F('RIEN REMARQUÉ ?', 80), rot: -.03 });
  if (i === 9 && t >= at(9, .5)) TXT.stamp('300 PAGES, ZÉRO « E »', SX, 560, t, at(9, .5), { font: F('300 PAGES, ZÉRO « E »', 70, 640), color: YEL, rot: -.06, box: true, boxColor: BOX });
}

export function events(add) {
  add('chapter', .05); add('slap', at(1, .25)); add('chime', at(2, 0)); add('slap', at(2, .45));
  add('zoom', at(3, 0), { d: at(3, .3) - at(3, 0) }); add('bulb', at(3, .2)); add('slap', at(3, .55));
  add('cross', at(5, .45)); add('cross', at(5, .57)); add('zoom', at(7, 0), { d: .3 }); add('chime', at(8, 0)); add('bulb', at(8, .3)); add('slap', at(9, .5));
}
