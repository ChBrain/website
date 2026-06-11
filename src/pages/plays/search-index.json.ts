// The plays search index. A static endpoint: Astro prerenders it to
// `dist/plays/search-index.json`, which the per-surface deploy rsyncs to the
// plays root (so it is fetched as `./search-index.json` from `/plays/`). No
// server runs at request time — the index is assembled here, at build, from
// the same `loadAllPlays()` the pages read, so search can never drift from
// what the books render.
//
// The index reaches down to elements (personas, places, pieces, positions,
// processes, plots) and reference sections, each pointing at the in-book
// anchor the Book chassis already mints (`#el-<id>`, `#ref-<slug>`). The
// anchor slugs MUST match `[house]/[play]/index.astro` — keep the `refSlug`
// here in lockstep with the page's reference slugging.
import type { APIRoute } from "astro";
import { loadRegistry } from "@chbrain/khai-plays";
import { loadAllPlays } from "../../lib/load-plays";

/** Strip the rendered HTML back to searchable plain text. The sections are
 *  stored as HTML (markdown-it output, with `&mdash;`/`&ndash;` entities from
 *  `cleanHtml`); search wants words, not tags. */
function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Clip a body to a preview length on a word boundary. */
function snip(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Title-case a lower-cased heading (sections are stored lower-cased). */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Reference anchor slug — MUST match the page's `ref-<slug>` minting. */
function refSlug(heading: string): string {
  return `ref-${heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export interface SearchEntry {
  /** house | play | <element type> | reference */
  kind: string;
  /** the display face (the book reads the declared/original name) */
  title: string;
  /** the house this lives under (omitted on house entries) */
  house?: string;
  /** the play this lives under (element/reference entries only) */
  play?: string;
  /** searchable + preview body, already stripped and clipped */
  text: string;
  /** surface-root-relative href (resolves from `/plays/`) */
  url: string;
}

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

  for (const p of plays) {
    const playBody = [p.description, ...Object.values(p.sections)].map(stripHtml).join(" ");
    entries.push({
      kind: "play",
      title: p.title,
      house: p.houseTitle,
      // Carry the declared (original) name into the haystack so a German title
      // search hits the English-titled shelf card too.
      text: snip(
        [p.declared !== p.title ? p.declared : "", playBody].filter(Boolean).join(" — "),
        360,
      ),
      url: `${p.houseId}/${p.id}/`,
    });

    for (const el of p.elements) {
      const elBody = Object.values(el.sections).map(stripHtml).join(" ");
      entries.push({
        kind: el.type,
        title: el.declared || el.title,
        house: p.houseTitle,
        play: p.title,
        text: snip(
          [el.title !== el.declared ? el.title : "", elBody].filter(Boolean).join(" — "),
          280,
        ),
        url: `${p.houseId}/${p.id}/#el-${el.id}`,
      });
    }

    if (p.reference) {
      for (const [heading, html] of Object.entries(p.reference.sections)) {
        entries.push({
          kind: "reference",
          title: titleCase(heading),
          house: p.houseTitle,
          play: p.title,
          text: snip(stripHtml(html), 280),
          url: `${p.houseId}/${p.id}/#${refSlug(heading)}`,
        });
      }
    }
  }

  // No `generated` timestamp on purpose: the index must be byte-stable across
  // builds (same rule as the deterministic element sort in load-plays).
  return new Response(JSON.stringify({ entries }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
