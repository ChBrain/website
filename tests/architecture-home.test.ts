import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

const pages = loadBuiltPages(process.cwd());
const home = pages.find((p) => p.path === "architecture/index.html");

describe("architecture home - design contract", () => {
  it("page exists at architecture/index.html", () => {
    expect(home).toBeDefined();
  });

  describe("topbar", () => {
    it("renders the domain caption with .kaihacks.ai accent", () => {
      const dom = new JSDOM(home!.html);
      const tld = dom.window.document.querySelector(".topbar-domain-tld");
      expect(tld).not.toBeNull();
      expect(tld!.textContent).toBe(".kaihacks.ai");
    });

    it("shows the khai version", () => {
      const dom = new JSDOM(home!.html);
      const version = dom.window.document.querySelector(".topbar-version");
      expect(version).not.toBeNull();
      expect(version!.textContent).toMatch(/khai\s*·\s*v\d+\.\d+\.\d+/);
    });
  });

  describe("masthead", () => {
    it("has the §0 section label", () => {
      const dom = new JSDOM(home!.html);
      const label = dom.window.document.querySelector(".section-label");
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain("§0");
      expect(label!.textContent?.toLowerCase()).toContain("specification");
    });

    it("has an h1 with aria-label KAI HACKS AI and HACKS accented", () => {
      const dom = new JSDOM(home!.html);
      const h1 = dom.window.document.querySelector("h1.masthead-title");
      expect(h1).not.toBeNull();
      expect(h1!.getAttribute("aria-label")).toBe("KAI HACKS AI");
      const accent = h1!.querySelector(".masthead-title-accent");
      expect(accent).not.toBeNull();
      expect(accent!.textContent).toBe("HACKS");
    });

    it("subline begins with 'Three tokens. One specification.'", () => {
      const dom = new JSDOM(home!.html);
      const subline = dom.window.document.querySelector(".masthead-subline");
      expect(subline).not.toBeNull();
      expect(subline!.textContent?.trim()).toMatch(/^Three tokens\. One specification\./);
    });
  });

  describe("§1 the reading - movements", () => {
    it("has exactly 3 movements", () => {
      const dom = new JSDOM(home!.html);
      const movements = dom.window.document.querySelectorAll(".movement");
      expect(movements.length).toBe(3);
    });

    const expectedMovements = [
      { token: "KAI", words: ["Kais", "Architecture", "Instructions"] },
      { token: "HACKS", words: ["Human", "Agent", "Collaboration", "Knowledge", "System"] },
      { token: "AI", words: ["Agent", "Implemented"] },
    ];

    for (const [i, m] of expectedMovements.entries()) {
      it(`movement ${i + 1} is ${m.token} with words [${m.words.join(", ")}]`, () => {
        const dom = new JSDOM(home!.html);
        const movements = dom.window.document.querySelectorAll(".movement");
        const movement = movements[i];
        const token = movement.querySelector(".movement-token");
        expect(token!.textContent?.trim()).toBe(m.token);
        const words = Array.from(movement.querySelectorAll(".movement-word")).map((w) =>
          w.textContent?.replace(/\s+/g, ""),
        );
        expect(words).toEqual(m.words);
      });
    }

    it("HACKS token is the only one with the accent modifier", () => {
      const dom = new JSDOM(home!.html);
      const tokens = Array.from(dom.window.document.querySelectorAll(".movement-token"));
      const accented = tokens.filter((t) => t.classList.contains("movement-token--accent"));
      expect(accented.length).toBe(1);
      expect(accented[0].textContent?.trim()).toBe("HACKS");
    });

    it("has both reading directions (forward and backward)", () => {
      const dom = new JSDOM(home!.html);
      const arrows = Array.from(dom.window.document.querySelectorAll(".direction-arrow")).map((a) =>
        a.textContent?.trim(),
      );
      expect(arrows).toContain("KAI → HACKS → AI");
      expect(arrows).toContain("AI ← HACKS ← KAI");
    });
  });

  describe("section structure", () => {
    it("§1 (the reading) is present on the home", () => {
      const dom = new JSDOM(home!.html);
      const nos = Array.from(dom.window.document.querySelectorAll(".section-no")).map((n) =>
        n.textContent?.trim(),
      );
      expect(nos).toContain("§1");
    });
  });

  // Note: the 3-jump diagram (the in-line carousel of Plot · 5 elements ·
  // 2 substrate files) is moving off the architecture home into a
  // dedicated /architecture/playbook/ page. The home's §2 becomes a CTA
  // card to that playbook; the JumpDiagram component itself is preserved
  // and relocates. This block intentionally does not assert anything
  // jump3-related so the test passes both before and after the move.
  // The /playbook/ contract will be locked in a separate test file.
});
