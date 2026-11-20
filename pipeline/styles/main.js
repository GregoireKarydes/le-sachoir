// main.js — Le Sachoir, Reels in alternating styles (20 November 2026): loads the style named in the timeline and exposes
// window.render(t) (deterministic), window.DUR, window.EV (sound events) and window.READY for the frame capture.
// Hand-directed Reels (`film.scene`): the video's own `ep/scene.js` draws every frame (its shots, camera and text);
// the style module still supplies the theme, the subtitles and its primitives (`KIT`), unless the scene replaces them.
import { TL, g, W, H, band, endCard, isEnd, EP } from './core.js';

const MODS = { 'ipad-sketch': './sketch.js', 'flat-space-explainer': './zoom.js', 'comic-history': './comic.js', 'hd-2d': './pixel.js', 'ink-wash': './ink.js' };
const ST = await import(MODS[TL.style] || './sketch.js');
let S = ST;
if (TL.scene) {
  const SC = await import(`./${EP}/scene.js`);
  S = { THEME: SC.THEME || ST.THEME, FONTS: [...(ST.FONTS || []), ...(SC.FONTS || [])], init: ST.init, draw: SC.draw,
        subtitles: SC.subtitles || ST.subtitles, events: SC.events || ST.events, sceneInit: SC.init, ownBand: !!SC.OWN_BAND, ownSubs: !!SC.OWN_SUBTITLES };
}
await Promise.all((S.FONTS || []).map(f => document.fonts.load(f, 'ÀÉÈÊÇ«»…’ abc 0123')));
await document.fonts.load('800 60px "Baloo 2"', 'ÀÉÈÊÇ«» abc');
if (S.init) await S.init();
if (S.sceneInit) await S.sceneInit();

function render(t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  if (isEnd(t)) { endCard(t, S.THEME); return; }
  S.draw(t);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.imageSmoothingEnabled = true;
  if (!S.ownBand) band(t, S.THEME.band, S.THEME.bandLh);
  if (!S.ownSubs) S.subtitles(t);
}
function events() {
  const ev = [], add = (type, t, o = {}) => ev.push({ type, t: +t.toFixed(3), ...o });
  for (const b of TL.beats) { add(b.i === 0 ? 'open' : 'cut', b.t0); if ((b.fx || []).includes('cross')) add('cross', b.t0 + .8); if (b.bulb) add('bulb', b.t0 + 1); }
  if (S.events) S.events(add);
  return ev.sort((a, b) => a.t - b.t);
}
window.EV = events();
window.DUR = TL.dur;
window.render = render;
render(parseFloat(new URLSearchParams(location.search).get('t') ?? '1'));
window.READY = true;
