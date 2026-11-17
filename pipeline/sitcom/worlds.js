// worlds.js — the Sachoir lab (home), the Machine à Savoir and its portal (the ONLY yellow glow), one flat palette per world,
// the floating holo-screen that shows the topic, and the Bidule (a small non-verbal creature)
import { clamp, lerp, hash, vnoise, TAU } from './lib.js';
import { INK, g, push, pop, translate, rotate, scale, shape, fillOnly, stroke, ell, arc, spline, rr, rect, noodle, dot, text, bands, tx, zoom } from './toon.js';

export const FLOOR = 1500;
const X0 = -900, X1 = 2000;
export const YEL = '#f5b62a';

// Palettes: Sachoir colours, 3–5 per world; never the portal yellow (reserved for the Machine)
export const PALETTES = {
  violet: { sky: ['#5a2f86', '#6e3d9e', '#8a55b8'], far: '#46246a', mid: '#2f1a4a', ground: '#f2a33a', groundS: '#c9832a', acc: '#ff8fa6' },
  marine: { sky: ['#14275c', '#1f3a80', '#2f4fa2'], far: '#0e1c44', mid: '#0a1430', ground: '#1f8f5f', groundS: '#14704a', acc: '#ff9a6a' },
  vert: { sky: ['#bfe6c8', '#9fd8b0', '#7cc796'], far: '#1f8f5f', mid: '#14704a', ground: '#8a5a24', groundS: '#6a4418', acc: '#d9473a' },
  rouge: { sky: ['#ffb08a', '#ff8a6a', '#d9473a'], far: '#8a2a22', mid: '#5a1a16', ground: '#2f4fa2', groundS: '#1f3a80', acc: '#faf6ee' },
  orange: { sky: ['#fbe1a6', '#f7c46a', '#f2a33a'], far: '#c9832a', mid: '#8a5a24', ground: '#2f4fa2', groundS: '#14275c', acc: '#8a55b8' },
  beige: { sky: ['#f1e3c6', '#e8d6b0', '#dcc69a'], far: '#b89a6a', mid: '#8a7350', ground: '#c9b48a', groundS: '#a8946a', acc: '#5f5a52' },
  nuit: { sky: ['#0a0a1e', '#14143a', '#1e1e54'], far: '#2a2a6a', mid: '#14143a', ground: '#5f5a52', groundS: '#3f3a34', acc: '#8fd3ff' },
  menthe: { sky: ['#d6f5ea', '#b0ead6', '#8adcc0'], far: '#2a9d8f', mid: '#1c6f66', ground: '#d9473a', groundS: '#a8322a', acc: '#8a55b8' },
};
const SET_PAL = { 'paris-ancien': 'orange', ville: 'marine', ciel: 'menthe', espace: 'nuit', mer: 'marine', nature: 'vert', antiquite: 'beige', 'moyen-age': 'violet',
  desert: 'orange', neige: 'menthe', cuisine: 'rouge', usine: 'beige', corps: 'rouge', bureau: 'beige', musee: 'violet', futur: 'violet' };
export const palOf = (set, name) => PALETTES[name] || PALETTES[SET_PAL[set]] || PALETTES.violet;

