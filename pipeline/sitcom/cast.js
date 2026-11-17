// cast.js — the duo of the Sachoir sitcom: MAX (curious, nervous) and LE PROF (deadpan, knows everything)
// Original characters. Local coordinates: origin at the feet, y down; face = 1 looks right (3/4), -1 mirrors.
// Eye, mouth and hand helpers adapted from the Lemo-Opuscar scifi-toon demo (MIT).
import { clamp, lerp, hash, TAU } from './lib.js';
import { INK, push, pop, translate, rotate, scale, shape, fillOnly, stroke, ell, arc, spline, rr, rect, noodle, quad, dot, text } from './toon.js';

// Sachoir colours: cream #faf6ee, ink #17140f, yellow #f5b62a (reserved for the Machine à Savoir), navy #2f4fa2,
// green #1f8f5f, red #d9473a, purple #8a55b8, orange #f2a33a
export const PAL = {
  white: '#ffffff', mouthIn: '#4a1a22', tongue: '#e8637a',
  skinM: '#f4c9a2', skinMs: '#d9a47c', hairM: '#5a3524', hairMs: '#3d2216', hood: '#8a55b8', hoodS: '#6a3d96', jean: '#2f4fa2', jeanS: '#14275c',
  shoe: '#d9473a', shoeS: '#a8322a', phones: '#1f8f5f', phonesS: '#14704a', cream: '#faf6ee',
  skinP: '#e8b98f', skinPs: '#c99670', coat: '#1f8f5f', coatS: '#14704a', shirt: '#faf6ee', shirtS: '#d9d0bd', bow: '#d9473a', bowS: '#a8322a',
  trou: '#5f5a52', trouS: '#3f3a34', puff: '#c9c4bb', puffS: '#9e988e', glass: '#e8f3ff', pencil: '#f2a33a',
};

// —— face parts ——
export function eye(cx, cy, rx, ry, { lid = 0, look = [0, 0], pupil = 4.5, skin = PAL.skinM, closed = false, lw = 6, jitter = 0, lower = 0 } = {}) {
  if (closed) { stroke(arc(cx, cy + ry * .15, rx * .8, ry * .45, Math.PI * .1, Math.PI * .9, 14), lw); return; }
  shape(ell(cx, cy, rx, ry, 36), {
    fill: PAL.white, lw, shade: () => {
      dot(cx + look[0] * rx * .55 + jitter, cy + look[1] * ry * .5, pupil);
      if (lid > 0) {
        const yl = cy - ry + lid * 2 * ry;
        fillOnly([[cx - rx * 1.3, cy - ry * 1.4], [cx + rx * 1.3, cy - ry * 1.4], [cx + rx * 1.3, yl], [cx - rx * 1.3, yl + ry * .08]], skin, { boil: .5 });
        stroke([[cx - rx * 1.2, yl + ry * .08], [cx + rx * 1.2, yl]], lw);
      }
      if (lower > 0) { const yb = cy + ry - lower * 2 * ry; fillOnly([[cx - rx * 1.3, yb], [cx + rx * 1.3, yb], [cx + rx * 1.3, cy + ry * 1.4], [cx - rx * 1.3, cy + ry * 1.4]], skin, { boil: .5 }); stroke([[cx - rx * 1.2, yb], [cx + rx * 1.2, yb]], lw * .8); }
    }
  });
}
export function mouth(cx, cy, mw, { o = 0, w = 1, sm = 0, skew = 0, lw = 6, teeth = true, tongue = true } = {}) {
  const hw = mw * w / 2, k = mw * .22, lc = [cx - hw, cy - sm * k + skew * k], rc = [cx + hw, cy - sm * k - skew * k];
  if (o < .07) { stroke(quad(lc, [cx, cy + sm * k * 1.2], rc, 12), lw); return; }
  const h = o * mw * .62;
  const up = quad(lc, [cx, cy - h * .25 + sm * k * .4], rc, 12), dn = quad(rc, [cx, cy + h + sm * k * .6], lc, 14);
  shape([...up, ...dn], {
    fill: PAL.mouthIn, lw, shade: () => {
      if (teeth && o > .22) fillOnly(rect(cx - hw * 1.2, cy - h, hw * 2.4, h * .32 + 6), PAL.white, { boil: .3 });
      if (tongue) fillOnly(ell(cx + hw * .15, cy + h * .95, hw * .6, h * .45, 20), PAL.tongue, { boil: .3 });
    }
  });
}
export function hand(x, y, ang, r = 21, col = PAL.skinM, { fist = false, lw = 6, point = false } = {}) {
  push(); translate(x, y); rotate(ang);
  let pts;
  if (fist) pts = spline([[-r * .6, -r * .8], [r * .7, -r * .9], [r * 1.1, -r * .1], [r * .8, r * .8], [-r * .5, r * .9], [-r * .9, 0]]);
  else if (point) pts = spline([[-r * .6, -r * .8], [r * .6, -r * .7], [r * 2.1, -r * .55], [r * 2.2, -r * .15], [r * .9, -r * .1], [r * .9, r * .7], [-r * .5, r * .9], [-r * .9, 0]]);
  else pts = spline([[-r * .5, -r * .85], [r * .5, -r * 1.05], [r * 1.35, -r * .75], [r * 1.05, -r * .3], [r * 1.5, -r * .1], [r * 1.1, r * .3], [r * 1.35, r * .7], [r * .6, r * .95], [-r * .6, r * .8], [-r * .95, 0]]);
  shape(pts, { fill: col, lw });
  pop();
}
export const sweat = (x, y, s = 1) => shape(spline([[x, y - 16 * s], [x + 9 * s, y + 4 * s], [x, y + 12 * s], [x - 9 * s, y + 4 * s]]), { fill: '#bfe9ff', lw: 5 });

