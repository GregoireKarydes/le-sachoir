// main.js — Le Sachoir sitcom: draws any episode from ep/timeline.json (written by pipeline/sitcom_render.py)
// window.render(t) is deterministic; window.DUR, window.EV (sound events) and window.READY for the frame capture.
import { clamp, lerp, hash, seg, eio, eo, back, TAU } from './lib.js';
import * as T from './toon.js';
import { max, prof } from './cast.js';
import { lab, portal, world, palOf, holoScreen, plate, bidule, FLOOR } from './worlds.js';

const { W, H } = T;
const qs = new URLSearchParams(location.search);
const cv = document.getElementById('c'); T.init(cv);
const g = T.g;
const EP = qs.get('ep') || 'ep';
const TL = await (await fetch(`${EP}/timeline.json`)).json();
await document.fonts.load('800 60px "Baloo 2"', 'ÀÉÈÊÇ«»…’ abc'); await document.fonts.load('400 40px VT323', 'ABC');
const IMG = {};
await Promise.all(TL.scenes.filter(s => s.img).map(s => new Promise(res => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = `${EP}/${s.img}`; IMG[s.img] = im; })));

const q12 = t => Math.floor(t * 12 + 1e-6) / 12;
const sceneAt = t => TL.scenes.find(s => t >= s.t0 && t < s.t1) || TL.scenes[TL.scenes.length - 1];
const shotAt = t => TL.shots.find(s => t >= s.t0 && t < s.t1) || TL.shots[TL.shots.length - 1];
const POS = { max: { x: 290, face: 1 }, prof: { x: 800, face: -1 } };
const CAMS = {
  two: { cx: 545, cy: 1150, z: 1.22 }, cu_max: { cx: 300, cy: 900, z: 2.25 }, cu_prof: { cx: 790, cy: 720, z: 2.15 },
  wide: { cx: 540, cy: 1020, z: .95 }, screen: { cx: 540, cy: 600, z: 1.5 }, ecu_max: { cx: 300, cy: 1010, z: 3.2 },
};
const PORTAL_HOME = [430, 760], PORTAL_WORLD = [540, 820];

// —— expressions (emo presets) ——
const MAXE = {
  curious: { brow: .5, eyeS: 1.05, mouth: { sm: .1 }, look: [.5, -.2] }, panic: { brow: 1, eyeS: 1.2, pupil: 3.2, nerv: 1, sweat: true, mouth: { sm: -.7, w: .8 } },
  shock: { brow: 1, eyeS: 1.35, pupil: 3, mouth: { o: .5, w: .6 } }, happy: { brow: -.2, lid: .15, mouth: { sm: .9 } }, proud: { brow: -.4, lid: .3, mouth: { sm: .8, skew: .3 } },
  bored: { brow: 0, lid: .5, mouth: { sm: -.3 } }, think: { brow: .7, look: [.6, -.7], mouth: { sm: -.2, skew: .4 } }, wow: { brow: .8, eyeS: 1.25, mouth: { o: .35, sm: .4 } },
};
const PROFE = {
  deadpan: { lid: .55, brow: 0, mouth: { sm: -.15 } }, smug: { lid: .45, brow: -.3, mouth: { sm: .45, skew: .35 } }, tired: { lid: .72, brow: .2, mouth: { sm: -.3 } },
  alarmed: { lid: .05, brow: 1, mouth: { o: .4, w: .7 } }, explain: { lid: .4, brow: .4, mouth: { sm: 0 } }, happy: { lid: .3, brow: -.2, mouth: { sm: .7 } },
};
const ARMS = {
  max: { idle: { armR: { h: [16, 150], bend: 18 }, armL: { h: [-14, 150], bend: -18 } }, talk: { armR: { h: [90, 40], bend: 40, point: false } },
    panic: { armR: { h: [70, -150], bend: -30 }, armL: { h: [-70, -150], bend: 30 } }, point: { armR: { h: [150, -10], bend: 10, point: true } }, phone: { armR: { h: [60, 60], bend: 50 }, holdPhone: true } },
  prof: { idle: { armR: { h: [12, 190], bend: 14 }, armL: { h: [-10, 190], bend: -14 } }, talk: { armR: { h: [70, -40], bend: 50, point: true } },
    explain: { armR: { h: [60, -160], bend: 40, point: true } }, press: { armR: { h: [160, -30], bend: 20, point: true } } },
};
function lineAt(t) { return TL.lines.find(l => t >= l.t && t < l.t + l.dur); }
function lastLine(t, who) { let r = null; for (const l of TL.lines) if (l.t <= t && (!who || l.who === who)) r = l; return r; }
function envAt(l, t) { if (!l || !l.env) return 0; const i = Math.floor((q12(t) - l.t) * 24); return l.env[clamp(i, 0, l.env.length - 1)] || 0; }
function blinkAt(t, seed) { const p = 2.6 + hash(seed) * 1.8, u = (t + hash(seed + 3) * p) % p; return u < 1 / 12; }

