import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Privacy statement design contract.
 *
 * Mirrors tests/cvi.test.ts. The privacy page is a legal document - any
 * silent edit (dropped section, weakened legal-basis citation, missing
 * sub-processor row, removed Datatilsynet pointer) needs to break a
 * test so it can't slip in unreviewed.
 *
 * What's locked: the structural skeleton + the legal anchors that have
 * to be on the page (controller identity, sub-processor list, legal
 * basis articles, Datatilsynet, withdrawal of consent).
 *
 * What's intentionally NOT locked: the prose itself. Section copy can
 * still be tightened or extended without fighting the test - only the
 * page's *shape* and *anchors* are gated.
 *
 * The version label is intentionally NOT locked - the Document field
 * may carry a bare "Privacy statement", a DRAFT marker, or a v0.X.Y
 * release suffix. Only the document name is asserted, so the version
 * shape can be changed (or dropped) without a test-PR alongside it.
 */

// The numbered section head migrated to the shared khaibook classes
// (.book-secno / .book-h2, book.css) from its page-private .p-n / .p-h2. These
// selectors accept either, so this contract stays green across the migration
// (on old-class main and after the surface PR lands). See chassis #176.
const SECNO = ".p-n, .book-secno";
const SECH2 = ".p-h2, .book-h2";

const pages = loadBuiltPages(process.cwd());
// Privacy folds under the main surface (dist/main/privacy/) when main becomes
// the apex; accept either build path while the move lands.
const privacy =
  pages.find((p) => p.path === "privacy/index.html") ??
  pages.find((p) => p.path === "main/privacy/index.html");

const SECTIONS = [
  { n: "01", h2: "The short version" },
  { n: "02", h2: "What we collect" },
  { n: "03", h2: "The newsletter", id: "newsletter" },
  { n: "04", h2: "Who helps us run this", id: "vendors" },
  { n: "05", h2: "Cookies" },
  { n: "06", h2: "How long we keep it" },
  { n: "07", h2: "Your choices & rights" },
  { n: "08", h2: "Changes" },
];

const META_KEYS = ["Document", "Effective", "Controller", "Contact"];

const PROCESSORS = ["GoDaddy", "Cloudflare", "GitHub", "Substack"];

