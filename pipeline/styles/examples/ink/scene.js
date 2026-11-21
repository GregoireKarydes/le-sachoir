// Scène réalisée pour « La Grande Muraille se voit-elle depuis l'espace ? » — Chinese Ink Wash.
// Exemple de réalisation par vidéo : aucun décor tout fait ; chaque plan a son cadrage, son mouvement et son texte.
// Découpage PREP (un plan par réplique ; les temps viennent de la voix, via at(i, fraction)) :
//  0 question   image 1 : le pinceau trace déjà la muraille en très gros plan ; la caméra suit la tête du trait puis
//               recule d'un coup : la crête entière, beaucoup de papier vide (suivi + recul)
//  1 POINT      recul vertigineux jusqu'à l'espace : le paysage devient une miette dans un cercle d'encre ; « visible ? » barré
//  2 RAISON     travelling latéral : la muraille se peint devant la caméra pendant qu'un compteur défile
//  3 RAISON     gros plan sur un tronçon : une charrette roule sur la muraille, une règle d'encre mesure « ≈ 6 m »
//  4 RAISON     travelling avant dans trois couches de brume (parallaxe) ; le trait de la muraille pâlit jusqu'au ton des monts
//  5 EXEMPLE    plan fixe qui casse le rythme : un cheveu peint d'un bord à l'autre, « 1 km » au bout d'une flèche
//  6 EXEMPLE    panoramique vertical vers le ciel, une capsule passe ; « il ne l'a pas vue » claque
//  7 POINT      retour au cadre de la fin du plan 0, le sceau rouge se pose (seule couleur), puis la page « pub » du moteur
import { g, W, H, B, at, ub, prog, camera, look, reset, shake, TXT, lerp } from '../kit.js';
import { KIT } from '../ink.js';
const { brush, ridge, mountain, seal, TONE, INKC, paper } = KIT;

export const FONTS = ['700 120px "Cormorant Garamond"', 'italic 600 70px "Cormorant Garamond"'];
const INK = `rgba(${INKC},.95)`;

// le monde (unités du tableau) : peu de matière, beaucoup de vide
const FAR = ridge(-900, 3600, 700, 420, 21, 26), MID = ridge(-900, 3600, 900, 360, 22, 22), NEAR = ridge(-900, 3600, 1060, 300, 23, 16);
const WALL = NEAR.map(([x, y]) => [x, y - 18]);
const L = (() => { let s = 0; const o = [0]; for (let k = 1; k < WALL.length; k++) { s += Math.hypot(WALL[k][0] - WALL[k - 1][0], WALL[k][1] - WALL[k - 1][1]); o.push(s); } return o; })();
/** la tête du trait de la muraille quand il est peint à la fraction p */
const head = p => { const s = p * L[L.length - 1]; let k = 1; while (k < L.length - 1 && L[k] < s) k++; const u = (s - L[k - 1]) / (L[k] - L[k - 1] || 1); return [lerp(WALL[k - 1][0], WALL[k][0], u), lerp(WALL[k - 1][1], WALL[k][1], u)]; };
const wallP = t => t < at(2, 0) ? lerp(.12, .32, Math.min(1, t / (B(0).d * .55))) : lerp(.32, 1, prog(t, at(2, 0), at(2, .95)));
const SEG = head(.52);   // le tronçon du plan 4

const keys = [
  [at(0, .5), { x: 540, y: 900, z: 1, e: 'out' }],
  [at(0, 1), { x: 540, y: 880, z: 1 }],
  [at(1, .1), { x: 540, y: 880, z: 1 }],
  [at(1, .7), { x: 1350, y: 900, z: .09, e: 'in' }],                            // le recul jusqu'à l'espace
  [at(1, 1), { x: 1350, y: 900, z: .09 }],
  [at(2, 0), { x: 560, y: 860, z: 1.25, e: 'cut' }],
  [at(2, 1), { x: 2300, y: 820, z: 1.25, e: 'lin' }],                           // travelling latéral
  [at(3, 0), { x: SEG[0] - 40, y: SEG[1] - 40, z: 4.2, e: 'cut' }],
  [at(3, 1), { x: SEG[0] + 120, y: SEG[1] - 30, z: 3.6, e: 'lin' }],
  [at(4, 0), { x: 1150, y: 700, z: .95, e: 'cut' }],
  [at(4, 1), { x: 1300, y: 880, z: 1.4 }],                                      // travelling avant dans la brume
  [at(5, 0), { x: 1300, y: 880, z: 1.4 }],
  [at(6, .05), { x: 1300, y: 880, z: 1.4 }],
  [at(6, .6), { x: 1350, y: 380, z: 1.15 }],                                    // panoramique vertical vers le ciel
  [at(6, 1), { x: 1350, y: 380, z: 1.15 }],
  [at(7, .05), { x: 1350, y: 380, z: 1.15 }],
  [at(7, .65), { x: 540, y: 880, z: 1 }],
];
const cam = camera(keys);

