import { describe, it, expect } from "vitest";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

/**
 * En-dash regression guard — no U+2013 in built HTML.
 *
 * Mirrors tests/em-dash.test.ts. The CVI Writing rule forbids both
 * em-dashes (U+2014) and en-dashes (U+2013); only em-dashes had a
 * gate. The en-dash sweep PR (#97) removed every U+2013 from src/
 * by hand — this test stops the next one from drifting back in.
 *
 * The CVI page deliberately documents en-dash usage in §06 Writing
 * (the "Never" list explicitly forbids it). That copy uses the spelled-
 * out word "en dash" rather than the character itself, so the built
 * HTML contains zero U+2013 across all surfaces.
 */

const pages = loadBuiltPages(process.cwd());

describe("en-dash regression — no U+2013 in built HTML", () => {
  for (const page of pages) {
    it(`${page.path} contains no en-dash`, () => {
      const index = page.html.indexOf("–");
      if (index !== -1) {
        const start = Math.max(0, index - 40);
        const end = Math.min(page.html.length, index + 40);
        const context = page.html.slice(start, end);
        throw new Error(`en-dash found at offset ${index}: …${context}…`);
      }
      expect(index).toBe(-1);
    });
  }
});