describe("privacy statement - design contract", () => {
  it("page exists at privacy/index.html (build tripwire)", () => {
    expect(privacy, "build did not emit dist/privacy/index.html").toBeDefined();
  });

  describe("global chrome (SiteHeader + SiteFooter)", () => {
    it("renders the SiteHeader with .ai TLD accent", () => {
      const dom = new JSDOM(privacy!.html);
      const tld = dom.window.document.querySelector(".topbar-domain-tld");
      expect(tld).not.toBeNull();
      expect(tld!.textContent).toBe(".ai");
    });

    it("renders the SiteHeader in the location-label shape (no .topbar-nav)", () => {
      // The chrome lift landed in #104; privacy is on the location-label
      // shape (wayfinding label top-left, wordmark top-right, no nav
      // links). The legacy 3-item apex menu is gone — locking the
      // assertion catches any regression to it.
      const dom = new JSDOM(privacy!.html);
      const navLinks = [...dom.window.document.querySelectorAll(".topbar-nav a")];
      expect(navLinks.length).toBe(0);
    });

    it("renders the SiteFooter with Privacy + CVI global links", () => {
      const dom = new JSDOM(privacy!.html);
      const links = [...dom.window.document.querySelectorAll(".footfed-legal-link")];
      const labels = links.map((a) => a.textContent?.trim());
      expect(labels).toContain("Privacy");
      expect(labels).toContain("CVI");
    });
  });

  describe("masthead", () => {
    it("h1 reads 'Privacy Statement'", () => {
      const dom = new JSDOM(privacy!.html);
      const h1 = dom.window.document.querySelector(".p-h1");
      const text = h1?.textContent ?? "";
      expect(text).toContain("Privacy");
      expect(text).toContain("Statement");
    });

    it("has a non-empty lede paragraph", () => {
      const dom = new JSDOM(privacy!.html);
      const lede = dom.window.document.querySelector(".p-lede");
      expect(lede).not.toBeNull();
      expect((lede!.textContent ?? "").length).toBeGreaterThan(40);
    });

    it("renders the 4 meta keys in canonical order", () => {
      const dom = new JSDOM(privacy!.html);
      const keys = [...dom.window.document.querySelectorAll(".p-meta .p-k")].map((k) =>
        k.textContent?.trim(),
      );
      expect(keys).toEqual(META_KEYS);
    });

    it("Controller meta value carries the registered identity + CVR", () => {
      const dom = new JSDOM(privacy!.html);
      const keys = [...dom.window.document.querySelectorAll(".p-meta .p-k")];
      const controllerRow = keys.find((k) => k.textContent?.trim() === "Controller")?.parentElement;
      const value = controllerRow?.querySelector(".p-v")?.textContent ?? "";
      expect(value).toContain("Kai Schlüter");
      expect(value).toContain("KAI HACKS AI");
      expect(value).toContain("Denmark");
      expect(value).toContain("CVR");
      expect(value).toContain("41768274");
    });

    it("Contact meta value is privacy@kaihacks.ai", () => {
      const dom = new JSDOM(privacy!.html);
      const keys = [...dom.window.document.querySelectorAll(".p-meta .p-k")];
      const contactRow = keys.find((k) => k.textContent?.trim() === "Contact")?.parentElement;
      const value = contactRow?.querySelector(".p-v")?.textContent?.trim();
      expect(value).toBe("privacy@kaihacks.ai");
    });

    it("Document field carries 'Privacy statement' (version label optional during draft)", () => {
      // The version label is intentionally NOT locked. Three accepted shapes:
      // - bare: "Privacy statement" (current - no version pinned during draft)
      // - draft marker: "Privacy statement · DRAFT v0.1" (legacy)
      // - release: "Privacy statement · v0.1.0" (post-publication flip)
      // Same tolerance pattern used elsewhere - only the document name is gated.
      const dom = new JSDOM(privacy!.html);
      const keys = [...dom.window.document.querySelectorAll(".p-meta .p-k")];
      const docRow = keys.find((k) => k.textContent?.trim() === "Document")?.parentElement;
      const value = docRow?.querySelector(".p-v")?.textContent ?? "";
      expect(value).toContain("Privacy statement");
    });
  });

  describe("8 numbered sections", () => {
    for (const sec of SECTIONS) {
      it(`§${sec.n} ${sec.h2}: rendered with the canonical heading`, () => {
        const dom = new JSDOM(privacy!.html);
        const allSections = [...dom.window.document.querySelectorAll("section.p-section")];
        const section = allSections.find((s) => {
          const n = s.querySelector(SECNO)?.textContent?.trim();
          return n === sec.n;
        });
        expect(section, `missing §${sec.n}`).toBeDefined();
        expect(section!.querySelector(SECH2)?.textContent?.trim()).toBe(sec.h2);
        if (sec.id) {
          expect(section!.id).toBe(sec.id);
        }
      });
    }

    it("sections appear in canonical 01-08 order", () => {
      const dom = new JSDOM(privacy!.html);
      const nums = [...dom.window.document.querySelectorAll(`section.p-section :is(${SECNO})`)].map(
        (n) => n.textContent?.trim(),
      );
      expect(nums).toEqual(SECTIONS.map((s) => s.n));
    });

    it("the last section is marked .p-section--last", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      expect(sections.at(-1)!.classList.contains("p-section--last")).toBe(true);
    });
  });

  describe("§02 What we collect - legal anchors", () => {
    it("has both subheadings (auto + on-consent)", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      const sec02 = sections.find((s) => s.querySelector(SECNO)?.textContent?.trim() === "02")!;
      const h3s = [...sec02.querySelectorAll(".p-h3")].map((h) => h.textContent?.trim());
      expect(h3s).toEqual(["Automatically, when you visit", "Only when you give it to us"]);
    });

    it("auto-collection list has IP / browser / date", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      const sec02 = sections.find((s) => s.querySelector(SECNO)?.textContent?.trim() === "02")!;
      const items = [...sec02.querySelectorAll("ul.p-list li")].map((li) =>
        (li.textContent ?? "").toLowerCase(),
      );
      expect(items.length).toBe(3);
      expect(items[0]).toContain("ip address");
      expect(items[1]).toContain("browser");
      expect(items[2]).toContain("date");
    });

    it("declares legitimate interest (GDPR Art. 6(1)(f))", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      const sec02 = sections.find((s) => s.querySelector(SECNO)?.textContent?.trim() === "02")!;
      const text = sec02.textContent ?? "";
      expect(text).toContain("legitimate interest");
      expect(text).toContain("Art. 6(1)(f)");
    });
  });

  describe("§03 newsletter - legal anchors", () => {
    it("names Substack + the publication URL", () => {
      const dom = new JSDOM(privacy!.html);
      const sec03 = dom.window.document.querySelector("section#newsletter")!;
      const text = sec03.textContent ?? "";
      expect(text).toContain("Substack");
      expect(text).toContain("combinedcultures.substack.com");
    });

    it("declares consent as legal basis (GDPR Art. 6(1)(a))", () => {
      const dom = new JSDOM(privacy!.html);
      const sec03 = dom.window.document.querySelector("section#newsletter")!;
      const text = sec03.textContent ?? "";
      expect(text).toContain("Art. 6(1)(a)");
      expect(text.toLowerCase()).toContain("consent");
    });

    it("disclaims profiling / off-platform advertising / cross-referencing", () => {
      const dom = new JSDOM(privacy!.html);
      const sec03 = dom.window.document.querySelector("section#newsletter")!;
      const text = (sec03.textContent ?? "").toLowerCase();
      expect(text).toContain("profile");
      expect(text).toContain("advertising");
      expect(text).toContain("cross-reference");
    });
  });

  describe("§04 sub-processors", () => {
    it("renders all 4 sub-processors in canonical order", () => {
      const dom = new JSDOM(privacy!.html);
      const rows = [...dom.window.document.querySelectorAll(".p-proc-row .p-proc-who")];
      const names = rows.map((r) => r.textContent?.trim());
      expect(names).toEqual(PROCESSORS);
    });

    it("every sub-processor row links out to its own privacy policy", () => {
      const dom = new JSDOM(privacy!.html);
      const rows = [...dom.window.document.querySelectorAll(".p-proc-row")];
      for (const row of rows) {
        const link = row.querySelector(".p-proc-what a");
        expect(link).not.toBeNull();
        expect(link!.getAttribute("href")).toMatch(/^https:\/\//);
      }
    });

    it("declares international transfers + GDPR safeguards (DPF / SCCs)", () => {
      const dom = new JSDOM(privacy!.html);
      const sec04 = dom.window.document.querySelector("section#vendors")!;
      const text = sec04.textContent ?? "";
      expect(text).toContain("International transfers");
      expect(text).toContain("Data Privacy Framework");
      expect(text).toContain("Standard Contractual Clauses");
    });
  });

  describe("§05 cookies", () => {
    it("names the Cloudflare __cf_bm essential security cookie", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      const sec05 = sections.find((s) => s.querySelector(SECNO)?.textContent?.trim() === "05")!;
      const text = sec05.textContent ?? "";
      expect(text).toContain("__cf_bm");
      expect(text.toLowerCase()).toContain("strictly necessary");
    });
  });

  describe("§07 rights", () => {
    it("the unsubscribe bullet explicitly frames it as withdrawing consent", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      const sec07 = sections.find((s) => s.querySelector(SECNO)?.textContent?.trim() === "07")!;
      const items = [...sec07.querySelectorAll("ul.p-list li")].map((li) =>
        (li.textContent ?? "").toLowerCase(),
      );
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items.some((t) => t.includes("unsubscribe") && t.includes("withdraw"))).toBe(true);
    });

    it("the access/delete bullet points at the contact email", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      const sec07 = sections.find((s) => s.querySelector(SECNO)?.textContent?.trim() === "07")!;
      const mailto = [...sec07.querySelectorAll("a")].find((a) =>
        a.getAttribute("href")?.startsWith("mailto:"),
      );
      expect(mailto).toBeDefined();
      expect(mailto!.getAttribute("href")).toBe("mailto:privacy@kaihacks.ai");
    });

    it("names Datatilsynet as the supervisory authority + GDPR rights", () => {
      const dom = new JSDOM(privacy!.html);
      const sections = [...dom.window.document.querySelectorAll("section.p-section")];
      const sec07 = sections.find((s) => s.querySelector(SECNO)?.textContent?.trim() === "07")!;
      const text = sec07.textContent ?? "";
      expect(text).toContain("GDPR");
      expect(text).toContain("Datatilsynet");
      // canonical Danish DPA URL
      const dpa = [...sec07.querySelectorAll("a")].find((a) =>
        a.getAttribute("href")?.includes("datatilsynet.dk"),
      );
      expect(dpa).toBeDefined();
    });
  });

  describe("page footer (editorial signoff)", () => {
    it("has exactly 2 mono lines (doc + effective/email)", () => {
      const dom = new JSDOM(privacy!.html);
      const lines = [...dom.window.document.querySelectorAll(".p-foot .p-foot-line")];
      expect(lines.length).toBe(2);
    });

    it("first line names the document; second line has the contact email", () => {
      const dom = new JSDOM(privacy!.html);
      const lines = [...dom.window.document.querySelectorAll(".p-foot .p-foot-line")];
      expect(lines[0].textContent).toContain("KAI HACKS AI");
      expect(lines[0].textContent).toContain("Privacy statement");
      expect(lines[1].textContent).toContain("privacy@kaihacks.ai");
    });
  });
});
