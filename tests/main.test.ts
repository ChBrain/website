import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { loadBuiltPages } from "./helpers/load-built-html";
import { URLS } from "../src/lib/urls";

/**
 * Main (company front door) — design contract.
 *
 * Mirrors tests/cvi.test.ts. The main page is the funnel — the conversion
 * surface of kaihacks.ai. Every structural piece (the funnel order, the
 * AIDE acrostic, the timeline bookends, the architecture card) is a
 * deliberate design choice. Locking it down hard means any silent edit
 * (reordered chapters, broken acrostic, missing bookend, renamed sub-
 * divider) breaks a test. That's the gate.
 *
 * Snap chassis is also locked at the chassis level (snap-scroll container
 * + N snap-panels) but NOT at the precise CSS-rule level — Vitest+JSDOM
 * doesn't evaluate <style> blocks, so we assert the class structure that
 * carries the snap, not the computed style.
 */

const pages = loadBuiltPages(process.cwd());
const main = pages.find((p) => p.path === "main/index.html");

// h2 accepts a string OR a string[] so masthead labels that are still in
// editorial flux (the §02 author / Founder rename, the §03 Method &
// architecture / Method & Architecture capitalisation) can be in motion
// without breaking the contract. Locked entries stay strict.
const SECTIONS: { n: string; id: string; h2: string | string[]; note: string }[] = [
  { n: "§01", id: "services", h2: "Services", note: "have the method built for you" },
  {
    n: "§02",
    id: "author",
    h2: ["The author", "The Founder"],
    note: "the range · AI → delivery → AI",
  },
  {
    n: "§03",
    id: "method",
    h2: ["Method & architecture", "Method & Architecture"],
    note: "the name reads itself · and what it runs on",
  },
  { n: "§04", id: "apps", h2: "Applications", note: "what runs on the architecture" },
];

// AIDE acrostic — first letter of each domain is bricked.
const DOMAINS = ["AI", "ITSM", "DevOps", "Enterprise Architecture"];

const ENGAGE = ["Advisory", "Implementation", "Workshops"];

// Canonical timeline. Bookends (index 0 and 5) carry ai:true.
const TIMELINE = [
  { y: "2004", co: "TU München", ai: true },
  { y: "2006–’12", co: "Telefónica", ai: false },
  { y: "2012–’20", co: "Danfoss", ai: false },
  { y: "2021", co: "q.beyond", ai: false },
  { y: "2023", co: "FLS", ai: false },
  { y: "2026", co: "KAI HACKS AI", ai: true },
];

// HACKS is bricked (the verbs) — the rest plain.
const MOVEMENTS = [
  { t: "KAI", sense: "the noun", accent: false },
  { t: "HACKS", sense: "the verbs", accent: true },
  { t: "AI", sense: "the verb", accent: false },
];

const APPS = [
  { title: "Cultures", state: "live", url: "cultures.kaihacks.ai", planned: false },
  { title: "More applications", state: "in progress", url: "–", planned: true },
];

