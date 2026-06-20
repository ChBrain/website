import { frontmatter as parseFrontmatter } from "./frontmatter";

/**
 * Parser for the engine-file format (position / instance markdown).
 *
 * This is NOT the canon spec format (`parseSpec`, in parse-spec.ts). The canon
 * spec is a bullet list of `- **X**name: body` with a `---` coda and a
 * `chapters` array in frontmatter. An engine file is shaped differently:
 *
 *   ---
 *   khai: position
 *   license: CC-BY-NC-4.0
 *   stamp:
 *     owner: KAI HACKS AI
 *     version: v0.1.0
 *     date: "2026-05-27"
 *   ---
 *
 *   # Position: Gender
 *
 *   ## Taxonomy
 *   Gender
 *
 *   ## Owner
 *   - Project: khai
 *   - Engine: gender
 *
 *   ## Has
 *   <prose ...>
 *
 *   ## Orders
 *   <prose ...>
 *
 *   ## Loses
 *   <prose ...>
 *
 *   ## Drives
 *   <prose ...>
 *
 * There is no `chapters` array. The H1 is the file's heading and is skipped.
 * The substantive H2 sections become the facet cards, EXCLUDING the metadata
 * sections "Taxonomy" and "Owner". For the example above the facets are
 * Has / Orders / Loses / Drives -- their initials spell the mnemonic HOLD.
 * There is no `---` coda in this format, so the coda is always null.
 */

/** Section names that carry file metadata, not substantive facet content. */
const META_SECTIONS = new Set(["Taxonomy", "Owner"]);

/** One facet card parsed out of an engine file's H2 section. */
export interface EngineFacet {
  /** the accent first letter, e.g. "H" */
  letter: string;
  /** the full section name, e.g. "Has" */
  name: string;
  /** the prose under the heading, trimmed, up to the next "## " */
  body: string;
}

export interface ParsedEngineSpec {
  /** the substantive H2 sections as facet cards (metadata sections dropped) */
  facets: EngineFacet[];
  /** the declared `title` from frontmatter (echoes the file's H1 name, e.g.
   *  "Speaking, Borrowed"); null when the file carries none. The spread renders
   *  this in place of a filename-derived title. */
  title: string | null;
  /** the spread subtitle if the frontmatter declares one; otherwise null */
  subtitle: string | null;
  /** the `## Taxonomy` meta value -- the group the position reports into, a
   *  name (linked where it has a file), per the position template. Surfaced
   *  (e.g. in a spread's corner) rather than rendered as a facet; null when
   *  the file carries no Taxonomy section. */
  taxonomy: string | null;
}

/**
 * Parse one engine file (anchor or expression) into facet cards.
 *
 * Defensive by design: if the body has no facet-bearing H2 sections (an
 * unexpected shape, or a file that is just prose) we return a single facet
 * carrying the whole body as one prose block rather than dumping the raw
 * frontmatter. We never surface YAML to the reader.
 */
export function parseEngineSpec(text: string): ParsedEngineSpec {
  const parsed = parseFrontmatter(text);
  const frontmatter = parsed.data as Record<string, unknown>;
  const body = parsed.content.trim();

  const title = typeof frontmatter.title === "string" ? frontmatter.title : null;
  const subtitle = typeof frontmatter.subtitle === "string" ? frontmatter.subtitle : null;

  // Split on H2 headings. The leading chunk (file H1 + any preamble) is
  // discarded; each subsequent chunk is "Heading\nbody...".
  const parts = body.split(/^##[ \t]+/m);

  const facets: EngineFacet[] = [];
  let taxonomy: string | null = null;
  // parts[0] is everything before the first "## " (the H1). Skip it; sections
  // start at index 1.
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const nl = chunk.indexOf("\n");
    const name = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const sectionBody = (nl === -1 ? "" : chunk.slice(nl + 1)).trim();
    if (!name || META_SECTIONS.has(name)) {
      // Capture the Taxonomy meta value for surfacing; both meta sections stay
      // out of the facet grid.
      if (name === "Taxonomy" && sectionBody) taxonomy = sectionBody;
      continue;
    }
    facets.push({ letter: name.charAt(0), name, body: sectionBody });
  }

  // Defensive fallback: no facet sections found. Render the whole body (the H1
  // line stripped) as one untitled prose block so the spread still reads, never
  // raw YAML. The empty name yields an empty heading; the body carries the text.
  if (facets.length === 0) {
    const prose = body.replace(/^#[ \t]+.*$/m, "").trim();
    if (prose) {
      facets.push({ letter: "", name: "", body: prose });
    }
  }

  return { facets, title, subtitle, taxonomy };
}
