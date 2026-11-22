// Scène réalisée pour « Pourquoi on dit « chauvin » ? » — Comic History (22 novembre 2026).
// Fil visuel : une grande feuille de papier posée sur une table ; la caméra passe du bar d'aujourd'hui (case 1) à une
// carte gravée de la France où le soldat n'est d'abord qu'un contour en pointillés, puis aux registres de l'armée, puis
// à un petit théâtre de papier de 1831, avant de revenir au bar.
//  0 accroche   gros plan penché sur la case du bar, recul rapide et redressé ; « « CHAUVIN » » claque
//  1 curiosité  filé latéral vers la carte : un contour vide en pointillés, un « ? » rouge (travelling latéral)
//  2 verrou     insert en vue penchée sur un ballon de papier et une écharpe tricolore, poussée lente
//  3 POINT      coupe large puis zoom brutal avec rebond : la marionnette CHAUVIN tombe dans le contour
//  4 raison     caméra à l'épaule : 17 bandages se plaquent un à un, compteur 0 → 17
//  5 raison     vue du dessus, panoramique vertical sur le registre de l'armée ; la loupe ne trouve rien, tampon
//  6 exemple    plan large du théâtre de papier, les rideaux s'ouvrent (travelling avant lent)
//  7 réplique   contre-plongée penchée sur Chauvin en scène ; sa bulle se tape lettre à lettre
//  8 signature  le public rit (secousses) ; l'étiquette « CHAUVIN » se décolle de la marionnette, vole et devient
//               le mot « chauvin » du dictionnaire ; recul qui la suit
//  9 boucle     long retour au bar du début (case 8, même cadre que le plan 0)
import { g, W, H, TL, at, ub, prog, camera, look, reset, shake, whip, talk, TXT, lerp, clamp, hash } from '../kit.js';
import { IMG, bulb, YELLOW } from '../core.js';
import { KIT } from '../comic.js';
const { coast, land, graticule, compass, pin, puppet, patchOf, PAPER, INK, SEA, RED, BRASS, LAND, tex } = KIT;

const SX = 450, SY = 860;   // le point regardé arrive ici (hors de la zone couverte à droite)
const src = i => { const b = TL.beats[i]; return b && b.img && IMG[b.img] ? b.img : null; };
const BLUE = '#2f4f9a', CREAM = '#f4ead2';
const BAR = { x: 500, y: 540, w: 624, h: 456 };      // la case du bar (plans 0 et 9)
const MAP = { x: 1050, y: 430, w: 1000, h: 900 };    // la carte gravée (plans 1, 3, 4)
const FR = coast(1550, 800, 330, 290, 5);
const PUP = { x: 1500, y: 1090 };
const BALL = { x: 2480, y: 640 };
const LG = { x: 1150, y: 1480, w: 700, h: 1000 };    // le registre (plan 5)
const ST = { x: 50, y: 1880, w: 760, h: 540 };       // l'ouverture de la scène (plans 6 à 8)
const DICT = { x: 830, y: 2120, w: 400, h: 300 };    // la fiche du dictionnaire (plan 8)
const CH = { name: 'CHAUVIN', color: '#3E5C9A' };

