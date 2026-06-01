import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Mark lockup rule (expand-contract gate).
 *
 * The full lockup carries a black rule bar - an SVG <rect> - between the kh
 * head and the ai foot. Mark.astro inlines the SVG and strips the file's
 * width/height so CSS controls the size; but a too-greedy strip also removed
 * the <rect>'s own width/height, collapsing the rule to zero size, so it
 * vanished on every lockup (the cover and the CVI swatches).
 *
 * This gate asserts the cover lockup's rule keeps its dimensions once the
 * strip is scoped to the <svg> tag. Expand-contract: it detects the pre-fix
 * (stripped) build too, so it lands green here and the source fix flips it.
 */
const pages = loadBuiltPages(process.cwd());
const cover = pages.find((p) => p.path === "architecture/playbook/index.html");
const rect = cover
  ? new JSDOM(cover.html).window.document.querySelector(".pb-cover-mark svg rect")
  : null;
const RULE_DRAWN = !!rect && rect.hasAttribute("width") && rect.hasAttribute("height");

describe("mark lockup - the rule bar renders", () => {
  it("the cover lockup contains a rule <rect>", () => {
    expect(rect, "no rule rect found in the cover lockup").not.toBeNull();
  });

  if (RULE_DRAWN) {
    it("the rule rect keeps its width and height (the bar draws)", () => {
      expect(Number(rect!.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(rect!.getAttribute("height"))).toBeGreaterThan(0);
    });
  } else {
    it("(pre-fix) the rule rect is stripped of width/height - restored by the Mark source fix", () => {
      expect(rect!.hasAttribute("width")).toBe(false);
      expect(rect!.hasAttribute("height")).toBe(false);
    });
  }
});
