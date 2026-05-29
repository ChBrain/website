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

    it("has filemarks for architecture.md and instructions.md", () => {
      const dom = new JSDOM(home!.html);
      const filemarks = Array.from(dom.window.document.querySelectorAll(".filemark"));
      const labels = filemarks.map((f) => f.textContent?.trim().replace(/\s+/g, " "));
      expect(labels.some((l) => l?.includes("architecture.md"))).toBe(true);
      expect(labels.some((l) => l?.includes("instructions.md"))).toBe(true);
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

  describe("§2 the types - descent", () => {
    const expectedTypes = [
      { order: "00", name: "Plot", badge: "system" },
      { order: "01", name: "Process", badge: "draft" },
      { order: "02", name: "Position", badge: "draft" },
      { order: "03", name: "Piece", badge: "draft" },
      { order: "04", name: "Place", badge: "draft" },
      { order: "05", name: "Persona", badge: "draft" },
    ];

    it("has 6 type rows in the descent", () => {
      const dom = new JSDOM(home!.html);
      const rows = dom.window.document.querySelectorAll(".type-row");
      expect(rows.length).toBe(6);
    });

    for (const [i, t] of expectedTypes.entries()) {
      it(`type row ${i} is ${t.order} ${t.name} (${t.badge})`, () => {
        const dom = new JSDOM(home!.html);
        const rows = dom.window.document.querySelectorAll(".type-row");
        const row = rows[i];
        expect(row.querySelector(".type-row-order")!.textContent?.trim()).toBe(t.order);
        expect(row.querySelector(".type-row-name")!.textContent?.trim()).toBe(t.name);
        expect(row.querySelector(".type-row-badge")!.textContent?.trim()).toBe(t.badge);
      });
    }

    it("Plot is the only type-row--system row", () => {
      const dom = new JSDOM(home!.html);
      const systemRows = dom.window.document.querySelectorAll(".type-row--system");
      expect(systemRows.length).toBe(1);
      expect(systemRows[0].querySelector(".type-row-name")!.textContent?.trim()).toBe("Plot");
    });

    it("has the 'Read the types' CTA", () => {
      const dom = new JSDOM(home!.html);
      const cta = dom.window.document.querySelector(".types-readmore-link");
      expect(cta).not.toBeNull();
      expect(cta!.textContent).toContain("Read the types");
    });
  });

  describe("§3 the model - tree + infrastructure", () => {
    it("has the Play container row", () => {
      const dom = new JSDOM(home!.html);
      const container = dom.window.document.querySelector(".tree-row--container .tree-name");
      expect(container).not.toBeNull();
      expect(container!.textContent?.trim()).toBe("Play");
    });

    it("has the Plot system row with 0..n cardinality", () => {
      const dom = new JSDOM(home!.html);
      const system = dom.window.document.querySelector(".tree-row--system");
      expect(system).not.toBeNull();
      expect(system!.querySelector(".tree-card")!.textContent?.trim()).toBe("0..n");
      expect(system!.querySelector(".tree-name")!.textContent?.trim()).toBe("Plot");
    });

    it("has 5 element rows under Plot", () => {
      const dom = new JSDOM(home!.html);
      const elements = dom.window.document.querySelectorAll(".tree-row--element");
      expect(elements.length).toBe(5);
    });

    it("infrastructure relations are: sits on, based on, primed by (in that order)", () => {
      const dom = new JSDOM(home!.html);
      const labels = Array.from(dom.window.document.querySelectorAll(".relation-label")).map((l) =>
        l.textContent?.trim(),
      );
      expect(labels).toEqual(["sits on", "based on", "primed by"]);
    });

    it("infrastructure tags are: Claude.ai, Perplexity, Self-Hosted", () => {
      const dom = new JSDOM(home!.html);
      const tags = Array.from(dom.window.document.querySelectorAll(".infra-tag")).map((t) =>
        t.textContent?.trim(),
      );
      expect(tags).toEqual(["Claude.ai", "Perplexity", "Self-Hosted"]);
    });
  });

  describe("section structure", () => {
    it("all section numbers (§1 §2 §3) are present", () => {
      const dom = new JSDOM(home!.html);
      const nos = Array.from(dom.window.document.querySelectorAll(".section-no")).map((n) =>
        n.textContent?.trim(),
      );
      expect(nos).toContain("§1");
      expect(nos).toContain("§2");
      expect(nos).toContain("§3");
    });
  });
});
