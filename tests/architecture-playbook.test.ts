import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Architecture playbook - design contract (expand-contract gate).
 *
 * The canon (@chbrain/khai-arch) owns the playbook spine. The canon-driven
 * render (khai-arch >= 0.0.6) opens the playbook with Play and adds Engines,
 * grouping by `production / cast / rests on / enriched by`. The prior shape was
 * the 8-spread `the system / casts / rests on`.
 *
 * This gate detects which the BUILD produced -- by whether a `#play` spread is
 * present -- and asserts the matching contract, strictly, either way. So the
 * canon-driven source lands in its own PR (META-2 clean, no override): green
 * here on the old build, green there on the new. Once the source ships, the
 * old branch is dead and a tighten PR can derive the spine from the export.
 */

const pages = loadBuiltPages(process.cwd());
const playbookPage = pages.find((p) => p.path === "architecture/playbook/index.html");

const CANON = playbookPage
  ? !!new JSDOM(playbookPage.html).window.document.querySelector("article#play.pb-spread")
  : false;

const SPINE: { n: string; slug: string; role: string }[] = CANON
  ? [
      { n: "00", slug: "play", role: "production" },
      { n: "01", slug: "plot", role: "production" },
      { n: "02", slug: "process", role: "cast" },
      { n: "03", slug: "position", role: "cast" },
      { n: "04", slug: "piece", role: "cast" },
      { n: "05", slug: "place", role: "cast" },
      { n: "06", slug: "persona", role: "cast" },
      { n: "07", slug: "architecture", role: "rests on" },
      { n: "08", slug: "instructions", role: "rests on" },
      { n: "09", slug: "engines", role: "enriched by" },
    ]
  : [
      { n: "00", slug: "plot", role: "the system" },
      { n: "01", slug: "process", role: "element" },
      { n: "02", slug: "position", role: "element" },
      { n: "03", slug: "piece", role: "element" },
      { n: "04", slug: "place", role: "element" },
      { n: "05", slug: "persona", role: "element" },
      { n: "06", slug: "architecture", role: "meta" },
      { n: "07", slug: "instructions", role: "meta" },
    ];
const GROUP_LABELS = CANON
  ? ["production", "cast", "rests on", "enriched by"]
  : ["the system", "casts", "rests on"];
const GROUP_COUNTS = CANON ? [2, 5, 2, 1] : [1, 5, 2];
const TOTAL = String(SPINE.length).padStart(2, "0");

