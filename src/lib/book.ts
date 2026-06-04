// Shared types for the Book chassis (Book.astro). Kept in a plain .ts module so
// both the component and its callers (the Playbook and Enginebook pages) import
// the same shapes without importing named exports from an .astro file.

/** One facet card: an accent initial, the rest of the name, and a body. */
export interface BookFacet {
  /** the accent first letter, e.g. "P" or "H" */
  letter: string;
  /** the full facet name, e.g. "Place" or "Has" */
  name: string;
  /** the body prose (plain text) */
  body: string;
  /** optional pre-rendered markdown -> HTML body, drawn in place of `body`.
   *  Lets a facet carry resolved member-file links (e.g. the engine cards'
   *  [gender](position_gender.md) -> #anchor) instead of literal markdown. */
  bodyHtml?: string | null;
}

/**
 * Rewrite member-FILE link targets to in-page anchors — a shared book
 * capability. The engine warrant and cards link a source to the member file
 * it constrains (e.g. `[gender](position_gender.md)`), but those files are not
 * pages: they are snaps further down the same book. Given a map of
 * file -> slug, rewrite `](file)` to `](#slug)` so every book resolves its
 * cross-references the same way (and the build's internal-link check passes).
 * Operates on markdown text, before it is rendered to HTML.
 */
export function rewriteMemberLinks(markdown: string, fileToSlug: Map<string, string>): string {
  let out = markdown;
  for (const [file, slug] of fileToSlug) out = out.split(`](${file})`).join(`](#${slug})`);
  return out;
}

/** One spread (snap-stop) in the book. */
export interface BookSpread {
  /** anchor id + TOC target */
  slug: string;
  /** zero-padded ordinal, e.g. "00", rendered "NN · GROUP" on the left */
  n: string;
  /** the group label shown beside the ordinal (role / section) */
  groupLabel: string;
  /** the status badge on the right (e.g. "published", a mnemonic, "engine") */
  status: string;
  /** optional pre-rendered HTML for the status corner, drawn in place of
   *  `status` -- lets the corner carry a link (e.g. an engine spread's parent
   *  Taxonomy, linked to the anchor snap) instead of plain text. */
  statusHtml?: string | null;
  /** the spread title (brick-dot is appended by the chassis) */
  title: string;
  /** optional italic subtitle under the title */
  subtitle?: string | null;
  /** the facet cards (2x2 grid; 4 or 5 lay out correctly) */
  facets: BookFacet[];
  /** optional pre-rendered markdown -> HTML prose body, drawn where facets
   *  would go. Reference (LORE) snaps carry prose/tables, not facet cards. */
  bodyHtml?: string | null;
  /** optional download artifact — turns the spread into the back-cover: a
   *  download card (filename, size, content-hash, brick CTA) where the facet
   *  grid would go. Both the Enginebook (engine zip) and Skillbook (skill zip)
   *  end on one. */
  download?: BookDownload | null;
  /** optional closing paragraph, drawn after a rule */
  coda?: string | null;
  /** authored? false renders the draft stub instead of facets */
  written?: boolean;
  /** installed-extension card -- adds the engine modifier class */
  engine?: boolean;
  /** optional click-through at the foot of the spread (the Playbook's
   *  enriched-by engine card links into its full Enginebook) */
  deepLink?: { href: string; label: string } | null;
}

/**
 * The download back-cover. The last snap of a book that ships an artifact:
 * the engine zip on an Enginebook, the skill zip on a Skillbook page. The
 * zip is built at build time (via @chbrain/khai-pack) and served from the
 * site; this carries the link plus the provenance a reader needs to trust it
 * (the byte size and the content-hash the packer stamped). Rendered in place
 * of the facet grid on a spread that sets `download`.
 */
export interface BookDownload {
  /** href to the built zip artifact (site-served, not an npm tarball) */
  href: string;
  /** the file name shown + used as the download attribute, e.g. "gender.zip" */
  filename: string;
  /** human-readable byte size, e.g. "12.4 kB" */
  size: string;
  /** the sha256 the packer stamped on the zip — provenance, shown in mono */
  sha256: string;
  /** optional one-line note on what the bundle carries */
  note?: string | null;
}

/** A TOC group: a labelled run of spreads, used to build the overlay. */
export interface BookTocGroup {
  key: string;
  label: string;
  items: { slug: string; idx: number; n: string; name: string; written: boolean }[];
}

/** The Book chassis cover (first snap-stop). */
export interface BookCover {
  overline: string;
  title: string;
  /** rendered as raw HTML (the Playbook hero carries a <br>); null to omit */
  subtitle?: string | null;
  edition: string;
  ctaHref: string;
  ctaLabel: string;
  /** "or press ->" style hint, sits beside the CTA */
  hint?: string | null;
  /** secondary "<- back" link in the cover actions */
  backHref?: string | null;
  backLabel?: string | null;
}

/** SiteHeader chrome for the Book chassis. */
export interface BookHeader {
  domain: string;
  tld: string;
  basePath: string;
  location: string;
}
