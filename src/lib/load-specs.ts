import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
const KHAI_ARCH_DIR = join(
  dirname(_require.resolve("@chbrain/khai-arch/package.json")),
  "architecture",
);

export interface RawSpec {
  /** the slug, e.g. "plot" */
  id: string;
  /** absolute path to the .md file */
  path: string;
  /** full file contents */
  text: string;
}

export function loadAllSpecs(): RawSpec[] {
  const entries = readdirSync(KHAI_ARCH_DIR)
    .filter((name) => name.endsWith(".md"))
    .filter((name) => name !== "stack.md");

  return entries.map((name) => {
    const id = name.replace(/\.md$/, "");
    const path = join(KHAI_ARCH_DIR, name);
    return {
      id,
      path,
      text: readFileSync(path, "utf-8"),
    };
  });
}

export function loadStack(): RawSpec | null {
  const path = join(KHAI_ARCH_DIR, "stack.md");
  try {
    if (!statSync(path).isFile()) return null;
    return {
      id: "stack",
      path,
      text: readFileSync(path, "utf-8"),
    };
  } catch {
    return null;
  }
}
