// Construit app/assets/geo.json : tracés SVG légers du monde (projection de Miller) et des départements
// (projection équirectangulaire centrée sur la France). Projections inversibles côté appli.
// Lancer à la main, rarement (les frontières bougent peu) :
//   npm i world-atlas@2 topojson-client i18n-iso-countries
//   curl -o depts.geojson https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson
//   node geo_build.mjs ../app/assets/geo.json
// Sources : Natural Earth (domaine public, via world-atlas), départements IGN/Etalab (Licence Ouverte, via france-geojson).
import fs from "node:fs";
import { feature } from "topojson-client";
import countries from "i18n-iso-countries";
import fr from "i18n-iso-countries/langs/fr.json" with { type: "json" };
countries.registerLocale(fr);

const out = process.argv[2];
const R = Math.PI / 180;

// ---- Monde : Miller, en « degrés » × S
const WS = 5.5, LAT_TOP = 84, LAT_BOT = -58;
const millerY = lat => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * R)) / R;
const W = {
  S: WS, top: millerY(LAT_TOP),
  p: ([lon, lat]) => [(lon + 180) * WS, (millerY(LAT_TOP) - millerY(Math.max(LAT_BOT, Math.min(LAT_TOP, lat)))) * WS],
};
// ---- France : équirectangulaire, cos(46.5°)
const F = { lon0: -5.3, lat0: 51.2, k: Math.cos(46.5 * R), S: 100 };
F.p = ([lon, lat]) => [(lon - F.lon0) * F.k * F.S, (F.lat0 - lat) * F.S];

function rdp(pts, tol) { // Douglas-Peucker
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function ringPath(ring, proj, step) {
  let d = "", last = null, n = 0;
  const P = ring.map(proj), h = Math.floor(P.length / 2);
  const simp = P.length < 8 ? P : rdp(P.slice(0, h + 1), step).concat(rdp(P.slice(h), step).slice(1));
  for (const pt of simp) {
    const [x, y] = pt.map(v => Math.round(v));
    const key = x + "," + y;
    if (key === last) continue;
    d += (n ? " " : "M") + +x.toFixed(1) + " " + +y.toFixed(1); last = key; n++;
  }
  return n >= 3 ? d + "Z" : "";
}
function polys(geom) { return geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : []; }
function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return a / 2; }
function centroid(r) { // centroïde d'anneau (lon/lat)
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
  }
  a /= 2; return [+(cx / (6 * a)).toFixed(3), +(cy / (6 * a)).toFixed(3)];
}
function shape(geom, proj, step) {
  const ps = polys(geom);
  let best = null, bestA = 0;
  const parts = ps.map(p => {
    const a = Math.abs(ringArea(p[0])); if (a > bestA) { bestA = a; best = p; }
    return p.map(r => ringPath(r, proj, step)).join("");
  });
  return { d: parts.join(""), m: ps.length > 1 ? best.map(r => ringPath(r, proj, step)).join("") : undefined, c: centroid(best[0]) };
}

// Monde
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const world = {};
for (const f of feature(topo, topo.objects.countries).features) {
  const a3 = countries.numericToAlpha3(f.id);
  const EXTRA = { Kosovo: ["XKX", "Kosovo"], Somaliland: ["XSL", "Somaliland"], "N. Cyprus": ["XNC", "Chypre du Nord"] };
  const ex = EXTRA[f.properties.name];
  if (!a3 && !ex) continue; // territoires sans code (Siachen, territoires de l'océan Indien)
  const id = a3 || ex[0];
  if (id === "ATA") continue; // Antarctique hors cadre
  const s = shape(f.geometry, W.p, 0.7);
  if (!s.d) continue;
  world[id] = { n: a3 ? countries.getName(a3, "fr") : ex[1], ...s };
}
// Noms courts usuels
const SHORT = { USA: "États-Unis", CZE: "Tchéquie", GBR: "Royaume-Uni", RUS: "Russie", COD: "RD Congo", COG: "Congo", BOL: "Bolivie", VEN: "Venezuela", IRN: "Iran", SYR: "Syrie", TZA: "Tanzanie", VNM: "Viêt Nam", LAO: "Laos", MDA: "Moldavie", KOR: "Corée du Sud", PRK: "Corée du Nord", FSM: "Micronésie", VAT: "Vatican", PSE: "Palestine", TWN: "Taïwan", CIV: "Côte d’Ivoire", SWZ: "Eswatini", ARE: "Émirats arabes unis", SAU: "Arabie saoudite", DOM: "République dominicaine" };
for (const [k, v] of Object.entries(SHORT)) if (world[k]) world[k].n = v;
// Départements
const dg = JSON.parse(fs.readFileSync("depts.geojson", "utf8"));
const dep = {};
for (const f of dg.features) dep[f.properties.code] = { n: f.properties.nom, ...shape(f.geometry, F.p, 1.6) };

const data = {
  world: { proj: "miller", S: WS, top: +W.top.toFixed(4), latMin: LAT_BOT, latMax: LAT_TOP, w: 360 * WS, h: +((W.top - millerY(LAT_BOT)) * WS).toFixed(1), shapes: world },
  france: { proj: "eqr", lon0: F.lon0, lat0: F.lat0, k: +F.k.toFixed(6), S: F.S, shapes: dep },
};
// cadre France calculé sur les départements
let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
for (const f of dg.features) for (const p of polys(f.geometry)) for (const pt of p[0]) { const [x, y] = F.p(pt); minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
data.france.box = [Math.floor(minx) - 20, Math.floor(miny) - 20, Math.ceil(maxx - minx) + 40, Math.ceil(maxy - miny) + 40];
fs.writeFileSync(out, JSON.stringify(data));
console.log("pays", Object.keys(world).length, "départements", Object.keys(dep).length, "taille", fs.statSync(out).size);
console.log(Object.keys(world).filter(k => k.startsWith("X")));