function poseOf(who, t, scene) {
  const E = who === 'max' ? MAXE : PROFE, cur = lineAt(t), last = lastLine(t, who);
  let emo = who === 'max' ? 'curious' : 'deadpan', arm = 'idle', speaking = false;
  if (cur && cur.who === who) { emo = cur.emo || emo; speaking = true; arm = cur.arm || (who === 'prof' ? (emo === 'explain' ? 'explain' : 'talk') : (emo === 'panic' ? 'panic' : 'talk')); }
  else if (cur && cur.react && cur.react[who]) emo = cur.react[who];
  else if (last) emo = last.emo || emo;
  if (who === 'prof' && scene.press && t >= scene.press[0] && t < scene.press[1]) arm = 'press';
  const P = { ...(E[emo] || {}), ...ARMS[who].idle, ...(ARMS[who][arm] || {}) };
  P.mouth = { ...(P.mouth || {}) };
  if (speaking) { const v = envAt(cur, t); P.mouth.o = Math.min(1, v * 1.25); if (v > .05) P.mouth.w = .75 + v * .3; }
  P.blink = blinkAt(t, who === 'max' ? 1 : 7) && !speaking;
  P.t = t;
  if (P.sweat === true) P.sweat = t * .8;
  // breathing / nod with loudness, on twos
  const tq = q12(t); P.sq = 1 + Math.sin(tq * 2.2 + (who === 'max' ? 0 : 1)) * .01; P.bob = speaking ? -envAt(cur, t) * 8 : 0;
  return P;
}

function drawChars(t, scene, land) {
  for (const who of ['max', 'prof']) {
    const P = poseOf(who, t, scene), pos = POS[who];
    let y = FLOOR, sq = P.sq;
    if (land != null) {   // falling out of the portal, squash on landing
      const u = land;
      if (u < .25) { y = FLOOR - 700 * Math.pow(1 - u / .25, 2); sq = 1.18; }
      else { const k = u - .25; sq = 1 - .22 * Math.exp(-k * 7) * Math.cos(k * 22); }
    }
    const fn = who === 'max' ? max : prof;
    fn({ ...P, x: pos.x, y, face: pos.face, s: 1, sq });
  }
}

// camera: world → screen
function setCam(c, t) { T.reset(); T.translate(W / 2, H / 2); T.scale(c.z); T.translate(-c.cx, -c.cy); }
function camFor(t, scene) {
  const sh = shotAt(t), base = CAMS[sh.cam] || CAMS.two, u = clamp((t - sh.t0) / Math.max(.01, sh.t1 - sh.t0));
  let c = { ...base, z: base.z * (1 + (sh.push ?? .04) * u) };
  const cur = lineAt(t);
  if (cur && cur.shake && t - cur.t < .5) { const k = Math.floor(t * 12); c.cx += (hash(k) - .5) * 30; c.cy += (hash(k + 9) - .5) * 30; }
  // rush zoom into the portal at the end of a scene that leaves through it
  if (scene.exit && t > scene.t1 - .5) { const k = eio(seg(t, scene.t1 - .5, scene.t1)), P = scene.kind === 'home' ? PORTAL_HOME : PORTAL_WORLD; c = { cx: lerp(c.cx, P[0], k), cy: lerp(c.cy, P[1], k), z: lerp(c.z, 4.5, k) }; }
  return c;
}

