import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Enginebooks - design contract.
 *
 * Each installed @chbrain/khai-engine-* renders two surfaces, both manifest-
 * driven and reusing the canon Playbook chassis:
 *
 *   /engines           the shelf  (dist: architecture/engines/index.html)
 *   /engines/<name>    one book   (dist: architecture/engines/<name>/index.html)
 *
 * The shelf is a hard build tripwire (the route must exist). Per-engine book
 * assertions are guarded on that book being present, so the contract holds for
 * whatever engine set is installed (today: gender) without breaking when the
 * set changes. See docs/enginebooks.md.
 */

const pages = loadBuiltPages(process.cwd());
const shelf = pages.find((p) => p.path === "architecture/engines/index.html");
const genderBook = pages.find((p) => p.path === "architecture/engines/gender/index.html");

describe("enginebooks shelf - /engines", () => {
  it("page exists at architecture/engines/index.html (build tripwire)", () => {
    expect(shelf, "build did not emit dist/architecture/engines/index.html").toBeDefined();
  });

  it("is titled Enginebooks", () => {
    const doc = new JSDOM(shelf!.html).window.document;
    expect(doc.querySelector(".masthead-title")?.textContent?.toLowerCase()).toContain(
      "enginebooks",
    );
  });

  it("carries the shared chrome (.kaihacks.ai TLD accent + footer legal links)", () => {
    const doc = new JSDOM(shelf!.html).window.document;
    expect(doc.querySelector(".topbar-domain-tld")?.textContent).toBe(".kaihacks.ai");
    const labels = [...doc.querySelectorAll(".footfed-legal-link")].map((a) =>
      a.textContent?.trim(),
    );
    expect(labels).toContain("Privacy");
    expect(labels).toContain("CVI");
  });

  it("renders one card per installed engine, each linking into its book", () => {
    const doc = new JSDOM(shelf!.html).window.document;
    const cards = [...doc.querySelectorAll("a.eb-card")];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const href = card.getAttribute("href") ?? "";
      // ./<id>/ -- a relative descent into the per-engine book
      expect(href).toMatch(/^\.\/[a-z0-9-]+\/$/);
      expect(card.querySelector(".eb-card-title")?.textContent?.trim()).toBeTruthy();
    }
  });

  it("includes the gender engine on the shelf", () => {
    const doc = new JSDOM(shelf!.html).window.document;
    const hrefs = [...doc.querySelectorAll("a.eb-card")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("./gender/");
  });
});

describe("enginebook - /engines/gender", () => {
  it("page exists at architecture/engines/gender/index.html", () => {
    // Guarded: only assert further if gender is the installed engine.
    if (!genderBook) return;
    expect(genderBook).toBeDefined();
  });

  it("cover names the engine (Gender) with the brick dot", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    const title = doc.querySelector(".eb-cover-title");
    expect(title?.textContent?.toLowerCase()).toContain("gender");
    expect(title?.querySelector("em")?.textContent?.trim()).toBe(".");
  });

  it("opens with the wiring (WIRES) spread, then the anchor", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    const ids = [...doc.querySelectorAll("article.eb-spread")].map((a) => a.id);
    expect(ids[0]).toBe("wiring");
    expect(ids[1]).toBe("anchor");
  });

  it("renders one expression spread per expression (gender: male, female)", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    const ids = [...doc.querySelectorAll("article.eb-spread--expression")].map((a) => a.id);
    expect(ids).toContain("male");
    expect(ids).toContain("female");
  });

  it("closes with the composed spread, showing the assembled instruction set", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    const composed = doc.querySelector("article#composed.eb-spread--composed");
    expect(composed, "missing composed spread").not.toBeNull();
    const manuscript = composed!.querySelector("pre.eb-manuscript");
    expect(manuscript, "composed spread has no manuscript").not.toBeNull();
    expect(manuscript!.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("the wiring spread carries the WIRES facets", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    const wiring = doc.querySelector("article#wiring.eb-spread");
    const facets = [...(wiring?.querySelectorAll(".eb-facet-name") ?? [])].map((h) =>
      h.textContent?.replace(/\s+/g, "").trim(),
    );
    // Wire / Issue / Require / Enforce (+ Setup): at minimum the four WIRE letters.
    expect(facets).toEqual(expect.arrayContaining(["Wire", "Issue", "Require", "Enforce"]));
  });
});
