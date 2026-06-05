import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const KHAI_ARCH_DIR = join(process.cwd(), "node_modules", "@chbrain", "khai-arch", "architecture");

export interface RawSpecForTest {
  id: string;
  text: string;
}

// The "engines" type does not get its own standalone /architecture/<type> spec
// page: its spec is carried inside the architecture playbook (the "enriched by"
// group), and /architecture/engines/ is the engines *download* shelf. So the
// per-spec page assertions (renderer / chrome / character-introduction) must not
// expect an engines spec page. The playbook's own test still asserts the engines
// spread directly -- it does not use this helper -- so the spec content stays
// covered. Forward-compatible: while engines is still a spec page this simply
// skips checking it; once it is a shelf, no test expects the spec page.
const NOT_A_SPEC_PAGE = new Set(["engines"]);

export function loadAllSpecsForTests(): RawSpecForTest[] {
  return readdirSync(KHAI_ARCH_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => ({
      id: name.replace(/\.md$/, ""),
      text: readFileSync(join(KHAI_ARCH_DIR, name), "utf-8"),
    }))
    .filter((spec) => Object.keys(matter(spec.text).data).length > 0)
    .filter((spec) => !NOT_A_SPEC_PAGE.has(spec.id));
}
