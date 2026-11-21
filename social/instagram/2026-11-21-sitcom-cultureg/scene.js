// Scène réalisée pour « Pourquoi ton département a cette taille-là ? » — Scale Zoom (21 novembre 2026).
// Fil visuel : l'Hexagone en formes plates sur bleu nuit, pavé de cases de taille égale ; la caméra plonge dans UNE
// case, y suit un cavalier qui fait l'aller-retour pendant qu'un soleil traverse le ciel, puis remonte voir les 83.
//  0 question   la carte pavée, ta case corail qui pulse ; poussée tournante depuis un cadre un peu large
//  1 réponse    poussée rapide sur ta case : un cavalier fait l'aller-retour, la case s'allume
//  2 1790       coupe : avant, des provinces en vrac (taches de toutes tailles) ; lente rotation
//  3 les carrés vue du dessus penchée, travelling : une grille de carrés se trace puis se fait barrer
//  4 la règle   zoom brutal en accélération jusqu'au coin de ta case : le cavalier part
//  5 le retour  plan signature, presque fixe : le soleil traverse le ciel, le cavalier va au chef-lieu et revient,
//               son trajet trace le cercle qui fait la frontière
//  6 les 83     recul vertigineux : toutes les cases s'allument, compteur jusqu'à 83
//  7 les noms   travelling latéral au ras de la carte : une rivière et des montagnes, leurs noms tapés
//  8 boucle     retour au cadre du début, ta case corail ; tampon « UN JOUR À CHEVAL »
import { g, W, H, at, ub, prog, camera, look, reset, TXT, lerp, clamp, hash } from '../kit.js';
import { KIT } from '../zoom.js';
const { disc, glow, stars, blob, guideAt, C, NIGHT, R1, R2, MIST } = KIT;