// —— MAX ——  P: {x,y,s,face,bob,sq,lean,headTilt, lid,look,brow(0 calm, 1 worried, -1 angry),mouth:{o,w,sm,skew},blink,eyeS,
//              armR:{h:[dx,dy],bend,fist,point}, armL, holdPhone, nerv, t, sweat}
export function max(P) {
  const f = P.face ?? 1, ner = P.nerv ?? 0;
  const jit = ner ? (hash(Math.floor((P.t || 0) * 12) * 3.3) - .5) * 7 * ner : 0;
  push(); translate(P.x + jit, P.y + (P.bob || 0)); scale((P.s ?? 1) * f, (P.s ?? 1) * (P.sq ?? 1));
  // legs (jeans) + sneakers
  for (const sx of [-1, 1]) {
    const hip = [sx * 30, -170], ank = [sx * 36, -30];
    shape(noodle(hip, ank, sx * -4, 46, 40), { fill: PAL.jean, lw: 7, shade: () => fillOnly(rect(8, -190, 60, 180), PAL.jeanS, { boil: .3 }) });
    shape(spline([[ank[0] - 30, 2], [ank[0] - 28, -30], [ank[0] + 14, -34], [ank[0] + 52, -12], [ank[0] + 48, 4]]), { fill: PAL.shoe, lw: 7, shade: () => fillOnly(rect(ank[0] - 40, -8, 110, 16), PAL.cream, { boil: .3 }) });
  }
  push(); rotate(P.lean ?? 0);
  const shB = [-74, -372], shF = [70, -372];
  const armB = P.armL || { h: [-14, 150], bend: -18 }, armF = P.armR || { h: [16, 150], bend: 18 };
  const drawArm = (sh, arm, front) => {
    const hp = [sh[0] + arm.h[0], sh[1] + arm.h[1]];
    shape(noodle(sh, hp, arm.bend ?? 0, 50, 42), { fill: PAL.hood, lw: 7, shade: () => fillOnly(rect(-300, sh[1] + 40, 600, 30), PAL.hoodS, { boil: .2 }) });
    const ang = Math.atan2(hp[1] - sh[1], hp[0] - sh[0]);
    hand(hp[0], hp[1], ang, 21, PAL.skinM, { fist: arm.fist, point: arm.point });
    if (front && P.holdPhone) { push(); translate(hp[0] + 6, hp[1] - 30); rotate(-.2); shape(rr(-20, -36, 40, 70, 8), { fill: '#2a2a34', lw: 6, shade: () => fillOnly(rr(-15, -30, 30, 56, 4), '#8fd3ff', { boil: .2 }) }); pop(); }
  };
  drawArm(shB, armB, false);
  // hoodie body (big, slouchy) with kangaroo pocket + strings
  const body = spline([[0, -404], [70, -386], [104, -300], [100, -190], [0, -168], [-100, -190], [-104, -300], [-70, -386]]);
  shape(body, {
    fill: PAL.hood, lw: 7, shade: () => {
      fillOnly(spline([[40, -420], [120, -380], [130, -180], [50, -160], [80, -300]]), PAL.hoodS, { boil: .4 });
      fillOnly(rect(-120, -206, 240, 40), PAL.hoodS, { boil: .3 });
    }
  });
  shape(spline([[-60, -276], [60, -276], [72, -214], [-72, -214]]), { fill: PAL.hood, lw: 6 });   // pocket
  for (const sx of [-1, 1]) stroke([[sx * 18, -392], [sx * 22 + (P.bob || 0) * .2, -320]], 5, { line: PAL.cream });
  // headphones resting on the neck (green)
  shape(spline([[-58, -404], [-30, -380], [30, -380], [58, -404], [44, -416], [0, -396], [-44, -416]]), { fill: PAL.phones, lw: 6 });
  for (const sx of [-1, 1]) shape(ell(sx * 62, -400, 18, 24, 18), { fill: PAL.phones, lw: 6, shade: () => fillOnly(ell(sx * 62 + 8, -400, 10, 20, 12), PAL.phonesS, { boil: .3 }) });
  // head
  push(); translate(0, -478); rotate(P.headTilt ?? 0);
  headMax(P, ner);
  pop();
  drawArm(shF, armF, true);
  pop();
  if (P.sweat != null) { const u = P.sweat % 1; sweat(-96, -600 + u * 40, 1); sweat(100, -580 + ((u + .5) % 1) * 40, .8); }
  pop();
}
function headMax(P, ner) {
  shape(ell(-78, 10, 16, 22, 16), { fill: PAL.skinM, lw: 6 });   // ear
  const HD = spline([[0, -96], [64, -84], [86, -30], [84, 40], [56, 92], [0, 104], [-56, 92], [-82, 40], [-84, -30], [-62, -84]]);
  shape(HD, { fill: PAL.skinM, lw: 7, shade: () => fillOnly(ell(-58, 40, 40, 70, 24), PAL.skinMs, { boil: .3 }) });
  // messy mop of hair: a rounded cloud with one cowlick (no spikes)
  const mop = spline([[-96, -10], [-104, -60], [-80, -104], [-40, -128], [6, -134], [52, -124], [88, -96], [100, -52], [92, -20], [60, -48], [20, -58], [-20, -50], [-60, -40]]);
  shape(mop, { fill: PAL.hairM, lw: 7, shade: () => fillOnly(spline([[-110, -40], [-60, -110], [-90, -130], [-130, -60]]), PAL.hairMs, { boil: .3 }) });
  stroke(spline([[10, -132], [20, -170], [44, -176], [50, -156], [34, -150]], false), 6);   // cowlick
  stroke(spline([[-30, -120], [-10, -96], [-14, -70]], false), 4, { line: PAL.hairMs });
  // brows (worried by default: inner ends up)
  const br = P.brow ?? .4;
  stroke([[-58, -36 + br * 4], [-22, -44 - br * 10]], 7); stroke([[62, -38 + br * 4], [26, -46 - br * 10]], 7);
  const look = P.look || [0, 0], shake = ner ? (hash(Math.floor((P.t || 0) * 24) * 1.7) - .5) * 3 * ner : 0, es = P.eyeS ?? 1;
  for (const [ex, rx] of [[-36, 30], [38, 27]]) eye(ex, 2, rx * es, 34 * es, { lid: P.blink ? 1 : (P.lid ?? 0), look, pupil: P.pupil ?? 4.2, skin: PAL.skinM, jitter: shake });
  // nose + freckles
  shape(spline([[4, 30], [18, 48], [8, 58], [-6, 50]]), { fill: PAL.skinMs, lw: 5 });
  for (const [fx, fy] of [[-50, 44], [-40, 52], [50, 42], [60, 50]]) dot(fx, fy, 2.2, '#c98a62');
  const m = P.mouth || {};
  mouth(4, 76, 44 * (P.mouthS ?? 1), { o: m.o || 0, w: m.w ?? 1, sm: m.sm ?? -.2, skew: m.skew || 0, lw: 6 });
}

