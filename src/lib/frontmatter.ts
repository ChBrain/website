// A minimal frontmatter parser: the only shape we use is a leading `---` YAML
// block followed by the body, so this replaces gray-matter's `matter()` without
// its features (excerpts, custom delimiters, stringify). It exists to drop
// gray-matter, whose pinned js-yaml ^3 drags in the vulnerable js-yaml 3.x
// (GHSA-h67p-54hq-rp68). We parse with js-yaml 4 instead, already in the tree
// (astro depends on the patched 4.2.0) and loaded through createRequire like
// load-plays.ts, so no js-yaml type dependency is needed.
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
const { load } = _require("js-yaml") as { load: (input: string) => unknown };

export interface Parsed<T = Record<string, any>> {
  /** the parsed YAML frontmatter, or {} when there is none */
  data: T;
  /** the body after the frontmatter block */
  content: string;
}

// A leading fence only: `---` on its own line, the YAML, then a closing `---`.
const FENCE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** Split `---`-fenced YAML frontmatter from the body. No fence -> {} + the input. */
export function frontmatter<T = Record<string, any>>(input: string): Parsed<T> {
  // Strip a leading BOM so a fence on the first line still matches.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const match = FENCE.exec(text);
  if (!match) return { data: {} as T, content: text };
  const yaml = match[1].trim();
  const data = (yaml === "" ? {} : (load(yaml) ?? {})) as T;
  return { data, content: text.slice(match[0].length) };
}
