import { describe, it, expect } from "vitest";
import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";
import { loadBuiltPages } from "./helpers/load-built-html.ts";

interface AxeViolationNode {
  html: string;
}
interface AxeViolation {
  id: string;
  description: string;
  impact: string | null;
  nodes: AxeViolationNode[];
}
interface AxeResults {
  violations: AxeViolation[];
}

const pages = loadBuiltPages(process.cwd());

describe("a11y - axe-core, no serious or critical violations", () => {
  for (const page of pages) {
    it(`${page.path} is axe-clean (serious + critical)`, async () => {
      const virtualConsole = new VirtualConsole();
      virtualConsole.on("error", () => {
        // suppress jsdom CSS parser warnings
      });

      const dom = new JSDOM(page.html, {
        url: "https://architecture.kaihacks.ai/",
        runScripts: "dangerously",
        virtualConsole,
      });

      const script = dom.window.document.createElement("script");
      script.textContent = axe.source;
      dom.window.document.head.appendChild(script);

      const windowAxe = (dom.window as unknown as { axe: typeof axe }).axe;
      const results = (await windowAxe.run(dom.window.document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        resultTypes: ["violations"],
      })) as unknown as AxeResults;

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