// screen-space swirl wipe (the portal filling the frame)
function swirl(t, k) {
  if (k <= 0) return;
  T.reset(); T.translate(W / 2, H / 2);
  portal(0, 0, 1500 * k, t * 1.6, { open: 1, sx: 1, spin: 2 });
}

// —— overlays (screen space) ——
function band(t) {
  const B = TL.band; if (!B || t < B.t0 || t >= B.t1) return;
  const k = Math.min(1, Math.floor((t - B.t0) * 12) / 2), lines = B.text.split('\n');
  g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.translate(W / 2, 250); g.rotate(-.03); g.scale(1, k);
  const h = 90 * lines.length + 50;
  g.fillStyle = '#17140f'; g.fillRect(-470 + 10, -h / 2 + 10, 940, h); g.fillStyle = '#f5b62a'; g.fillRect(-470, -h / 2, 940, h);
  g.fillStyle = '#17140f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 76px "Baloo 2"';
  lines.forEach((L, i) => g.fillText(L, 0, (i - (lines.length - 1) / 2) * 88 + 6));
  g.restore();
}
function worldTag(t, scene) {
  if (scene.kind !== 'world' || !scene.tag) return;
  const lt = t - scene.t0 - .35; if (lt < 0) return;
  const s = scene.tag.slice(0, Math.floor(lt * 30)), P = palOf(scene.set, scene.palette);
  g.setTransform(1, 0, 0, 1, 0, 0); g.font = '400 56px VT323'; g.textAlign = 'left'; g.textBaseline = 'middle';
  const w = g.measureText('> ' + scene.tag).width + 40;
  g.fillStyle = 'rgba(23,20,15,.85)'; g.beginPath(); g.roundRect(40, 120, w, 70, 12); g.fill();
  g.fillStyle = '#9fd8b0'; g.fillText('> ' + s + (Math.floor(t * 4) % 2 ? '_' : ''), 60, 157);
}
function wrap(text, maxW) {
  const out = []; for (const para of text.split('\n')) { let cur = ''; for (const w of para.split(' ')) { const tryS = cur ? cur + ' ' + w : w; if (g.measureText(tryS).width > maxW && cur) { out.push(cur); cur = w; } else cur = tryS; } if (cur) out.push(cur); } return out;
}
function subtitles(t) {
  const l = TL.lines.find(x => t >= x.t - .05 && t < x.sub_t1); if (!l) return;
  g.setTransform(1, 0, 0, 1, 0, 0); g.font = '800 58px "Baloo 2"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const lines = wrap(l.text, 940), yb = H - 420, top = yb - (lines.length - 1) * 66;
  const col = l.who === 'max' ? '#8a55b8' : '#1f8f5f', name = l.who === 'max' ? 'MAX' : 'LE PROF';
  g.font = '800 34px "Baloo 2"'; const pw = g.measureText(name).width + 36;
  g.fillStyle = col; g.strokeStyle = '#17140f'; g.lineWidth = 5; g.beginPath(); g.roundRect(W / 2 - pw / 2, top - 92, pw, 50, 25); g.fill(); g.stroke();
  g.fillStyle = '#faf6ee'; g.fillText(name, W / 2, top - 66);
  g.font = '800 58px "Baloo 2"';
  lines.forEach((L, i) => { const y = top + i * 66; g.strokeStyle = '#17140f'; g.lineWidth = 12; g.strokeText(L, W / 2, y); g.fillStyle = '#ffffff'; g.fillText(L, W / 2, y); });
}
function endCard(t, scene) {
  const lt = t - scene.t0;
  T.reset(); T.fillOnly(T.rect(0, 0, W, H), '#faf6ee', { boil: 0 });
  // the duo, waving from the bottom
  T.reset(); T.translate(0, 300);
  max({ ...MAXE.happy, ...ARMS.max.idle, armR: { h: [80, -170 + Math.sin(q12(t) * 10) * 30], bend: -20 }, x: 300, y: FLOOR, face: 1, s: 1, t, mouth: { sm: .9, o: .3 } });
  prof({ ...PROFE.smug, ...ARMS.prof.idle, x: 790, y: FLOOR, face: -1, s: 1, t });
  T.reset();
  const k = Math.min(1, Math.floor(lt * 12) / 3);
  g.setTransform(1, 0, 0, 1, 0, 0); g.save(); g.translate(W / 2, 420); g.scale(k, k);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 150px "Baloo 2"'; g.lineJoin = 'round';
  g.strokeStyle = '#17140f'; g.lineWidth = 14; g.strokeText('LE SACHOIR', 0, 0); g.fillStyle = '#f5b62a'; g.fillText('LE SACHOIR', 0, 0);
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (lt > .25) { g.fillStyle = '#17140f'; g.fillRect(140, 540, 800, 110); g.fillStyle = '#faf6ee'; g.font = '800 76px "Baloo 2"'; g.fillText(TL.end?.url || 'lesachoir.fr', W / 2, 598); }
  if (lt > .5) { g.fillStyle = '#17140f'; g.font = '800 46px "Baloo 2"'; for (const [i, L] of (TL.end?.lines || ['Une question comme ça,', 'chaque matin, en BD.']).entries()) g.fillText(L, W / 2, 730 + i * 58); }
}