// —— HOME: the Sachoir lab (cream walls, navy wainscot, wooden floor), blackboard, the Machine à Savoir ——
export function lab(t, o = {}) {
  fillOnly(rect(X0, -400, X1 - X0, FLOOR + 400), '#faf6ee', { boil: 0 });
  for (let x = -800; x < 1900; x += 180) stroke([[x, -400], [x, FLOOR - 260]], 3, { line: '#ebe3d2' });
  shape(rect(X0, FLOOR - 260, X1 - X0, 260), { fill: '#2f4fa2', lw: 6, shade: () => { for (let x = -800; x < 1900; x += 150) fillOnly(rect(x, FLOOR - 240, 120, 210), '#14275c', { boil: .3 }); } });
  shape(rect(X0, FLOOR, X1 - X0, 900), { fill: '#8a5a24', lw: 6, shade: () => { for (let k = 0; k < 6; k++) fillOnly(rect(X0, FLOOR + 40 + k * 70, X1 - X0, 8), '#6a4418', { boil: .2 }); } });
  // ceiling lamp
  stroke([[540, -400], [540, 160]], 5); shape(spline([[460, 210], [490, 160], [590, 160], [620, 210]]), { fill: '#1f8f5f', lw: 6 });
  // blackboard with the topic scribble (VT323)
  shape(rr(70, 330, 520, 360, 10), {
    fill: '#17140f', lw: 8, shade: () => {
      text(o.board1 || 'QUESTION DU JOUR', 330, 400, { font: '400 46px VT323', fill: '#faf6ee' });
      text(o.board2 || '?', 330, 470, { font: '400 40px VT323', fill: '#9fd8b0' });
      text('∑ savoir = café + BD', 330, 640, { font: '400 34px VT323', fill: '#faf6ee' });
    }
  });
  stroke(spline([[150, 560], [190, 520], [230, 560], [190, 600], [165, 565]], false), 4, { line: '#faf6ee' });
  shape(rr(90, 680, 480, 18, 4), { fill: '#8a5a24', lw: 5 });
  // shelf with books (Sachoir colours)
  shape(rr(700, 420, 330, 18, 4), { fill: '#8a5a24', lw: 5 });
  ['#d9473a', '#2f4fa2', '#1f8f5f', '#8a55b8', '#f2a33a', '#d9473a'].forEach((c, i) => shape(rr(714 + i * 50, 300 + (i % 2) * 18, 40, 120 - (i % 2) * 18, 4), { fill: c, lw: 5 }));
  machine(880, 760, o.machine ?? 0, t);
}
// The Machine à Savoir: a big lightbulb on a brass base with dials. on: 0 dark → 1 lit (yellow)
export function machine(x, y, on, t) {
  push(); translate(x, y);
  shape(rr(-110, 120, 220, 220, 16), { fill: '#5f5a52', lw: 7, shade: () => { fillOnly(rect(40, 110, 90, 240), '#3f3a34', { boil: .3 }); } });
  for (const [dx, c] of [[-60, '#d9473a'], [0, '#1f8f5f'], [60, '#2f4fa2']]) shape(ell(dx, 200, 20, 20, 16), { fill: c, lw: 5 });
  shape(rr(-80, 260, 160, 40, 8), { fill: '#17140f', lw: 5, shade: () => text(on > .5 ? 'SAVOIR : ON' : 'SAVOIR : OFF', 0, 280, { font: '400 30px VT323', fill: on > .5 ? '#9fd8b0' : '#ff8a6a' }) });
  for (let k = 0; k < 3; k++) shape(rr(-70, 70 + k * 18, 140, 16, 6), { fill: '#d9dbe6', lw: 5 });
  const glassCol = on > .5 ? YEL : '#e8e2d2';
  const bulb = spline([[0, -190], [96, -150], [118, -60], [80, 20], [62, 70], [-62, 70], [-80, 20], [-118, -60], [-96, -150]]);
  if (on > 0) for (let k = 2; k >= 1; k--) fillOnly(ell(0, -70, 160 * k * (.8 + .2 * on), 150 * k * (.8 + .2 * on), 40), `rgba(245,182,42,${.12 * on})`, { boil: .5 });
  shape(bulb, { fill: glassCol, lw: 8, shade: () => { fillOnly(ell(-50, -120, 22, 40, 14), on > .5 ? '#fff1b8' : '#ffffff', { boil: .2 }); } });
  stroke(spline([[-30, 60], [-40, -30], [-14, -60], [0, -30], [14, -60], [40, -30], [30, 60]], false), 6, { line: on > .5 ? '#fff8e0' : '#8e8880' });
  pop();
}

// —— the portal: yellow swirl (the only glowing thing in the series) ——
export function portal(cx, cy, r, t, { open = 1, sx = .78, spin = 1 } = {}) {
  if (open <= .001) return;
  const R = r * open;
  push(); translate(cx, cy); scale(sx, 1);
  fillOnly(ell(0, 0, R * 1.55, R * 1.45, 48), 'rgba(245,182,42,.16)', { boil: .6 });
  fillOnly(ell(0, 0, R * 1.28, R * 1.22, 48), 'rgba(245,182,42,.22)', { boil: .6 });
  const rim = []; const N = 22;
  for (let i = 0; i < N; i++) { const a = i / N * TAU, k = 1 + .09 * (vnoise(i * 1.7 + t * 3) - .5) * 2 + .05 * Math.sin(a * 5 + t * 6); rim.push([Math.cos(a) * R * k, Math.sin(a) * R * k]); }
  shape(spline(rim), {
    fill: '#e09a12', lw: 8, shade: () => {
      fillOnly(ell(0, 0, R * .9, R * .9, 40), '#f5b62a', { boil: .3 });
      for (let k = 0; k < 5; k++) {
        const pts = [], pts2 = [];
        for (let j = 0; j <= 22; j++) {
          const u = j / 22, rr_ = R * (1 - u) * .95, a = k / 5 * TAU + u * 3.6 + t * 2.6 * spin;
          pts.push([Math.cos(a) * rr_, Math.sin(a) * rr_]); const a2 = a + .55 * (1 - u * .7); pts2.push([Math.cos(a2) * rr_, Math.sin(a2) * rr_]);
        }
        fillOnly([...pts, ...pts2.reverse()], k % 2 ? '#ffd76a' : '#c97f14', { boil: .4 });
      }
      fillOnly(ell(0, 0, R * .3, R * .3, 24), '#fff1b8', { boil: .5 });
      fillOnly(ell(0, 0, R * .14, R * .14, 16), '#ffffff', { boil: .5 });
    }
  });
  for (let i = 0; i < 12; i++) { const a = hash(i) * TAU + t * (1.5 + hash(i + 4) * 2), d = R * (1.05 + .25 * ((t * .8 + hash(i + 9)) % 1)); dot(Math.cos(a) * d, Math.sin(a) * d, 5 + hash(i + 2) * 4, i % 3 ? '#ffd76a' : '#ffffff'); }
  pop();
}