describe("architecture playbook - design contract", () => {
  it("page exists at architecture/playbook/index.html (build tripwire)", () => {
    expect(playbookPage, "build did not emit dist/architecture/playbook/index.html").toBeDefined();
  });

  describe("global chrome (SiteHeader + SiteFooter)", () => {
    it("renders the SiteHeader with .kaihacks.ai TLD accent", () => {
      const dom = new JSDOM(playbookPage!.html);
      const tld = dom.window.document.querySelector(".topbar-domain-tld");
      expect(tld).not.toBeNull();
      expect(tld!.textContent).toBe(".kaihacks.ai");
    });

    it("renders the SiteFooter with the global Privacy + CVI links", () => {
      const dom = new JSDOM(playbookPage!.html);
      const links = [...dom.window.document.querySelectorAll(".footfed-legal-link")];
      const labels = links.map((a) => a.textContent?.trim());
      expect(labels).toContain("Privacy");
      expect(labels).toContain("CVI");
    });
  });

  describe("strip indicator (collapsed rail on the left edge)", () => {
    it("renders a .pb-strip button with aria-expanded=false by default", () => {
      const dom = new JSDOM(playbookPage!.html);
      const strip = dom.window.document.querySelector(".pb-strip");
      expect(strip).not.toBeNull();
      expect(strip!.getAttribute("aria-expanded")).toBe("false");
    });

    it(`position counter shows 00/${TOTAL} by default`, () => {
      const dom = new JSDOM(playbookPage!.html);
      const pos = dom.window.document.querySelector(".pb-strip-pos");
      const cur = dom.window.document.querySelector(".pb-strip-cur");
      expect(pos).not.toBeNull();
      expect(cur?.textContent?.trim()).toBe("00");
      expect(pos!.textContent?.replace(/\s+/g, "")).toBe(`00/${TOTAL}`);
    });

    it("renders one bar per spec; at most 1 .is-current at render", () => {
      const dom = new JSDOM(playbookPage!.html);
      const bars = [...dom.window.document.querySelectorAll(".pb-strip-bar")];
      expect(bars.length).toBe(SPINE.length);
      const current = bars.filter((b) => b.classList.contains("is-current"));
      expect(current.length).toBeLessThanOrEqual(1);
    });

    it("has a Contents stem label", () => {
      const dom = new JSDOM(playbookPage!.html);
      const label = dom.window.document.querySelector(".pb-strip-label");
      expect(label?.textContent?.trim()).toBe("Contents");
    });
  });

  describe("overlay rail (TOC, hidden by default)", () => {
    it("renders .pb-overlay with role=dialog, aria-modal=true, hidden", () => {
      const dom = new JSDOM(playbookPage!.html);
      const overlay = dom.window.document.querySelector(".pb-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay!.getAttribute("role")).toBe("dialog");
      expect(overlay!.getAttribute("aria-modal")).toBe("true");
      expect(overlay!.hasAttribute("hidden")).toBe(true);
    });

    it("has an eyebrow reading 'The Specification' and a close button", () => {
      const dom = new JSDOM(playbookPage!.html);
      const eyebrow = dom.window.document.querySelector(".pb-overlay-eyebrow");
      expect(eyebrow?.textContent?.trim()).toBe("The Specification");
      const close = dom.window.document.querySelector(".pb-overlay-close");
      expect(close).not.toBeNull();
      expect(close!.getAttribute("aria-label")).toBe("Close contents");
    });

    it("TOC groups match the spine, in canonical order", () => {
      const dom = new JSDOM(playbookPage!.html);
      const labels = [...dom.window.document.querySelectorAll(".pb-toc-grouplabel")].map((g) =>
        g.textContent?.trim(),
      );
      expect(labels).toEqual(GROUP_LABELS);
    });

    it("each group has its canonical item count", () => {
      const dom = new JSDOM(playbookPage!.html);
      const groups = [...dom.window.document.querySelectorAll(".pb-toc-group")];
      const counts = groups.map((g) => g.querySelectorAll(".pb-toc-link").length);
      expect(counts).toEqual(GROUP_COUNTS);
    });

    it("renders one TOC link per spec, in canonical order, with #slug hrefs", () => {
      const dom = new JSDOM(playbookPage!.html);
      const links = [...dom.window.document.querySelectorAll(".pb-toc-link")];
      expect(links.length).toBe(SPINE.length);
      links.forEach((a, i) => {
        expect(a.getAttribute("href")).toBe(`#${SPINE[i].slug}`);
        expect(a.querySelector(".pb-toc-n")?.textContent?.trim()).toBe(SPINE[i].n);
      });
    });
  });

  describe("spreads in canonical order", () => {
    it("renders exactly one .pb-spread article per spec", () => {
      const dom = new JSDOM(playbookPage!.html);
      const spreads = dom.window.document.querySelectorAll("article.pb-spread");
      expect(spreads.length).toBe(SPINE.length);
    });

    it("spread IDs appear in canonical order", () => {
      const dom = new JSDOM(playbookPage!.html);
      const ids = [...dom.window.document.querySelectorAll("article.pb-spread")].map((a) => a.id);
      expect(ids).toEqual(SPINE.map((s) => s.slug));
    });

    for (const spec of SPINE) {
      it(`§${spec.n} #${spec.slug}: head row + role label + title element`, () => {
        const dom = new JSDOM(playbookPage!.html);
        const spread = dom.window.document.querySelector(`article#${spec.slug}.pb-spread`);
        expect(spread, `missing spread #${spec.slug}`).not.toBeNull();

        // Head: §NN · {role} (the spec's role label as the source renders it).
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
      const dom = new JSDOM(playbookPage!.html);
      const wrap = dom.window.document.querySelector("main.pb-spreads");
      expect(wrap).not.toBeNull();
    });

    it("SiteFooter lives OUTSIDE the spreads container", () => {
      const dom = new JSDOM(playbookPage!.html);
      const wrap = dom.window.document.querySelector("main.pb-spreads");
      const footer = dom.window.document.querySelector(".footfed");
      expect(footer).not.toBeNull();
      expect(wrap?.contains(footer)).toBe(false);
    });
  });
});
