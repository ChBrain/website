import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Architecture playbook - design contract.
 *
 * The playbook is the bound specification. Locking it down hard means
 * any silent edit (reordered spread, missing strip indicator, broken
 * TOC group, renamed role) breaks a test. That's the gate.
 *
 * Mirrors tests/cvi.test.ts. JSDOM + per-section describe; each spread
 * has its own assertion block. Doubles as a missing-page tripwire: if
 * the build silently drops dist/architecture/playbook/index.html, the
 * very first assertion fails.
 *
 * Spread content (subtitles, facets, coda) is rendered from the
 * @chbrain/khai-arch package and may change as specs are authored.
 * What this contract locks is the SHAPE: ordering, role grouping,
 * structural elements, and the nav chassis. Content drift inside a
 * spread is the spec authors' domain, not this test's.
 */

const pages = loadBuiltPages(process.cwd());
const playbook = pages.find((p) => p.path === "architecture/playbook/index.html");

// Canonical 8-spread spine. This order IS the design contract.
const SPINE = [
  { n: "00", slug: "plot", role: "the system", group: "system" },
  { n: "01", slug: "process", role: "element", group: "element" },
  { n: "02", slug: "position", role: "element", group: "element" },
  { n: "03", slug: "piece", role: "element", group: "element" },
  { n: "04", slug: "place", role: "element", group: "element" },
  { n: "05", slug: "persona", role: "element", group: "element" },
  { n: "06", slug: "architecture", role: "meta", group: "meta" },
  { n: "07", slug: "instructions", role: "meta", group: "meta" },
];

const GROUP_LABELS = ["the system", "casts", "rests on"];
const GROUP_COUNTS = [1, 5, 2];

