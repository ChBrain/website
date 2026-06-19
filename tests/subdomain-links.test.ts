import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

// Each surface is deployed AT ITS OWN ROOT: the production deploy rsyncs
// `dist/<surface>/` INTO the surface's docroot (e.g. plays.kaihacks.ai/, the
// apex for main), stripping the `/<surface>/` prefix that dev and staging keep.
// So an absolute (root-relative) link in a built page must resolve WITHIN that
// surface's own tree -- `dist/<surface>/` -- not against `dist/` as a whole.
//
// This is the gap the ordinary `links` gate misses: it resolves an absolute
// `/plays/grimm/` against `dist/` (where it exists) and passes, but in
// production that link is `plays.kaihacks.ai/plays/grimm/` and 404s (the content
// is served at `/grimm/`). A cross-surface path like `/architecture/persona/`
// is the same trap -- it must be a full URL via `URLS.*`, never an absolute
// `/<other-surface>/` path. Same-surface links should be relative.

const repoRoot = process.cwd();
const distDir = join(repoRoot, "dist");

// Only the deployed surfaces (each rsynced to its own docroot). The bare apex
// placeholder (dist/index.html) and dist/_assets/ are not surface roots.
const SURFACES = new Set(["main", "architecture", "cultures", "plays", "writing"]);
const pages = loadBuiltPages(repoRoot).filter((p) => SURFACES.has(p.path.split("/")[0]));

// Anchor hrefs, read straight from the HTML (regex, not JSDOM: this runs over
// every built page, and a DOM per page is too slow for one test). `[^>]*?`
// spans attributes and newlines within the tag (compressHTML is off).
const A_HREF = /<a\s[^>]*?\bhref="([^"]*)"/gi;

const isExternal = (h: string) => /^[a-z][a-z0-9+.-]*:/i.test(h) || h.startsWith("//");

function resolvesUnderSurface(surfaceRoot: string, pathPart: string): boolean {
  const target = resolve(surfaceRoot, "." + pathPart);
  if (existsSync(target) && statSync(target).isFile()) return true;
  const asIndex = join(target, "index.html");
  return existsSync(asIndex) && statSync(asIndex).isFile();
}

describe("subdomain links — absolute links resolve at each surface's served root", () => {
  it("no built page links to an absolute path outside its own surface root", () => {
    const failures: string[] = [];
    for (const page of pages) {
      const surface = page.path.split("/")[0];
      const surfaceRoot = join(distDir, surface);
      for (const m of page.html.matchAll(A_HREF)) {
        const href = m[1];
        // Only absolute (root-relative) links are at risk; relative links are
        // covered by the ordinary `links` gate. Skip externals and fragments.
        if (!href.startsWith("/") || isExternal(href)) continue;
        const [pathPart] = href.split(/[?#]/);
        if (!resolvesUnderSurface(surfaceRoot, pathPart))
          failures.push(`${page.path}  ->  ${href}`);
      }
    }
    if (failures.length > 0) {
      const shown = [...new Set(failures)].slice(0, 40);
      const more =
        failures.length > shown.length ? `\n... and ${failures.length - shown.length} more` : "";
      throw new Error(
        "Absolute links that 404 once the surface is served at its subdomain root " +
          "(make same-surface links relative; use a full URL via URLS.* for cross-surface):\n" +
          shown.join("\n") +
          more,
      );
    }
    expect(failures).toEqual([]);
  });
});
