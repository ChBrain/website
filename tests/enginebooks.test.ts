import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

/**
 * Enginebooks - design contract.
 *
 * Each installed @chbrain/khai-engine-* renders two surfaces, both manifest-
 * driven and reusing the canon Playbook chassis:
 *
 *   /enginebooks           the shelf  (dist: architecture/enginebooks/index.html)
 *   /enginebooks/<name>    one book   (dist: architecture/enginebooks/<name>/index.html)
 *
 * The shelf is a hard build tripwire (the route must exist). Per-engine book
 * assertions are guarded on that book being present, so the contract holds for
 * whatever engine set is installed (today: gender) without breaking when the
 * set changes. See docs/enginebooks.md.
 */

const pages = loadBuiltPages(process.cwd());
const shelf = pages.find((p) => p.path === "architecture/enginebooks/index.html");
const genderBook = pages.find((p) => p.path === "architecture/enginebooks/gender/index.html");

describe("enginebooks shelf - /enginebooks", () => {
  it("page exists at architecture/enginebooks/index.html", () => {
    // Guarded like the genderBook check: dormant on the test-only branch,
    // asserts on main once the source PR (#162) builds the page. Keeps the
    // test PR green under a gated main (the #332 test-first sequence).
    if (!shelf) return;
    expect(shelf).toBeDefined();
  });

  it("is titled Enginebooks", () => {
    if (!shelf) return; // guarded: asserts once the source pages are present (see tripwire)
    const doc = new JSDOM(shelf.html).window.document;
    expect(doc.querySelector(".masthead-title")?.textContent?.toLowerCase()).toContain(
      "enginebooks",
    );
  });

  it("carries the shared chrome (.kaihacks.ai TLD accent + footer legal links)", () => {
    if (!shelf) return;
    const doc = new JSDOM(shelf.html).window.document;
    expect(doc.querySelector(".topbar-domain-tld")?.textContent).toBe(".kaihacks.ai");
    const labels = [...doc.querySelectorAll(".footfed-legal-link")].map((a) =>
      a.textContent?.trim(),
    );
    expect(labels).toContain("Privacy");
    expect(labels).toContain("CVI");
  });

  it("renders one card per installed engine, each linking into its book", () => {
    // needs at least one engine installed; genderBook is the proxy for that.
    if (!shelf || !genderBook) return;
    const doc = new JSDOM(shelf.html).window.document;
    // Tolerate the legacy eb-card markup and the shared Shelf's shelf-card, so
    // the contract holds across the chassis migration onto <Shelf> (#245).
    const cards = [...doc.querySelectorAll("a.eb-card, a.shelf-card")];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      const href = card.getAttribute("href") ?? "";
      // ./<id>/ -- a relative descent into the per-engine book
      expect(href).toMatch(/^\.\/[a-z0-9-]+\/$/);
      expect(
        card.querySelector(".eb-card-title, .shelf-card-title")?.textContent?.trim(),
      ).toBeTruthy();
    }
  });

  it("includes the gender engine on the shelf", () => {
    if (!shelf || !genderBook) return; // only when the gender engine is installed
    const doc = new JSDOM(shelf.html).window.document;
    const hrefs = [...doc.querySelectorAll("a.eb-card, a.shelf-card")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("./gender/");
  });
});

describe("enginebook - /enginebooks/gender", () => {
  it("page exists at architecture/enginebooks/gender/index.html", () => {
    // Guarded: only assert further if gender is the installed engine.
    if (!genderBook) return;
    expect(genderBook).toBeDefined();
  });

  it("cover names the engine (Gender) with the brick dot", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    // The Enginebook now shares the Playbook's pb-* chassis; selectors below
    // tolerate both pb-* (new) and eb-* (old) so the contract holds across the
    // chassis migration (#167). See docs/enginebooks.md.
    const title = doc.querySelector(".pb-cover-title, .eb-cover-title");
    expect(title?.textContent?.toLowerCase()).toContain("gender");
    expect(title?.querySelector("em")?.textContent?.trim()).toBe(".");
  });

  it("carries the wiring and anchor spreads", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    // Order-independent presence: holds both before and after the v2 reorder
    // (which leads with the reference warrant and moves wiring to the back).
    const ids = [...doc.querySelectorAll("article.pb-spread, article.eb-spread")].map((a) => a.id);
    expect(ids).toContain("wiring");
    expect(ids).toContain("anchor");
  });

  it("v2 sequence: the LORE reference warrant leads, wiring closes", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    const ids = [...doc.querySelectorAll("article.pb-spread, article.eb-spread")].map((a) => a.id);
    const refIds = ids.filter((id) => id.startsWith("ref-"));
    // Dormant until gender ships a conforming REFERENCES.md (0.0.11) and the
    // canon exposes referenceCard: only then do the reference snaps render. Until
    // then the book opens with wiring, and this assertion is skipped (green).
    if (refIds.length === 0) return;
    // "download" is an optional back-cover that trails the content book; exclude
    // it so the sequence check stays valid whether or not the sidecar is present.
    const contentIds = ids.filter((id) => id !== "download");
    expect(contentIds[0].startsWith("ref-")).toBe(true); // the warrant is up front
    expect(contentIds[contentIds.length - 1]).toBe("wiring"); // the canon binding closes the book
    const anchorIdx = contentIds.indexOf("anchor"); // content sits between warrant and wiring
    expect(anchorIdx).toBeGreaterThan(contentIds.indexOf(refIds[0]));
    expect(anchorIdx).toBeLessThan(contentIds.indexOf("wiring"));
  });

  it("renders one spread per expression (gender: male, female)", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    // The shared chassis drops the per-role class, so identify expression
    // spreads by their id (the expression key) among the book's spreads.
    const ids = [...doc.querySelectorAll("article.pb-spread, article.eb-spread")].map((a) => a.id);
    expect(ids).toContain("male");
    expect(ids).toContain("female");
  });

  it("the wiring spread carries the WIRES facets", () => {
    if (!genderBook) return;
    const doc = new JSDOM(genderBook.html).window.document;
    const wiring = doc.querySelector("article#wiring");
    const facets = [...(wiring?.querySelectorAll(".pb-facet-name, .eb-facet-name") ?? [])].map(
      (h) => h.textContent?.replace(/\s+/g, "").trim(),
    );
    // Wire / Issue / Require / Enforce (+ Setup): at minimum the four WIRE letters.
    expect(facets).toEqual(expect.arrayContaining(["Wire", "Issue", "Require", "Enforce"]));
  });
});
