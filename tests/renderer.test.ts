import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";
import { loadAllSpecsForTests } from "./helpers/load-specs-for-tests";
import matter from "gray-matter";

const pages = loadBuiltPages(process.cwd());
const specs = loadAllSpecsForTests();

function specPagePath(id: string): string {
  return `architecture/${id}/index.html`;
}

describe("renderer - per-spec assertions", () => {
  for (const spec of specs) {
    const frontmatter = matter(spec.text).data;
    const expectedPath = specPagePath(spec.id);
    const page = pages.find((p) => p.path === expectedPath);

    describe(spec.id, () => {
      it(`page exists at ${expectedPath}`, () => {
        expect(page, `${expectedPath} not found in dist/`).toBeDefined();
      });

      it("has an h1 with the type name (capitalised)", () => {
        const dom = new JSDOM(page!.html);
        const h1 = dom.window.document.querySelector("h1");
        expect(h1).not.toBeNull();
        const expected = spec.id.charAt(0).toUpperCase() + spec.id.slice(1);
        expect(h1!.textContent).toContain(expected);
      });

      it("has the subtitle", () => {
        expect(page!.html).toContain(frontmatter.subtitle);
      });

      it(`has exactly ${frontmatter.chapters.length} chapter cards`, () => {
        const dom = new JSDOM(page!.html);
        const cards = dom.window.document.querySelectorAll(".chapter-card");
        expect(cards.length).toBe(frontmatter.chapters.length);
      });

      it("chapter names match frontmatter in order", () => {
        const dom = new JSDOM(page!.html);
        const headings = Array.from(
          dom.window.document.querySelectorAll(".chapter-card .chapter-name"),
        ).map((h) => h.textContent?.trim());
        expect(headings).toEqual(frontmatter.chapters);
      });
    });
  }
});
