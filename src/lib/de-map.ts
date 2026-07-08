// Sub-national geometry: projects a country's ISO 3166-2 subdivision outlines
// into a viewBox fitted to the country's bounding box, so the sub-map fills the
// frame. Same precompute-at-build-time approach as world-map.ts; the source
// geojson (Natural Earth admin-1, public domain) lives beside this file as
// <cc>.geo.json. The world map drills into one of these when a country has
// subdivisions that carry a culture (Germany -> its Bundesländer today).
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SubOutline {
  /** ISO 3166-2 code, e.g. "DE-SH". */
  iso2: string;
  name: string;
  d: string;
}
export interface SubMap {
  outlines: SubOutline[];
  viewbox: string;
}

interface RawFeature {
  properties: { iso: string; name: string };
  geometry: { type: string; coordinates: unknown };
}

const W = 1000;
const PAD = 10;

function bbox(features: RawFeature[]): [number, number, number, number] {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const lon = c[0] as number;
      const lat = c[1] as number;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else if (Array.isArray(c)) {
      for (const x of c) visit(x);
    }
  };
  for (const f of features) visit(f.geometry.coordinates);
  return [minLon, minLat, maxLon, maxLat];
}

// Equirectangular fit: longitude is compressed by cos(meanLat) so the country
// keeps its shape, then scaled uniformly to a 1000-wide box with padding.
function project(raw: { features: RawFeature[] }): SubMap {
  const [minLon, minLat, maxLon, maxLat] = bbox(raw.features);
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const scale = (W - 2 * PAD) / ((maxLon - minLon) * kx);
  const H = Math.round((maxLat - minLat) * scale + 2 * PAD);

  const pt = (lon: number, lat: number): [number, number] => [
    PAD + (lon - minLon) * kx * scale,
    PAD + (maxLat - lat) * scale,
  ];
  const ring = (r: number[][]): string => {
    let d = "";
    let px = NaN;
    let py = NaN;
    for (let i = 0; i < r.length; i++) {
      const [x, y] = pt(r[i][0], r[i][1]);
      const rx = Math.round(x * 10) / 10;
      const ry = Math.round(y * 10) / 10;
      const last = i === r.length - 1;
      if (i > 0 && !last && Math.abs(rx - px) < 0.4 && Math.abs(ry - py) < 0.4) continue;
      d += (d === "" ? "M" : "L") + rx + " " + ry;
      px = rx;
      py = ry;
    }
    return d ? d + "Z" : "";
  };
  const geom = (g: { type: string; coordinates: unknown }): string => {
    if (g.type === "Polygon") return (g.coordinates as number[][][]).map(ring).join("");
    if (g.type === "MultiPolygon")
      return (g.coordinates as number[][][][]).map((p) => p.map(ring).join("")).join("");
    return "";
  };

  const outlines = raw.features
    .map((f) => ({
      iso2: f.properties.iso.toUpperCase(),
      name: f.properties.name,
      d: geom(f.geometry),
    }))
    .filter((o) => o.d.length > 0)
    .sort((a, b) => a.iso2.localeCompare(b.iso2));
  return { outlines, viewbox: `0 0 ${W} ${H}` };
}

function load(file: string): SubMap {
  // Deliberately read from process.cwd(): Astro prerender bundles this module
  // into dist/.prerender/chunks/, so import.meta.url-relative paths resolve to
  // a location the geojson is never copied to. Builds always run from the
  // repo root, so the cwd-anchored path is the one that works.
  const raw = JSON.parse(readFileSync(join(process.cwd(), "src/lib", file), "utf8")) as {
    features: RawFeature[];
  };
  return project(raw);
}

// One projected sub-map per bundled country. Add a country here (plus its
// <cc>.geo.json) when its subdivisions start carrying cultures. DE uses Natural
// Earth admin-1 (Bundesländer); GB uses admin-0 map-subunits (the home nations,
// coded GB-ENG/SCT/WLS/NIR to match the cultures' ISO 3166-2 anchors). ES is
// the 17 autonomous communities dissolved from Natural Earth admin-1 provinces
// and rekeyed to their ISO 3166-2 codes (ES-AN … ES-VC); the Canary Islands
// (ES-CN) are baked into a lower-left inset so the mainland bbox fit stays
// undistorted — its coordinates there are inset space, not real lon/lat. US is
// the 50 states + DC from us-atlas (Census Bureau boundaries pre-projected
// with d3.geoAlbersUsa — Alaska and Hawaii inset), rekeyed FIPS -> US-XX and
// rescaled into a pseudo-degree frame centred on lat 0: there cos(meanLat) is
// 1 and the y flip below restores the pre-flipped axis, so this loader renders
// the Albers composite unchanged. Its coordinates are projection space, not
// real longitude/latitude.
const SUBMAPS: Record<string, SubMap> = {
  DE: load("de.geo.json"),
  ES: load("es.geo.json"),
  GB: load("gb.geo.json"),
  US: load("us.geo.json"),
};

/** Projected subdivision geometry for a country ISO, or null when none is bundled. */
export function subMapFor(iso: string): SubMap | null {
  return SUBMAPS[iso.toUpperCase()] ?? null;
}
