import { describe, it, expect } from "vitest";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

const pages = loadBuiltPages(process.cwd());

describe("em-dash regression — no U+2014 in built HTML", () => {
  for (const page of pages) {
    it(`${page.path} contains no em-dash`, () => {
      const index = page.html.indexOf("—");
      if (index !== -1) {
        const start = Math.max(0, index - 40);
        const end = Math.min(page.html.length, index + 40);
        const context = page.html.slice(start, end);
        throw new Error(`em-dash found at offset ${index}: …${context}…`);
      }
      expect(index).toBe(-1);
    });
  }
});
