import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";

const pages = loadBuiltPages(process.cwd());

// Every built page under architecture/ (including architecture/index.html,
// architecture/<slug>/index.html, architecture/architecture/index.html, ...)
// must include the shared Topbar (.topbar) and the shared Footer (.footfed).
//
// Rationale: navigation chrome appears on every page or it doesn't appear at
// all. A page without the topbar is a dead-end; a page without the footer
// loses the "you are here" anchor. This gate locks the contract so any
// future page that forgets to include the shared components fails CI.
const archPages = pages.filter((p) => p.path.startsWith("architecture/"));

describe("shared chrome - topbar + footer on every architecture page", () => {
  it("at least one architecture page exists to verify", () => {
    expect(archPages.length).toBeGreaterThan(0);
  });

  for (const page of archPages) {
    describe(page.path, () => {
      it("has a .topbar", () => {
        const dom = new JSDOM(page.html);
        const topbar = dom.window.document.querySelector(".topbar");
        expect(topbar, `${page.path}: missing <Topbar /> (.topbar element)`).not.toBeNull();
        dom.window.close();
      });

      it("has a .footfed", () => {
        const dom = new JSDOM(page.html);
        const footer = dom.window.document.querySelector(".footfed");
        expect(footer, `${page.path}: missing <Footer /> (.footfed element)`).not.toBeNull();
        dom.window.close();
      });
    });
  }
});
