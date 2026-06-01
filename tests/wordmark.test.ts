import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Wordmark kerning guard — no whitespace between the domain text and
 * the `.topbar-domain-tld` span in any built page.
 *
 * The SiteHeader wordmark renders as `kaihacks` + a `<span class=
 * "topbar-domain-tld">.ai</span>` for the brick-coloured TLD. Astro's
 * JSX whitespace handling can silently insert a space character
 * between `{domain}` and the span when the markup is written across
 * multiple lines; combined with the `letter-spacing: 0.24em` on the
 * parent anchor, that single space character picks up letter-spacing
 * on both sides and the visible gap doubles into something that
 * reads as a typo. PR #110 fixed it via inline markup guarded by
 * {/* prettier-ignore *\/}; this guard stops it from coming back.
 *
 * Asserts: for every built page, every .topbar-domain anchor has its
 * `.topbar-domain-tld` child sitting immediately after the domain
 * text node, with no intervening whitespace.
 */

const pages = loadBuiltPages(process.cwd());

describe("wordmark kerning — no whitespace between domain and TLD span", () => {
  for (const page of pages) {
    it(`${page.path}: every .topbar-domain has no whitespace before .topbar-domain-tld`, () => {
      const dom = new JSDOM(page.html);
      const anchors = [...dom.window.document.querySelectorAll(".topbar-domain")];
      // Pages without a topbar (e.g. a future minimal landing) are fine.
      // We only gate the structure WHEN the wordmark is present.
      for (const a of anchors) {
        const tld = a.querySelector(".topbar-domain-tld");
        expect(tld, `${page.path}: .topbar-domain has no .topbar-domain-tld child`).not.toBeNull();
        const prev = tld!.previousSibling;
        // previousSibling can be a text node (the domain text) or null.
        // We want the text node to end with the last character of the
        // domain (no trailing whitespace) — i.e. /\S$/ — so kerning
        // applies once between the last domain letter and the dot of
        // the TLD, not twice across an inserted space.
        if (prev && prev.nodeType === 3 /* TEXT_NODE */) {
          const text = prev.textContent ?? "";
          expect(
            /\S$/.test(text),
            `${page.path}: trailing whitespace between domain "${text}" and TLD span`,
          ).toBe(true);
        }
      }
    });
  }
});
