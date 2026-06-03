import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type { EngineCard } from "./load-engines";
// The canon owns the WIRES card shape; we never restate it here.
// @ts-expect-error -- the canon export is plain ESM (no .d.ts).
import { engineCard, referenceCard } from "@chbrain/khai-arch";

const _require = createRequire(import.meta.url);

/** One markdown file an engine ships: its anchor, or one expression. */
export interface EngineBookFile {
  /** "anchor", or the expression name (e.g. "male"). */
  key: string;
  role: "anchor" | "expression";
  /** the source filename, e.g. "position_gender.md". */
  file: string;
  /** raw file text, frontmatter intact, so parseEngineSpec() can read it. */
  text: string;
}

/** One `### ` subchapter inside a reference chapter. */
export interface ReferenceSubchapter {
  /** the subchapter heading, e.g. "Intersectionality". */
  name: string;
  /** the subchapter's prose (markdown). */
  body: string;
}

/** One LORE chapter, projected by the canon from REFERENCES.md. */
export interface ReferenceSection {
  /** the chapter's prose (markdown; may be "" when it only has subchapters). */
  body: string;
  /** author `### ` splits; often empty. */
  subchapters: ReferenceSubchapter[];
}

/** The LORE reference warrant, projected by the canon from REFERENCES.md. */
export interface Reference {
  /** always "LORE"; the canon owns the mnemonic. */
  mnemonic: string;
  /** the chapter names in order, e.g. ["Line of Work", "Origin", ...]. */
  chapters: string[];
  /** the chapters, keyed by name. */
  sections: Record<string, ReferenceSection>;
  /** a trailing one-line note (markdown); null when absent. */
  coda: string | null;
}

/** The full content model behind one Enginebook, derived from the manifest. */
export interface EngineBook {
  id: string;
  /** the canon one-liner (manifest.khai.tagline); null on older engines. */
  tagline: string | null;
  /** the root type the engine wires at (e.g. "position"). */
  type: string | null;
  /** the WIRES card, projected by the canon from the manifest. */
  card: EngineCard;
  anchor: EngineBookFile;
  expressions: EngineBookFile[];
  /** the LORE reference warrant; null when the engine ships no conforming
   *  REFERENCES.md (the canon's khai-tests gate conformance, not us). */
  references: Reference | null;
}

/**
 * Resolve an installed engine's package directory from its package.json. The
 * gender manifest exposes "./package.json" in exports, so this resolves; the
 * markdown files are then read by path (they need not be in exports), the same
 * way load-specs.ts reads the canon's architecture/*.md.
 */
function engineDir(id: string): string {
  return dirname(_require.resolve(`@chbrain/khai-engine-${id}/package.json`));
}

/**
 * Load one engine's Enginebook content. The manifest (package.json `khai`) is
 * the single source of truth for the anchor, the expressions, and their order;
 * this loader never re-declares that shape.
 */
export function loadEngineBook(id: string): EngineBook {
  const dir = engineDir(id);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).khai;
  if (!manifest) {
    throw new Error(`@chbrain/khai-engine-${id}: no \`khai\` manifest in package.json`);
  }
  const read = (file: string) => readFileSync(join(dir, file), "utf8");

  const anchor: EngineBookFile = {
    key: "anchor",
    role: "anchor",
    file: manifest.anchor,
    text: read(manifest.anchor),
  };

  const expressions: EngineBookFile[] = Object.entries(
    (manifest.expressions ?? {}) as Record<string, string>,
  ).map(([name, file]) => ({
    key: name,
    role: "expression" as const,
    file,
    text: read(file),
  }));

  // The LORE reference warrant. We render whatever the canon projects and
  // degrade to null on any failure -- a missing REFERENCES.md or a
  // non-conforming one (the canon throws). Conformance is the canon's
  // contract to enforce; the website just renders what's there.
  let references: Reference | null = null;
  try {
    references = referenceCard(read("REFERENCES.md")) as Reference;
  } catch {
    references = null;
  }

  return {
    id,
    tagline: manifest.tagline ?? null,
    type: manifest.type ?? null,
    card: engineCard(manifest) as EngineCard,
    anchor,
    expressions,
    references,
  };
}