export function draw(t) {
  reset(); g.drawImage(paper(), 0, 0);
  // plan 0 : la caméra suit la tête du trait (très gros plan), puis rejoint les clés
  let c = cam(t);
  if (t < at(0, .5)) { const h = head(wallP(t)), u = Math.min(1, t / (B(0).d * .5)), k = u * u; const z = Math.exp(lerp(Math.log(3.4), Math.log(1), k)); c = { x: lerp(h[0] - 60, 540, k), y: lerp(h[1] - 40, 900, k), z, r: lerp(-.05, 0, k) }; }
  const [sx, sy] = t > at(1, .72) && t < at(1, .9) ? shake(t, 14, 30) : [0, 0];
  look({ ...c, x: c.x + sx / c.z, y: c.y + sy / c.z });
  g.globalCompositeOperation = 'multiply';
  const mist = ub(t, 4, 0, 1, 'io');
  // les monts : peints derrière le trait, ils restent ; dans la brume, parallaxe
  g.save(); g.translate(-mist * 160, 0); mountain(g, FAR, 380, TONE.qing, prog(t, at(0, .35), at(0, .95)), 21); g.restore();
  g.save(); g.translate(-mist * 80, 0); mountain(g, MID, 360, TONE.dan, prog(t, at(0, .45), at(1, .1)), 22); g.restore();
  mountain(g, NEAR, 300, lerp(TONE.zhong, TONE.dan, mist), prog(t, 0, at(0, .7)), 23, true);
  // la muraille : un seul trait, créneaux et tours suivent la tête
  const wp = wallP(t), wt = lerp(TONE.jiao, TONE.dan * 1.15, mist);
  brush(g, WALL, 22, wt, { prog: wp, dry: .4, seed: 9, bristles: 18 });
  for (let k = 3; k < WALL.length - 2; k += 4) { if (k / WALL.length > wp) break; const [x, y] = WALL[k]; brush(g, [[x, y - 6], [x, y - 24]], 6, wt * .9, { dry: .2, seed: k }); }
  for (const f of [.2, .41, .63, .85]) if (f < wp) { const [x, y] = head(f); g.fillStyle = `rgba(${INKC},${.8 * (1 - mist * .6)})`; g.fillRect(x - 15, y - 52, 30, 40); }
  // plan 4 : une charrette sur la muraille et la règle « ≈ 6 m »
  if (t >= at(3, 0) && t < at(4, 0)) {
    const u = ub(t, 3, .05, .95), cx = SEG[0] - 70 + u * 200, cy = SEG[1] - 30;
    brush(g, [[cx - 22, cy - 6], [cx + 22, cy - 6]], 10, TONE.nong, { dry: .1, seed: 61 });
    for (const dx of [-14, 14]) { g.strokeStyle = `rgba(${INKC},.85)`; g.lineWidth = 3; g.beginPath(); g.arc(cx + dx, cy, 6, 0, 7); g.stroke(); }
    const r = prog(t, at(3, .3), at(3, .6), 'out'), x0 = SEG[0] + 70;
    brush(g, [[x0, SEG[1] - 46], [x0, SEG[1] - 46 + 40 * r]], 3, TONE.jiao, { dry: 0, seed: 62 });
    for (const y of [SEG[1] - 46, SEG[1] - 6]) brush(g, [[x0 - 8, y], [x0 + 8, y]], 3, TONE.jiao, { prog: r, seed: 63 });
  }
  // plan 3 : le cercle de la Terre peint autour du paysage devenu minuscule
  if (t >= at(1, .4) && t < at(2, 0)) {
    const e = prog(t, at(1, .4), at(1, .75), 'out'), R = 5600, P = [];
    for (let k = 0; k <= 90; k++) { const a = -2.2 + k / 90 * Math.PI * 2.06; P.push([1350 + Math.cos(a) * R, 900 + Math.sin(a) * R]); }
    brush(g, P, 260, TONE.nong, { prog: e, dry: .5, seed: 77, bristles: 22 });
  }
  // la lune, un cercle vide, au-dessus des monts
  if (t >= at(5, .9)) { g.strokeStyle = `rgba(${INKC},${.42 * prog(t, at(5, .9), at(6, .4))})`; g.lineWidth = 6; g.beginPath(); g.arc(1460, 250, 120, 0, 7); g.stroke(); }
  if (t >= at(6, .3) && t < at(7, 0)) { const u = ub(t, 6, .3, 1), cx = lerp(1000, 1700, u), cy = 420 - u * 60;     // la capsule de l'astronaute
    brush(g, [[cx - 26, cy], [cx + 26, cy - 4]], 22, TONE.nong, { dry: .1, seed: 88 }); brush(g, [[cx - 70, cy + 4], [cx - 30, cy + 2]], 6, TONE.dan, { dry: .6, seed: 89 }); }
  g.globalCompositeOperation = 'source-over';

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  const ink = { font: '700 112px "Cormorant Garamond"', color: INK };
  if (t >= at(1, .3) && t < at(2, 0)) {
    TXT.focus('visible ?', W / 2, 620, t, at(1, .3), ink);
    const k = prog(t, at(1, .76), at(1, .9));
    if (k > 0) { g.globalCompositeOperation = 'multiply'; brush(g, [[W / 2 - 260, 660], [W / 2 + 260, 570]], 26, TONE.jiao, { prog: k, dry: .35, seed: 5, bristles: 14 }); g.globalCompositeOperation = 'source-over'; }
  }
  if (t >= at(2, .1) && t < at(3, 0)) TXT.count(0, 20000, W / 2, 620, t, at(2, .1), B(2).d * .7, { ...ink, fmt: n => (n > 19900 ? '+ de 20 000 km' : `${(Math.round(n / 100) * 100).toLocaleString('fr-FR')} km`) });
  if (t >= at(3, .45) && t < at(4, 0)) TXT.rise('≈ 6 m : une route', W / 2, 470, t, at(3, .45), { font: 'italic 600 84px "Cormorant Garamond"', color: INK, stagger: .12 });
  if (t >= at(4, .3) && t < at(5, 0)) TXT.highlight('la couleur du paysage', W / 2, 600, t, at(4, .3), { font: 'italic 600 76px "Cormorant Garamond"', color: INK, mark: 'rgba(30,26,24,.12)' });
  if (t >= at(5, 0) && t < at(6, 0)) {                               // l'exemple : un cheveu, et un kilomètre
    reset(); g.fillStyle = '#efe7d6'; g.globalAlpha = prog(t, at(5, 0), at(5, .1)); g.fillRect(0, 460, W, 820); g.globalAlpha = 1;
    g.globalCompositeOperation = 'multiply';
    const h = []; for (let k = 0; k <= 40; k++) { const x = 80 + k * 23; h.push([x, 760 + Math.sin(k * .35) * 26]); }
    brush(g, h, 3, TONE.jiao, { prog: prog(t, at(5, .05), at(5, .4), 'out'), dry: 0, seed: 91, bristles: 3 });
    brush(g, [[160, 980], [920, 980]], 4, TONE.nong, { prog: prog(t, at(5, .35), at(5, .6)), dry: .2, seed: 92 });
    g.globalCompositeOperation = 'source-over';
    TXT.type('un cheveu… à 1 km', W / 2, 1090, t, at(5, .45), { font: 'italic 600 80px "Cormorant Garamond"', color: INK, cps: 24 });
  }
  if (t >= at(6, .5) && t < at(7, 0)) TXT.slam("IL NE L'A PAS VUE", W / 2, 640, t, at(6, .5), { font: '700 92px "Cormorant Garamond"', color: INK });
  if (t >= at(7, .6)) TXT.rise('longue, pas large', W / 2, 640, t, at(7, .6), { ...ink, font: '700 104px "Cormorant Garamond"' });
  if (t >= at(7, .75)) seal(g, 900, 1150, 96, prog(t, at(7, .75), at(7, .85)));
}

export function events(add) {
  add('brush', 0, { d: 1.4 }); add('zoom', at(1, .1), { d: B(1).d * .6 }); add('cross', at(1, .78));
  add('brush', at(2, 0), { d: B(2).d }); add('brush', at(3, .3), { d: .6 }); add('brush', at(5, .05), { d: .8 });
  add('slap', at(6, .5)); add('bulb', at(7, .75));
}