function render(t) {
  T.frame(t, { amp: 1.7 });
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const scene = sceneAt(t);
  if (scene.kind === 'end') { endCard(t, scene); return; }
  const c = camFor(t, scene); setCam(c, t);
  const lt = t - scene.t0;
  if (scene.kind === 'home') {
    const po = scene.portal ? clamp(back(seg(t, scene.portal[0], scene.portal[0] + .35), .9) * (t < scene.portal[1] ? 1 : 0)) : 0;
    lab(t, { board1: TL.board?.[0], board2: TL.board?.[1], machine: scene.portal && t >= scene.portal[0] - .3 ? 1 : 0 });
    portal(PORTAL_HOME[0], PORTAL_HOME[1], 230, t, { open: po });
    drawChars(t, scene, scene.back ? (lt < .7 ? lt / .7 : null) : null);
  } else {
    const P = palOf(scene.set, scene.palette);
    world(scene.set, P, t);
    const so = clamp(seg(lt, .55, .85)) * (scene.exit ? 1 - clamp(seg(t, scene.t1 - 1.1, scene.t1 - .8)) : 1);
    holoScreen(540, 520, 640, 440, t, { img: scene.img ? IMG[scene.img] : null, big: scene.img ? '' : scene.big, small: scene.img ? '' : scene.small, P, on: so });
    if (scene.img) plate(540, 800, scene.big, t, clamp(seg(lt, .9, 1.1)) * so);
    if (scene.exit) portal(PORTAL_WORLD[0], PORTAL_WORLD[1], 210, t, { open: clamp(back(seg(t, scene.t1 - 1.0, scene.t1 - .7), .9)) });
    if (scene.bidule) bidule(150, FLOOR + 20, .8, t, { col: P.acc, look: [.6, -.3], blink: blinkAt(t, 13), hop: (t * .7) % 1 < .25 ? ((t * .7) % 1) / .25 : 0 });
    drawChars(t, scene, lt < .7 ? lt / .7 : null);
  }
  // transitions: swirl in at the end of an exiting scene, swirl out at the start of an arriving one
  if (scene.exit && t > scene.t1 - .25) swirl(t, eio(seg(t, scene.t1 - .25, scene.t1)));
  if (scene.enter && lt < .35) swirl(t, 1 - eo(seg(lt, 0, .35)));
  g.setTransform(1, 0, 0, 1, 0, 0);
  band(t); worldTag(t, scene); subtitles(t);
}

// sound events for the mix
function events() {
  const ev = [], add = (type, t, o = {}) => ev.push({ type, t: +t.toFixed(3), ...o });
  for (const s of TL.scenes) {
    if (s.portal) { add('machine', s.portal[0] - .3); add('portal_open', s.portal[0]); }
    if (s.exit) { add('swirl', s.t1 - .45); }
    if (s.enter) { add('land', s.t0 + .18); if (s.kind === 'world') add('blip', s.t0 + .6); }
    if (s.bidule) add('glorp', s.t0 + 1.2);
    if (s.kind === 'end') add('ding', s.t0 + .05);
  }
  for (const l of TL.lines) if (l.shake) add('boing', l.t);
  return ev.sort((a, b) => a.t - b.t);
}
window.EV = events();
window.DUR = TL.dur;
window.render = render;
render(parseFloat(qs.get('t') ?? '1'));
window.READY = true;