describe("architecture playbook - design contract", () => {
  it("page exists at architecture/playbook/index.html (build tripwire)", () => {
    expect(playbook, "build did not emit dist/architecture/playbook/index.html").toBeDefined();
  });

  describe("global chrome (SiteHeader + SiteFooter)", () => {
    it("renders the SiteHeader with .kaihacks.ai TLD accent", () => {
      const dom = new JSDOM(playbook!.html);
      const tld = dom.window.document.querySelector(".topbar-domain-tld");
      expect(tld).not.toBeNull();
      expect(tld!.textContent).toBe(".kaihacks.ai");
    });

    it("renders the SiteFooter with the global Privacy + CVI links", () => {
      const dom = new JSDOM(playbook!.html);
      const links = [...dom.window.document.querySelectorAll(".footfed-legal-link")];
      const labels = links.map((a) => a.textContent?.trim());
      expect(labels).toContain("Privacy");
      expect(labels).toContain("CVI");
    });
  });

  describe("strip indicator (collapsed rail on the left edge)", () => {
    it("renders a .pb-strip button with aria-expanded=false by default", () => {
      const dom = new JSDOM(playbook!.html);
      const strip = dom.window.document.querySelector(".pb-strip");
      expect(strip).not.toBeNull();
      expect(strip!.getAttribute("aria-expanded")).toBe("false");
    });

    it("position counter shows 00/08 by default", () => {
      const dom = new JSDOM(playbook!.html);
      const pos = dom.window.document.querySelector(".pb-strip-pos");
      const cur = dom.window.document.querySelector(".pb-strip-cur");
      expect(pos).not.toBeNull();
      expect(cur?.textContent?.trim()).toBe("00");
      // The counter reads "00/08" - cur ("00") + "/08" total
      expect(pos!.textContent?.replace(/\s+/g, "")).toMatch(/00\/0?8/);
    });

    it("renders 8 bars (one per spec); at most 1 .is-current at render", () => {
      // Tolerant — the cover spread (when present) is the initial
      // current stop, so NO bar is .is-current at render. Pre-cover
      // builds had bar[0] = plot as .is-current. Either is accepted
      // until the cover lands and the strict re-tighten follows.
      const dom = new JSDOM(playbook!.html);
      const bars = [...dom.window.document.querySelectorAll(".pb-strip-bar")];
      expect(bars.length).toBe(SPINE.length);
      const current = bars.filter((b) => b.classList.contains("is-current"));
      expect(current.length).toBeLessThanOrEqual(1);
    });

    it("has a Contents stem label", () => {
      const dom = new JSDOM(playbook!.html);
      const label = dom.window.document.querySelector(".pb-strip-label");
      expect(label?.textContent?.trim()).toBe("Contents");
    });
  });

  describe("overlay rail (TOC, hidden by default)", () => {
    it("renders .pb-overlay with role=dialog, aria-modal=true, hidden", () => {
      const dom = new JSDOM(playbook!.html);
      const overlay = dom.window.document.querySelector(".pb-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay!.getAttribute("role")).toBe("dialog");
      expect(overlay!.getAttribute("aria-modal")).toBe("true");
      expect(overlay!.hasAttribute("hidden")).toBe(true);
    });

    it("has an eyebrow reading 'The Specification' and a close button", () => {
      const dom = new JSDOM(playbook!.html);
      const eyebrow = dom.window.document.querySelector(".pb-overlay-eyebrow");
      expect(eyebrow?.textContent?.trim()).toBe("The Specification");
      const close = dom.window.document.querySelector(".pb-overlay-close");
      expect(close).not.toBeNull();
      expect(close!.getAttribute("aria-label")).toBe("Close contents");
    });

    it("TOC has 3 groups in canonical order (the system / casts / rests on)", () => {
      const dom = new JSDOM(playbook!.html);
      const labels = [...dom.window.document.querySelectorAll(".pb-toc-grouplabel")].map((g) =>
        g.textContent?.trim(),
      );
      expect(labels).toEqual(GROUP_LABELS);
    });

    it("each group has the canonical item count (1 system + 5 element + 2 meta)", () => {
      const dom = new JSDOM(playbook!.html);
      const groups = [...dom.window.document.querySelectorAll(".pb-toc-group")];
      const counts = groups.map((g) => g.querySelectorAll(".pb-toc-link").length);
      expect(counts).toEqual(GROUP_COUNTS);
    });

    it("renders 8 TOC links total, in canonical order, with #slug hrefs", () => {
      const dom = new JSDOM(playbook!.html);
      const links = [...dom.window.document.querySelectorAll(".pb-toc-link")];
      expect(links.length).toBe(SPINE.length);
      links.forEach((a, i) => {
        expect(a.getAttribute("href")).toBe(`#${SPINE[i].slug}`);
        expect(a.querySelector(".pb-toc-n")?.textContent?.trim()).toBe(SPINE[i].n);
      });
    });
  });

  describe("8 spreads in canonical order", () => {
    it("renders exactly 8 .pb-spread articles", () => {
      const dom = new JSDOM(playbook!.html);
      const spreads = dom.window.document.querySelectorAll("article.pb-spread");
      expect(spreads.length).toBe(SPINE.length);
    });

    it("spread IDs appear in canonical order (plot first, instructions last)", () => {
      const dom = new JSDOM(playbook!.html);
      const ids = [...dom.window.document.querySelectorAll("article.pb-spread")].map((a) => a.id);
      expect(ids).toEqual(SPINE.map((s) => s.slug));
    });

    for (const spec of SPINE) {
      it(`§${spec.n} #${spec.slug}: head row + role label + title element`, () => {
        const dom = new JSDOM(playbook!.html);
        const spread = dom.window.document.querySelector(`article#${spec.slug}.pb-spread`);
        expect(spread, `missing spread #${spec.slug}`).not.toBeNull();

        // Head: §0N · {role}
        const no = spread!.querySelector(".pb-spread-no")?.textContent?.replace(/\s+/g, " ").trim();
        expect(no).toBe(`${spec.n} · ${spec.role}`);

        // State pill exists (draft or published, we don't lock which)
        const state = spread!.querySelector(".pb-spread-state");
        expect(state).not.toBeNull();
        expect(state!.textContent?.trim().toLowerCase()).toMatch(/^(draft|published)$/);

        // Title with brick dot
        const title = spread!.querySelector(".pb-spread-title");
        expect(title).not.toBeNull();
        const titleEm = title!.querySelector("em");
        expect(titleEm).not.toBeNull();
        expect(titleEm!.textContent?.trim()).toBe(".");
      });
    }
  });

  describe("snap chassis (CVI parity)", () => {
    it("renders a main.pb-spreads wrapper around the spreads", () => {
      const dom = new JSDOM(playbook!.html);
      const wrap = dom.window.document.querySelector("main.pb-spreads");
      expect(wrap).not.toBeNull();
    });

    it("SiteFooter lives OUTSIDE the spreads container", () => {
      const dom = new JSDOM(playbook!.html);
      const wrap = dom.window.document.querySelector("main.pb-spreads");
      const footer = dom.window.document.querySelector(".footfed");
      expect(footer).not.toBeNull();
      expect(wrap?.contains(footer)).toBe(false);
    });
  });
});