// —— WORLDS: flat colour-band sky + silhouettes, per set ——
export function world(set, P, t) {
  bands(P.sky, -500, FLOOR - 200, X0, X1);
  const R = i => hash(i * 7.31 + set.length);
  const sil = (fn) => fn();
  switch (set) {
    case 'paris-ancien': case 'ville': case 'bureau': {
      const old = set === 'paris-ancien';
      for (let i = 0, x = X0; x < X1; i++) {
        const w = 150 + R(i) * 160, h = 380 + R(i + 40) * (old ? 260 : 620), top = FLOOR - 140 - h;
        shape(rect(x, top, w, h + 200), { fill: i % 2 ? P.far : P.mid, lw: 6, shade: () => { for (let yy = top + 40; yy < FLOOR - 200; yy += 80) for (let xx = x + 24; xx < x + w - 30; xx += 46) fillOnly(rect(xx, yy, 22, 40), R(xx + yy) < .35 ? '#ffe2a0' : P.mid, { boil: .2 }); } });
        if (old) shape([[x - 10, top], [x + w / 2, top - 90 - R(i + 9) * 50], [x + w + 10, top]], { fill: P.mid, lw: 6 });
        x += w + 10;
      }
      if (old) shape(rect(X0, FLOOR - 160, X1 - X0, 120), { fill: '#2f4fa2', lw: 6, shade: () => { for (let k = 0; k < 12; k++) fillOnly(rect(X0 + k * 260 + (t * 40) % 260, FLOOR - 120, 120, 6), '#8fd3ff', { boil: .2 }); } });   // river
      break;
    }
    case 'ciel': {
      for (let i = 0; i < 6; i++) { const x = -400 + i * 420 + (t * 30) % 420, y = 300 + R(i) * 700; shape(spline([[x - 160, y], [x - 120, y - 70], [x - 30, y - 100], [x + 60, y - 80], [x + 150, y - 30], [x + 170, y + 20], [x - 150, y + 24]]), { fill: '#ffffff', lw: 6, shade: () => fillOnly(rect(x - 200, y, 400, 40), '#d6eef8', { boil: .2 }) }); }
      break;
    }
    case 'espace': {
      for (let i = 0; i < 90; i++) dot(X0 + R(i) * (X1 - X0), -400 + R(i + 300) * 1700, 2 + R(i + 50) * 3, '#faf6ee');
      shape(ell(860, 420, 170, 170, 48), { fill: P.acc, lw: 7, shade: () => { fillOnly(ell(930, 470, 130, 150, 30), '#4a7ab0', { boil: .3 }); } });
      stroke(arc(860, 420, 300, 60, Math.PI * .05, Math.PI * .95, 30), 8);
      shape(ell(180, 300, 70, 70, 30), { fill: '#d9dbe6', lw: 6, shade: () => { fillOnly(ell(160, 280, 16, 14, 12), '#a9adbb', { boil: .2 }); fillOnly(ell(200, 330, 10, 9, 10), '#a9adbb', { boil: .2 }); } });
      break;
    }
    case 'mer': {
      shape(ell(780, 520, 120, 120, 40), { fill: '#ffd0a0', lw: 6 });
      for (let k = 0; k < 5; k++) { const y = FLOOR - 420 + k * 70, ph = t * 1.5 + k; const pts = []; for (let x = X0; x <= X1; x += 40) pts.push([x, y + Math.sin(x * .01 + ph) * 14]); shape([...pts, [X1, FLOOR + 10], [X0, FLOOR + 10]], { fill: k % 2 ? P.far : P.mid, lw: 6 }); }
      break;
    }
    case 'nature': case 'neige': case 'desert': {
      const snow = set === 'neige', dune = set === 'desert';
      for (let k = 0; k < 3; k++) { const pts = []; for (let x = X0; x <= X1; x += 60) pts.push([x, FLOOR - 300 - k * 120 + Math.sin(x * .004 + k * 2) * (dune ? 60 : 140) - (snow ? Math.abs(Math.sin(x * .006 + k)) * 300 : 0)]); shape([...pts, [X1, FLOOR + 10], [X0, FLOOR + 10]], { fill: k === 2 ? P.far : k === 1 ? P.mid : P.groundS, lw: 6, shade: snow ? () => fillOnly(rect(X0, -400, X1 - X0, FLOOR - 560 - k * 120), '#ffffff', { boil: .3 }) : null }); }
      if (set === 'nature') for (let i = 0; i < 7; i++) { const x = -300 + i * 300 + R(i) * 80; stroke([[x, FLOOR - 200], [x, FLOOR - 340]], 14, { line: '#6a4418' }); shape(ell(x, FLOOR - 400, 90, 110, 26), { fill: i % 2 ? P.far : P.mid, lw: 6 }); }
      if (dune) shape(ell(820, 360, 110, 110, 40), { fill: '#fff1d0', lw: 6 });
      break;
    }
    case 'antiquite': {
      shape([[80, 640], [540, 420], [1000, 640]], { fill: P.far, lw: 7 });
      shape(rect(80, 640, 920, 50), { fill: P.far, lw: 7 });
      for (let i = 0; i < 6; i++) shape(rect(130 + i * 160, 690, 70, FLOOR - 890), { fill: '#faf6ee', lw: 6, shade: () => { for (let k = 0; k < 3; k++) fillOnly(rect(140 + i * 160 + k * 20, 690, 6, FLOOR - 890), '#e0d6bc', { boil: .2 }); } });
      break;
    }
    case 'moyen-age': {
      shape(rect(-100, 560, 1280, FLOOR - 760), { fill: P.far, lw: 7, shade: () => { for (let yy = 600; yy < FLOOR - 200; yy += 60) for (let xx = -100 + ((yy / 60) % 2) * 50; xx < 1180; xx += 100) fillOnly(rect(xx, yy, 92, 52), P.mid, { boil: .2 }); } });
      for (let i = 0; i < 13; i++) shape(rect(-100 + i * 100, 500, 60, 70), { fill: P.far, lw: 6 });
      shape(spline([[440, FLOOR - 200], [440, 1000], [540, 900], [640, 1000], [640, FLOOR - 200]]), { fill: P.mid, lw: 7 });
      shape([[220, 300], [320, 120], [420, 300]], { fill: P.acc, lw: 6 }); shape(rect(240, 300, 160, 260), { fill: P.far, lw: 6 });
      break;
    }
    case 'cuisine': case 'corps': case 'usine': case 'musee': case 'futur': default: {
      // indoor generic: checker or tiles + a few blobs (cells for 'corps', gears for 'usine')
      for (let yy = -400; yy < FLOOR - 200; yy += 120) for (let xx = X0; xx < X1; xx += 120) if (((xx + yy) / 120) % 2 === 0) fillOnly(rect(xx, yy, 120, 120), P.far, { boil: .2 });
      if (set === 'corps') for (let i = 0; i < 8; i++) { const x = -200 + R(i) * 1500, y = 200 + R(i + 9) * 900, r = 60 + R(i + 3) * 80; shape(ell(x, y + Math.sin(t * 2 + i) * 20, r, r * .8, 26), { fill: P.acc, lw: 6, shade: () => fillOnly(ell(x + r * .2, y, r * .35, r * .3, 14), P.mid, { boil: .3 }) }); }
      if (set === 'usine') for (let i = 0; i < 4; i++) { const x = 100 + i * 300, y = 400 + (i % 2) * 300; push(); translate(x, y); rotate(t * (i % 2 ? 1 : -1)); const pts = []; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, r = k % 2 ? 110 : 140; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } shape(pts, { fill: P.mid, lw: 6 }); shape(ell(0, 0, 40, 40, 16), { fill: P.far, lw: 6 }); pop(); }
      if (set === 'musee') for (let i = 0; i < 3; i++) shape(rr(80 + i * 330, 380, 260, 320, 6), { fill: '#c9832a', lw: 7, shade: () => fillOnly(rect(110 + i * 330, 410, 200, 260), P.acc, { boil: .2 }) });
      break;
    }
  }
  shape(rect(X0, FLOOR - 40, X1 - X0, 940), { fill: P.ground, lw: 6, shade: () => fillOnly(rect(X0, FLOOR - 40, X1 - X0, 40), P.groundS, { boil: .2 }) });
}

