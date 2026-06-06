import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Surface stamp contract.
 *
 * Every built page must self-identify its surface via <meta name="x-surface">
 * (BaseLayout.astro). The live smoke checks (smoke/) and the Cloudflare monitor
 * assert host -> surface using exactly this stamp, so a missing or wrong stamp
 * would blind them. This offline test locks the stamp in at build time. #149.
 *
 * Surface is the first dist-relative path segment; the bare apex placeholder
 * (dist/index.html) has none -> "root".
 */
const pages = loadBuiltPages(process.cwd());

function expectedSurface(path: string): string {
  return path.includes("/") ? path.split("/")[0] : "root";
}

describe("surface stamp", () => {
  it("builds at least the known surface pages", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it("stamps every built page with x-surface = its surface", () => {
    for (const page of pages) {
      const match =
        page.html.match(/<meta\s+[^>]*name="x-surface"\s+[^>]*content="([^"]*)"/i) ||
        page.html.match(/<meta\s+[^>]*content="([^"]*)"\s+[^>]*name="x-surface"/i);
      expect(match, `${page.path} has no <meta name=x-surface>`).not.toBeNull();
      expect(match![1], `${page.path} surface`).toBe(expectedSurface(page.path));
    }
  });
});
