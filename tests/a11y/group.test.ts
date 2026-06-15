import { describe, it, expect } from "vitest";
import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";
import { loadBuiltPages } from "../helpers/load-built-html.ts";
import { assignGroups, groupLabel } from "../helpers/a11y-groups.mjs";

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

// One group per process keeps the per-page jsdom heap bounded as houses grow:
// the runner (scripts/khai-tests.mjs) invokes this file once per group with
// A11Y_GROUP set, so each vitest process only holds one group's pages. With no
// A11Y_GROUP (a direct `vitest run` of this file) the whole site is checked.
const GROUP = process.env.A11Y_GROUP ?? null;
const allPages = loadBuiltPages(process.cwd());
const { map } = assignGroups(allPages.map((p) => p.path));
const pages = GROUP ? allPages.filter((p) => map.get(p.path) === GROUP) : allPages;
const label = GROUP ? groupLabel(GROUP) : "khai-tests a11y (all)";

describe(`${label}: axe-core, no serious or critical violations`, () => {
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

      try {
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
      } finally {
        // Close the jsdom window and reclaim its heap on every page. Even one
        // group accumulates if pages are not freed; --expose-gc (set by the
        // runner) makes globalThis.gc available, and the optional call is a
        // no-op where it is not exposed.
        dom.window.close();
        globalThis.gc?.();
      }
    }, 20000);
  }
});
