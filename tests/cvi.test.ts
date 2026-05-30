import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";
import { BRAND } from "../src/lib/brand";

/**
 * CVI design contract.
 *
 * The CVI page IS the visual identity. Locking it down hard means any
 * change to its structure - dropped section, renamed variant, missing
 * swatch, palette drift on a chip - breaks a test. That's the gate.
 *
 * Mirrors the architecture-home pattern (JSDOM + per-section describe).
 * Doubles as a missing-page tripwire: if the build silently drops
 * dist/main/cvi/index.html, the very first assertion fails.
 *
 * Pairs with tests/brand-contract.test.ts which scans ALL built pages
 * for hex drift; this file is the deep-dive on CVI specifically.
 *
 * Forward-compatible with chapter sub-panel splits. The §04 Colour
 * chapter is already split (#color [ground & voice], #color-accents,
 * #color-rules). The §05 Typography chapter is queued to split next
 * (#type [the families], #type-scale [the scale]). Both use tolerant
 * matchers in SECTIONS (nStartsWith / h2Contains) so the sub-marker
 * "NN · i" + sub-titled h2 "Chapter – <subtitle>" don't require a
 * test bump. Colour-aggregating assertions scan `section[id^="color"]`
 * to combine swatches/labels across panels.
 */

const pages = loadBuiltPages(process.cwd());
const cvi = pages.find((p) => p.path === "main/cvi/index.html");

const TOC = [
  { n: "01", title: "The mark", href: "#mark" },
  { n: "02", title: "The set", href: "#set" },
  { n: "03", title: "Space & size", href: "#space" },
  { n: "04", title: "Colour", href: "#color" },
  { n: "05", title: "Typography", href: "#type" },
  { n: "06", title: "Icon & favicon", href: "#icon" },
  { n: "07", title: "Applications", href: "#apply" },
  { n: "08", title: "In one breath", href: "#voice" },
];

interface ChapterSpec {
  id: string;
  /** Exact .cvi-n text - if set, .cvi-n must equal this. */
  n?: string;
  /** Prefix .cvi-n text - if set, .cvi-n must startWith this (allows "04 · i" sub-markers). */
  nStartsWith?: string;
  /** Exact .cvi-h2 text - if set, .cvi-h2 must equal this. */
  h2?: string;
  /** Substring of .cvi-h2 text - if set, .cvi-h2 must contain this (allows sub-titles). */
  h2Contains?: string;
}

const SECTIONS: ChapterSpec[] = [
  { id: "mark", n: "01", h2: "The mark" },
  { id: "set", n: "02", h2: "The set – which to use when" },
  { id: "space", n: "03", h2: "Clear space & minimum size" },
  // #color uses tolerant matchers because the chapter may split into
  // three sub-panels (04 · i ground & voice, 04 · ii the accents,
  // 04 · iii rules & tokens). On split, #color carries 04 · i and the
  // h2 carries an "– <subtitle>" tail.
  { id: "color", nStartsWith: "04", h2Contains: "Colour" },
  // #type uses tolerant matchers because the chapter may split into
  // two sub-panels (05 · i the families, 05 · ii the scale). On split,
  // #type carries 05 · i and the h2 carries an "– <subtitle>" tail.
  { id: "type", nStartsWith: "05", h2Contains: "Typography" },
  { id: "icon", n: "06", h2: "Icon & favicon" },
  { id: "apply", n: "07", h2: "Applications & misuse" },
  { id: "voice", n: "08", h2: "In one breath" },
];

const LOCKUP_VARIANTS = [
  { tag: "khai-mark.svg", title: "Primary · brick" },
  { tag: "khai-mark-sea.svg", title: "Sea dot" },
  { tag: "khai-mark-amber.svg", title: "Amber dot" },
  { tag: "khai-mark-reverse.svg", title: "Reverse" },
];

const TYPE_FAMILIES = ["Newsreader", "Source Serif 4", "IBM Plex Mono"];