// —— LE PROF ——  same P fields; tall, lanky, deadpan
export function prof(P) {
  const f = P.face ?? 1;
  push(); translate(P.x, P.y + (P.bob || 0)); scale((P.s ?? 1) * f, (P.s ?? 1) * (P.sq ?? 1));
  for (const sx of [-1, 1]) {
    const hip = [sx * 26, -230], ank = [sx * 28, -30];
    shape(noodle(hip, ank, sx * -3, 40, 34), { fill: PAL.trou, lw: 7, shade: () => fillOnly(rect(6, -250, 60, 230), PAL.trouS, { boil: .3 }) });
    shape(spline([[ank[0] - 28, 2], [ank[0] - 24, -24], [ank[0] + 20, -26], [ank[0] + 58, -10], [ank[0] + 56, 4]]), { fill: '#3a2a20', lw: 7 });
  }
  push(); rotate(P.lean ?? 0);
  const shB = [-62, -506], shF = [58, -506];
  const armB = P.armL || { h: [-10, 190], bend: -14 }, armF = P.armR || { h: [12, 190], bend: 14 };
  const drawArm = (sh, arm) => {
    const hp = [sh[0] + arm.h[0], sh[1] + arm.h[1]];
    shape(noodle(sh, hp, arm.bend ?? 0, 42, 36), { fill: PAL.coat, lw: 7 });
    shape(ell(hp[0], hp[1], 20, 20, 16), { fill: PAL.shirt, lw: 5 });   // shirt cuff
    hand(hp[0], hp[1], Math.atan2(hp[1] - sh[1], hp[0] - sh[0]), 19, PAL.skinP, { fist: arm.fist, point: arm.point });
  };
  drawArm(shB, armB);
  // green lab coat over cream shirt + red bow tie
  const coat = spline([[-20, -540], [-74, -514], [-92, -380], [-96, -150], [0, -140], [96, -150], [90, -380], [72, -514], [20, -540]]);
  shape(coat, {
    fill: PAL.coat, lw: 7, shade: () => {
      fillOnly(spline([[-110, -540], [-40, -520], [-60, -300], [-50, -130], [-120, -130]]), PAL.coatS, { boil: .4 });
      fillOnly([[-26, -540], [26, -540], [18, -330], [-14, -330]], PAL.shirt, { boil: .4 });
    }
  });
  stroke([[-26, -540], [-14, -330], [-8, -150]], 6); stroke([[26, -540], [18, -330]], 6);
  shape(rr(40, -440, 46, 54, 6), { fill: PAL.coat, lw: 5 });    // breast pocket + pencils
  shape(rr(48, -476, 9, 40, 3), { fill: PAL.pencil, lw: 4 }); shape(rr(62, -470, 9, 34, 3), { fill: PAL.bow, lw: 4 });
  // bow tie
  shape([[-34, -548], [-4, -534], [-34, -518]], { fill: PAL.bow, lw: 5 }); shape([[34, -548], [4, -534], [34, -518]], { fill: PAL.bow, lw: 5 });
  shape(ell(0, -534, 9, 9, 12), { fill: PAL.bowS, lw: 5 });
  shape(noodle([0, -548], [4, -582], 0, 30, 30), { fill: PAL.skinP, lw: 6 });   // neck
  push(); translate(10, -660); rotate(P.headTilt ?? .04);
  headProf(P);
  pop();
  drawArm(shF, armF);
  pop();
  if (P.sweat != null) sweat(110, -760 + (P.sweat % 1) * 20, 1);
  pop();
}
function headProf(P) {
  // long egg head, bald dome, grey side puffs, tiny round glasses low on the nose, heavy lids, thin moustache
  const HD = spline([[0, -118], [58, -104], [80, -50], [78, 30], [60, 96], [10, 124], [-44, 110], [-74, 50], [-80, -40], [-56, -100]]);
  shape(HD, { fill: PAL.skinP, lw: 7, shade: () => { fillOnly(ell(-60, 30, 36, 90, 24), PAL.skinPs, { boil: .3 }); fillOnly(ell(20, -92, 24, 8, 12), '#f6d8bc', { boil: .2 }); } });
  for (const sx of [-1, 1]) shape(spline([[sx * 66, -40], [sx * 104, -54], [sx * 112, -14], [sx * 100, 18], [sx * 72, 14]]), { fill: PAL.puff, lw: 6, shade: () => fillOnly(ell(sx * 100, 0, 16, 16, 12), PAL.puffS, { boil: .3 }) });
  // pencil behind the ear (the absurd costume idea: a pencil on each side)
  for (const sx of [-1, 1]) { push(); translate(sx * 86, -66); rotate(sx * .5); shape(rr(-6, -40, 12, 60, 3), { fill: PAL.pencil, lw: 4, shade: () => fillOnly(rect(-8, 10, 16, 12), '#f2c9a0', { boil: .2 }) }); pop(); }
  const br = P.brow ?? 0;
  stroke([[-50, -32 - br * 6], [-14, -38 - br * 10]], 6); stroke([[22, -40 - br * 10], [58, -36 - br * 6]], 6);
  const look = P.look || [0, 0];
  const lid = P.blink ? 1 : clamp(P.lid ?? .5, 0, 1);
  eye(-28, -6, 24, 26, { lid, look, pupil: 4, skin: PAL.skinP, closed: P.closed });
  eye(34, -8, 22, 25, { lid, look, pupil: 4, skin: PAL.skinP, closed: P.closed });
  for (const [ex, rx] of [[-28, 20], [34, 18]]) stroke(arc(ex, 24, rx, 7, Math.PI * .15, Math.PI * .85, 10), 4);   // eye bags
  // long nose + tiny glasses sitting low
  shape(spline([[8, 0], [22, 46], [32, 66], [16, 74], [0, 66]]), { fill: PAL.skinP, lw: 6, shade: () => fillOnly(ell(22, 66, 12, 8, 10), PAL.skinPs, { boil: .3 }) });
  for (const gx of [-6, 34]) shape(ell(gx, 48, 15, 13, 18), { fill: 'rgba(232,243,255,.55)', lw: 5 });
  stroke([[9, 48], [19, 48]], 5);
  const m = P.mouth || {};
  mouth(12, 96, 44, { o: m.o || 0, w: m.w ?? 1, sm: m.sm ?? -.15, skew: m.skew || 0, lw: 6, teeth: true });
  shape(spline([[-16, 84], [12, 78], [40, 84], [44, 90], [12, 86], [-20, 90]]), { fill: '#8e8880', lw: 4 });   // thin moustache
}
