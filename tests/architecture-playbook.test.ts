import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { playbook } from "@chbrain/khai-arch";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Architecture playbook - design contract.
 *
 * What this contract locks is the SHAPE: that the rendered page faithfully
 * renders the canon's OWN playbook spine (@chbrain/khai-arch's `playbook`
 * export) -- the groups, their labels, their order, and one spread per member
 * in order. Any silent rendering regression (reordered spread, dropped group,
 * broken TOC, missing strip) still breaks a test.
 *
 * The expectations are DERIVED from the installed canon, not hardcoded: add a
 * spec to the canon's model and the playbook grows, and this test follows it
 * without edits. The canon owns the structure; the site only renders it.
 */

const pages = loadBuiltPages(process.cwd());
const playbookPage = pages.find((p) => p.path === "architecture/playbook/index.html");

// The spine, derived from the canon: every group's members, in order, numbered.
let n = 0;
const SPINE = playbook.flatMap((g) =>
  g.members.map((slug) => ({ n: String(n++).padStart(2, "0"), slug, role: g.label })),
);
const GROUP_LABELS = playbook.map((g) => g.label);
const GROUP_COUNTS = playbook.map((g) => g.members.length);
const TOTAL = String(SPINE.length).padStart(2, "0");

describe("architecture playbook - design contract", () => {
  it("page exists at architecture/playbook/index.html (build tripwire)", () => {
    expect(playbookPage, "build did not emit dist/architecture/playbook/index.html").toBeDefined();
  });

  it("canon exposes a non-empty playbook spine", () => {
    expect(playbook.length).toBeGreaterThan(0);
    expect(SPINE.length).toBeGreaterThan(0);
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

    it("TOC groups match the canon's groups, in order", () => {
      const dom = new JSDOM(playbookPage!.html);
      const labels = [...dom.window.document.querySelectorAll(".pb-toc-grouplabel")].map((g) =>
        g.textContent?.trim(),
      );
      expect(labels).toEqual(GROUP_LABELS);
    });

    it("each group has the canon's member count", () => {
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

        // Head: §NN · {role}, where role is the spec's group label.
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
