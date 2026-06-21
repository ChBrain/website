import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";
import { loadAllSpecsForTests } from "./helpers/load-specs-for-tests";
import { frontmatter as parseFrontmatter } from "../src/lib/frontmatter";

const pages = loadBuiltPages(process.cwd());
const specs = loadAllSpecsForTests();

describe("chrome - mnemonic strip + class pill on every spec page", () => {
  for (const spec of specs) {
    const frontmatter = parseFrontmatter(spec.text).data;
    const page = pages.find((p) => p.path === `architecture/${spec.id}/index.html`);

    describe(spec.id, () => {
      it("renders the class pill with the spec's class", () => {
        const dom = new JSDOM(page!.html);
        const pill = dom.window.document.querySelector(".class-pill");
        expect(pill).not.toBeNull();
        expect(pill!.classList.toString()).toContain(`class-pill--${frontmatter.class}`);
        expect(pill!.textContent?.trim().toLowerCase()).toBe(frontmatter.class);
      });

      it("renders the mnemonic strip with the spec's mnemonic", () => {
        const dom = new JSDOM(page!.html);
        const strip = dom.window.document.querySelector(".mnemonic-strip");
        expect(strip).not.toBeNull();
        expect(strip!.textContent).toContain(frontmatter.mnemonic.replace("TO ", ""));
      });
    });
  }
});