describe("CVI - design contract", () => {
  it("page exists at main/cvi/index.html (build tripwire)", () => {
    expect(cvi, "build did not emit dist/main/cvi/index.html").toBeDefined();
  });

  describe("global chrome (SiteHeader + SiteFooter)", () => {
    it("renders the SiteHeader with .ai TLD accent", () => {
      const dom = new JSDOM(cvi!.html);
      const tld = dom.window.document.querySelector(".topbar-domain-tld");
      expect(tld).not.toBeNull();
      expect(tld!.textContent).toBe(".ai");
    });

    it("renders the SiteHeader nav with the apex menu", () => {
      const dom = new JSDOM(cvi!.html);
      const navLinks = dom.window.document.querySelectorAll(".topbar-nav a");
      const labels = [...navLinks].map((a) => a.textContent?.trim());
      expect(labels).toEqual(["architecture", "cultures", "services"]);
    });

    it("renders the SiteFooter with the global Privacy + CVI links", () => {
      const dom = new JSDOM(cvi!.html);
      const links = [...dom.window.document.querySelectorAll(".footfed-legal-link")];
      const hrefs = links.map((a) => a.getAttribute("href"));
      expect(hrefs).toContain("https://kaihacks.ai/privacy/");
      expect(hrefs).toContain("https://kaihacks.ai/main/cvi/");
    });
  });

  describe("masthead", () => {
    it("h1 reads 'Corporate Visual Identity'", () => {
      const dom = new JSDOM(cvi!.html);
      const h1 = dom.window.document.querySelector(".cvi-h1");
      // The h1 source breaks across lines via <br>; JSDOM's textContent
      // doesn't insert a separator there, so check each token instead.
      const text = h1?.textContent ?? "";
      expect(text).toContain("Corporate");
      expect(text).toContain("Visual");
      expect(text).toContain("Identity");
    });

    it("the back-to-apex link points to ../", () => {
      const dom = new JSDOM(cvi!.html);
      const back = dom.window.document.querySelector(".cvi-back");
      expect(back?.getAttribute("href")).toBe("../");
    });

    it("renders the 4 meta items (Document/Mark/Type/Ground)", () => {
      const dom = new JSDOM(cvi!.html);
      const keys = [...dom.window.document.querySelectorAll(".cvi-meta .cvi-k")].map((k) =>
        k.textContent?.trim(),
      );
      expect(keys).toEqual(["Document", "Mark", "Type", "Ground"]);
    });
  });

  describe("table of contents", () => {
    it("has 8 TOC entries in canonical order", () => {
      const dom = new JSDOM(cvi!.html);
      const entries = [...dom.window.document.querySelectorAll(".cvi-toc > a")];
      expect(entries.length).toBe(TOC.length);
      entries.forEach((a, i) => {
        expect(a.getAttribute("href")).toBe(TOC[i].href);
        expect(a.querySelector(".cvi-tn")?.textContent?.trim()).toBe(TOC[i].n);
        expect(a.querySelector(".cvi-tt")?.textContent?.trim()).toBe(TOC[i].title);
      });
    });
  });

  describe("8 canonical chapters", () => {
    for (const sec of SECTIONS) {
      it(`§${sec.n ?? sec.nStartsWith}* #${sec.id}: has the canonical heading`, () => {
        const dom = new JSDOM(cvi!.html);
        const section = dom.window.document.querySelector(`section#${sec.id}.cvi-section`);
        expect(section, `missing section#${sec.id}`).not.toBeNull();
        const nText = section!.querySelector(".cvi-n")?.textContent?.trim() ?? "";
        const h2Text = section!.querySelector(".cvi-h2")?.textContent?.trim() ?? "";
        if (sec.n !== undefined) {
          expect(nText).toBe(sec.n);
        }
        if (sec.nStartsWith !== undefined) {
          expect(
            nText.startsWith(sec.nStartsWith),
            `expected ${sec.id} .cvi-n "${nText}" to start with "${sec.nStartsWith}"`,
          ).toBe(true);
        }
        if (sec.h2 !== undefined) {
          expect(h2Text).toBe(sec.h2);
        }
        if (sec.h2Contains !== undefined) {
          expect(
            h2Text.includes(sec.h2Contains),
            `expected ${sec.id} .cvi-h2 "${h2Text}" to contain "${sec.h2Contains}"`,
          ).toBe(true);
        }
      });
    }

    it("the 8 canonical chapter IDs appear in canonical order", () => {
      // Note: extra sub-panel sections (e.g. #color-accents, #color-rules)
      // are allowed between canonical IDs; we filter to canonical and
      // assert THEIR order is preserved.
      const dom = new JSDOM(cvi!.html);
      const allIds = [...dom.window.document.querySelectorAll("section.cvi-section")].map(
        (s) => s.id,
      );
      const canonical = SECTIONS.map((s) => s.id);
      const filtered = allIds.filter((id) => canonical.includes(id));
      expect(filtered).toEqual(canonical);
    });
  });

  describe("§02 the set - lockup variants", () => {
    it("renders all 4 authorised variants in canonical order", () => {
      const dom = new JSDOM(cvi!.html);
      const setSection = dom.window.document.querySelector("section#set");
      const cards = [...setSection!.querySelectorAll(".cvi-card")];
      expect(cards.length).toBe(LOCKUP_VARIANTS.length);
      cards.forEach((card, i) => {
        const tag = card.querySelector(".cvi-tag")?.textContent?.trim();
        const title = card.querySelector(".cvi-h3")?.textContent?.trim();
        expect(tag).toBe(LOCKUP_VARIANTS[i].tag);
        expect(title).toBe(LOCKUP_VARIANTS[i].title);
      });
    });

    it("the reverse variant renders on a dark stage", () => {
      const dom = new JSDOM(cvi!.html);
      const setSection = dom.window.document.querySelector("section#set");
      const stages = setSection!.querySelectorAll(".cvi-stage");
      expect(stages.length).toBe(4);
      const darkStages = setSection!.querySelectorAll(".cvi-stage--dark");
      expect(darkStages.length).toBe(1);
    });
  });

  describe("§04 colour - the palette", () => {
    // Queries scan ALL colour-prefixed sections so they aggregate across
    // the one-panel layout (today) AND the three-panel sub-snap split
    // (planned: #color / #color-accents / #color-rules).

    it("renders 4 surfaces + 3 inks + 2 rules + 6 accents = 15 swatches", () => {
      const dom = new JSDOM(cvi!.html);
      const colourSections = [
        ...dom.window.document.querySelectorAll('section[id^="color"].cvi-section'),
      ];
      const swatches = colourSections.flatMap((s) => [...s.querySelectorAll(".cvi-swatch")]);
      expect(swatches.length).toBe(15);
    });

    it("every chip background is a BRAND hex", () => {
      const dom = new JSDOM(cvi!.html);
      const chips = [
        ...dom.window.document.querySelectorAll('section[id^="color"].cvi-section .cvi-chip'),
      ];
      const brandHexes = new Set(Object.values(BRAND).map((h) => h.toLowerCase()));
      for (const chip of chips) {
        const style = chip.getAttribute("style") ?? "";
        const m = style.match(/background:\s*(#[0-9a-fA-F]{3,8})/);
        expect(m, `chip missing hex background: ${style}`).not.toBeNull();
        expect(brandHexes, `swatch hex ${m![1]} not in BRAND`).toContain(m![1].toLowerCase());
      }
    });

    it("displays the 4 canonical group labels in canonical order", () => {
      const dom = new JSDOM(cvi!.html);
      const labels = [
        ...dom.window.document.querySelectorAll('section[id^="color"].cvi-section .cvi-grouplabel'),
      ].map((g) => g.textContent?.trim());
      expect(labels).toEqual([
        "Surfaces – the ground",
        "Ink – text",
        "Rules – hairlines",
        "Accents – the regional hues",
      ]);
    });
  });

  describe("§05 typography - the three families", () => {
    it("renders 3 type specimens with the canonical family names", () => {
      const dom = new JSDOM(cvi!.html);
      const typeSection = dom.window.document.querySelector("section#type");
      const fams = [...typeSection!.querySelectorAll(".cvi-fam")].map((f) => f.textContent?.trim());
      expect(fams).toEqual(TYPE_FAMILIES);
    });
  });

  describe("§06 icon - sizes", () => {
    it("renders 3 stepped-size tiles (64/32/16) plus the large hero", () => {
      const dom = new JSDOM(cvi!.html);
      const iconSection = dom.window.document.querySelector("section#icon");
      const sizes = [...iconSection!.querySelectorAll(".cvi-ic .cvi-px")].map((p) =>
        p.textContent?.trim(),
      );
      expect(sizes).toEqual(["64", "32", "16"]);
    });
  });

  describe("§07 applications - do and don't", () => {
    it("renders exactly 5 dos and 5 don'ts", () => {
      const dom = new JSDOM(cvi!.html);
      const applySection = dom.window.document.querySelector("section#apply");
      // .cvi-dhead is the "Do"/"Don't" heading row, not a rule
      const dos = applySection!.querySelectorAll(".cvi-dlist--ok li:not(.cvi-dhead)");
      const donts = applySection!.querySelectorAll(".cvi-dlist--no li:not(.cvi-dhead)");
      expect(dos.length).toBe(5);
      expect(donts.length).toBe(5);
    });
  });

  describe("§08 voice", () => {
    it("the voice paragraph stays the canonical sentence", () => {
      const dom = new JSDOM(cvi!.html);
      const voice = dom.window.document.querySelector(".cvi-voice")?.textContent ?? "";
      expect(voice).toContain("Warm paper");
      expect(voice).toContain("brick dot");
      expect(voice).toContain("Editorial, calm, exact");
    });
  });

  describe("editorial colophon (cvi-footer)", () => {
    it("has 2 mono lines naming the version and the type stack", () => {
      const dom = new JSDOM(cvi!.html);
      const lines = [...dom.window.document.querySelectorAll(".cvi-footer .cvi-foot-line")];
      expect(lines.length).toBe(2);
      expect(lines[0].textContent).toContain("v0.1.0");
      expect(lines[1].textContent).toContain("Newsreader");
      expect(lines[1].textContent).toContain("Source Serif 4");
      expect(lines[1].textContent).toContain("IBM Plex Mono");
    });
  });
});