function bicorne(x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#1d1a17'; g.beginPath(); g.ellipse(0, 0, 150, 52, 0, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = CREAM; g.lineWidth = 6; g.stroke();
  for (const [r, col] of [[30, BLUE], [20, CREAM], [10, RED]]) { g.fillStyle = col; g.beginPath(); g.arc(70, -18, r, 0, 7); g.fill(); }
  g.restore();
}
function chauvin(x, y, s, t, o = {}) {
  puppet({ name: o.noName ? '' : CH.name, color: CH.color }, x, y, s, t, { emo: o.emo || 'fier', active: !!o.active, talk: o.talk || 0, face: 1 });
  bicorne(x, y - 378 * s, s);
}
const BD = Array.from({ length: 17 }, (_, k) => [(hash(k * 3.7) - .5) * 160, -80 - hash(k * 5.1) * 300, (hash(k * 9.3) - .5) * 1.6, 70 + hash(k * 2.2) * 50]);
function bandages(x, y, t) {
  if (t < at(4, .1)) return;
  for (let k = 0; k < 17; k++) {
    const a = lerp(at(4, .1), at(4, .85), k / 16); if (t < a) break;
    const [dx, dy, r, w] = BD[k], u = clamp((t - a) / .12), sc = 1 + .8 * (1 - u);
    g.save(); g.translate(x + dx, y + dy); g.rotate(r); g.scale(sc, sc);
    g.fillStyle = '#fbf8f0'; g.fillRect(-w / 2, -13, w, 26); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(-w / 2, -13, w, 26);
    g.strokeStyle = 'rgba(43,34,25,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w / 2 + 10, -4); g.lineTo(w / 2 - 10, -4); g.moveTo(-w / 2 + 10, 5); g.lineTo(w / 2 - 10, 5); g.stroke();
    g.restore();
  }
}
function patchAt(s, cx, cy, w, h, rot) {
  if (!s) return;
  g.save(); g.translate(cx, cy); g.rotate(rot);
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(-w / 2 - 4, -h / 2 - 4, w + 28, h + 28);
  g.fillStyle = CREAM; g.fillRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28);
  g.drawImage(patchOf(s), -w / 2, -h / 2, w, h);
  g.setLineDash([10, 8]); g.strokeStyle = 'rgba(43,34,25,.6)'; g.lineWidth = 2; g.strokeRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14); g.setLineDash([]);
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28);
  pin(0, -h / 2 - 2);
  g.restore();
}
function ball(x, y, t) {
  const r = 120;
  g.save(); g.translate(x - 40, y + 150); g.rotate(-.18);
  [BLUE, CREAM, RED].forEach((col, k) => { g.fillStyle = col; g.fillRect(-260 + k * 173.3, -34, 173.3, 68); });
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-260, -34, 520, 68); g.restore();
  g.fillStyle = 'rgba(43,34,25,.28)'; g.beginPath(); g.ellipse(x + 20, y + r - 6, r * .9, 22, 0, 0, 7); g.fill();
  g.save(); g.translate(x, y); g.rotate(t * 1.2);
  g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
  g.fillStyle = INK;
  const pent = (px, py, s) => { g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; g.lineTo(px + Math.cos(a) * s, py + Math.sin(a) * s); } g.closePath(); g.fill(); };
  pent(0, 0, 34); for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + k * 2 * Math.PI / 5; pent(Math.cos(a) * 90, Math.sin(a) * 90, 20); }
  g.restore();
}
function ledger(t) {
  const { x, y, w, h } = LG;
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(x + 14, y + 14, w, h); g.fillStyle = '#efe3c4'; g.fillRect(x, y, w, h);
  g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x, y, w, h);
  g.font = '700 44px "Old Standard TT"'; g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("REGISTRES DE L'ARMÉE", x + w / 2, y + 70);
  g.fillRect(x + 60, y + 108, w - 120, 3);
  g.textAlign = 'left';
  for (let k = 0; k < 16; k++) {
    const ry = y + 160 + k * 52;
    g.fillStyle = 'rgba(43,34,25,.55)'; g.font = '700 26px "Old Standard TT"'; g.fillText(String(k + 1), x + 50, ry);
    g.fillStyle = 'rgba(43,34,25,.32)'; g.fillRect(x + 110, ry - 8, 200 + hash(k * 4.4) * 330, 14);
  }
  const u = ub(t, 5, .05, .7, 'io'), lx = x + 380 + Math.sin(u * 9) * 60, ly = lerp(y + 170, y + 900, u);
  g.strokeStyle = BRASS; g.lineWidth = 16; g.beginPath(); g.arc(lx, ly, 95, 0, 7); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fill();
  g.strokeStyle = '#6e4630'; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx + 70, ly + 70); g.lineTo(lx + 170, ly + 170); g.stroke(); g.lineCap = 'butt';
}
function theatre(t) {
  const { x, y, w, h } = ST, open = ub(t, 6, .05, .5, 'out');
  g.fillStyle = '#4a221c'; g.fillRect(x - 70, y - 110, w + 140, h + 200);
  g.fillStyle = '#e9dcc0'; g.fillRect(x, y, w, h);
  const s = src(6); if (s) { g.globalAlpha = .85; g.drawImage(patchOf(s), x + 30, y + 30, w - 60, h - 170); g.globalAlpha = 1; }
  g.fillStyle = '#8a5a3c'; g.fillRect(x, y + h - 120, w, 120); g.fillStyle = '#6e4630'; g.fillRect(x, y + h - 120, w, 12);
  // le tambour
  const dx = x + w * .66, dy = y + h - 70;
  g.fillStyle = BLUE; g.fillRect(dx - 60, dy - 70, 120, 70); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(dx - 60, dy - 70, 120, 70);
  g.strokeStyle = CREAM; g.lineWidth = 4; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(dx - 60 + k * 40, dy - 70); g.lineTo(dx - 40 + k * 40, dy); } g.stroke();
  g.fillStyle = CREAM; g.beginPath(); g.ellipse(dx, dy - 70, 60, 16, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  // Chauvin en scène
  const speaking = t >= at(7, 0) && t < at(8, 0);
  chauvin(x + w * .42, y + h - 30, .72, t, { emo: 'fier', active: speaking, talk: speaking ? talk(t) : 0, noName: t >= at(8, .25) });
  // les rideaux
  const cw = (w / 2) * (1 - .82 * open);
  for (const side of [0, 1]) {
    const cx0 = side ? x + w - cw : x;
    g.fillStyle = RED; g.fillRect(cx0, y, cw, h - 20);
    g.strokeStyle = 'rgba(60,15,10,.45)'; g.lineWidth = 4;
    for (let k = 1; k < 6; k++) { const lx = cx0 + k * cw / 6; g.beginPath(); g.moveTo(lx, y); g.lineTo(lx, y + h - 20); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(cx0, y, cw, h - 20);
  }
  g.fillStyle = '#a8352b'; g.fillRect(x - 20, y - 40, w + 40, 80);
  for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(x - 20 + (k + .5) * (w + 40) / 10, y + 40, (w + 40) / 20, 0, Math.PI); g.fill(); }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x - 20, y - 40, w + 40, 80);
  for (let k = 0; k < 9; k++) { g.fillStyle = YELLOW; g.beginPath(); g.arc(x + 40 + k * (w - 80) / 8, y + h - 8, 12, 0, 7); g.fill(); }
}
function audience(t) {
  const laugh = t >= at(8, 0) && t < at(9, 0) ? 1 : 0;
  for (let k = 0; k < 9; k++) {
    const hx = ST.x - 30 + k * 105, hy = ST.y + ST.h + 120 - Math.abs(Math.sin(t * 13 + k * 1.7)) * 22 * laugh;
    g.fillStyle = '#2b2219'; g.beginPath(); g.arc(hx, hy, 46, 0, 7); g.fill();
    g.fillRect(hx - 50, hy + 30, 100, 90);
    if (k % 2 === 0) { g.fillRect(hx - 34, hy - 110, 68, 80); g.fillRect(hx - 56, hy - 40, 112, 14); }
  }
}
function dict(t) {
  if (t < at(8, 0)) return;
  const { x, y, w, h } = DICT, u = ub(t, 8, 0, .2, 'out');
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(.03); g.scale(.6 + .4 * u, .6 + .4 * u); g.globalAlpha = u;
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(-w / 2 + 12, -h / 2 + 12, w, h); g.fillStyle = '#fbf3df'; g.fillRect(-w / 2, -h / 2, w, h);
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-w / 2, -h / 2, w, h);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 400 34px "IM Fell English"'; g.fillText('Dictionnaire', 0, -h / 2 + 42);
  g.fillRect(-w / 2 + 40, -h / 2 + 70, w - 80, 2);
  if (t >= at(8, .62)) {
    const k = clamp((t - at(8, .62)) / .15);
    g.save(); g.scale(1 + .4 * (1 - k), 1 + .4 * (1 - k)); g.font = '700 68px "Old Standard TT"'; g.fillText('chauvin', 0, -10); g.restore();
    g.font = 'italic 400 38px "IM Fell English"'; g.globalAlpha = k * u; g.fillText('patriote aveugle', 0, 66);
  }
  g.restore();
  if (t >= at(8, .72)) { g.save(); g.globalAlpha = ub(t, 8, .72, .85); bulb(x + w - 44, y + 52, .5, { ink: INK, fill: YELLOW }); g.restore(); }
}
function label(t) {
  if (t < at(8, .25) || t >= at(8, .62)) return;
  const u = ub(t, 8, .25, .62, 'io'), p0 = [ST.x + ST.w * .42, ST.y + ST.h - 30 - 140 * .72], p1 = [DICT.x + DICT.w / 2, DICT.y + DICT.h / 2 - 10];
  const x = lerp(p0[0], p1[0], u), y = lerp(p0[1], p1[1], u) - Math.sin(u * Math.PI) * 260, s = 1 + .5 * Math.sin(u * Math.PI);
  g.save(); g.translate(x, y); g.rotate(Math.sin(u * Math.PI * 2) * .5); g.scale(s, s);
  g.font = '400 44px "Lilita One"'; const tw = g.measureText('CHAUVIN').width + 40;
  g.fillStyle = 'rgba(43,34,25,.3)'; g.fillRect(-tw / 2 + 8, -24, tw, 64);
  g.fillStyle = YELLOW; g.fillRect(-tw / 2, -32, tw, 64); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-tw / 2, -32, tw, 64);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CHAUVIN', 0, 3);
  g.restore();
}