// —— the holo-screen: a floating retro TV that shows the topic (image or big text) ——
export function holoScreen(x, y, w, h, t, { img = null, big = '', small = '', P = null, on = 1 } = {}) {
  if (on <= 0) return;
  const bob = Math.sin(t * 1.6) * 10;
  push(); translate(x, y + bob); scale(.6 + .4 * on);
  stroke([[-w * .2, -h / 2], [-w * .32, -h / 2 - 90]], 6); stroke([[w * .2, -h / 2], [w * .3, -h / 2 - 80]], 6);
  dot(-w * .32, -h / 2 - 90, 9, '#d9473a'); dot(w * .3, -h / 2 - 80, 9, '#1f8f5f');
  const SP = shape(rr(-w / 2 - 26, -h / 2 - 26, w + 52, h + 52, 28), { fill: '#5f5a52', lw: 8 });
  shape(rr(-w / 2, -h / 2, w, h, 18), {
    fill: '#17140f', lw: 7, shade: () => {
      if (img && img.complete && img.naturalWidth) {
        const [ax, ay] = tx(-w / 2, -h / 2), [bx, by] = tx(w / 2, h / 2), sw = bx - ax, sh = by - ay;
        const k = Math.max(sw / img.naturalWidth, sh / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(img, ax + (sw - iw) / 2, ay + (sh - ih) * .4, iw, ih);
        for (let yy = ay; yy < by; yy += 6) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(ax, yy, sw, 2); }
      } else {
        fillOnly(rect(-w / 2, -h / 2, w, h), P ? P.mid : '#14275c', { boil: 0 });
        if (big) text(big, 0, small ? -24 : 0, { font: `800 ${Math.min(150, Math.max(64, w / Math.max(4, big.length) * 1.6))}px "Baloo 2"`, fill: '#faf6ee' });
        if (small) text(small, 0, h * .3, { font: '400 46px VT323', fill: '#9fd8b0' });
      }
    }
  });
  pop();
}
// caption plate under the screen when an image is shown (the big word / number)
export function plate(x, y, big, t, on = 1) {
  if (!big || on <= 0) return;
  push(); translate(x, y + Math.sin(t * 1.6) * 10); scale(.7 + .3 * on);
  const w = Math.max(320, big.length * 44 + 80);
  shape(rr(-w / 2, -50, w, 100, 22), { fill: '#faf6ee', lw: 7 });
  text(big, 0, 4, { font: '800 64px "Baloo 2"', fill: '#17140f' });
  pop();
}