const SX = 450, SY = 880, YEL = '#f5b62a', CREAM = C.cream[0];
const MX = 540, MY = 860;   // centre de la carte (unités du monde)
const FR = [[-300, -330], [-60, -392], [150, -330], [330, -250], [300, -60], [362, 150], [250, 330], [40, 382], [-160, 330], [-330, 240], [-300, 40], [-382, -140]].map(([x, y]) => [MX + x, MY + y]);
function inside(x, y) { let c = false; for (let i = 0, j = FR.length - 1; i < FR.length; j = i++) { const [xi, yi] = FR[i], [xj, yj] = FR[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
const frPath = () => { g.beginPath(); FR.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };

// les cases : un pavage hexagonal régulier (même taille partout), gardé dans l'Hexagone
const RC = 42, CELLS = [];
for (let row = -12; row <= 12; row++) for (let col = -12; col <= 12; col++) {
  const x = MX + col * Math.sqrt(3) * RC + (row % 2 ? Math.sqrt(3) * RC / 2 : 0), y = MY + row * 1.5 * RC;
  if (inside(x, y)) CELLS.push({ x, y, k: CELLS.length });
}
const SEL = CELLS.reduce((a, c) => (Math.hypot(c.x - 600, c.y - 800) < Math.hypot(a.x - 600, a.y - 800) ? c : a), CELLS[0]);
const hexAt = (x, y, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = (60 * k - 30) * Math.PI / 180; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); };
const CORNER = [SEL.x + Math.cos(150 * Math.PI / 180) * RC, SEL.y + Math.sin(150 * Math.PI / 180) * RC];
const TONES = [C.blue[0], C.blue[1], '#5a63b8', C.mint[1]];

function cells(t, lit, from) {   // lit : 0..1 part des cases allumées (depuis la case SEL vers l'extérieur)
  const dmax = 520;
  for (const c of CELLS) {
    const d = Math.hypot(c.x - SEL.x, c.y - SEL.y), on = clamp((lit * dmax - d) / 60);
    if (on <= 0) continue;
    const isSel = c === SEL, pulse = isSel ? 1 + .06 * Math.sin(t * 7) : 1;
    g.fillStyle = isSel ? C.coral[0] : TONES[Math.floor(hash(c.k * 3.7) * 4)];
    hexAt(c.x, c.y, (RC - 3) * on * pulse); g.fill();
  }
}
function rider(x, y, s, t) {   // le cavalier : un cheval et sa tête, en formes plates
  const hop = Math.abs(Math.sin(t * 14)) * 1.2 * s;
  disc(x, y - hop, 4.2 * s, C.sun); disc(x + 3.2 * s, y - 3.6 * s - hop, 2.1 * s, C.cream);
}
function riderPos(t) {   // fraction 0 (coin) → 1 (chef-lieu) → 0 (retour)
  if (t < at(5, 0)) return .45 * ub(t, 4, .55, 1, 'io');
  if (t < at(5, .4)) return lerp(.45, 1, ub(t, 5, 0, .4, 'io'));
  if (t < at(5, .5)) return 1;
  return 1 - ub(t, 5, .5, .95, 'io');
}

const cam = camera([
  [0, { x: 540, y: 860, z: .92, r: .07 }],
  [at(0, .9), { x: 560, y: 850, z: 1.12, r: 0, e: 'out' }],
  [at(1, .05), { x: 560, y: 850, z: 1.12 }],
  [at(1, .3), { x: SEL.x, y: SEL.y, z: 2.4, e: 'back' }],
  [at(1, .98), { x: SEL.x, y: SEL.y, z: 2.55, e: 'lin' }],
  [at(2, 0), { x: 540, y: 860, z: 1.0, r: -.05, e: 'cut' }],
  [at(2, .98), { x: 540, y: 860, z: 1.07, r: .02, e: 'lin' }],
  [at(3, 0), { x: 470, y: 880, z: 1.3, r: .12, e: 'cut' }],
  [at(3, .98), { x: 630, y: 840, z: 1.3, r: .12, e: 'lin' }],
  [at(4, 0), { x: 540, y: 860, z: 1.0, r: 0, e: 'cut' }],
  [at(4, .55), { x: SEL.x - 8, y: SEL.y + 4, z: 7.0, e: 'in' }],
  [at(4, .98), { x: SEL.x - 6, y: SEL.y + 2, z: 7.2, e: 'lin' }],
  [at(5, .98), { x: SEL.x - 2, y: SEL.y, z: 7.5, e: 'lin' }],
  [at(6, .05), { x: SEL.x - 2, y: SEL.y, z: 7.5 }],
  [at(6, .65), { x: 540, y: 860, z: .98, e: 'io' }],
  [at(6, .98), { x: 540, y: 860, z: .94, e: 'lin' }],
  [at(7, 0), { x: 380, y: 860, z: 1.75, r: -.03, e: 'cut' }],
  [at(7, .98), { x: 720, y: 830, z: 1.75, r: -.03, e: 'lin' }],
  [at(8, .05), { x: 720, y: 830, z: 1.75, r: -.03 }],
  [at(8, .55), { x: 560, y: 850, z: 1.12, r: 0 }],
  [at(8, 1) + 4, { x: 560, y: 850, z: 1.06, r: 0, e: 'lin' }],
]);
const toScreen = (c, x, y) => [SX + (x - c.x) * c.z, SY + (y - c.y) * c.z];

export function draw(t) {
  reset(); g.fillStyle = NIGHT; g.fillRect(0, 0, W, H); stars(5, 90);
  const c = cam(t); look(c, g, SX, SY);
  // la carte : un halo, le fond de l'Hexagone
  g.fillStyle = R1; g.save(); g.translate(MX, MY); g.scale(1.1, 1.1); g.translate(-MX, -MY); frPath(); g.fill(); g.restore();
  g.fillStyle = R2; frPath(); g.fill();
  const era = t < at(2, 0) ? 'now' : t < at(3, 0) ? 'old' : t < at(4, 0) ? 'grid' : 'cells';
  g.save(); frPath(); g.clip();
  if (era === 'now') cells(t, t < at(1, 0) ? lerp(.55, 1, prog(t, 0, at(0, .6), 'out')) : 1);
  else if (era === 'old') {   // avant 1789 : provinces et diocèses qui se chevauchent, de toutes les tailles
    const P = [[380, 640, 170], [690, 600, 120], [560, 820, 210], [330, 980, 140], [760, 960, 190], [560, 1120, 110], [460, 760, 80], [700, 780, 70], [850, 760, 90]];
    P.forEach(([x, y, r], k) => { const pop = clamp(ub(t, 2, 0, .6) * 9 - k); if (pop <= 0) return; const j = Math.sin(t * 3 + k) * 6;
      g.globalAlpha = .9; blob(x + j, y - j, r * pop, k * 7 + 3, [C.sun[0], C.mint[0], C.coral[1], C.cream[1], C.blue[0], MIST][k % 6]); g.globalAlpha = 1; });
  } else if (era === 'grid') {   // le premier projet : des carrés de 70 km de côté
    g.fillStyle = C.blue[1]; g.fillRect(MX - 420, MY - 420, 840, 840);
    const n = Math.floor(ub(t, 3, 0, .5) * 16);
    g.strokeStyle = CREAM; g.lineWidth = 4;
    for (let k = 0; k < Math.min(8, n); k++) { const x = MX - 400 + k * 116; g.beginPath(); g.moveTo(x, MY - 420); g.lineTo(x, MY + 420); g.stroke(); }
    for (let k = 0; k < n - 8; k++) { const y = MY - 400 + k * 116; g.beginPath(); g.moveTo(MX - 420, y); g.lineTo(MX + 420, y); g.stroke(); }
    // les montagnes et les rivières, coupées en deux par la règle
    g.fillStyle = C.cream[1]; for (const [x, y] of [[420, 1040], [470, 1060], [760, 990]]) { g.beginPath(); g.moveTo(x - 40, y + 30); g.lineTo(x, y - 40); g.lineTo(x + 40, y + 30); g.fill(); }
  } else {
    const lit = t < at(6, 0) ? Math.max(.04, ub(t, 4, 0, .3)) : lerp(.1, 1, ub(t, 6, .1, .75, 'out'));
    cells(t, lit);
  }
  g.restore();
  g.strokeStyle = CREAM; g.lineWidth = 5 / Math.max(1, c.z * .5); frPath(); g.stroke();
  // le cercle d'une journée à cheval, autour du chef-lieu (plans 4 à 6)
  if (t >= at(4, .5) && t < at(7, 0)) {
    disc(SEL.x, SEL.y, 6, C.cream); g.fillStyle = NIGHT; g.fillRect(SEL.x - 2.5, SEL.y - 1.5, 5, 4);
    g.fillStyle = C.coral[1]; g.beginPath(); g.moveTo(SEL.x - 5, SEL.y - 3); g.lineTo(SEL.x, SEL.y - 9); g.lineTo(SEL.x + 5, SEL.y - 3); g.fill();
    const rp = riderPos(t), p = [lerp(CORNER[0], SEL.x, rp), lerp(CORNER[1], SEL.y, rp)];
    const reach = t < at(5, .5) ? rp : 1;
    g.fillStyle = YEL; for (let k = 0; k <= 14; k++) { const u = k / 14 * reach; g.beginPath(); g.arc(lerp(CORNER[0], SEL.x, u), lerp(CORNER[1], SEL.y, u), .9, 0, 7); g.fill(); }
    const ring = ub(t, 5, .45, .98, 'io');
    if (ring > 0) { g.strokeStyle = YEL; g.lineWidth = 1.6; g.setLineDash([3, 2.5]); g.beginPath(); g.arc(SEL.x, SEL.y, RC, Math.PI * 150 / 180, Math.PI * 150 / 180 + ring * Math.PI * 2); g.stroke(); g.setLineDash([]); }
    disc(CORNER[0], CORNER[1], 2.2, C.mint);
    rider(p[0], p[1], 1, t);
  }
  // plan 1 : un premier aller-retour, rapide
  if (t >= at(1, .25) && t < at(2, 0)) {
    const u = ub(t, 1, .3, .95, 'io'), f = u < .5 ? u * 2 : 2 - u * 2, p = [lerp(CORNER[0], SEL.x, f), lerp(CORNER[1], SEL.y, f)];
    disc(SEL.x, SEL.y, 6, C.cream); rider(p[0], p[1], 2, t);
  }
  // plan 7 : une rivière, des montagnes, et leurs noms
  if (t >= at(7, 0) && t < at(8, .6)) {
    const rp = ub(t, 7, 0, .6, 'out'), R = [[230, 700], [330, 740], [430, 700], [530, 760], [640, 720], [760, 780], [880, 740]];
    g.strokeStyle = C.mint[0]; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    R.slice(0, Math.max(2, Math.ceil(R.length * rp))).forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    for (const [x, y, k] of [[420, 1040, 0], [470, 1060, 1], [760, 990, 2]]) { const s = clamp(ub(t, 7, .3, .7) * 3 - k); if (s <= 0) continue; g.fillStyle = C.cream[0]; g.beginPath(); g.moveTo(x - 40 * s, y + 30); g.lineTo(x, y + 30 - 70 * s); g.lineTo(x + 40 * s, y + 30); g.fill(); g.fillStyle = C.cream[1]; g.beginPath(); g.moveTo(x, y + 30 - 70 * s); g.lineTo(x + 40 * s, y + 30); g.lineTo(x + 8 * s, y + 30); g.fill(); }
    g.font = '700 34px Jost'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = CREAM;
    [['Seine', 380, 790, .25], ['Cher', 600, 815, .45], ['Jura', 760, 935, .65]].forEach(([s, x, y, f]) => { const k = ub(t, 7, f, f + .12, 'back'); if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.fillText(s, 0, 0); g.restore(); });
  }

  // ── écran : le ciel du plan signature, puis le texte animé
  reset();
  if (t >= at(4, .45) && t < at(6, .2)) {
    const s = prog(t, at(4, .5), at(5, .95)), a = Math.PI + Math.PI * s, fade = 1 - ub(t, 6, 0, .2);
    g.globalAlpha = fade; g.strokeStyle = MIST; g.lineWidth = 4; g.setLineDash([8, 14]); g.beginPath(); g.arc(SX, 1120, 400, Math.PI, 2 * Math.PI); g.stroke(); g.setLineDash([]);
    const sx = SX + Math.cos(a) * 400, sy = 1120 + Math.sin(a) * 400;
    glow(sx, sy, 30); disc(sx, sy, 34, s > .82 ? C.coral : C.sun);
    g.font = '600 30px Jost'; g.fillStyle = YEL; g.textAlign = 'center';
    g.fillText('MATIN', SX - 400, 1170); g.fillText('SOIR', SX + 400, 1170); g.globalAlpha = 1;
    if (t >= at(5, .1) && t < at(6, 0)) { const [cx, cy] = toScreen(cam(t), SEL.x, SEL.y); g.font = '700 34px Jost'; g.fillStyle = CREAM; g.globalAlpha = ub(t, 5, .1, .25); g.fillText('CHEF-LIEU', cx, cy + 80); g.globalAlpha = 1; }
  }
  // chaque carton tient dans la zone utile (x 60 à 840) : la police se réduit si besoin
  const F = (s, px, max = 760) => { g.font = `700 ${px}px Jost`; while (g.measureText(s).width > max && px > 36) { px -= 4; g.font = `700 ${px}px Jost`; } return `700 ${px}px Jost`; };
  const T1 = { color: CREAM, box: true, boxColor: NIGHT, pad: 22 };
  if (t < at(1, 0)) TXT.pop('TON DÉPARTEMENT ?', SX, 1180, t, .15, { ...T1, font: F('TON DÉPARTEMENT ?', 80) });
  if (t >= at(1, .3) && t < at(2, 0)) TXT.slam('1 JOUR À CHEVAL', SX, 560, t, at(1, .3), { font: F('1 JOUR À CHEVAL', 96), color: NIGHT, box: true, boxColor: YEL });
  if (t >= at(2, .2) && t < at(3, 0)) TXT.rise('1790 : ON REDÉCOUPE', SX, 560, t, at(2, .2), { ...T1, box: false, stroke: 12, strokeColor: NIGHT, font: F('1790 : ON REDÉCOUPE', 86) });
  if (t >= at(3, .08) && t < at(4, 0)) {
    const f3 = F('CARRÉS DE 70 KM', 88);
    TXT.type('CARRÉS DE 70 KM', SX, 560, t, at(3, .08), { ...T1, font: f3, cps: 22 });
    g.font = f3; const w = g.measureText('CARRÉS DE 70 KM').width;
    TXT.strike(SX - w / 2 - 20, 590, SX + w / 2 + 20, 530, t, at(3, .62), { color: C.coral[0], w: 14 });
    if (t >= at(3, .66)) TXT.pop('ABANDONNÉ', SX, 690, t, at(3, .66), { font: '700 64px Jost', color: C.coral[0], box: true, boxColor: NIGHT });
  }
  if (t >= at(4, .15) && t < at(5, 0)) TXT.focus('DU COIN LE PLUS LOINTAIN', SX, 560, t, at(4, .15), { ...T1, font: F('DU COIN LE PLUS LOINTAIN', 70), d: .4 });
  if (t >= at(5, .15) && t < at(6, 0)) TXT.highlight('ALLER-RETOUR EN 1 JOUR', SX, 560, t, at(5, .15), { color: CREAM, stroke: 12, strokeColor: NIGHT, font: F('ALLER-RETOUR EN 1 JOUR', 74), mark: 'rgba(245,182,42,.9)' });
  if (t >= at(6, .3) && t < at(7, 0)) TXT.count(0, 83, SX, 560, t, at(6, .3), Math.max(.6, at(6, .85) - at(6, .3)), { ...T1, font: F('83 DÉPARTEMENTS', 96), fmt: n => `${Math.round(n)} DÉPARTEMENTS` });
  if (t >= at(7, .05) && t < at(8, 0)) TXT.type('RIVIÈRES ET MONTAGNES', SX, 560, t, at(7, .05), { ...T1, font: F('RIVIÈRES ET MONTAGNES', 78), cps: 24 });
  if (t >= at(7, .55) && t < at(8, .4)) guideAt(700, 1140, .55, t, [-.6, -.5], 0);   // l'ampoule du Sachoir, cachée une fois
  if (t >= at(8, .5)) TXT.stamp('UN JOUR À CHEVAL', SX, 1180, t, at(8, .5), { font: F('UN JOUR À CHEVAL', 78, 680), color: YEL, rot: -.05, box: true, boxColor: NIGHT });
}

export function events(add) {
  add('zoom', at(1, .05), { d: .5 }); add('slap', at(1, .3)); add('cut', at(2, 0)); add('cross', at(3, .62));
  add('zoom', at(4, 0), { d: at(4, .55) - at(4, 0) }); add('chime', at(5, .4)); add('chime', at(5, .95));
  add('zoom', at(6, .05), { d: .8 }); add('bulb', at(7, .55)); add('slap', at(8, .5));
}