const cam = camera([
  [0, { x: 470, y: 500, z: 2.3, r: -.09 }],
  [at(0, .85), { x: 500, y: 540, z: 1.15, r: 0, e: 'out' }],
  [at(1, .02), { x: 510, y: 540, z: 1.15 }],
  [at(1, .2), { x: 1480, y: 860, z: 1.0, e: 'io' }],
  [at(1, 1), { x: 1580, y: 860, z: 1.0, e: 'lin' }],
  [at(2, 0), { x: 2480, y: 660, z: 1.9, r: .14, e: 'cut' }],
  [at(2, 1), { x: 2470, y: 650, z: 2.3, r: .18, e: 'lin' }],
  [at(3, 0), { x: 1500, y: 860, z: .9, r: 0, e: 'cut' }],
  [at(3, .35), { x: 1500, y: 860, z: 1.35, e: 'back' }],
  [at(3, 1), { x: 1500, y: 860, z: 1.4, e: 'lin' }],
  [at(4, 0), { x: 1480, y: 820, z: 1.45, r: -.05, e: 'cut' }],
  [at(4, 1), { x: 1520, y: 820, z: 1.5, r: .04, e: 'lin' }],
  [at(5, 0), { x: 1500, y: 1650, z: 1.2, r: 0, e: 'cut' }],
  [at(5, .7), { x: 1500, y: 2150, z: 1.2, e: 'io' }],
  [at(5, 1), { x: 1500, y: 2150, z: 1.22, e: 'lin' }],
  [at(6, 0), { x: 420, y: 2150, z: .72, e: 'cut' }],
  [at(6, 1), { x: 420, y: 2150, z: .9, e: 'lin' }],
  [at(7, 0), { x: 420, y: 2150, z: 1.8, r: .05, e: 'cut' }],
  [at(7, 1), { x: 410, y: 2140, z: 1.95, r: .04, e: 'lin' }],
  [at(8, 0), { x: 420, y: 2200, z: 1.5, r: 0, e: 'cut' }],
  [at(8, .7), { x: 760, y: 2250, z: .62, e: 'out' }],
  [at(8, 1), { x: 770, y: 2250, z: .62, e: 'lin' }],
  [at(9, .05), { x: 770, y: 2250, z: .62 }],
  [at(9, .45), { x: 500, y: 540, z: 1.15, e: 'io' }],
  [at(9, 1) + 4, { x: 500, y: 540, z: 1.08, e: 'lin' }],
]);

