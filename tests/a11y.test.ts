import { describe, it, expect } from "vitest";
import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

const pages = loadBuiltPages(process.cwd());

describe("a11y — axe-core, no serious or critical violations", () => {
  for (const page of pages) {
    it(`${page.path} is axe-clean (serious + critical)`, async () => {
      const virtualConsole = new VirtualConsole();
      virtualConsole.on("error", () => {
        /* suppress jsdom CSS warnings */
      });

      const dom = new JSDOM(page.html, {
        url: "https://architecture.kaihacks.ai/",
        runScripts: "outside-only",
        virtualConsole,
      });

      const axeSource = (axe as unknown as { source: string }).source ?? "";
      if (axeSource) {
        const scriptEl = dom.window.document.createElement("script");
        scriptEl.textContent = axeSource;
        dom.window.document.head.appendChild(scriptEl);
      }

      const results = await (axe as typeof axe).run(dom.window.document as unknown as Element, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        resultTypes: ["violations"],
      });

      const blockers = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      if (blockers.length > 0) {
        const summary = blockers
          .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
          .join("\n");
        throw new Error(`axe violations on ${page.path}:\n${summary}`);
      }
      expect(blockers.length).toBe(0);

      dom.window.close();
    });
  }
});
