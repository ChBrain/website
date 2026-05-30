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

  describe("the 3-jump diagram", () => {
    it("has a jump3 section", () => {
      const dom = new JSDOM(home!.html);
      const section = dom.window.document.querySelector(".jump3");
      expect(section).not.toBeNull();
    });

    it("has 3 rail jump buttons (one per tier)", () => {
      const dom = new JSDOM(home!.html);
      const jumps = dom.window.document.querySelectorAll(".jump3-jump");
      expect(jumps.length).toBe(3);
    });

    describe("tier 1 - Plot", () => {
      it("renders the Plot card linking to ./plot/", () => {
        const dom = new JSDOM(home!.html);
        const plot = dom.window.document.querySelector(".jump3-plot");
        expect(plot).not.toBeNull();
        expect(plot!.getAttribute("href")).toBe("./plot/");
      });

      it("Plot name reads 'Plot' with a trailing dot", () => {
        const dom = new JSDOM(home!.html);
        const name = dom.window.document.querySelector(".jump3-plot-name");
        expect(name).not.toBeNull();
        expect(name!.textContent).toContain("Plot");
        const dot = name!.querySelector(".jump3-plot-dot");
        expect(dot).not.toBeNull();
        expect(dot!.textContent).toBe(".");
      });

      it("Plot role is '00 · the system'", () => {
        const dom = new JSDOM(home!.html);
        const role = dom.window.document.querySelector(".jump3-plot-role");
        expect(role).not.toBeNull();
        expect(role!.textContent?.trim()).toBe("00 · the system");
      });

      it("Plot tag references the casting of forces", () => {
        const dom = new JSDOM(home!.html);
        const tag = dom.window.document.querySelector(".jump3-plot-tag");
        expect(tag).not.toBeNull();
        expect(tag!.textContent?.toLowerCase()).toContain("casting of forces");
      });
    });

    describe("tier 2 - the five elements slider", () => {
      const expectedFive = [
        { order: "01", name: "Process" },
        { order: "02", name: "Position" },
        { order: "03", name: "Piece" },
        { order: "04", name: "Place" },
        { order: "05", name: "Persona" },
      ];

      it("has 5 element items in the slider", () => {
        const dom = new JSDOM(home!.html);
        const items = dom.window.document.querySelectorAll(".jump3-item");
        expect(items.length).toBe(5);
      });

      for (const [i, t] of expectedFive.entries()) {
        it(`item ${i} is ${t.order} ${t.name} (element, draft)`, () => {
          const dom = new JSDOM(home!.html);
          const items = dom.window.document.querySelectorAll(".jump3-item");
          const item = items[i];
          const ord = item.querySelector(".jump3-item-ord")!.textContent ?? "";
          expect(ord).toContain(t.order);
          expect(ord).toContain("element");
          expect(ord).toContain("draft");
          const name = item.querySelector(".jump3-item-name")!.textContent ?? "";
          expect(name).toContain(t.name);
        });
      }

      it("has 5 dots in the slider pagination", () => {
        const dom = new JSDOM(home!.html);
        const dots = dom.window.document.querySelectorAll(".jump3-dot");
        expect(dots.length).toBe(5);
      });

      it("has prev and next arrow buttons", () => {
        const dom = new JSDOM(home!.html);
        const prev = dom.window.document.querySelector(".jump3-arrow--prev");
        const next = dom.window.document.querySelector(".jump3-arrow--next");
        expect(prev).not.toBeNull();
        expect(next).not.toBeNull();
      });
    });

    describe("tier 3 - the two source files", () => {
      it("has architecture.md and instructions.md as mono file cards", () => {
        const dom = new JSDOM(home!.html);
        const fns = Array.from(dom.window.document.querySelectorAll(".jump3-fn")).map((f) =>
          f.textContent?.replace(/\s+/g, "").trim(),
        );
        expect(fns.length).toBe(2);
        expect(fns[0]).toBe("architecture.md");
        expect(fns[1]).toBe("instructions.md");
      });

      it("substrate caption is present", () => {
        const dom = new JSDOM(home!.html);
        const substrate = dom.window.document.querySelector(".jump3-substrate");
        expect(substrate).not.toBeNull();
        expect(substrate!.textContent?.toLowerCase()).toContain("substrate");
      });
    });
  });

  describe("section structure", () => {
    it("§1 is present on the home; §2 and §3 were absorbed into the 3-jump diagram", () => {
      const dom = new JSDOM(home!.html);
      const nos = Array.from(dom.window.document.querySelectorAll(".section-no")).map((n) =>
        n.textContent?.trim(),
      );
      expect(nos).toContain("§1");
    });
  });
});