describe("main (company front door) — design contract", () => {
  it("page exists at main/index.html (build tripwire)", () => {
    expect(main, "build did not emit dist/main/index.html").toBeDefined();
  });

  describe("global chrome (SiteHeader + SiteFooter)", () => {
    it("renders the SiteHeader with .ai TLD accent", () => {
      const dom = new JSDOM(main!.html);
      const tld = dom.window.document.querySelector(".topbar-domain-tld");
      expect(tld).not.toBeNull();
      expect(tld!.textContent).toBe(".ai");
    });

    it("renders the SiteHeader nav with architecture · cultures · services", () => {
      const dom = new JSDOM(main!.html);
      const navLinks = dom.window.document.querySelectorAll(".topbar-nav a");
      const labels = [...navLinks].map((a) => a.textContent?.trim());
      expect(labels).toEqual(["architecture", "cultures", "services"]);
    });

    it("services nav entry self-anchors to #services on this page", () => {
      const dom = new JSDOM(main!.html);
      const navLinks = [...dom.window.document.querySelectorAll(".topbar-nav a")];
      const services = navLinks.find((a) => a.textContent?.trim() === "services");
      expect(services).toBeDefined();
      expect(services!.getAttribute("href")).toBe("#services");
    });

    it("renders the SiteFooter with the global Privacy + CVI links", () => {
      const dom = new JSDOM(main!.html);
      const links = [...dom.window.document.querySelectorAll(".footfed-legal-link")];
      const hrefs = links.map((a) => a.getAttribute("href"));
      expect(hrefs).toContain(URLS.privacy);
      expect(hrefs).toContain(URLS.cvi);
    });
  });

  describe("masthead", () => {
    it("overline anchors on 'the company'", () => {
      // The full overline string (and its est. year, optional "enterprise
      // architecture" subtitle, etc.) is editorial and in motion. The brand-
      // identifying token "the company" is the structural anchor — lock it.
      const dom = new JSDOM(main!.html);
      const overline = dom.window.document.querySelector(".masthead .overline");
      expect(overline).not.toBeNull();
      expect((overline?.textContent ?? "").toLowerCase()).toContain("the company");
    });

    it("h1 spells KAI HACKS AI with HACKS bricked", () => {
      const dom = new JSDOM(main!.html);
      const h1 = dom.window.document.querySelector("h1.masthead-title");
      expect(h1).not.toBeNull();
      const text = h1!.textContent ?? "";
      expect(text).toContain("KAI");
      expect(text).toContain("HACKS");
      expect(text).toContain("AI");
      // HACKS is the only token wrapped in the brick-accent span.
      const accent = h1!.querySelector(".masthead-title-accent");
      expect(accent?.textContent?.trim()).toBe("HACKS");
    });

    it("lede frames the four disciplines with the 'with or without AI' tail", () => {
      const dom = new JSDOM(main!.html);
      const lede = dom.window.document.querySelector(".lede");
      // Source wraps the lede across lines; collapse whitespace before matching.
      const text = (lede?.textContent ?? "").toLowerCase().replace(/\s+/g, " ");
      expect(text).toContain("ai");
      expect(text).toContain("itsm");
      expect(text).toContain("devops");
      expect(text).toContain("enterprise architecture");
      expect(text).toContain("with or without ai");
    });

    it("draft-marker is present (positioning still needs Kai's touch)", () => {
      const dom = new JSDOM(main!.html);
      const draft = dom.window.document.querySelector(".draft-marker");
      expect(draft).not.toBeNull();
      expect((draft!.textContent ?? "").toLowerCase()).toContain("draft");
    });
  });

  describe("4 canonical chapters (funnel order)", () => {
    for (const sec of SECTIONS) {
      it(`${sec.n} #${sec.id}: has the canonical heading + note`, () => {
        const dom = new JSDOM(main!.html);
        const section = dom.window.document.querySelector(`section#${sec.id}.section`);
        expect(section, `missing section#${sec.id}`).not.toBeNull();
        expect(section!.querySelector(".section-no")?.textContent?.trim()).toBe(sec.n);
        const h2 = section!.querySelector(".section-title")?.textContent?.trim();
        if (Array.isArray(sec.h2)) {
          expect(sec.h2, `${sec.id} h2 "${h2}" not in tolerated set`).toContain(h2);
        } else {
          expect(h2).toBe(sec.h2);
        }
        expect(section!.querySelector(".section-note")?.textContent?.trim()).toBe(sec.note);
      });
    }

    it("sections appear in canonical funnel order (services → author → method → apps)", () => {
      const dom = new JSDOM(main!.html);
      const ids = [...dom.window.document.querySelectorAll("main.snap-scroll section.section")].map(
        (s) => s.id,
      );
      expect(ids).toEqual(SECTIONS.map((s) => s.id));
    });
  });

  describe("snap chassis (CVI parity)", () => {
    it("main.snap-scroll wraps the chapters", () => {
      const dom = new JSDOM(main!.html);
      const scroll = dom.window.document.querySelector("main.snap-scroll");
      expect(scroll, "missing main.snap-scroll container").not.toBeNull();
    });

    it("renders 5 snap panels: masthead + 4 §s", () => {
      const dom = new JSDOM(main!.html);
      const panels = dom.window.document.querySelectorAll("main.snap-scroll .snap-panel");
      expect(panels.length).toBe(5);
    });

    it("masthead is the first snap panel", () => {
      const dom = new JSDOM(main!.html);
      const first = dom.window.document.querySelector("main.snap-scroll .snap-panel");
      expect(first?.classList.contains("masthead")).toBe(true);
    });

    it("SiteFooter lives OUTSIDE the snap container", () => {
      const dom = new JSDOM(main!.html);
      const snap = dom.window.document.querySelector("main.snap-scroll");
      const footer = dom.window.document.querySelector(".footfed");
      expect(footer).not.toBeNull();
      expect(snap?.contains(footer)).toBe(false);
    });
  });

  describe("§01 Services — AIDE acrostic + engagement + brick CTA", () => {
    it("renders 4 domains in canonical AIDE order", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const cols = section!.querySelectorAll(".services-col");
      const domainCol = cols[0];
      const domainRows = [...domainCol.querySelectorAll(".services-domain")].filter(
        (row) => !row.classList.contains("services-domain--coda"),
      );
      expect(domainRows.length).toBe(DOMAINS.length);
      domainRows.forEach((row, i) => {
        // The first letter is wrapped in a separate span (.services-domain-initial)
        // for the brick accent, so textContent inserts whitespace between the
        // initial and the rest. Collapse whitespace, then re-join the initial
        // to the rest (drops the single space after the first char).
        const text = (row.textContent ?? "").replace(/\s+/g, " ").trim();
        const normalised = text.length > 1 && text[1] === " " ? text[0] + text.slice(2) : text;
        expect(normalised).toBe(DOMAINS[i]);
      });
    });

    it("first letter of each domain is bricked (AIDE acrostic preserved)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const initials = [...section!.querySelectorAll(".services-col .services-domain-initial")].map(
        (i) => i.textContent?.trim(),
      );
      // AIDE: A · I · D · E
      expect(initials).toEqual(["A", "I", "D", "E"]);
    });

    it("domain column ends with the '…you name it' coda", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const coda = section!.querySelector(".services-domain--coda");
      expect(coda?.textContent?.trim()).toBe("…you name it");
    });

    it("renders 3 engagement modes in canonical order", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#services");
      const engageNames = [...section!.querySelectorAll(".services-engage-name")].map((n) =>
        n.textContent?.trim(),
      );
      expect(engageNames).toEqual(ENGAGE);
    });

    it("brick CTA 'Start a conversation →' points to #contact", () => {
      const dom = new JSDOM(main!.html);
      const cta = dom.window.document.querySelector("section#services a.services-cta");
      expect(cta).not.toBeNull();
      expect(cta!.getAttribute("href")).toBe("#contact");
      expect(cta!.textContent?.trim()).toContain("Start a conversation");
    });
  });

  describe("§02 Author — timeline with AI bookends", () => {
    it(`renders ${TIMELINE.length} timeline entries in canonical order`, () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#author");
      const steps = [...section!.querySelectorAll("li.arc-step")];
      expect(steps.length).toBe(TIMELINE.length);
      steps.forEach((step, i) => {
        const year = step.querySelector(".arc-year")?.textContent?.trim();
        const co = step.querySelector(".arc-co")?.textContent?.trim();
        expect(year).toBe(TIMELINE[i].y);
        expect(co).toBe(TIMELINE[i].co);
      });
    });

    it("first (2004) and last (2026) are AI bookends with .arc-step--ai", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#author");
      const steps = [...section!.querySelectorAll("li.arc-step")];
      const aiFlags = steps.map((s) => s.classList.contains("arc-step--ai"));
      expect(aiFlags).toEqual(TIMELINE.map((t) => t.ai));
      // Exactly the bookends are flagged.
      expect(aiFlags).toEqual([true, false, false, false, false, true]);
    });

    it("author-lede emphasises 'range' (the framing decision)", () => {
      const dom = new JSDOM(main!.html);
      const lede = dom.window.document.querySelector("section#author .author-lede");
      const text = (lede?.textContent ?? "").toLowerCase();
      expect(text).toContain("range");
    });
  });

  describe("§03 Method & architecture — name reads itself + folded card", () => {
    it("renders 3 movements (KAI · HACKS · AI) in canonical order", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#method");
      const tokens = [...section!.querySelectorAll(".movement-token")].map((t) =>
        t.textContent?.trim(),
      );
      expect(tokens).toEqual(MOVEMENTS.map((m) => m.t));
    });

    it("HACKS is the only bricked movement (the verbs)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#method");
      const tokens = [...section!.querySelectorAll(".movement-token")];
      const accentFlags = tokens.map((t) => t.classList.contains("movement-token--accent"));
      expect(accentFlags).toEqual(MOVEMENTS.map((m) => m.accent));
      expect(accentFlags).toEqual([false, true, false]);
    });

    it("architecture sub-divider label reads 'Architecture · what the method runs on'", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#method");
      const label = section!.querySelector(".architecture-sub-label");
      expect(label?.textContent?.trim()).toBe("Architecture · what the method runs on");
    });

    it("architecture card links to URLS.architecture", () => {
      const dom = new JSDOM(main!.html);
      const card = dom.window.document.querySelector("section#method a.architecture-card");
      expect(card).not.toBeNull();
      expect(card!.getAttribute("href")).toBe(URLS.architecture);
    });

    it("architecture card carries title 'Architecture' and the 'live · the foundation' state", () => {
      const dom = new JSDOM(main!.html);
      const card = dom.window.document.querySelector("section#method a.architecture-card");
      expect(card!.querySelector(".architecture-card-title")?.textContent?.trim()).toBe(
        "Architecture",
      );
      expect(card!.querySelector(".architecture-card-state")?.textContent?.trim()).toBe(
        "live · the foundation",
      );
    });
  });

  describe("§04 Applications — Cultures live + placeholder", () => {
    it("renders exactly 2 app cards in canonical order", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#apps");
      const cards = [...section!.querySelectorAll("a.app")];
      expect(cards.length).toBe(APPS.length);
      cards.forEach((card, i) => {
        const title = card.querySelector(".app-title")?.textContent?.trim();
        const state = card.querySelector(".app-state")?.textContent?.trim();
        const url = card.querySelector(".app-url")?.textContent?.trim();
        expect(title).toBe(APPS[i].title);
        expect(state).toBe(APPS[i].state);
        expect(url).toBe(APPS[i].url);
      });
    });

    it("Cultures (live) carries the brick .app-state--live", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#apps");
      const cards = [...section!.querySelectorAll("a.app")];
      const live = cards[0].querySelector(".app-state--live");
      expect(live, "live app should carry .app-state--live for brick").not.toBeNull();
    });

    it("'More applications' placeholder carries .app--planned (dashed border)", () => {
      const dom = new JSDOM(main!.html);
      const section = dom.window.document.querySelector("section#apps");
      const cards = [...section!.querySelectorAll("a.app")];
      expect(cards[1].classList.contains("app--planned")).toBe(true);
    });
  });
});
