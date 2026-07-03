// The misfits house search index. Astro prerenders it to
// `dist/misfits/search-index.json`, fetched as `./search-index.json` from the
// misfits shelf. The misfits surface is a single house, so — like the per-house
// plays index — every row is already inside it: no house rows, base "", and
// links resolve from the misfits root (/misfits/<misfit>/...).
//
// Shares the builders in `../plays/_search-index.ts` with the plays indexes, so
// all three strip, clip, and slug identically.
import type { APIRoute } from "astro";
import { loadAllMisfits } from "../../lib/load-misfits";
import { entriesForPlay, type SearchEntry } from "../plays/_search-index";

export const prerender = true;

export const GET: APIRoute = () => {
  const misfits = loadAllMisfits();
  const entries: SearchEntry[] = [];

  // Base "" and no house crumb: every row is already inside this house, and
  // links resolve from the misfits root.
  for (const p of misfits) {
    entries.push(...entriesForPlay(p, ""));
  }

  // No `generated` timestamp on purpose: the index must be byte-stable across
  // builds (same rule as the deterministic element sort in load-plays).
  return new Response(JSON.stringify({ entries }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
