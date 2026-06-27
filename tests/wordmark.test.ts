import { describe, it, expect } from "vitest";
import { loadBuiltPages } from "./helpers/load-built-html";

const pages = loadBuiltPages(process.cwd());

describe("wordmark kerning — no whitespace between domain and TLD span", () => {
  it("verifies kerning across all pages", () => {
    const allFailures: string[] = [];

    for (const page of pages) {
      // Find all anchors with class containing topbar-domain
      const regex =
        /<a[^>]*class="[^"]*topbar-domain[^"]*"[^>]*>([\s\S]*?)<span[^>]*class="[^"]*topbar-domain-tld[^"]*"/gi;
      let match;
      while ((match = regex.exec(page.html)) !== null) {
        const text = match[1];
        if (/\s$/.test(text)) {
          allFailures.push(
            `In ${page.path}: trailing whitespace between domain "${text}" and TLD span`,
          );
        }
      }
    }

    if (allFailures.length > 0) {
      throw new Error(allFailures.join("\n"));
    }
    expect(allFailures.length).toBe(0);
  });
});
