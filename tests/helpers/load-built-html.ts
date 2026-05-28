import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface BuiltPage {
  /** path relative to dist/, e.g. "index.html" or "architecture/plot/index.html" */
  path: string;
  /** absolute path on disk */
  absolutePath: string;
  /** raw HTML as utf-8 string */
  html: string;
}

function walk(dir: string, base: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) {
      walk(abs, base, out);
    } else if (entry.endsWith(".html")) {
      out.push(relative(base, abs).replace(/\\/g, "/"));
    }
  }
  return out;
}

export function loadBuiltPages(repoRoot: string): BuiltPage[] {
  const distDir = join(repoRoot, "dist");
  let paths: string[];
  try {
    paths = walk(distDir, distDir);
  } catch {
    throw new Error(
      "dist/ not found. Run `npm run build` before vitest, or use `npm test` which does both.",
    );
  }
  return paths.map((p) => {
    const absolutePath = join(distDir, p);
    return {
      path: p,
      absolutePath,
      html: readFileSync(absolutePath, "utf-8"),
    };
  });
}
