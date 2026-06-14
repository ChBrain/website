// Shared builders for the plays search indexes. Underscore-prefixed so Astro
// keeps it out of the route table (same convention as `_mock.ts`); it is
// imported by the bill index endpoint (`search-index.json.ts`) and the
// per-house one (`[house]/search-index.json.ts`) so both stay byte-identical
// in how they strip, clip, and slug.
//
// The anchor slugs MUST match `[house]/[play]/index.astro` — keep `refSlug`
// here in lockstep with the page's reference slugging.
import type { Play } from "../../lib/load-plays";

export interface SearchEntry {
  /** house | play | <element type> | reference */
  kind: string;
  /** the display face (the book reads the declared/original name) */
  title: string;
  /** the house this lives under (omitted when the index is already a house) */
  house?: string;
  /** the play this lives under (element/reference entries only) */
  play?: string;
  /** searchable + preview body, already stripped and clipped */
  text: string;
  /** href relative to the page that fetches the index */
  url: string;
}

/** Strip the rendered HTML back to searchable plain text. The sections are
 *  stored as HTML (markdown-it output, with `&mdash;`/`&ndash;` entities from
 *  `cleanHtml`); search wants words, not tags. */
export function stripHtml(html: string): string {
  return (
    (html || "")
      .replace(/<[^>]+>/g, " ")
      // Keep previews U+2014-free, matching the site-wide dash invariant the
      // built HTML upholds (cleanText). The em-dash test only scans .html, so
      // normalize here or these .json previews would smuggle raw em-dashes in.
      .replace(/&mdash;/g, " - ")
      .replace(/&ndash;/g, " - ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      // Unescape the ampersand LAST so a literal "&amp;lt;" survives as "&lt;"
      // rather than collapsing to "<" (js/double-escaping).
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Clip a body to a preview length on a word boundary. */
export function snip(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/** Title-case a lower-cased heading (sections are stored lower-cased). */
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Reference anchor slug — MUST match the page's `ref-<slug>` minting. */
export function refSlug(heading: string): string {
  return `ref-${heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

/**
 * Every searchable entry for one play: the play, each element (persona, place,
 * piece, position, process, plot, plan), and each reference section.
 *
 * `base` is prefixed to every URL: the bill prepends the house id
 * (`buechner/`) so links resolve from `/plays/`; a house page is already inside
 * the house, so it passes `""` and links resolve from `/plays/<house>/`.
 * `house` rides along as the crumb's house part — omitted on a house-scoped
 * index, where every row is already in the same house.
 */
export function entriesForPlay(p: Play, base: string, house?: string): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const crumb = house ? { house } : {};

  const playBody = [p.description, ...Object.values(p.sections)].map(stripHtml).join(" ");
  entries.push({
    kind: "play",
    title: p.title,
    ...crumb,
    // Carry the declared (original) name into the haystack so a German-title
    // search hits the English-titled shelf card too.
    text: snip(
      [p.declared !== p.title ? p.declared : "", playBody].filter(Boolean).join(" · "),
      360,
    ),
    url: `${base}${p.id}/`,
  });

  for (const el of p.elements) {
    const elBody = Object.values(el.sections).map(stripHtml).join(" ");
    entries.push({
      kind: el.type,
      title: el.declared || el.title,
      ...crumb,
      play: p.title,
      text: snip(
        [el.title !== el.declared ? el.title : "", elBody].filter(Boolean).join(" · "),
        280,
      ),
      url: `${base}${p.id}/#el-${el.id}`,
    });
  }

  if (p.reference) {
    for (const [heading, html] of Object.entries(p.reference.sections)) {
      entries.push({
        kind: "reference",
        title: titleCase(heading),
        ...crumb,
        play: p.title,
        text: snip(stripHtml(html), 280),
        url: `${base}${p.id}/#${refSlug(heading)}`,
      });
    }
  }

  return entries;
}
