import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type { EngineCard } from "./load-engines";
// The canon owns the WIRES card shape; we never restate it here.
// @ts-expect-error -- the canon export is plain ESM (no .d.ts).
import { engineCard } from "@chbrain/khai-arch";

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

  return {
    id,
    tagline: manifest.tagline ?? null,
    type: manifest.type ?? null,
    card: engineCard(manifest) as EngineCard,
    anchor,
    expressions,
  };
}