export function draw(t) {
  const T = tex();
  reset(); g.fillStyle = '#7B6A57'; g.fillRect(0, 0, W, H);
  const wx = whip(t, at(1, .1), .34, 1) + whip(t, at(9, .22), .36, -1);
  const c = cam(t);
  let hx = 0, hy = 0;
  if (t >= at(4, 0) && t < at(5, 0)) [hx, hy] = shake(t, 9, 5, 2);
  else if (t >= at(8, .05) && t < at(8, .8)) [hx, hy] = shake(t, 6, 9, 5);
  look({ ...c, x: c.x - wx / c.z + hx / c.z, y: c.y + hy / c.z }, g, SX, SY);
  g.fillStyle = T.table; g.fillRect(-1500, -1500, 6000, 6000);
  g.fillStyle = 'rgba(30,20,10,.35)'; g.fillRect(-42, 198, 2900, 2500);
  g.fillStyle = PAPER; g.fillRect(-60, 180, 2900, 2500);

  // le bar d'aujourd'hui (case 1, puis case 8 pour la boucle)
  patchAt(t >= at(9, 0) ? (src(9) || src(0)) : src(0), BAR.x, BAR.y, BAR.w, BAR.h, -.03);

  // la carte gravée
  g.fillStyle = SEA; g.fillRect(MAP.x, MAP.y, MAP.w, MAP.h); graticule(MAP);
  land(FR, LAND[0], 'FRANCE', 1720, 600);
  compass(MAP.x + MAP.w - 90, MAP.y + 90, 46);
  g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);
  if (t < at(3, 0)) {   // le soldat introuvable : un contour vide
    g.save(); g.setLineDash([16, 12]); g.strokeStyle = INK; g.lineWidth = 5;
    g.beginPath(); g.moveTo(PUP.x - 70, PUP.y - 240); g.lineTo(PUP.x + 70, PUP.y - 240); g.lineTo(PUP.x + 90, PUP.y - 60); g.lineTo(PUP.x - 90, PUP.y - 60); g.closePath(); g.stroke();
    g.beginPath(); g.arc(PUP.x, PUP.y - 300, 95, 0, 7); g.stroke();
    for (const lx of [-40, 40]) { g.beginPath(); g.rect(PUP.x + lx - 22, PUP.y - 70, 44, 74); g.stroke(); }
    g.setLineDash([]); g.restore();
    const qk = ub(t, 1, .3, .6, 'back');
    if (qk > 0) { g.save(); g.translate(PUP.x, PUP.y - 300); g.scale(qk, qk); g.font = '400 170px "Lilita One"'; g.fillStyle = RED; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 8); g.restore(); }
  } else {
    const u = ub(t, 3, 0, .25, 'out');
    chauvin(PUP.x, PUP.y, 1 + .35 * (1 - u), t, { emo: t >= at(5, 0) ? 'surpris' : 'fier', active: t >= at(3, .3) && t < at(4, 0) });
    bandages(PUP.x, PUP.y, t);
  }

  ball(BALL.x, BALL.y, t);
  ledger(t);
  theatre(t);
  audience(t);
  dict(t);
  label(t);

  g.globalCompositeOperation = 'multiply'; g.fillStyle = T.paper; g.fillRect(-60, 180, 2900, 2500); g.globalCompositeOperation = 'source-over';

  // ── écran : le texte animé (une animation différente à chaque plan)
  reset();
  const F = (s, px, fam = 'Lilita One', wt = 400, max = 740) => { let f = `${wt} ${px}px "${fam}"`; g.font = f; while (g.measureText(s).width > max && px > 36) { px -= 4; f = `${wt} ${px}px "${fam}"`; g.font = f; } return f; };
  const box = { box: true, boxColor: YELLOW, color: INK, boxShadow: 'rgba(43,34,25,.35)' };
  if (t >= at(0, .25) && t < at(1, .1)) TXT.slam('« CHAUVIN »', SX, 1190, t, at(0, .25), { ...box, font: F('« CHAUVIN »', 110) });
  if (t >= at(1, .35) && t < at(2, 0)) TXT.type('un soldat introuvable', SX, 1190, t, at(1, .35), { font: F('un soldat introuvable', 80, 'Old Standard TT', 700), color: INK, cps: 32, box: true, boxColor: CREAM });
  if (t >= at(2, .1) && t < at(3, 0)) TXT.pop('AU PROCHAIN MATCH', SX, 1185, t, at(2, .1), { ...box, font: F('AU PROCHAIN MATCH', 96), rot: -.04 });
  if (t >= at(3, .3) && t < at(4, 0)) {
    TXT.highlight('Nicolas Chauvin', SX, 520, t, at(3, .3), { font: F('Nicolas Chauvin', 100, 'IM Fell English SC'), color: INK, mark: 'rgba(245,182,42,.9)' });
    g.globalAlpha = ub(t, 3, .5, .7); g.font = 'italic 400 54px "IM Fell English"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('soldat de Napoléon', SX, 1185); g.globalAlpha = 1;
  }
  if (t >= at(4, .08) && t < at(5, 0)) TXT.count(0, 17, SX, 540, t, at(4, .1), at(4, .85) - at(4, .1), { ...box, font: '400 92px "Lilita One"', fmt: n => `${Math.round(n)} blessures` });
  if (t >= at(5, .72) && t < at(6, 0)) TXT.stamp('INTROUVABLE', SX, 900, t, at(5, .72), { font: F('INTROUVABLE', 110, 'Lilita One', 400, 640), color: RED, rot: -.1 });
  if (t >= at(6, .3) && t < at(7, 0)) TXT.rise('1831 : une pièce de théâtre', SX, 520, t, at(6, .3), { font: F('1831 : une pièce de théâtre', 80, 'Old Standard TT', 700), color: CREAM, stroke: 10, strokeColor: INK, stagger: .1 });
  if (t >= at(7, .05) && t < at(8, 0)) {   // la bulle de Chauvin, tapée
    const k = ub(t, 7, .05, .18, 'out');
    g.save(); g.translate(SX, 585); g.scale(k, k);
    g.fillStyle = '#fffaf0'; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.roundRect(-360, -110, 720, 220, 40); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-60, 106); g.lineTo(-90, 190); g.lineTo(10, 108); g.fill(); g.stroke();
    g.restore();
    if (k > .95) {
      g.font = '400 34px "Lilita One"'; g.fillStyle = RED; g.textAlign = 'center'; g.fillText('CHAUVIN, SUR SCÈNE', SX, 505);
      const L1 = 'Je suis Français,', L2 = 'je suis Chauvin !', t1 = at(7, .18), t2 = t1 + L1.length / 24;
      TXT.type(L1, SX, 565, t, t1, { font: '400 62px "Lilita One"', color: INK, cps: 24 });
      TXT.type(L2, SX, 640, t, t2, { font: '400 62px "Lilita One"', color: INK, cps: 24 });
    }
  }
  if (t >= at(8, .4) && t < at(9, .1)) TXT.focus('chauvin = patriote aveugle', SX, 500, t, at(8, .4), { ...box, font: F('chauvin = patriote aveugle', 78), d: .45 });
  if (t >= at(9, .5)) TXT.rise('un soldat sans doute inventé', SX, 1190, t, at(9, .5), { ...box, font: F('un soldat sans doute inventé', 80), stagger: .1 });
}

export function events(add) {
  add('slap', at(0, .25)); add('zoom', at(1, .05), { d: .4 }); add('slap', at(3, .05));
  for (let k = 0; k < 17; k += 4) add('slap', lerp(at(4, .1), at(4, .85), k / 16));
  add('slap', at(5, .72)); add('chime', at(6, .05)); add('zoom', at(8, .1), { d: .6 }); add('bulb', at(8, .72)); add('zoom', at(9, .1), { d: .6 });
}
