import { describe, it, expect } from "vitest";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

const pages = loadBuiltPages(process.cwd());

describe("em-dash regression — no U+2014 in built HTML", () => {
  it("contains no em-dashes across all pages", () => {
    const allFailures: string[] = [];

    for (const page of pages) {
      const index = page.html.indexOf("—");
      if (index !== -1) {
        const start = Math.max(0, index - 40);
        const end = Math.min(page.html.length, index + 40);
        const context = page.html.slice(start, end);
        allFailures.push(`${page.path}: em-dash found at offset ${index}: …${context}…`);
      }
    }

    if (allFailures.length > 0) {
      throw new Error(allFailures.join("\n"));
    }
    expect(allFailures.length).toBe(0);
  });
});
