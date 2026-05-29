import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const KHAI_ARCH_DIR = join(process.cwd(), "node_modules", "@chbrain", "khai-arch", "architecture");

export interface RawSpecForTest {
  id: string;
  text: string;
}

export function loadAllSpecsForTests(): RawSpecForTest[] {
  return readdirSync(KHAI_ARCH_DIR)
    .filter((name) => name.endsWith(".md") && name !== "architecture.md")
    .map((name) => ({
      id: name.replace(/\.md$/, ""),
      text: readFileSync(join(KHAI_ARCH_DIR, name), "utf-8"),
    }));
}
