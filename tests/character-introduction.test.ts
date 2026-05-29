import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";
import { loadAllSpecsForTests } from "./helpers/load-specs-for-tests";
import matter from "gray-matter";

const pages = loadBuiltPages(process.cwd());
const specs = loadAllSpecsForTests();

/**
 * Returns the set of "content words" in a string: lowercase alphabetic tokens
 * of length >= 3. Used to detect words introduced by the renderer that don't
 * exist in the source.
 */
function contentWords(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return new Set(tokens);
}

/**
 * Words the renderer is ALLOWED to introduce (chrome, nav, structural text).
 * Keep this list short and explicit - adding entries weakens the gate.
 */
const ALLOWED_RENDERER_WORDS = new Set([
  "kaihacks",
  "architecture",
  "system",
  "element",
  "meta",
  "mnemonic",
  // class pill labels
  "english",
  // BaseLayout placeholder fallback:
  "experimental",
  "writing",
  // structural html that may leak via textContent in some shells
  "html",
  "head",
  "body",
  "title",
  "description",
  "viewport",
  "charset",
  "icon",
  "svg",
  "img",
  // shared Topbar component (src/components/Topbar.astro):
  // "architecture.kaihacks.ai · architecture.md · instructions.md · khai · vX.Y.Z"
  "instructions",
  "khai",
  // shared Footer component (src/components/Footer.astro):
  // "architecture.kaihacks.ai · the specification / KAI · HACKS · AI /
  //  one application · cultures.kaihacks.ai, focused on cultures"
  "specification",
  "kai",
  "hacks",
  "one",
  "application",
  "cultures",
  "focused",
  // shared SpecPage prev/next slider nav (src/layouts/SpecPage.astro):
  // each typed spec links to its neighbors in canonical order. The visible
  // label is the neighbor's name in Newsreader display, so e.g. Position's
  // page renders the words "Process" (prev) and "Piece" (next).
  "plot",
  "process",
  "position",
  "piece",
  "place",
  "persona",
]);

describe("character-introduction - built page words exist in source", () => {
  for (const spec of specs) {
    const page = pages.find((p) => p.path === `architecture/${spec.id}/index.html`);

    it(`${spec.id}: every word in main content also appears in source`, () => {
      const dom = new JSDOM(page!.html);
      const main = dom.window.document.querySelector("main");
      const visibleText = main?.textContent ?? "";

      const renderedWords = contentWords(visibleText);

      const sourceText = spec.text + " " + (matter(spec.text).data.subtitle ?? "");
      const sourceWords = contentWords(sourceText);

      const introduced = [...renderedWords].filter(
        (w) => !sourceWords.has(w) && !ALLOWED_RENDERER_WORDS.has(w),
      );

      if (introduced.length > 0) {
        throw new Error(
          `${spec.id}: renderer introduced ${introduced.length} word(s) not in source: ${introduced.join(", ")}\n` +
            `If a word is legitimate chrome, add it to ALLOWED_RENDERER_WORDS in character-introduction.test.ts.`,
        );
      }
      expect(introduced.length).toBe(0);
    });
  }
});
