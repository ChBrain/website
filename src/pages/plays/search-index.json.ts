// The bill (global) search index. A static endpoint: Astro prerenders it to
// `dist/plays/search-index.json`, which the per-surface deploy rsyncs to the
// plays root (so it is fetched as `./search-index.json` from `/plays/`). No
// server runs at request time — the index is assembled here, at build, from
// the same `loadAllPlays()` the pages read, so search can never drift from
// what the books render.
//
// This is the bill-wide index: every house, every play, and everything inside
// (personas, places, pieces, positions, processes, plots, plans, references).
// The per-house index lives in `[house]/search-index.json.ts`; both share the
// builders in `_search-index.ts`.
import type { APIRoute } from "astro";
import { loadRegistry } from "@chbrain/khai-plays";
import { loadAllPlays } from "../../lib/load-plays";
import { entriesForPlay, snip, stripHtml, type SearchEntry } from "./_search-index";

export const prerender = true;

export const GET: APIRoute = () => {
  const houses = loadRegistry();
  const plays = loadAllPlays();
  const installed = new Set(plays.map((p) => p.houseId));
  const entries: SearchEntry[] = [];

  // Houses — only the navigable (installed) ones; a WIP house has no in-site
  // page to search into, just a repo link on the bill.
  for (const h of houses) {
    if (!installed.has(h.id)) continue;
    entries.push({
      kind: "house",
      title: h.title,
      text: snip(stripHtml(h.blurb || ""), 200),
      url: `${h.id}/`,
    });
  }

  // Plays + their elements/references. The bill prepends the house id so links
  // resolve from `/plays/`, and carries the house title for the crumb.
  for (const p of plays) {
    entries.push(...entriesForPlay(p, `${p.houseId}/`, p.houseTitle));
  }

  // No `generated` timestamp on purpose: the index must be byte-stable across
  // builds (same rule as the deterministic element sort in load-plays).
  return new Response(JSON.stringify({ entries }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
