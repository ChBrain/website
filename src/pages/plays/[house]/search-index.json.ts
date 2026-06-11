// The per-house search index. Astro prerenders one per installed house to
// `dist/plays/<house>/search-index.json`, fetched as `./search-index.json`
// from the house page. Scoped to the one house: its plays and everything
// inside them (personas, places, pieces, positions, processes, plots, plans,
// references) — no house rows, no other houses. URLs are relative to the house
// root (no house-id prefix), so they resolve from `/plays/<house>/`.
//
// Shares the builders in `../_search-index.ts` with the bill index, so the two
// strip, clip, and slug identically.
import type { APIRoute } from "astro";
import { loadAllPlays } from "../../../lib/load-plays";
import { entriesForPlay, type SearchEntry } from "../_search-index";

export function getStaticPaths() {
  // Only installed houses have plays to index (and a real page to search).
  const houseIds = [...new Set(loadAllPlays().map((p) => p.houseId))];
  return houseIds.map((id) => ({ params: { house: id } }));
}

export const prerender = true;

export const GET: APIRoute = ({ params }) => {
  const plays = loadAllPlays().filter((p) => p.houseId === params.house);
  const entries: SearchEntry[] = [];

  // Base "" and no house crumb: every row is already inside this house, and
  // links resolve from the house root.
  for (const p of plays) {
    entries.push(...entriesForPlay(p, ""));
  }

  return new Response(JSON.stringify({ entries }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
