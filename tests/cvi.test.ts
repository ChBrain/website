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
 * Sub-panel splits are LOCKED. §04 Colour is split into three panels
 * (#color "04 · i" ground & voice, #color-accents "04 · ii" the accents,
 * #color-rules "04 · iii" rules & tokens). §05 Typography is split into
 * two panels (#type "05 · i" the families, #type-scale "05 · ii" the
 * scale). Canonical SECTIONS asserts the first panel of each chapter
 * exactly; SUB_PANELS asserts the secondary panels exactly. Colour-
 * aggregating assertions scan `section[id^="color"]` to combine swatches
 * and labels across all three colour panels.
 */

const pages = loadBuiltPages(process.cwd());
const cvi = pages.find((p) => p.path === "main/cvi/index.html");

// Two accepted TOC shapes — LEGACY (8 entries) or NEW (9, with Writing
// inserted as 06 between Typography and Icon). The NEW shape promotes
// the writing rules (voice & punctuation) to a top-level chapter, peer
// to Typography, instead of being tucked under it. Bumps Icon/Applications/
// In one breath to 07/08/09.
const TOC_LEGACY = [
  { n: "01", title: "The mark", href: "#mark" },
  { n: "02", title: "The set", href: "#set" },
  { n: "03", title: "Space & size", href: "#space" },
  { n: "04", title: "Colour", href: "#color" },
  { n: "05", title: "Typography", href: "#type" },
  { n: "06", title: "Icon & favicon", href: "#icon" },
  { n: "07", title: "Applications", href: "#apply" },
  { n: "08", title: "In one breath", href: "#voice" },
];
const TOC_NEW = [
  { n: "01", title: "The mark", href: "#mark" },
  { n: "02", title: "The set", href: "#set" },
  { n: "03", title: "Space & size", href: "#space" },
  { n: "04", title: "Colour", href: "#color" },
  { n: "05", title: "Typography", href: "#type" },
  { n: "06", title: "Writing", href: "#writing" },
  { n: "07", title: "Icon & favicon", href: "#icon" },
  { n: "08", title: "Applications", href: "#apply" },
  { n: "09", title: "In one breath", href: "#voice" },
];

interface ChapterSpec {
  id: string;
  /** Exact .cvi-n text - .cvi-n must equal this. */
  n: string;
  /** Exact .cvi-h2 text - .cvi-h2 must equal this. */
  h2: string;
}

// Two accepted SECTIONS shapes — LEGACY (Icon=06, Apply=07, Voice=08)
// or NEW (Writing=06 inserted, Icon/Apply/Voice bump to 07/08/09).
// The asserted IDs and headings change with the bump.
const SECTIONS_LEGACY: ChapterSpec[] = [
  { id: "mark", n: "01", h2: "The mark" },
  { id: "set", n: "02", h2: "The set – which to use when" },
  { id: "space", n: "03", h2: "Clear space & minimum size" },
  // §04 colour is split into 3 sub-panels; #color is panel i.
  // Panels ii (#color-accents) and iii (#color-rules) are asserted
  // separately in SUB_PANELS below.
  { id: "color", n: "04 · i", h2: "Colour – ground & voice" },
  // §05 typography is split into 2 sub-panels; #type is panel i.
  // Panel ii (#type-scale) is asserted separately in SUB_PANELS below.
  { id: "type", n: "05 · i", h2: "Typography – the families" },
  { id: "icon", n: "06", h2: "Icon & favicon" },
  { id: "apply", n: "07", h2: "Applications & misuse" },
  { id: "voice", n: "08", h2: "In one breath" },
];
const SECTIONS_NEW: ChapterSpec[] = [
  { id: "mark", n: "01", h2: "The mark" },
  { id: "set", n: "02", h2: "The set – which to use when" },
  { id: "space", n: "03", h2: "Clear space & minimum size" },
  { id: "color", n: "04 · i", h2: "Colour – ground & voice" },
  { id: "type", n: "05 · i", h2: "Typography – the families" },
  { id: "writing", n: "06", h2: "Writing: voice & punctuation" },
  { id: "icon", n: "07", h2: "Icon & favicon" },
  { id: "apply", n: "08", h2: "Applications & misuse" },
  { id: "voice", n: "09", h2: "In one breath" },
];
// Resolved at test time per build — picks the matching shape from #voice's n
// label (08 = legacy, 09 = new). Lets the same test file pass on both
// versions of the source while the lift lands.
function pickSections(cvi: { html: string }): ChapterSpec[] {
  const dom = new JSDOM(cvi.html);
  const voice = dom.window.document.querySelector("section#voice .cvi-n")?.textContent?.trim();
  return voice === "09" ? SECTIONS_NEW : SECTIONS_LEGACY;
}
function pickToc(cvi: { html: string }) {
  const dom = new JSDOM(cvi.html);
  const voice = dom.window.document.querySelector("section#voice .cvi-n")?.textContent?.trim();
  return voice === "09" ? TOC_NEW : TOC_LEGACY;
}

const SUB_PANELS: ChapterSpec[] = [
  { id: "color-accents", n: "04 · ii", h2: "Colour – the accents" },
  { id: "color-rules", n: "04 · iii", h2: "Colour – rules & tokens" },
  { id: "type-scale", n: "05 · ii", h2: "Typography – the scale" },
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

    it("renders the SiteHeader nav (legacy 3-item apex menu OR removed for the location-label shape)", () => {
      // Two accepted shapes for the SiteHeader after the chrome restructure:
      // - LEGACY: 3 nav items (architecture / cultures / services)
      // - LOCATION-LABEL: nav removed; top-left is a wayfinding label and
      //   the wordmark moves to the top-right. ".topbar-nav" may be absent
      //   entirely or empty.
      const dom = new JSDOM(cvi!.html);
      const navLinks = [...dom.window.document.querySelectorAll(".topbar-nav a")];
      const labels = navLinks.map((a) => a.textContent?.trim());
      const isLegacy =
        labels.length === 3 &&
        labels[0] === "architecture" &&
        labels[1] === "cultures" &&
        labels[2] === "services";
      const isLocationLabel = labels.length === 0;
      expect(
        isLegacy || isLocationLabel,
        `nav "${labels.join(" · ")}" matched neither the legacy apex menu nor the location-label removal`,
      ).toBe(true);
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
    it("has the canonical TOC entries in canonical order (legacy 8 or new 9)", () => {
      const dom = new JSDOM(cvi!.html);
      const expected = pickToc(cvi!);
      const entries = [...dom.window.document.querySelectorAll(".cvi-toc > a")];
      expect(entries.length).toBe(expected.length);
      entries.forEach((a, i) => {
        expect(a.getAttribute("href")).toBe(expected[i].href);
        expect(a.querySelector(".cvi-tn")?.textContent?.trim()).toBe(expected[i].n);
        expect(a.querySelector(".cvi-tt")?.textContent?.trim()).toBe(expected[i].title);
      });
    });
  });

  describe("canonical chapters (legacy 8 or new 9 with Writing)", () => {
    it("each canonical chapter renders with the right n + h2", () => {
      const dom = new JSDOM(cvi!.html);
      const expected = pickSections(cvi!);
      for (const sec of expected) {
        const section = dom.window.document.querySelector(`section#${sec.id}.cvi-section`);
        expect(section, `missing section#${sec.id}`).not.toBeNull();
        expect(section!.querySelector(".cvi-n")?.textContent?.trim()).toBe(sec.n);
        expect(section!.querySelector(".cvi-h2")?.textContent?.trim()).toBe(sec.h2);
      }
    });

    it("canonical chapter IDs appear in canonical order", () => {
      // Sub-panel sections (#color-accents, #color-rules, #type-scale)
      // are interspersed between canonical IDs; we filter to canonical
      // and assert THEIR order is preserved.
      const dom = new JSDOM(cvi!.html);
      const expected = pickSections(cvi!);
      const allIds = [...dom.window.document.querySelectorAll("section.cvi-section")].map(
        (s) => s.id,
      );
      const canonical = expected.map((s) => s.id);
      const filtered = allIds.filter((id) => canonical.includes(id));
      expect(filtered).toEqual(canonical);
    });
  });

  describe("sub-panel splits (§04 colour, §05 typography)", () => {
    for (const sub of SUB_PANELS) {
      it(`§${sub.n} #${sub.id}: has the canonical sub-panel heading`, () => {
        const dom = new JSDOM(cvi!.html);
        const section = dom.window.document.querySelector(`section#${sub.id}.cvi-section`);
        expect(section, `missing sub-panel section#${sub.id}`).not.toBeNull();
        expect(section!.querySelector(".cvi-n")?.textContent?.trim()).toBe(sub.n);
        expect(section!.querySelector(".cvi-h2")?.textContent?.trim()).toBe(sub.h2);
      });
    }

    it("colour sub-panels appear in canonical i → ii → iii order", () => {
      const dom = new JSDOM(cvi!.html);
      const colourIds = [
        ...dom.window.document.querySelectorAll('section[id^="color"].cvi-section'),
      ].map((s) => s.id);
      expect(colourIds).toEqual(["color", "color-accents", "color-rules"]);
    });

    it("typography sub-panels appear in canonical i → ii order", () => {
      const dom = new JSDOM(cvi!.html);
      const typeIds = [
        ...dom.window.document.querySelectorAll('section[id^="type"].cvi-section'),
      ].map((s) => s.id);
      expect(typeIds).toEqual(["type", "type-scale"]);
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
    // Queries scan all three colour panels (#color, #color-accents,
    // #color-rules) so swatch / label counts aggregate across the split.

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