// —— le Bidule: a small blob creature, cute and a bit gross, non-verbal ——
export function bidule(x, y, s, t, { col = '#ff8fa6', look = [0, 0], blink = false, o = 0, hop = 0 } = {}) {
  push(); translate(x, y - Math.abs(Math.sin(hop * Math.PI)) * 80); scale(s, s * (1 - .12 * Math.sin(t * 6)));
  const body = spline([[-70, 0], [-80, -60], [-50, -120], [0, -136], [50, -120], [80, -60], [70, 0], [30, 8], [-30, 8]]);
  shape(body, { fill: col, lw: 7, shade: () => { fillOnly(ell(40, -50, 40, 70, 18), 'rgba(0,0,0,.14)', { boil: .3 }); fillOnly(ell(-36, -96, 12, 20, 10), 'rgba(255,255,255,.5)', { boil: .2 }); } });
  for (const [dx, dl] of [[-40, 20], [10, 30], [50, 16]]) shape(spline([[dx - 8, 0], [dx + 8, 0], [dx + 5, dl * .7], [dx, dl], [dx - 5, dl * .7]]), { fill: col, lw: 5 });   // drips
  for (const ex of [-26, 24]) {
    if (blink) stroke([[ex - 14, -80], [ex + 14, -80]], 6);
    else shape(ell(ex, -80, 18, 22, 20), { fill: '#ffffff', lw: 6, shade: () => dot(ex + look[0] * 7, -80 + look[1] * 7, 5) });
  }
  if (o > .1) shape(ell(0, -38, 16, 6 + o * 14, 16), { fill: '#4a1a22', lw: 5 }); else stroke(arc(0, -44, 14, 8, .2, Math.PI - .2, 10), 5);
  pop();
}
