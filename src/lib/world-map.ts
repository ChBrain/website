// Equirectangular projection of Natural Earth admin-0 country outlines into a
// 1000x500 viewBox, precomputed at build time. The cultures map component
// (src/components/CultureMap.astro) draws these paths and drops a marker on
// each country that carries a culture package.
//
// Build-time only: the geojson never reaches the client; only the rendered
// path strings (and the centroids the page asks for) ship in the page HTML.
// The source geojson lives beside this file (src/lib/world.geo.json) so the
// whole map machinery is one chassis unit.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const W = 1000;
const H = 500;

/** SVG viewBox the projection targets. */
export const VIEWBOX = `0 0 ${W} ${H}`;

interface RawFeature {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

function project(lng: number, lat: number): [number, number] {
  return [((lng + 180) / 360) * W, ((90 - lat) / 180) * H];
}

// One ring -> one "M..L..Z" subpath. Coordinates are rounded to 0.1px and
// near-duplicate points (within 0.4px of the previous) are dropped, which
// shrinks the emitted path strings substantially without visible loss.
function ringPath(ring: number[][]): string {
  let d = "";
  let px = NaN;
  let py = NaN;
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const [x, y] = project(lng, lat);
    const rx = Math.round(x * 10) / 10;
    const ry = Math.round(y * 10) / 10;
    const last = i === ring.length - 1;
    if (i > 0 && !last && Math.abs(rx - px) < 0.4 && Math.abs(ry - py) < 0.4) continue;
    d += (d === "" ? "M" : "L") + rx + " " + ry;
    px = rx;
    py = ry;
  }
  return d ? d + "Z" : "";
}

function geometryPath(geom: { type: string; coordinates: unknown }): string {
  if (geom.type === "Polygon") {
    return (geom.coordinates as number[][][]).map(ringPath).join("");
  }
  if (geom.type === "MultiPolygon") {
    return (geom.coordinates as number[][][][]).map((poly) => poly.map(ringPath).join("")).join("");
  }
  return "";
}

function iso2Of(p: Record<string, unknown>): string {
  const v = (p.ISO_A2_EH ?? p.ISO_A2 ?? "") as unknown;
  return typeof v === "string" ? v.toUpperCase() : "";
}

const raw = JSON.parse(readFileSync(join(process.cwd(), "src/lib/world.geo.json"), "utf8")) as {
  features: RawFeature[];
};

export interface CountryPath {
  iso2: string;
  name: string;
  d: string;
}

/** Every country outline, projected, ready to drop into <path d>. */
export const COUNTRIES: CountryPath[] = raw.features
  .map((f) => ({
    iso2: iso2Of(f.properties),
    name: String(f.properties.NAME ?? f.properties.ADMIN ?? ""),
    d: geometryPath(f.geometry),
  }))
  .filter((c) => c.d.length > 0);

// Bounding-box centre of a country's projected geometry: good enough to drop a
// marker for the countries we place. (Wrong for territories that straddle the
// antimeridian, none of which carry a culture today.)
const centroidCache = new Map<string, [number, number] | null>();

function computeCentroid(iso2: string): [number, number] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  const visit = (coords: unknown): void => {
    if (Array.isArray(coords) && typeof coords[0] === "number") {
      const [x, y] = project(coords[0] as number, coords[1] as number);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      found = true;
    } else if (Array.isArray(coords)) {
      for (const c of coords) visit(c);
    }
  };
  for (const f of raw.features) {
    if (iso2Of(f.properties) !== iso2) continue;
    visit(f.geometry.coordinates);
  }
  return found ? [(minX + maxX) / 2, (minY + maxY) / 2] : null;
}

/** Projected centre of a country by ISO 3166-1 alpha-2, or null if unknown. */
export function centroidByIso(iso2: string): [number, number] | null {
  const key = iso2.toUpperCase();
  if (!centroidCache.has(key)) centroidCache.set(key, computeCentroid(key));
  return centroidCache.get(key) ?? null;
}

// Atlas: country name + UN M49 region, both derived from the same Natural Earth
// properties (NAME, REGION_UN) so the geometry stays the single source. These
// are the nameFor/regionFor the culture-tree injects: the website owns names and
// the region key (CVI maps the key -> a brand token in the component's CSS), so
// the data package emits ISO codes only, never names or colours.

interface CountryFacts {
  name: string;
  region: string | null;
}

const factsByIso = new Map<string, CountryFacts>();
for (const f of raw.features) {
  const iso = iso2Of(f.properties);
  if (!iso || factsByIso.has(iso)) continue;
  const regionUn = f.properties.REGION_UN;
  factsByIso.set(iso, {
    name: String(f.properties.NAME ?? f.properties.ADMIN ?? ""),
    region: typeof regionUn === "string" && regionUn !== "" ? regionUn.toLowerCase() : null,
  });
}

/**
 * English country name for an ISO 3166-1 alpha-2 code (Natural Earth NAME), or
 * null. Subdivision codes (3166-2) return null — those are named by the
 * culture's own title, not the country atlas.
 */
export function countryName(iso2: string): string | null {
  return factsByIso.get(iso2.toUpperCase())?.name ?? null;
}

/**
 * UN M49 macro-region key ("europe", "asia", "africa", "americas", "oceania")
 * for an ISO code, or null. A subdivision (3166-2) inherits its country's region
 * ("DE-BY" -> "DE" -> "europe").
 */
export function regionKeyOf(iso: string): string | null {
  const code = iso.toUpperCase();
  const hyphen = code.indexOf("-");
  const country = hyphen > 0 ? code.slice(0, hyphen) : code;
  return factsByIso.get(country)?.region ?? null;
}
